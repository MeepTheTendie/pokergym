import test from 'node:test';
import assert from 'node:assert/strict';
import { isIngestPath, upstreamRequest } from '../worker/proxy.js';
import worker from '../worker/index.js';

test('ingest paths are recognised, everything else is not', () => {
  for (const p of ['/ingest', '/ingest/', '/ingest/static/array.js', '/ingest/e/', '/ingest/decide/?v=3']) {
    assert.equal(isIngestPath(p), true, p);
  }
  for (const p of ['/ingestx', '/ingestfoo', '/web/', '/', '/guides/blackjack/', '/src/games/videopoker.js']) {
    assert.equal(isIngestPath(p), false, p);
  }
});

test('ingest requests map to the right PostHog host', () => {
  assert.deepEqual(upstreamRequest('https://playpokergym.com/ingest/static/array.js'),
    { url: 'https://us-assets.i.posthog.com/static/array.js', isAsset: true });
  assert.deepEqual(upstreamRequest('https://playpokergym.com/ingest/e/?ip=1'),
    { url: 'https://us.i.posthog.com/e/?ip=1', isAsset: false });
  assert.deepEqual(upstreamRequest('https://playpokergym.com/ingest/decide/?v=3'),
    { url: 'https://us.i.posthog.com/decide/?v=3', isAsset: false });
  // The /ingest prefix is stripped and the query string preserved.
  assert.equal(upstreamRequest('https://playpokergym.com/ingest').url, 'https://us.i.posthog.com/');
  // Region override, and an unknown region falls back to US.
  assert.equal(upstreamRequest('https://playpokergym.com/ingest/e/', 'eu').url, 'https://eu.i.posthog.com/e/');
  assert.equal(upstreamRequest('https://playpokergym.com/ingest/static/array.js', 'eu').url, 'https://eu-assets.i.posthog.com/static/array.js');
  assert.equal(upstreamRequest('https://playpokergym.com/ingest/e/', 'xx').url, 'https://us.i.posthog.com/e/');
});

test('ingest rejects write methods outside the SDK contract and oversized bodies', async () => {
  let calls = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async () => { calls++; return new Response('proxied'); };
  const env = {
    ASSETS: { fetch() { throw new Error('ingest must never touch assets'); } },
  };
  try {
    const put = await worker.fetch(new Request('https://playpokergym.com/ingest/e/', {
      method: 'PUT', body: 'x',
    }), env, {});
    assert.equal(put.status, 405);
    const large = await worker.fetch(new Request('https://playpokergym.com/ingest/e/', {
      method: 'POST',
      headers: { 'content-length': String(2 * 1024 * 1024 + 1) },
      body: 'x',
    }), env, {});
    assert.equal(large.status, 413);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test('worker proxies /ingest/* without counting or touching assets', async () => {
  const calls = [];
  const served = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method });
    return new Response('proxied', { status: 200, headers: { 'content-type': 'text/plain' } });
  };
  const env = {
    VISITS: { writeDataPoint() { throw new Error('ingest must never be counted'); } },
    ASSETS: { fetch(req) { served.push(req.url); return new Response('asset'); } },
  };
  const ctx = { waitUntil() { throw new Error('ingest must never schedule work'); } };
  try {
    const res = await worker.fetch(new Request('https://playpokergym.com/ingest/e/', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"batch":[]}',
    }), env, ctx);
    assert.equal(await res.text(), 'proxied');
    // Proxy responses are not page responses: no CSP is stamped on them.
    assert.equal(res.headers.get('content-security-policy'), null);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://us.i.posthog.com/e/');
    assert.equal(calls[0].method, 'POST');
    assert.deepEqual(served, []);

    // The SDK asset is fetched from the assets host with GET even if a method
    // other than GET arrives.
    await worker.fetch(new Request('https://playpokergym.com/ingest/static/array.js', { method: 'POST' }), env, ctx);
    assert.equal(calls[1].url, 'https://us-assets.i.posthog.com/static/array.js');
    assert.equal(calls[1].method, 'GET');

    // An upstream failure is a 502, never a broken page or a counted visit.
    globalThis.fetch = async () => { throw new Error('upstream down'); };
    const fail = await worker.fetch(new Request('https://playpokergym.com/ingest/e/'), env, ctx);
    assert.equal(fail.status, 502);
  } finally {
    globalThis.fetch = original;
  }
});
