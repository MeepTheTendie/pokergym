import test from 'node:test';
import assert from 'node:assert/strict';
import { GUIDES, localLinks } from '../scripts/portable-links.mjs';

test('portable links rewrite absolute paths into flat offline filenames', () => {
  const html = [
    '<a href="/guides/blackjack/">blackjack</a>',
    '<a href="/guides/weekly-01/">weekly</a>',
    '<a href="/web/?practice=holdem">play</a>',
    '<a href="/web/privacy">privacy</a>',
    '<a href="/web/icon.svg">icon</a>',
    '<a href="/">home</a>',
  ].join('');
  const out = localLinks(html);
  assert.match(out, /href="guide-blackjack\.html"/);
  assert.match(out, /href="weekly-sample\.html"/);
  assert.match(out, /href="index\.html\?practice=holdem"/);
  assert.match(out, /href="privacy\.html"/);
  assert.match(out, /href="icon\.svg"/);
  assert.match(out, /href="index\.html"/);
});

test('portable bundle drops the first-party analytics loader', () => {
  const html = '<p>x</p><script src="/web/posthog-loader.js"></script></body>';
  const out = localLinks(html);
  assert.doesNotMatch(out, /posthog/i);
  assert.match(out, /<p>x<\/p><\/body>/);
});

test('portable bundle exposes every bundled guide and rejects unknown ones', () => {
  for (const guide of GUIDES) {
    assert.match(localLinks(`<a href="/guides/${guide}/">x</a>`), new RegExp(`href="guide-${guide}\\.html"`));
  }
  assert.throws(() => localLinks('<a href="/guides/unknown/">x</a>'), /Unbundled guide: unknown/);
});
