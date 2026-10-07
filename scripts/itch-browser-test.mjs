import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { build } from './build.mjs';

execFileSync(process.execPath, ['scripts/build-itch.mjs'], { stdio: 'inherit' });
const temp = await mkdtemp(path.join(tmpdir(), 'pokergym-embed-test-'));
const liveUrl = process.env.POKERGYM_TEST_URL;
const crossSite = process.env.POKERGYM_CROSS_SITE_TEST === '1';
const offlineTest = process.env.POKERGYM_OFFLINE_TEST === '1';
const blockedStorage = process.env.POKERGYM_STORAGE_TEST;
if (blockedStorage && !['denied', 'quota'].includes(blockedStorage)) throw new Error('Unknown storage test');
const topLevel = Boolean(liveUrl || offlineTest || blockedStorage);
if (crossSite && topLevel) throw new Error('Cross-site mode requires the portable ZIP');
if (liveUrl && liveUrl !== 'https://pokergym.history-atlas.workers.dev/web/') throw new Error('Live smoke test is restricted to Poker Gym');
const children = [];
let ws;
try {
  const nested = path.join(temp, 'uploads/demo');
  await mkdir(nested, { recursive: true });
  execFileSync('python3', ['-c', `import sys,zipfile
with zipfile.ZipFile(sys.argv[1]) as archive:
    names = archive.namelist()
    assert 'index.html' in names and len(names) < 1000
    assert not any('harness' in n or n.endswith('.md') or n.startswith('.') for n in names)
    archive.extractall(sys.argv[2])`, path.resolve('artifacts/pokergym-itch.zip'), nested]);
  await writeFile(path.join(temp, 'embed.html'), '<!doctype html><link rel="icon" href="data:,"><iframe style="width:390px;height:844px;border:0" allow="autoplay; fullscreen" src="http://127.0.0.1:18997/uploads/demo/index.html"></iframe>');
  if (offlineTest || blockedStorage) await build(temp);
  // Match the cloud host's canonical index redirect in offline tests.
  await writeFile(path.join(temp, 'server.py'), `import http.server, os, sys
os.chdir(sys.argv[1])
class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?')[0] == '/web/index.html':
            self.send_response(307)
            self.send_header('Location', '/web/')
            self.end_headers()
        else:
            super().do_GET()
http.server.ThreadingHTTPServer(('127.0.0.1', 18997), Handler).serve_forever()
`);
  children.push(spawn('python3', [path.join(temp, 'server.py'), temp], { stdio: 'ignore' }));
  children.push(spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', `--user-data-dir=${path.join(temp, 'chrome')}`, '--remote-debugging-port=19397', 'about:blank'], { stdio: 'ignore' }));
  let page;
  for (let i = 0; i < 60 && !page; i++) {
    try { page = (await (await fetch('http://127.0.0.1:19397/json/list')).json()).find(t => t.type === 'page'); } catch {}
    if (!page) await sleep(100);
  }
  assert.ok(page, 'Chromium available');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(resolve => { ws.onopen = resolve; });
  let id = 0;
  const pending = new Map(), contexts = new Map(), errors = [], failed = [];
  ws.onmessage = event => {
    const msg = JSON.parse(event.data);
    if (pending.has(msg.id)) {
      const p = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    }
    if (msg.method === 'Target.attachedToTarget') {
      const sessionId = msg.params.sessionId;
      Promise.all(['Runtime.enable', 'Network.enable'].map(method => send(method, {}, sessionId))).catch(error => errors.push(error.message));
    }
    if (msg.method === 'Target.detachedFromTarget') {
      for (const [key, context] of contexts) if (context.sessionId === msg.params.sessionId) contexts.delete(key);
    }
    if (msg.method === 'Runtime.executionContextCreated') contexts.set(`${msg.sessionId || ''}:${msg.params.context.id}`, { ...msg.params.context, sessionId: msg.sessionId });
    if (msg.method === 'Runtime.executionContextsCleared') {
      for (const [key, context] of contexts) if (context.sessionId === msg.sessionId) contexts.delete(key);
    }
    if (msg.method === 'Runtime.executionContextDestroyed') contexts.delete(`${msg.sessionId || ''}:${msg.params.executionContextId}`);
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
    if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) failed.push(msg.params.response.url);
    if (msg.method === 'Network.loadingFailed') failed.push(msg.params.errorText);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const next = ++id; pending.set(next, { resolve, reject }); ws.send(JSON.stringify({ id: next, method, params, sessionId }));
  });
  await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  if (topLevel) {
    for (const guide of ['jacks-or-better', 'blackjack']) {
    const guideUrl = liveUrl
      ? new URL(`/guides/${guide}/?smoke=${Date.now()}`, liveUrl).href
      : `http://127.0.0.1:18997/guides/${guide}/`;
    await send('Page.navigate', { url: guideUrl });
    const guideEval = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;
    for (let i = 0; i < 60; i++) {
      if (await guideEval('document.querySelectorAll("details").length === 3')) break;
      await sleep(100);
    }
    assert.equal(await guideEval('document.querySelectorAll("details").length'), 3, 'Public guide has three recall-first hands');
    assert.equal(await guideEval('document.querySelectorAll("details[open]").length'), 0, 'Guide answers start hidden');
    assert.ok(await guideEval('document.documentElement.scrollWidth <= innerWidth'), 'Guide fits 390px phone');
    await guideEval('document.querySelector("summary").click()');
    assert.equal(await guideEval('document.querySelector("details").open'), true, 'Native answer disclosure works');
    assert.equal(await guideEval('document.querySelector(".cta").pathname'), '/web/', 'Guide links to playable demo');
    const targetGame = guide === 'blackjack' ? 'blackjack' : 'videopoker';
    assert.equal(await guideEval('new URL(document.querySelector(".cta").href).searchParams.get("practice")'), targetGame);
    await guideEval('localStorage.clear(); document.querySelector(".cta").click()');
    for (let i = 0; i < 100; i++) {
      if (await guideEval('Boolean(document.getElementById("btnNew")?.onclick) && !document.getElementById("practiceInvitation").hidden')) break;
      await sleep(100);
    }
    assert.equal(await guideEval('document.getElementById("practiceInvitation").hidden'), false, 'Selected training is explained before starting');
    await guideEval('document.getElementById("btnNew").click(); document.querySelector(".class-card").click(); document.getElementById("btnBecome").click()');
    assert.equal(await guideEval('document.getElementById("scr-lesson").hidden'), false, 'Guide starts its own lesson after trainer selection');
    const expectedGym = targetGame === 'blackjack' ? 'countyfair' : 'pokergym';
    const started = await guideEval('JSON.parse(localStorage.getItem("pokergym:save:v1"))');
    assert.equal(started.activeSession.gymId, expectedGym);
    assert.equal(started.activeSession.played, 0);
    const preserved = { ...started, activeSession: { gymId: 'riverstone', played: 2, optimal: 1, startedAt: '2026-10-07T00:00:00.000Z' } };
    await guideEval(`localStorage.setItem('pokergym:save:v1', ${JSON.stringify(JSON.stringify(preserved))}); location.reload()`);
    for (let i = 0; i < 100; i++) {
      if (await guideEval('Boolean(document.getElementById("btnContinue")?.onclick) && !document.getElementById("btnContinue").disabled')) break;
      await sleep(100);
    }
    assert.ok(await guideEval('document.getElementById("practiceInvitation").textContent.includes("UNFINISHED")'));
    await guideEval('document.getElementById("btnContinue").click()');
    assert.deepEqual(await guideEval('JSON.parse(localStorage.getItem("pokergym:save:v1")).activeSession'), preserved.activeSession, 'Guide preserves and resumes another unfinished session');
    assert.equal(await guideEval('document.getElementById("scr-lesson").hidden'), false);
    assert.ok(await guideEval('document.documentElement.scrollWidth <= innerWidth'));
    await guideEval('document.getElementById("btnMap").click(); document.getElementById("btnContinue").click()');
    assert.equal(await guideEval('document.getElementById("scr-map").hidden'), false, 'Invitation consumed once; ordinary navigation remains available');
    await guideEval('localStorage.clear()');
    console.log(`PASS: ${guide} phone guide opens targeted five-hand lesson; unfinished other-game session is preserved and resumed.`);
    }
  }
  if (blockedStorage) await send('Page.addScriptToEvaluateOnNewDocument', { source: blockedStorage === 'denied'
    ? `window.testStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage'); Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Blocked', 'SecurityError'); } });`
    : `window.testStorageSet = Storage.prototype.setItem; Storage.prototype.setItem = function() { throw new DOMException('Full', 'QuotaExceededError'); };` });
  await send('Page.navigate', { url: liveUrl ? `${liveUrl}?practice=unknown&smoke=${Date.now()}` : `http://${crossSite ? 'localhost' : '127.0.0.1'}:18997/${offlineTest || blockedStorage ? 'web/?practice=unknown' : 'embed.html'}` });
  async function gameContext(previousId) {
  for (let i = 0; i < 60; i++) {
      const tree = await send('Page.getFrameTree');
      const frameId = topLevel ? tree.frameTree.frame.id : tree.frameTree.childFrames?.[0]?.frame.id;
      const context = [...contexts.values()].find(c => `${c.sessionId || ''}:${c.id}` !== previousId && (crossSite ? c.origin === 'http://127.0.0.1:18997' && Boolean(c.sessionId) : c.auxData?.frameId === frameId) && c.auxData?.isDefault);
      if (context) return context;
      await sleep(100);
    }
    throw new Error('Embedded game context did not load');
  }
  let contextId = await gameContext();
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, contextId: contextId.id, returnByValue: true, awaitPromise: true }, contextId.sessionId);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'Evaluation failed');
    return result.result.value;
  }
  async function waitFor(expression) {
    for (let attempt = 0; attempt < 30; attempt++) {
      if (await evaluate(expression)) return;
      await sleep(100);
    }
    throw new Error(`Condition did not resolve: ${expression}`);
  }
  async function checkPrivacy() {
    assert.equal(await evaluate(`document.querySelector('a[href="privacy.html"]').target`), '_blank', 'Data guidance preserves the running game');
    await evaluate(`(() => {
      const frame = document.createElement('iframe');
      frame.id = 'privacyCheck'; frame.src = 'privacy.html';
      frame.style.cssText = 'position:fixed;inset:0;width:390px;height:600px;border:0;z-index:9999';
      document.body.append(frame);
    })()`);
    await waitFor('document.getElementById("privacyCheck").contentDocument?.title === "Privacy and your data — Poker Gym"');
    const result = await evaluate(`(() => {
      const frame = document.getElementById('privacyCheck');
      const doc = frame.contentDocument;
      return { fits: doc.documentElement.scrollWidth <= frame.clientWidth,
        returnPath: new URL(doc.querySelector('nav a').href).pathname,
        expectedPath: new URL('index.html', document.baseURI).pathname,
        scripts: doc.scripts.length,
        controls: doc.body.textContent.includes('close Poker Gym tabs') && doc.body.textContent.includes('Delete any backup copies separately') };
    })()`);
    assert.equal(result.fits, true, 'Privacy guidance fits a 390px phone');
    assert.equal(result.returnPath, result.expectedPath, 'Return link works on cloud and portable hosts');
    assert.equal(result.scripts, 0, 'Privacy guidance loads without scripts');
    assert.equal(result.controls, true, 'Local deletion and separate backup deletion are explained');
    await evaluate('document.getElementById("privacyCheck").remove()');
  }
  for (let i = 0; i < 60; i++) {
    if (await evaluate('Boolean(document.getElementById("btnNew")?.onclick)')) break;
    await sleep(100);
  }
  if (crossSite) {
    assert.ok(contextId.sessionId, 'Cross-site iframe runs in a separate Chromium target');
    assert.equal(await evaluate('location.origin'), 'http://127.0.0.1:18997');
    const parent = await send('Runtime.evaluate', { expression: `(() => {
      try { document.querySelector('iframe').contentWindow.localStorage; return false; }
      catch (error) { return error.name === 'SecurityError'; }
    })()`, returnByValue: true });
    assert.equal(parent.result.value, true, 'Parent cannot read embedded player storage');
    console.log('PASS: localhost parent embeds 127.0.0.1 game in an isolated cross-site target.');
  }
  assert.equal(await evaluate('document.title'), 'POKERGYM');
  await checkPrivacy();
  assert.ok(await evaluate('Boolean(document.getElementById("btnNew").onclick)'), `Modules loaded; runtime=${JSON.stringify(errors)}; failed requests=${JSON.stringify(failed)}`);
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), '390px embed has no horizontal overflow');
  await evaluate('document.getElementById("btnNew").click(); document.querySelector(".class-card").click(); document.getElementById("btnBecome").click()');
  assert.equal(await evaluate('document.getElementById("scr-map").hidden'), false);
  assert.equal(await evaluate('document.querySelectorAll("[data-session-gym]").length'), 4, 'New trainer can choose all four training games');
  assert.equal(await evaluate('document.querySelector("[data-gym=riverstone]").disabled'), true, 'Badge journey still requires earlier badges');
  if (blockedStorage) {
    assert.equal(await evaluate('document.getElementById("saveStatus").hidden'), false, 'Storage failure is visible');
    await evaluate('document.querySelector("[data-session-gym=pokergym]").click(); document.getElementById("btnSkip").click(); document.getElementById("btnAsk").click()');
    for (let hand = 0; hand < 5; hand++) {
      await evaluate('document.getElementById("btnDraw").click()');
      if (hand < 4) await evaluate('document.getElementById("btnNext").click()');
    }
    await evaluate('document.getElementById("btnNext").click(); document.getElementById("saveBackup").open = true; document.getElementById("btnBackup").click()');
    const backup = await evaluate('document.getElementById("backupText").value');
    assert.equal(JSON.parse(backup).sessions[0].played, 5, 'Unsaved session remains exportable');
    await evaluate('document.getElementById("btnRestore").click(); document.getElementById("btnConfirmRestore").click()');
    assert.match(await evaluate('document.getElementById("backupStatus").textContent'), /RESTORE FAILED/);
    await evaluate('document.getElementById("btnBackup").click()');
    assert.equal(await evaluate('document.getElementById("backupText").value'), backup, 'Failed restore preserves in-memory practice');
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Storage warning fits phone');
    await evaluate(`if (window.testStorageDescriptor) Object.defineProperty(window, 'localStorage', window.testStorageDescriptor); else Storage.prototype.setItem = window.testStorageSet; document.getElementById("btnRestore").click(); document.getElementById("btnConfirmRestore").click()`);
    assert.match(await evaluate('document.getElementById("backupStatus").textContent'), /PROGRESS RESTORED/);
    assert.equal(await evaluate('document.getElementById("saveStatus").hidden'), true, 'Warning clears only after successful save');
    assert.equal(await evaluate('localStorage.getItem("pokergym:save:v1")'), backup, 'Backup persists after storage becomes available');

    assert.deepEqual(errors, []);
    assert.deepEqual(failed.filter(url => !url.endsWith('/favicon.ico')), []);
    console.log(`PASS: ${blockedStorage} storage at 390px: startup, onboarding, five-hand completion, coach, visible warning, manual backup, failed restore preserves progress, recovered storage persists backup and clears warning; zero runtime/game asset errors.`);
  } else {
  await evaluate('document.getElementById("saveBackup").open = true; document.getElementById("btnBackup").click()');
  const backup = await evaluate('document.getElementById("backupText").value');
  assert.deepEqual(JSON.parse(backup), JSON.parse(await evaluate('localStorage.getItem("pokergym:save:v1")')));
  await evaluate('document.getElementById("backupText").value = "invalid"; document.getElementById("btnRestore").click()');
  assert.equal(await evaluate('document.getElementById("btnConfirmRestore").hidden'), true);
  assert.equal(await evaluate('localStorage.getItem("pokergym:save:v1")'), backup, 'Invalid restore preserves save');
  await evaluate(`document.getElementById("backupText").value = ${JSON.stringify(backup)}; document.getElementById("btnRestore").click()`);
  assert.equal(await evaluate('document.getElementById("btnConfirmRestore").hidden'), false);
  assert.equal(await evaluate('localStorage.getItem("pokergym:save:v1")'), backup, 'Validation alone does not overwrite');
  await evaluate('document.getElementById("btnConfirmRestore").click()');
  assert.match(await evaluate('document.getElementById("backupStatus").textContent'), /PROGRESS RESTORED/);
  assert.equal(await evaluate('localStorage.getItem("pokergym:save:v1")'), backup);
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Backup controls fit phone');
  await evaluate('document.getElementById("saveBackup").open = false');
  await evaluate('document.querySelector("#gymList button:not(:disabled)").click()');
  assert.equal(await evaluate('document.getElementById("scr-lesson").hidden'), false);
  await evaluate('document.getElementById("btnSkip").click()');
  assert.equal(await evaluate('document.getElementById("scr-battle").hidden'), false);
  await evaluate('document.getElementById("btnAsk").click()');
  const saved = await evaluate('localStorage.getItem("pokergym:save:v1")');
  assert.ok(saved, 'Profile saved in iframe');
  if (crossSite) {
    const parent = await send('Runtime.evaluate', { expression: 'localStorage.getItem("pokergym:save:v1")', returnByValue: true });
    assert.equal(parent.result.value, null, 'Game save stays separate from parent storage');
  }
  if (offlineTest) {
    for (let i = 0; i < 150; i++) {
      if (await evaluate('Boolean(navigator.serviceWorker.controller)')) break;
      await sleep(100);
    }
    assert.ok(await evaluate('Boolean(navigator.serviceWorker.controller)'), `Offline worker controls game; status=${await evaluate('document.getElementById("offlineStatus")?.textContent')}; failed=${JSON.stringify(failed)}`);
    assert.match(await evaluate('document.getElementById("offlineStatus").textContent'), /OFFLINE PRACTICE READY/);
    assert.ok(await evaluate('(async () => { const keys = await caches.keys(); const cache = await caches.open(keys.find(k => k.startsWith("pokergym-offline-"))); return (await cache.keys()).length; })()') > 30, 'Complete game cached');
    assert.equal(await evaluate('(async () => { const keys = await caches.keys(); const cache = await caches.open(keys.find(k => k.startsWith("pokergym-offline-"))); return (await cache.match("/web/index.html")).redirected; })()'), false, 'Cached navigation has no network redirect');
    if (!liveUrl) {
      // Removing the actual local server proves every game request works offline,
      // including requests made by the service worker's separate network context.
      children[0].kill('SIGTERM');
      await new Promise(resolve => children[0].exitCode !== null ? resolve() : children[0].once('exit', resolve));
    }
    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  } else if (!liveUrl) {
    assert.equal(await evaluate('(async () => (await navigator.serviceWorker.getRegistrations()).length)()'), 0, 'Embedded demo does not register offline worker');
  }
  await send('Page.reload');
  await sleep(400); contextId = await gameContext(`${contextId.sessionId || ''}:${contextId.id}`);
  for (let i = 0; i < 60; i++) {
    if (await evaluate('Boolean(document.getElementById("btnContinue")?.onclick)')) break;
    await sleep(100);
  }
  assert.equal(await evaluate('localStorage.getItem("pokergym:save:v1")'), saved);
  assert.equal(await evaluate('document.getElementById("btnContinue").disabled'), false);
  await evaluate('document.getElementById("btnContinue").click()');
  assert.equal(await evaluate('document.getElementById("scr-map").hidden'), false);
  if (offlineTest) {
    await checkPrivacy();
    await evaluate('document.querySelector("#gymList button:not(:disabled)").click(); document.getElementById("btnSkip").click(); document.getElementById("btnAsk").click()');
    assert.equal(await evaluate('document.getElementById("scr-battle").hidden'), false, 'Offline lesson, battle and coach work');
  }
  // Exercise persisted notebook UI with a representative missed decision.
  await evaluate(`(async () => {
    const state = await import('../src/rpg/state.js');
    const key = 'pokergym:save:v1';
    const profile = state.recordMistake(state.deserialize(localStorage.getItem(key)), {
      game: 'blackjack', situation: 'HARD 16 VS DEALER 10', chosen: 'STAND', correction: 'HIT',
    });
    localStorage.setItem(key, state.serialize(profile));
  })()`);
  await send('Page.reload');
  await sleep(400); contextId = await gameContext(`${contextId.sessionId || ''}:${contextId.id}`);
  for (let i = 0; i < 60; i++) {
    if (await evaluate('Boolean(document.getElementById("btnContinue")?.onclick)')) break;
    await sleep(100);
  }
  await evaluate('document.getElementById("btnContinue").click(); document.querySelector("#mistakeReview summary").click()');
  assert.equal(await evaluate('document.querySelector("#mistakeReview details p:nth-of-type(3)").hidden'), true, 'Coach answer starts hidden');
  await evaluate('document.querySelector("#mistakeReview button").click()');
  assert.equal(await evaluate('document.querySelector("#mistakeReview details p:nth-of-type(3)").hidden'), false);
  await evaluate('document.querySelectorAll("#mistakeReview button")[1].click()');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).mistakes[0].reviews'), 1);
  assert.equal(await evaluate('document.querySelectorAll("#mistakeReview button")[1].disabled'), true);
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Notebook fits phone embed');
  // New blackjack entries score original choices separately from self reviews.
  await evaluate(`(async () => {
    const state = await import('../src/rpg/state.js');
    const key = 'pokergym:save:v1';
    const p = state.recordMistake(state.deserialize(localStorage.getItem(key)), {
      game: 'blackjack', situation: 'SYNTHETIC RETRY TEST', chosen: 'STAND', correction: 'HIT',
      quiz: { choices: ['hit', 'stand'], optimal: ['hit'] },
    });
    localStorage.setItem(key, state.serialize(p));
  })()`);
  await send('Page.reload');
  await sleep(400); contextId = await gameContext(`${contextId.sessionId || ''}:${contextId.id}`);
  for (let i = 0; i < 60; i++) {
    if (await evaluate('Boolean(document.getElementById("btnContinue")?.onclick)')) break;
    await sleep(100);
  }
  await evaluate('document.getElementById("btnContinue").click(); document.querySelector("#mistakeReview summary").click()');
  const beforeRetry = await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1"))');
  await evaluate('document.querySelector("#mistakeReview [data-retry-action=stand]").click(); document.querySelector("#mistakeReview [data-retry-action=hit]").click()');
  assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).mistakes[0].retries'), { attempted: 1, correct: 0 }, 'Only first answer scores per visit');
  assert.match(await evaluate('document.querySelector("#mistakeReview details").textContent'), /TRY THE COACH PLAY NEXT VISIT/);
  assert.equal(await evaluate('document.querySelector("#mistakeReview details p:nth-of-type(3)").hidden'), false);
  await evaluate('document.getElementById("btnContinue").click(); document.querySelector("#mistakeReview summary").click(); document.querySelector("#mistakeReview [data-retry-action=hit]").click()');
  assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).mistakes[0].retries'), { attempted: 2, correct: 1 });
  const afterRetry = await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1"))');
  for (const key of ['xp', 'chips', 'handsPlayed', 'handsOptimal', 'practice', 'sessions']) assert.deepEqual(afterRetry[key], beforeRetry[key], 'Retry cannot alter gameplay records');
  await evaluate('document.getElementById("btnContinue").click(); document.querySelector("#mistakeReview summary").click(); [...document.querySelectorAll("#mistakeReview details button")].find(b => b.textContent === "REVEAL COACH ANSWER").click(); document.querySelector("#mistakeReview [data-retry-action=hit]").click()');
  assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).mistakes[0].retries'), { attempted: 2, correct: 1 }, 'Reveal disqualifies scoring');
  await evaluate('document.getElementById("btnBackup").click()');
  assert.deepEqual(await evaluate('JSON.parse(document.getElementById("backupText").value).mistakes[0].retries'), { attempted: 2, correct: 1 }, 'Retry record is portable');
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Retry choices fit phone');
  await evaluate('document.querySelector("[data-session-gym=pokergym]").click()');
  // Lesson may already be complete in this test save.
  await evaluate('if (!document.getElementById("scr-lesson").hidden) document.getElementById("btnSkip").click()');
  await evaluate('document.getElementById("btnDraw").click(); document.getElementById("btnDraw").click()');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).activeSession.played'), 1, 'Repeated settlement cannot score twice');
  await evaluate('document.getElementById("btnMap").click()');
  assert.match(await evaluate('document.getElementById("btnResumeSession").textContent'), /1\/5/);
  await evaluate('document.getElementById("btnResumeSession").click()');
  for (let hand = 0; hand < 4; hand++) {
    await evaluate('document.getElementById("btnDraw").click()');
    if (hand < 3) await evaluate('document.getElementById("btnNext").click()');
  }
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).activeSession'), null);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).sessions[0].played'), 5);
  assert.equal(await evaluate('document.getElementById("btnNext").textContent'), 'RETURN TO MAP');
  await evaluate('document.getElementById("btnNext").click()');
  assert.match(await evaluate('document.getElementById("shortSessions").textContent'), /[0-5]\/5 CORRECT/);
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Session results fit phone');
  assert.equal(await evaluate('document.getElementById("playerFeedback").hidden'), false, 'Feedback available after completed practice');
  assert.equal(await evaluate('document.getElementById("playerShare").hidden'), false);
  const invitation = await evaluate('document.getElementById("sharePreview").value');
  assert.match(invitation, /https:\/\/pokergym.history-atlas.workers.dev\/web\//);
  assert.doesNotMatch(invitation, /pokergym:save|CORRECT|ZIP TEST/);
  await evaluate(`Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedInvitation = text; } } }); document.getElementById('btnCopyShare').click();`);
  await waitFor(`document.getElementById('shareStatus').textContent.includes('Invitation copied')`);
  assert.equal(await evaluate('window.copiedInvitation'), invitation);
  await evaluate(`Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Denied'); } } }); document.getElementById('btnCopyShare').click();`);
  await waitFor(`document.getElementById('shareStatus').textContent.includes('Copy unavailable')`);
  await evaluate(`Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('Canceled', 'AbortError'); } }); document.getElementById('btnShare').onclick();`);
  await waitFor(`document.getElementById('shareStatus').textContent.includes('Sharing canceled')`);
  await evaluate(`Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.sharedInvitation = data.text; } }); document.getElementById('btnShare').onclick();`);
  await waitFor(`document.getElementById('shareStatus').textContent.includes('Delivery is handled')`);
  assert.equal(await evaluate('window.sharedInvitation'), invitation);


  await evaluate(`document.getElementById('feedbackClarity').value = 'confusing'; document.getElementById('feedbackReturn').value = 'maybe'; document.getElementById('feedbackPrice').value = 'free-only'; document.getElementById('feedbackNote').value = 'More drills & clearer hints?'; document.getElementById('feedbackForm').requestSubmit();`);
  assert.equal(await evaluate('document.getElementById("feedbackDraft").hidden'), false);
  assert.match(await evaluate('document.getElementById("feedbackDraft").textContent'), /NOT SENT/);
  const feedback = await evaluate(`({ href: document.getElementById('feedbackEmail').href, body: document.getElementById('feedbackPreview').value })`);
  assert.equal(new URL(feedback.href).searchParams.get('body'), feedback.body);
  assert.match(feedback.body, /More drills & clearer hints\?/);
  assert.doesNotMatch(feedback.body, /trainer|pokergym:save/i);
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Feedback form fits 390px');
  // Actual short sessions in the three previously locked games, with no badge injection.
  for (const gym of ['countyfair', 'villaoak', 'riverstone']) {
    if (gym === 'countyfair') await evaluate(`(async () => {
      const { seededRng } = await import('../src/cards.js');
      window.retryTestRandom = Math.random; Math.random = seededRng(7);
    })()`);
    await evaluate(`document.querySelector('[data-session-gym=${gym}]').click()`);
    assert.equal(await evaluate('document.getElementById("scr-lesson").hidden'), false, `${gym} introduces its own lesson`);
    await evaluate('document.getElementById("btnSkip").click()');
    assert.equal(await evaluate('document.getElementById("scr-battle").hidden'), false);
    if (gym === 'countyfair') await evaluate('Math.random = window.retryTestRandom; delete window.retryTestRandom');
    for (let step = 0; step < 20; step++) {
      if (!await evaluate('Boolean(JSON.parse(localStorage.getItem("pokergym:save:v1")).activeSession)')) break;
      await evaluate(`(() => {
        if (!document.getElementById('battleEndRow').hidden) { document.getElementById('btnNext').click(); return; }
        if ('${gym}' === 'countyfair') document.getElementById('btnStand').click();
        else if ('${gym}' === 'villaoak') document.getElementById('btnBanker').click();
        else { document.getElementById('btnAsk').click(); document.getElementById('btnApply').click(); document.getElementById('btnConfirm').click(); }
      })()`);
    }
    const result = await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1"))');
    assert.equal(result.activeSession, null, `${gym} completes five hands`);
    assert.equal(result.sessions[0].gymId, gym);
    assert.equal(result.sessions[0].played, 5);
    if (gym === 'countyfair') {
      const captured = result.mistakes.filter(m => m.game === 'blackjack' && m.situation !== 'SYNTHETIC RETRY TEST' && m.quiz);
      assert.ok(captured.length > 0, 'Actual missed blackjack play captures a retry key');
      for (const m of captured) {
        assert.ok(m.quiz.choices.includes('stand'));
        assert.ok(!m.quiz.optimal.includes('stand'), 'Original missed action remains suboptimal');
      }
    }
    assert.deepEqual(result.badges, [], 'Training never awards or unlocks badges');
    await evaluate('document.getElementById("btnNext").click()');
    assert.equal(await evaluate('document.querySelectorAll("[data-session-gym]").length'), 4);
    assert.equal(await evaluate('document.querySelector("[data-gym=riverstone]").disabled'), true);
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `${gym} results fit phone`);
  }
  console.log('PASS: scored blackjack retry, no repeat/revealed-answer scoring, independent persisted counts and portable backup; original gameplay captures legal choices and answer key.');
  console.log('PASS: all four games available to a new trainer; blackjack, baccarat and Hold’em five-hand sessions complete without badges; badge journey remains locked.');
  assert.deepEqual(errors, []);
  const favicon404 = topLevel && failed.some(url => url.endsWith('/favicon.ico'));
  assert.deepEqual(failed.filter(url => !topLevel || !url.endsWith('/favicon.ico')), []);
  if (favicon404) console.log('NOTE: Chromium requested missing root favicon.ico; game icon.svg is present.');
  console.log(liveUrl ? 'LIVE POKER GYM PHONE SMOKE TEST' : offlineTest ? 'LOCAL OFFLINE GAME TEST' : 'LOCAL ZIP EMBED TEST');
  console.log(`PASS: ${liveUrl ? '390px live page' : offlineTest ? '390px standalone game' : 'ZIP allowlist and nested 390px iframe'}, module/assets loading, trainer onboarding, lesson/battle/coach, save and resume, hidden-answer mistake self-test, saved review, five-hand session resume/completion, voluntary unsent feedback draft, private invitation copy/fallback/share states; zero runtime or game asset network errors.`);
  if (offlineTest) console.log(`PASS: offline cache ready, ${liveUrl ? 'browser network disabled' : 'actual HTTP server stopped'}, offline reload, saved progress, lesson/battle/coach and notebook review.`);
  }
} finally {
  ws?.close();
  await Promise.all(children.map(child => new Promise(resolve => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    child.once('exit', resolve); child.kill('SIGTERM');
  })));
  await rm(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
