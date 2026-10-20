import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import assert from 'node:assert/strict';
const port = 9336;
const chrome = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
let ws, id = 0;
const pending = new Map();
const errors = [];
let pausedImage;
try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {}
    if (!target) await sleep(100);
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => { ws.onopen = resolve; });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.method === 'Fetch.requestPaused') pausedImage = m.params.requestId;
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
    if (!pending.has(m.id)) return;
    const { resolve, reject } = pending.get(m.id); pending.delete(m.id);
    m.error ? reject(new Error(m.error.message)) : resolve(m.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const current = ++id; pending.set(current, { resolve, reject }); ws.send(JSON.stringify({ id: current, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'Evaluation failed');
    return result.result.value;
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(...args) { super(...args); window.testAudioContext = this; window.testGains = []; }
      createGain() { const gain = super.createGain(); window.testGains.push(gain); return gain; }
    };
  ` });
  await send('Page.navigate', { url: process.argv[2] ?? 'http://127.0.0.1:8901/web/index.html' });
  for (let i = 0; i < 100 && !await evaluate('Boolean(document.getElementById("btnSound")?.onclick)'); i++) await sleep(50);
  await evaluate(`(async () => { window.testAudio = (await import('./audio.js?v=20261017-vegas1')).default; })()`);
  const tap = async button => {
    const p = await evaluate(`(() => { const r = document.getElementById(${JSON.stringify(button)}).getBoundingClientRect(); return {x:r.x+r.width/2, y:r.y+r.height/2}; })()`);
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, radiusX: 2, radiusY: 2 }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(250);
  };
  assert.equal(await evaluate('Boolean(document.getElementById("btnNew").onclick)'), false, 'Atlas should still be blocked');
  await tap('btnSound');
  assert.equal(await evaluate('document.getElementById("btnSound").textContent'), 'SND OFF');
  await tap('btnSound');
  assert.equal(await evaluate('document.getElementById("btnSound").textContent'), 'SND ON');
  assert.equal(await evaluate('testAudio.status().context'), 'running');
  console.log('Sound control works while artwork download is stalled.');
  assert.ok(pausedImage, 'Character download was not intercepted');
  await send('Fetch.continueRequest', { requestId: pausedImage });
  await send('Fetch.disable');
  for (let i = 0; i < 100 && !await evaluate('Boolean(document.getElementById("btnNew")?.onclick)'); i++) await sleep(50);
  await tap('btnNew');
  let status = await evaluate('testAudio.status()');
  console.log('First real touch:', status);
  assert.equal(status.context, 'running'); assert.equal(status.playing, true);
  await evaluate(`window.testMeter = testAudioContext.createAnalyser(); testMeter.fftSize = 2048; testGains[0].connect(testMeter); testMeter.connect(testAudioContext.destination);`);
  let rms = 0;
  for (let i = 0; i < 6; i++) {
    await sleep(100);
    rms = Math.max(rms, await evaluate(`(() => { const data = new Float32Array(testMeter.fftSize); testMeter.getFloatTimeDomainData(data); return Math.sqrt(data.reduce((sum, v) => sum + v*v, 0)/data.length); })()`));
  }
  console.log('Live audio RMS:', rms); assert.ok(rms > 0.001, 'Music output is silent');
  await tap('btnSound'); assert.equal(await evaluate('testAudio.status().muted'), true);
  assert.equal(await evaluate('document.getElementById("btnSound").textContent'), 'SND OFF');
  const silentRms = await evaluate(`(() => { const data = new Float32Array(testMeter.fftSize); testMeter.getFloatTimeDomainData(data); return Math.sqrt(data.reduce((sum, v) => sum + v*v, 0)/data.length); })()`);
  console.log('Muted output RMS:', silentRms);
  assert.ok(silentRms < 0.00001, 'Sound off does not silence output');
  await evaluate('testAudioContext.suspend()');
  await tap('btnSound');
  status = await evaluate('testAudio.status()');
  console.log('Unmute after audio interruption:', status);
  assert.equal(status.context, 'running', 'Sound button failed to resume interrupted audio');
  assert.equal(status.playing, true);
  assert.equal(await evaluate('document.getElementById("btnSound").textContent'), 'SND ON');
  for (let i = 0; i < 4; i++) {
    await tap('btnSound');
    const off = i % 2 === 0;
    assert.equal(await evaluate('testAudio.status().muted'), off);
    assert.equal(await evaluate('document.getElementById("btnSound").getAttribute("aria-pressed")'), String(!off));
  }
  await evaluate('testAudioContext.suspend()');
  await tap('btnNew');
  assert.equal(await evaluate('testAudio.status().context'), 'running', 'Touch did not recover audio');
  assert.deepEqual(errors, []);
  console.log('Audio touch, live output, mute and interruption recovery passed.');
} finally { ws?.close(); chrome.kill(); }
