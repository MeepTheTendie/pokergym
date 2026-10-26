import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const URL = 'https://ko-fi.com/playpokergym';
const read = f => readFileSync(new URL_(f), 'utf8');
function URL_(f) { return new globalThis.URL(`../${f}`, import.meta.url); }

test('optional Ko-fi tip link is present with the exact URL, new tab, noopener', () => {
  const index = read('web/index.html');
  const landing = read('web/landing.html');
  const app = read('web/app.js');
  for (const html of [index, landing]) {
    assert.ok(html.includes(`<a href="${URL}" target="_blank" rel="noopener">Support Play Poker Gym ☕</a>`));
  }
  assert.ok(app.includes(`const TIP_URL = '${URL}'`));
  assert.ok(app.includes('href="${TIP_URL}" target="_blank" rel="noopener">Support Play Poker Gym ☕</a>'));
  assert.equal((app.match(/tip\.innerHTML = TIP_HTML/g) || []).length, 2, 'session summary + daily drill');
  assert.match(index, /Play Poker Gym is free\. If it helped, you can tip on Ko-fi/);
});

test('tip link is never precached by the service worker', () => {
  const sw = [read('scripts/build.mjs')].join('\n');
  assert.ok(!sw.includes('ko-fi'));
});

test('landing footer: grouped links, fine print, no personal name or pricing', () => {
  const landing = read('web/landing.html');
  const footer = landing.slice(landing.indexOf('<footer>'), landing.indexOf('</footer>'));
  for (const href of ['/web/', '/web/?daily=1', '#games-heading', 'mailto:meep@mail.grokbot.com', '/web/privacy', URL]) {
    assert.ok(footer.includes(`href="${href}`), `footer links ${href}`);
  }
  assert.match(footer.replace(/<[^>]+>/g, ''), /Free, education only\. No real-money gambling\. Built with AI assistance\./);
  assert.doesNotMatch(footer, /wes|pennock|\$\d|subscri|per month|\/mo\b|pricing/i);
});
