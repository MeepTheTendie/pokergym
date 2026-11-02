// Poker Gym edge worker: an aggregate, privacy-friendly visit counter in front
// of the static assets. Runs only for the paths listed in wrangler.jsonc
// assets.run_worker_first; every other request goes straight to assets.
// Counting failures never prevent serving assets.
import { countBucket, dataPoint } from './count.js';
import { isIngestPath, proxyPostHog } from './proxy.js';
import { SECURITY_HEADERS } from './security.js';
import { sendPush, subscriptionId, validSubscription } from './push.js';

// One reminder a day, 09:00 America/Chicago in winter / 08:00 in summer.
// The copy says "a reminder", never "every day at a time", so DST is harmless.
const PUSH_PAYLOAD = JSON.stringify({
  title: 'Play Poker Gym',
  body: 'Today\u2019s drill is ready \u2014 four games, five hands each.',
  url: '/web/?daily=1&ref=push',
  tag: 'daily-drill',
});

function pushJson(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...SECURITY_HEADERS,
    },
  });
}

async function readJson(request, limit = 4096) {
  // Reject an oversized declared body before touching the stream, then enforce
  // the same cap while reading so a missing or lying Content-Length cannot
  // force the isolate to buffer an arbitrarily large request.
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  } finally {
    try { reader.releaseLock(); } catch { /* already released */ }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { return null; }
}

async function subscribe(request, env) {
  if (!env.PUSH_SUBS) return pushJson({ ok: false, error: 'unavailable' }, 503);
  const body = await readJson(request);
  if (!body || !validSubscription(body)) return pushJson({ ok: false, error: 'invalid' }, 400);
  const id = await subscriptionId(body.endpoint);
  const record = {
    endpoint: body.endpoint,
    keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
    created: new Date().toISOString(),
  };
  await env.PUSH_SUBS.put(`sub:${id}`, JSON.stringify(record));
  return pushJson({ ok: true });
}

async function unsubscribe(request, env) {
  if (!env.PUSH_SUBS) return pushJson({ ok: false, error: 'unavailable' }, 503);
  const body = await readJson(request);
  const endpoint = body && typeof body.endpoint === 'string' ? body.endpoint : '';
  if (!endpoint || endpoint.length > 1024) return pushJson({ ok: false, error: 'invalid' }, 400);
  await env.PUSH_SUBS.delete(`sub:${await subscriptionId(endpoint)}`);
  return pushJson({ ok: true });
}

// Re-emit the asset response with the shared security headers. The worker runs
// first for the HTML entry pages, where Cloudflare does not apply _headers.
function secure(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const GUIDE_REDIRECTS = {
  '/guides/blackjack-12-vs-2-stand/': '/guides/blackjack-12-vs-2-hit/',
};

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
    // Canonical social-reel entry. Captions post a short link
    // (playpokergym.com/reel?src=fb&c=p1-QF) instead of hand-typed UTMs, so a
    // reel can never be mis-attributed to the wrong platform (e.g. a Facebook
    // reel tagged utm_source=yt, which is what happened on 2026-11-01).
    if (url.pathname === '/reel' || url.pathname === '/reel/') {
      const src = (url.searchParams.get('src') || 'fb').toLowerCase();
      const platform = src === 'yt' ? 'youtube' : src === 'ig' ? 'reels' : 'facebook';
      const utmSource = src === 'yt' ? 'yt' : src === 'ig' ? 'ig' : 'fb';
      const target = new URL('/web/', url.origin);
      target.searchParams.set('ref', platform);
      target.searchParams.set('utm_source', utmSource);
      target.searchParams.set('utm_medium', 'reel');
      target.searchParams.set('utm_campaign', url.searchParams.get('camp') || 'hooktest1112');
      const content = url.searchParams.get('c') || url.searchParams.get('utm_content');
      if (content) target.searchParams.set('utm_content', content);
      if (url.searchParams.get('daily') === '1') target.searchParams.set('daily', '1');
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
    // Web push: the only return path that does not need a platform's
    // permission. Same-origin POSTs from the recap; no PII is stored.
    if (url.pathname === '/push/subscribe' && request.method === 'POST') {
      return subscribe(request, env);
    }
    if (url.pathname === '/push/unsubscribe' && request.method === 'POST') {
      return unsubscribe(request, env);
    }
    // Keep every visitor on one save/install origin. Redirect the whole www
    // host to the bare domain so browser-local saves and visitor counts do
    // not split across two origins.
    if (url.hostname === 'www.playpokergym.com') {
      url.hostname = 'playpokergym.com';
      url.protocol = 'https:';
      return Response.redirect(url.href, 301);
    }
    // Retired guide slugs. 12 vs 2 was published as "stand" but the coach and
    // basic strategy say hit, so the page moved to a slug that matches (2026-11-02).
    const moved = GUIDE_REDIRECTS[url.pathname] || GUIDE_REDIRECTS[url.pathname + '/'];
    if (moved) {
      return Response.redirect(new URL(moved + url.search, url.origin).href, 301);
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

  // Daily reminder. Dead subscriptions are deleted on 404/410 so the list
  // does not rot; any other failure is logged and retried the next day.
  async scheduled(event, env, ctx) {
    if (!env.PUSH_SUBS || !env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY) return;
    const vapid = {
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
      subject: env.VAPID_SUBJECT || 'mailto:meep@mail.grokbot.com',
    };
    const run = (async () => {
      let cursor;
      let sent = 0;
      let dead = 0;
      let failed = 0;
      do {
        const page = await env.PUSH_SUBS.list({ cursor, limit: 500 });
        for (const key of page.keys) {
          // Only device subscriptions are sent to. Other keys (the VAPID
          // backup at meta:vapid) must never be treated as a subscription and
          // pruned by the invalid-record branch.
          if (!key.name.startsWith('sub:')) continue;
          const raw = await env.PUSH_SUBS.get(key.name);
          if (!raw) continue;
          let record;
          try { record = JSON.parse(raw); } catch { await env.PUSH_SUBS.delete(key.name); continue; }
          if (!validSubscription(record)) { await env.PUSH_SUBS.delete(key.name); continue; }
          try {
            const status = await sendPush(record, PUSH_PAYLOAD, vapid);
            if (status === 404 || status === 410) { await env.PUSH_SUBS.delete(key.name); dead++; }
            else if (status >= 200 && status < 300) sent++;
            else failed++;
          } catch {
            failed++;
          }
        }
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      console.log(`push: sent ${sent}, dead ${dead}, failed ${failed}`);
    })();
    if (ctx && ctx.waitUntil) ctx.waitUntil(run); else await run();
  },
};
