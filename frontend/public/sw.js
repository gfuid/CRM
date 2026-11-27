/* Travel-Trade CRM service worker.
 * Only for phone / desktop notifications and "Install app". It does NOT cache pages or files,
 * so a new version of the CRM is always loaded straight away. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Travel-Trade CRM';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { tab: data.tab || '' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const tab = (event.notification.data && event.notification.data.tab) || '';
  const url = new URL(tab ? `/?tab=${encodeURIComponent(tab)}` : '/', self.location.origin).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = wins.find((w) => new URL(w.url).origin === self.location.origin);
    if (open) {
      if (tab) open.postMessage({ type: 'crm_navigate', tab });
      return open.focus();
    }
    return self.clients.openWindow(url);
  })());
});
