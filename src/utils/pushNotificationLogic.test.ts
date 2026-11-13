import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DocumentDirection,
  DocumentPurpose,
  DocumentRecord,
  DocumentStatus,
} from '../types/document';
import {
  buildDocumentWatchItems,
  buildLockScreenNotificationOptions,
  buildPushDeepLinkUrl,
  extractDocIdFromUrl,
  formatWatchPushBody,
  urlBase64ToUint8Array,
} from './pushNotificationLogic';

const makeDoc = (overrides: Partial<DocumentRecord> = {}): DocumentRecord => ({
  id: 'DOC-100',
  direction: DocumentDirection.INCOMING,
  docNumber: '012/ຂຂ-2026',
  docDate: '2026-11-10',
  dueDate: '2026-11-12',
  title: 'ສະເໜີຂໍທິດຊີ້ນຳໂຄງການ',
  department: 'ພະແນກແຜນການ',
  purpose: DocumentPurpose.GUIDANCE,
  leadershipComment: '',
  status: DocumentStatus.PENDING,
  scanLink: '',
  scanFileName: '',
  driveFileId: '',
  createdBy: 'user@example.com',
  updatedAt: '2026-11-10T09:00:00.000Z',
  ...overrides,
});

test('buildPushDeepLinkUrl and extractDocIdFromUrl round-trip document IDs', () => {
  assert.equal(buildPushDeepLinkUrl(undefined), '/');
  const url = buildPushDeepLinkUrl('DOC 100/A');
  assert.equal(url, '/?docId=DOC%20100%2FA');
  assert.equal(extractDocIdFromUrl(url.replace('/', '')), 'DOC 100/A');
  assert.equal(extractDocIdFromUrl('?autostart=1&docId=DOC-42'), 'DOC-42');
  assert.equal(extractDocIdFromUrl('?autostart=1'), null);
});

test('buildLockScreenNotificationOptions applies lock screen, requireInteraction, sound, and actions', () => {
  const locked = buildLockScreenNotificationOptions(
    {
      title: 'ເອກະສານດ່ວນ',
      body: 'ກວດສອບເອກະສານ',
      tag: 'urgent-1',
      docId: 'DOC-100',
      timestamp: 1700000000000,
    },
    {
      lockScreenDisplay: true,
      requireInteraction: true,
      soundAndVibration: true,
    }
  );

  assert.equal(locked.requireInteraction, true);
  assert.equal(locked.silent, false);
  assert.deepEqual(locked.vibrate, [200, 100, 200]);
  assert.equal(locked.icon, '/pwa-192x192.png');
  assert.equal(locked.badge, '/badge-72x72.png');
  assert.equal(locked.data.url, '/?docId=DOC-100');
  assert.equal(locked.actions[0].action, 'open');

  const quiet = buildLockScreenNotificationOptions(
    {
      title: 'ທົດສອບ',
      body: 'ຂໍ້ຄວາມ',
      tag: 'test-1',
    },
    {
      lockScreenDisplay: false,
      requireInteraction: true,
      soundAndVibration: false,
    }
  );

  assert.equal(quiet.requireInteraction, false);
  assert.equal(quiet.silent, true);
  assert.equal(quiet.vibrate, undefined);
});

test('buildDocumentWatchItems filters completed docs and formats overdue body', () => {
  const docs = [
    makeDoc({ id: 'PENDING-DUE', dueDate: '2026-11-12', status: DocumentStatus.PENDING }),
    makeDoc({ id: 'DONE-DUE', dueDate: '2026-11-12', status: DocumentStatus.COMPLETED }),
    makeDoc({ id: 'NO-DUE', dueDate: '', status: DocumentStatus.IN_PROGRESS }),
  ];

  const watches = buildDocumentWatchItems(docs);
  assert.equal(watches.length, 1);
  assert.equal(watches[0].id, 'PENDING-DUE');

  const formatted = formatWatchPushBody(watches[0], '2026-11-13');
  assert.equal(formatted.title, 'ເອກະສານເກີນກຳນົດແລ້ວ (ແຈ້ງເຕືອນພື້ນຫຼັງ)');
  assert.ok(formatted.body.includes('012/ຂຂ-2026'));
  assert.ok(formatted.body.includes('12/11/2026'));
});

test('urlBase64ToUint8Array decodes URL-safe base64 VAPID keys', () => {
  const bytes = urlBase64ToUint8Array('SGVsbG8td29ybGRf');
  assert.equal(bytes.length, 12);
  assert.equal(bytes[0], 72); // 'H'
});
