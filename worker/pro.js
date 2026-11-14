// Gym Pro payments and unlocks (Ko-fi webhook + restore). Code only: returns 503
// cleanly when required configuration is absent. No secrets or bindings are
// added here; the owner must provide them (see result doc).

const SECURITY_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...SECURITY_HEADERS, ...extraHeaders },
  });
}

function text(body, status = 200) {
  return new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}

function getKv(env) {
  return env.PRO_ENTITLEMENTS || env.PRO_KV || null;
}

function proConfigured(env) {
  return Boolean(env && env.KOFI_TOKEN && env.PRO_SIGNING_KEY && getKv(env));
}

async function readBody(request, limit = 65536) {
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
      if (total > limit) { await reader.cancel().catch(() => {}); return null; }
      chunks.push(value);
    }
  } catch {
    return null;
  } finally {
    try { reader.releaseLock(); } catch {}
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

function b64url(bytes) {
  let binary = '';
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Hex(textValue) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(textValue));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function importPrivateKey(jwkOrString) {
  let jwk = jwkOrString;
  if (typeof jwk === 'string') {
    try { jwk = JSON.parse(jwk); } catch { return null; }
  }
  if (!jwk || typeof jwk !== 'object') return null;
  try {
    return await crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['sign']);
  } catch {
    return null;
  }
}

async function signEntitlement(env, payload) {
  const key = await importPrivateKey(env.PRO_SIGNING_KEY);
  if (!key) throw new Error('invalid signing key');
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = b64url(new TextEncoder().encode(payloadJson));
  const sig = await crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${b64url(sig)}`;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function parseKofiBody(raw, contentType = '') {
  if (!raw) return null;
  const ct = String(contentType || '').toLowerCase();
  try {
    if (ct.includes('application/json')) return JSON.parse(raw);
  } catch {}
  try {
    const params = new URLSearchParams(raw);
    const data = params.get('data');
    if (data) return JSON.parse(data);
  } catch {}
  try { return JSON.parse(raw); } catch {}
  return null;
}

function shopItemMatchesLifetime(data, env) {
  const configured = typeof env?.PRO_LIFETIME_ITEM === 'string' ? env.PRO_LIFETIME_ITEM.trim() : '';
  if (!configured) return false;
  const want = configured.toLowerCase();
  const items = Array.isArray(data?.shop_items) ? data.shop_items : [];
  return items.some((item) => {
    if (!item || typeof item !== 'object') return false;
    const codes = [item.direct_link_code, item.code, item.variant_code, item.item_code, item.product_code];
    return codes.some((code) => typeof code === 'string' && code.trim().toLowerCase() === want);
  });
}

export function tierForKofi(data, env) {
  const type = String(data?.type || '').toLowerCase();
  if (type === 'subscription') return { tier: 'monthly', expDays: 35 };
  if (type === 'donation') return null;
  if (type === 'shop order') {
    return shopItemMatchesLifetime(data, env) ? { tier: 'lifetime', expDays: 0 } : null;
  }
  return null;
}

export async function handleKofiWebhook(request, env) {
  if (!proConfigured(env)) return json({ ok: false, error: 'unavailable' }, 503);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  const raw = await readBody(request);
  if (raw == null) return json({ ok: false, error: 'invalid_body' }, 400);
  const data = parseKofiBody(raw, request.headers.get('content-type'));
  if (!data || typeof data !== 'object') return json({ ok: false, error: 'invalid_body' }, 400);
  if (String(data.verification_token || '') !== String(env.KOFI_TOKEN || '')) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }
  const tierInfo = tierForKofi(data, env);
  if (!tierInfo) return json({ ok: true, ignored: true });
  const email = normalizeEmail(data.email || data.from_email);
  if (!email) return json({ ok: false, error: 'missing_email' }, 400);
  const kv = getKv(env);
  const messageId = String(data.message_id || data.kofi_transaction_id || '').trim();
  if (messageId) {
    const seen = await kv.get(`msg:${messageId}`);
    if (seen) return json({ ok: true, duplicate: true });
  }
  const now = Math.floor(Date.now() / 1000);
  const exp = tierInfo.expDays ? now + tierInfo.expDays * 86400 : 0;
  const payload = { t: tierInfo.tier, exp, id: messageId || `kofi-${now}` };
  let code;
  try {
    code = await signEntitlement(env, payload);
  } catch {
    return json({ ok: false, error: 'unavailable' }, 503);
  }
  const emailHash = await sha256Hex(email);
  const record = { code, exp, tier: tierInfo.tier, emailHash, updated: now };
  await kv.put(`email:${emailHash}`, JSON.stringify(record), exp ? { expirationTtl: tierInfo.expDays * 86400 + 86400 } : undefined);
  if (messageId) await kv.put(`msg:${messageId}`, '1', { expirationTtl: 60 * 86400 });
  return json({ ok: true, tier: tierInfo.tier });
}

export async function handleProRestore(request, env) {
  if (!proConfigured(env)) return json({ ok: false, error: 'unavailable' }, 503);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  const raw = await readBody(request, 4096);
  if (raw == null) return json({ ok: false, error: 'invalid_body' }, 400);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ ok: false, error: 'invalid_body' }, 400); }
  const email = normalizeEmail(body?.email);
  if (!email || !email.includes('@')) return json({ ok: false, error: 'invalid_email' }, 400);
  const kv = getKv(env);
  const emailHash = await sha256Hex(email);
  const rawRecord = await kv.get(`email:${emailHash}`);
  if (!rawRecord) return json({ ok: false, error: 'not_found' }, 404);
  let record;
  try { record = JSON.parse(rawRecord); } catch { return json({ ok: false, error: 'not_found' }, 404); }
  if (!record || typeof record.code !== 'string') return json({ ok: false, error: 'not_found' }, 404);
  const now = Math.floor(Date.now() / 1000);
  if (record.exp && Number(record.exp) > 0 && now >= Number(record.exp)) {
    return json({ ok: false, error: 'expired' }, 410);
  }
  return json({ ok: true, code: record.code, tier: record.tier, exp: record.exp || 0 });
}

export function isProApiPath(pathname) {
  return pathname === '/api/kofi' || pathname === '/api/pro/restore';
}

export async function handleProApi(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/api/kofi') return handleKofiWebhook(request, env);
  if (url.pathname === '/api/pro/restore') return handleProRestore(request, env);
  return json({ ok: false, error: 'not_found' }, 404);
}
