import test from 'node:test';
import assert from 'node:assert/strict';
import { DocumentDirection, DocumentPurpose, DocumentRecord, DocumentStatus } from '../types/document';
import {
  buildPrintableDocumentSummary,
  formatPrintTimestamp,
  getDocumentPartyLabel,
} from './documentPrintLogic';

test('getDocumentPartyLabel returns context-appropriate Lao labels for every direction', () => {
  assert.equal(getDocumentPartyLabel(DocumentDirection.INCOMING), 'ພາກສ່ວນສົ່ງເອກະສານມາ');
  assert.equal(getDocumentPartyLabel(DocumentDirection.OUTGOING), 'ພາກສ່ວນຮັບເອກະສານ');
  assert.equal(getDocumentPartyLabel(DocumentDirection.LEGAL), 'ພາກສ່ວນອອກ / ຮັບຜິດຊອບ');
  assert.equal(getDocumentPartyLabel(DocumentDirection.SPEECH), 'ພາກສ່ວນ / ເຈົ້າພາບຈັດງານ');
});

test('formatPrintTimestamp formats DD/MM/YYYY HH:MM reliably', () => {
  const sample = new Date(2026, 10, 13, 9, 5);
  assert.equal(formatPrintTimestamp(sample), '13/11/2026 09:05');
});

test('buildPrintableDocumentSummary builds clean metadata, dates, signature, and scan details', () => {
  const record: DocumentRecord = {
    id: 'DOC-202601',
    direction: DocumentDirection.INCOMING,
    docNumber: '042/ຂຂ-2026',
    outgoingDocNumber: '119/ຂອ-2026',
    docDate: '2026-11-12',
    incomingDate: '2026-11-12',
    outgoingDate: '2026-11-13',
    dueDate: '2026-11-15',
    title: 'ໜັງສືສະເໜີຂໍອະນຸມັດແຜນງົບປະມານ',
    department: 'ພະແນກການເງິນ',
    purpose: DocumentPurpose.SIGNATURE,
    status: DocumentStatus.COMPLETED,
    leadershipComment: 'ເຫັນດີຕາມສະເໜີ',
    approverName: 'ທ່ານ ບຸນມີ',
    signatureDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    signedAt: '2026-11-13T08:30:00.000Z',
    scanLink: 'https://drive.google.com/file/d/abc/view',
    scanFileName: 'scan-042.pdf',
    driveFileId: 'abc',
    createdBy: 'admin@example.com',
    updatedAt: '2026-11-13T08:30:00.000Z',
  };

  const summary = buildPrintableDocumentSummary(record, new Date(2026, 10, 13, 10, 15));
  assert.equal(summary.docNumber, '042/ຂຂ-2026');
  assert.equal(summary.outgoingDocNumber, '119/ຂອ-2026');
  assert.equal(summary.incomingDateText, '12/11/2026');
  assert.equal(summary.outgoingDateText, '13/11/2026');
  assert.equal(summary.dueDateText, '15/11/2026');
  assert.equal(summary.hasSignature, true);
  assert.equal(summary.approverName, 'ທ່ານ ບຸນມີ');
  assert.equal(summary.scanFileName, 'scan-042.pdf');
  assert.equal(summary.printedAtText, '13/11/2026 10:15');
  assert.equal(summary.metadataRows.length, 10);
});

test('buildPrintableDocumentSummary gracefully handles missing optional fields', () => {
  const minimal: DocumentRecord = {
    id: 'DOC-202602',
    direction: DocumentDirection.SPEECH,
    docNumber: '009/ບອ-2026',
    docDate: '2026-11-11',
    dueDate: '',
    title: 'ບົດໂອ້ລົມກອງປະຊຸມ',
    department: 'ຫ້ອງວ່າການ',
    purpose: DocumentPurpose.OPINION,
    status: DocumentStatus.PENDING,
    leadershipComment: '',
    scanLink: '',
    scanFileName: '',
    driveFileId: '',
    createdBy: 'admin@example.com',
    updatedAt: '2026-11-11T08:00:00.000Z',
  };

  const summary = buildPrintableDocumentSummary(minimal);
  assert.equal(summary.outgoingDocNumber, '-');
  assert.equal(summary.incomingDateText, '-');
  assert.equal(summary.outgoingDateText, '-');
  assert.equal(summary.dueDateText, 'ບໍ່ໄດ້ກຳນົດ');
  assert.equal(summary.leadershipComment, 'ຍັງບໍ່ມີຄຳເຫັນຂອງການນຳ');
  assert.equal(summary.hasSignature, false);
});
