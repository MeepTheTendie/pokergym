// Poker Gym edge worker: an aggregate, privacy-friendly visit counter in front
// of the static assets. Runs only for the paths listed in wrangler.jsonc
// assets.run_worker_first; every other request goes straight to assets.
// Counting failures never prevent serving assets.
import { countBucket, dataPoint } from './count.js';
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
    // Keep new homepage visitors on one save/install origin. Existing www
    // game URLs stay accessible so their browser-local saves can be exported.
    if (url.hostname === 'www.playpokergym.com' && url.pathname === '/') {
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
