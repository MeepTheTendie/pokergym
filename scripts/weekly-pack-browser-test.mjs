import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

// Fresh isolated profile; never inspect the owner's browser or account data.
// Run against built assets or a deployed pack; no owner browser data is used.
const url = process.env.POKERGYM_PACK_URL ?? 'http://127.0.0.1:8898/guides/weekly-01/';
const temp = await mkdtemp(path.join(tmpdir(), 'pokergym-install-test-'));
const browser = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  `--user-data-dir=${temp}`, '--remote-debugging-port=19398', 'about:blank'], { stdio: 'ignore' });
let ws;
try {
  let page;
  for (let i = 0; i < 100 && !page; i++) {
    try { page = (await (await fetch('http://127.0.0.1:19398/json/list')).json()).find(t => t.type === 'page'); } catch {}
    if (!page) await sleep(100);
  }
  assert.ok(page, 'Isolated Chromium started');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(resolve => { ws.onopen = resolve; });
  let id = 0;
  const pending = new Map(), errors = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (request) {
      pending.delete(message.id);
      clearTimeout(request.timeout);
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails;
      errors.push(details.exception?.description ?? details.text);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    const timeout = setTimeout(() => {
      pending.delete(next); reject(new Error(`Timed out: ${method}`));
    }, 15000);
    pending.set(next, { resolve, reject, timeout });
    ws.send(JSON.stringify({ id: next, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.equal(result.exceptionDetails, undefined, 'Browser evaluation succeeded');
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let i = 0; i < 200; i++) {
      if (await evaluate(expression)) return;
      await sleep(100);
    }
    throw new Error(`Timed out: ${expression}; page=${await evaluate('JSON.stringify({url:location.href,title:document.title,text:document.body?.innerText.slice(0,400)})')}; errors=${JSON.stringify(errors)}`);
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const navigate = async () => {
    await evaluate('window.__packPreviousDocument = true');
    await send('Page.navigate', { url });
    await waitFor('!window.__packPreviousDocument && Boolean(document.querySelector("article button"))');
  };
  const finish = async () => {
    await evaluate(`document.querySelectorAll('article').forEach(card => card.querySelector('button[data-move="' + card.dataset.answer + '"]').click())`);
    await sleep(100);
  };
  await navigate();
  await evaluate('localStorage.clear()');
  await navigate();
  assert.equal(await evaluate('document.querySelectorAll("details[open]").length'), 0);
  assert.equal(await evaluate('document.getElementById("pack-share").hidden'), true);
  // Wrong choice cannot be replaced with a revealed answer.
  await evaluate('document.querySelector("article button[data-move=stand]").click()');
  await evaluate('document.querySelector("article button[data-move=hit]").click()');
  // Opening and immediately closing an explanation still forfeits the point.
  await evaluate('document.querySelectorAll("summary")[1].click(); document.querySelectorAll("summary")[1].click(); document.querySelectorAll("article")[1].querySelector("button[data-move=stand]").click()');
  await navigate();
  assert.match(await evaluate('document.getElementById("pack-score").textContent'), /0\/5 correct.*2\/5 completed/);
  assert.equal(await evaluate('document.querySelectorAll("article")[0].querySelector("button").disabled'), true);
  assert.equal(await evaluate('document.querySelectorAll("article")[1].querySelector("button").disabled'), true);
  await finish();
  assert.equal(await evaluate("localStorage.getItem('pokergym:weekly-01:attempt:v1')"), null);
  assert.match(await evaluate('document.getElementById("pack-score").textContent'), /3\/5 correct.*5\/5 completed/);
  assert.match(await evaluate('document.getElementById("pack-history").textContent'), /First completed attempt: 3\/5 \(1 revealed/);
  const beforeShare = await evaluate('JSON.stringify({...localStorage})');
  await evaluate(`Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copiedPack = text; } } }); document.getElementById('pack-share').click()`);
  await waitFor('document.getElementById("pack-share-status").textContent.startsWith("Copied.")');
  const shared = await evaluate('window.__copiedPack');
  assert.match(shared, /3\/5 correct \(1 revealed before choosing\)/);
  assert.ok(shared.endsWith('https://playpokergym.com/guides/weekly-01/?ref=share'));
  assert.equal(await evaluate('document.getElementById("pack-share-text").value'), shared);
  await evaluate(`Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('clipboard denied'); } } }); document.getElementById('pack-share').click()`);
  await waitFor('document.getElementById("pack-share-status").textContent.startsWith("Copy unavailable.")');
  assert.equal(await evaluate('document.getElementById("pack-share-text").hidden'), false);
  assert.equal(await evaluate('JSON.stringify({...localStorage})'), beforeShare);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await evaluate('document.getElementById("pack-retry").click()');
  await sleep(100);
  assert.equal(await evaluate('document.getElementById("pack-share").hidden'), true);
  assert.equal(await evaluate('document.getElementById("pack-share-text").hidden'), true);
  assert.equal(await evaluate('document.querySelectorAll("details[open]").length'), 0);
  await finish();
  assert.match(await evaluate('document.getElementById("pack-history").textContent'), /First completed attempt: 3\/5.*Latest completed attempt: 5\/5/);
  await navigate();
  assert.match(await evaluate('document.getElementById("pack-history").textContent'), /First completed attempt: 3\/5.*Latest completed attempt: 5\/5/);
  assert.match(await evaluate('document.getElementById("pack-score").textContent'), /0\/5 completed/);
  // Offer feedback is voluntary, unselected and unsent until the player acts.
  assert.equal(await evaluate('document.getElementById("pack-feedback").hidden'), false);
  assert.equal(await evaluate('document.getElementById("pack-interest").value'), '');
  await evaluate('document.getElementById("pack-feedback").requestSubmit()');
  assert.equal(await evaluate('document.getElementById("pack-feedback-review").hidden'), true);
  const beforeFeedback = await evaluate('JSON.stringify({...localStorage})');
  await evaluate(`document.getElementById('pack-interest').value = 'free-only'; document.getElementById('pack-note').value = '<script>not markup</script> & soft totals?'; document.getElementById('pack-feedback').requestSubmit()`);
  const feedbackBody = await evaluate('document.getElementById("pack-feedback-draft").value');
  assert.match(feedbackBody, /First completed score: 3\/5.*\nLatest completed score: 5\/5/);
  assert.match(feedbackBody, /review: free-only/);
  assert.ok(feedbackBody.includes('<script>not markup</script> & soft totals?'));
  assert.equal(await evaluate('document.querySelectorAll("#pack-feedback-review script").length'), 0);
  for (const link of ['email', 'github']) {
    const href = await evaluate(`document.getElementById('pack-feedback-${link}').href`);
    assert.equal(new URL(href).searchParams.get('body'), feedbackBody);
  }
  await evaluate(`document.getElementById('pack-feedback-draft').value = 'Edited: no scores & no comment'; document.getElementById('pack-feedback-draft').dispatchEvent(new Event('input'))`);
  for (const link of ['email', 'github']) {
    const href = await evaluate(`document.getElementById('pack-feedback-${link}').href`);
    assert.equal(new URL(href).searchParams.get('body'), 'Edited: no scores & no comment');
  }
  assert.equal(await evaluate('JSON.stringify({...localStorage})'), beforeFeedback);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await navigate();
  assert.equal(await evaluate('document.getElementById("pack-feedback-review").hidden'), true);
  // A corrupted stored record must not become a score or execute markup.
  await evaluate(`localStorage.setItem('pokergym:weekly-01:scores:v1', JSON.stringify({ first: { correct: 999, revealed: 0 }, latest: { correct: 5, revealed: 0 } }))`);
  await navigate();
  assert.equal(await evaluate('document.getElementById("pack-history").textContent'), 'No completed score saved yet.');
  await evaluate(`document.getElementById('pack-interest').value = 'unsure'; document.getElementById('pack-feedback').requestSubmit()`);
  assert.match(await evaluate('document.getElementById("pack-feedback-draft").value'), /No completed score available/);
  // Malformed and already-completed attempts cannot be resumed or alter history.
  for (const attempt of [[true, false, 'revealed', null, '<script>'], [true, true, true, true, true], [true]]) {
    await evaluate(`localStorage.setItem('pokergym:weekly-01:attempt:v1', ${JSON.stringify(JSON.stringify(attempt))})`);
    await navigate();
    assert.match(await evaluate('document.getElementById("pack-score").textContent'), /0\/5 completed/);
  }
  await evaluate("localStorage.removeItem('pokergym:weekly-01:attempt:v1')");
  // An older cached page has no feedback form; new JS must preserve its drill.
  const oldHtml = await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    const observer = new MutationObserver(() => {
      document.getElementById('pack-feedback')?.remove();
      document.getElementById('pack-share')?.remove();
    });
    observer.observe(document, { childList: true, subtree: true });
  ` });
  await navigate();
  assert.equal(await evaluate('document.getElementById("pack-feedback")'), null);
  await finish();
  assert.match(await evaluate('document.getElementById("pack-score").textContent'), /5\/5 correct/);
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: oldHtml.identifier });
  // Denied reads and quota failures both allow the full drill to finish.
  for (const blocked of ['getItem', 'setItem']) {
    const injected = await send('Page.addScriptToEvaluateOnNewDocument', { source: `Storage.prototype.${blocked} = () => { throw new DOMException('test storage unavailable'); };` });
    await navigate();
    await finish();
    assert.match(await evaluate('document.getElementById("pack-score").textContent'), /5\/5 correct/);
    assert.match(await evaluate('document.getElementById("pack-storage").textContent'), /Saving unavailable/);
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injected.identifier });
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ url, firstScore: 3, retryScore: 5, reload: 'passed', revealBeforeChoice: 'passed', interruptedResume: 'passed', invalidAttempt: 'passed', corruptSave: 'passed', deniedAndQuotaStorage: 'passed', unsentEditableFeedback: 'passed', phoneOverflow: false, runtimeErrors: 0 }));
} finally {
  ws?.close(); browser.kill('SIGTERM');
  await new Promise(resolve => browser.exitCode !== null ? resolve() : browser.once('exit', resolve));
  await rm(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
