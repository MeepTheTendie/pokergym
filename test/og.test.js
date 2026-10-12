import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from '../scripts/build.mjs';

const SITE = 'https://pokergym.history-atlas.workers.dev';
const REQUIRED = ['og:title', 'og:description', 'og:url', 'og:type', 'og:image', 'og:image:width',
  'og:image:height', 'og:image:alt', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];

function metaMap(html) {
  const map = {};
  for (const m of html.matchAll(/<meta\s+(?:property|name)="([^"]+)"\s+content="([^"]*)"/g)) {
    assert.ok(!(m[1] in map), `${m[1]} is not duplicated`);
    map[m[1]] = m[2];
  }
  return map;
}

test('og.png is served at the root, 1200x630, and never precached', async () => {
  const out = await mkdtemp(path.join(tmpdir(), 'pokergym-og-build-'));
  try {
    await build(out);
    const png = await readFile(path.join(out, 'og.png'));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
    const worker = await readFile(path.join(out, 'sw.js'), 'utf8');
    const assets = JSON.parse(worker.match(/const ASSETS = (\[[^\n]+\]);/)[1]);
    assert.ok(!assets.some(a => /og\.png$/.test(a)), 'OG image is not in the service-worker precache');
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

for (const [file, url, title] of [['web/landing.html', `${SITE}/`, null], ['web/index.html', `${SITE}/web/`, 'Poker Gym — free card-game trainer']]) {
  test(`${file} carries a full set of link-preview tags with absolute URLs`, async () => {
    const html = await readFile(file, 'utf8');
    const meta = metaMap(html);
    for (const key of REQUIRED) assert.ok(meta[key], `${file} has ${key}`);
    assert.equal(meta['og:url'], url);
    assert.equal(meta['og:image'], `${SITE}/og.png`);
    assert.equal(meta['twitter:image'], `${SITE}/og.png`);
    assert.equal(meta['og:image:width'], '1200');
    assert.equal(meta['og:image:height'], '630');
    assert.equal(meta['twitter:card'], 'summary_large_image');
    assert.match(html, new RegExp(`<link rel="canonical" href="${url}">`));
    if (title) assert.match(html, new RegExp(`<title>${title}</title>`));
    assert.doesNotMatch(meta.description ?? '', /RPG|gym badge/i);
  });
}
