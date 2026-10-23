import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { headersFileText } from '../worker/security.js';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function build(output = path.join(root, 'dist')) {
await mkdir(path.join(output, 'web'), { recursive: true });
// Clean stale assets from previous builds so removed files don't linger.
const { rm } = await import('node:fs/promises');
await rm(path.join(output, 'web'), { recursive: true, force: true });
await rm(path.join(output, 'src'), { recursive: true, force: true });
await rm(path.join(output, 'guides'), { recursive: true, force: true });
await mkdir(path.join(output, 'web'), { recursive: true });
// Explicit allowlist: never publish harnesses, screenshots, credentials or node_modules.
const files = ['index.html', 'app.js', 'audio.js', 'sound-controls.js', 'haptics.js', 'vp-coach-worker.js',
  'characters.js', 'styles.css', 'manifest.webmanifest',
  'icon.svg', 'icon-maskable.svg', 'offline.js', 'feedback.js', 'privacy.html',
  'posthog-loader.js'];
for (const file of files) await cp(path.join(root, 'web', file), path.join(output, 'web', file));
for (const folder of ['assets', 'fonts']) {
  await mkdir(path.join(output, 'web', folder), { recursive: true });
  for (const entry of await readdir(path.join(root, 'web', folder))) {
    if (/\.(png|woff2)$/.test(entry)) await cp(path.join(root, 'web', folder, entry), path.join(output, 'web', folder, entry));
  }
}
for (const entry of await readdir(path.join(root, 'web'))) {
  if (/^icon-(?:192|512|maskable-512)\.png$/.test(entry)) await cp(path.join(root, 'web', entry), path.join(output, 'web', entry));
}
await cp(path.join(root, 'src'), path.join(output, 'src'), { recursive: true });

// Optional: compile the verified Bend reference (src/evaluate.bend) into the
// build output when the bend toolchain is available. The app keeps using the
// JavaScript implementation; this artifact is for verification and future use.
try {
  const { spawnSync } = await import('node:child_process');
  const bend = process.env.BEND_BIN || 'bend';
  const probe = spawnSync(bend, ['--help'], { encoding: 'utf8' });
  if (probe.status === 0) {
    const compiled = path.join(output, 'src', 'evaluate.mjs');
    const r = spawnSync(bend, [path.join(root, 'src', 'evaluate.bend'), '-o', compiled], { encoding: 'utf8' });
    if (r.status !== 0) console.warn('Bend compile skipped:', (r.stderr || r.stdout || '').trim());
  }
} catch (e) {
  console.warn('Bend compile skipped:', e?.message ?? e);
}

await cp(path.join(root, 'web/landing.html'), path.join(output, 'index.html'));
await cp(path.join(root, 'public/sitemap.xml'), path.join(output, 'sitemap.xml'));
await cp(path.join(root, 'public/robots.txt'), path.join(output, 'robots.txt'));
await cp(path.join(root, 'public/guides'), path.join(output, 'guides'), { recursive: true });
// Link-preview image: served only at the site root (/og.png). It is not in the
// web/ allowlist above, so it never lands in dist/web/; the ASSETS filter below
// also excludes it by name so a 1200x630 image is never precached by the worker.
await cp(path.join(root, 'web/og.png'), path.join(output, 'og.png'));
await cp(path.join(root, 'web/mascot.webp'), path.join(output, 'mascot.webp'));
await cp(path.join(root, 'web/coach-shot.webp'), path.join(output, 'coach-shot.webp'));
const NOT_PRECACHED = new Set(['/web/sw.js', '/web/og.png', '/og.png']);
const assets = [];
async function collect(folder) {
  for (const entry of await readdir(path.join(output, folder), { withFileTypes: true })) {
    const relative = `${folder}/${entry.name}`;
    if (entry.isDirectory()) await collect(relative);
    else if (!NOT_PRECACHED.has(`/${relative}`)) assets.push(`/${relative}`);
  }
}
await collect('web');
await collect('src');
await collect('guides/weekly-01');
assets.sort();
const hash = createHash('sha256');
const template = await readFile(path.join(root, 'scripts/offline-worker.js'), 'utf8');
hash.update(template);
for (const asset of assets) {
  hash.update(asset);
  hash.update(await readFile(path.join(output, asset.slice(1))));
}
// The worker lives at the site root so its scope covers both /web/ and /src/;
// a worker under /web/ cannot intercept the module assets that /web/index.html
// imports from /src/.
await writeFile(path.join(output, 'sw.js'), template
  .replace('__VERSION__', hash.digest('hex').slice(0, 20))
  .replace('__ASSETS__', JSON.stringify(assets)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await build();
  // Written only for the deployed build; the itch ZIP and test builds reuse the
  // same module graph without shipping a _headers file.
  await writeFile(path.join(root, 'dist', '_headers'), headersFileText());
  console.log('Built public demo in dist: game assets and strategy modules only.');
}
