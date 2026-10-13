import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

// Fresh isolated profile; never inspect the owner's browser or account data.
// Live check: the canonical domain by default; POKERGYM_INSTALL_URL may point at
// https://pokergym.history-atlas.workers.dev/web/ (still served) before the domain is live.
const url = process.env.POKERGYM_INSTALL_URL ?? 'https://playpokergym.com/web/';
const temp = await mkdtemp(path.join(tmpdir(), 'pokergym-install-test-'));
const browser = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  `--user-data-dir=${temp}`, '--remote-debugging-port=19398', 'about:blank'], { stdio: 'ignore' });
let ws;
try {
  let page;
  for (let i = 0; i < 100 && !page; i++) {
    try { page = (await (await fetch('http://127.0.0.1:19398/json/list')).json()).find(t => t.type === 'page'); } catch {}
    if (!page) await sleep(100);
  }
  assert.ok(page, 'Isolated Chromium started');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(resolve => { ws.onopen = resolve; });
  let id = 0;
  const pending = new Map(), errors = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (request) {
      pending.delete(message.id);
      clearTimeout(request.timeout);
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    const timeout = setTimeout(() => {
      pending.delete(next); reject(new Error(`Timed out: ${method}`));
    }, 15000);
    pending.set(next, { resolve, reject, timeout });
    ws.send(JSON.stringify({ id: next, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.equal(result.exceptionDetails, undefined, 'Browser evaluation succeeded');
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let i = 0; i < 200; i++) {
      if (await evaluate(expression)) return;
      await sleep(100);
    }
    throw new Error(`Timed out: ${expression}`);
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url });
  await waitFor('Boolean(document.getElementById("btnNew")?.onclick) && Boolean(navigator.serviceWorker.controller)');
  const manifest = await send('Page.getAppManifest');
  assert.deepEqual(manifest.errors, [], 'Chromium parses manifest without warnings');
  const data = JSON.parse(manifest.data);
  assert.equal(data.display, 'standalone');
  const start = new URL(data.start_url, manifest.url);
  assert.equal(start.origin, new URL(url).origin);
  assert.ok(start.pathname.startsWith(new URL(data.scope, manifest.url).pathname));
  for (const icon of data.icons) {
    const dimensions = await evaluate(`(async () => {
      const response = await fetch(${JSON.stringify(new URL(icon.src, manifest.url).href)});
      if (!response.ok || !response.headers.get('content-type')?.includes('image/png')) return null;
      const bitmap = await createImageBitmap(await response.blob());
      return bitmap.width + 'x' + bitmap.height;
    })()`);
    assert.equal(dimensions, icon.sizes, 'Actual PNG dimensions match manifest');
  }
  const installability = await send('Page.getInstallabilityErrors');
  assert.deepEqual(installability.installabilityErrors, [], 'Chromium reports no installability errors');
  await evaluate('document.getElementById("btnNew").click(); document.querySelector(".class-card").click(); document.getElementById("btnBecome").click()');
  const save = await evaluate('localStorage.getItem("pokergym:save:v1")');
  assert.ok(save, 'Trainer save exists');
  // Navigate to the exact manifest entry offline; this does not install an app.
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await send('Page.navigate', { url: 'about:blank' });
  await send('Page.navigate', { url: start.href });
  await waitFor('Boolean(document.getElementById("btnContinue")?.onclick)');
  assert.equal(await evaluate('localStorage.getItem("pokergym:save:v1")'), save, 'Offline launch preserves save');
  assert.equal(await evaluate('document.getElementById("btnContinue").disabled'), false);
  await evaluate('document.getElementById("btnContinue").click()');
  assert.equal(await evaluate('document.getElementById("scr-map").hidden'), false, 'Offline manifest entry reaches map');
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Start screen fits phone width');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), url, chromium: execFileSync('chromium', ['--version'], { encoding: 'utf8' }).trim(), manifestUrl: manifest.url, startUrl: start.href, icons: data.icons.length, installabilityErrors: [], offlineStartUrlSaveResume: 'passed', physicalAndroidInstallation: 'unverified' }, null, 2));
} finally {
  ws?.close(); browser.kill('SIGTERM');
  await new Promise(resolve => browser.exitCode !== null ? resolve() : browser.once('exit', resolve));
  await rm(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
