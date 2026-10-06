import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 9334;
const BASE = process.argv[2] ?? 'http://127.0.0.1:8899/web/index.html';

const chrome = spawn('chromium', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--hide-scrollbars', '--force-device-scale-factor=2', '--window-size=440,820',
  `--remote-debugging-port=${PORT}`, 'about:blank',
], { stdio: 'ignore' });

let ws; let msgId = 0;
const pending = new Map();
const send = (method, params = {}) => {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => pending.set(id, { res, rej }));
};
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval error');
  return r.result.value;
};

let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) {
  try {
    const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    wsUrl = t.find((x) => x.type === 'page')?.webSocketDebuggerUrl;
  } catch {}
  if (!wsUrl) await sleep(250);
}
ws = new WebSocket(wsUrl);
await new Promise((r) => { ws.onopen = r; });
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  }
};
await send('Page.enable');
await send('Runtime.enable');

async function shot(name) {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(new URL(`../web/shot-${name}.png`, import.meta.url), Buffer.from(s.data, 'base64'));
  console.log('wrote web/shot-' + name + '.png');
}

const GYM_IDS = ['pokergym', 'countyfair', 'villaoak', 'riverstone'];
const GAMES = ['videopoker', 'blackjack', 'baccarat', 'holdem'];
const SHOT_NAMES = ['battle', 'battle-blackjack', 'battle-baccarat', 'battle-holdem'];

const save = (badges) => JSON.stringify({
  version: 1, name: 'RED', classId: 'scholar', xp: 1069, chips: 3288,
  badges, stats: { focus: 6, nerve: 2, read: 3 }, gym: 'pokergym',
  handsPlayed: 40, handsOptimal: 39, lessonsDone: GAMES,
  createdAt: '2026-01-01T00:00:00.000Z',
});

// Enter a gym whose lesson is already done and open the coach, so the shot
// shows the battle screen with advice on it.
async function enterGym(index) {
  await evaluate(`document.getElementById('btnContinue').click();`);
  await sleep(200);
  await evaluate(`document.getElementById('gymList').querySelectorAll('button')[${index}].click()`);
  await sleep(300);
  // A fresh player lands in the lesson; page through it if it is there.
  for (let i = 0; i < 80; i++) {
    const inLesson = await evaluate("!document.getElementById('scr-lesson').hidden");
    if (!inLesson) break;
    await evaluate("document.getElementById('lessonBox').click()");
    await sleep(60);
  }
  await evaluate("document.getElementById('btnAsk').click()");
  await sleep(400);
}

await send('Page.navigate', { url: BASE });
await sleep(1200);
await evaluate('document.fonts.ready');
await shot('title');

await evaluate('document.getElementById("btnNew").click()');
await sleep(300);
await evaluate("document.querySelectorAll('.class-card')[0].click()");
await sleep(300);
await shot('classselect');

await evaluate("document.getElementById('btnBecome').click()");
await sleep(400);
await shot('map');

// The first gym is entered the way a new player meets it: lesson first.
await evaluate("document.getElementById('gymList').querySelectorAll('button')[0].click()");
await sleep(400);
for (let i = 0; i < 80; i++) {
  const inLesson = await evaluate("!document.getElementById('scr-lesson').hidden");
  if (!inLesson) break;
  await evaluate("document.getElementById('lessonBox').click()");
  await sleep(60);
}
await evaluate("document.getElementById('btnAsk').click()");
await sleep(600);
await shot('battle');

// The other three gyms: seed a cleared save so the later gyms are open.
for (let i = 1; i < 4; i++) {
  await evaluate(`localStorage.setItem('pokergym:save:v1', ${JSON.stringify(save(GYM_IDS.slice(0, i)))})`);
  await send('Page.navigate', { url: BASE });
  await sleep(900);
  await enterGym(i);
  await shot(SHOT_NAMES[i]);
}

console.log('screens captured');
ws.close();
chrome.kill();
