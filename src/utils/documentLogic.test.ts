import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FILTERS,
  DocumentDirection,
  DocumentPurpose,
  DocumentRecord,
  DocumentStatus,
  SortOrder,
} from '../types/document';
import {
  computeDocumentStats,
  documentToSheetRow,
  exportDocumentsToCsv,
  filterDocuments,
  getEffectiveIncomingDate,
  getEffectiveOutgoingDate,
  hasValidationErrors,
  resolvePrimaryDocDate,
  sheetRowsToDocuments,
  sortDocuments,
  validateDocumentInput,
  SHEET_HEADERS,
} from './documentLogic';

const sampleDocs: DocumentRecord[] = [
  {
    id: 'DOC-1',
    direction: DocumentDirection.INCOMING,
    docNumber: '001/ຂຂ-2026',
    docDate: '2026-11-10',
    dueDate: '',
    title: 'ຂໍອະນຸມັດງົບປະມານ',
    department: 'ພະແນກການເງິນ',
    purpose: DocumentPurpose.SIGNATURE,
    leadershipComment: 'ເຫັນດີຕາມສະເໜີ',
    status: DocumentStatus.COMPLETED,
    scanLink: 'https://drive.google.com/file/d/abc/view',
    scanFileName: 'budget.pdf',
    driveFileId: 'abc',
    approverName: 'ທ່ານ ບຸນມີ ພົມມະວົງ',
    signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ',
    signedAt: '2026-11-10T10:00:00.000Z',
    createdBy: 'user@example.com',
    updatedAt: '2026-11-10T10:00:00.000Z',
  },
  {
    id: 'DOC-2',
    direction: DocumentDirection.OUTGOING,
    docNumber: '002/ຂອ-2026',
    docDate: '2026-11-12',
    dueDate: '',
    title: 'ແຈ້ງການປະຊຸມ',
    department: 'ຫ້ອງວ່າການ',
    purpose: DocumentPurpose.INFO,
    leadershipComment: '',
    status: DocumentStatus.PENDING,
    scanLink: '',
    scanFileName: '',
    driveFileId: '',
    createdBy: 'user@example.com',
    updatedAt: '2026-11-12T08:00:00.000Z',
  },
  {
    id: 'DOC-3',
    direction: DocumentDirection.INCOMING,
    docNumber: '003/ຂຂ-2026',
    docDate: '2026-11-11',
    dueDate: '',
    title: 'ຮ່າງລະບຽບການໃໝ່',
    department: 'ພະແນກນິຕິກຳ',
    purpose: DocumentPurpose.OPINION,
    leadershipComment: 'ໃຫ້ປັບປຸງມາດຕາ 4',
    status: DocumentStatus.IN_PROGRESS,
    scanLink: 'https://drive.google.com/file/d/xyz/view',
    scanFileName: 'draft.pdf',
    driveFileId: 'xyz',
    createdBy: 'user@example.com',
    updatedAt: '2026-11-11T12:00:00.000Z',
  },
  {
    id: 'DOC-4',
    direction: DocumentDirection.LEGAL,
    docNumber: '015/ນກ-2026',
    docDate: '2026-11-08',
    dueDate: '',
    title: 'ຂໍ້ຕົກລົງວ່າດ້ວຍລະບຽບການຄຸ້ມຄອງເອກະສານ',
    department: 'ພະແນກນິຕິກຳ',
    purpose: DocumentPurpose.SIGNATURE,
    leadershipComment: 'ສະເໜີລົງນາມ',
    status: DocumentStatus.COMPLETED,
    scanLink: 'https://drive.google.com/file/d/legal/view',
    scanFileName: 'legal.pdf',
    driveFileId: 'legal',
    createdBy: 'user@example.com',
    updatedAt: '2026-11-08T10:00:00.000Z',
  },
  {
    id: 'DOC-5',
    direction: DocumentDirection.SPEECH,
    docNumber: '009/ບອ-2026',
    docDate: '2026-11-09',
    dueDate: '',
    title: 'ບົດໂອ້ລົມກອງປະຊຸມສະຫຼຸບວຽກງານປະຈຳປີ',
    department: 'ຫ້ອງວ່າການ',
    purpose: DocumentPurpose.OPINION,
    leadershipComment: 'ກວດແກ້ຄຳເວົ້າ',
    status: DocumentStatus.PENDING,
    scanLink: '',
    scanFileName: '',
    driveFileId: '',
    createdBy: 'user@example.com',
    updatedAt: '2026-11-09T11:00:00.000Z',
  },
];

test('filterDocuments filters by query, direction, purpose, status, and date range', () => {
  const byQuery = filterDocuments(sampleDocs, {
    ...DEFAULT_FILTERS,
    query: 'ງົບປະມານ',
  });
  assert.equal(byQuery.length, 1);
  assert.equal(byQuery[0].id, 'DOC-1');

  const byPurpose = filterDocuments(sampleDocs, {
    ...DEFAULT_FILTERS,
    purpose: DocumentPurpose.OPINION,
  });
  assert.equal(byPurpose.length, 2);
  assert.deepEqual(
    byPurpose.map((d) => d.id),
    ['DOC-3', 'DOC-5']
  );

  const byDirection = filterDocuments(sampleDocs, {
    ...DEFAULT_FILTERS,
    direction: DocumentDirection.OUTGOING,
  });
  assert.equal(byDirection.length, 1);
  assert.equal(byDirection[0].id, 'DOC-2');

  const byLegal = filterDocuments(sampleDocs, {
    ...DEFAULT_FILTERS,
    direction: DocumentDirection.LEGAL,
  });
  assert.equal(byLegal.length, 1);
  assert.equal(byLegal[0].id, 'DOC-4');

  const bySpeech = filterDocuments(sampleDocs, {
    ...DEFAULT_FILTERS,
    direction: DocumentDirection.SPEECH,
  });
  assert.equal(bySpeech.length, 1);
  assert.equal(bySpeech[0].id, 'DOC-5');

  const byDateRange = filterDocuments(sampleDocs, {
    ...DEFAULT_FILTERS,
    dateFrom: '2026-11-11',
    dateTo: '2026-11-12',
  });
  assert.equal(byDateRange.length, 2);
});

test('sortDocuments orders records cleanly', () => {
  const desc = sortDocuments(sampleDocs, SortOrder.DATE_DESC);
  assert.deepEqual(
    desc.map((d) => d.id),
    ['DOC-2', 'DOC-3', 'DOC-1', 'DOC-5', 'DOC-4']
  );

  const asc = sortDocuments(sampleDocs, SortOrder.DATE_ASC);
  assert.deepEqual(
    asc.map((d) => d.id),
    ['DOC-4', 'DOC-5', 'DOC-1', 'DOC-3', 'DOC-2']
  );
});

test('computeDocumentStats summarizes totals accurately', () => {
  const stats = computeDocumentStats(sampleDocs);
  assert.equal(stats.total, 5);
  assert.equal(stats.incoming, 2);
  assert.equal(stats.outgoing, 1);
  assert.equal(stats.legal, 1);
  assert.equal(stats.speech, 1);
  assert.equal(stats.pendingAction, 3);
  assert.equal(stats.completed, 2);
});

test('validateDocumentInput catches missing required fields and invalid URLs', () => {
  const invalid = validateDocumentInput({
    direction: DocumentDirection.INCOMING,
    docNumber: '',
    docDate: '',
    dueDate: '',
    title: '  ',
    department: '',
    purpose: DocumentPurpose.GUIDANCE,
    leadershipComment: '',
    status: DocumentStatus.PENDING,
    scanLink: 'ftp://invalid-link',
    scanFileName: '',
    driveFileId: '',
  });
  assert.equal(hasValidationErrors(invalid), true);
  assert.ok(invalid.docNumber);
  assert.ok(invalid.incomingDate);
  assert.ok(invalid.title);
  assert.ok(invalid.department);
  assert.ok(invalid.scanLink);

  const invalidLegal = validateDocumentInput({
    direction: DocumentDirection.LEGAL,
    docNumber: '001/ນກ',
    docDate: '',
    dueDate: '',
    title: 'ນິຕິກຳທົດສອບ',
    department: 'ພະແນກນິຕິກຳ',
    purpose: DocumentPurpose.INFO,
    leadershipComment: '',
    status: DocumentStatus.PENDING,
    scanLink: '',
    scanFileName: '',
    driveFileId: '',
  });
  assert.ok(invalidLegal.docDate);

  const valid = validateDocumentInput({
    direction: DocumentDirection.INCOMING,
    docNumber: '010/ຂຂ-2026',
    docDate: '2026-11-12',
    dueDate: '',
    title: 'ເອກະສານທົດສອບ',
    department: 'ພະແນກບໍລິຫານ',
    purpose: DocumentPurpose.GUIDANCE,
    leadershipComment: '',
    status: DocumentStatus.PENDING,
    scanLink: 'https://drive.google.com/file/d/123/view',
    scanFileName: 'test.pdf',
    driveFileId: '123',
  });
  assert.equal(hasValidationErrors(valid), false);
});

test('Google Sheets serialization round-trips records with row indices', () => {
  const rows = [
    [...SHEET_HEADERS],
    documentToSheetRow(sampleDocs[0]),
    documentToSheetRow(sampleDocs[1]),
    documentToSheetRow(sampleDocs[3]),
    documentToSheetRow(sampleDocs[4]),
  ];
  const parsed = sheetRowsToDocuments(rows);
  assert.equal(parsed.length, 4);
  assert.equal(parsed[0].id, 'DOC-1');
  assert.equal(parsed[0].purpose, DocumentPurpose.SIGNATURE);
  assert.equal(parsed[0].status, DocumentStatus.COMPLETED);
  assert.equal(parsed[0].approverName, 'ທ່ານ ບຸນມີ ພົມມະວົງ');
  assert.equal(
    parsed[0].signatureDataUrl,
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
  );
  assert.equal(parsed[0].signedAt, '2026-11-10T10:00:00.000Z');
  assert.equal(parsed[0].sheetRowNumber, 2);
  assert.equal(parsed[1].direction, DocumentDirection.OUTGOING);
  assert.equal(parsed[1].sheetRowNumber, 3);
  assert.equal(parsed[2].direction, DocumentDirection.LEGAL);
  assert.equal(parsed[2].sheetRowNumber, 4);
  assert.equal(parsed[3].direction, DocumentDirection.SPEECH);
  assert.equal(parsed[3].sheetRowNumber, 5);
  // Legacy 15-column sheet row without columns P/Q still populates incoming/outgoing dates by direction
  const legacyRow = documentToSheetRow(sampleDocs[0]).slice(0, 15);
  const legacyParsed = sheetRowsToDocuments([[...SHEET_HEADERS], legacyRow]);
  assert.equal(legacyParsed[0].incomingDate, '2026-11-10');
  assert.equal(legacyParsed[0].outgoingDate, '');

  // Explicit dual dates round-trip through 17-column sheet serialization
  const dualDoc: DocumentRecord = {
    ...sampleDocs[0],
    incomingDate: '2026-11-10',
    outgoingDate: '2026-11-14',
  };
  const dualParsed = sheetRowsToDocuments([[...SHEET_HEADERS], documentToSheetRow(dualDoc)]);
  assert.equal(dualParsed[0].incomingDate, '2026-11-10');
  assert.equal(dualParsed[0].outgoingDate, '2026-11-14');

  // Outgoing document with required incomingDate and blank optional outgoingDate stays blank
  const outgoingNoOutDate: DocumentRecord = {
    ...sampleDocs[1],
    docDate: '2026-11-12',
    incomingDate: '2026-11-12',
    outgoingDate: '',
  };
  assert.equal(getEffectiveOutgoingDate(outgoingNoOutDate), '');
  const outgoingNoOutParsed = sheetRowsToDocuments([
    [...SHEET_HEADERS],
    documentToSheetRow(outgoingNoOutDate),
  ]);
  assert.equal(outgoingNoOutParsed[0].incomingDate, '2026-11-12');
  assert.equal(outgoingNoOutParsed[0].outgoingDate, '');
});

test('separated incoming/outgoing date helpers resolve and validate accurately', () => {
  assert.equal(
    getEffectiveIncomingDate({
      direction: DocumentDirection.INCOMING,
      docDate: '2026-11-10',
      incomingDate: '',
    }),
    '2026-11-10'
  );
  assert.equal(
    getEffectiveOutgoingDate({
      direction: DocumentDirection.OUTGOING,
      docDate: '2026-11-12',
      outgoingDate: '2026-11-13',
    }),
    '2026-11-13'
  );
  assert.equal(
    resolvePrimaryDocDate({
      direction: DocumentDirection.OUTGOING,
      docDate: '2026-11-01',
      incomingDate: '2026-11-05',
      outgoingDate: '2026-11-15',
    }),
    '2026-11-15'
  );

  const validWithoutOutgoing = validateDocumentInput({
    direction: DocumentDirection.OUTGOING,
    docNumber: '120/ຂອ-2026',
    docDate: '2026-11-10',
    incomingDate: '2026-11-10',
    outgoingDate: '',
    dueDate: '',
    title: 'ໜັງສືຂາອອກ',
    department: 'ພະແນກບໍລິຫານ',
    purpose: DocumentPurpose.INFO,
    leadershipComment: '',
    status: DocumentStatus.PENDING,
    scanLink: '',
    scanFileName: '',
    driveFileId: '',
  });
  assert.equal(hasValidationErrors(validWithoutOutgoing), false);

  const missingIncomingOnOutgoing = validateDocumentInput({
    direction: DocumentDirection.OUTGOING,
    docNumber: '121/ຂອ-2026',
    docDate: '2026-11-12',
    incomingDate: '',
    outgoingDate: '2026-11-12',
    dueDate: '',
    title: 'ໜັງສືຂາອອກ ບໍ່ມີວັນທີຂາເຂົ້າ',
    department: 'ພະແນກບໍລິຫານ',
    purpose: DocumentPurpose.INFO,
    leadershipComment: '',
    status: DocumentStatus.PENDING,
    scanLink: '',
    scanFileName: '',
    driveFileId: '',
  });
  assert.equal(hasValidationErrors(missingIncomingOnOutgoing), true);
  assert.ok(missingIncomingOnOutgoing.incomingDate);
  assert.equal(missingIncomingOnOutgoing.outgoingDate, undefined);
});

test('exportDocumentsToCsv includes UTF-8 BOM and escapes commas', () => {
  const csv = exportDocumentsToCsv([
    {
      ...sampleDocs[0],
      title: 'ຫົວຂໍ້, ມີຈຸດ',
    },
  ]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"ຫົວຂໍ້, ມີຈຸດ"'));
});

test('outgoingDocNumber round-trips in 21-column serialization and is searchable', () => {
  assert.equal(SHEET_HEADERS.length, 21);
  const docWithOutgoingNo: DocumentRecord = {
    ...sampleDocs[0],
    outgoingDocNumber: '888/ຂອ-2026',
  };
  const row = documentToSheetRow(docWithOutgoingNo);
  assert.equal(row.length, 21);
  assert.equal(row[20], '888/ຂອ-2026');

  const parsed = sheetRowsToDocuments([[...SHEET_HEADERS], row]);
  assert.equal(parsed[0].outgoingDocNumber, '888/ຂອ-2026');

  const filtered = filterDocuments([docWithOutgoingNo, sampleDocs[1]], {
    ...DEFAULT_FILTERS,
    query: '888/ຂອ',
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'DOC-1');
});
