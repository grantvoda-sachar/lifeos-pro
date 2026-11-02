// Web Push handlers — imported into the generated Workbox service worker via
// workbox.importScripts. Shows the reminder even when the app is CLOSED, and a
// tap opens (or focuses) LifeOS on the page the push names.
//
// 2 Nov 2026: RICH pushes (the 19:00 compare and the 21:00 night routine).
// Every extra field is optional, so an old-style payload {title, body, tag, url}
// shows exactly as before:
//   actions[]           [{ action, title, url }]   at most 2; the url is kept here, not given to the browser
//   requireInteraction  the notification stays until dealt with
//   vibrate             [ms, ms, ...]
//   renotify            same tag buzzes again (only with a tag)
// Tapping an action opens that action's url; tapping the body opens `url`;
// an action with no url (or "dismiss") just closes it. The Android TWA shell
// may ignore actions and show title + body only: the body tap still opens `url`.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { /* non-JSON push */ }
  const urls = {};
  const actions = (Array.isArray(d.actions) ? d.actions : [])
    .filter((a) => a && typeof a.action === 'string' && typeof a.title === 'string').slice(0, 2);
  for (const a of actions) if (typeof a.url === 'string') urls[a.action] = a.url;
  const opts = {
    body: d.body || '',
    tag: d.tag || undefined,          // same tag as the foreground reminder → replaces, never doubles
    icon: 'icon.png',
    badge: 'icon.png',
    data: { url: d.url || './', urls },
  };
  if (actions.length) opts.actions = actions.map((a) => ({ action: a.action, title: a.title }));
  if (d.requireInteraction === true) opts.requireInteraction = true;
  if (Array.isArray(d.vibrate) && d.vibrate.every((n) => typeof n === 'number')) opts.vibrate = d.vibrate.slice(0, 6);
  if (d.renotify === true && d.tag) opts.renotify = true;
  e.waitUntil(self.registration.showNotification(d.title || 'LifeOS', opts));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const data = e.notification.data || {};
  // a tapped action wins; an action we have no url for only dismisses
  const url = e.action ? (data.urls && data.urls[e.action]) : (data.url || './');
  if (!url) return;
  e.waitUntil((async () => {
    const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) { if ('focus' in w) { w.navigate(url).catch(() => {}); return w.focus(); } }
    return clients.openWindow(url);
  })());
});
