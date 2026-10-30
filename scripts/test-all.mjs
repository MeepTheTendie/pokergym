// npm run test:all — unit + release tests, then the headless browser checks.
// CI also runs named groups in parallel; the group argument selects a subset.
// Browser checks spawn `chromium`; if only Chrome is installed we put a
// `chromium` shim on PATH. Each check runs with a timeout and the run fails
// if any step fails.
import { spawnSync, spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const steps = [
  ['unit', ['scripts/run-tests.mjs', 'test'], { browser: false }],
  ['release', ['scripts/run-tests.mjs', 'test/release', '--recursive'], { browser: false }],
  ['analytics (browser)', ['scripts/analytics-browser-test.mjs'], { serve: true }],
  ['reminder (browser)', ['scripts/reminder-browser-test.mjs']],
  ['push (browser)', ['scripts/push-browser-test.mjs']],
  ['itch embed (browser)', ['scripts/itch-browser-test.mjs']],
  ['offline (browser)', ['scripts/itch-browser-test.mjs'], { env: { POKERGYM_OFFLINE_TEST: '1' } }],
  ['storage denied (browser)', ['scripts/itch-browser-test.mjs'], { env: { POKERGYM_STORAGE_TEST: 'denied' } }],
  ['storage quota (browser)', ['scripts/itch-browser-test.mjs'], { env: { POKERGYM_STORAGE_TEST: 'quota' } }],
];

const groups = {
  all: null,
  'unit-release': ['unit', 'release'],
  'browser-core': ['analytics (browser)', 'reminder (browser)', 'push (browser)'],
  'browser-offline': ['itch embed (browser)', 'offline (browser)'],
  'browser-storage': ['storage denied (browser)', 'storage quota (browser)'],
};
const group = process.argv[2] ?? 'all';
const names = groups[group];
if (names === undefined) {
  console.error(`test:all: unknown group "${group}". Use one of: ${Object.keys(groups).join(', ')}.`);
  process.exit(1);
}
const selected = names === null ? steps : steps.filter(([name]) => names.includes(name));
if (!selected.length) {
  console.error(`test:all: group "${group}" selected no steps.`);
  process.exit(1);
}

const which = (b) => { try { return execFileSync('which', [b], { encoding: 'utf8' }).trim(); } catch { return null; } };
const env = { ...process.env };
const needsChromium = selected.some(([, , opts = {}]) => opts.browser !== false);
if (needsChromium && !which('chromium')) {
  const chrome = which('google-chrome') || which('chromium-browser') || which('google-chrome-stable');
  if (!chrome) { console.error(`test:${group}: no chromium/chrome found; browser checks cannot run.`); process.exit(1); }
  const shim = mkdtempSync(path.join(tmpdir(), 'pg-chromium-'));
  symlinkSync(chrome, path.join(shim, 'chromium'));
  env.PATH = `${shim}:${env.PATH}`;
}

// Node 20 needs a flag for the global WebSocket the browser checks use.
const nodeFlags = typeof WebSocket === 'undefined' ? ['--experimental-websocket'] : [];
const results = [];
for (const [name, args, opts = {}] of selected) {
  let server;
  if (opts.serve) {
    server = spawn('python3', ['-m', 'http.server', '8899', '--bind', '127.0.0.1'], { stdio: 'ignore' });
    await sleep(800);
  }
  const t = Date.now();
  const r = spawnSync(process.execPath, [...nodeFlags, ...args], { stdio: 'inherit', env: { ...env, ...(opts.env ?? {}) }, timeout: 300_000 });
  server?.kill();
  results.push([name, r.status === 0 ? 'PASS' : `FAIL (${r.status ?? r.signal})`, ((Date.now() - t) / 1000).toFixed(1)]);
}
console.log(`\ntest:${group} summary`);
for (const [n, s, secs] of results) console.log(`  ${s.padEnd(12)} ${n} (${secs}s)`);
process.exit(results.every((r) => r[1] === 'PASS') ? 0 : 1);
