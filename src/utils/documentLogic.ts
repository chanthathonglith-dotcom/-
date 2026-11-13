import {
  DIRECTION_LABELS,
  DocumentDirection,
  DocumentFilters,
  DocumentInput,
  DocumentPurpose,
  DocumentRecord,
  DocumentStats,
  DocumentStatus,
  PURPOSE_LABELS,
  SortOrder,
  STATUS_LABELS,
  ValidationErrors,
} from '../types/document';

import { isValidSignatureDataUrl } from './signatureLogic';

export const SHEET_HEADERS = [
  'ລະຫັດ (ID)',
  'ປະເພດ',
  'ເລກທີຂາເຂົ້າ-ຂາອອກ',
  'ວັນທີເອກະສານຫຼັກ',
  'ຫົວຂໍ້ເອກະສານ',
  'ພາກສ່ວນສົ່ງ/ຮັບ',
  'ຈຸດປະສົງ',
  'ຄຳເຫັນຂອງການນຳ',
  'ສະຖານະຕິດຕາມ',
  'ລິ້ງຟາຍສະແກນ',
  'ຊື່ຟາຍສະແກນ',
  'Drive File ID',
  'ຜູ້ບັນທຶກ',
  'ອັບເດດລ່າສຸດ',
  'ວັນທີກຳນົດ',
  'ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາເຂົ້າ',
  'ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາອອກ',
  'ຜູ້ອະນຸມັດ (ລົງນາມ)',
  'ລາຍເຊັນດິຈິຕອນ (Data URL)',
  'ວັນທີລົງນາມ',
] as const;

export function getEffectiveIncomingDate(
  doc: Pick<DocumentRecord, 'direction' | 'docDate' | 'incomingDate'>
): string {
  const explicit = (doc.incomingDate ?? '').trim();
  if (explicit) return explicit;
  return doc.direction === DocumentDirection.INCOMING ? doc.docDate.trim() : '';
}

export function getEffectiveOutgoingDate(
  doc: Pick<DocumentRecord, 'direction' | 'docDate' | 'incomingDate' | 'outgoingDate'>
): string {
  const explicit = (doc.outgoingDate ?? '').trim();
  if (explicit) return explicit;
  if (doc.outgoingDate === undefined && !(doc.incomingDate ?? '').trim()) {
    return doc.direction === DocumentDirection.OUTGOING ? doc.docDate.trim() : '';
  }
  return '';
}

export function resolvePrimaryDocDate(input: {
  direction: DocumentDirection;
  docDate?: string;
  incomingDate?: string;
  outgoingDate?: string;
}): string {
  const incoming = (input.incomingDate ?? '').trim();
  const outgoing = (input.outgoingDate ?? '').trim();
  const base = (input.docDate ?? '').trim();
  if (input.direction === DocumentDirection.INCOMING) {
    return incoming || base || outgoing;
  }
  if (input.direction === DocumentDirection.OUTGOING) {
    return outgoing || base || incoming;
  }
  return base || incoming || outgoing;
}

export function filterDocuments(
  records: DocumentRecord[],
  filters: DocumentFilters
): DocumentRecord[] {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const normalizedDepartment = filters.department.trim().toLowerCase();

  return records.filter((doc) => {
    if (filters.direction !== 'all' && doc.direction !== filters.direction) {
      return false;
    }

    if (filters.purpose !== 'all' && doc.purpose !== filters.purpose) {
      return false;
    }

    if (filters.status !== 'all' && doc.status !== filters.status) {
      return false;
    }

    if (normalizedDepartment && !doc.department.toLowerCase().includes(normalizedDepartment)) {
      return false;
    }

    if (filters.dateFrom && doc.docDate < filters.dateFrom) {
      return false;
    }

    if (filters.dateTo && doc.docDate > filters.dateTo) {
      return false;
    }

    if (normalizedQuery) {
      const searchable = [
        doc.docNumber,
        doc.title,
        doc.department,
        doc.leadershipComment,
        doc.approverName ?? '',
        doc.scanFileName,
        PURPOSE_LABELS[doc.purpose],
        STATUS_LABELS[doc.status],
        DIRECTION_LABELS[doc.direction],
      ]
        .join(' ')
        .toLowerCase();

      if (!searchable.includes(normalizedQuery)) {
        return false;
      }
    }

    return true;
  });
}

export function sortDocuments(
  records: DocumentRecord[],
  sortOrder: SortOrder
): DocumentRecord[] {
  const copy = [...records];
  copy.sort((a, b) => {
    switch (sortOrder) {
      case SortOrder.DATE_ASC:
        return a.docDate.localeCompare(b.docDate) || a.docNumber.localeCompare(b.docNumber);
      case SortOrder.DOC_NO_ASC:
        return a.docNumber.localeCompare(b.docNumber, 'lo');
      case SortOrder.UPDATED_DESC:
        return b.updatedAt.localeCompare(a.updatedAt);
      case SortOrder.DATE_DESC:
      default:
        return b.docDate.localeCompare(a.docDate) || b.updatedAt.localeCompare(a.updatedAt);
    }
  });
  return copy;
}

export function computeDocumentStats(records: DocumentRecord[]): DocumentStats {
  let incoming = 0;
  let outgoing = 0;
  let legal = 0;
  let speech = 0;
  let pendingAction = 0;
  let completed = 0;

  for (const doc of records) {
    if (doc.direction === DocumentDirection.INCOMING) incoming += 1;
    if (doc.direction === DocumentDirection.OUTGOING) outgoing += 1;
    if (doc.direction === DocumentDirection.LEGAL) legal += 1;
    if (doc.direction === DocumentDirection.SPEECH) speech += 1;
    if (
      doc.status === DocumentStatus.PENDING ||
      doc.status === DocumentStatus.IN_PROGRESS
    ) {
      pendingAction += 1;
    }
    if (doc.status === DocumentStatus.COMPLETED) completed += 1;
  }

  return {
    total: records.length,
    incoming,
    outgoing,
    legal,
    speech,
    pendingAction,
    completed,
  };
}

export function validateDocumentInput(input: DocumentInput): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!input.docNumber.trim()) {
    errors.docNumber = 'ກະລຸນາປ້ອນເລກທີເອກະສານ';
  }

  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  const incomingVal = (input.incomingDate ?? '').trim();
  const outgoingVal = (input.outgoingDate ?? '').trim();
  const hasExplicitIncomingField = input.incomingDate !== undefined;

  if (
    input.direction === DocumentDirection.INCOMING ||
    input.direction === DocumentDirection.OUTGOING
  ) {
    const effectiveIncoming = hasExplicitIncomingField
      ? incomingVal
      : input.docDate.trim();
    if (!effectiveIncoming || !isoRegex.test(effectiveIncoming)) {
      errors.incomingDate = 'ກະລຸນາເລືອກ ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາເຂົ້າ ໃຫ້ຖືກຕ້ອງ';
    }
  } else if (!input.docDate.trim() || !isoRegex.test(input.docDate.trim())) {
    errors.docDate = 'ກະລຸນາເລືອກວັນທີໃຫ້ຖືກຕ້ອງ';
  }

  if (incomingVal && !isoRegex.test(incomingVal)) {
    errors.incomingDate = 'ກະລຸນາເລືອກ ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາເຂົ້າ ໃຫ້ຖືກຕ້ອງ';
  }

  if (outgoingVal && !isoRegex.test(outgoingVal)) {
    errors.outgoingDate = 'ກະລຸນາເລືອກ ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາອອກ ໃຫ້ຖືກຕ້ອງ';
  }

  if (input.dueDate.trim() && !isoRegex.test(input.dueDate.trim())) {
    errors.dueDate = 'ກະລຸນາເລືອກວັນທີກຳນົດໃຫ້ຖືກຕ້ອງ';
  }

  if (!input.title.trim()) {
    errors.title = 'ກະລຸນາປ້ອນຫົວຂໍ້ເອກະສານ';
  }

  if (!input.department.trim()) {
    errors.department = 'ກະລຸນາປ້ອນຊື່ພາກສ່ວນທີ່ກ່ຽວຂ້ອງ';
  }

  const trimmedLink = input.scanLink.trim();
  if (trimmedLink && !/^https?:\/\/|^blob:|^data:/i.test(trimmedLink)) {
    errors.scanLink = 'ລິ້ງເອກະສານຕ້ອງຂຶ້ນຕົ້ນດ້ວຍ https:// ຫຼື http://';
  }

  const trimmedSignature = (input.signatureDataUrl ?? '').trim();
  if (trimmedSignature && !isValidSignatureDataUrl(trimmedSignature)) {
    errors.signatureDataUrl = 'ຮູບແບບລາຍເຊັນດິຈິຕອນບໍ່ຖືກຕ້ອງ ຫຼື ມີຂະໜາດໃຫຍ່ເກີນກຳນົດ';
  }

  return errors;
}

export function hasValidationErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function formatLaoDisplayDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate || '-';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export function parseDirectionValue(raw: string | undefined): DocumentDirection {
  const val = (raw ?? '').trim().toLowerCase();
  if (val === DocumentDirection.OUTGOING || val === 'ຂາອອກ') {
    return DocumentDirection.OUTGOING;
  }
  if (val === DocumentDirection.LEGAL || val === 'ນິຕິກຳ') {
    return DocumentDirection.LEGAL;
  }
  if (val === DocumentDirection.SPEECH || val === 'ບົດໂອ້ລົມ') {
    return DocumentDirection.SPEECH;
  }
  return DocumentDirection.INCOMING;
}

export function parsePurposeValue(raw: string | undefined): DocumentPurpose {
  const val = (raw ?? '').trim().toLowerCase();
  if (val === DocumentPurpose.SIGNATURE || val === 'ຂໍລາຍເຊັນ') {
    return DocumentPurpose.SIGNATURE;
  }
  if (val === DocumentPurpose.GUIDANCE || val === 'ຂໍທິດຊີ້ນຳ') {
    return DocumentPurpose.GUIDANCE;
  }
  if (val === DocumentPurpose.INFO || val === 'ເພື່ອຊາບ') {
    return DocumentPurpose.INFO;
  }
  return DocumentPurpose.OPINION;
}

export function parseStatusValue(raw: string | undefined): DocumentStatus {
  const val = (raw ?? '').trim().toLowerCase();
  if (val === DocumentStatus.IN_PROGRESS || val === 'ກຳລັງດຳເນີນການ') {
    return DocumentStatus.IN_PROGRESS;
  }
  if (val === DocumentStatus.COMPLETED || val === 'ສຳເລັດແລ້ວ') {
    return DocumentStatus.COMPLETED;
  }
  if (val === DocumentStatus.RETURNED || val.includes('ສົ່ງຄືນ')) {
    return DocumentStatus.RETURNED;
  }
  return DocumentStatus.PENDING;
}

export function documentToSheetRow(doc: DocumentRecord): string[] {
  const incomingDate = getEffectiveIncomingDate(doc);
  const outgoingDate = getEffectiveOutgoingDate(doc);
  return [
    doc.id,
    DIRECTION_LABELS[doc.direction],
    doc.docNumber,
    doc.docDate,
    doc.title,
    doc.department,
    PURPOSE_LABELS[doc.purpose],
    doc.leadershipComment,
    STATUS_LABELS[doc.status],
    doc.scanLink,
    doc.scanFileName,
    doc.driveFileId,
    doc.createdBy,
    doc.updatedAt,
    doc.dueDate || '',
    incomingDate,
    outgoingDate,
    (doc.approverName ?? '').trim(),
    (doc.signatureDataUrl ?? '').trim(),
    (doc.signedAt ?? '').trim(),
  ];
}

export function sheetRowsToDocuments(rows: string[][]): DocumentRecord[] {
  if (!rows || rows.length <= 1) return [];

  const documents: DocumentRecord[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((cell) => !cell || !cell.trim())) {
      continue;
    }

    const id = (row[0] ?? '').trim() || `row-${i + 1}`;
    const direction = parseDirectionValue(row[1]);
    const docDate = (row[3] ?? '').trim();
    const rawIncoming = (row[15] ?? '').trim();
    const rawOutgoing = (row[16] ?? '').trim();

    const hasSeparatedColumns = Boolean(rawIncoming || rawOutgoing);
    const incomingDate =
      rawIncoming ||
      (!hasSeparatedColumns && direction === DocumentDirection.INCOMING ? docDate : '');
    const outgoingDate =
      rawOutgoing ||
      (!hasSeparatedColumns && direction === DocumentDirection.OUTGOING ? docDate : '');

    documents.push({
      id,
      direction,
      docNumber: (row[2] ?? '').trim(),
      docDate: docDate || incomingDate || outgoingDate,
      incomingDate,
      outgoingDate,
      dueDate: (row[14] ?? '').trim(),
      title: (row[4] ?? '').trim(),
      department: (row[5] ?? '').trim(),
      purpose: parsePurposeValue(row[6]),
      leadershipComment: (row[7] ?? '').trim(),
      status: parseStatusValue(row[8]),
      scanLink: (row[9] ?? '').trim(),
      scanFileName: (row[10] ?? '').trim(),
      driveFileId: (row[11] ?? '').trim(),
      approverName: (row[17] ?? '').trim(),
      signatureDataUrl: (row[18] ?? '').trim(),
      signedAt: (row[19] ?? '').trim(),
      createdBy: (row[12] ?? '').trim(),
      updatedAt: (row[13] ?? '').trim() || new Date().toISOString(),
      sheetRowNumber: i + 1,
    });
  }

  return documents;
}

function escapeCsvCell(value: string): string {
  const safe = value ?? '';
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function exportDocumentsToCsv(records: DocumentRecord[]): string {
  const lines = [SHEET_HEADERS.map((h) => escapeCsvCell(h)).join(',')];
  for (const doc of records) {
    lines.push(documentToSheetRow(doc).map((c) => escapeCsvCell(c)).join(','));
  }
  // Prepend UTF-8 BOM so Excel opens Lao script cleanly
  return `\uFEFF${lines.join('\r\n')}`;
}

export function generateDocumentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `DOC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  }
  return `DOC-${Date.now().toString(36).toUpperCase()}`;
}
