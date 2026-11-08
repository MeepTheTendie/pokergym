import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, serialize, deserialize, sanitizeProfile } from '../src/rpg/state.js';
import { readBackup, writeBackup } from '../src/rpg/backup.js';
import {
  isValidProCode, mintProCode, restorePro, hasPro, proChecksum,
  sha256Hex, hmacSha256Hex,
} from '../src/rpg/pro.js';

const bytes = (s) => new TextEncoder().encode(s);

test('checksum primitives match the FIPS 180-4 / RFC 4231 vectors', () => {
  // SHA-256("abc") — FIPS 180-4.
  assert.equal(sha256Hex(bytes('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  // HMAC-SHA256 RFC 4231 Test Case 2 (ASCII key, ASCII data).
  assert.equal(
    hmacSha256Hex('Jefe', 'what do ya want for nothing?'),
    '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
  );
});

test('a minted code validates and rejects a wrong checksum or malformed input', () => {
  const code = mintProCode('A1B2C3D4');
  assert.match(code, /^PG-[0-9A-F]{8}-[0-9A-F]{8}$/);
  assert.equal(isValidProCode(code), true);
  // Case, dashes and surrounding whitespace are tolerated.
  assert.equal(isValidProCode(`  ${code.toLowerCase().replaceAll('-', ' ')}  `), true);
  // A single flipped checksum digit is invalid.
  const wrong = code.slice(0, -1) + (code.endsWith('0') ? '1' : '0');
  assert.equal(isValidProCode(wrong), false);
  assert.equal(isValidProCode('PG-A1B2C3D4-00000000'), false);
  assert.equal(isValidProCode('A1B2C3D4'), false);
  assert.equal(isValidProCode(''), false);
  assert.equal(isValidProCode(null), false);
  assert.equal(isValidProCode(12345678), false);
  // Different payloads mint different checksums (no fixed list is shipped).
  assert.notEqual(proChecksum('A1B2C3D4'), proChecksum('FFFFFFFF'));
});

test('mintProCode requires an 8-hex payload', () => {
  assert.throws(() => mintProCode('zzzzzzzz'));
  assert.throws(() => mintProCode('short'));
});

test('a valid code sets the Pro flag; an invalid code changes nothing', () => {
  const profile = createProfile('scholar');
  const snapshot = JSON.stringify(profile);
  assert.equal(hasPro(profile), false);

  assert.equal(restorePro(profile, 'PG-A1B2C3D4-00000000'), null);
  assert.equal(restorePro(profile, 'nonsense'), null);
  assert.equal(JSON.stringify(profile), snapshot, 'invalid code leaves the profile untouched');

  const unlocked = restorePro(profile, mintProCode('A1B2C3D4'));
  assert.equal(hasPro(unlocked), true);
  // Only the Pro flag changed — every free-feature field is byte-identical.
  assert.deepEqual(unlocked, { ...profile, pro: true });
  assert.equal(unlocked.name, profile.name);
  assert.equal(unlocked.xp, profile.xp);
  assert.equal(unlocked.score, profile.score);
  assert.deepEqual(unlocked.badges, profile.badges);
  assert.deepEqual(unlocked.stats, profile.stats);
  // Idempotent on an already-Pro profile.
  assert.equal(restorePro(unlocked, mintProCode('A1B2C3D4')), unlocked);
});

test('the Pro flag survives export/import and sanitization', () => {
  let p = createProfile('grinder');
  p = restorePro(p, mintProCode('CAFE0001'));
  assert.equal(p.pro, true);

  const back = readBackup(writeBackup(p));
  assert.equal(back.pro, true, 'survives writeBackup/readBackup');
  assert.equal(sanitizeProfile(back).pro, true, 'survives sanitizeProfile');

  const roundTrip = deserialize(serialize(p));
  assert.equal(roundTrip.pro, true, 'survives serialize/deserialize');

  // A legacy backup with no `pro` field stays valid and normalizes to false.
  const legacy = { ...createProfile('grinder') };
  delete legacy.pro;
  assert.equal(readBackup(JSON.stringify(legacy)).pro, undefined);
  assert.equal(sanitizeProfile(readBackup(JSON.stringify(legacy))).pro, false);
});

test('a non-boolean Pro flag is rejected on import and coerced on sanitize', () => {
  const p = createProfile('scholar');
  for (const bad of ['yes', 1, null, {}, []]) {
    assert.throws(() => readBackup(JSON.stringify({ ...p, pro: bad })), /Invalid backup/);
  }
  assert.equal(sanitizeProfile({ ...p, pro: 'yes' }).pro, false);
  assert.equal(sanitizeProfile({ ...p, pro: 1 }).pro, false);
});

test('free features are unchanged: a fresh profile still carries pro=false', () => {
  const p = createProfile('dealer');
  assert.equal(p.pro, false);
  // The flag is inert — nothing in the profile's gameplay fields is affected.
  assert.equal(p.xp, 0);
  assert.equal(p.score, 0);
  assert.deepEqual(p.badges, []);
  assert.equal(hasPro(p), false);
});
