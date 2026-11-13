import {
  DIRECTION_LABELS,
  DocumentRecord,
  DocumentStatus,
  DocumentWatchItem,
  NotificationSettings,
} from '../types/document';

export interface BuiltNotificationPayload {
  title: string;
  body: string;
  tag: string;
  icon: string;
  badge: string;
  lang: string;
  renotify: boolean;
  requireInteraction: boolean;
  silent: boolean;
  vibrate?: number[];
  timestamp: number;
  data: {
    url: string;
    docId?: string;
    lockScreenDisplay: boolean;
  };
  actions: Array<{
    action: string;
    title: string;
  }>;
}

export function buildPushDeepLinkUrl(docId?: string): string {
  if (!docId || !docId.trim()) return '/';
  return `/?docId=${encodeURIComponent(docId.trim())}`;
}

export function extractDocIdFromUrl(search: string): string | null {
  if (!search) return null;
  try {
    const query = search.startsWith('?') ? search.slice(1) : search;
    const params = new URLSearchParams(query);
    const docId = params.get('docId');
    return docId && docId.trim() ? docId.trim() : null;
  } catch {
    return null;
  }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData =
    typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function buildLockScreenNotificationOptions(
  input: {
    title: string;
    body: string;
    tag: string;
    docId?: string;
    timestamp?: number;
  },
  settings: Pick<
    NotificationSettings,
    'lockScreenDisplay' | 'requireInteraction' | 'soundAndVibration'
  >
): BuiltNotificationPayload {
  const actions: Array<{ action: string; title: string }> = [
    ...(input.docId
      ? [{ action: 'open', title: 'ເປີດເບິ່ງເອກະສານ' }]
      : [{ action: 'open', title: 'ເປີດລະບົບ' }]),
    { action: 'dismiss', title: 'ຮັບຊາບ' },
  ];

  return {
    title: input.title,
    body: input.body,
    tag: input.tag,
    icon: '/pwa-192x192.png',
    badge: '/badge-72x72.png',
    lang: 'lo',
    renotify: true,
    requireInteraction: settings.lockScreenDisplay && settings.requireInteraction,
    silent: !settings.soundAndVibration,
    vibrate: settings.soundAndVibration ? [200, 100, 200] : undefined,
    timestamp: input.timestamp ?? Date.now(),
    data: {
      url: buildPushDeepLinkUrl(input.docId),
      docId: input.docId,
      lockScreenDisplay: settings.lockScreenDisplay,
    },
    actions,
  };
}

export function buildDocumentWatchItems(documents: DocumentRecord[]): DocumentWatchItem[] {
  return documents
    .filter(
      (doc) =>
        Boolean(doc.id) &&
        Boolean(doc.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(doc.dueDate)) &&
        doc.status !== DocumentStatus.COMPLETED
    )
    .slice(0, 200)
    .map((doc) => ({
      id: doc.id,
      docNumber: doc.docNumber,
      title: doc.title,
      direction: doc.direction,
      dueDate: doc.dueDate,
      department: doc.department,
      status: doc.status,
    }));
}

export function formatWatchPushBody(watch: DocumentWatchItem, todayIso: string): {
  title: string;
  body: string;
  tag: string;
} {
  const isOverdue = watch.dueDate < todayIso;
  const dirLabel = DIRECTION_LABELS[watch.direction] || '';
  const [y, m, d] = watch.dueDate.split('-');
  const displayDate = y && m && d ? `${d}/${m}/${y}` : watch.dueDate;
  return {
    title: isOverdue
      ? 'ເອກະສານເກີນກຳນົດແລ້ວ (ແຈ້ງເຕືອນພື້ນຫຼັງ)'
      : 'ເຖິງວັນທີກຳນົດຂອງເອກະສານແລ້ວ',
    body: `${dirLabel ? `${dirLabel} · ` : ''}${watch.docNumber} — ${watch.title} (ກຳນົດ: ${displayDate})`,
    tag: `due-doc-${watch.id}-${todayIso}`,
  };
}
