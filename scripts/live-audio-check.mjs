import { spawn } from 'node:child_process';
const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const target = targets.find(t => t.type === 'page' && /localhost:8901\/web\//.test(t.url));
if (!target) throw new Error('PokerGym preview tab not found');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => { ws.onopen = resolve; });
let id = 0;
const pending = new Map();
ws.onmessage = event => {
  const message = JSON.parse(event.data);
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const next = ++id; pending.set(next, {resolve, reject}); ws.send(JSON.stringify({id:next,method,params}));
});
try {
  if (process.argv.includes('--refresh')) {
    await send('Page.enable');
    await send('Page.reload', { ignoreCache: true });
    for (let i = 0; i < 100; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const ready = await send('Runtime.evaluate', { expression:'Boolean(document.getElementById("btnSound")?.onclick && document.getElementById("btnNew")?.onclick)',returnByValue:true });
      if (ready.result?.value) break;
    }
    await send('Page.bringToFront');
    const point = await send('Runtime.evaluate', {expression:'(() => { const r = document.querySelector(".brand").getBoundingClientRect(); return {x:r.x+10,y:r.y+10}; })()',returnByValue:true});
    await send('Input.dispatchMouseEvent', {type:'mousePressed',button:'left',clickCount:1,...point.result.value});
    await send('Input.dispatchMouseEvent', {type:'mouseReleased',button:'left',clickCount:1,...point.result.value});
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const result = await send('Runtime.evaluate', {awaitPromise:true,returnByValue:true,expression:`(async () => {
    const audio = (await import('./audio.js?v=20261017-lounge1')).default;
    return {url:location.href,visible:!document.hidden, soundLabel:document.getElementById('btnSound')?.textContent,
      soundHandler:String(document.getElementById('btnSound')?.onclick), scripts:[...document.scripts].map(s=>s.src),
      audio:audio.status(), storedSound:localStorage.getItem('pokergym.sound'), unlock:String(audio.unlock)};
  })()`});
  if(result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description);
  console.log(JSON.stringify(result.result.value,null,2));
  if (process.argv.includes('--measure')) {
    const capture = spawn('parec', ['--device=@DEFAULT_MONITOR@', '--format=float32le', '--channels=2', '--rate=48000']);
    const chunks = [];
    capture.stdout.on('data', data => chunks.push(data));
    capture.stderr.on('data', data => process.stderr.write(data));
    await new Promise(resolve => setTimeout(resolve, 2000));
    capture.kill('SIGTERM');
    await new Promise(resolve => capture.on('close', resolve));
    const bytes = Buffer.concat(chunks);
    let sum = 0, peak = 0;
    for (let i = 0; i + 4 <= bytes.length; i += 4) {
      const value = bytes.readFloatLE(i); sum += value * value; peak = Math.max(peak, Math.abs(value));
    }
    console.log('Actual speaker-output monitor:', JSON.stringify({samples:bytes.length/4, rms:Math.sqrt(sum/(bytes.length/4)), peak}));
  }
} finally {ws.close();}
