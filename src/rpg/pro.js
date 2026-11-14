// Gym Pro unlock codes (Ko-fi). Fully offline: no network call, no account, and
// no secret in the client. A player pastes a code, its Ed25519 signature is
// verified locally with Web Crypto (`crypto.subtle.verify`, no dependency), and
// a Pro entitlement is written to the existing save so it survives export and
// import.
//
// Code format (produced by the Worker, which holds the private key):
//
//   base64url(payload) + "." + base64url(signature)
//   payload = JSON { t: "monthly" | "lifetime", exp: <unix seconds | 0>, id: <8-char ref> }
//
// SIGNING INPUT (must match the Worker exactly): the Ed25519 signature is over
// the UTF-8 bytes of the base64url-encoded payload string — i.e. the exact
// segment that appears before the "." in the code. This keeps verification
// byte-exact without any JSON re-serialization on the client.
//
// The client embeds only the PUBLIC key. Codes cannot be forged from the
// shipped JavaScript because the private key never leaves the Worker.
//
// Entitlement stored on the profile: `pro` is `false` for a free save, or an
// object `{ tier: "monthly" | "lifetime", exp: <unix seconds> }` for a Pro save
// (lifetime always stores exp 0). `proStatus(profile)` reports the live state.

import { sanitizePro } from './state.js';

// A monthly entitlement within this many seconds of expiring is "renew soon".
export const PRO_RENEW_SOON_SECONDS = 5 * 24 * 60 * 60; // 5 days

// Embedded Ed25519 PUBLIC key (JWK). This is the TEST key from
// test/fixtures/pro-test-keys.json (paired with the TEST private key there).
// Before launch, Claude swaps this for the production public key paired with
// the Worker secret PRO_SIGNING_KEY. The private key is never present here.
const PRO_PUBLIC_KEY_JWK = {
  crv: 'Ed25519',
  x: '0nj7E167ATXNSmUS3p4KiEtAb10cf3ypp1VE6zWekz8',
  kty: 'OKP',
};

const unixNow = () => Math.floor(Date.now() / 1000);
const toUtf8 = (s) => new TextEncoder().encode(s);

// Decodes RFC 4648 §5 base64url (padding tolerated). Returns a Uint8Array, or
// null when the input is not well-formed base64url.
function b64urlDecode(str) {
  if (typeof str !== 'string' || !/^[A-Za-z0-9_-]+$/.test(str)) return null;
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = s + '='.repeat((4 - (s.length % 4)) % 4);
  let bin;
  try { bin = atob(padded); } catch { return null; }
  if (bin.length === 0) return null;
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// The cached CryptoKey. Imported lazily so the module stays synchronous to load
// (it ships to the browser and is imported by state.js).
let publicKeyPromise;
function getPublicKey() {
  if (!publicKeyPromise) {
    publicKeyPromise = crypto.subtle.importKey(
      'jwk', PRO_PUBLIC_KEY_JWK, { name: 'Ed25519' }, false, ['verify'],
    );
  }
  return publicKeyPromise;
}

// Splits "base64url(payload).base64url(signature)" into its parts, validating
// shape and the fixed 64-byte Ed25519 signature length. Returns null on any
// malformed input.
function splitProCode(code) {
  if (typeof code !== 'string') return null;
  const cleaned = code.trim();
  const dot = cleaned.indexOf('.');
  if (dot <= 0 || dot === cleaned.length - 1) return null;
  const payloadB64 = cleaned.slice(0, dot);
  const sigB64 = cleaned.slice(dot + 1);
  if (!/^[A-Za-z0-9_-]+$/.test(payloadB64) || !/^[A-Za-z0-9_-]+$/.test(sigB64)) return null;
  const payloadBytes = b64urlDecode(payloadB64);
  const sigBytes = b64urlDecode(sigB64);
  if (!payloadBytes || !sigBytes || sigBytes.length !== 64) return null;
  return { payloadB64, payloadBytes, sigB64, sigBytes };
}

// Validates a decoded payload object. Returns { tier, exp, id } or null.
// Lifetime must carry exp 0 (or omit it); monthly must carry a positive,
// finite, integer exp (unix seconds).
function parsePayload(bytes) {
  let text;
  try { text = new TextDecoder().decode(bytes); } catch { return null; }
  let obj;
  try { obj = JSON.parse(text); } catch { return null; }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  if (obj.t !== 'monthly' && obj.t !== 'lifetime') return null;
  if (typeof obj.id !== 'string' || !/^[A-Za-z0-9]{8}$/.test(obj.id)) return null;
  if (obj.t === 'lifetime') {
    if (obj.exp !== 0 && obj.exp !== undefined) return null;
    return { tier: 'lifetime', exp: 0, id: obj.id };
  }
  if (!Number.isSafeInteger(obj.exp) || obj.exp <= 0) return null;
  return { tier: 'monthly', exp: obj.exp, id: obj.id };
}

// Verifies a code's Ed25519 signature against the embedded public key and
// checks expiry. Resolves to the parsed { tier, exp, id } on success, or null
// on any failure (malformed, tampered, wrong key, or an expired monthly code).
export async function verifyProCode(code, now = unixNow()) {
  const parts = splitProCode(code);
  if (!parts) return null;
  let ok = false;
  try {
    const key = await getPublicKey();
    ok = await crypto.subtle.verify(
      { name: 'Ed25519' }, key, parts.sigBytes, toUtf8(parts.payloadB64),
    );
  } catch {
    ok = false;
  }
  if (!ok) return null;
  const payload = parsePayload(parts.payloadBytes);
  if (!payload) return null;
  if (payload.tier === 'monthly' && now > payload.exp) return null;
  return payload;
}

// The "Restore Pro" entry point. On a valid, unexpired code, returns the
// profile with `pro` set to { tier, exp }; on any invalid/expired code, returns
// null and leaves the caller's profile untouched.
export async function restorePro(profile, code, now = unixNow()) {
  if (!profile || typeof profile !== 'object') return null;
  const payload = await verifyProCode(code, now);
  if (!payload) return null;
  return { ...profile, pro: { tier: payload.tier, exp: payload.exp } };
}

/* ---------------- stored entitlement status ---------------- */

const INACTIVE = Object.freeze({ active: false, tier: null, exp: null, renewSoon: false });

// Live status of the stored entitlement. Synchronous: it only reads the save.
export function proStatus(profile, now = unixNow()) {
  const pro = sanitizePro(profile?.pro);
  if (pro === false) return INACTIVE;
  if (pro.tier === 'lifetime') {
    return { active: true, tier: 'lifetime', exp: 0, renewSoon: false };
  }
  const active = now <= pro.exp;
  const renewSoon = active && (pro.exp - now) < PRO_RENEW_SOON_SECONDS;
  return { active, tier: 'monthly', exp: pro.exp, renewSoon };
}

// True when the stored entitlement is currently active (not expired).
export function hasPro(profile, now = unixNow()) {
  return proStatus(profile, now).active;
}
