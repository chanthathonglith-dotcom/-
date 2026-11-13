import test from 'node:test';
import assert from 'node:assert/strict';
import { DocumentDirection, DocumentPurpose, DocumentRecord, DocumentStatus } from '../types/document';
import { formatDocumentDetailsForClipboard } from './documentCopyLogic';

test('formatDocumentDetailsForClipboard includes all document metadata, dates, comment, approver, scan link, and tracking URL', () => {
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
    approverName: 'ທ່ານ ບຸນມີ ພົມມະວົງ',
    signatureDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    signedAt: '2026-11-13T08:30:00.000Z',
    scanLink: 'https://drive.google.com/file/d/abc/view',
    scanFileName: '042_budget.pdf',
    driveFileId: 'abc',
    createdBy: 'admin@example.com',
    updatedAt: '2026-11-13T08:30:00.000Z',
  };

  const text = formatDocumentDetailsForClipboard(
    record,
    'https://example.app/?docId=DOC-202601'
  );

  assert.match(text, /ຂໍ້ມູນເອກະສານ \(ຂາເຂົ້າ\)/);
  assert.match(text, /ລະຫັດອ້າງອີງ: DOC-202601/);
  assert.match(text, /ເລກທີເອກະສານ: 042\/ຂຂ-2026/);
  assert.match(text, /ເລກທີເອກະສານຂາອອກ: 119\/ຂອ-2026/);
  assert.match(text, /ຫົວຂໍ້: ໜັງສືສະເໜີຂໍອະນຸມັດແຜນງົບປະມານ/);
  assert.match(text, /ພາກສ່ວນສົ່ງເອກະສານມາ: ພະແນກການເງິນ/);
  assert.match(text, /ຈຸດປະສົງ: ຂໍລາຍເຊັນ/);
  assert.match(text, /ສະຖານະຕິດຕາມ: ສຳເລັດແລ້ວ/);
  assert.match(text, /ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາເຂົ້າ: 12\/11\/2026/);
  assert.match(text, /ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາອອກ: 13\/11\/2026/);
  assert.match(text, /ວັນທີກຳນົດ: 15\/11\/2026/);
  assert.match(text, /ຄຳເຫັນຂອງການນຳ: ເຫັນດີຕາມສະເໜີ/);
  assert.match(text, /ຜູ້ອະນຸມັດ: ທ່ານ ບຸນມີ ພົມມະວົງ — ລົງນາມແລ້ວ/);
  assert.match(text, /ຟາຍສະແກນ: 042_budget\.pdf \(https:\/\/drive\.google\.com\/file\/d\/abc\/view\)/);
  assert.match(text, /ລິ້ງຕິດຕາມເອກະສານ: https:\/\/example\.app\/\?docId=DOC-202601/);
});

test('formatDocumentDetailsForClipboard handles empty optional fields cleanly', () => {
  const minimal: DocumentRecord = {
    id: 'DOC-202602',
    direction: DocumentDirection.OUTGOING,
    docNumber: '117/ຂອ-2026',
    docDate: '2026-11-07',
    dueDate: '',
    title: 'ໜັງສືຕອບຮັບ',
    department: 'ສູນຝຶກອົບຮົມ',
    purpose: DocumentPurpose.INFO,
    status: DocumentStatus.PENDING,
    leadershipComment: '',
    scanLink: '',
    scanFileName: '',
    driveFileId: '',
    createdBy: 'admin@example.com',
    updatedAt: '2026-11-07T08:00:00.000Z',
  };

  const text = formatDocumentDetailsForClipboard(minimal);
  assert.match(text, /ຂໍ້ມູນເອກະສານ \(ຂາອອກ\)/);
  assert.match(text, /ເລກທີເອກະສານຂາອອກ: -/);
  assert.match(text, /ວັນທີກຳນົດ: ບໍ່ໄດ້ກຳນົດ/);
  assert.match(text, /ຄຳເຫັນຂອງການນຳ: ຍັງບໍ່ມີຄຳເຫັນຂອງການນຳ/);
  assert.match(text, /ຜູ້ອະນຸມັດ: ຍັງບໍ່ທັນມີລາຍເຊັນຜູ້ອະນຸມັດ/);
  assert.match(text, /ຟາຍສະແກນ: ຍັງບໍ່ໄດ້ແນບຟາຍສະແກນ/);
  assert.doesNotMatch(text, /ລິ້ງຕິດຕາມເອກະສານ:/);
});
