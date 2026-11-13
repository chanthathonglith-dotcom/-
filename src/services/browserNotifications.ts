import { registerSW } from 'virtual:pwa-register';
import {
  DesktopPushState,
  DocumentWatchItem,
  NotificationSettings,
  PushSubscriptionSupport,
} from '../types/document';
import {
  buildLockScreenNotificationOptions,
  urlBase64ToUint8Array,
} from '../utils/pushNotificationLogic';

const SETTINGS_STORAGE_KEY = 'doc_registry_notification_settings_v1';
const DUE_KEYS_STORAGE_KEY = 'doc_registry_notified_due_keys_v1';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  notifyOnNewSheetRows: true,
  notifyOnDueDate: true,
  pollIntervalSeconds: 60,
  lockScreenDisplay: true,
  requireInteraction: true,
  soundAndVibration: true,
  backgroundPushEnabled: true,
};

export type BrowserPermissionState = 'unsupported' | NotificationPermission;

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function getNotificationPermissionState(): BrowserPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function getPushSubscriptionSupport(): PushSubscriptionSupport {
  if (typeof window === 'undefined') return 'unsupported';
  if (!window.isSecureContext) return 'insecure_context';
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return 'unsupported';
  }
  return 'supported';
}

export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  if (!swRegistrationPromise) {
    swRegistrationPromise = (async () => {
      try {
        registerSW({ immediate: true });
        const existing = await navigator.serviceWorker.getRegistration();
        if (existing) return existing;

        const readyWithTimeout = await Promise.race<ServiceWorkerRegistration | null>([
          navigator.serviceWorker.ready,
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 4000)),
        ]);
        return readyWithTimeout;
      } catch {
        return null;
      }
    })();
  }

  return swRegistrationPromise;
}

async function getActiveRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;
    return await registerNotificationServiceWorker();
  } catch {
    return null;
  }
}

export async function getDesktopPushState(): Promise<DesktopPushState> {
  const support = getPushSubscriptionSupport();
  let serverReady = false;
  let activeServerSubscribers = 0;

  try {
    const statusRes = await fetch('/api/push/status');
    if (statusRes.ok) {
      const data = (await statusRes.json()) as {
        configured?: boolean;
        subscriptionCount?: number;
      };
      serverReady = Boolean(data.configured);
      activeServerSubscribers = Number(data.subscriptionCount || 0);
    }
  } catch {
    serverReady = false;
  }

  if (support !== 'supported') {
    return {
      support,
      subscribed: false,
      subscriptionEndpoint: null,
      serverReady,
      activeServerSubscribers,
      lastError: null,
    };
  }

  try {
    const reg = await getActiveRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return {
      support,
      subscribed: Boolean(sub),
      subscriptionEndpoint: sub?.endpoint ?? null,
      serverReady,
      activeServerSubscribers,
      lastError: null,
    };
  } catch (err) {
    return {
      support,
      subscribed: false,
      subscriptionEndpoint: null,
      serverReady,
      activeServerSubscribers,
      lastError: err instanceof Error ? err.message : null,
    };
  }
}

export async function requestBrowserNotificationPermission(): Promise<BrowserPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    await registerNotificationServiceWorker();
  }
  return permission;
}

export async function subscribeDesktopPush(
  settings: NotificationSettings,
  watches: DocumentWatchItem[]
): Promise<{
  ok: boolean;
  permission: BrowserPermissionState;
  state: DesktopPushState;
  error?: string;
}> {
  const permission = await requestBrowserNotificationPermission();
  if (permission !== 'granted') {
    const state = await getDesktopPushState();
    return {
      ok: false,
      permission,
      state,
      error:
        permission === 'denied'
          ? 'Browser ຖືກບລັອກສິດການແຈ້ງເຕືອນ ກະລຸນາອະນຸຍາດໃນຕັ້ງຄ່າ Browser'
          : 'ບໍ່ໄດ້ຮັບສິດການແຈ້ງເຕືອນຈາກ Browser',
    };
  }

  const support = getPushSubscriptionSupport();
  if (support !== 'supported') {
    const state = await getDesktopPushState();
    return {
      ok: false,
      permission,
      state,
      error:
        support === 'insecure_context'
          ? 'Web Push ຕ້ອງການເຊື່ອມຕໍ່ຜ່ານ HTTPS ຫຼື localhost'
          : 'Browser ນີ້ບໍ່ຮອງຮັບ Web Push Background Subscription',
    };
  }

  try {
    const reg = await getActiveRegistration();
    if (!reg) {
      throw new Error('ບໍ່ສາມາດເປີດໃຊ້ງານ Service Worker ໄດ້');
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const keyRes = await fetch('/api/push/vapid-public-key');
      if (!keyRes.ok) {
        throw new Error('ບໍ່ສາມາດດຶງ VAPID Public Key ຈາກເຊີບເວີໄດ້');
      }
      const { publicKey } = (await keyRes.json()) as { publicKey: string };
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const saveRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        preferences: {
          lockScreenDisplay: settings.lockScreenDisplay,
          requireInteraction: settings.requireInteraction,
          soundAndVibration: settings.soundAndVibration,
        },
        watches,
      }),
    });

    if (!saveRes.ok) {
      throw new Error('ບັນທຶກການສະໝັກ Desktop Push ບໍ່ສຳເລັດ');
    }

    const state = await getDesktopPushState();
    return { ok: true, permission, state };
  } catch (err) {
    const state = await getDesktopPushState();
    const message =
      err instanceof Error ? err.message : 'ບໍ່ສາມາດສະໝັກຮັບ Desktop Push ໄດ້';
    return {
      ok: false,
      permission,
      state: { ...state, lastError: message },
      error: message,
    };
  }
}

export async function unsubscribeDesktopPush(): Promise<DesktopPushState> {
  try {
    const reg = await getActiveRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => undefined);
      await sub.unsubscribe();
    }
  } catch {
    // ignore unsubscribe errors
  }
  return getDesktopPushState();
}

export async function syncDocumentWatchesToServer(watches: DocumentWatchItem[]): Promise<void> {
  try {
    await fetch('/api/push/watches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watches }),
    });
  } catch {
    // non-fatal background sync
  }
}

export async function sendServerPushNotification(
  payload: {
    title: string;
    body: string;
    tag: string;
    docId?: string;
  },
  settings: NotificationSettings,
  endpoint?: string | null
): Promise<{ delivered: number; failed: number }> {
  try {
    const res = await fetch('/api/push/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: payload.title,
        body: payload.body,
        tag: payload.tag,
        docId: payload.docId,
        requireInteraction: settings.lockScreenDisplay && settings.requireInteraction,
        silent: !settings.soundAndVibration,
        lockScreenDisplay: settings.lockScreenDisplay,
        endpoint: endpoint || undefined,
      }),
    });
    if (!res.ok) return { delivered: 0, failed: 0 };
    const data = (await res.json()) as { delivered?: number; failed?: number };
    return {
      delivered: Number(data.delivered || 0),
      failed: Number(data.failed || 0),
    };
  } catch {
    return { delivered: 0, failed: 0 };
  }
}

export async function sendServerPushTest(
  settings: NotificationSettings,
  endpoint?: string | null
): Promise<{ delivered: number; failed: number }> {
  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: endpoint || undefined,
        lockScreenDisplay: settings.lockScreenDisplay,
        requireInteraction: settings.requireInteraction,
        soundAndVibration: settings.soundAndVibration,
      }),
    });
    if (!res.ok) return { delivered: 0, failed: 0 };
    const data = (await res.json()) as { delivered?: number; failed?: number };
    return {
      delivered: Number(data.delivered || 0),
      failed: Number(data.failed || 0),
    };
  } catch {
    return { delivered: 0, failed: 0 };
  }
}

export async function sendBrowserNotification(
  payload: {
    title: string;
    body: string;
    tag: string;
    docId?: string;
  },
  settings: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  const built = buildLockScreenNotificationOptions(payload, settings);

  try {
    if ('serviceWorker' in navigator) {
      const reg = await getActiveRegistration();
      if (reg) {
        const swOptions: NotificationOptions & {
          renotify?: boolean;
          vibrate?: number[];
          timestamp?: number;
          actions?: Array<{ action: string; title: string }>;
        } = {
          body: built.body,
          tag: built.tag,
          icon: built.icon,
          badge: built.badge,
          lang: built.lang,
          renotify: built.renotify,
          requireInteraction: built.requireInteraction,
          silent: built.silent,
          vibrate: built.vibrate,
          timestamp: built.timestamp,
          data: built.data,
          actions: built.actions,
        };
        await reg.showNotification(built.title, swOptions);
        return true;
      }
    }

    new Notification(built.title, {
      body: built.body,
      tag: built.tag,
      icon: built.icon,
      lang: built.lang,
      requireInteraction: built.requireInteraction,
      silent: built.silent,
      data: built.data,
    });
    return true;
  } catch {
    return false;
  }
}

export function loadNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return {
      enabled: parsed.enabled ?? DEFAULT_NOTIFICATION_SETTINGS.enabled,
      notifyOnNewSheetRows:
        parsed.notifyOnNewSheetRows ?? DEFAULT_NOTIFICATION_SETTINGS.notifyOnNewSheetRows,
      notifyOnDueDate:
        parsed.notifyOnDueDate ?? DEFAULT_NOTIFICATION_SETTINGS.notifyOnDueDate,
      pollIntervalSeconds:
        typeof parsed.pollIntervalSeconds === 'number' && parsed.pollIntervalSeconds >= 15
          ? parsed.pollIntervalSeconds
          : DEFAULT_NOTIFICATION_SETTINGS.pollIntervalSeconds,
      lockScreenDisplay:
        parsed.lockScreenDisplay ?? DEFAULT_NOTIFICATION_SETTINGS.lockScreenDisplay,
      requireInteraction:
        parsed.requireInteraction ?? DEFAULT_NOTIFICATION_SETTINGS.requireInteraction,
      soundAndVibration:
        parsed.soundAndVibration ?? DEFAULT_NOTIFICATION_SETTINGS.soundAndVibration,
      backgroundPushEnabled:
        parsed.backgroundPushEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.backgroundPushEnabled,
    };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

export function loadNotifiedDueKeys(todayIso: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DUE_KEYS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { date?: string; keys?: string[] };
    if (parsed.date !== todayIso || !Array.isArray(parsed.keys)) {
      return new Set();
    }
    return new Set(parsed.keys);
  } catch {
    return new Set();
  }
}

export function saveNotifiedDueKeys(todayIso: string, keys: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      DUE_KEYS_STORAGE_KEY,
      JSON.stringify({ date: todayIso, keys: Array.from(keys) })
    );
  } catch {
    // ignore storage errors
  }
}
