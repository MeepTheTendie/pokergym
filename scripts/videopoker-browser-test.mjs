// Video-poker table/coaching regression checks in isolated mobile Chromium.
// Serve the repo, then: node scripts/videopoker-browser-test.mjs [trainer URL]
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 9336;
const BASE = process.argv[2] ?? 'http://127.0.0.1:8899/web/';
const profilePath = await mkdtemp(path.join(tmpdir(), 'pokergym-analytics-'));
const chrome = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--window-size=390,844', `--user-data-dir=${profilePath}`, `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });

let ws;
try {
let msgId = 0; const pending = new Map();
const send = (method, params = {}) => { const id = ++msgId; ws.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => pending.set(id, { res, rej })); };
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval error');
  return r.result.value;
};
let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) {
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {}
  if (!wsUrl) await sleep(250);
}
ws = new WebSocket(wsUrl);
await new Promise((r) => { ws.onopen = r; });
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
// Keep synthetic production checks out of the real-player report.
await send('Network.enable');
await send('Network.setBlockedURLs', { urls: ['*/ingest/*'] });
const runtimeErrors = [];
const handleMessage = ws.onmessage;
ws.onmessage = event => {
  handleMessage(event);
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
};
// Capture every trackEvent call; the loader's no-op assignment off the
// production host is ignored. Events survive reloads via sessionStorage.
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  (() => {
    if (!/^https?:$/.test(location.protocol)) return;
    const log = JSON.parse(sessionStorage.getItem('__events') || '[]');
    window.__events = log;
    const sink = (name, props) => { log.push([name, props || {}]); sessionStorage.setItem('__events', JSON.stringify(log)); };
    Object.defineProperty(window, 'trackEvent', { get: () => sink, set: () => {}, configurable: false });
  })();` });

async function open(url, { fresh = true } = {}) {
  await send('Page.navigate', { url: 'about:blank' });
  await sleep(100);
  await send('Page.navigate', { url: BASE });
  await sleep(300);
  if (fresh) await evaluate('localStorage.clear(); sessionStorage.clear(); true');
  else await evaluate('sessionStorage.clear(); true');
  await send('Page.navigate', { url });
  for (let i = 0; i < 100; i++) {
    await sleep(100);
    if (await evaluate("Boolean(document.getElementById('btnNew')?.onclick)").catch(() => false)) break;
  }
  await sleep(200);
}

const helpers = `
  window.$ = (id) => document.getElementById(id);
  window.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  window.drain = async () => { let g = 0; while (!$('scr-lesson').hidden && g++ < 80) { $('lessonBox').click(); await wait(40); } };
  // Play without the coach (a coached hand does not count toward a session):
  // stand, bet banker, draw, or pick the first five cards, whatever is offered.
  const usable = (id) => $(id) && !$(id).hidden && !$(id).disabled && $(id).offsetParent !== null;
  window.finishHand = async () => {
    let g = 0;
    while (!$('scr-battle').hidden && $('battleEndRow').hidden && g++ < 40) {
      const bet = [...$('rowBet').querySelectorAll('button')].find((b) => !b.disabled && b.offsetParent !== null);
      if (bet) bet.click();
      else if (usable('btnStand')) $('btnStand').click();
      else if (usable('btnDraw')) $('btnDraw').click();
      else if (usable('btnConfirm') || ($('btnConfirm') && !$('btnConfirm').hidden && $('btnConfirm').offsetParent !== null)) {
        for (const c of document.querySelectorAll('#zones .card')) { if ($('btnConfirm').disabled) { c.click(); await wait(5); } }
        $('btnConfirm').click();
      } else if (usable('btnDeal')) $('btnDeal').click();
      await wait(20);
    }
    return !$('battleEndRow').hidden;
  };
  window.playHands = async (n) => {
    for (let i = 0; i < n; i++) {
      await drain();
      if (!(await finishHand())) throw new Error('hand ' + i + ' did not settle');
      if (i < n - 1) { $('btnNext').click(); await wait(60); }
    }
  };
  true`;
const run = (body) => evaluate(`(async () => { ${helpers}; ${body} })()`);
const events = () => evaluate('window.__events');

// Queue worker replies so old-table answers can deliberately arrive last.
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  const NativeWorker = window.Worker;
  window.__vpReplies = [];
  window.__vpJobs = [];
  window.Worker = class extends EventTarget {
    constructor(url, options) {
      super();
      this.worker = new NativeWorker(url, options);
      this.worker.onmessage = event => window.__vpReplies.push({ target: this, data: event.data });
    }
    postMessage(data) { window.__vpJobs.push(data); this.worker.postMessage(data); }
  };
  window.releaseVp = index => {
    const reply = window.__vpReplies[index];
    reply.target.dispatchEvent(new MessageEvent('message', { data: reply.data }));
  };
` });
async function waitFor(expression) {
  for (let i = 0; i < 300; i++) {
    if (await evaluate(expression)) return;
    await sleep(100);
  }
  throw new Error('Timed out: ' + expression);
}
await open(BASE + '?practice=videopoker');
await waitFor('window.__vpReplies.length === 1');
await evaluate('releaseVp(0)');
const original = await evaluate('window.__vpJobs[0].variantId');
const changed = await evaluate(`(() => {
  const select = document.getElementById('variantSelect');
  select.value = [...select.options].find(option => option.value !== select.value).value;
  select.dispatchEvent(new Event('change'));
  return select.value;
})()`);
assert.notEqual(changed, original);
await waitFor('window.__vpReplies.length === 2');
assert.equal(await evaluate('window.__vpJobs[1].variantId'), changed, 'Changing tables recomputes coach');
// Switch back before releasing the second reply; deliver newest, then stale.
await evaluate(`(() => {
  const select = document.getElementById('variantSelect');
  select.value = window.__vpJobs[0].variantId;
  select.dispatchEvent(new Event('change'));
})()`);
await waitFor('window.__vpReplies.length === 3');
await evaluate('document.getElementById("btnAsk").click()');
const expected = await evaluate('window.__vpReplies[2].data.result.ev.toFixed(3)');
assert.ok((await evaluate('document.getElementById("advice").textContent')).includes('Average return: ' + expected + ' per hand.'), 'Pending worker uses synchronous coaching for the current table');
// Distinct sentinel makes this deterministic even when two tables share an EV.
await evaluate('window.__vpReplies[1].data.result.ev = -123; releaseVp(2); releaseVp(1); document.getElementById("btnAsk").click()');
assert.ok((await evaluate('document.getElementById("advice").textContent')).includes('Average return: ' + expected + ' per hand.'), 'Coach keeps newest table answer after stale reply');
console.log('Pay-table changes recompute coaching; stale replies cannot replace current advice.');

// Carry a nondefault practice selection into the shared Daily Drill.
await evaluate(`(() => {
  const select = document.getElementById('variantSelect');
  select.value = ${JSON.stringify(changed)};
  select.dispatchEvent(new Event('change'));
  document.getElementById('btnTitle').click();
})()`);
await run("$('btnDaily').click(); await wait(80); return true;");
for (let i = 0; i < 5; i++) {
  if (await evaluate('!document.getElementById("rowVariant").hidden')) break;
  await run('await finishHand(); $("btnNext").click(); await wait(80); return true;');
}
assert.equal(await evaluate('document.getElementById("rowVariant").hidden'), false, 'Daily includes video poker');
assert.equal(await evaluate('document.getElementById("variantSelect").disabled'), true, 'Daily table is fixed');
assert.equal(await evaluate('document.getElementById("variantSelect").value'), original, 'Daily shows its actual default table');
assert.ok((await evaluate('document.getElementById("paytableTitle").textContent')).includes('Jacks or Better'), 'Daily odds panel shows the default table');
const before = await evaluate('window.__vpJobs.length');
await evaluate(`(() => {
  const select = document.getElementById('variantSelect');
  select.value = ${JSON.stringify(changed)};
  select.dispatchEvent(new Event('change'));
})()`);
assert.equal(await evaluate('window.__vpJobs.length'), before, 'Synthetic change cannot regrade Daily');
assert.deepEqual(runtimeErrors, [], 'No runtime errors');
console.log('Daily uses the default table after variant practice and prevents changes.');
} finally {
  ws?.close(); chrome.kill('SIGTERM');
  await new Promise(resolve => chrome.exitCode !== null ? resolve() : chrome.once('exit', resolve));
  await rm(profilePath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
