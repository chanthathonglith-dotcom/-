import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DocumentDirection,
  DocumentPurpose,
  DocumentRecord,
  DocumentStatus,
} from '../types/document';
import {
  buildExcelDownloadFilename,
  documentsToExcelBuffer,
  excelBufferToDocuments,
  normalizeDriveDPaths,
} from './excelStorageLogic';

const sampleDocs: DocumentRecord[] = [
  {
    id: 'DOC-XLS-1',
    direction: DocumentDirection.INCOMING,
    docNumber: '042/ຂຂ-2026',
    outgoingDocNumber: '119/ຂອ-2026',
    docDate: '2026-11-12',
    incomingDate: '2026-11-12',
    outgoingDate: '2026-11-13',
    dueDate: '2026-11-20',
    title: 'ເອກະສານທົດສອບ Excel ພາສາລາວ',
    department: 'ພະແນກການເງິນ',
    purpose: DocumentPurpose.SIGNATURE,
    leadershipComment: 'ເຫັນດີອະນຸມັດ',
    status: DocumentStatus.COMPLETED,
    scanLink: '/api/local-storage/files/scan-042.jpg',
    scanFileName: 'scan-042.jpg',
    driveFileId: '',
    approverName: 'ທ່ານ ບຸນມີ',
    signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ',
    signedAt: '2026-11-12T09:15:00.000Z',
    createdBy: 'chanthathonglith@gmail.com',
    updatedAt: '2026-11-12T09:15:00.000Z',
  },
];

test('documentsToExcelBuffer and excelBufferToDocuments round-trip Lao records and 21 columns', () => {
  const buffer = documentsToExcelBuffer(sampleDocs);
  assert.ok(buffer instanceof Uint8Array);
  assert.ok(buffer.byteLength > 200);

  const parsed = excelBufferToDocuments(buffer);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].id, 'DOC-XLS-1');
  assert.equal(parsed[0].docNumber, '042/ຂຂ-2026');
  assert.equal(parsed[0].outgoingDocNumber, '119/ຂອ-2026');
  assert.equal(parsed[0].title, 'ເອກະສານທົດສອບ Excel ພາສາລາວ');
  assert.equal(parsed[0].status, DocumentStatus.COMPLETED);
  assert.equal(parsed[0].approverName, 'ທ່ານ ບຸນມີ');
  assert.equal(parsed[0].scanFileName, 'scan-042.jpg');
});

test('normalizeDriveDPaths and buildExcelDownloadFilename normalize Windows Drive D paths cleanly', () => {
  const paths = normalizeDriveDPaths('D:\\DocArchive\\');
  assert.equal(paths.driveLetterPath, 'D:\\DocArchive');
  assert.equal(paths.excelFilePath, 'D:\\DocArchive\\documents.xlsx');
  assert.equal(paths.scansFolderPath, 'D:\\DocArchive\\Scans');

  const filename = buildExcelDownloadFilename('doc_export');
  assert.match(filename, /^doc_export-\d{4}-\d{2}-\d{2}\.xlsx$/);
});
