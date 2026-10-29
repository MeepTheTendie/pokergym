// Reverse proxy for PostHog Cloud. The browser talks to /ingest/* on its own
// origin; the worker forwards those requests to PostHog's ingestion host (and
// its assets host for the SDK bundle). Proxying keeps the SDK first-party: the
// content policy stays 'self'-only, and network filters that block
// *.posthog.com cannot silently drop the analytics.
//
// Region is fixed here to match the PostHog project. US -> us.i.posthog.com.
const HOSTS = {
  us: { api: 'us.i.posthog.com', assets: 'us-assets.i.posthog.com' },
  eu: { api: 'eu.i.posthog.com', assets: 'eu-assets.i.posthog.com' },
};
export const POSTHOG_REGION = 'us';

export function isIngestPath(pathname) {
  return pathname === '/ingest' || pathname.startsWith('/ingest/');
}

// Map an incoming /ingest/... request onto the PostHog host that serves it.
// The SDK bundle lives under /static/ on the assets host; events, /decide and
// flags go to the ingestion host. Returns an absolute upstream URL.
export function upstreamRequest(requestUrl, region = POSTHOG_REGION) {
  const url = new URL(requestUrl);
  const hosts = HOSTS[region] ?? HOSTS.us;
  // Normalise the path so traversal sequences cannot escape /ingest or bypass
  // the asset check. PostHog only ever sees its own paths.
  const rawRest = url.pathname.slice('/ingest'.length) || '/';
  const rest = new URL(rawRest, 'https://pokergym.invalid').pathname || '/';
  const isAsset = rest === '/static' || rest.startsWith('/static/');
  const host = isAsset ? hosts.assets : hosts.api;
  return { url: `https://${host}${rest}${url.search}`, isAsset };
}

// Forward one request upstream. The Host header is dropped so the edge derives
// it from the target URL; cookies and authorization are stripped because
// PostHog sets none of its own and forwarding them only leaks origin state.
// A 10s timeout keeps a hung upstream from holding the worker invocation.
const MAX_INGEST_BYTES = 2 * 1024 * 1024;
const INGEST_METHODS = new Set(['GET', 'POST', 'OPTIONS']);

export async function proxyPostHog(request, region = POSTHOG_REGION) {
  const { url, isAsset } = upstreamRequest(request.url, region);
  if (!isAsset && !INGEST_METHODS.has(request.method)) {
    return new Response('method not allowed', { status: 405 });
  }
  if (!isAsset) {
    const declared = Number(request.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_INGEST_BYTES) {
      return new Response('payload too large', { status: 413 });
    }
  }
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cookie');
  headers.delete('authorization');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const init = isAsset
      ? { method: 'GET', headers, signal: controller.signal }
      : { method: request.method, headers, body: request.body, signal: controller.signal };
    return await fetch(url, init);
  } finally {
    clearTimeout(timer);
  }
}
