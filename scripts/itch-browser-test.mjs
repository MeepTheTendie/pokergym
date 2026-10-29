import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { build } from './build.mjs';
import { DAILY_HANDS } from '../src/rpg/daily.js';

execFileSync(process.execPath, ['scripts/build-itch.mjs'], { stdio: 'inherit' });
const temp = await mkdtemp(path.join(tmpdir(), 'pokergym-embed-test-'));
const liveUrl = process.env.POKERGYM_TEST_URL;
const crossSite = process.env.POKERGYM_CROSS_SITE_TEST === '1';
const offlineTest = process.env.POKERGYM_OFFLINE_TEST === '1';
const blockedStorage = process.env.POKERGYM_STORAGE_TEST;
if (blockedStorage && !['denied', 'quota'].includes(blockedStorage)) throw new Error('Unknown storage test');
const topLevel = Boolean(liveUrl || offlineTest || blockedStorage);
if (crossSite && topLevel) throw new Error('Cross-site mode requires the portable ZIP');
if (liveUrl && !['https://playpokergym.com/web/', 'https://pokergym.history-atlas.workers.dev/web/'].includes(liveUrl)) throw new Error('Live smoke test is restricted to Poker Gym');
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
# The default listen backlog (5) drops connections when the service worker
# precaches ~60 assets while the page loads its modules, which made the
# offline/storage runs flaky. A real host does not have that limit.
class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 256
Server(('127.0.0.1', 18997), Handler).serve_forever()
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
    for (const guide of ['jacks-or-better', 'blackjack', 'holdem-best-five', 'baccarat']) {
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
    const targetGame = { baccarat: 'baccarat', blackjack: 'blackjack', 'jacks-or-better': 'videopoker', 'holdem-best-five': 'holdem' }[guide];
    assert.equal(await guideEval('new URL(document.querySelector(".cta").href).searchParams.get("practice")'), targetGame);
    // Since 72b258b (Oct 26) ?practice=<game> starts that game's five-hand
    // session directly for new and returning visitors; there is no title-screen
    // invitation step any more.
    const expectedGym = { baccarat: 'villaoak', blackjack: 'countyfair', videopoker: 'pokergym', holdem: 'riverstone' }[targetGame];
    const activeGym = 'JSON.parse(localStorage.getItem("pokergym:save:v1") || "null")?.activeSession?.gymId ?? null';
    // Let a just-installed offline worker finish activating before navigating.
    // Navigating while it was mid-activation intermittently failed one module
    // load (net::ERR_FAILED) and left the trainer unbooted. Not reproduced
    // outside this local test server; see the Oct 27 note in the control doc.
    for (let i = 0; i < 100; i++) {
      if (await guideEval('!navigator.serviceWorker || navigator.serviceWorker.controller?.state === "activated" || !window.isSecureContext')) break;
      await sleep(100);
    }
    await guideEval('localStorage.clear(); document.querySelector(".cta").click()');
    for (let i = 0; i < 100; i++) {
      if (await guideEval(`(${activeGym}) === ${JSON.stringify(expectedGym)} && document.getElementById("scr-title").hidden`)) break;
      await sleep(100);
    }
    assert.equal(await guideEval(activeGym), expectedGym, 'Guide link starts its own five-hand session');
    assert.equal(await guideEval('document.getElementById("scr-title").hidden'), true, 'Guide link skips the title screen');
    const started = await guideEval('JSON.parse(localStorage.getItem("pokergym:save:v1"))');
    assert.equal(started.activeSession.played, 0);
    const preserved = { ...started, activeSession: { gymId: targetGame === 'holdem' ? 'countyfair' : 'riverstone', played: 2, optimal: 1, startedAt: '2026-10-07T00:00:00.000Z' } };
    await guideEval(`localStorage.setItem('pokergym:save:v1', ${JSON.stringify(JSON.stringify(preserved))}); location.reload()`);
    for (let i = 0; i < 100; i++) {
      if (await guideEval('Boolean(document.getElementById("btnMap")?.onclick) && document.getElementById("scr-title").hidden')) break;
      await sleep(100);
    }
    // sanitize adds a `dealt` counter (ac6f409); everything else must be untouched.
    const { dealt: _dealt, ...resumed } = await guideEval('JSON.parse(localStorage.getItem("pokergym:save:v1")).activeSession');
    assert.deepEqual(resumed, preserved.activeSession, 'Guide preserves and resumes another unfinished session');
    assert.ok(await guideEval('document.documentElement.scrollWidth <= innerWidth'));
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
  await waitFor('Boolean(document.getElementById("btnNew")?.onclick)');
  if (topLevel) {
    await waitFor('!document.getElementById("installHelp").hidden');
    for (const outcome of ['dismissed', 'accepted', 'error']) {
      await evaluate(`(() => {
        window.installTestCalls = 0;
        const event = new Event('beforeinstallprompt', { cancelable: true });
        event.prompt = async () => { window.installTestCalls++; ${outcome === 'error' ? "throw new Error('Test unavailable');" : ''} };
        event.userChoice = Promise.resolve({ outcome: ${JSON.stringify(outcome)} });
        window.dispatchEvent(event);
        window.installTestPrevented = event.defaultPrevented;
      })()`);
      assert.equal(await evaluate('window.installTestPrevented'), true);
      assert.equal(await evaluate('document.getElementById("btnInstall").hidden'), false);
      await evaluate('document.getElementById("btnInstall").click(); document.getElementById("btnInstall").click()');
      await waitFor(`document.getElementById('installStatus').textContent.includes(${JSON.stringify(outcome === 'error' ? 'browser menu' : outcome === 'accepted' ? 'Install request accepted' : 'Install skipped')})`);
      assert.equal(await evaluate('window.installTestCalls'), 1, 'Installation requires one explicit click and consumes each prompt once');
      assert.equal(await evaluate('document.getElementById("btnInstall").hidden'), true);
    }
    await evaluate('window.dispatchEvent(new Event("appinstalled"))');
    assert.equal(await evaluate('document.getElementById("installHelp").hidden'), true);
    assert.match(await evaluate('document.getElementById("installStatus").textContent'), /home screen/);
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Install controls fit phone width');
    console.log('PASS: synthetic install prompt dismissal, acceptance, failure and completion; no physical installation claimed.');
  } else {
    assert.equal(await evaluate('document.getElementById("btnInstall").hidden'), true, 'Embedded ZIP does not advertise cloud installation');
  }
  async function checkPrivacy() {
    assert.equal(await evaluate(`document.querySelector('a[href="privacy.html"], a[href="/web/privacy"]').target`), '_blank', 'Data guidance preserves the running game');
    await evaluate(`(() => {
      const frame = document.createElement('iframe');
      frame.id = 'privacyCheck'; frame.src = document.querySelector('a[href="privacy.html"], a[href="/web/privacy"]').href;
      frame.style.cssText = 'position:fixed;inset:0;width:390px;height:600px;border:0;z-index:9999';
      document.body.append(frame);
    })()`);
    await waitFor('document.getElementById("privacyCheck").contentDocument?.title === "Privacy and your data — Play Poker Gym"');
    const result = await evaluate(`(() => {
      const frame = document.getElementById('privacyCheck');
      const doc = frame.contentDocument;
      return { fits: doc.documentElement.scrollWidth <= frame.clientWidth,
        returnPath: new URL(doc.querySelector('nav a').href).pathname,
        expectedPath: new URL('index.html', document.baseURI).pathname,
        scripts: [...doc.scripts].filter((s) => s.type !== 'application/ld+json').length, // JSON-LD (dac7923) is data, not code
        controls: doc.body.textContent.includes('close Play Poker Gym tabs') && doc.body.textContent.includes('Delete any backup copies separately') };
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
  assert.equal(await evaluate('document.title'), 'Play Poker Gym — free four-game casino trainer');
  const reorderedHolds = await evaluate(`(async () => {
    const { bestHold, clearCache } = await import('../src/coach/videopoker.js');
    clearCache();
    const hand = [{r:11,s:0},{r:11,s:1},{r:7,s:2},{r:4,s:3},{r:2,s:0}];
    const first = bestHold(hand);
    const second = bestHold([hand[2],hand[0],hand[3],hand[1],hand[4]]);
    return { first: first.holds, second: second.holds, ev: second.ev === first.ev };
  })()`);
  assert.deepEqual(reorderedHolds, { first: [true,true,false,false,false], second: [false,true,false,true,false], ev: true }, 'Cached coach holds follow reordered cards');
  console.log('PASS: video-poker cache preserves hold positions for reordered cards.');
  await checkPrivacy();
  if (!topLevel) {
    for (const guide of ['jacks-or-better', 'blackjack', 'holdem-best-five', 'baccarat']) {
      await evaluate(`(() => {
        const frame = document.createElement('iframe'); frame.id = 'guideCheck';
        frame.src = document.querySelector('#portableGuides a[href="guide-${guide}.html"]').href;
        frame.style.cssText = 'position:fixed;inset:0;width:390px;height:600px;border:0;z-index:9999';
        document.body.append(frame);
      })()`);
      await waitFor('document.getElementById("guideCheck").contentDocument?.querySelectorAll("details").length === 3');
      const targetGame = {blackjack: 'blackjack', baccarat: 'baccarat', 'jacks-or-better': 'videopoker', 'holdem-best-five': 'holdem'}[guide];
      const result = await evaluate(`(() => {
        const frame = document.getElementById('guideCheck'), doc = frame.contentDocument;
        const hidden = doc.querySelectorAll('details[open]').length === 0;
        doc.querySelector('summary').click();
        return {hidden, revealed: doc.querySelector('details').open,
          fits: doc.documentElement.scrollWidth <= frame.clientWidth,
          practice: new URL(doc.querySelector('.cta').href).pathname,
          game: new URL(doc.querySelector('.cta').href).searchParams.get('practice'),
          localLinks: [...doc.querySelectorAll('a[href],link[rel="icon"]')].every(el =>
            !el.href.startsWith('https://playpokergym.com') &&
            (!el.href.startsWith(location.origin) || new URL(el.href).pathname.startsWith('/uploads/demo/web/'))) };
      })()`);
      assert.deepEqual(result, {hidden: true, revealed: true, fits: true,
        practice: '/uploads/demo/web/index.html', game: targetGame, localLinks: true});
      await evaluate('document.getElementById("guideCheck").remove()');
    }
    console.log('PASS: four bundled phone guides reveal answers and link local practice, privacy and related guides.');
    assert.equal(await evaluate('document.getElementById("portableWeeklySample").target'), '_blank', 'Sample preserves running game');
    await evaluate(`(() => {
      const frame = document.createElement('iframe'); frame.id = 'sampleCheck';
      frame.src = document.getElementById('portableWeeklySample').href;
      frame.style.cssText = 'position:fixed;inset:0;width:390px;height:600px;border:0;z-index:9999';
      document.body.append(frame);
    })()`);
    await waitFor('Boolean(document.getElementById("sampleCheck").contentDocument?.querySelector("article button"))');
    const sample = await evaluate(`(() => {
      const frame = document.getElementById('sampleCheck'), doc = frame.contentDocument;
      const localAssets = [...doc.querySelectorAll('script[src],link[rel="icon"]')].every(el =>
        new URL(el.src || el.href).pathname.startsWith('/uploads/demo/web/'));
      doc.querySelectorAll('article').forEach(card => card.querySelector('button[data-move="' + card.dataset.answer + '"]').click());
      return { localAssets, score: doc.getElementById('pack-score').textContent,
        fits: doc.documentElement.scrollWidth <= frame.clientWidth,
        install: Boolean(doc.querySelector('link[rel="manifest"],#pack-download')),
        practice: new URL(doc.querySelector('.cta').href).pathname,
        feedback: !doc.getElementById('pack-feedback').hidden };
    })()`);
    assert.deepEqual(sample, { localAssets: true, score: 'This attempt: 5/5 correct · 5/5 completed.',
      fits: true, install: false, practice: '/uploads/demo/web/index.html', feedback: true });
    await evaluate('document.getElementById("sampleCheck").contentWindow.__previousSample = true; document.getElementById("sampleCheck").contentWindow.location.reload()');
    await waitFor('!document.getElementById("sampleCheck").contentWindow.__previousSample && document.getElementById("sampleCheck").contentDocument?.getElementById("pack-score")?.textContent.includes("5/5 correct")');
    assert.equal(await evaluate('document.getElementById("sampleCheck").contentDocument.querySelectorAll("article button:not(:disabled)").length'), 0, 'Portable completed review persists');
    await evaluate('document.getElementById("sampleCheck").remove()');
    console.log('PASS: nested portable weekly sample loads local assets, scores five choices, resumes completed review and links local practice; no cloud install advertised.');
  }
  assert.ok(await evaluate('Boolean(document.getElementById("btnNew").onclick)'), `Modules loaded; runtime=${JSON.stringify(errors)}; failed requests=${JSON.stringify(failed)}`);
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), '390px embed has no horizontal overflow');
  await evaluate('document.getElementById("btnNew").click(); document.querySelector(".class-card").click(); document.getElementById("btnBecome").click()');
  assert.equal(await evaluate('document.getElementById("scr-map").hidden'), false);
  assert.equal(await evaluate('document.querySelectorAll("[data-session-gym]").length'), 4, 'New trainer can choose all four training games');
  assert.equal(await evaluate('document.querySelector("[data-gym=riverstone]").disabled'), true, 'Badge journey still requires earlier badges');
  if (blockedStorage) {
    assert.equal(await evaluate('document.getElementById("saveStatus").hidden'), false, 'Storage failure is visible');
    await evaluate('document.querySelector("[data-session-gym=pokergym]").click(); if (!document.getElementById("scr-lesson").hidden) document.getElementById("btnSkip").click()');
    // The coach still opens with blocked storage; a coached hand earns no
    // session credit, so play it through first, then complete five clean hands.
    await evaluate('document.getElementById("btnAsk").click()');
    assert.equal(await evaluate('document.getElementById("coachPanel").hidden'), false, 'Coach opens with blocked storage');
    await evaluate('document.getElementById("btnDraw").click(); document.getElementById("btnNext").click()');
    for (let hand = 0; hand < 5; hand++) {
      await evaluate('document.getElementById("btnDraw").click()');
      if (hand < 4) await evaluate('document.getElementById("btnNext").click()');
    }
    await evaluate('document.getElementById("btnNext").click(); document.getElementById("saveBackup").open = true; document.getElementById("btnBackup").click()');
    const backup = await evaluate('document.getElementById("backupText").value');
    assert.equal(JSON.parse(backup).sessions[0].played, 5, 'Unsaved session remains exportable');
    await evaluate('document.getElementById("btnRestore").click(); document.getElementById("btnConfirmRestore").click()');
    assert.match(await evaluate('document.getElementById("backupStatus").textContent'), /Restore failed/);
    await evaluate('document.getElementById("btnBackup").click()');
    assert.equal(await evaluate('document.getElementById("backupText").value'), backup, 'Failed restore preserves in-memory practice');
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Storage warning fits phone');
    await evaluate(`if (window.testStorageDescriptor) Object.defineProperty(window, 'localStorage', window.testStorageDescriptor); else Storage.prototype.setItem = window.testStorageSet; document.getElementById("btnRestore").click(); document.getElementById("btnConfirmRestore").click()`);
    assert.match(await evaluate('document.getElementById("backupStatus").textContent'), /Progress restored/);
    assert.equal(await evaluate('document.getElementById("saveStatus").hidden'), true, 'Warning clears only after successful save');
    assert.deepEqual(JSON.parse(await evaluate('localStorage.getItem("pokergym:save:v1")')), JSON.parse(backup), 'Backup persists after storage becomes available');

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
  assert.match(await evaluate('document.getElementById("backupStatus").textContent'), /Progress restored/);
  const restoredSplit = JSON.parse(await evaluate('localStorage.getItem("pokergym:save:v1")'));
  const sanitizedBackup = JSON.parse(await evaluate(`(async () => {
    const { sanitizeProfile } = await import('../src/rpg/state.js');
    return JSON.stringify(sanitizeProfile(JSON.parse(${JSON.stringify(backup)})));
  })()`));
  assert.deepEqual(restoredSplit, sanitizedBackup);
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Backup controls fit phone');
  await evaluate('document.getElementById("saveBackup").open = false');
  await evaluate('document.querySelector("#gymList button:not(:disabled)").click()');
  // Since 0035be8 (Oct 19) gyms skip the lesson screen and go straight to play.
  await evaluate('if (!document.getElementById("scr-lesson").hidden) document.getElementById("btnSkip").click()');
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
    assert.match(await evaluate('document.getElementById("offlineStatus").textContent'), /Offline practice ready/);
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
    await evaluate('document.querySelector("#gymList button:not(:disabled)").click(); if (!document.getElementById("scr-lesson").hidden) document.getElementById("btnSkip").click(); document.getElementById("btnAsk").click()');
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
  await evaluate('document.getElementById("btnContinue").click()');
  assert.match(await evaluate('document.getElementById("btnReview").textContent'), /All caught up/, 'Unscored entries never reach the due queue');
  await evaluate('document.getElementById("btnReview").click()');
  assert.equal(await evaluate('document.getElementById("scr-review").hidden'), false);
  assert.equal(await evaluate('document.querySelector("#reviewCard .mistake-answer").hidden'), true, 'Coach answer starts hidden');
  await evaluate('[...document.querySelectorAll("#reviewCard button")].find(b => b.textContent === "Reveal answer").click()');
  assert.equal(await evaluate('document.querySelector("#reviewCard .mistake-answer").hidden'), false);
  await evaluate('[...document.querySelectorAll("#reviewCard button")].find(b => b.textContent === "Mark self-reviewed").click()');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).mistakes[0].reviews'), 1);
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Notebook fits phone embed');
  await evaluate('document.getElementById("btnReviewDone").click()');
  // A scored entry is due the same day; a miss resets it to box one, tomorrow.
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
  await evaluate('document.getElementById("btnContinue").click()');
  assert.match(await evaluate('document.getElementById("btnReview").textContent'), /Review 1 mistake/, 'Scored review is due the same day');
  const beforeRetry = await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1"))');
  await evaluate('document.getElementById("btnReview").click(); document.querySelector("#reviewCard [data-retry-action=stand]").click()');
  const afterMiss = await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1"))');
  assert.deepEqual(afterMiss.mistakes[0].retries, { attempted: 1, correct: 0 }, 'Only first answer scores per visit');
  assert.equal(afterMiss.mistakes[0].box, 1, 'A miss resets to the first box');
  assert.equal(afterMiss.mistakes[0].due, await evaluate('(async () => { const s = await import("../src/rpg/state.js"); return s.addDays(s.localDayKey(), 1); })()'), 'A miss returns tomorrow');
  assert.match(await evaluate('document.getElementById("reviewCard").textContent'), /Missed/);
  assert.ok(await evaluate('document.querySelector("#reviewCard [data-retry-action=hit]").disabled'), 'Further answers are locked');
  for (const key of ['xp', 'score', 'streak', 'bestStreak', 'handsPlayed', 'handsOptimal', 'practice', 'sessions']) assert.deepEqual(afterMiss[key], beforeRetry[key], 'A review cannot alter gameplay records');
  await evaluate('document.getElementById("btnReviewDone").click()');
  // A correct review advances a box and adds five Decision Score.
  await evaluate(`(async () => {
    const state = await import('../src/rpg/state.js');
    const key = 'pokergym:save:v1';
    const p = state.recordMistake(state.deserialize(localStorage.getItem(key)), {
      game: 'blackjack', situation: 'CORRECT RETRY TEST', chosen: 'STAND', correction: 'HIT',
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
  await evaluate('document.getElementById("btnContinue").click()');
  const beforeCorrect = await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1"))');
  await evaluate('document.getElementById("btnReview").click(); document.querySelector("#reviewCard [data-retry-action=hit]").click()');
  const afterCorrect = await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1"))');
  assert.equal(afterCorrect.mistakes[0].box, 2, 'A correct review advances one box');
  assert.equal(afterCorrect.mistakes[0].retries.correct, 1);
  assert.equal(afterCorrect.score, beforeCorrect.score + 5, 'A correct review adds five Decision Score');
  const boxBackup = await evaluate('document.getElementById("btnBackup").click(); document.getElementById("backupText").value');
  assert.equal(JSON.parse(boxBackup).mistakes[0].box, 2, 'Box travels in backup');
  assert.equal(JSON.parse(boxBackup).mistakes[0].due, afterCorrect.mistakes[0].due, 'Due date travels in backup');
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Retry choices fit phone');
  // A real weak drill must retain its authored sequence through phone reload.
  const beforeDrill = await evaluate('localStorage.getItem("pokergym:save:v1")');
  await evaluate(`(() => {
    const key = 'pokergym:save:v1';
    const p = JSON.parse(localStorage.getItem(key));
    p.lessonsDone = [...new Set([...p.lessonsDone, 'blackjack'])];
    p.mistakes[0].type = 'soft';
    localStorage.setItem(key, JSON.stringify(p));
  })()`);
  await send('Page.reload');
  await sleep(400); contextId = await gameContext(`${contextId.sessionId || ''}:${contextId.id}`);
  for (let i = 0; i < 60; i++) {
    if (await evaluate('Boolean(document.getElementById("btnContinue")?.onclick)')) break;
    await sleep(100);
  }
  await evaluate('document.getElementById("btnContinue").click(); document.querySelector("[data-drill-mode=weak]").click()');
  const capturedDrill = await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).activeSession.drill');
  assert.equal(capturedDrill.mode, 'weak');
  await evaluate('document.getElementById("btnStand").click()');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).activeSession.played'), 1);
  await send('Page.reload');
  await sleep(400); contextId = await gameContext(`${contextId.sessionId || ''}:${contextId.id}`);
  for (let i = 0; i < 60; i++) {
    if (await evaluate('Boolean(document.getElementById("btnContinue")?.onclick)')) break;
    await sleep(100);
  }
  await evaluate('document.getElementById("btnContinue").click(); document.querySelector("#todayActions button").click()');
  assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).activeSession.drill'), capturedDrill);
  const nextDrillLabel = await evaluate(`(async () => {
    const { BLACKJACK_DRILLS } = await import('../src/rpg/drills.js');
    return BLACKJACK_DRILLS[${capturedDrill.indices[1]}].label;
  })()`);
  assert.ok((await evaluate('document.querySelector(".battle-label").textContent')).includes(`Weak-spot drill · ${nextDrillLabel.toLowerCase().replace(/^./, c => c.toUpperCase())}`));
  await evaluate(`localStorage.setItem('pokergym:save:v1', ${JSON.stringify(beforeDrill)})`);
  await send('Page.reload');
  await sleep(400); contextId = await gameContext(`${contextId.sessionId || ''}:${contextId.id}`);
  for (let i = 0; i < 60; i++) {
    if (await evaluate('Boolean(document.getElementById("btnContinue")?.onclick)')) break;
    await sleep(100);
  }
  await evaluate('document.getElementById("btnContinue").click()');
  console.log('PASS: weak drill mode and next authored hand persist through phone reload and TODAY resume.');
  await evaluate('document.querySelector("[data-session-gym=pokergym]").click()');
  // Lesson may already be complete in this test save.
  await evaluate('if (!document.getElementById("scr-lesson").hidden) document.getElementById("btnSkip").click()');
  // The coach is a learning aid: applying its hold earns XP but never score,
  // never a streak step, and never credit toward the five-hand session.
  await evaluate('document.getElementById("btnAsk").click(); document.getElementById("btnApply").click()');
  const beforeCoached = await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1"))');
  await evaluate('document.getElementById("btnDraw").click()');
  const afterCoached = await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1"))');
  assert.equal(afterCoached.score, beforeCoached.score, 'A coached hold adds no decision score');
  assert.equal(afterCoached.streak, 0, 'A coached hold cannot build a streak');
  assert.ok(afterCoached.xp > beforeCoached.xp, 'A coached hold still teaches: XP is granted');
  assert.equal(afterCoached.activeSession.played, 0, 'A coached hand does not advance the five-hand session');

  // An un-hinted hand scores normally. Play the coach's exact hold (or a
  // deliberately bad one) without opening the coach, so the decision is made
  // clean but is still known to the harness.
  const playHold = mode => `(async () => {
    const { bestHold } = await import('../src/coach/videopoker.js');
    const names = ['spades', 'hearts', 'diamonds', 'clubs'];
    const cards = [...document.querySelectorAll('#zones [data-held]')];
    const hand = cards.map(node => {
      const [label] = node.getAttribute('aria-label').split(', ');
      const [rankText, suitName] = label.split(' of ');
      const r = rankText === 'A' ? 14 : rankText === 'K' ? 13 : rankText === 'Q' ? 12 : rankText === 'J' ? 11 : Number(rankText);
      return { r, s: names.indexOf(suitName) };
    });
    const best = bestHold(hand);
    const target = ${mode === 'worst'
      ? "(best.options.find(o => o.ev < best.ev - 1e-6) ?? best.options[best.options.length - 1]).holds"
      : 'best.holds'};
    cards.forEach((node, i) => {
      if ((node.dataset.held === 'true') !== Boolean(target[i])) node.click();
    });
    document.getElementById('btnDraw').click();
  })()`;
  await evaluate('document.getElementById("btnNext").click()');
  const scoreBeforeDraw = await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).score');
  await evaluate(playHold('best'));
  const afterFirst = await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1"))');
  assert.ok(afterFirst.score > scoreBeforeDraw, 'An un-hinted correct hold adds decision score');
  assert.equal(afterFirst.streak, 1, 'The correct decision starts the streak at 1');
  assert.equal(afterFirst.activeSession.played, 1, 'An un-hinted hand counts once toward the session');
  await evaluate('document.getElementById("btnMap").click()');
  assert.match(await evaluate('document.getElementById("btnResumeSession").textContent'), /1 of 5/);
  await evaluate('document.getElementById("btnResumeSession").click()');
  for (let hand = 0; hand < 3; hand++) {
    await evaluate('document.getElementById("btnNext").click()');
    await evaluate(playHold('best'));
  }
  // One deliberate miss so the session records a real held-pattern mistake.
  await evaluate('document.getElementById("btnNext").click()');
  await evaluate(playHold('worst'));
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).activeSession'), null);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).sessions[0].played'), 5);
  assert.equal(await evaluate('document.getElementById("btnNext").textContent'), 'Back to home');
  await evaluate('document.getElementById("btnNext").click()');
  assert.match(await evaluate('document.getElementById("shortSessions").textContent'), /[0-5]\/5 correct/);
  const suggested = await evaluate(`(async () => {
    const { recommendedPractice } = await import('../src/rpg/state.js');
    return recommendedPractice(JSON.parse(localStorage.getItem('pokergym:save:v1')));
  })()`);
  assert.ok(suggested, 'Missed completed-session decisions produce a practice recommendation');
  assert.match(await evaluate('document.getElementById("practiceRecommendation").textContent'), /recent accuracy is lowest/);
  assert.match(await evaluate(`document.querySelector('[data-session-gym="${suggested.gymId}"]').textContent`), /^Suggested/);
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Session results fit phone');
  const vpMiss = await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).mistakes.find(m => m.game === "videopoker")');
  assert.ok(vpMiss?.quiz, 'Actual video-poker miss captures original hold patterns');
  assert.equal(vpMiss.quiz.choices.length, 32);
  await evaluate(`(() => {
    document.getElementById('btnReview').click();
    const entry = [...document.querySelectorAll('#reviewCard .review-entry')].find(e => e.querySelector('[data-retry-card]'));
    const m = JSON.parse(localStorage.getItem('pokergym:save:v1')).mistakes.find(m => m.game === 'videopoker');
    [...entry.querySelectorAll('[data-retry-card]')].forEach((button, i) => { if (m.quiz.optimal[0][i] === '1') button.click(); });
    entry.querySelector('[data-retry-action="hold"]').click();
    entry.querySelector('[data-retry-action="hold"]').click();
    [...entry.querySelectorAll('[data-retry-card]')].forEach(b => b.click());
  })()`);
  await evaluate('document.getElementById("btnReviewDone").click()');
  assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).mistakes.find(m => m.game === "videopoker").retries'), { attempted: 1, correct: 1 });
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Original-hold retry fits phone');
  console.log('PASS: actual video-poker miss captures 32 original hold patterns; card selection scores once and fits phone.');
  assert.equal(await evaluate('document.getElementById("playerFeedback").hidden'), false, 'Feedback available after completed practice');
  assert.equal(await evaluate('document.getElementById("playerShare").hidden'), false);
  const invitation = await evaluate('document.getElementById("sharePreview").value');
  assert.match(invitation, /https:\/\/playpokergym\.com\/web\//);
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


  await evaluate(`document.getElementById('feedbackClarity').value = 'confusing'; document.getElementById('feedbackReturn').value = 'maybe'; document.getElementById('feedbackNote').value = 'More drills & clearer hints?';`);
  assert.equal(await evaluate("document.getElementById('feedbackPrice') || document.getElementById('feedbackRecurring')"), null, 'No pricing question is asked');
  await evaluate("document.getElementById('feedbackForm').requestSubmit()");
  assert.doesNotMatch(await evaluate('document.getElementById("feedbackPreview").value'), /US\$|subscri|month|unlock/i);
  assert.equal(await evaluate('document.getElementById("feedbackDraft").hidden'), false);
  assert.match(await evaluate('document.getElementById("feedbackDraft").textContent'), /Not sent/);
  const feedback = await evaluate(`({ href: document.getElementById('feedbackEmail').href, body: document.getElementById('feedbackPreview').value })`);
  assert.equal(new URL(feedback.href).searchParams.get('body'), feedback.body);
  const githubFeedback = new URL(await evaluate('document.getElementById("feedbackGithub").href'));
  assert.equal(githubFeedback.origin, 'https://github.com');
  assert.equal(githubFeedback.pathname, '/MeepTheTendie/pokergym/issues/new');
  assert.equal(githubFeedback.searchParams.get('body'), feedback.body);
  assert.match(await evaluate('document.getElementById("feedbackDraft").textContent'), /public; a GitHub account is required/i);
  assert.match(feedback.body, /More drills & clearer hints\?/);
  assert.doesNotMatch(feedback.body, /trainer|pokergym:save/i);
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Feedback form fits 390px');
  // Actual short sessions in the three previously locked games, with no badge injection.
  for (const gym of ['countyfair', 'villaoak', 'riverstone']) {
    if (gym === 'villaoak') await evaluate('window.baccaratTestRandom = Math.random; Math.random = () => 0.6');
    if (gym === 'countyfair' || gym === 'riverstone') await evaluate(`(async () => {
      const { seededRng } = await import('../src/cards.js');
      window.retryTestRandom = Math.random; Math.random = seededRng(7);
    })()`);
    await evaluate(`document.querySelector('[data-session-gym=${gym}]').click()`);
    await evaluate('if (!document.getElementById("scr-lesson").hidden) document.getElementById("btnSkip").click()');
    assert.equal(await evaluate('document.getElementById("scr-battle").hidden'), false);
    if (gym === 'countyfair' || gym === 'riverstone') await evaluate('Math.random = window.retryTestRandom; delete window.retryTestRandom');
    for (let step = 0; step < 20; step++) {
      if (!await evaluate('Boolean(JSON.parse(localStorage.getItem("pokergym:save:v1")).activeSession)')) break;
      await evaluate(`(() => {
        if (!document.getElementById('battleEndRow').hidden) {
          if ('${gym}' === 'villaoak') Math.random = () => ${step % 4 === 1 ? 0.1 : 0.9};
          document.getElementById('btnNext').click(); return;
        }
        if ('${gym}' === 'countyfair') document.getElementById('btnStand').click();
        else if ('${gym}' === 'villaoak') document.querySelector('#rowBet [data-quiz-correct=false]').click();
        else { for (let i = 0; i < 5; i++) document.querySelectorAll('[data-picked]')[i].click(); document.getElementById('btnConfirm').click(); }
      })()`);
    }
    const result = await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1"))');
    assert.equal(result.activeSession, null, `${gym} completes five hands`);
    assert.equal(result.sessions[0].gymId, gym);
    assert.equal(result.sessions[0].played, 5);
    if (gym === 'riverstone') {
      const captured = result.mistakes.find(m => m.game === 'holdem');
      assert.ok(captured?.quiz, 'Actual Holdem miss captures the original seven-card key');
      assert.equal(captured.quiz.choices.length, 21);
      await evaluate('document.getElementById("btnNext").click()');
      await evaluate(`(() => {
        document.getElementById('btnReview').click();
        const entry = document.querySelector('#reviewCard [data-retry-action="bestfive"]').closest('.review-entry');
        entry.querySelector('[data-retry-action="bestfive"]').click();
      })()`);
      assert.equal(await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).mistakes.find(m => m.game === "holdem").retries'), undefined, 'Incomplete selection is not scored');
      await evaluate(`(() => {
        document.getElementById('btnReview').click();
        const entry = document.querySelector('#reviewCard [data-retry-action="bestfive"]').closest('.review-entry');
        const m = JSON.parse(localStorage.getItem('pokergym:save:v1')).mistakes.find(m => m.game === 'holdem');
        [...entry.querySelectorAll('[data-retry-card]')].forEach((button, i) => { if (m.quiz.optimal[0][i] === '1') button.click(); });
        entry.querySelector('[data-retry-action="bestfive"]').click();
        entry.querySelector('[data-retry-action="bestfive"]').click();
        [...entry.querySelectorAll('[data-retry-card]')].forEach(button => button.click());
      })()`);
      assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).mistakes.find(m => m.game === "holdem").retries'), { attempted: 1, correct: 1 });
      await evaluate('document.getElementById("btnReviewDone").click()');
      assert.equal(await evaluate(`(async () => {
        const state = await import('../src/rpg/state.js');
        const profile = state.deserialize(localStorage.getItem('pokergym:save:v1'));
        return state.mistakeDue(profile.mistakes.find(m => m.game === 'holdem'), state.localDayKey());
      })()`), false, 'A correct review leaves the due queue');
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Seven-card retry fits phone');
      console.log('PASS: actual Holdem miss captures 21 selections; incomplete pick is unscored; best-five retry scores once and fits phone.');
    }
    if (gym === 'villaoak') {
      assert.equal(result.sessions[0].optimal, 0, 'Missed numeric and dealt baccarat answers score correctly across transitions');
      const captured = result.mistakes.filter(m => m.game === 'baccarat');
      assert.equal(captured.length, 5);
      for (const m of captured) {
        assert.ok(m.quiz.choices.includes(m.chosen));
        assert.ok(!m.quiz.optimal.includes(m.chosen));
      }
      assert.ok(captured.some(m => m.quiz.choices.includes('BANKER')));
      assert.ok(captured.some(m => m.quiz.choices.includes('YES, WORTHWHILE')));
      assert.ok(captured.some(m => m.quiz.choices.some(c => c.endsWith(' UNITS'))));
      await evaluate('Math.random = window.baccaratTestRandom; delete window.baccaratTestRandom');
    }
    if (gym === 'countyfair') {
      const captured = result.mistakes.filter(m => m.game === 'blackjack' && m.situation !== 'SYNTHETIC RETRY TEST' && m.quiz);
      assert.ok(captured.length > 0, 'Actual missed blackjack play captures a retry key');
      for (const m of captured) {
        assert.ok(m.quiz.choices.includes('stand'));
        assert.ok(!m.quiz.optimal.includes('stand'), 'Original missed action remains suboptimal');
      }
    }
    assert.deepEqual(result.badges, [], 'Training never awards or unlocks badges');
    if (gym !== 'riverstone') await evaluate('document.getElementById("btnNext").click()');
    assert.equal(await evaluate('document.querySelectorAll("[data-session-gym]").length'), 4);
    assert.equal(await evaluate('document.querySelector("[data-gym=riverstone]").disabled'), true);
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `${gym} results fit phone`);
    if (gym === 'villaoak') {
      const before = await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1"))');
      await evaluate(`document.getElementById('btnReview').click();
        const entry = document.querySelector('#reviewCard [data-retry-action]').closest('.review-entry');
        entry.querySelector('[data-retry-action]').click();
        [...entry.querySelectorAll('[data-retry-action]')].forEach(b => b.click())`);
      const after = await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1"))');
      assert.equal(after.mistakes[0].retries.attempted, 1, 'Baccarat scores only once per visit');
      for (const key of ['xp', 'streak', 'bestStreak', 'handsPlayed', 'handsOptimal', 'practice', 'sessions']) assert.deepEqual(after[key], before[key]);
      await evaluate('document.getElementById("btnReviewDone").click(); document.getElementById("btnBackup").click()');
      const saved = await evaluate('JSON.parse(document.getElementById("backupText").value)');
      assert.ok(saved.mistakes[0].box >= 1 && saved.mistakes[0].due, 'Baccarat box and due travel in backup');
      assert.equal(saved.mistakes[0].retries.attempted, 1);
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Baccarat retry labels fit phone');
    }

  }
  console.log('PASS: actual baccarat misses capture all three question types; scored retries, once-per-visit/reveal guards and portable counts verified.');
  console.log('PASS: scored blackjack retry, no repeat/revealed-answer scoring, independent persisted counts and portable backup; original gameplay captures legal choices and answer key.');
  console.log('PASS: all four games available to a new trainer; blackjack, baccarat and Hold’em five-hand sessions complete without badges; badge journey remains locked.');
  // Daily drill: a seeded five-hand mix of all four games, deterministic per day.
  const key = await evaluate(`(async () => { const { dailyKey } = await import('../src/rpg/daily.js'); return dailyKey(); })()`);
  const plan = await evaluate(`(async () => { const { dailyPlan } = await import('../src/rpg/daily.js'); return dailyPlan(${JSON.stringify(key)}); })()`);
  assert.equal(plan.length, DAILY_HANDS, 'Daily drill has five hands');
  assert.equal(new Set(plan.map(entry => entry.game)).size, 4, 'Daily drill includes all four games');
  assert.equal(await evaluate('document.getElementById("scr-map").hidden'), false, 'Daily drill begins from the map');
  assert.match(await evaluate('document.getElementById("todayState").textContent'), /Daily Drill #\d+ is ready/);
  const dailyMove = async () => {
    for (let attempt = 0; attempt < 60; attempt++) {
      if (!await evaluate('document.getElementById("battleEndRow").hidden')) return;
      await evaluate(`(() => {
        const $ = id => document.getElementById(id);
        if (!$('rowActions').hidden) {
          const stand = document.getElementById('btnStand');
          if (stand && !stand.disabled) { stand.click(); return; }
          const move = [...document.querySelectorAll('#rowActions button')].find(button => !button.disabled);
          if (move) { move.click(); return; }
        }
        if (!$('rowBet').hidden) {
          const wrong = document.querySelector('#rowBet [data-quiz-correct=false]');
          if (wrong) { wrong.click(); return; }
        }
        if (!$('rowPick').hidden) {
          const cards = document.querySelectorAll('[data-picked]');
          if (cards.length >= 5) { for (let i = 0; i < 5; i++) cards[i].click(); document.getElementById('btnConfirm').click(); return; }
        }
        if (!$('btnDraw').hidden && !$('btnDraw').disabled) { document.getElementById('btnDraw').click(); return; }
      })()`);
      await sleep(150);
    }
    throw new Error(`Daily hand ${await evaluate('document.querySelector(".battle-label").textContent')} did not settle`);
  };
  const goNextHand = async () => { await evaluate('document.getElementById("btnNext").click()'); };
  const label = async () => await evaluate('document.querySelector(".battle-label").textContent');
  await evaluate(`[...document.querySelectorAll('#todayActions button')].find(b => b.textContent.includes('Daily Drill #')).click()`);
  assert.equal(await evaluate('document.getElementById("scr-battle").hidden'), false);
  assert.match(await label(), /Daily Drill #\d+ · hand 1 of 5/);
  // Two hands, then quit to the map mid-progress and confirm the drill persists.
  await dailyMove(); await goNextHand();
  assert.match(await label(), /Daily Drill #\d+ · hand 2 of 5/);
  await dailyMove();
  await evaluate('document.getElementById("btnMap").click()');
  assert.equal(await evaluate('document.getElementById("scr-map").hidden'), false);
  assert.match(await evaluate('document.getElementById("todayState").textContent'), /Daily Drill #\d+ is in progress: 2 of 5 hands done/);
  assert.equal(await evaluate('[...document.querySelectorAll("#todayActions button")].find(b => b.textContent === "Resume Daily Drill")?.textContent'), 'Resume Daily Drill');
  const midProgress = await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).daily.progress');
  assert.equal(midProgress.key, key);
  assert.equal(midProgress.index, 2);
  assert.deepEqual(midProgress.plan, plan, "Unfinished drill preserves actual game IDs and seeds");
  assert.ok(midProgress.results.length === 2 && midProgress.results.every(v => typeof v === 'boolean'), 'Two hands of results persist on quit');
  // Resume and complete today's five hands.
  await evaluate('[...document.querySelectorAll("#todayActions button")].find(b => b.textContent === "Resume Daily Drill").click()');
  assert.match(await label(), /Daily Drill #\d+ · hand 3 of 5/);
  for (let hand = 2; hand < DAILY_HANDS; hand++) {
    await dailyMove();
    if (hand < DAILY_HANDS - 1) await goNextHand();
  }
  assert.equal(await evaluate('document.getElementById("btnNext").textContent'), 'Back to home');
  assert.match(await evaluate('document.getElementById("masterLine")._dataset.full'), /Daily Drill #\d+ complete: \d of 5 correct/);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).daily.progress'), null, 'Finished drill retires its resume progress');
  assert.equal(await evaluate(`(async () => {
    const daily = await import('../src/rpg/daily.js');
    const entry = JSON.parse(localStorage.getItem('pokergym:save:v1')).daily.history[0];
    return JSON.stringify(entry.games) === JSON.stringify(daily.dailyPlan(entry.key).map(hand => hand.game));
  })()`), true, 'Completed daily record captures the actual ordered game IDs');
  const beforeReplay = await evaluate(`(() => {
    const profile = JSON.parse(localStorage.getItem('pokergym:save:v1'));
    const tally = profile.daily.history[0].results.filter(Boolean).length;
    return { xp: profile.xp, score: profile.score, streak: profile.daily.streak, lastKey: profile.daily.lastKey, tally };
  })()`);
  await evaluate('document.getElementById("btnNext").click()');
  assert.equal(await evaluate('document.getElementById("scr-map").hidden'), false);
  await evaluate('document.getElementById("dailyHistory").open = true');
  const recordBeforeReplay = await evaluate('document.getElementById("dailyHistoryContent").textContent');
  assert.ok(recordBeforeReplay.includes(`Last 7 days: ${beforeReplay.tally}/5 correct`), 'Record displays the actual first score');
  assert.ok(recordBeforeReplay.includes(`${key} · ${beforeReplay.tally}/5 correct`), 'Record displays the local date');
  assert.match(recordBeforeReplay, /Previous 7 days: No completed drills/);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true,
    `Open record fits phone width: ${JSON.stringify(await evaluate(`({ width: innerWidth, scroll: document.documentElement.scrollWidth, overflowing: [...document.querySelectorAll('#scr-map *')].filter(e => e.getBoundingClientRect().right > innerWidth).map(e => [e.tagName, e.id, e.textContent.slice(0, 50)]) })`))}`);
  // A replay re-runs the same five hands but scores nothing new.
  await evaluate(`[...document.querySelectorAll('#todayActions button')].find(b => b.textContent === 'Replay Daily Drill').click()`);
  assert.match(await label(), /Daily Drill #\d+ · hand 1 of 5/);
  for (let hand = 0; hand < DAILY_HANDS; hand++) {
    await dailyMove();
    if (hand < DAILY_HANDS - 1) await goNextHand();
  }
  assert.equal(await evaluate('document.getElementById("btnNext").textContent'), 'Back to home');
  assert.match(await evaluate('document.getElementById("masterLine")._dataset.full'), /Practice replay done: \d of 5 correct\. No new XP or score today\./);
  const afterReplay = await evaluate(`(() => {
    const profile = JSON.parse(localStorage.getItem('pokergym:save:v1'));
    return { xp: profile.xp, score: profile.score, streak: profile.daily.streak, lastKey: profile.daily.lastKey };
  })()`);
  assert.equal(afterReplay.xp, beforeReplay.xp, 'A replay adds no XP');
  assert.equal(afterReplay.score, beforeReplay.score, 'A replay adds no score');
  assert.equal(afterReplay.streak, beforeReplay.streak, 'A replay leaves the streak untouched');
  assert.equal(afterReplay.lastKey, key, 'The replayed day is still today');
  await evaluate('document.getElementById("btnNext").click()');
  assert.equal(await evaluate('document.getElementById("dailyHistoryContent").textContent'), recordBeforeReplay, 'Replay cannot replace the displayed first score');
  const replayCopy = await evaluate(`(() => {
    const text = document.getElementById('dailySharePreview').value;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.dailyCopied = value; } } });
    [...document.querySelectorAll('#todayActions button')].find(b => b.textContent === 'Copy Daily result').click();
    return text;
  })()`);
  assert.match(replayCopy, /^Poker Gym Daily #\d+  \d\/5\n[🟩🟥]{5}\n🃏 (video poker|blackjack|baccarat|hold'em)( · (video poker|blackjack|baccarat|hold'em)){3}\nhttps:\/\/playpokergym\.com\/web\//u);
  const copiedText = await evaluate('window.dailyCopied');
  assert.equal(copiedText.replace(/&sh=\w+/, ''), replayCopy.replace(/&sh=\w+/, ''), 'Share copies the same seeded result text');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("pokergym:save:v1")).daily.history[0].key'), key, 'The first scored run stays the only history entry');
  console.log('PASS: seeded daily drill mixes all four games deterministically; mid-drill progress persists and resumes; a replay scores no new XP or score; the result shares cleanly.');
  // Haptics toggle persists beside the save across a reload.
  assert.equal(await evaluate('document.getElementById("btnHaptics").textContent'), 'Haptics on');
  await evaluate(`(() => {
    window.hapticCalls = { correct: 0, wrong: 0, total: 0 };
    const patternName = pattern => Array.isArray(pattern) ? pattern.join('-') : String(pattern);
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: pattern => {
      const name = patternName(pattern);
      window.hapticCalls.total++;
      if ({ 15: 'correct', '30-40-30': 'wrong' }[name]) window.hapticCalls[name]++;
      return true;
    } });
  })()`);
  await evaluate(`[...document.querySelectorAll('#todayActions button')].find(b => b.textContent === 'Replay Daily Drill').click()`);
  assert.match(await label(), /Daily Drill #\d+ · hand 1 of 5/);
  await dailyMove();
  assert.ok(await evaluate('window.hapticCalls.total') > 0, 'An enabled, unmuted hand buzzes once on settlement');
  assert.equal(await evaluate('document.getElementById("btnHaptics").textContent'), 'Haptics on');
  await evaluate('document.getElementById("btnHaptics").click()');
  assert.equal(await evaluate('document.getElementById("btnHaptics").textContent'), 'Haptics off');
  assert.equal(await evaluate('localStorage.getItem("pokergym:haptics")'), 'off');
  assert.equal(await evaluate('(async () => (await import("./haptics.js")).isHapticsEnabled())()'), false);
  const pausedCalls = await evaluate('window.hapticCalls.total');
  await goNextHand(); await dailyMove();
  assert.equal(await evaluate('window.hapticCalls.total'), pausedCalls, 'A disabled toggle silences the next hand');
  await send('Page.reload');
  await sleep(400); contextId = await gameContext(`${contextId.sessionId || ''}:${contextId.id}`);
  for (let i = 0; i < 60; i++) {
    if (await evaluate('document.getElementById("btnHaptics")?.textContent') === 'Haptics off') break;
    await sleep(100);
  }
  assert.equal(await evaluate('document.getElementById("btnHaptics").textContent'), 'Haptics off', 'The haptics toggle survives a reload');
  assert.equal(await evaluate('localStorage.getItem("pokergym:haptics")'), 'off');
  await evaluate('document.getElementById("btnHaptics").click()');
  assert.equal(await evaluate('localStorage.getItem("pokergym:haptics")'), 'on', 'Re-enabling restores the persisted toggle');
  console.log('PASS: haptics buzz once per settled hand, a dismissed toggle silences playback and persists across reloads.');
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
