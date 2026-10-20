// Regression check: revealing animated feedback must preserve the settled hand.
// Serve the repo, then run this script with an optional local or live game URL.
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 9337;
const profilePath = await mkdtemp(path.join(tmpdir(), 'pokergym-coach-'));
const BASE = process.argv[2] ?? 'http://127.0.0.1:8899/web/';
const chrome = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--window-size=390,844', `--user-data-dir=${profilePath}`, `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });

let ws; let msgId = 0; const pending = new Map();
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
// Capture every trackEvent call; the loader's no-op assignment off the
// production host is ignored. Events survive reloads via sessionStorage.
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  (() => {
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
const failures = [];
// Animated feedback must remain readable: revealing it cannot discard the hand.
// Exercise actual pointer and keyboard handlers with motion enabled.
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
for (const activation of ['click', 'Enter', ' ']) {
  await open(BASE);
  const result = await run(`
    await drain();
    await finishHand();
    const before = localStorage.getItem('pokergym:save:v1');
    const full = $('masterLine')._dataset.full;
    let advances = 0;
    const next = $('btnNext').onclick;
    $('btnNext').onclick = () => { advances++; next(); };
    const activate = () => ${activation === 'click' ? "$('masterBox').click()" : `$('masterBox').dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(activation)}, bubbles: true, cancelable: true }))`};
    activate();
    const revealed = $('masterLine').textContent === full;
    const stayed = !$('battleEndRow').hidden && localStorage.getItem('pokergym:save:v1') === before;
    activate();
    return { revealed, stayed, advanced: advances === 1 };
  `);
  if (!result.revealed || !result.stayed || !result.advanced) {
    failures.push('coach feedback ' + JSON.stringify(activation) + ': ' + JSON.stringify(result));
  }
  console.log('coach reveal/read/advance', JSON.stringify(activation), JSON.stringify(result));
}

// The same flow still completes exactly five hands and produces a recap.
await open(BASE);
const completed = await run(`
  await drain(); await playHands(5);
  const saved = JSON.parse(localStorage.getItem('pokergym:save:v1'));
  return { active: saved.activeSession, sessions: saved.sessions.length,
    recap: !$('sessionSummary').hidden, hands: saved.handsPlayed };
`);
if (completed.active || completed.sessions !== 1 || !completed.recap || completed.hands !== 5) {
  failures.push('five-hand completion: ' + JSON.stringify(completed));
}
console.log('five-hand completion', JSON.stringify(completed));

// Reduced-motion users see the full explanation immediately; one tap advances.
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await open(BASE);
const reduced = await run(`
  await drain(); await finishHand();
  const visible = $('masterLine').textContent === $('masterLine')._dataset.full;
  let advances = 0;
  const next = $('btnNext').onclick;
  $('btnNext').onclick = () => { advances++; next(); };
  $('masterBox').click();
  return { visible, advances };
`);
if (!reduced.visible || reduced.advances !== 1) failures.push('reduced motion: ' + JSON.stringify(reduced));
console.log('reduced motion', JSON.stringify(reduced));
ws.close();
const stopped = new Promise(resolve => chrome.once('exit', resolve));
chrome.kill();
await stopped;
await rm(profilePath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
if (failures.length) { console.error('FAIL\n' + failures.join('\n')); process.exit(1); }
console.log('Coach feedback checks passed.');
