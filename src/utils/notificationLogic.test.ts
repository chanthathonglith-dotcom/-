import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DocumentDirection,
  DocumentPurpose,
  DocumentRecord,
  DocumentStatus,
  NotificationTriggerType,
} from '../types/document';
import {
  buildDueDocumentNotification,
  buildNewDocumentNotification,
  detectDueDocuments,
  detectNewDocuments,
  getDueDedupeKey,
  getLocalTodayIso,
} from './notificationLogic';

const makeDoc = (overrides: Partial<DocumentRecord> = {}): DocumentRecord => ({
  id: 'DOC-1',
  direction: DocumentDirection.INCOMING,
  docNumber: '001/ຂຂ-2026',
  docDate: '2026-11-10',
  dueDate: '',
  title: 'ເອກະສານທົດສອບ',
  department: 'ພະແນກບໍລິຫານ',
  purpose: DocumentPurpose.OPINION,
  leadershipComment: '',
  status: DocumentStatus.PENDING,
  scanLink: '',
  scanFileName: '',
  driveFileId: '',
  createdBy: 'user@example.com',
  updatedAt: '2026-11-10T09:00:00.000Z',
  ...overrides,
});

test('detectNewDocuments ignores initial empty baseline and returns newly added rows', () => {
  const doc1 = makeDoc({ id: 'DOC-1' });
  const doc2 = makeDoc({ id: 'DOC-2', docNumber: '002/ຂຂ-2026' });

  assert.deepEqual(detectNewDocuments([], [doc1]), []);
  const added = detectNewDocuments([doc1], [doc1, doc2]);
  assert.equal(added.length, 1);
  assert.equal(added[0].id, 'DOC-2');
});

test('detectDueDocuments matches non-completed docs whose dueDate is today or overdue and respects dedupe', () => {
  const today = '2026-11-12';
  const docs = [
    makeDoc({ id: 'DUE-TODAY', dueDate: '2026-11-12', status: DocumentStatus.PENDING }),
    makeDoc({ id: 'OVERDUE', dueDate: '2026-11-10', status: DocumentStatus.IN_PROGRESS }),
    makeDoc({ id: 'COMPLETED-DUE', dueDate: '2026-11-12', status: DocumentStatus.COMPLETED }),
    makeDoc({ id: 'FUTURE', dueDate: '2026-11-20', status: DocumentStatus.PENDING }),
    makeDoc({ id: 'NO-DUE', dueDate: '', status: DocumentStatus.PENDING }),
  ];

  const dedupe = new Set<string>([getDueDedupeKey('OVERDUE', today)]);
  const due = detectDueDocuments(docs, today, dedupe);

  assert.deepEqual(
    due.map((d) => d.id),
    ['DUE-TODAY']
  );
});

test('notification payload builders format Lao titles and bodies accurately', () => {
  const doc = makeDoc({
    id: 'DOC-9',
    docNumber: '055/ຂຂ-2026',
    dueDate: '2026-11-12',
    title: 'ສະເໜີຂໍລາຍເຊັນ',
    department: 'ພະແນກການເງິນ',
  });

  const newPayload = buildNewDocumentNotification(doc);
  assert.equal(newPayload.type, NotificationTriggerType.NEW_SHEET_DOCUMENT);
  assert.ok(newPayload.body.includes('055/ຂຂ-2026'));

  const dueToday = buildDueDocumentNotification(doc, '2026-11-12');
  assert.equal(dueToday.title, 'ເຖິງວັນທີກຳນົດຂອງເອກະສານແລ້ວ');
  assert.ok(dueToday.body.includes('12/11/2026'));

  const overdue = buildDueDocumentNotification(doc, '2026-11-13');
  assert.equal(overdue.title, 'ເອກະສານເກີນວັນທີກຳນົດແລ້ວ');
});

test('getLocalTodayIso formats YYYY-MM-DD', () => {
  assert.equal(getLocalTodayIso(new Date(2026, 10, 12)), '2026-11-12');
});
