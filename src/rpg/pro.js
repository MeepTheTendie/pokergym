// Gym Pro unlock codes (Ko-fi). Fully offline: no network call, no account, no
// server secret. A player pastes a code, it is validated locally, and a Pro
// flag is set on the existing save so it survives export and import.
//
// A valid code is a short payload plus an HMAC-SHA256 checksum over it, so we
// never ship a list of valid codes — only the format and the checksum key. The
// key below is bundled with the client and is deliberately NOT a secret (the
// task forbids server secrets and requires offline validation). It is a
// "pepper" that stops typos and casual guessing. It is not DRM: anyone who
// reads the client source can mint a code. That is accepted for this checksum
// gate; real entitlement enforcement, if ever needed, is a later decision.
//
// No new dependencies: SHA-256 and HMAC-SHA256 are implemented here in a few
// dozen lines and verified against the RFC 4231 test vectors in
// test/pro.test.js.

// Non-secret checksum pepper (see the note above). Not a credential.
const PRO_CODE_KEY = 'pokergym:gym-pro:2026-11';

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const rotr = (x, n) => (x >>> n) | (x << (32 - n));
const toBytes = (text) => new TextEncoder().encode(text);
const bytesToHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const hexToBytes = (hex) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

function sha256Hex(bytes) {
  const l = bytes.length;
  const bitLen = BigInt(l) * 8n;
  const bitLenHi = Number((bitLen >> 32n) & 0xffffffffn);
  const bitLenLo = Number(bitLen & 0xffffffffn);
  const withOne = l + 1;
  const total = withOne + 8 + ((64 - ((withOne + 8) % 64)) % 64);
  const padded = new Uint8Array(total);
  padded.set(bytes);
  padded[l] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(total - 8, bitLenHi);
  dv.setUint32(total - 4, bitLenLo);

  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Uint32Array(64);
  for (let i = 0; i < total; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map((x) => x.toString(16).padStart(8, '0')).join('');
}

function hmacSha256Hex(key, message) {
  const blockSize = 64;
  let keyBytes = toBytes(key);
  if (keyBytes.length > blockSize) keyBytes = hexToBytes(sha256Hex(keyBytes));
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) { ipad[i] = 0x36; opad[i] = 0x5c; }
  for (let i = 0; i < keyBytes.length; i++) { ipad[i] ^= keyBytes[i]; opad[i] ^= keyBytes[i]; }
  const messageBytes = toBytes(message);
  const inner = new Uint8Array(blockSize + messageBytes.length);
  inner.set(ipad); inner.set(messageBytes, blockSize);
  const outer = new Uint8Array(blockSize + 32);
  outer.set(opad); outer.set(hexToBytes(sha256Hex(inner)), blockSize);
  return sha256Hex(outer);
}

// The redeem code format: PG-<8 hex payload>-<8 hex checksum>. The checksum is
// the first 8 hex chars of HMAC-SHA256(PRO_CODE_KEY, "pokergym:pro:" + payload).
const CODE_RE = /^PG([0-9A-F]{8})([0-9A-F]{8})$/;

// Collapses case, dashes and whitespace so a player can type the code however
// they like. Returns { payload, checksum } or null when the shape is wrong.
function normalizeProCode(code) {
  if (typeof code !== 'string') return null;
  const cleaned = code.toUpperCase().replace(/[\s-]/g, '');
  const m = CODE_RE.exec(cleaned);
  return m ? { payload: m[1], checksum: m[2] } : null;
}

// The checksum for a given 8-hex payload, upper-cased.
export function proChecksum(payload) {
  return hmacSha256Hex(PRO_CODE_KEY, `pokergym:pro:${payload}`).slice(0, 8).toUpperCase();
}

// True when `code` is a well-formed code whose checksum matches its payload.
export function isValidProCode(code) {
  const parts = normalizeProCode(code);
  if (!parts) return false;
  return parts.checksum === proChecksum(parts.payload);
}

// Mints a redeemable code for an 8-hex payload. Used by the seller (Ko-fi) and
// by tests; it ships no list of valid codes.
export function mintProCode(payload) {
  const p = String(payload).toUpperCase().replace(/[\s-]/g, '');
  if (!/^[0-9A-F]{8}$/.test(p)) throw new Error('payload must be 8 hex characters');
  return `PG-${p}-${proChecksum(p)}`;
}

export function hasPro(profile) {
  return Boolean(profile && profile.pro === true);
}

// The "Restore Pro" entry point. Given a valid code, returns the profile with
// its Pro flag set; given an invalid code, returns null and leaves the caller's
// profile untouched. Idempotent: an already-Pro profile is returned unchanged.
export function restorePro(profile, code) {
  if (!profile || typeof profile !== 'object') return null;
  if (!isValidProCode(code)) return null;
  if (profile.pro === true) return profile;
  return { ...profile, pro: true };
}

export { sha256Hex, hmacSha256Hex };
