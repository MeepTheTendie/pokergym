// Poker Gym edge worker: an aggregate, privacy-friendly visit counter in front
// of the static assets. Runs only for the paths listed in wrangler.jsonc
// assets.run_worker_first; every other request goes straight to assets.
// Counting failures never prevent serving assets.
import { countBucket, dataPoint } from './count.js';
import { isIngestPath, proxyPostHog } from './proxy.js';
import { SECURITY_HEADERS } from './security.js';

// Re-emit the asset response with the shared security headers. The worker runs
// first for the HTML entry pages, where Cloudflare does not apply _headers.
function secure(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Typed-path attribution: a short path printed on video end screens so
    // hand-typed visitors become attributable (ControlDoc 2026-10-23).
    if (url.pathname === '/go' || url.pathname === '/go/') {
      const target = new URL('/web/', url.origin);
      target.searchParams.set('ref', 'endscreen');
      target.searchParams.set('utm_content', 'typed');
      return Response.redirect(target.href, 302);
    }
    // PostHog is proxied through our own origin (see worker/proxy.js). This is
    // never counted and never wrapped in the page security headers.
    if (isIngestPath(url.pathname)) {
      try {
        return await proxyPostHog(request);
      } catch {
        return new Response('analytics proxy unavailable', { status: 502 });
      }
    }
    // Keep every visitor on one save/install origin. Redirect the whole www
    // host to the bare domain so browser-local saves and visitor counts do
    // not split across two origins.
    if (url.hostname === 'www.playpokergym.com') {
      url.hostname = 'playpokergym.com';
      url.protocol = 'https:';
      return Response.redirect(url.href, 307);
    }
    let bucket = null;
    try { bucket = countBucket(request); } catch { bucket = null; }
    const response = await env.ASSETS.fetch(request);
    // Only a served page counts: /web and /web/index.html answer with a
    // redirect to /web/, which is then counted once on arrival.
    if (bucket && env.VISITS && response.status >= 200 && response.status < 300) {
      try {
        ctx.waitUntil(Promise.resolve().then(() => env.VISITS.writeDataPoint(dataPoint(bucket))).catch(() => {}));
      } catch {
        // Counting must never delay or break a page view.
      }
    }
    return secure(response);
  },
};
