import test from 'node:test';
import assert from 'node:assert/strict';
import { handleProApi, handleKofiWebhook, handleProRestore, isProApiPath } from '../worker/pro.js';
import worker from '../worker/index.js';

function envWith(overrides = {}) {
  return { ...overrides };
}

test('pro API paths are recognised', () => {
  assert.equal(isProApiPath('/api/kofi'), true);
  assert.equal(isProApiPath('/api/pro/restore'), true);
  assert.equal(isProApiPath('/api/pro/status'), false);
  assert.equal(isProApiPath('/push/subscribe'), false);
});

test('missing Pro configuration returns 503 cleanly for Ko-fi webhook', async () => {
  const req = new Request('https://playpokergym.com/api/kofi', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'data=%7B%7D',
  });
  for (const env of [
    {},
    { KOFI_TOKEN: 'tok' },
    { PRO_SIGNING_KEY: '{"kty":"OKP"}' },
    { PRO_ENTITLEMENTS: { get: async () => null, put: async () => {} } },
    { KOFI_TOKEN: 'tok', PRO_SIGNING_KEY: '{"kty":"OKP"}' },
    { KOFI_TOKEN: 'tok', PRO_ENTITLEMENTS: { get: async () => null, put: async () => {} } },
    { PRO_SIGNING_KEY: '{"kty":"OKP"}', PRO_ENTITLEMENTS: { get: async () => null, put: async () => {} } },
  ]) {
    const res = await handleKofiWebhook(req.clone(), envWith(env));
    assert.equal(res.status, 503, JSON.stringify(Object.keys(env)));
    assert.match(res.headers.get('content-type') || '', /application\/json/);
    const body = await res.json();
    assert.deepEqual(body, { ok: false, error: 'unavailable' });
  }
});

test('missing Pro configuration returns 503 cleanly for restore endpoint', async () => {
  const req = new Request('https://playpokergym.com/api/pro/restore', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'buyer@example.com' }),
  });
  for (const env of [
    {},
    { KOFI_TOKEN: 'tok' },
    { PRO_SIGNING_KEY: '{"kty":"OKP"}' },
    { PRO_ENTITLEMENTS: { get: async () => null, put: async () => {} } },
    { KOFI_TOKEN: 'tok', PRO_SIGNING_KEY: '{"kty":"OKP"}' },
  ]) {
    const res = await handleProRestore(req.clone(), envWith(env));
    assert.equal(res.status, 503, JSON.stringify(Object.keys(env)));
    const body = await res.json();
    assert.deepEqual(body, { ok: false, error: 'unavailable' });
  }
});

test('worker routes Pro API requests to 503 when unconfigured', async () => {
  const calls = [];
  const env = {
    ASSETS: { fetch(req) { calls.push(new URL(req.url).pathname); return new Response('asset', { status: 200 }); } },
  };
  const ctx = { waitUntil() {} };
  const kofi = await worker.fetch(new Request('https://playpokergym.com/api/kofi', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  }), env, ctx);
  assert.equal(kofi.status, 503);
  assert.deepEqual(await kofi.json(), { ok: false, error: 'unavailable' });

  const restore = await worker.fetch(new Request('https://playpokergym.com/api/pro/restore', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"email":"a@b.test"}',
  }), env, ctx);
  assert.equal(restore.status, 503);
  assert.deepEqual(await restore.json(), { ok: false, error: 'unavailable' });
  assert.deepEqual(calls, [], 'Pro API requests must not be served as static assets');
});

test('handleProApi dispatches by path', async () => {
  const env = {};
  const res = await handleProApi(new Request('https://playpokergym.com/api/pro/restore', { method: 'POST', body: '{}' }), env);
  assert.equal(res.status, 503);
});

function makeKv() {
  const store = new Map();
  return {
    store,
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async put(key, value) { store.set(key, value); },
  };
}

const PRIVATE_KEY_JWK = {
  crv: 'Ed25519',
  d: '_k7eoIsIWYI7Lsn7u8qEXRhh73kA5leycOz-26KrNd0',
  x: '0nj7E167ATXNSmUS3p4KiEtAb10cf3ypp1VE6zWekz8',
  kty: 'OKP',
};

function configuredEnv(overrides = {}) {
  return {
    KOFI_TOKEN: 'tok',
    PRO_SIGNING_KEY: JSON.stringify(PRIVATE_KEY_JWK),
    PRO_ENTITLEMENTS: makeKv(),
    ...overrides,
  };
}

function kofiRequest(data) {
  return new Request('https://playpokergym.com/api/kofi', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  });
}

test('Ko-fi donation is ignored and does not grant Pro', async () => {
  const env = configuredEnv({ PRO_LIFETIME_ITEM: 'LIFETIME29' });
  const res = await handleKofiWebhook(kofiRequest({
    verification_token: 'tok',
    type: 'Donation',
    email: 'tipper@example.com',
    message_id: 'msg-donation-1',
  }), env);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, ignored: true });
  assert.equal(env.PRO_ENTITLEMENTS.store.size, 0);
});

test('Ko-fi shop order without configured lifetime item is ignored', async () => {
  const env = configuredEnv();
  const res = await handleKofiWebhook(kofiRequest({
    verification_token: 'tok',
    type: 'Shop Order',
    email: 'buyer@example.com',
    message_id: 'msg-shop-unset-1',
    shop_items: [{ direct_link_code: 'LIFETIME29' }],
  }), env);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, ignored: true });
  assert.equal(env.PRO_ENTITLEMENTS.store.size, 0);
});

test('Ko-fi shop order for other items is ignored', async () => {
  const env = configuredEnv({ PRO_LIFETIME_ITEM: 'LIFETIME29' });
  const res = await handleKofiWebhook(kofiRequest({
    verification_token: 'tok',
    type: 'Shop Order',
    email: 'buyer@example.com',
    message_id: 'msg-shop-other-1',
    shop_items: [{ direct_link_code: 'SOMETHING_ELSE' }, { direct_link_code: 'STICKER' }],
  }), env);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, ignored: true });
  assert.equal(env.PRO_ENTITLEMENTS.store.size, 0);
});

test('Ko-fi shop order containing lifetime item grants lifetime Pro', async () => {
  const env = configuredEnv({ PRO_LIFETIME_ITEM: 'LIFETIME29' });
  const res = await handleKofiWebhook(kofiRequest({
    verification_token: 'tok',
    type: 'Shop Order',
    email: 'buyer@example.com',
    message_id: 'msg-shop-life-1',
    shop_items: [{ direct_link_code: 'SOMETHING_ELSE' }, { direct_link_code: 'LIFETIME29' }],
  }), env);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, tier: 'lifetime' });
  const keys = [...env.PRO_ENTITLEMENTS.store.keys()];
  assert.ok(keys.some(k => k.startsWith('email:')), 'stores entitlement by email hash');
  assert.equal(env.PRO_ENTITLEMENTS.store.get('msg:msg-shop-life-1'), '1', 'dedupes by message id');
});
