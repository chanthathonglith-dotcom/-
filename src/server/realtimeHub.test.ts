import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
import type * as WsModule from 'ws';
import {
  DocumentDirection,
  DocumentPurpose,
  DocumentRecord,
  DocumentStatus,
} from '../types/document';
import { RealtimeHub } from './realtimeHub';

const require = createRequire(import.meta.url);
const { WebSocket } = require('ws') as typeof WsModule;

function makeDoc(id: string, title = 'ເອກະສານທົດສອບ'): DocumentRecord {
  return {
    id,
    direction: DocumentDirection.INCOMING,
    docNumber: `${id}/ຂຂ-2026`,
    docDate: '2026-11-12',
    incomingDate: '2026-11-12',
    outgoingDate: '',
    dueDate: '',
    title,
    department: 'ພະແນກການເງິນ',
    purpose: DocumentPurpose.INFO,
    leadershipComment: '',
    status: DocumentStatus.PENDING,
    scanLink: '',
    scanFileName: '',
    driveFileId: '',
    createdBy: 'tester@example.com',
    updatedAt: '2026-11-12T10:00:00.000Z',
  };
}

function connectWs(url: string): Promise<WsModule.WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

function waitForMessage(
  ws: WsModule.WebSocket,
  predicate: (msg: Record<string, unknown>) => boolean,
  timeoutMs = 3000
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', handler);
      reject(new Error('Timed out waiting for WS message'));
    }, timeoutMs);

    const handler = (raw: WsModule.RawData) => {
      try {
        const parsed = JSON.parse(raw.toString()) as Record<string, unknown>;
        if (predicate(parsed)) {
          clearTimeout(timer);
          ws.off('message', handler);
          resolve(parsed);
        }
      } catch {
        // ignore
      }
    };
    ws.on('message', handler);
  });
}

test('RealtimeHub broadcasts create, update, and delete events across clients and syncs late joiners', async () => {
  const server = http.createServer();
  let sheetPollVersion = 1;
  let sheetRows: string[][] = [
    ['ID', 'ປະເພດ', 'ເລກທີ'],
    ['DOC-1', 'ຂາເຂົ້າ', '001/ຂຂ-2026', '2026-11-12', 'ເອກະສານ 1', 'ພະແນກການເງິນ', 'ເພື່ອຊາບ', '', 'ລໍຖ້າດຳເນີນການ'],
  ];

  const mockFetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/drive/v3/files/')) {
      return new Response(
        JSON.stringify({ version: String(sheetPollVersion), modifiedTime: `2026-11-12T10:00:0${sheetPollVersion}.000Z` }),
        { status: 200 }
      );
    }
    return new Response(JSON.stringify({ values: sheetRows }), { status: 200 });
  }) as typeof fetch;

  const addedAlerts: string[] = [];
  const hub = new RealtimeHub({
    server,
    sheetCheckIntervalMs: 60_000,
    fullPollFallbackMs: 0,
    fetchFn: mockFetch,
    onDocumentsAdded: (_roomId, docs) => {
      for (const d of docs) addedAlerts.push(d.id);
    },
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const wsUrl = `ws://127.0.0.1:${address.port}/ws`;

  const clientA = await connectWs(wsUrl);
  const clientB = await connectWs(wsUrl);

  try {
    const doc1 = makeDoc('DOC-1', 'ເອກະສານ 1');
    const doc2 = makeDoc('DOC-2', 'ເອກະສານ 2');

    // Join both clients to room 'demo'
    const snapA = waitForMessage(clientA, (m) => m.type === 'documents:snapshot');
    clientA.send(JSON.stringify({ type: 'join', roomId: 'demo', clientId: 'cA', initialDocuments: [doc1] }));
    await snapA;

    const snapB = waitForMessage(clientB, (m) => m.type === 'documents:snapshot');
    clientB.send(JSON.stringify({ type: 'join', roomId: 'demo', clientId: 'cB' }));
    const receivedSnapB = await snapB;
    assert.equal((receivedSnapB.documents as DocumentRecord[]).length, 1);

    // Client A creates DOC-2 -> Client B receives document:created immediately
    const createdPromise = waitForMessage(
      clientB,
      (m) => m.type === 'document:created' && (m.document as DocumentRecord).id === 'DOC-2'
    );
    clientA.send(
      JSON.stringify({
        type: 'document:created',
        roomId: 'demo',
        document: doc2,
        senderId: 'cA',
      })
    );
    await createdPromise;
    assert.ok(addedAlerts.includes('DOC-2'));

    // Client A updates DOC-1 -> Client B receives document:updated
    const updatedPromise = waitForMessage(
      clientB,
      (m) => m.type === 'document:updated' && (m.document as DocumentRecord).title === 'ແກ້ໄຂແລ້ວ'
    );
    clientA.send(
      JSON.stringify({
        type: 'document:updated',
        roomId: 'demo',
        document: { ...doc1, title: 'ແກ້ໄຂແລ້ວ' },
        senderId: 'cA',
      })
    );
    await updatedPromise;

    // Client B deletes DOC-1 -> Client A receives document:deleted
    const deletedPromise = waitForMessage(
      clientA,
      (m) => m.type === 'document:deleted' && m.docId === 'DOC-1'
    );
    clientB.send(
      JSON.stringify({
        type: 'document:deleted',
        roomId: 'demo',
        docId: 'DOC-1',
        senderId: 'cB',
      })
    );
    await deletedPromise;

    // Room state now holds only DOC-2
    assert.deepEqual(
      hub.getRoomDocuments('demo').map((d) => d.id),
      ['DOC-2']
    );

    // Google Sheets live watcher detects external row edit + addition on Sheet and broadcasts sheets:delta
    const sheetDeltaPromise = waitForMessage(clientA, (m) => m.type === 'sheets:delta');
    hub.startSheetsWatcher('demo', {
      spreadsheetId: 'sheet-xyz',
      sheetTitle: 'ເອກະສານ',
      accessToken: 'fake-token',
    });
    // First poll captures baseline; now simulate external edit in Google Sheets + bump version
    await hub.pollGoogleSheetsRoom('demo');
    sheetPollVersion = 2;
    sheetRows = [
      ['ID', 'ປະເພດ', 'ເລກທີ'],
      ['DOC-2', 'ຂາເຂົ້າ', '002/ຂຂ-2026', '2026-11-12', 'ເອກະສານ 2', 'ພະແນກການເງິນ', 'ເພື່ອຊາບ', '', 'ລໍຖ້າດຳເນີນການ'],
      ['DOC-3', 'ຂາອອກ', '003/ຂອ-2026', '2026-11-12', 'ເພີ່ມໃນ Google Sheets ໂດຍກົງ', 'ຫ້ອງວ່າການ', 'ຂໍລາຍເຊັນ', '', 'ສຳເລັດແລ້ວ'],
    ];
    await hub.pollGoogleSheetsRoom('demo');

    const deltaMsg = await sheetDeltaPromise;
    assert.equal((deltaMsg.added as DocumentRecord[])[0].id, 'DOC-3');
  } finally {
    clientA.close();
    clientB.close();
    hub.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
