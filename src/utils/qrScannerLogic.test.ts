import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DocumentDirection,
  DocumentPurpose,
  DocumentRecord,
  DocumentStatus,
} from '../types/document';
import {
  extractQrLookupCandidates,
  resolveScannedQrToDocument,
} from './qrScannerLogic';

const docs: DocumentRecord[] = [
  {
    id: 'DOC-202601',
    direction: DocumentDirection.INCOMING,
    docNumber: '042/ຂຂ-2026',
    outgoingDocNumber: '119/ຂອ-2026',
    docDate: '2026-11-12',
    dueDate: '',
    title: 'ໜັງສືສະເໜີ',
    department: 'ພະແນກການເງິນ',
    purpose: DocumentPurpose.SIGNATURE,
    leadershipComment: '',
    status: DocumentStatus.COMPLETED,
    scanLink: 'https://drive.google.com/file/d/demo-scan-042/view',
    scanFileName: '042.pdf',
    driveFileId: 'demo-scan-042',
    createdBy: 'demo@example.com',
    updatedAt: '2026-11-12T09:15:00.000Z',
  },
  {
    id: 'DOC-202603',
    direction: DocumentDirection.OUTGOING,
    docNumber: '118/ຂອ-2026',
    outgoingDocNumber: '118/ຂອ-2026',
    docDate: '2026-11-10',
    dueDate: '',
    title: 'ແຈ້ງການປະຊຸມ',
    department: 'ຫ້ອງວ່າການ',
    purpose: DocumentPurpose.INFO,
    leadershipComment: '',
    status: DocumentStatus.COMPLETED,
    scanLink: '',
    scanFileName: '',
    driveFileId: '',
    createdBy: 'demo@example.com',
    updatedAt: '2026-11-10T11:20:00.000Z',
  },
];

test('extractQrLookupCandidates parses tracking URLs, JSON payloads, and plain IDs', () => {
  const fromUrl = extractQrLookupCandidates('https://app.example.com/?docId=DOC-202601');
  assert.ok(fromUrl.includes('DOC-202601'));

  const fromRelative = extractQrLookupCandidates('/?docId=DOC-202603');
  assert.ok(fromRelative.includes('DOC-202603'));

  const fromJson = extractQrLookupCandidates('{"docId":"DOC-202601"}');
  assert.ok(fromJson.includes('DOC-202601'));
});

test('resolveScannedQrToDocument resolves by deep-link docId, id, docNumber, outgoingDocNumber, and scanLink', () => {
  const byDeepLink = resolveScannedQrToDocument('https://localhost:3000/?docId=DOC-202601', docs);
  assert.equal(byDeepLink.document?.id, 'DOC-202601');
  assert.equal(byDeepLink.matchedBy, 'docId');

  const byId = resolveScannedQrToDocument('doc-202603', docs);
  assert.equal(byId.document?.id, 'DOC-202603');
  assert.equal(byId.matchedBy, 'id');

  const byDocNumber = resolveScannedQrToDocument('042/ຂຂ-2026', docs);
  assert.equal(byDocNumber.document?.id, 'DOC-202601');
  assert.equal(byDocNumber.matchedBy, 'docNumber');

  const byOutgoingNumber = resolveScannedQrToDocument('119/ຂອ-2026', docs);
  assert.equal(byOutgoingNumber.document?.id, 'DOC-202601');
  assert.equal(byOutgoingNumber.matchedBy, 'outgoingDocNumber');

  const byScanLink = resolveScannedQrToDocument('https://drive.google.com/file/d/demo-scan-042/view', docs);
  assert.equal(byScanLink.document?.id, 'DOC-202601');
  assert.equal(byScanLink.matchedBy, 'scanLink');

  const missing = resolveScannedQrToDocument('DOC-UNKNOWN', docs);
  assert.equal(missing.document, null);
  assert.equal(missing.matchedBy, null);
});
