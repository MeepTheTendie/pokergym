// Build substitutes a content-derived version and the complete public game assets.
const CACHE = 'pokergym-offline-__VERSION__';
const ASSETS = __ASSETS__;
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS.map(asset => new Request(asset, { cache: 'reload' })));
    // Cloud hosting canonicalizes HTML URLs. Store plain responses so cached
    // document navigation does not require or inherit a network redirect.
    for (const asset of ASSETS.filter(asset => asset.endsWith('.html'))) {
      const html = await cache.match(asset);
      const headers = new Headers(html.headers);
      headers.delete('content-encoding');
      headers.delete('content-length');
      await cache.put(asset, new Response(await html.arrayBuffer(), {
        status: html.status, statusText: html.statusText, headers,
      }));
    }
  })());
  // Updates wait until existing game tabs close, avoiding mixed game versions.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('pokergym-offline-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const asset = event.request.mode === 'navigate' &&
    (url.pathname === '/web/' || url.pathname === '/web/index.html')
    ? '/web/index.html'
    : url.pathname === '/web/privacy' ? '/web/privacy.html' : url.pathname;
  if (!ASSETS.includes(asset)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(asset) || fetch(event.request);
  })());
});
