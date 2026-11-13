/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

interface PushMessagePayload {
  title?: string;
  body?: string;
  tag?: string;
  docId?: string;
  url?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  renotify?: boolean;
  lockScreenDisplay?: boolean;
  vibrate?: number[];
  timestamp?: number;
}

self.addEventListener('install', () => {
  void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload: PushMessagePayload = {};
  if (event.data) {
    try {
      payload = event.data.json() as PushMessagePayload;
    } catch {
      payload = {
        title: 'ແຈ້ງເຕືອນລະບົບເອກະສານ',
        body: event.data.text(),
      };
    }
  }

  const title = payload.title || 'ແຈ້ງເຕືອນເອກະສານສຳຄັນ';
  const body =
    payload.body || 'ມີການອັບເດດເອກະສານ ຫຼື ເຖິງກຳນົດດຳເນີນການໃນລະບົບ.';
  const targetUrl =
    payload.url ||
    (payload.docId ? `/?docId=${encodeURIComponent(payload.docId)}` : '/');

  const options: NotificationOptions & {
    renotify?: boolean;
    vibrate?: number[];
    timestamp?: number;
    actions?: Array<{ action: string; title: string }>;
  } = {
    body,
    tag: payload.tag || `doc-push-${Date.now()}`,
    icon: '/pwa-192x192.png',
    badge: '/badge-72x72.png',
    lang: 'lo',
    renotify: payload.renotify ?? true,
    requireInteraction: payload.requireInteraction ?? true,
    silent: payload.silent ?? false,
    vibrate: payload.silent ? undefined : payload.vibrate ?? [200, 100, 200],
    timestamp: payload.timestamp ?? Date.now(),
    data: {
      url: targetUrl,
      docId: payload.docId,
      lockScreenDisplay: payload.lockScreenDisplay ?? true,
    },
    actions: [
      {
        action: 'open',
        title: payload.docId ? 'ເປີດເບິ່ງເອກະສານ' : 'ເປີດລະບົບ',
      },
      {
        action: 'dismiss',
        title: 'ຮັບຊາບ',
      },
    ],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          for (const client of clients) {
            client.postMessage({
              type: 'PUSH_RECEIVED',
              title,
              body,
              docId: payload.docId,
              tag: options.tag,
            });
          }
        }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') {
    return;
  }

  const data = (event.notification.data || {}) as {
    url?: string;
    docId?: string;
  };
  const targetUrl = data.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            await client.focus();
            if (data.docId) {
              client.postMessage({
                type: 'OPEN_DOCUMENT',
                docId: data.docId,
              });
            }
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
