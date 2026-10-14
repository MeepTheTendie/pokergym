// Original, silent, caption-first marketing lesson. No customer/gameplay claims.
// Requires Chromium and ffmpeg. Outputs stay in ignored artifacts/.
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

export const slides = [
  { seconds: 7, label: 'HOLD’EM • BEST-FIVE QUIZ', title: 'Does your queen count?', answer: 'CHOOSE YOUR BEST FIVE', body: 'Your private cards: A♠ Q♥\nBoard: K♠ K♥ 7♦ 7♣ 2♦\nYou have two pair.\nWhich card fills the fifth place?' },
  { seconds: 8, label: 'ANSWER', title: 'Keep the ace. Leave the queen.', answer: 'K♠ K♥ 7♦ 7♣ A♠', body: 'Two kings and two sevens take\nfour places. Only one kicker fits.\nYour ace is higher than your queen.' },
  { seconds: 7, label: 'TRY THE TIE QUESTION', title: 'Their private cards: A♥ J♣', answer: 'WHO HAS THE BETTER HAND?', body: 'Same board: K♠ K♥ 7♦ 7♣ 2♦\nYou hold A♠ Q♥. They hold A♥ J♣.\nDoes your queen beat their jack?' },
  { seconds: 8, label: 'ANSWER', title: 'You tie.', answer: 'SAME PAIRS. SAME ACE KICKER.', body: 'Both best hands are kings and sevens\nwith an ace. The sixth card never\nbreaks a five-card tie.\nSuits do not break this tie either.' },
  { seconds: 6, label: 'HAND READING, NOT BETTING ADVICE', title: 'Count exactly five cards.', answer: 'EVALUATION PRACTICE', body: 'Poker Gym checks your best-five pick.\nIt does not teach full betting strategy\nor simulate opponents.\nThis example uses the actual evaluator.' },
  { seconds: 9, label: 'POKER GYM • FREE BROWSER TRAINER', title: 'Try five hands. Review one mistake.', answer: 'playpokergym.com', body: 'No signup. No real-money wagering.\nWhich explanation needs more clarity?\nPractice and feedback in the description.', footer: 'Learning hand rankings cannot guarantee profits.\nBuilt by Wes Pennock with AI assistance.' },
];

const out = path.resolve('artifacts/holdem-quiz');
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
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(out, 'frames.txt'), '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', String(slides.reduce((n, s) => n + s.seconds, 0)), '-vf', 'fps=30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', path.join(out, 'poker-gym-holdem-quiz.mp4')]);
  console.log('Created original 45-second caption-first Hold’em quiz, 720x1280, H.264/AAC.');
} finally {
  ws?.close(); chrome.kill();
  await sleep(100);
  await rm(profile, { recursive: true, force: true });
}
