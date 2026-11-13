import {
  DIRECTION_LABELS,
  DocumentRecord,
  DocumentStatus,
  NotificationTriggerType,
} from '../types/document';
import { formatLaoDisplayDate } from './documentLogic';

export function getLocalTodayIso(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function detectNewDocuments(
  previousDocs: DocumentRecord[],
  nextDocs: DocumentRecord[]
): DocumentRecord[] {
  if (previousDocs.length === 0) {
    // Do not fire bulk notifications on initial load when there is no prior baseline
    return [];
  }
  const previousIds = new Set(previousDocs.map((d) => d.id));
  return nextDocs.filter((doc) => !previousIds.has(doc.id));
}

export function getDueDedupeKey(docId: string, todayIso: string): string {
  return `${docId}:${todayIso}`;
}

export function detectDueDocuments(
  docs: DocumentRecord[],
  todayIso: string,
  alreadyNotifiedKeys: Set<string>
): DocumentRecord[] {
  return docs.filter((doc) => {
    if (!doc.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(doc.dueDate)) {
      return false;
    }
    if (doc.status === DocumentStatus.COMPLETED) {
      return false;
    }
    if (doc.dueDate > todayIso) {
      return false;
    }
    return !alreadyNotifiedKeys.has(getDueDedupeKey(doc.id, todayIso));
  });
}

export interface NotificationPayload {
  type: NotificationTriggerType;
  title: string;
  body: string;
  tag: string;
  docId: string;
}

export function buildNewDocumentNotification(doc: DocumentRecord): NotificationPayload {
  const directionLabel = DIRECTION_LABELS[doc.direction];
  return {
    type: NotificationTriggerType.NEW_SHEET_DOCUMENT,
    title: 'ມີເອກະສານໃໝ່ໃນ Google Sheets',
    body: `${directionLabel} · ${doc.docNumber} — ${doc.title} (${doc.department})`,
    tag: `new-doc-${doc.id}`,
    docId: doc.id,
  };
}

export function buildDueDocumentNotification(
  doc: DocumentRecord,
  todayIso: string
): NotificationPayload {
  const isOverdue = doc.dueDate < todayIso;
  return {
    type: NotificationTriggerType.DUE_DATE_REACHED,
    title: isOverdue ? 'ເອກະສານເກີນວັນທີກຳນົດແລ້ວ' : 'ເຖິງວັນທີກຳນົດຂອງເອກະສານແລ້ວ',
    body: `${doc.docNumber} — ${doc.title} (ກຳນົດ: ${formatLaoDisplayDate(doc.dueDate)})`,
    tag: `due-doc-${doc.id}-${todayIso}`,
    docId: doc.id,
  };
}
