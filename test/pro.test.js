import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createProfile, serialize, deserialize, sanitizeProfile } from '../src/rpg/state.js';
import { readBackup, writeBackup } from '../src/rpg/backup.js';
import {
  verifyProCode, restorePro, hasPro, proStatus, PRO_RENEW_SOON_SECONDS,
} from '../src/rpg/pro.js';

// The TEST keypair Claude committed to test/fixtures/pro-test-keys.json. The
// private key is TEST ONLY; it never ships to the client and never touches
// production. The client verifies against the matching embedded public key.
const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/pro-test-keys.json', import.meta.url), 'utf8'),
);

const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();

// Fixed clock so expiry behaviour is deterministic.
const NOW = 1_800_000_000;
const DAY = 24 * 60 * 60;

let testKey;
async function getTestKey() {
  if (!testKey) {
    testKey = await subtle.importKey('jwk', fixture.privateKeyJwk, { name: 'Ed25519' }, false, ['sign']);
  }
  return testKey;
}

// Signs a payload exactly as the Worker does: the signature is over the UTF-8
// bytes of the base64url(payload) string (see the SIGNING INPUT note in pro.js).
async function mint(privateKey, payload) {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = await subtle.sign({ name: 'Ed25519' }, privateKey, enc.encode(payloadB64));
  return `${payloadB64}.${Buffer.from(sig).toString('base64url')}`;
}

test('a valid lifetime code unlocks Pro and never expires', async () => {
  const code = await mint(await getTestKey(), { t: 'lifetime', exp: 0, id: 'AB12CD34' });
  assert.deepEqual(await verifyProCode(code, NOW), { tier: 'lifetime', exp: 0, id: 'AB12CD34' });

  const profile = createProfile('scholar');
  const unlocked = await restorePro(profile, code, NOW);
  assert.deepEqual(unlocked.pro, { tier: 'lifetime', exp: 0 });
  assert.equal(hasPro(unlocked, NOW), true);
  assert.deepEqual(proStatus(unlocked, NOW), { active: true, tier: 'lifetime', exp: 0, renewSoon: false });
  // Lifetime stays active at any future time.
  assert.equal(hasPro(unlocked, NOW + 1000 * DAY), true);
});

test('a valid monthly code unlocks Pro until its expiry', async () => {
  const exp = NOW + 60 * DAY;
  const code = await mint(await getTestKey(), { t: 'monthly', exp, id: 'Z9Y8X7W6' });
  assert.deepEqual(await verifyProCode(code, NOW), { tier: 'monthly', exp, id: 'Z9Y8X7W6' });

  const profile = createProfile('grinder');
  const unlocked = await restorePro(profile, code, NOW);
  assert.deepEqual(unlocked.pro, { tier: 'monthly', exp });
  assert.deepEqual(proStatus(unlocked, NOW), { active: true, tier: 'monthly', exp, renewSoon: false });
  assert.equal(hasPro(unlocked, NOW), true);
  // Still active right up to (and including) the expiry instant.
  assert.equal(hasPro(unlocked, exp), true);
  // Expired once the clock passes exp.
  assert.equal(hasPro(unlocked, exp + 1), false);
  assert.deepEqual(proStatus(unlocked, exp + 1), { active: false, tier: 'monthly', exp, renewSoon: false });
});

test('renewSoon is reported when a monthly code has fewer than 5 days left', async () => {
  const soon = NOW + 3 * DAY;
  const later = NOW + 10 * DAY;
  const codeSoon = await mint(await getTestKey(), { t: 'monthly', exp: soon, id: 'A1B2C3D4' });
  const codeLater = await mint(await getTestKey(), { t: 'monthly', exp: later, id: 'E5F6G7H8' });

  const pSoon = await restorePro(createProfile('dealer'), codeSoon, NOW);
  assert.equal(proStatus(pSoon, NOW).renewSoon, true);
  assert.equal(proStatus(pSoon, NOW).active, true);

  const pLater = await restorePro(createProfile('dealer'), codeLater, NOW);
  assert.equal(proStatus(pLater, NOW).renewSoon, false);

  // Exactly 5 days out is not "soon" (strictly fewer than 5 days).
  const pExact = await restorePro(createProfile('dealer'),
    await mint(await getTestKey(), { t: 'monthly', exp: NOW + PRO_RENEW_SOON_SECONDS, id: 'Q1W2E3R4' }), NOW);
  assert.equal(proStatus(pExact, NOW).renewSoon, false);
});

test('an expired monthly code is rejected and changes nothing', async () => {
  const code = await mint(await getTestKey(), { t: 'monthly', exp: NOW - 1, id: 'P9O8I7U6' });
  assert.equal(await verifyProCode(code, NOW), null);

  const profile = createProfile('scholar');
  const snapshot = JSON.stringify(profile);
  assert.equal(await restorePro(profile, code, NOW), null);
  assert.equal(JSON.stringify(profile), snapshot);
  assert.equal(hasPro(profile, NOW), false);
});

test('a tampered payload or signature is rejected', async () => {
  const code = await mint(await getTestKey(), { t: 'lifetime', exp: 0, id: 'LM10NO20' });
  const dot = code.indexOf('.');
  const payloadB64 = code.slice(0, dot);
  const sigB64 = code.slice(dot + 1);

  // Flip a character in the payload segment (base64url alphabet).
  const flip = (c) => (c === 'A' ? 'B' : 'A');
  const tamperedPayload = payloadB64.slice(0, -1) + flip(payloadB64.at(-1));
  assert.equal(await verifyProCode(`${tamperedPayload}.${sigB64}`, NOW), null);

  // Flip a character in the signature segment.
  const tamperedSig = sigB64.slice(0, -1) + flip(sigB64.at(-1));
  assert.equal(await verifyProCode(`${payloadB64}.${tamperedSig}`, NOW), null);

  // A decoded-but-resigned payload with a different id is also caught, because
  // it no longer matches the signature over the original segment.
  const other = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  other.id = '00000000';
  const reencoded = Buffer.from(JSON.stringify(other)).toString('base64url');
  assert.equal(await verifyProCode(`${reencoded}.${sigB64}`, NOW), null);
});

test('a code signed with the wrong key is rejected', async () => {
  const other = await subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const code = await mint(other.privateKey, { t: 'lifetime', exp: 0, id: 'XY12ZW34' });
  assert.equal(await verifyProCode(code, NOW), null);
  assert.equal(await restorePro(createProfile('scholar'), code, NOW), null);
});

test('malformed codes are rejected', async () => {
  const bad = [
    null, undefined, '', 'not-a-code', 'a.b.c', '.', 'sig', 'AAAA.'.padEnd(4, 'A'),
    '!.AAAA', 'AAAA.AAAA', // bad alphabet / too-short signature
    `${Buffer.from('{"t":"lifetime","exp":0,"id":"AB12CD34"}').toString('base64url')}.${'A'.repeat(86)}`,
  ];
  for (const code of bad) {
    assert.equal(await verifyProCode(code, NOW), null, `should reject ${JSON.stringify(code)}`);
  }
  // Payloads that parse but fail shape validation are rejected even with a
  // valid signature.
  for (const payload of [
    { t: 'lifetime', exp: 5, id: 'AB12CD34' },        // lifetime must carry exp 0
    { t: 'monthly', exp: 0, id: 'AB12CD34' },          // monthly needs exp > 0
    { t: 'yearly', exp: NOW + DAY, id: 'AB12CD34' },   // unknown tier
    { t: 'lifetime', exp: 0, id: 'short' },            // id must be 8 chars
    { t: 'lifetime', exp: 0, id: 'AB12CD3!' },         // id must be alphanumeric
    { t: 'monthly', exp: 'soon', id: 'AB12CD34' },     // exp must be an integer
    { t: 'monthly', exp: 1.5, id: 'AB12CD34' },
  ]) {
    const code = await mint(await getTestKey(), payload);
    assert.equal(await verifyProCode(code, NOW), null, `should reject payload ${JSON.stringify(payload)}`);
  }
});

test('the entitlement survives export/import and sanitization', async () => {
  const code = await mint(await getTestKey(), { t: 'monthly', exp: NOW + 30 * DAY, id: 'MN34OP56' });
  let p = createProfile('grinder');
  p = await restorePro(p, code, NOW);
  assert.deepEqual(p.pro, { tier: 'monthly', exp: NOW + 30 * DAY });

  const back = readBackup(writeBackup(p));
  assert.deepEqual(back.pro, { tier: 'monthly', exp: NOW + 30 * DAY }, 'survives writeBackup/readBackup');
  assert.deepEqual(sanitizeProfile(back).pro, { tier: 'monthly', exp: NOW + 30 * DAY }, 'survives sanitizeProfile');

  const roundTrip = deserialize(serialize(p));
  assert.deepEqual(roundTrip.pro, { tier: 'monthly', exp: NOW + 30 * DAY }, 'survives serialize/deserialize');

  // A legacy free save (no `pro`) normalizes to false, not a Pro object.
  const legacy = { ...createProfile('grinder') };
  delete legacy.pro;
  assert.equal(readBackup(JSON.stringify(legacy)).pro, undefined);
  assert.equal(sanitizeProfile(readBackup(JSON.stringify(legacy))).pro, false);
  assert.equal(hasPro(sanitizeProfile(readBackup(JSON.stringify(legacy))), NOW), false);
});

test('an invalid stored entitlement is rejected on import and coerced on sanitize', () => {
  const p = createProfile('scholar');
  for (const bad of ['yes', 1, null, true, {}, [], { tier: 'monthly' }, { tier: 'monthly', exp: 0 }, { tier: 'monthly', exp: -5 }, { tier: 'nonsense', exp: 1 }]) {
    assert.throws(() => readBackup(JSON.stringify({ ...p, pro: bad })), /Invalid backup/, `should reject ${JSON.stringify(bad)}`);
  }
  assert.equal(sanitizeProfile({ ...p, pro: 'yes' }).pro, false);
  assert.equal(sanitizeProfile({ ...p, pro: true }).pro, false);
  assert.equal(sanitizeProfile({ ...p, pro: { tier: 'monthly', exp: 0 } }).pro, false);
});

test('a free profile carries pro=false and free features are unchanged by unlock', async () => {
  const p = createProfile('dealer');
  assert.equal(p.pro, false);
  assert.deepEqual(proStatus(p, NOW), { active: false, tier: null, exp: null, renewSoon: false });
  assert.equal(hasPro(p, NOW), false);

  const code = await mint(await getTestKey(), { t: 'lifetime', exp: 0, id: 'FE12DC34' });
  const unlocked = await restorePro(p, code, NOW);
  // Only the `pro` field changes — every free-feature field is byte-identical.
  assert.deepEqual(unlocked, { ...p, pro: { tier: 'lifetime', exp: 0 } });
  assert.equal(unlocked.name, p.name);
  assert.equal(unlocked.xp, p.xp);
  assert.equal(unlocked.score, p.score);
  assert.equal(unlocked.streak, p.streak);
  assert.deepEqual(unlocked.badges, p.badges);
  assert.deepEqual(unlocked.stats, p.stats);
  assert.deepEqual(unlocked.daily, p.daily);
});
