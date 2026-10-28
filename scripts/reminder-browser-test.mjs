// End-to-end check of the recap's two reminder choices:
// the browser button subscribes without downloading anything, and the calendar
// link downloads an .ics file without subscribing.
import { spawn, execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const root = fileURLToPath(new URL('..', import.meta.url));
const appFile = path.join(root, 'web/app.js');
let needsBuild = true;
try {
  needsBuild = (await stat(path.join(root, 'dist/sw.js'))).mtimeMs < (await stat(appFile)).mtimeMs;
} catch { /* dist missing */ }
if (needsBuild) execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root, stdio: 'inherit' });

const PORT = 8902;
const DEBUG_PORT = 9341;
const BASE = `http://127.0.0.1:${PORT}/web/`;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
  cwd: path.join(root, 'dist'), stdio: 'ignore',
});
const profilePath = await mkdtemp(path.join(tmpdir(), 'pokergym-reminder-profile-'));
const downloadPath = await mkdtemp(path.join(tmpdir(), 'pokergym-reminder-downloads-'));
const chrome = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--window-size=390,844', `--user-data-dir=${profilePath}`, `--remote-debugging-port=${DEBUG_PORT}`, 'about:blank'], { stdio: 'ignore' });
await sleep(800);

let ws;
try {
  let page;
  for (let i = 0; i < 100 && !page; i++) {
    try { page = (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json()).find(t => t.type === 'page'); } catch {}
    if (!page) await sleep(100);
  }
  assert.ok(page, 'Chromium available');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(resolve => { ws.onopen = resolve; });

  let id = 0;
  const pending = new Map();
  const downloads = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Browser.downloadWillBegin') downloads.push(message.params);
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    pending.set(next, { resolve, reject });
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

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath, eventsEnabled: true });
  // Pretend this browser can subscribe, and keep the worker call local so the
  // test never contacts the real push service or analytics collector.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    (() => {
      window.__pushCalls = [];
      window.__unsubscribeCalls = [];
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (url, options = {}) => {
        const target = typeof url === 'string' ? url : url.url;
        if (target.includes('/push/subscribe')) {
          window.__pushCalls.push(JSON.parse(options.body || '{}'));
          return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
        }
        if (target.includes('/push/unsubscribe')) {
          window.__unsubscribeCalls.push(JSON.parse(options.body || '{}'));
          return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
        }
        return originalFetch(url, options);
      };
      const fakeSubscription = {
        endpoint: 'https://push.example.test/device-1',
        toJSON: () => ({
          endpoint: 'https://push.example.test/device-1',
          keys: { p256dh: 'test-public-key', auth: 'test-auth-secret' },
        }),
        unsubscribe: async () => true,
      };
      Object.defineProperty(ServiceWorkerRegistration.prototype, 'pushManager', {
        configurable: true,
        get() {
          return { getSubscription: async () => null, subscribe: async () => fakeSubscription };
        },
      });
      Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'granted' });
      Notification.requestPermission = async () => 'granted';
    })();
  ` });

  await send('Page.navigate', { url: BASE + '?daily=1&ref=reminder_test' });
  await waitFor('Boolean(document.getElementById("btnNew")?.onclick)');
  await waitFor('!document.getElementById("scr-battle").hidden');

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
              if ($('btnConfirm').disabled) { card.click(); }
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
  await playHands(5);

  await waitFor('Boolean(document.querySelector(".reminder-push-button"))');
  const recapText = await evaluate('document.querySelector(".recap-reminders").textContent');
  assert.match(recapText, /Browser notification/, 'Recap names the push option in plain language');
  assert.match(recapText, /Sends a notification to this browser tomorrow morning/, 'Recap explains what push does before the tap');
  assert.match(recapText, /Calendar file/, 'Recap names the calendar option');
  assert.match(recapText, /Downloads a calendar file \(\.ics\)/, 'Recap explains the calendar download');
  assert.match(recapText, /does not send a browser notification/, 'Recap distinguishes the calendar file from push');
  assert.equal(await evaluate('document.querySelector(".reminder-push-button").className.includes("primary")'), true,
    'The push button is visually distinct as the primary action');
  assert.equal(await evaluate('document.querySelector(".calendar-download").tagName'), 'A',
    'The calendar reminder is a download link, not a second push button');

  await evaluate('document.querySelector(".reminder-push-button").click()');
  await waitFor('document.querySelector(".reminder-status")?.textContent.includes("Reminders are on")');
  assert.equal(await evaluate('window.__pushCalls.length'), 1, 'Push tap makes exactly one subscribe request');
  const subscribe = await evaluate('window.__pushCalls[0]');
  assert.equal(subscribe.endpoint, 'https://push.example.test/device-1');
  assert.deepEqual(subscribe.keys, { p256dh: 'test-public-key', auth: 'test-auth-secret' });
  assert.match(await evaluate('document.querySelector(".reminder-status").textContent'),
    /Reminders are on\. Your next one arrives .+\./, 'Push confirmation names the next reminder time');
  assert.equal(await evaluate('document.querySelector(".reminder-push-button").textContent'), 'Turn off browser reminders');
  await sleep(300);
  assert.equal(downloads.length, 0, 'Turning on push downloads no file');

  await evaluate('document.querySelector(".calendar-download").click()');
  for (let i = 0; i < 50 && downloads.length === 0; i++) await sleep(100);
  assert.equal(downloads.length, 1, 'Calendar tap starts one download');
  assert.equal(downloads[0].suggestedFilename, 'poker-gym-reminder.ics');
  let files = [];
  for (let i = 0; i < 50; i++) {
    files = await readdir(downloadPath);
    if (files.some(file => file.endsWith('.ics'))) break;
    await sleep(100);
  }
  const icsName = files.find(file => file.endsWith('.ics'));
  assert.ok(icsName, 'The .ics file is written to disk');
  const ics = await readFile(path.join(downloadPath, icsName), 'utf8');
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /SUMMARY:Poker Gym Daily Drill/);
  assert.match(ics, /playpokergym\.com\/web\/\?daily=1&ref=ics/);
  assert.equal(await evaluate('window.__pushCalls.length'), 1, 'Calendar tap does not subscribe');
  assert.equal(await evaluate('window.__unsubscribeCalls.length'), 0, 'Calendar tap does not touch push subscriptions');

  console.log('PASS: recap explains both reminder choices; push subscribes without a download, and the calendar link downloads an .ics without subscribing.');
} finally {
  ws?.close();
  server.kill('SIGTERM');
  chrome.kill('SIGTERM');
  await rm(profilePath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  await rm(downloadPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
