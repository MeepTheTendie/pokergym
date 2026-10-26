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
  await access(path.join(root, 'web/index.html'));
  const headers = await readFile(path.join(root, '_headers'), 'utf8');
  assert.match(headers, /content-security-policy: default-src 'self'; script-src 'self';/);
  assert.match(headers, /x-frame-options: SAMEORIGIN/i);
  assert.match(headers, /x-content-type-options: nosniff/i);
  const landing = await readFile(path.join(root, 'index.html'), 'utf8');
  assert.match(landing, /Play your first hand/);
  assert.match(landing, /href="\/web\/"/);
  assert.doesNotMatch(landing, /http-equiv="refresh"/);
  assert.match(landing, /<script src="\/web\/posthog-loader\.js"><\/script>/);
  assert.match(landing, /data-track="cta_click" data-cta="start_training"/);
  // In-app event names must not be reused for landing clicks (one meaning each).
  assert.doesNotMatch(landing, /data-track="(open_trainer|start_training|start_daily|game_start)"/);
  const loader = await readFile(path.join(root, 'web/posthog-loader.js'), 'utf8');
  assert.match(loader, /PROD_HOSTS/, 'analytics must be limited to the production host');
  assert.match(loader, /playpokergym\.com/);
  // The trainer strips ref/d from the address bar before the SDK finishes
  // loading, so the snapshot has to be taken synchronously, before the SDK
  // script element is created. Reading the URL in onload loses attribution.
  assert.ok(loader.indexOf('var ATTRIBUTION') < loader.indexOf("API_HOST + '/static/array.js'"), 'attribution is snapshotted before the SDK starts loading');
  assert.match(loader, /posthog\.register\(ATTRIBUTION\)/);
  assert.doesNotMatch(loader, /register\(attribution\)/);
  for (const guide of ['weekly-01', 'blackjack', 'jacks-or-better', 'baccarat', 'holdem-best-five']) {
    const html = await readFile(path.join(root, `guides/${guide}/index.html`), 'utf8');
    assert.match(html, /<script src="\/web\/posthog-loader\.js"><\/script>/, `${guide} loads analytics`);
    assert.match(html, /data-track="guide_cta_play"/, `${guide} tracks its play call to action`);
  }
  const worker = await readFile(path.join(root, 'sw.js'), 'utf8');
  assert.match(worker, /pokergym-offline-[a-f0-9]{20}/);
  const assets = JSON.parse(worker.match(/const ASSETS = (\[[^\n]+\]);/)[1]);
  for (const asset of assets) {
    assert.match(asset, /^\/(?:web|src|guides\/weekly-01)\//, 'Only public game files are cached');
    await access(path.join(root, asset.slice(1)));
  }
  for (const asset of ['/web/index.html', '/web/offline.js', '/web/icon-192.png', '/src/rpg/state.js', '/src/coach/videopoker.js', '/guides/weekly-01/index.html', '/guides/weekly-01/score.js', '/guides/weekly-01/offline.js']) {
    assert.ok(assets.includes(asset), `${asset} is available before going offline`);
  }
  assert.ok(!assets.includes('/sw.js'), 'Worker does not cache itself');
});
