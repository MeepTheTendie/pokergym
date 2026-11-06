import test from 'node:test';
import assert from 'node:assert/strict';
import { GUIDES, localLinks, localStylesheet } from '../scripts/portable-links.mjs';

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

test('portable links cover the shared site header, footer, stylesheet and fonts', () => {
  const html = [
    '<link rel="preload" href="/web/fonts/Inter-var.woff2" as="font">',
    '<link rel="stylesheet" href="/web/site.css">',
    '<a href="/web/">trainer</a>',
    '<a href="/web/?daily=1">drill</a>',
  ].join('');
  const out = localLinks(html);
  assert.match(out, /href="fonts\/Inter-var\.woff2"/);
  assert.match(out, /href="site\.css"/);
  assert.match(out, /href="index\.html"/);
  assert.match(out, /href="index\.html\?daily=1"/);
  assert.equal(localStylesheet('src:url(/web/fonts/Inter-var.woff2)'), 'src:url(fonts/Inter-var.woff2)');
});

test('every page in the itch bundle keeps only local same-site links', async () => {
  const { readFile } = await import('node:fs/promises');
  const read = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8');
  const pages = {
    'web/index.html': await read('web/index.html'),
    'web/privacy.html': await read('web/privacy.html'),
  };
  for (const guide of GUIDES) pages[guide] = await read(`public/guides/${guide}/index.html`);
  for (const [name, html] of Object.entries(pages)) {
    const out = localLinks(html);
    assert.doesNotMatch(out, /(?:href|src)="\/(?!\/)/, `${name} has an absolute site link after localLinks`);
  }
  const css = localStylesheet(await read('web/site.css'));
  assert.doesNotMatch(css, /url\(\//, 'bundled site.css loads fonts relatively');
});
