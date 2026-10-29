import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  b64urlEncode, b64urlDecode, validSubscription, subscriptionId,
  encryptPayload, vapidToken, sendPush,
} from '../worker/push.js';

const encoder = new TextEncoder();

async function hkdf(ikm, salt, info, bits) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bits));
}

function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}

/** The receiving side of RFC 8291, written independently of the sender. */
async function decrypt(body, uaPrivate, uaPublic, auth) {
  const salt = body.slice(0, 16);
  const idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen);
  const ciphertext = body.slice(21 + idlen);

  const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, uaPrivate, 256));
  const prk = await hkdf(shared, auth, concat(encoder.encode('WebPush: info\0'), uaPublic, asPublic), 256);
  const cek = await hkdf(prk, salt, encoder.encode('Content-Encoding: aes128gcm\0'), 128);
  const nonce = await hkdf(prk, salt, encoder.encode('Content-Encoding: nonce\0'), 96);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const record = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aes, ciphertext));
  // 0x02 marks the last record; anything after it is padding.
  const end = record.indexOf(2);
  return new TextDecoder().decode(end >= 0 ? record.slice(0, end) : record);
}

async function fakeSubscription() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const publicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return {
    pair,
    publicRaw,
    subscription: {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      keys: { p256dh: b64urlEncode(publicRaw), auth: b64urlEncode(auth) },
    },
    auth,
  };
}

test('base64url round-trips binary without padding', () => {
  const bytes = new Uint8Array([0, 1, 250, 255, 128]);
  const text = b64urlEncode(bytes);
  assert.doesNotMatch(text, /[+/=]/);
  assert.deepEqual([...b64urlDecode(text)], [...bytes]);
});

test('a valid subscription needs https and a 65-byte p256dh', async () => {
  const { subscription } = await fakeSubscription();
  assert.equal(validSubscription(subscription), true);
  assert.equal(validSubscription({ ...subscription, endpoint: 'http://fcm.googleapis.com/x' }), false);
  assert.equal(validSubscription({ ...subscription, endpoint: 'https://evil.example/fcm/send/x' }), false);
  assert.equal(validSubscription({ ...subscription, endpoint: 'https://fcm.googleapis.com.evil.example/x' }), false);
  assert.equal(validSubscription({ ...subscription, endpoint: 'https://fcm.googleapis.com:8443/x' }), false);
  assert.equal(validSubscription({ ...subscription, keys: { ...subscription.keys, p256dh: 'AAAA' } }), false);
  assert.equal(validSubscription(null), false);
  assert.notEqual(await subscriptionId(subscription.endpoint), await subscriptionId('https://fcm.googleapis.com/fcm/send/other'));
});

test('payload encryption matches the receiving side of RFC 8291', async () => {
  const { pair, publicRaw, subscription, auth } = await fakeSubscription();
  const message = JSON.stringify({ title: 'Play Poker Gym', body: 'Today’s drill is ready.' });
  const body = await encryptPayload(subscription, message);
  assert.ok(body.length > message.length);
  assert.equal(body[20], 65);
  assert.equal(await decrypt(body, pair.privateKey, publicRaw, auth), message);
});

test('VAPID token is a signed ES256 JWT for the push service origin', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const publicRaw = b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
  const token = await vapidToken('https://push.example.test/send/abc', jwk.d, 'mailto:test@example.com', 1000, publicRaw);
  const [header, claims, signature] = token.split('.');
  assert.equal(header.split('.').length, 1);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(b64urlDecode(header))), { typ: 'JWT', alg: 'ES256' });
  const parsed = JSON.parse(new TextDecoder().decode(b64urlDecode(claims)));
  assert.equal(parsed.aud, 'https://push.example.test');
  assert.equal(parsed.sub, 'mailto:test@example.com');
  assert.equal(parsed.exp, 1000 + 12 * 60 * 60);
  const ok = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    pair.publicKey,
    b64urlDecode(signature),
    encoder.encode(`${header}.${claims}`),
  );
  assert.equal(ok, true);
});

test('sendPush posts aes128gcm with a vapid authorization header', async () => {
  const { subscription } = await fakeSubscription();
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const publicRaw = b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
  let seen = null;
  const status = await sendPush(subscription, 'hello', { publicKey: publicRaw, privateKey: jwk.d, subject: 'mailto:t@e.com' },
    async (url, init) => { seen = { url, init }; return new Response('', { status: 201 }); });
  assert.equal(status, 201);
  assert.equal(seen.url, subscription.endpoint);
  assert.equal(seen.init.headers['Content-Encoding'], 'aes128gcm');
  assert.match(seen.init.headers.Authorization, /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/);
  assert.ok(seen.init.headers.Authorization.endsWith(publicRaw));
  assert.equal(seen.init.headers.TTL, '86400');
});
