import 'dotenv/config';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import {
  PushStore,
  type ServerWatchItem,
  isValidPushSubscription,
} from './src/server/pushStore.ts';
import { RealtimeHub } from './src/server/realtimeHub.ts';
import type { DocumentRecord } from './src/types/document.ts';
import {
  documentsToExcelBuffer,
  excelBufferToDocuments,
} from './src/utils/excelStorageLogic.ts';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const pushStore = new PushStore();
  const realtimeHub = new RealtimeHub({
    server: httpServer,
    wsPath: '/ws',
    onDocumentsAdded: async (_roomId, addedDocs) => {
      for (const doc of addedDocs) {
        await pushStore.sendToSubscriptions({
          title: 'ມີເອກະສານໃໝ່ໃນ Google Sheets',
          body: `${doc.docNumber} — ${doc.title} (${doc.department})`,
          tag: `new-doc-${doc.id}`,
          docId: doc.id,
          url: `/?docId=${encodeURIComponent(doc.id)}`,
          requireInteraction: true,
          silent: false,
          renotify: true,
          lockScreenDisplay: true,
          vibrate: [200, 100, 200],
          timestamp: Date.now(),
        });
      }
    },
  });

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/push/vapid-public-key', (_req, res) => {
    res.json(pushStore.getPublicKey());
  });

  app.get('/api/push/status', (_req, res) => {
    res.json(pushStore.getStatus());
  });

  app.post('/api/push/subscribe', (req, res) => {
    const body = req.body as {
      subscription?: unknown;
      preferences?: {
        lockScreenDisplay?: boolean;
        requireInteraction?: boolean;
        soundAndVibration?: boolean;
      };
      watches?: ServerWatchItem[];
    };

    if (!isValidPushSubscription(body?.subscription)) {
      res.status(400).json({ error: 'Invalid Web Push subscription payload' });
      return;
    }

    const saved = pushStore.upsertSubscription(body.subscription, body.preferences);
    let watchCount = pushStore.getStatus().watchCount;
    if (Array.isArray(body.watches)) {
      watchCount = pushStore.updateWatches(body.watches);
    }

    res.json({
      ok: true,
      endpoint: saved.endpoint,
      subscriptionCount: pushStore.getStatus().subscriptionCount,
      watchCount,
    });
  });

  app.post('/api/push/unsubscribe', (req, res) => {
    const body = req.body as { endpoint?: string };
    if (!body?.endpoint || typeof body.endpoint !== 'string') {
      res.status(400).json({ error: 'Missing subscription endpoint' });
      return;
    }
    const removed = pushStore.removeSubscription(body.endpoint);
    res.json({
      ok: true,
      removed,
      subscriptionCount: pushStore.getStatus().subscriptionCount,
    });
  });

  app.post('/api/push/watches', (req, res) => {
    const body = req.body as { watches?: ServerWatchItem[] };
    if (!Array.isArray(body?.watches)) {
      res.status(400).json({ error: 'Expected watches array' });
      return;
    }
    const watchCount = pushStore.updateWatches(body.watches);
    res.json({ ok: true, watchCount });
  });

  app.post('/api/push/notify', async (req, res) => {
    const body = req.body as {
      title?: string;
      body?: string;
      tag?: string;
      docId?: string;
      requireInteraction?: boolean;
      silent?: boolean;
      lockScreenDisplay?: boolean;
      endpoint?: string;
    };

    if (!body?.title || !body?.body) {
      res.status(400).json({ error: 'Missing notification title or body' });
      return;
    }

    const result = await pushStore.sendToSubscriptions(
      {
        title: body.title,
        body: body.body,
        tag: body.tag || `doc-notify-${Date.now()}`,
        docId: body.docId,
        url: body.docId ? `/?docId=${encodeURIComponent(body.docId)}` : '/',
        requireInteraction: body.requireInteraction ?? true,
        silent: body.silent ?? false,
        renotify: true,
        lockScreenDisplay: body.lockScreenDisplay ?? true,
        vibrate: body.silent ? undefined : [200, 100, 200],
        timestamp: Date.now(),
      },
      body.endpoint
    );

    res.json({ ok: true, ...result });
  });

  app.post('/api/push/test', async (req, res) => {
    const body = req.body as {
      endpoint?: string;
      lockScreenDisplay?: boolean;
      requireInteraction?: boolean;
      soundAndVibration?: boolean;
    };

    const result = await pushStore.sendToSubscriptions(
      {
        title: 'ທົດສອບ Desktop & Lock Screen Push',
        body: 'ການແຈ້ງເຕືອນພື້ນຫຼັງພ້ອມສະແດງຜົນເທິງໜ້າຈໍລັອກ ແລະ Desktop ເຖິງແມ່ນວ່າບໍ່ໄດ້ເປີດ Browser.',
        tag: `desktop-push-test-${Date.now()}`,
        url: '/',
        requireInteraction:
          (body?.lockScreenDisplay ?? true) && (body?.requireInteraction ?? true),
        silent: !(body?.soundAndVibration ?? true),
        renotify: true,
        lockScreenDisplay: body?.lockScreenDisplay ?? true,
        vibrate: body?.soundAndVibration === false ? undefined : [200, 100, 200],
        timestamp: Date.now(),
      },
      body?.endpoint
    );

    res.json({ ok: true, ...result });
  });

  // Background due-date scheduler so subscribed desktop/mobile devices still receive Lock Screen push alerts
  // even when all browser tabs/windows are closed.
  const scheduler = setInterval(() => {
    void pushStore.dispatchDueWatches().catch((err) => {
      console.error('Background push scheduler error:', err);
    });
  }, 60_000);
  scheduler.unref?.();

  app.get('/api/realtime/status', (_req, res) => {
    res.json(realtimeHub.getStatus());
  });

  app.post('/api/realtime/rooms/:roomId/events', (req, res) => {
    const roomId = req.params.roomId?.trim();
    if (!roomId) {
      res.status(400).json({ error: 'Missing roomId' });
      return;
    }

    const body = req.body as {
      type?: string;
      document?: DocumentRecord;
      docId?: string;
      documents?: DocumentRecord[];
      added?: DocumentRecord[];
      updated?: DocumentRecord[];
      deletedIds?: string[];
      senderId?: string;
    };

    if (body?.type === 'document:created' && body.document?.id) {
      const result = realtimeHub.publishRoomEvent(roomId, {
        type: 'document:created',
        document: body.document,
        senderId: body.senderId,
      });
      res.json({ ok: true, ...result });
      return;
    }

    if (body?.type === 'document:updated' && body.document?.id) {
      const result = realtimeHub.publishRoomEvent(roomId, {
        type: 'document:updated',
        document: body.document,
        senderId: body.senderId,
      });
      res.json({ ok: true, ...result });
      return;
    }

    if (body?.type === 'document:deleted' && typeof body.docId === 'string' && body.docId.trim()) {
      const result = realtimeHub.publishRoomEvent(roomId, {
        type: 'document:deleted',
        docId: body.docId.trim(),
        senderId: body.senderId,
      });
      res.json({ ok: true, ...result });
      return;
    }

    if (body?.type === 'documents:snapshot' && Array.isArray(body.documents)) {
      const result = realtimeHub.publishRoomEvent(roomId, {
        type: 'documents:snapshot',
        documents: body.documents,
        senderId: body.senderId,
      });
      res.json({ ok: true, ...result });
      return;
    }

    if (body?.type === 'sheets:delta') {
      const result = realtimeHub.publishRoomEvent(roomId, {
        type: 'sheets:delta',
        added: Array.isArray(body.added) ? body.added : [],
        updated: Array.isArray(body.updated) ? body.updated : [],
        deletedIds: Array.isArray(body.deletedIds) ? body.deletedIds : [],
        senderId: body.senderId,
      });
      res.json({ ok: true, ...result });
      return;
    }

    res.status(400).json({ error: 'Unsupported realtime event payload' });
  });

  // Local Disk / Drive D: & Excel (.xlsx) backup endpoints
  const localStorageDir = path.resolve(process.cwd(), 'local_drive_data');
  const localScansDir = path.join(localStorageDir, 'Scans');
  const localExcelPath = path.join(localStorageDir, 'documents.xlsx');

  const ensureLocalDirs = () => {
    fs.mkdirSync(localStorageDir, { recursive: true });
    fs.mkdirSync(localScansDir, { recursive: true });
  };

  app.get('/api/local-storage/status', (_req, res) => {
    ensureLocalDirs();
    const excelExists = fs.existsSync(localExcelPath);
    const stat = excelExists ? fs.statSync(localExcelPath) : null;
    const scanFiles = fs.existsSync(localScansDir)
      ? fs.readdirSync(localScansDir)
      : [];
    res.json({
      serverStorageDir: localStorageDir,
      scansDir: localScansDir,
      excelFilePath: localExcelPath,
      excelExists,
      scanCount: scanFiles.length,
      lastUpdatedAt: stat ? stat.mtime.toISOString() : null,
    });
  });

  app.get('/api/local-storage/documents', (_req, res) => {
    ensureLocalDirs();
    if (!fs.existsSync(localExcelPath)) {
      res.json({ ok: true, documents: [] });
      return;
    }
    try {
      const buf = fs.readFileSync(localExcelPath);
      const documents = excelBufferToDocuments(new Uint8Array(buf));
      res.json({ ok: true, documents });
    } catch {
      res.status(500).json({ error: 'Failed to read local Excel workbook' });
    }
  });

  app.post(
    '/api/local-storage/sync-excel',
    express.json({ limit: '15mb' }),
    (req, res) => {
      const body = req.body as { documents?: DocumentRecord[] };
      if (!Array.isArray(body?.documents)) {
        res.status(400).json({ error: 'Expected documents array' });
        return;
      }
      ensureLocalDirs();
      const buffer = documentsToExcelBuffer(body.documents);
      fs.writeFileSync(localExcelPath, Buffer.from(buffer));
      res.json({
        ok: true,
        filePath: localExcelPath,
        byteLength: buffer.byteLength,
        syncedAt: new Date().toISOString(),
      });
    }
  );

  app.post(
    '/api/local-storage/import-excel',
    express.json({ limit: '25mb' }),
    (req, res) => {
      const body = req.body as { dataBase64?: string };
      if (!body?.dataBase64 || typeof body.dataBase64 !== 'string') {
        res.status(400).json({ error: 'Missing Excel file payload' });
        return;
      }
      try {
        const raw = Buffer.from(body.dataBase64, 'base64');
        const documents = excelBufferToDocuments(new Uint8Array(raw));
        res.json({ ok: true, documents });
      } catch {
        res.status(400).json({ error: 'Invalid Excel (.xlsx) workbook' });
      }
    }
  );

  app.post(
    '/api/local-storage/upload-scan',
    express.json({ limit: '35mb' }),
    (req, res) => {
      const body = req.body as {
        fileName?: string;
        mimeType?: string;
        dataBase64?: string;
      };
      if (!body?.fileName || !body?.dataBase64) {
        res.status(400).json({ error: 'Missing fileName or dataBase64' });
        return;
      }
      ensureLocalDirs();
      const baseName = path
        .basename(body.fileName)
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const safeName = `${Date.now()}_${baseName || 'scan.jpg'}`;
      const targetPath = path.join(localScansDir, safeName);
      const buffer = Buffer.from(body.dataBase64, 'base64');
      fs.writeFileSync(targetPath, buffer);
      res.json({
        ok: true,
        id: `local-${safeName}`,
        name: safeName,
        webViewLink: `/api/local-storage/files/${encodeURIComponent(safeName)}`,
      });
    }
  );

  app.get('/api/local-storage/files/:filename', (req, res) => {
    const safeName = path.basename(req.params.filename || '');
    const targetPath = path.join(localScansDir, safeName);
    if (!safeName || !fs.existsSync(targetPath)) {
      res.status(404).json({ error: 'Local scan file not found' });
      return;
    }
    res.sendFile(targetPath);
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
