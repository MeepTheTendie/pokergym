import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function build(output = path.join(root, 'dist')) {
await mkdir(path.join(output, 'web'), { recursive: true });
// Explicit allowlist: never publish harnesses, screenshots, credentials or node_modules.
const files = ['index.html', 'app.js', 'audio.js', 'sound-controls.js',
  'characters.js', 'world.js', 'sprites.js', 'gbc.css', 'manifest.webmanifest',
  'icon.svg', 'icon-maskable.svg', 'offline.js', 'feedback.js'];
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
await cp(path.join(root, 'web/landing.html'), path.join(output, 'index.html'));
await cp(path.join(root, 'public/sitemap.xml'), path.join(output, 'sitemap.xml'));
await cp(path.join(root, 'public/guides'), path.join(output, 'guides'), { recursive: true });
const assets = [];
async function collect(folder) {
  for (const entry of await readdir(path.join(output, folder), { withFileTypes: true })) {
    const relative = `${folder}/${entry.name}`;
    if (entry.isDirectory()) await collect(relative);
    else if (relative !== 'web/sw.js') assets.push(`/${relative}`);
  }
}
await collect('web');
await collect('src');
assets.sort();
const hash = createHash('sha256');
const template = await readFile(path.join(root, 'scripts/offline-worker.js'), 'utf8');
hash.update(template);
for (const asset of assets) {
  hash.update(asset);
  hash.update(await readFile(path.join(output, asset.slice(1))));
}
await writeFile(path.join(output, 'web/sw.js'), template
  .replace('__VERSION__', hash.digest('hex').slice(0, 20))
  .replace('__ASSETS__', JSON.stringify(assets)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await build();
  console.log('Built public demo in dist: game assets and strategy modules only.');
}
