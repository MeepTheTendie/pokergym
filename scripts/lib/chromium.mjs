// Reliable launch of the system Chromium for the headless browser tests.
//
// The old harness spawned `chromium`, ignored the child, waited a fixed 20 s
// and then failed with `assert.ok(page, 'Chromium available')`. On a cold CI
// runner that message was indistinguishable from a real app failure and there
// was no retry: one slow or crashed browser start failed the job. This helper
// watches the child, retries a bounded number of launches, uses a free port,
// and reports the browser's own stderr plus its exit status when it gives up.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const CANDIDATES = ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable', 'chrome', 'msedge'];

let cachedExecutable;

// Resolve the browser once per process. CHROME_BIN wins so CI and local
// machines can point at an exact binary without editing scripts.
export function findChromium() {
  if (cachedExecutable !== undefined) return cachedExecutable;
  if (process.env.CHROME_BIN) return (cachedExecutable = process.env.CHROME_BIN);
  const which = process.platform === 'win32' ? 'where' : 'which';
  for (const name of CANDIDATES) {
    try {
      const found = execFileSync(which, [name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
        .split(/\r?\n/).map(line => line.trim()).find(Boolean);
      if (found) return (cachedExecutable = found);
    } catch { /* try the next name */ }
  }
  return (cachedExecutable = null);
}

// Let the OS pick an unused port. The tests used to hardcode one port per
// script, which makes back-to-back runs in the same job depend on the previous
// browser having released its listener.
async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

class BrowserExit extends Error {
  constructor(code, signal, output) {
    super(`Chromium exited before its DevTools page was ready (code ${code}, signal ${signal})`);
    this.output = output;
  }
}

// Resolve with the first page target exposed by the DevTools endpoint. Throws
// as soon as the browser process exits so a crash is reported immediately
// instead of after the whole timeout.
async function waitForPage(port, { deadline, chrome, output }) {
  while (Date.now() < deadline) {
    if (chrome.exitCode !== null || chrome.signalCode !== null) {
      throw new BrowserExit(chrome.exitCode, chrome.signalCode, output.text);
    }
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(2000) })).json();
      const page = targets.find(target => target.type === 'page');
      if (page?.webSocketDebuggerUrl) return page;
    } catch { /* endpoint not up yet */ }
    await sleep(100);
  }
  return null;
}

function collect(stream, sink) {
  stream?.setEncoding('utf8');
  stream?.on('data', chunk => {
    sink.text = (sink.text + chunk).slice(-8000);
  });
}

function killAndWait(chrome) {
  return new Promise(resolve => {
    if (chrome.exitCode !== null || chrome.signalCode !== null) return resolve();
    const done = () => resolve();
    chrome.once('exit', done);
    if (chrome.exitCode !== null || chrome.signalCode !== null) return done();
    try { chrome.kill('SIGTERM'); } catch { done(); }
    setTimeout(() => {
      if (chrome.exitCode === null && chrome.signalCode === null) {
        try { chrome.kill('SIGKILL'); } catch {}
        setTimeout(done, 500);
      }
    }, 5000).unref();
  });
}

/**
 * Launch headless Chromium and wait until it exposes a page target.
 *
 * @param {object} [options]
 * @param {string} [options.profileDir] user-data-dir; a temp dir is created per
 *   attempt when omitted. The caller still owns the directory.
 * @param {string[]} [options.extraArgs] flags added before the debugging args.
 * @param {number} [options.timeoutMs] per-attempt budget for a page target.
 * @param {number} [options.attempts] launch attempts, never unbounded.
 */
export async function launchChromium({ profileDir, extraArgs = [], timeoutMs = 30_000, attempts = 2 } = {}) {
  const executable = findChromium();
  if (!executable) {
    throw new Error('No Chromium or Chrome found. Install one or set CHROME_BIN to its full path.');
  }

  const failures = [];
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const port = await freePort();
    const output = { text: '' };
    const dir = profileDir ?? await mkdtemp(path.join(tmpdir(), 'pokergym-chrome-'));
    const started = Date.now();
    const chrome = spawn(executable, [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--no-first-run', '--no-default-browser-check',
      ...extraArgs,
      `--user-data-dir=${dir}`,
      `--remote-debugging-port=${port}`,
      'about:blank',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    collect(chrome.stdout, output);
    collect(chrome.stderr, output);

    try {
      const page = await waitForPage(port, { deadline: started + timeoutMs, chrome, output });
      if (!page) throw new Error(`Chromium did not expose a page target within ${timeoutMs} ms`);
      return {
        chrome,
        page,
        port,
        profileDir: dir,
        close: () => killAndWait(chrome),
      };
    } catch (error) {
      const details = error instanceof BrowserExit ? `${error.message}\n${error.output}` : error.message;
      failures.push(`attempt ${attempt}/${attempts}: ${details}\n${output.text}`.trim());
      await killAndWait(chrome);
    }
  }

  throw new Error(
    `Chromium failed to start after ${attempts} attempt(s). Executable: ${executable}\n` +
    failures.map(failure => `--- ${failure}`).join('\n'),
  );
}
