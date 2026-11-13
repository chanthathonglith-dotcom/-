import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DocumentDirection,
  DocumentPurpose,
  DocumentRecord,
  DocumentStatus,
} from '../types/document';
import {
  applyRealtimeDelta,
  computeDocumentDiff,
  parseSheetRowsServerSafe,
} from './realtimeSyncLogic';

const baseDoc1: DocumentRecord = {
  id: 'DOC-1',
  direction: DocumentDirection.INCOMING,
  docNumber: '001/ຂຂ-2026',
  docDate: '2026-11-10',
  incomingDate: '2026-11-10',
  outgoingDate: '',
  dueDate: '',
  title: 'ເອກະສານ 1',
  department: 'ພະແນກການເງິນ',
  purpose: DocumentPurpose.INFO,
  leadershipComment: '',
  status: DocumentStatus.PENDING,
  scanLink: '',
  scanFileName: '',
  driveFileId: '',
  createdBy: 'u1@example.com',
  updatedAt: '2026-11-10T09:00:00.000Z',
  sheetRowNumber: 2,
};

const baseDoc2: DocumentRecord = {
  id: 'DOC-2',
  direction: DocumentDirection.OUTGOING,
  docNumber: '002/ຂອ-2026',
  docDate: '2026-11-11',
  incomingDate: '2026-11-11',
  outgoingDate: '2026-11-12',
  dueDate: '',
  title: 'ເອກະສານ 2',
  department: 'ຫ້ອງວ່າການ',
  purpose: DocumentPurpose.SIGNATURE,
  leadershipComment: 'ເຫັນດີ',
  status: DocumentStatus.IN_PROGRESS,
  scanLink: '',
  scanFileName: '',
  driveFileId: '',
  createdBy: 'u1@example.com',
  updatedAt: '2026-11-11T09:00:00.000Z',
  sheetRowNumber: 3,
};

test('computeDocumentDiff detects additions, updates, deletions, and ignores volatile row shifts', () => {
  const doc3: DocumentRecord = {
    ...baseDoc1,
    id: 'DOC-3',
    docNumber: '003/ຂຂ-2026',
    title: 'ເອກະສານ 3',
  };

  // DOC-1 deleted -> DOC-2 shifts from row 3 to row 2 without changing data -> DOC-2 is NOT marked updated
  const diff1 = computeDocumentDiff(
    [baseDoc1, baseDoc2],
    [{ ...baseDoc2, sheetRowNumber: 2 }, doc3]
  );
  assert.equal(diff1.hasChanges, true);
  assert.deepEqual(diff1.deletedIds, ['DOC-1']);
  assert.deepEqual(diff1.updated, []);
  assert.deepEqual(
    diff1.added.map((d) => d.id),
    ['DOC-3']
  );

  // Editing status and leadershipComment triggers updated
  const editedDoc2 = {
    ...baseDoc2,
    status: DocumentStatus.COMPLETED,
    leadershipComment: 'ອະນຸມັດແລ້ວ',
  };
  const diff2 = computeDocumentDiff([baseDoc1, baseDoc2], [baseDoc1, editedDoc2]);
  assert.equal(diff2.hasChanges, true);
  assert.equal(diff2.added.length, 0);
  assert.equal(diff2.deletedIds.length, 0);
  assert.equal(diff2.updated.length, 1);
  assert.equal(diff2.updated[0].status, DocumentStatus.COMPLETED);
});

test('applyRealtimeDelta is idempotent for create, update, delete, and sheets:delta', () => {
  const createdEvent = {
    type: 'document:created' as const,
    roomId: 'demo',
    document: baseDoc2,
    timestamp: 1000,
  };

  const afterFirstCreate = applyRealtimeDelta([baseDoc1], createdEvent);
  assert.equal(afterFirstCreate.length, 2);

  // Duplicate broadcast should NOT duplicate DOC-2
  const afterSecondCreate = applyRealtimeDelta(afterFirstCreate, createdEvent);
  assert.equal(afterSecondCreate.length, 2);

  // Update replaces in-place
  const updatedDoc2 = { ...baseDoc2, title: 'ຫົວຂໍ້ໃໝ່' };
  const afterUpdate = applyRealtimeDelta(afterSecondCreate, {
    type: 'document:updated',
    roomId: 'demo',
    document: updatedDoc2,
    timestamp: 2000,
  });
  assert.equal(afterUpdate.find((d) => d.id === 'DOC-2')?.title, 'ຫົວຂໍ້ໃໝ່');

  // Delete is idempotent
  const afterDelete1 = applyRealtimeDelta(afterUpdate, {
    type: 'document:deleted',
    roomId: 'demo',
    docId: 'DOC-1',
    timestamp: 3000,
  });
  const afterDelete2 = applyRealtimeDelta(afterDelete1, {
    type: 'document:deleted',
    roomId: 'demo',
    docId: 'DOC-1',
    timestamp: 3001,
  });
  assert.deepEqual(
    afterDelete2.map((d) => d.id),
    ['DOC-2']
  );

  // sheets:delta applies additions, edits, and deletions together without duplicating
  const doc3: DocumentRecord = { ...baseDoc1, id: 'DOC-3', docNumber: '003/ຂຂ' };
  const afterDelta = applyRealtimeDelta([baseDoc1, baseDoc2], {
    type: 'sheets:delta',
    roomId: 'sheet-1',
    added: [doc3],
    updated: [updatedDoc2],
    deletedIds: ['DOC-1'],
    timestamp: 4000,
  });
  assert.deepEqual(
    afterDelta.map((d) => d.id),
    ['DOC-3', 'DOC-2']
  );
  assert.equal(afterDelta.find((d) => d.id === 'DOC-2')?.title, 'ຫົວຂໍ້ໃໝ່');
});

test('parseSheetRowsServerSafe parses 20-col sheet rows with signature fields accurately', () => {
  const rows = [
    ['ID', 'ປະເພດ', 'ເລກທີ'],
    [
      'DOC-99',
      'ຂາອອກ',
      '150/ຂອ-2026',
      '2026-11-12',
      'ແຈ້ງການດ່ວນ',
      'ຫ້ອງວ່າການ',
      'ເພື່ອຊາບ',
      'ອະນຸມັດ',
      'ສຳເລັດແລ້ວ',
      'https://drive.google.com/file/d/abc/view',
      'notice.pdf',
      'abc',
      'user@gov.la',
      '2026-11-12T10:00:00.000Z',
      '2026-11-18',
      '2026-11-11',
      '2026-11-12',
      'ທ່ານ ຄຳພັນ',
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ',
      '2026-11-12T10:05:00.000Z',
      '305/ຂອ-2026',
    ],
  ];
  const parsed = parseSheetRowsServerSafe(rows);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].direction, DocumentDirection.OUTGOING);
  assert.equal(parsed[0].outgoingDocNumber, '305/ຂອ-2026');
  assert.equal(parsed[0].incomingDate, '2026-11-11');
  assert.equal(parsed[0].outgoingDate, '2026-11-12');
  assert.equal(parsed[0].status, DocumentStatus.COMPLETED);
  assert.equal(parsed[0].approverName, 'ທ່ານ ຄຳພັນ');
  assert.equal(
    parsed[0].signatureDataUrl,
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
  );
  assert.equal(parsed[0].signedAt, '2026-11-12T10:05:00.000Z');
  assert.equal(parsed[0].sheetRowNumber, 2);

  const signedDiff = computeDocumentDiff([baseDoc1], [
    {
      ...baseDoc1,
      outgoingDocNumber: '305/ຂອ-2026',
      approverName: 'ທ່ານ ຄຳພັນ',
      signatureDataUrl: 'data:image/png;base64,AAAA',
    },
  ]);
  assert.equal(signedDiff.updated.length, 1);
});
