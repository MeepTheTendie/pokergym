import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

test('public build contains its module graph without repository or diagnostic files', async () => {
  execFileSync(process.execPath, ['scripts/build.mjs']);
  const root = path.resolve('dist');
  async function check(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      assert.ok(!/^(?:node_modules|\.git|harness.*|shot-.*|character-gallery\.html|.*\.md)$/.test(entry.name), file);
      if (entry.isDirectory()) await check(file);
      else if (entry.name.endsWith('.js')) {
        const source = await readFile(file, 'utf8');
        for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
          const target = path.resolve(path.dirname(file), match[1].split('?')[0]);
          assert.ok(target.startsWith(root + path.sep), target);
          await access(target);
        }
      }
    }
  }
  await check(root);
  await access(path.join(root, 'web/assets/characters-v2.png'));
  await access(path.join(root, 'web/index.html'));
  const landing = await readFile(path.join(root, 'index.html'), 'utf8');
  assert.match(landing, /Play free demo/);
  assert.match(landing, /href="\/web\/"/);
  assert.doesNotMatch(landing, /http-equiv="refresh"/);
  const worker = await readFile(path.join(root, 'sw.js'), 'utf8');
  assert.match(worker, /pokergym-offline-[a-f0-9]{20}/);
  const assets = JSON.parse(worker.match(/const ASSETS = (\[[^\n]+\]);/)[1]);
  for (const asset of assets) {
    assert.match(asset, /^\/(?:web|src)\//, 'Only public game files are cached');
    await access(path.join(root, asset.slice(1)));
  }
  for (const asset of ['/web/index.html', '/web/offline.js', '/web/icon-192.png', '/src/rpg/state.js', '/src/coach/videopoker.js']) {
    assert.ok(assets.includes(asset), `${asset} is available before going offline`);
  }
  assert.ok(!assets.includes('/sw.js'), 'Worker does not cache itself');
});
