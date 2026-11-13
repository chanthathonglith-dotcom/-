import { DocumentRecord } from '../types/document';
import {
  ClientToServerMessage,
  RealtimeDocumentEvent,
  ServerToClientMessage,
} from '../utils/realtimeSyncLogic';

export type RealtimeEventListener = (event: RealtimeDocumentEvent) => void;
export type AuthExpiredListener = (roomId: string) => void;

export class RealtimeSyncClient {
  private ws: WebSocket | null = null;
  private clientId: string;
  private currentRoomId: string | null = null;
  private initialDocuments: DocumentRecord[] | undefined;
  private activeSheetsWatch: {
    roomId: string;
    spreadsheetId: string;
    sheetTitle: string;
    accessToken: string;
  } | null = null;
  private eventListeners = new Set<RealtimeEventListener>();
  private authExpiredListeners = new Set<AuthExpiredListener>();
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private manuallyClosed = false;

  constructor() {
    this.clientId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `client-${crypto.randomUUID()}`
        : `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  getClientId(): string {
    return this.clientId;
  }

  onEvent(listener: RealtimeEventListener): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  onSheetsAuthExpired(listener: AuthExpiredListener): () => void {
    this.authExpiredListeners.add(listener);
    return () => {
      this.authExpiredListeners.delete(listener);
    };
  }

  connect(): void {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.manuallyClosed = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        this.reconnectAttempts = 0;
        if (this.currentRoomId) {
          this.sendMessage({
            type: 'join',
            roomId: this.currentRoomId,
            clientId: this.clientId,
            initialDocuments: this.initialDocuments,
          });
        }
        if (this.activeSheetsWatch) {
          this.sendMessage({
            type: 'watch:sheets',
            ...this.activeSheetsWatch,
          });
        }
      };

      socket.onmessage = (msgEvent) => {
        try {
          const parsed = JSON.parse(String(msgEvent.data)) as ServerToClientMessage;
          if (parsed.type === 'joined' || parsed.type === 'pong') {
            return;
          }
          if (parsed.type === 'sheets:auth_expired') {
            for (const listener of this.authExpiredListeners) {
              listener(parsed.roomId);
            }
            return;
          }
          for (const listener of this.eventListeners) {
            listener(parsed);
          }
        } catch {
          // Ignore invalid JSON frames
        }
      };

      socket.onclose = () => {
        this.ws = null;
        if (!this.manuallyClosed) {
          this.scheduleReconnect();
        }
      };

      socket.onerror = () => {
        // Error handler followed by onclose will schedule reconnect
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (typeof window === 'undefined' || this.reconnectTimer !== null) return;
    const delayMs = Math.min(10_000, 1000 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manuallyClosed) {
        this.connect();
      }
    }, delayMs);
  }

  private sendMessage(msg: ClientToServerMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  joinRoom(roomId: string, initialDocuments?: DocumentRecord[]): void {
    if (this.currentRoomId && this.currentRoomId !== roomId) {
      this.sendMessage({ type: 'leave', roomId: this.currentRoomId });
    }
    this.currentRoomId = roomId;
    this.initialDocuments = initialDocuments;
    this.connect();
    this.sendMessage({
      type: 'join',
      roomId,
      clientId: this.clientId,
      initialDocuments,
    });
  }

  leaveCurrentRoom(): void {
    if (this.currentRoomId) {
      this.sendMessage({ type: 'leave', roomId: this.currentRoomId });
      this.currentRoomId = null;
      this.initialDocuments = undefined;
    }
    this.activeSheetsWatch = null;
  }

  watchGoogleSheet(
    roomId: string,
    spreadsheetId: string,
    sheetTitle: string,
    accessToken: string
  ): void {
    this.activeSheetsWatch = { roomId, spreadsheetId, sheetTitle, accessToken };
    this.connect();
    this.sendMessage({
      type: 'watch:sheets',
      roomId,
      spreadsheetId,
      sheetTitle,
      accessToken,
    });
  }

  unwatchGoogleSheet(roomId: string): void {
    if (this.activeSheetsWatch?.roomId === roomId) {
      this.activeSheetsWatch = null;
    }
    this.sendMessage({ type: 'unwatch:sheets', roomId });
  }

  emitCreated(roomId: string, document: DocumentRecord): void {
    this.sendMessage({
      type: 'document:created',
      roomId,
      document,
      senderId: this.clientId,
    });
  }

  emitUpdated(roomId: string, document: DocumentRecord): void {
    this.sendMessage({
      type: 'document:updated',
      roomId,
      document,
      senderId: this.clientId,
    });
  }

  emitDeleted(roomId: string, docId: string): void {
    this.sendMessage({
      type: 'document:deleted',
      roomId,
      docId,
      senderId: this.clientId,
    });
  }

  disconnect(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const realtimeClient = new RealtimeSyncClient();
