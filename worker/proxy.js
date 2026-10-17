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
  const rest = url.pathname.slice('/ingest'.length) || '/';
  const isAsset = rest === '/static' || rest.startsWith('/static/');
  const host = isAsset ? hosts.assets : hosts.api;
  return { url: `https://${host}${rest}${url.search}`, isAsset };
}

// Forward one request upstream. The Host header is dropped so the edge derives
// it from the target URL; everything else (method, body, headers) passes
// through unchanged. Cookies are forwarded but PostHog sets none of its own.
export async function proxyPostHog(request, region = POSTHOG_REGION) {
  const { url, isAsset } = upstreamRequest(request.url, region);
  const headers = new Headers(request.headers);
  headers.delete('host');
  const init = isAsset
    ? { method: 'GET', headers }
    : { method: request.method, headers, body: request.body };
  return fetch(url, init);
}
