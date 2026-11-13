import {
  DIRECTION_LABELS,
  DocumentDirection,
  DocumentRecord,
  PURPOSE_LABELS,
  STATUS_LABELS,
} from '../types/document';
import {
  formatLaoDisplayDate,
  getEffectiveIncomingDate,
  getEffectiveOutgoingDate,
} from './documentLogic';
import { formatSignatureTimestamp, isValidSignatureDataUrl } from './signatureLogic';

export interface PrintableDocumentField {
  label: string;
  value: string;
  mono?: boolean;
}

export interface PrintableDocumentSummary {
  directionLabel: string;
  docNumber: string;
  outgoingDocNumber: string;
  referenceId: string;
  title: string;
  partyLabel: string;
  department: string;
  purposeLabel: string;
  statusLabel: string;
  incomingDateText: string;
  outgoingDateText: string;
  docDateText: string;
  dueDateText: string;
  leadershipComment: string;
  hasSignature: boolean;
  signatureDataUrl: string;
  approverName: string;
  signedAtText: string;
  scanFileName: string;
  scanLink: string;
  printedAtText: string;
  metadataRows: PrintableDocumentField[];
}

export function getDocumentPartyLabel(direction: DocumentDirection): string {
  switch (direction) {
    case DocumentDirection.INCOMING:
      return 'ພາກສ່ວນສົ່ງເອກະສານມາ';
    case DocumentDirection.OUTGOING:
      return 'ພາກສ່ວນຮັບເອກະສານ';
    case DocumentDirection.LEGAL:
      return 'ພາກສ່ວນອອກ / ຮັບຜິດຊອບ';
    case DocumentDirection.SPEECH:
      return 'ພາກສ່ວນ / ເຈົ້າພາບຈັດງານ';
  }
}

export function formatPrintTimestamp(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function buildPrintableDocumentSummary(
  record: DocumentRecord,
  now: Date = new Date()
): PrintableDocumentSummary {
  const incomingDate = getEffectiveIncomingDate(record);
  const outgoingDate = getEffectiveOutgoingDate(record);

  const directionLabel = DIRECTION_LABELS[record.direction];
  const partyLabel = getDocumentPartyLabel(record.direction);
  const purposeLabel = PURPOSE_LABELS[record.purpose];
  const statusLabel = STATUS_LABELS[record.status];

  const incomingDateText = incomingDate ? formatLaoDisplayDate(incomingDate) : '-';
  const outgoingDateText = outgoingDate ? formatLaoDisplayDate(outgoingDate) : '-';
  const docDateText = record.docDate ? formatLaoDisplayDate(record.docDate) : '-';
  const dueDateText = record.dueDate ? formatLaoDisplayDate(record.dueDate) : 'ບໍ່ໄດ້ກຳນົດ';
  const outgoingDocNumber = (record.outgoingDocNumber || '').trim() || '-';

  const hasSignature = isValidSignatureDataUrl(record.signatureDataUrl);
  const signedAtText = record.signedAt ? formatSignatureTimestamp(record.signedAt) : '';

  const metadataRows: PrintableDocumentField[] = [
    { label: 'ເລກທີເອກະສານ', value: record.docNumber || '-', mono: true },
    { label: 'ເລກທີເອກະສານຂາອອກ', value: outgoingDocNumber, mono: true },
    { label: partyLabel, value: record.department || '-' },
    { label: 'ຈຸດປະສົງ', value: purposeLabel },
    { label: 'ສະຖານະຕິດຕາມ', value: statusLabel },
    { label: 'ລະຫັດອ້າງອີງ', value: record.id, mono: true },
    { label: 'ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາເຂົ້າ', value: incomingDateText, mono: true },
    { label: 'ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາອອກ', value: outgoingDateText, mono: true },
    { label: 'ວັນທີເອກະສານຫຼັກ', value: docDateText, mono: true },
    { label: 'ວັນທີກຳນົດ', value: dueDateText, mono: true },
  ];

  return {
    directionLabel,
    docNumber: record.docNumber || '-',
    outgoingDocNumber,
    referenceId: record.id,
    title: record.title,
    partyLabel,
    department: record.department || '-',
    purposeLabel,
    statusLabel,
    incomingDateText,
    outgoingDateText,
    docDateText,
    dueDateText,
    leadershipComment: (record.leadershipComment || '').trim() || 'ຍັງບໍ່ມີຄຳເຫັນຂອງການນຳ',
    hasSignature,
    signatureDataUrl: hasSignature ? record.signatureDataUrl || '' : '',
    approverName: (record.approverName || '').trim(),
    signedAtText,
    scanFileName: (record.scanFileName || '').trim(),
    scanLink: (record.scanLink || '').trim(),
    printedAtText: formatPrintTimestamp(now),
    metadataRows,
  };
}
