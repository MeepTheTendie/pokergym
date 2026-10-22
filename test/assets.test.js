import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

// Files in web/assets/ that are intentionally not referenced by published code.
// Keep this list short and documented.
const EXCEPTIONS = new Set([
  // Badge icons are loaded dynamically: `assets/badge-${suit}.png` in web/app.js:733
  'badge-club.png',
  'badge-diamond.png',
  'badge-heart.png',
  'badge-spade.png',
]);

test('every published asset in web/assets/ is referenced by published code', async () => {
  const assetsDir = path.join(root, 'web', 'assets');
  const entries = await readdir(assetsDir);
  const publishedAssets = entries.filter(f => /\.(png|webp|svg|woff2|jpg|jpeg)$/i.test(f));

  // Gather all published source text that could reference an asset.
  const sources = [];
  for (const file of ['index.html', 'landing.html', 'app.js', 'audio.js', 'characters.js',
    'feedback.js', 'haptics.js', 'offline.js', 'posthog-loader.js', 'sound-controls.js',
    'styles.css']) {
    try { sources.push(await readFile(path.join(root, 'web', file), 'utf8')); } catch {}
  }

  const unreferenced = [];
  for (const asset of publishedAssets) {
    if (EXCEPTIONS.has(asset)) continue;
    const referenced = sources.some(src => src.includes(asset));
    if (!referenced) unreferenced.push(asset);
  }

  assert.deepEqual(unreferenced, [],
    `Unreferenced assets in web/assets/: ${unreferenced.join(', ')}. ` +
    'Either remove them or add them to EXCEPTIONS with a reason.');
});
