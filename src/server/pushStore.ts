import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type * as WebPushModule from 'web-push';

const require = createRequire(import.meta.url);
const webpush = require('web-push') as typeof WebPushModule;

export interface StoredPushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  lockScreenDisplay?: boolean;
  requireInteraction?: boolean;
  soundAndVibration?: boolean;
  updatedAt: string;
}

export interface ServerWatchItem {
  id: string;
  docNumber: string;
  title: string;
  direction: string;
  dueDate: string;
  department: string;
  status: string;
}

export interface PersistedPushState {
  vapidKeys: {
    publicKey: string;
    privateKey: string;
    subject: string;
  };
  subscriptions: StoredPushSubscription[];
  watches: ServerWatchItem[];
  notifiedDueKeys: string[];
}

export interface PushPayloadBody {
  title: string;
  body: string;
  tag: string;
  docId?: string;
  url?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  renotify?: boolean;
  lockScreenDisplay?: boolean;
  vibrate?: number[];
  timestamp?: number;
}

const DIRECTION_LABELS_MAP: Record<string, string> = {
  incoming: 'ຂາເຂົ້າ',
  outgoing: 'ຂາອອກ',
  legal: 'ນິຕິກຳ',
  speech: 'ບົດໂອ້ລົມ',
};

export function getServerTodayIso(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function evaluateDueWatches(
  watches: ServerWatchItem[],
  todayIso: string,
  alreadyNotifiedKeys: Set<string>
): Array<{ watch: ServerWatchItem; dedupeKey: string; payload: PushPayloadBody }> {
  const duePayloads: Array<{
    watch: ServerWatchItem;
    dedupeKey: string;
    payload: PushPayloadBody;
  }> = [];

  for (const watch of watches) {
    if (!watch.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(watch.dueDate)) continue;
    if (watch.status === 'completed') continue;
    if (watch.dueDate > todayIso) continue;

    const dedupeKey = `${watch.id}:${todayIso}`;
    if (alreadyNotifiedKeys.has(dedupeKey)) continue;

    const isOverdue = watch.dueDate < todayIso;
    const dirLabel = DIRECTION_LABELS_MAP[watch.direction] || '';
    const [y, m, d] = watch.dueDate.split('-');
    const displayDate = y && m && d ? `${d}/${m}/${y}` : watch.dueDate;

    duePayloads.push({
      watch,
      dedupeKey,
      payload: {
        title: isOverdue
          ? 'ເອກະສານເກີນກຳນົດແລ້ວ (ແຈ້ງເຕືອນພື້ນຫຼັງ)'
          : 'ເຖິງວັນທີກຳນົດຂອງເອກະສານແລ້ວ',
        body: `${dirLabel ? `${dirLabel} · ` : ''}${watch.docNumber} — ${watch.title} (ກຳນົດ: ${displayDate})`,
        tag: `due-doc-${watch.id}-${todayIso}`,
        docId: watch.id,
        url: `/?docId=${encodeURIComponent(watch.id)}`,
        requireInteraction: true,
        silent: false,
        renotify: true,
        lockScreenDisplay: true,
        vibrate: [200, 100, 200],
        timestamp: Date.now(),
      },
    });
  }

  return duePayloads;
}

export function isValidPushSubscription(sub: unknown): sub is {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
} {
  if (!sub || typeof sub !== 'object') return false;
  const candidate = sub as Record<string, unknown>;
  if (typeof candidate.endpoint !== 'string' || !candidate.endpoint.startsWith('https://')) {
    return false;
  }
  const keys = candidate.keys as Record<string, unknown> | undefined;
  return (
    Boolean(keys) &&
    typeof keys?.p256dh === 'string' &&
    keys.p256dh.length > 0 &&
    typeof keys?.auth === 'string' &&
    keys.auth.length > 0
  );
}

export class PushStore {
  private filePath: string;
  private state: PersistedPushState;

  constructor(dataDir = path.resolve(process.cwd(), '.data')) {
    this.filePath = path.join(dataDir, 'push-store.json');
    this.state = this.loadOrInitialize(dataDir);
    webpush.setVapidDetails(
      this.state.vapidKeys.subject,
      this.state.vapidKeys.publicKey,
      this.state.vapidKeys.privateKey
    );
  }

  private loadOrInitialize(dataDir: string): PersistedPushState {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const envPublic = process.env.VAPID_PUBLIC_KEY?.trim();
    const envPrivate = process.env.VAPID_PRIVATE_KEY?.trim();
    const envSubject =
      process.env.VAPID_SUBJECT?.trim() || 'mailto:notifications@doc-archive.local';

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<PersistedPushState>;
        const vapidKeys =
          envPublic && envPrivate
            ? { publicKey: envPublic, privateKey: envPrivate, subject: envSubject }
            : parsed.vapidKeys?.publicKey && parsed.vapidKeys?.privateKey
            ? parsed.vapidKeys
            : { ...webpush.generateVAPIDKeys(), subject: envSubject };

        return {
          vapidKeys,
          subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
          watches: Array.isArray(parsed.watches) ? parsed.watches : [],
          notifiedDueKeys: Array.isArray(parsed.notifiedDueKeys) ? parsed.notifiedDueKeys : [],
        };
      } catch {
        // Fall through to fresh initialization
      }
    }

    const generated =
      envPublic && envPrivate
        ? { publicKey: envPublic, privateKey: envPrivate }
        : webpush.generateVAPIDKeys();

    const initial: PersistedPushState = {
      vapidKeys: {
        publicKey: generated.publicKey,
        privateKey: generated.privateKey,
        subject: envSubject,
      },
      subscriptions: [],
      watches: [],
      notifiedDueKeys: [],
    };
    this.persist(initial);
    return initial;
  }

  private persist(nextState: PersistedPushState = this.state): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(nextState, null, 2), 'utf-8');
  }

  getPublicKey(): { publicKey: string; subject: string } {
    return {
      publicKey: this.state.vapidKeys.publicKey,
      subject: this.state.vapidKeys.subject,
    };
  }

  getStatus(): {
    configured: boolean;
    subscriptionCount: number;
    watchCount: number;
  } {
    return {
      configured: Boolean(this.state.vapidKeys.publicKey),
      subscriptionCount: this.state.subscriptions.length,
      watchCount: this.state.watches.length,
    };
  }

  upsertSubscription(
    subscription: {
      endpoint: string;
      expirationTime?: number | null;
      keys: { p256dh: string; auth: string };
    },
    preferences?: {
      lockScreenDisplay?: boolean;
      requireInteraction?: boolean;
      soundAndVibration?: boolean;
    }
  ): StoredPushSubscription {
    const entry: StoredPushSubscription = {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime ?? null,
      keys: subscription.keys,
      lockScreenDisplay: preferences?.lockScreenDisplay ?? true,
      requireInteraction: preferences?.requireInteraction ?? true,
      soundAndVibration: preferences?.soundAndVibration ?? true,
      updatedAt: new Date().toISOString(),
    };

    const idx = this.state.subscriptions.findIndex((s) => s.endpoint === entry.endpoint);
    if (idx >= 0) {
      this.state.subscriptions[idx] = entry;
    } else {
      this.state.subscriptions.push(entry);
    }
    this.persist();
    return entry;
  }

  removeSubscription(endpoint: string): boolean {
    const before = this.state.subscriptions.length;
    this.state.subscriptions = this.state.subscriptions.filter((s) => s.endpoint !== endpoint);
    const removed = this.state.subscriptions.length !== before;
    if (removed) this.persist();
    return removed;
  }

  updateWatches(watches: ServerWatchItem[]): number {
    const cleaned = watches
      .filter(
        (w) =>
          typeof w.id === 'string' &&
          w.id.trim().length > 0 &&
          typeof w.dueDate === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(w.dueDate)
      )
      .slice(0, 200);
    this.state.watches = cleaned;
    this.persist();
    return cleaned.length;
  }

  async sendToSubscriptions(
    payload: PushPayloadBody,
    targetEndpoint?: string
  ): Promise<{ delivered: number; failed: number; removedExpired: number }> {
    const targets = targetEndpoint
      ? this.state.subscriptions.filter((s) => s.endpoint === targetEndpoint)
      : this.state.subscriptions;

    let delivered = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of targets) {
      const mergedPayload: PushPayloadBody = {
        ...payload,
        requireInteraction:
          payload.requireInteraction ??
          Boolean(sub.lockScreenDisplay !== false && sub.requireInteraction !== false),
        silent: payload.silent ?? sub.soundAndVibration === false,
        lockScreenDisplay: payload.lockScreenDisplay ?? sub.lockScreenDisplay !== false,
      };
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            expirationTime: sub.expirationTime ?? undefined,
            keys: sub.keys,
          },
          JSON.stringify(mergedPayload),
          { urgency: 'high', TTL: 60 * 60 * 12 }
        );
        delivered += 1;
      } catch (err) {
        failed += 1;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    }

    if (expiredEndpoints.length > 0) {
      this.state.subscriptions = this.state.subscriptions.filter(
        (s) => !expiredEndpoints.includes(s.endpoint)
      );
      this.persist();
    }

    return { delivered, failed, removedExpired: expiredEndpoints.length };
  }

  async dispatchDueWatches(todayIso: string = getServerTodayIso()): Promise<number> {
    if (this.state.subscriptions.length === 0 || this.state.watches.length === 0) {
      return 0;
    }

    const notifiedSet = new Set(this.state.notifiedDueKeys);
    const dueList = evaluateDueWatches(this.state.watches, todayIso, notifiedSet);
    if (dueList.length === 0) return 0;

    let sentCount = 0;
    for (const item of dueList) {
      const res = await this.sendToSubscriptions(item.payload);
      if (res.delivered > 0) {
        sentCount += 1;
      }
      notifiedSet.add(item.dedupeKey);
    }

    // Retain only today's keys (and up to 500 entries) so file stays compact
    const todayPrefix = `:${todayIso}`;
    this.state.notifiedDueKeys = Array.from(notifiedSet)
      .filter((key) => key.endsWith(todayPrefix))
      .slice(-500);
    this.persist();

    return sentCount;
  }
}
