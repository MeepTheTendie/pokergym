// Automated proof of the recap push opt-in, including its two fallbacks.
// Runs against a local build so it never touches production or real push.
import { spawn, execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const root = fileURLToPath(new URL('..', import.meta.url));
const appFile = path.join(root, 'web/app.js');
let needsBuild = true;
try {
  needsBuild = (await stat(path.join(root, 'dist/sw.js'))).mtimeMs < (await stat(appFile)).mtimeMs;
} catch { /* dist missing */ }
if (needsBuild) execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root, stdio: 'inherit' });

const pushSource = await readFile(path.join(root, 'web/push.js'), 'utf8');
const vapidMatch = pushSource.match(/const VAPID_PUBLIC = '([^']+)';/);
assert.ok(vapidMatch, 'VAPID public key is readable from web/push.js');
const expectedVapidKey = vapidMatch[1];

const PORT = 8903;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
  cwd: path.join(root, 'dist'), stdio: 'ignore',
});
await sleep(800);

const BASE = `http://127.0.0.1:${PORT}/web/`;

async function runBrowser(debugPort) {
  const profilePath = await mkdtemp(path.join(tmpdir(), 'pokergym-push-browser-'));
  const downloadPath = await mkdtemp(path.join(tmpdir(), 'pokergym-push-downloads-'));
  const chrome = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--window-size=390,844', `--user-data-dir=${profilePath}`, `--remote-debugging-port=${debugPort}`, 'about:blank'], { stdio: 'ignore' });
  await sleep(800);
  let page;
  for (let i = 0; i < 100 && !page; i++) {
    try { page = (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find(t => t.type === 'page'); } catch {}
    if (!page) await sleep(100);
  }
  assert.ok(page, 'Chromium available');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(resolve => { ws.onopen = resolve; });
  let id = 0; const pending = new Map(); const downloads = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Browser.downloadWillBegin') downloads.push(message.params);
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id; pending.set(next, { resolve, reject });
    ws.send(JSON.stringify({ id: next, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'Evaluation failed');
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let i = 0; i < 200; i++) {
      if (await evaluate(expression)) return;
      await sleep(100);
    }
    throw new Error(`Timed out: ${expression}`);
  };
  const playHands = async count => {
    for (let hand = 0; hand < count; hand++) {
      for (let guard = 0; guard < 80; guard++) {
        if (!await evaluate('document.getElementById("battleEndRow").hidden')) break;
        await evaluate(`(() => {
          const $ = id => document.getElementById(id);
          const usable = id => $(id) && !$(id).hidden && !$(id).disabled && $(id).offsetParent !== null;
          const bet = [...$('rowBet').querySelectorAll('button')].find(button => !button.disabled && button.offsetParent !== null);
          if (bet) { bet.click(); return; }
          if (usable('btnStand')) { $('btnStand').click(); return; }
          if (usable('btnDraw')) { $('btnDraw').click(); return; }
          if (usable('btnConfirm') || ($('btnConfirm') && !$('btnConfirm').hidden && $('btnConfirm').offsetParent !== null)) {
            for (const card of document.querySelectorAll('#zones .card')) {
              if ($('btnConfirm').disabled) card.click();
            }
            $('btnConfirm').click();
            return;
          }
          if (usable('btnDeal')) { $('btnDeal').click(); return; }
        })()`);
        await sleep(60);
      }
      if (hand < count - 1) {
        await evaluate('document.getElementById("btnNext").click()');
        await waitFor('document.getElementById("battleEndRow").hidden');
      }
      await sleep(80);
    }
  };
  return { ws, send, evaluate, waitFor, playHands, downloads, profilePath, downloadPath, chrome };
}

async function closeBrowser(browser) {
  browser.ws?.close();
  browser.chrome.kill('SIGTERM');
  await rm(browser.profilePath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  await rm(browser.downloadPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

// Case 1: notification permission granted.
{
  const browser = await runBrowser(9351);
  const { ws, send, evaluate, waitFor, playHands, downloads } = browser;
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: browser.downloadPath, eventsEnabled: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__expectedVapidKey = ${JSON.stringify(expectedVapidKey)};
    window.__pushCalls = [];
    window.__subscribeCalls = 0;
    window.__subscribeKey = null;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (url, options = {}) => {
      const target = typeof url === 'string' ? url : url.url;
      if (target.includes('/push/subscribe')) {
        window.__pushCalls.push(JSON.parse(options.body || '{}'));
        window.__subscribeCalls += 1;
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return originalFetch(url, options);
    };
    const fakeSubscription = {
      endpoint: 'https://push.example.test/browser-check',
      toJSON: () => ({ endpoint: 'https://push.example.test/browser-check', keys: { p256dh: 'test-key', auth: 'test-auth' } }),
      unsubscribe: async () => true,
    };
    Object.defineProperty(ServiceWorkerRegistration.prototype, 'pushManager', {
      configurable: true,
      get() {
        return {
          getSubscription: async () => null,
          subscribe: async (options) => {
            window.__subscribeOptions = options;
            window.__subscribeCalls += 0;
            const key = options.applicationServerKey;
            const bytes = key instanceof Uint8Array ? key : new Uint8Array(key);
            let binary = '';
            for (const byte of bytes) binary += String.fromCharCode(byte);
            window.__subscribeKey = btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
            return fakeSubscription;
          },
        };
      },
    });
    Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'granted' });
    Notification.requestPermission = async () => 'granted';
  ` });

  await send('Page.navigate', { url: BASE + '?daily=1&ref=push_test' });
  await waitFor('Boolean(document.getElementById("btnNew")?.onclick)');
  await waitFor('!document.getElementById("scr-battle").hidden');
  await playHands(5);
  await waitFor('Boolean(document.querySelector(".reminder-push-button"))');
  await waitFor('Boolean(navigator.serviceWorker.controller)');
  assert.equal(await evaluate('document.querySelector(".reminder-push-button").className.includes("primary")'), true,
    'Push button is the primary visual action');
  await evaluate('document.querySelector(".reminder-push-button").click()');
  await waitFor('document.querySelector(".reminder-status")?.textContent.includes("Reminders are on")');
  assert.equal(await evaluate('window.__subscribeCalls > 0'), true, 'pushManager.subscribe was called');
  assert.equal(await evaluate('window.__subscribeKey'), expectedVapidKey,
    'pushManager.subscribe received the public key from web/push.js');
  const subscribeBody = await evaluate('window.__pushCalls[0]');
  assert.equal(subscribeBody.endpoint, 'https://push.example.test/browser-check');
  assert.deepEqual(subscribeBody.keys, { p256dh: 'test-key', auth: 'test-auth' });
  assert.match(await evaluate('document.querySelector(".reminder-status").textContent'),
    /Reminders are on\. Your next one arrives .+\./);
  await sleep(500);
  assert.equal(downloads.length, 0, 'No .ics download fires when push is supported');
  await closeBrowser(browser);
  console.log('PASS: push opt-in subscribes with the VAPID key and shows the on state without a download.');
}

// Case 2: notification permission denied.
{
  const browser = await runBrowser(9352);
  const { ws, send, evaluate, waitFor, playHands } = browser;
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'denied' });
    Notification.requestPermission = async () => 'denied';
  ` });
  await send('Page.navigate', { url: BASE + '?daily=1&ref=push_denied_test' });
  await waitFor('Boolean(document.getElementById("btnNew")?.onclick)');
  await waitFor('!document.getElementById("scr-battle").hidden');
  await playHands(5);
  await waitFor('Boolean(document.querySelector(".reminder-push-button"))');
  await evaluate('document.querySelector(".reminder-push-button").click()');
  await waitFor('document.querySelector(".reminder-status")?.textContent.includes("blocked for this site")');
  assert.match(await evaluate('document.querySelector(".reminder-status").textContent'),
    /Notifications are blocked for this site/);
  assert.ok(await evaluate('Boolean(document.querySelector(".calendar-download"))'),
    'The .ics option is still offered after permission denial');
  await closeBrowser(browser);
  console.log('PASS: denied permission shows a clear message and keeps the calendar fallback.');
}

// Case 3: no PushManager, as on iPhone Safari outside the Home Screen.
{
  const browser = await runBrowser(9353);
  const { ws, send, evaluate, waitFor, playHands } = browser;
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'delete window.PushManager;' });
  await send('Page.navigate', { url: BASE + '?daily=1&ref=push_unsupported_test' });
  await waitFor('Boolean(document.getElementById("btnNew")?.onclick)');
  await waitFor('!document.getElementById("scr-battle").hidden');
  await playHands(5);
  await waitFor('Boolean(document.querySelector(".calendar-download"))');
  const recapText = await evaluate('document.querySelector(".recap-reminders").textContent');
  assert.match(recapText, /Add to Home Screen to get reminders/);
  assert.ok(await evaluate('Boolean(document.querySelector(".calendar-download"))'),
    'The .ics option is offered when push is unavailable');
  assert.equal(await evaluate('Boolean(document.querySelector(".reminder-push-button"))'), false,
    'No push button is shown without PushManager');
  await closeBrowser(browser);
  console.log('PASS: unsupported browsers get the Home Screen note and the calendar fallback.');
}

server.kill('SIGTERM');
console.log('PASS: push browser checks cover granted, denied, and unsupported cases.');
