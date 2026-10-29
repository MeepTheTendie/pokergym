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
  // Activate the new worker as soon as it installs so instrumentation and
  // fixes reach existing tabs without waiting for every tab to close.
  self.skipWaiting();
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
  const packPath = '/guides/weekly-01';
  const packNavigation = event.request.mode === 'navigate' &&
    [packPath, `${packPath}/`, `${packPath}/index.html`].includes(url.pathname);
  const asset = packNavigation ? `${packPath}/index.html` : event.request.mode === 'navigate' &&
    (url.pathname === '/web/' || url.pathname === '/web/index.html')
    ? '/web/index.html'
    : url.pathname === '/web/privacy' ? '/web/privacy.html' : url.pathname;
  if (!ASSETS.includes(asset)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(asset) || fetch(event.request);
  })());
});

// Web push: the daily drill reminder. The payload is JSON from the Worker;
// a malformed payload still shows a generic reminder rather than nothing.
function safePushUrl(value) {
  const fallback = '/web/?daily=1&ref=push';
  if (typeof value !== 'string') return fallback;
  try {
    const url = new URL(value, self.location.origin);
    // Accept only same-origin navigation. In particular, reject protocol-
    // relative values such as //example.com that also start with `/`.
    if (url.origin !== self.location.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = typeof data.title === 'string' && data.title ? data.title : 'Play Poker Gym';
  const body = typeof data.body === 'string' && data.body ? data.body : 'Today\u2019s drill is ready.';
  const url = safePushUrl(data.url);
  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag: typeof data.tag === 'string' ? data.tag : 'daily-drill',
    icon: '/web/icon-192.png',
    badge: '/web/icon-192.png',
    data: { url },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = safePushUrl(event.notification.data && event.notification.data.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        if ('navigate' in client) await client.navigate(url).catch(() => {});
        return client.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});
