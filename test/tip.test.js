import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const URL = 'https://ko-fi.com/playpokergym';
const read = f => readFileSync(new URL_(f), 'utf8');
function URL_(f) { return new globalThis.URL(`../${f}`, import.meta.url); }

test('optional Ko-fi tip link is present with the exact URL, new tab, noopener', () => {
  const index = read('web/index.html');
  const app = read('web/app.js');
  // The landing footer line was removed in fe6c6a3 (landing footer cleanup);
  // the trainer menu and summaries still carry the tip link.
  assert.ok(index.includes(`<a href="${URL}" target="_blank" rel="noopener">Support Poker Gym ☕</a>`));
  assert.ok(app.includes(`const TIP_URL = '${URL}'`));
  assert.ok(app.includes('href="${TIP_URL}" target="_blank" rel="noopener">Support Poker Gym ☕</a>'));
  assert.equal((app.match(/tip\.innerHTML = TIP_HTML/g) || []).length, 2, 'session summary + daily drill');
  assert.match(index, /Poker Gym is free\. If it helped, you can tip on Ko-fi/);
});

test('tip link is never precached by the service worker', () => {
  const sw = [read('scripts/build.mjs')].join('\n');
  assert.ok(!sw.includes('ko-fi'));
});
