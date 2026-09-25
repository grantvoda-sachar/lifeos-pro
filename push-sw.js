// Web Push handlers — imported into the generated Workbox service worker via
// workbox.importScripts. Shows the reminder even when the app is CLOSED, and a
// tap opens (or focuses) LifeOS on the Habits tab.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { /* non-JSON push */ }
  e.waitUntil(self.registration.showNotification(d.title || 'LifeOS', {
    body: d.body || '',
    tag: d.tag || undefined,          // same tag as the foreground reminder → replaces, never doubles
    icon: 'icon.png',
    badge: 'icon.png',
    data: { url: d.url || './' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const url = (e.notification.data && e.notification.data.url) || './';
    const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) { if ('focus' in w) { w.navigate(url).catch(() => {}); return w.focus(); } }
    return clients.openWindow(url);
  })());
});
