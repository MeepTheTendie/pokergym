// Reproducibly renders web/og.png (1200x630 link-preview image).
//   node scripts/og-image.mjs
// Renders over a served http origin (not file://) so the Press Start 2P
// @font-face loads, waits for document.fonts.ready, and refuses to write a
// blank image: it checks the font really loaded and samples the rendered
// pixels of the card row and the green/red grid.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const PORT = 9335;
const BG = [0x14, 0x12, 0x1c];

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<style>
@font-face{font-family:'PressStart2P';src:url('/web/fonts/PressStart2P-Regular.woff2') format('woff2');}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden}
body{background:#14121c;color:#f5f1e8;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;text-align:center}
h1{font-family:'PressStart2P',monospace;font-size:64px;letter-spacing:4px;text-shadow:0 6px 0 #0b0a13}
.sub{font-size:28px;letter-spacing:1px;opacity:.92}
.cards{display:flex;gap:16px}
.card{width:104px;height:148px;border-radius:10px;border:3px solid #f5f1e8;background:#fffaf2;color:#111;display:flex;align-items:center;justify-content:center;font-size:44px;font-weight:700;box-shadow:0 6px 12px rgba(0,0,0,.4)}
.card.red{color:#c0262d}
.grid{display:flex;gap:12px}
.cell{width:56px;height:56px;border-radius:6px}
.g{background:#2fa84f}.r{background:#d23b3b}
</style></head><body>
<h1>POKER GYM</h1>
<p class="sub">Free card-game trainer — blackjack · video poker · baccarat · hold'em</p>
<div class="cards"><div class="card" id="c0">J♠</div><div class="card red">J♥</div><div class="card">2♣</div><div class="card red">5♦</div><div class="card">9♣</div></div>
<div class="grid" id="grid"><div class="cell g"></div><div class="cell g"></div><div class="cell r"></div><div class="cell g"></div><div class="cell g"></div></div>
</body></html>`;

const types = { '.woff2': 'font/woff2', '.html': 'text/html; charset=utf-8' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/og.html') { res.writeHead(200, { 'content-type': types['.html'] }); res.end(html); return; }
  if (url.pathname === '/web/fonts/PressStart2P-Regular.woff2') {
    res.writeHead(200, { 'content-type': types['.woff2'] });
    res.end(await readFile(path.join(root, 'web/fonts/PressStart2P-Regular.woff2')));
    return;
  }
  res.writeHead(404); res.end();
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = process.env.CHROME_BIN ?? 'chromium';
const profileDir = await mkdtemp(path.join(tmpdir(), 'pokergym-og-'));
const chrome = spawn(browser, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--hide-scrollbars', `--user-data-dir=${profileDir}`, `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });

let ws; let msgId = 0; const pending = new Map();
const send = (method, params = {}) => { const id = ++msgId; ws.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => pending.set(id, { res, rej })); };
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval error');
  return r.result.value;
};
try {
  let wsUrl;
  for (let i = 0; i < 80 && !wsUrl; i++) {
    try { wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(x => x.type === 'page')?.webSocketDebuggerUrl; } catch {}
    if (!wsUrl) await sleep(250);
  }
  if (!wsUrl) throw new Error('Chromium did not start (set CHROME_BIN if it is not on PATH as chromium)');
  ws = new WebSocket(wsUrl);
  await new Promise(r => { ws.onopen = r; });
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${origin}/og.html` });
  for (let i = 0; i < 100 && await evaluate('document.readyState') !== 'complete'; i++) await sleep(50);
  await evaluate('document.fonts.ready.then(() => true)');
  if (!await evaluate(`document.fonts.check("64px PressStart2P")`)) throw new Error('Press Start 2P did not load');
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });

  // Non-blank assertion: decode the capture in the page and sample pixels.
  const check = await evaluate(`(async () => {
    const img = new Image(); img.src = 'data:image/png;base64,${shot.data}'; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const at = (el, fx, fy) => { const r = el.getBoundingClientRect(); return [...g.getImageData(Math.round(r.left + r.width * fx), Math.round(r.top + r.height * fy), 1, 1).data].slice(0, 3); };
    const cells = [...document.querySelectorAll('.cell')].map(el => at(el, .5, .5));
    return { w: img.width, h: img.height, card: at(document.getElementById('c0'), .15, .15), cells };
  })()`);
  const isBg = (p) => p.every((v, i) => Math.abs(v - BG[i]) < 12);
  if (check.w !== 1200 || check.h !== 630) throw new Error(`wrong size ${check.w}x${check.h}`);
  if (isBg(check.card)) throw new Error('card row rendered as background');
  check.cells.forEach((p, i) => {
    const want = i === 2 ? 'red' : 'green';
    const ok = want === 'green' ? p[1] > p[0] + 40 : p[0] > p[1] + 40;
    if (isBg(p) || !ok) throw new Error(`grid cell ${i} is not ${want}: ${p}`);
  });
  const png = Buffer.from(shot.data, 'base64');
  await writeFile(path.join(root, 'web/og.png'), png);
  console.log(`wrote web/og.png (1200x630, ${png.length} bytes); font loaded; card row and grid pixels verified`);
} finally {
  try { ws?.close(); } catch {}
  chrome.kill();
  server.close();
}
