// Android share-target handler — imported into the generated Workbox service
// worker via workbox.importScripts (beside push-sw.js). GitHub Pages can only
// serve GET, so the POST from the system share sheet never reaches the network:
// this handler answers it locally, parks the payload in a Cache, and redirects
// the app to ./?share=1 which drains it into the capture composer.
//
// Registered before Workbox's own fetch handler (imported scripts run first),
// and the first respondWith wins — Workbox's navigateFallback only covers GET,
// so nothing else competes for this request.
const SHARE_CACHE = 'lifeos-share';

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'POST' || !url.pathname.endsWith('/share')) return;

  e.respondWith((async () => {
    try {
      const form = await e.request.formData();
      const cache = await caches.open(SHARE_CACHE);
      // Clear anything a previous share left behind — one share at a time.
      for (const k of await cache.keys()) await cache.delete(k);

      const files = form.getAll('media').filter((f) => f && typeof f === 'object' && 'name' in f);
      const meta = {
        title: form.get('title') || '',
        text: form.get('text') || '',
        url: form.get('url') || '',
        files: [],
      };
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        meta.files.push({ key: `share-${i}`, name: f.name || `shared-${i}`, type: f.type || 'application/octet-stream' });
        await cache.put(`share-${i}`, new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream' } }));
      }
      await cache.put('share-meta', new Response(JSON.stringify(meta), { headers: { 'content-type': 'application/json' } }));
    } catch { /* a failed share must still land the user in the app, not on an error page */ }
    // 303 so the browser follows with a GET — the normal app boot.
    return Response.redirect('./?share=1', 303);
  })());
});
