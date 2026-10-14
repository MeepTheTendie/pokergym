// Original, silent, caption-first marketing lesson. No customer/gameplay claims.
// Requires Chromium and ffmpeg. Outputs stay in ignored artifacts/.
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

export const slides = [
  { seconds: 7, label: 'BACCARAT • ODDS QUIZ', title: 'Big payout. Better choice?', answer: 'BANKER, PLAYER OR TIE?', body: 'Fresh eight-deck shoe.\nBanker wins: 5% commission.\nTie wins: 8:1 profit payout.\nWhich loses the least on average?' },
  { seconds: 8, label: 'ANSWER 1 / 2', title: 'Banker loses the least.', answer: 'LOWEST EDGE ≠ PROFIT', body: 'Expected loss per unit staked:\nBanker: about 1.06%\nPlayer: about 1.24%\nTie: about 14.36%' },
  { seconds: 7, label: 'TRY THE COMMISSION QUESTION', title: 'A 20-unit Banker win.', answer: '19, 20 OR 21 UNITS?', body: 'After the 5% commission,\nhow much profit remains?\nExclude the returned original stake.\nChoose before the answer appears.' },
  { seconds: 8, label: 'ANSWER 2 / 2', title: '19 units of profit.', answer: '20 × 0.95 = 19', body: 'Commission takes one unit.\nYour original 20-unit stake returns\nseparately: 39 units in total.\nOne win does not change the house edge.' },
  { seconds: 7, label: 'UNDERSTAND ODDS, NOT STREAKS', title: 'The next hand is not promised.', answer: 'RULES AND PAYOUTS MATTER', body: 'Full-shoe averages do not predict\na short session. Different rules\nchange the math. These answers use\nPoker Gym’s enumerated-outcome coach.' },
  { seconds: 9, label: 'POKER GYM • FREE BROWSER TRAINER', title: 'Try five questions. Review one mistake.', answer: 'playpokergym.com', body: 'No signup. No real-money wagering.\nTry our weekly sample, then tell us\nwhat would make you return.\nPractice and feedback in the description.', footer: 'No gambling profits are guaranteed.\nBuilt by Wes Pennock with AI assistance.' },
];

const out = path.resolve('artifacts/baccarat-quiz');
await mkdir(out, { recursive: true });
const profile = await mkdtemp(path.join(tmpdir(), 'pokergym-video-'));
const chrome = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', `--user-data-dir=${profile}`, '--remote-debugging-port=19441', 'about:blank'], { stdio: 'ignore' });
let ws;
try {
  let target;
  for (let n = 0; n < 60 && !target; n++) {
    try { target = (await (await fetch('http://127.0.0.1:19441/json/list')).json()).find(t => t.type === 'page'); } catch {}
    if (!target) await sleep(100);
  }
  if (!target) throw new Error('Chromium unavailable');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => { ws.onopen = resolve; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = ({ data }) => { const msg = JSON.parse(data); const p = pending.get(msg.id); if (p) { pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); } };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); ws.send(JSON.stringify({ id: next, method, params })); });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 720, height: 1280, deviceScaleFactor: 1, mobile: false });
  const esc = t => t.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  for (const [i, slide] of slides.entries()) {
    const html = `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#141b25;color:#f2f5ef;font-family:Arial,sans-serif;width:720px;height:1280px;padding:72px 52px}main{height:1136px;display:flex;flex-direction:column;justify-content:center}.label{font-size:23px;letter-spacing:2px;color:#a7e4c1}h1{font-size:56px;line-height:1.12;margin:28px 0 38px}.cards{display:flex;gap:20px;align-items:center;margin:0 0 28px}.card{width:130px;height:176px;border-radius:14px;background:#fff9e9;color:#17222c;padding:18px;font-size:48px;box-shadow:0 6px 0 #06100e}.dealer{margin-left:28px;color:#ba354c}.answer{font-size:38px;font-weight:bold;color:#a7e4c1;border-top:3px solid #425c62;padding-top:24px}p{font-size:28px;line-height:1.5;white-space:pre-line}.footer{font-size:22px;color:#c5d0d7;margin-top:26px}small{font-size:20px;color:#c5d0d7}.brand{font-size:24px;color:#a7e4c1;margin-top:24px}</style><main><div class="label">${esc(slide.label)}</div><h1>${esc(slide.title)}</h1>${slide.dealer ? `<small>YOUR HAND　　　　　　　　 DEALER</small><div class="cards"><div class="card">10♠</div><div class="card">6♥</div><div class="card dealer">${slide.dealer}</div></div>` : ''}<div class="answer">${esc(slide.answer)}</div><p>${esc(slide.body)}</p>${slide.footer ? `<div class="footer" style="white-space:pre-line">${esc(slide.footer)}</div>` : '<div class="brand">POKER GYM • CARD DECISION PRACTICE</div>'}</main>`;
    await send('Page.navigate', { url: `data:text/html;charset=utf-8,${encodeURIComponent(html)}` });
    await sleep(150);
    const check = await send('Runtime.evaluate', { expression: '({overflow:document.documentElement.scrollHeight>1280 || document.documentElement.scrollWidth>720, text:document.body.innerText})', returnByValue: true });
    if (check.result.value.overflow || !check.result.value.text.includes(slide.answer)) throw new Error(`Slide ${i} layout/content failure`);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(path.join(out, `${i}.png`), Buffer.from(shot.data, 'base64'));
    await writeFile(path.join(out, `${i}.html`), html);
  }
  const list = slides.map((s, i) => `file '${i}.png'\nduration ${s.seconds}`).join('\n') + `\nfile '${slides.length - 1}.png'\n`;
  await writeFile(path.join(out, 'frames.txt'), list);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(out, 'frames.txt'), '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', String(slides.reduce((n, s) => n + s.seconds, 0)), '-vf', 'fps=30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', path.join(out, 'poker-gym-baccarat-quiz.mp4')]);
  console.log('Created original 46-second caption-first baccarat quiz, 720x1280, H.264/AAC.');
} finally {
  ws?.close(); chrome.kill();
  await sleep(100);
  await rm(profile, { recursive: true, force: true });
}
