// Web Push from the edge: VAPID signing plus RFC 8291 payload encryption.
// No dependencies — Workers and Node both expose the same WebCrypto calls, so
// the sender can be unit-tested outside the Worker.
//
// The private key never leaves the Worker secret. The client only ever sees
// the public key, and the push service only ever sees a signed JWT and an
// encrypted body.

export function b64urlEncode(bytes) {
  let binary = '';
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(text) {
  const padded = String(text).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

const encoder = new TextEncoder();

function concat(...parts) {
  const total = parts.reduce((n, part) => n + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}

/** A stored subscription must be a real https endpoint with both keys. */
export function validSubscription(value) {
  if (!value || typeof value !== 'object') return false;
  if (typeof value.endpoint !== 'string' || value.endpoint.length > 1024) return false;
  let url;
  try { url = new URL(value.endpoint); } catch { return false; }
  if (url.protocol !== 'https:') return false;
  const keys = value.keys;
  if (!keys || typeof keys !== 'object') return false;
  if (typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') return false;
  try {
    if (b64urlDecode(keys.p256dh).length !== 65) return false;
    const auth = b64urlDecode(keys.auth).length;
    if (auth < 16 || auth > 32) return false;
  } catch { return false; }
  return true;
}

/** Stable, short KV key: the hash keeps endpoint URLs out of key listings. */
export async function subscriptionId(endpoint) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(endpoint));
  return b64urlEncode(digest).slice(0, 24);
}

async function hkdf(ikm, salt, info, bits) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bits));
}

/**
 * RFC 8291 single-record body for an aes128gcm push.
 * Returns the full body the push service expects, header block included.
 */
export async function encryptPayload(subscription, payload) {
  const uaPublic = b64urlDecode(subscription.keys.p256dh);
  const authSecret = b64urlDecode(subscription.keys.auth);
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ephemeral = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ephemeral.publicKey));
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, ephemeral.privateKey, 256));

  // RFC 8291 key derivation, then RFC 8188 content encoding.
  const prk = await hkdf(shared, authSecret, concat(encoder.encode('WebPush: info\0'), uaPublic, asPublic), 256);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(prk, salt, encoder.encode('Content-Encoding: aes128gcm\0'), 128);
  const nonce = await hkdf(prk, salt, encoder.encode('Content-Encoding: nonce\0'), 96);

  const body = typeof payload === 'string' ? encoder.encode(payload) : new Uint8Array(payload);
  const record = concat(body, new Uint8Array([2]));  // 0x02 = last record, no padding
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aes, record));

  const header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);  // record size
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, ciphertext);
}

/** VAPID JWT (ES256) for one push-service origin. */
export async function vapidToken(endpoint, privateKey, subject, now = Math.floor(Date.now() / 1000), publicKey = '') {
  const aud = new URL(endpoint).origin;
  const header = b64urlEncode(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64urlEncode(encoder.encode(JSON.stringify({ aud, exp: now + 12 * 60 * 60, sub: subject })));
  const signingInput = encoder.encode(`${header}.${claims}`);
  // WebCrypto will not import an EC private JWK without x and y, so they are
  // read back from the public key instead of being stored a second time.
  let jwk = { kty: 'EC', crv: 'P-256', d: privateKey };
  if (publicKey) {
    const pub = await crypto.subtle.importKey('raw', b64urlDecode(publicKey), { name: 'ECDH', namedCurve: 'P-256' }, true, []);
    const exported = await crypto.subtle.exportKey('jwk', pub);
    jwk = { ...jwk, x: exported.x, y: exported.y };
  }
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, signingInput));
  return `${header}.${claims}.${b64urlEncode(signature)}`;
}

/**
 * Send one notification. Returns the push service status: 201/202 is a
 * delivery, 404/410 means the subscription is dead and should be deleted.
 */
export async function sendPush(subscription, payload, { publicKey, privateKey, subject }, fetchImpl = fetch) {
  const body = await encryptPayload(subscription, payload);
  const token = await vapidToken(subscription.endpoint, privateKey, subject, undefined, publicKey);
  const response = await fetchImpl(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${token}, k=${publicKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'normal',
    },
    body,
  });
  return response.status;
}
