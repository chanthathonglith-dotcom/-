import type http from 'node:http';
import { createRequire } from 'node:module';
import type * as WsModule from 'ws';
import type { DocumentRecord } from '../types/document.ts';
import {
  applyRealtimeDelta,
  computeDocumentDiff,
  parseSheetRowsServerSafe,
  type ClientToServerMessage,
  type RealtimeDocumentEvent,
  type ServerToClientMessage,
} from '../utils/realtimeSyncLogic.ts';

const require = createRequire(import.meta.url);
const { WebSocketServer, WebSocket } = require('ws') as typeof WsModule;

interface SheetsWatcherState {
  spreadsheetId: string;
  sheetTitle: string;
  accessToken: string;
  lastVersionToken: string;
  lastFullFetchAt: number;
  inFlight: boolean;
  timer: ReturnType<typeof setInterval> | null;
}

interface RoomState {
  roomId: string;
  clients: Set<WsModule.WebSocket>;
  docs: DocumentRecord[];
  initialized: boolean;
  watcher: SheetsWatcherState | null;
}

interface SocketMeta {
  clientId: string;
  roomId: string | null;
  isAlive: boolean;
}

export interface RealtimeHubOptions {
  server: http.Server;
  wsPath?: string;
  sheetCheckIntervalMs?: number;
  fullPollFallbackMs?: number;
  fetchFn?: typeof fetch;
  onDocumentsAdded?: (roomId: string, addedDocs: DocumentRecord[]) => void | Promise<void>;
}

export class RealtimeHub {
  private wss: WsModule.WebSocketServer;
  private rooms = new Map<string, RoomState>();
  private socketMeta = new Map<WsModule.WebSocket, SocketMeta>();
  private heartbeatTimer: ReturnType<typeof setInterval>;
  private sheetCheckIntervalMs: number;
  private fullPollFallbackMs: number;
  private fetchFn: typeof fetch;
  private onDocumentsAdded?: (roomId: string, addedDocs: DocumentRecord[]) => void | Promise<void>;

  constructor(options: RealtimeHubOptions) {
    this.sheetCheckIntervalMs = options.sheetCheckIntervalMs ?? 5_000;
    this.fullPollFallbackMs = options.fullPollFallbackMs ?? 15_000;
    this.fetchFn = options.fetchFn ?? fetch;
    this.onDocumentsAdded = options.onDocumentsAdded;

    this.wss = new WebSocketServer({
      server: options.server,
      path: options.wsPath ?? '/ws',
    });

    this.wss.on('connection', (ws) => {
      this.socketMeta.set(ws, {
        clientId: '',
        roomId: null,
        isAlive: true,
      });

      ws.on('pong', () => {
        const meta = this.socketMeta.get(ws);
        if (meta) meta.isAlive = true;
      });

      ws.on('message', (raw) => {
        try {
          const parsed = JSON.parse(raw.toString()) as ClientToServerMessage;
          this.handleClientMessage(ws, parsed);
        } catch {
          // Ignore malformed WS payloads cleanly
        }
      });

      ws.on('close', () => {
        this.cleanupSocket(ws);
      });

      ws.on('error', () => {
        this.cleanupSocket(ws);
      });
    });

    this.heartbeatTimer = setInterval(() => {
      for (const [ws, meta] of this.socketMeta.entries()) {
        if (!meta.isAlive) {
          ws.terminate();
          this.cleanupSocket(ws);
          continue;
        }
        meta.isAlive = false;
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }
    }, 30_000);
    this.heartbeatTimer.unref?.();
  }

  private getOrCreateRoom(roomId: string): RoomState {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        clients: new Set(),
        docs: [],
        initialized: false,
        watcher: null,
      };
      this.rooms.set(roomId, room);
    }
    return room;
  }

  private sendToSocket(ws: WsModule.WebSocket, msg: ServerToClientMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  private broadcastToRoom(
    roomId: string,
    msg: ServerToClientMessage,
    excludeSocket?: WsModule.WebSocket
  ): number {
    const room = this.rooms.get(roomId);
    if (!room) return 0;

    const payload = JSON.stringify(msg);
    let sent = 0;
    for (const client of room.clients) {
      if (excludeSocket && client === excludeSocket) continue;
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
        sent += 1;
      }
    }
    return sent;
  }

  private cleanupSocket(ws: WsModule.WebSocket): void {
    const meta = this.socketMeta.get(ws);
    if (meta?.roomId) {
      this.leaveRoom(ws, meta.roomId);
    }
    this.socketMeta.delete(ws);
  }

  private leaveRoom(ws: WsModule.WebSocket, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.clients.delete(ws);
    if (room.clients.size === 0 && room.watcher?.timer) {
      clearInterval(room.watcher.timer);
      room.watcher.timer = null;
    }
  }

  private handleClientMessage(ws: WsModule.WebSocket, msg: ClientToServerMessage): void {
    const meta = this.socketMeta.get(ws);
    if (!meta) return;

    switch (msg.type) {
      case 'ping': {
        this.sendToSocket(ws, { type: 'pong' });
        return;
      }

      case 'join': {
        if (!msg.roomId || typeof msg.roomId !== 'string') return;
        if (meta.roomId && meta.roomId !== msg.roomId) {
          this.leaveRoom(ws, meta.roomId);
        }

        meta.clientId = msg.clientId || meta.clientId;
        meta.roomId = msg.roomId;

        const room = this.getOrCreateRoom(msg.roomId);
        room.clients.add(ws);

        if (!room.initialized && Array.isArray(msg.initialDocuments)) {
          room.docs = applyRealtimeDelta([], {
            type: 'documents:snapshot',
            roomId: msg.roomId,
            documents: msg.initialDocuments,
            timestamp: Date.now(),
          });
          room.initialized = true;
        }

        this.sendToSocket(ws, {
          type: 'joined',
          roomId: msg.roomId,
          peerCount: room.clients.size,
        });

        if (room.initialized) {
          this.sendToSocket(ws, {
            type: 'documents:snapshot',
            roomId: msg.roomId,
            documents: room.docs,
            timestamp: Date.now(),
          });
        }
        return;
      }

      case 'leave': {
        if (msg.roomId) {
          this.leaveRoom(ws, msg.roomId);
          if (meta.roomId === msg.roomId) {
            meta.roomId = null;
          }
        }
        return;
      }

      case 'watch:sheets': {
        if (!msg.roomId || !msg.spreadsheetId || !msg.sheetTitle || !msg.accessToken) return;
        this.startSheetsWatcher(msg.roomId, {
          spreadsheetId: msg.spreadsheetId,
          sheetTitle: msg.sheetTitle,
          accessToken: msg.accessToken,
        });
        return;
      }

      case 'unwatch:sheets': {
        this.stopSheetsWatcher(msg.roomId);
        return;
      }

      case 'document:created': {
        const event: RealtimeDocumentEvent = {
          type: 'document:created',
          roomId: msg.roomId,
          document: msg.document,
          senderId: msg.senderId,
          timestamp: Date.now(),
        };
        this.applyAndBroadcast(msg.roomId, event, ws);
        return;
      }

      case 'document:updated': {
        const event: RealtimeDocumentEvent = {
          type: 'document:updated',
          roomId: msg.roomId,
          document: msg.document,
          senderId: msg.senderId,
          timestamp: Date.now(),
        };
        this.applyAndBroadcast(msg.roomId, event, ws);
        return;
      }

      case 'document:deleted': {
        const event: RealtimeDocumentEvent = {
          type: 'document:deleted',
          roomId: msg.roomId,
          docId: msg.docId,
          senderId: msg.senderId,
          timestamp: Date.now(),
        };
        this.applyAndBroadcast(msg.roomId, event, ws);
        return;
      }
    }
  }

  private applyAndBroadcast(
    roomId: string,
    event: RealtimeDocumentEvent,
    excludeSocket?: WsModule.WebSocket
  ): number {
    const room = this.getOrCreateRoom(roomId);
    const prevDocs = room.docs;
    room.docs = applyRealtimeDelta(room.docs, event);
    room.initialized = true;

    if (event.type === 'document:created' && this.onDocumentsAdded) {
      const existed = prevDocs.some((d) => d.id === event.document.id);
      if (!existed) {
        void Promise.resolve(this.onDocumentsAdded(roomId, [event.document])).catch(() => {});
      }
    } else if (event.type === 'sheets:delta' && event.added.length > 0 && this.onDocumentsAdded) {
      void Promise.resolve(this.onDocumentsAdded(roomId, event.added)).catch(() => {});
    }

    return this.broadcastToRoom(roomId, event, excludeSocket);
  }

  publishRoomEvent(
    roomId: string,
    eventInput:
      | { type: 'document:created'; document: DocumentRecord; senderId?: string }
      | { type: 'document:updated'; document: DocumentRecord; senderId?: string }
      | { type: 'document:deleted'; docId: string; senderId?: string }
      | { type: 'documents:snapshot'; documents: DocumentRecord[]; senderId?: string }
      | {
          type: 'sheets:delta';
          added: DocumentRecord[];
          updated: DocumentRecord[];
          deletedIds: string[];
          senderId?: string;
        }
  ): { deliveredClients: number; roomDocumentCount: number } {
    const event: RealtimeDocumentEvent = {
      ...eventInput,
      roomId,
      timestamp: Date.now(),
    } as RealtimeDocumentEvent;

    const deliveredClients = this.applyAndBroadcast(roomId, event);
    const room = this.rooms.get(roomId);
    return {
      deliveredClients,
      roomDocumentCount: room?.docs.length ?? 0,
    };
  }

  startSheetsWatcher(
    roomId: string,
    config: {
      spreadsheetId: string;
      sheetTitle: string;
      accessToken: string;
    }
  ): void {
    const room = this.getOrCreateRoom(roomId);
    if (room.watcher?.timer) {
      clearInterval(room.watcher.timer);
    }

    const watcher: SheetsWatcherState = {
      spreadsheetId: config.spreadsheetId,
      sheetTitle: config.sheetTitle,
      accessToken: config.accessToken,
      lastVersionToken: room.watcher?.lastVersionToken ?? '',
      lastFullFetchAt: 0,
      inFlight: false,
      timer: null,
    };

    watcher.timer = setInterval(() => {
      void this.pollGoogleSheetsRoom(roomId);
    }, this.sheetCheckIntervalMs);
    watcher.timer.unref?.();

    room.watcher = watcher;
    void this.pollGoogleSheetsRoom(roomId);
  }

  stopSheetsWatcher(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room?.watcher) return;
    if (room.watcher.timer) {
      clearInterval(room.watcher.timer);
    }
    room.watcher = null;
  }

  async pollGoogleSheetsRoom(roomId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    const watcher = room?.watcher;
    if (!room || !watcher || watcher.inFlight || room.clients.size === 0) {
      return false;
    }

    watcher.inFlight = true;
    try {
      const metaUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        watcher.spreadsheetId
      )}?fields=version,modifiedTime`;

      const metaRes = await this.fetchFn(metaUrl, {
        headers: { Authorization: `Bearer ${watcher.accessToken}` },
      });

      if (metaRes.status === 401) {
        this.stopSheetsWatcher(roomId);
        this.broadcastToRoom(roomId, { type: 'sheets:auth_expired', roomId });
        return false;
      }

      let versionChanged = false;
      if (metaRes.ok) {
        const meta = (await metaRes.json()) as { version?: string; modifiedTime?: string };
        const nextToken = `${meta.version ?? ''}:${meta.modifiedTime ?? ''}`;
        if (nextToken && nextToken !== watcher.lastVersionToken) {
          versionChanged = watcher.lastVersionToken !== '';
          watcher.lastVersionToken = nextToken;
        }
      }

      const now = Date.now();
      const shouldFetchValues =
        versionChanged || now - watcher.lastFullFetchAt >= this.fullPollFallbackMs;

      if (!shouldFetchValues) {
        return false;
      }

      const range = `'${watcher.sheetTitle.replace(/'/g, "''")}'!A1:T`;
      const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        watcher.spreadsheetId
      )}/values/${encodeURIComponent(range)}`;

      const valuesRes = await this.fetchFn(valuesUrl, {
        headers: { Authorization: `Bearer ${watcher.accessToken}` },
      });

      if (valuesRes.status === 401) {
        this.stopSheetsWatcher(roomId);
        this.broadcastToRoom(roomId, { type: 'sheets:auth_expired', roomId });
        return false;
      }

      if (!valuesRes.ok) {
        return false;
      }

      watcher.lastFullFetchAt = now;
      const valuesJson = (await valuesRes.json()) as { values?: string[][] };
      const latestDocs = parseSheetRowsServerSafe(valuesJson.values || []);

      if (!room.initialized) {
        room.docs = latestDocs;
        room.initialized = true;
        this.broadcastToRoom(roomId, {
          type: 'documents:snapshot',
          roomId,
          documents: latestDocs,
          timestamp: now,
        });
        return true;
      }

      const diff = computeDocumentDiff(room.docs, latestDocs);
      if (!diff.hasChanges) {
        return false;
      }

      const deltaEvent: RealtimeDocumentEvent = {
        type: 'sheets:delta',
        roomId,
        added: diff.added,
        updated: diff.updated,
        deletedIds: diff.deletedIds,
        timestamp: now,
      };
      this.applyAndBroadcast(roomId, deltaEvent);
      return true;
    } catch {
      return false;
    } finally {
      watcher.inFlight = false;
    }
  }

  getRoomDocuments(roomId: string): DocumentRecord[] {
    return this.rooms.get(roomId)?.docs ?? [];
  }

  getStatus(): {
    activeConnections: number;
    rooms: Array<{ roomId: string; clients: number; documents: number; watchingSheets: boolean }>;
  } {
    const rooms = Array.from(this.rooms.values())
      .filter((r) => r.clients.size > 0 || r.initialized)
      .map((r) => ({
        roomId: r.roomId,
        clients: r.clients.size,
        documents: r.docs.length,
        watchingSheets: Boolean(r.watcher?.timer),
      }));
    return {
      activeConnections: this.socketMeta.size,
      rooms,
    };
  }

  close(): void {
    clearInterval(this.heartbeatTimer);
    for (const room of this.rooms.values()) {
      if (room.watcher?.timer) {
        clearInterval(room.watcher.timer);
      }
    }
    this.wss.close();
  }
}
