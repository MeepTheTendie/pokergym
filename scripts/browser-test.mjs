import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 9333;
const URL_UNDER_TEST = process.argv[2] ?? 'http://127.0.0.1:8899/web/harness.html';

const chrome = spawn('chromium', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--window-size=520,900',
  `--remote-debugging-port=${PORT}`,
  'about:blank',
], { stdio: 'ignore' });

let ws;
let msgId = 0;
const pending = new Map();

function send(method, params = {}) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function connect() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('chromium devtools never came up');
}

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval failed');
  return r.result.value;
}

const wsUrl = await connect();
ws = new WebSocket(wsUrl);
await new Promise((r) => { ws.onopen = r; });
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  }
};

await send('Page.enable');
await send('Runtime.enable');

const consoleErrors = [];
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(msg.params.exceptionDetails.exception?.description ?? 'exception');
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
  }
});

await send('Page.navigate', { url: URL_UNDER_TEST });

let title = '';
for (let i = 0; i < 160; i++) {
  await sleep(500);
  try {
    title = await evaluate('document.title');
    if (title.startsWith('DONE')) break;
  } catch {}
}

const log = await evaluate('document.getElementById("log").textContent');
console.log(log);

const shot = await send('Page.captureScreenshot', { format: 'png' });
const { writeFileSync } = await import('node:fs');
writeFileSync(new URL('../web/harness.png', import.meta.url), Buffer.from(shot.data, 'base64'));
console.log('\n[screenshot] web/harness.png written');
console.log(`\n[title] ${title}`);
console.log(`[browser console errors] ${consoleErrors.length}`);
consoleErrors.forEach((e) => console.log('  ' + e));

ws.close();
chrome.kill();
process.exit(title.startsWith('DONE errors=0') && consoleErrors.length === 0 ? 0 : 1);