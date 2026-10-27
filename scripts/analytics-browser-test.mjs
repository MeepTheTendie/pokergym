// End-to-end check of trainer analytics: drives the real app in headless
// Chromium through every entry flow and asserts each event fires exactly once
// per occurrence. Serve the repo first (npm run serve), then:
//   node scripts/analytics-browser-test.mjs [http://127.0.0.1:8899/web/]
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

const failures = [];
function expectCounts(flow, log, expected) {
  const counts = {};
  for (const [name] of log) counts[name] = (counts[name] ?? 0) + 1;
  for (const [name, want] of Object.entries(expected)) {
    if ((counts[name] ?? 0) !== want) failures.push(`${flow}: ${name} fired ${counts[name] ?? 0}x, expected ${want}`);
  }
  console.log(flow.padEnd(28), JSON.stringify(counts));
}
const props = (log, name) => log.find(([n]) => n === name)?.[1] ?? {};
function expectProps(flow, got, want) {
  for (const [k, v] of Object.entries(want)) if (got[k] !== v) failures.push(`${flow}: ${k}=${JSON.stringify(got[k])}, expected ${JSON.stringify(v)}`);
}

// 1. ?daily=1 deep link, new visitor, one visible title action, full run.
await open(BASE + '?daily=1&ref=youtube');
await run("$('btnDaily').click(); await wait(80); await playHands(5); return true;");
let log = await events();
expectCounts('daily=1 link', log, { open_trainer: 1, start_daily: 1, start_training: 1, daily_complete: 1, game_start: 0, session_complete: 0 });
expectProps('daily=1 link', props(log, 'open_trainer'), { entry: 'daily_link', ref: 'youtube' });
expectProps('daily=1 link', props(log, 'start_daily'), { entry: 'daily_link', resumed: false, scored: true, ref: 'youtube' });
expectProps('daily=1 link', props(log, 'daily_complete'), { scored: true, ref: 'youtube' });

// 2. Replay from the map after finishing: a second start, practice only.
await run("$('btnNext').click(); await wait(80); [...$('todayActions').querySelectorAll('button')].find(b => /AGAIN|REPLAY|PLAY/i.test(b.textContent))?.click(); await wait(80); await playHands(5); return true;");
log = await events();
expectCounts('replay after finish', log, { start_daily: 2, daily_complete: 2, start_training: 1, open_trainer: 1 });
expectProps('replay after finish', log.filter(([n]) => n === 'start_daily')[1]?.[1] ?? {}, { entry: 'replay', scored: false });

// 3. Share-grid link (?d=<today>) — find today's number from the app itself.
await open(BASE);
const today = await evaluate("import('../src/rpg/daily.js').then(m => m.dailyNumber(m.dailyKey()))");
await open(BASE + `?ref=share&d=${today}`);
await run("$('btnDaily').click(); await wait(80); await playHands(2); return true;");
log = await events();
expectCounts('share link, 2 hands', log, { open_trainer: 1, start_daily: 1, start_training: 1, daily_complete: 0 });
expectProps('share link, 2 hands', props(log, 'start_daily'), { entry: 'share_link', shared: true, ref: 'share' });

// 4. Resume the half-played daily after a reload, from the map.
await open(BASE, { fresh: false });
assert.equal(await evaluate('document.getElementById("scr-map").hidden'), false, 'Returning player opens the map automatically');
await run("[...$('todayActions').querySelectorAll('button')][0].click(); await wait(80); await playHands(3); return true;");
log = await events();
expectCounts('resume daily', log, { open_trainer: 1, start_daily: 1, start_training: 1, daily_complete: 1 });
expectProps('resume daily', props(log, 'start_daily'), { entry: 'map_resume', resumed: true });
expectProps('resume daily', props(log, 'open_trainer'), { entry: 'direct', returning: true });

// 5. Fresh visitor taps START TRAINING: a blackjack session.
await open(BASE);
await run("$('btnStart').click(); await wait(80); await playHands(5); return true;");
log = await events();
expectCounts('start training', log, { open_trainer: 1, game_start: 1, start_training: 1, session_complete: 1, start_daily: 0 });
expectProps('start training', props(log, 'game_start'), { game: 'blackjack', mode: 'session', resumed: false });
expectProps('start training', props(log, 'session_complete'), { game: 'blackjack' });

// The authored first hand is hard nine versus two; standing misses the play.
// Recap review must open recall without creating a new run or changing saves.
const savedBeforeReview = await evaluate('localStorage.getItem("pokergym:save:v1")');
assert.ok(JSON.parse(savedBeforeReview).mistakes.length > 0, 'Session saved an actual mistake');
await run(`
  const review = [...$('sessionSummary').querySelectorAll('button')].find(b => b.textContent === 'REVIEW MISTAKES');
  if (!review) throw new Error('Missing direct recap review');
  review.click();
  return true;
`);
assert.equal(await evaluate('document.getElementById("scr-review").hidden'), false, 'Recap opens notebook');
assert.ok(await evaluate('Boolean(document.querySelector("#reviewCard .review-entry"))'), 'Recall card rendered');
assert.ok(await evaluate('[...document.querySelectorAll("#reviewCard .mistake-answer")].every(answer => answer.hidden)'), 'Answers stay hidden until recall');
assert.equal(await evaluate('localStorage.getItem("pokergym:save:v1")'), savedBeforeReview, 'Opening review preserves scores, XP, sessions and schedule');
log = await events();
expectCounts('recap mistake review', log, { recap_tap: 1, game_start: 1, session_complete: 1, start_daily: 0 });
expectProps('recap mistake review', props(log, 'recap_tap'), { button: 'review_mistakes', run_id: props(log, 'session_complete').run_id });
await run("$('btnReviewDone').click(); return true;");
assert.equal(await evaluate('document.getElementById("scr-map").hidden'), false, 'Review returns to map');
assert.equal(await evaluate('localStorage.getItem("pokergym:save:v1")'), savedBeforeReview, 'Returning to map preserves completed session');

// 6. ?practice=holdem link, 2 hands, then reload and resume from the map.
// Since 72b258b (Oct 26) ?practice=<game> starts the session directly.
await open(BASE + '?practice=holdem&ref=x');
await run("await wait(80); await playHands(2); return true;");
log = await events();
expectCounts('practice link, 2 hands', log, { open_trainer: 1, game_start: 1, start_training: 1, session_complete: 0 });
expectProps('practice link, 2 hands', props(log, 'game_start'), { game: 'holdem', ref: 'x' });
expectProps('practice link, 2 hands', props(log, 'open_trainer'), { entry: 'practice_link' });
await open(BASE, { fresh: false });
assert.equal(await evaluate('document.getElementById("scr-map").hidden'), false, 'Returning player opens the map automatically');
await run("[...$('todayActions').querySelectorAll('button')][0].click(); await wait(80); await playHands(3); return true;");
log = await events();
expectCounts('resume session', log, { open_trainer: 1, game_start: 1, start_training: 1, session_complete: 1 });
expectProps('resume session', props(log, 'game_start'), { game: 'holdem', resumed: true });

// All four promoted practice links must lead to the advertised game in one tap.
for (const game of ['blackjack', 'baccarat', 'videopoker', 'holdem']) {
  await open(BASE + '?practice=' + game + '&ref=youtube');
  assert.equal(await evaluate('document.getElementById("scr-title").hidden'), true, game + ' link skips the title');
  assert.equal(await evaluate('document.getElementById("scr-battle").hidden'), false, game + ' link opens the game');
  await run("await wait(80); await playHands(5); return true;");
  log = await events();
  expectCounts(game + ' promoted session', log, { open_trainer: 1, game_start: 1, start_training: 1, session_complete: 1, recap_view: 1, start_daily: 0 });
  expectProps(game + ' promoted session', props(log, 'game_start'), { game, ref: 'youtube' });
  expectProps(game + ' promoted session', props(log, 'session_complete'), { game, ref: 'youtube' });
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Recap fits phone width');
}
assert.deepEqual(runtimeErrors, [], 'No browser runtime errors');
if (failures.length) throw new Error('Analytics failures:\n' + failures.join('\n'));
console.log('\nAnalytics flows passed.');
} finally {
  ws?.close(); chrome.kill('SIGTERM');
  await new Promise(resolve => chrome.exitCode !== null ? resolve() : chrome.once('exit', resolve));
  await rm(profilePath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
