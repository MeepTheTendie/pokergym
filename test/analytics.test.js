import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAnalytics, EVENTS, GAMES } from '../src/rpg/analytics.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

function harness(ref = 'youtube') {
  const log = [];
  const a = createAnalytics({ send: (name, props) => log.push([name, props]), ref: () => ref });
  const count = (name) => log.filter(([n]) => n === name).length;
  const last = (name) => log.filter(([n]) => n === name).at(-1)?.[1];
  return { a, log, count, last };
}

test('open_trainer fires once per page load', () => {
  const { a, count, last } = harness();
  assert.equal(a.openTrainer({ entry: 'daily_link', returning: false }), true);
  assert.equal(a.openTrainer({ entry: 'direct' }), false);
  assert.equal(count('open_trainer'), 1);
  assert.deepEqual(last('open_trainer'), { entry: 'daily_link', returning: false, ref: 'youtube' });
});

test('start_training fires on the first hand only, whatever the mode', () => {
  const { a, count, last } = harness();
  a.handStarted({ game: 'baccarat', mode: 'daily' });
  a.handStarted({ game: 'holdem', mode: 'daily' });
  a.handStarted({ game: 'blackjack', mode: 'session' });
  assert.equal(count('start_training'), 1);
  assert.deepEqual(last('start_training'), { game: 'baccarat', mode: 'daily', ref: 'youtube' });
});

test('flow: ?daily=1 link -> button -> five hands -> one start_daily and one daily_complete', () => {
  const { a, count, last } = harness();
  a.openTrainer({ entry: 'daily_link', returning: false });
  const token = a.startDaily({ entry: 'daily_link', number: 12, shared: true });
  for (let i = 0; i < 5; i++) a.handStarted({ game: 'blackjack', mode: 'daily' });
  assert.equal(a.dailyComplete(token, { correct: 4, number: 12 }), true);
  assert.equal(a.dailyComplete(token, { correct: 4, number: 12 }), false, 'a run completes once');
  assert.equal(count('open_trainer'), 1);
  assert.equal(count('start_daily'), 1);
  assert.equal(count('start_training'), 1);
  assert.equal(count('daily_complete'), 1);
  assert.equal(count('game_start'), 0);
  assert.deepEqual(last('start_daily'), { entry: 'daily_link', number: 12, resumed: false, scored: true, shared: true, ref: 'youtube' });
  assert.deepEqual(last('daily_complete'), { correct: 4, number: 12, scored: true, ref: 'youtube' });
});

test('flow: share-grid link, resume and replay each fire their own start_daily', () => {
  const { a, count, log } = harness('share');
  a.startDaily({ entry: 'share_link', number: 3, shared: true });
  // tab closed mid-run; next page load resumes from the map
  const b = harness('share');
  const t2 = b.a.startDaily({ entry: 'map_resume', number: 3, resumed: true });
  b.a.dailyComplete(t2, { correct: 5, number: 3 });
  const t3 = b.a.startDaily({ entry: 'replay', number: 3, scored: false });
  b.a.dailyComplete(t3, { correct: 2, number: 3, scored: false });
  assert.equal(count('start_daily'), 1);
  assert.equal(log[0][1].entry, 'share_link');
  assert.equal(b.count('start_daily'), 2);
  assert.equal(b.count('daily_complete'), 2);
  assert.equal(b.log.find(([n]) => n === 'start_daily')[1].resumed, true);
  assert.equal(b.last('daily_complete').scored, false);
});

test('flow: five-hand session pairs game_start with session_complete', () => {
  const { a, count, last } = harness('x');
  const token = a.gameStart({ game: 'holdem', mode: 'session' });
  assert.ok(token);
  assert.equal(a.sessionComplete(token, { correct: 3 }), true);
  assert.equal(a.sessionComplete(token, { correct: 3 }), false);
  assert.equal(count('game_start'), 1);
  assert.equal(count('session_complete'), 1);
  assert.deepEqual(last('game_start'), { game: 'holdem', mode: 'session', resumed: false, ref: 'x' });
  assert.deepEqual(last('session_complete'), { game: 'holdem', correct: 3, ref: 'x' });
});

test('a completion never fires without its live start', () => {
  const { a, count } = harness();
  assert.equal(a.sessionComplete(null, { correct: 5 }), false);
  assert.equal(a.dailyComplete(undefined, { correct: 5 }), false);
  const stale = a.gameStart({ game: 'blackjack', mode: 'session' });
  const fresh = a.gameStart({ game: 'baccarat', mode: 'session' });   // abandons the first
  assert.equal(a.sessionComplete(stale, { correct: 5 }), false);
  assert.equal(a.sessionComplete(fresh, { correct: 5 }), true);
  const d = a.startDaily({ entry: 'map' });
  assert.equal(a.sessionComplete(d, {}), false, 'a daily token cannot close a session');
  assert.equal(count('session_complete'), 1);
  assert.equal(count('daily_complete'), 0);
});

test('game_start only accepts the four games', () => {
  const { a, count } = harness();
  for (const game of GAMES) assert.ok(a.gameStart({ game, mode: 'session' }));
  assert.equal(a.gameStart({ game: 'daily' }), null);
  assert.equal(a.gameStart({}), null);
  assert.equal(count('game_start'), 4);
});

test('no ref means no ref property; a throwing sink never breaks play', () => {
  const log = [];
  const a = createAnalytics({ send: (n, p) => log.push(p), ref: () => null });
  a.openTrainer({ entry: 'direct' });
  assert.equal('ref' in log[0], false);
  const b = createAnalytics({ send: () => { throw new Error('blocked'); } });
  assert.doesNotThrow(() => b.startDaily({ entry: 'title' }));
});

/* ---- wiring in web/app.js: every entry path goes through the tracker ---- */

const app = read('../web/app.js');

test('app.js sends trainer lifecycle events only through the tracker', () => {
  for (const name of Object.values(EVENTS)) {
    assert.doesNotMatch(app, new RegExp(`trackEvent\\?\\.\\('${name}'`), `${name} bypasses src/rpg/analytics.js`);
  }
  assert.equal(app.match(/analytics\.openTrainer\(/g)?.length, 1);
  assert.equal(app.match(/analytics\.startDaily\(/g)?.length, 1);
  assert.equal(app.match(/analytics\.gameStart\(/g)?.length, 1);
  assert.equal(app.match(/analytics\.handStarted\(/g)?.length, 1);
  assert.equal(app.match(/analytics\.sessionComplete\(/g)?.length, 1);
  assert.equal(app.match(/analytics\.dailyComplete\(/g)?.length, 1);
});

test('start_daily lives inside startDaily, after its re-entry guard', () => {
  const body = app.slice(app.indexOf('function startDaily('), app.indexOf('function loadDailyHand('));
  assert.ok(body.indexOf('if (!profile || dailyMode) return;') < body.indexOf('analytics.startDaily('));
});

test('every Daily Drill entry path names itself', () => {
  const calls = [...app.matchAll(/(?<![.\w])startDaily\(([^)]*)\)/g)].map((m) => m[1]).filter((arg) => !arg.startsWith('entry ='));
  assert.deepEqual(calls.sort(), ["'map'", "'map_resume'", "'replay'", 'entry'].sort());
  assert.match(app, /const entry = sharedDaily \? \(dailyLinkEntry \?\? 'title'\) : 'title';/);
  assert.match(app, /entryParams\.daily \? 'daily_link' : sharedDaily \? 'share_link' : null/);
});

test('game_start fires in startGym and start_training in startHand', () => {
  const gym = app.slice(app.indexOf('function startGym('), app.indexOf('function typewriter('));
  assert.match(gym, /analytics\.gameStart\(/);
  const hand = app.slice(app.indexOf('function startHand('), app.indexOf('function startHand(') + 200);
  assert.match(hand, /analytics\.handStarted\(/);
});

test('landing clicks do not reuse in-app event names', () => {
  const landing = read('../web/landing.html');
  assert.doesNotMatch(landing, /data-track="(open_trainer|start_training|start_daily|game_start)"/);
  assert.match(landing, /data-track="cta_click" data-cta="start_daily"/);
});

test('the loader exposes its attribution snapshot read-only to the trainer', () => {
  const loader = read('../web/posthog-loader.js');
  assert.match(loader, /window\.__pgAttribution = ATTRIBUTION;/);
  assert.match(app, /window\.__pgAttribution\?\.ref/);
});

test('docs list every event', () => {
  const doc = read('../docs/analytics-events.md');
  for (const name of [...Object.values(EVENTS), 'cta_click']) assert.match(doc, new RegExp('`' + name + '`'), name);
});
