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
  assert.equal(a.dailyComplete(token, { correct: 4, number: 12, hands: 5 }), true);
  assert.equal(a.dailyComplete(token, { correct: 4, number: 12, hands: 5 }), false, 'a run completes once');
  assert.equal(count('open_trainer'), 1);
  assert.equal(count('start_daily'), 1);
  assert.equal(count('start_training'), 1);
  assert.equal(count('daily_complete'), 1);
  assert.equal(count('game_start'), 0);
  const start = last('start_daily');
  assert.equal(start.entry, 'daily_link');
  assert.equal(start.number, 12);
  assert.equal(start.scored, true);
  assert.equal(start.shared, true);
  assert.ok(start.run_id);
  assert.equal(start.event_version, 2);
  const done = last('daily_complete');
  assert.equal(done.correct, 4);
  assert.equal(done.number, 12);
  assert.equal(done.scored, true);
  assert.equal(done.hands_completed, 5);
  assert.equal(done.run_kind, 'daily', 'completion carries its run kind');
  assert.equal(done.entry, 'daily_link', 'daily completion carries its entry');
  assert.equal(done.run_id, start.run_id, 'completion carries its run id');
  assert.equal(done.event_version, 2);
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
  assert.equal(a.sessionComplete(token, { correct: 3, hands: 5 }), true);
  assert.equal(a.sessionComplete(token, { correct: 3, hands: 5 }), false);
  assert.equal(count('game_start'), 1);
  assert.equal(count('session_complete'), 1);
  const start = last('game_start');
  assert.equal(start.game, 'holdem');
  assert.equal(start.mode, 'session');
  assert.equal(start.run_id, token);
  const done = last('session_complete');
  assert.equal(done.game, 'holdem');
  assert.equal(done.correct, 3);
  assert.equal(done.run_kind, 'session');
  assert.equal(done.mode, 'session');
  assert.equal(done.run_id, token);
  assert.equal(done.hands_completed, 5);
  assert.equal(done.event_version, 2);
});

test('run events carry entry and first-decision timing', () => {
  const { a, last } = harness('reddit');
  const token = a.gameStart({ game: 'blackjack', mode: 'session', entry: 'practice_link' });
  a.handStarted({ game: 'blackjack', mode: 'session', entry: 'practice_link' });
  a.firstDecision(token, { ms: 1234, game: 'blackjack', mode: 'session' });
  a.handDealt(token, { handIndex: 1, handTotal: 5 });
  a.handComplete(token, { handIndex: 1, optimal: true });
  a.sessionComplete(token, { correct: 1 });
  assert.equal(last('start_training').entry, 'practice_link');
  assert.equal(last('game_start').entry, 'practice_link');
  assert.equal(last('time_to_first_decision').run_id, token);
  assert.equal(last('time_to_first_decision').run_kind, 'session');
  assert.equal(last('time_to_first_decision').entry, 'practice_link');
  assert.equal(last('time_to_first_decision').ms, 1234);
  assert.equal(last('hand_dealt').entry, 'practice_link');
  assert.equal(last('hand_complete').entry, 'practice_link');
  assert.equal(last('session_complete').entry, 'practice_link');
});

test('a Daily run carries entry through first decision and completion', () => {
  const { a, last } = harness('reddit');
  const token = a.startDaily({ entry: 'daily_link', number: 12, shared: true });
  a.firstDecision(token, { ms: 800, game: 'blackjack', mode: 'daily' });
  a.dailyComplete(token, { correct: 4, number: 12 });
  assert.equal(last('time_to_first_decision').run_id, token);
  assert.equal(last('time_to_first_decision').run_kind, 'daily');
  assert.equal(last('time_to_first_decision').entry, 'daily_link');
  assert.equal(last('daily_complete').entry, 'daily_link');
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

test('a resumed session can complete after hands 3-5 with a fresh run id', () => {
  const { a, count, last } = harness();
  const token = a.gameStart({ game: 'blackjack', mode: 'session', resumed: true });
  for (const handIndex of [3, 4, 5]) {
    a.handDealt(token, { handIndex, handTotal: 5, mode: 'session' });
    a.decisionMade(token, { handIndex, action: 'stand', mode: 'session' });
    a.handComplete(token, { handIndex, optimal: true, decisions: 1, difficulty: 1, mode: 'session' });
  }
  assert.equal(a.sessionComplete(token, { correct: 3, hands: 5 }), true);
  assert.equal(last('game_start').resumed, true);
  assert.equal(last('session_complete').hands_completed, 5);
  assert.equal(count('hand_complete'), 3);
  assert.equal(count('session_complete'), 1);
});

test('hand events share their run id and cannot be duplicated', () => {
  const { a, count, last, log } = harness('reddit');
  const token = a.gameStart({ game: 'blackjack', mode: 'session' });
  assert.equal(a.handDealt(token, { handIndex: 1, handTotal: 5, mode: 'session' }), true);
  assert.equal(a.decisionMade(token, { handIndex: 1, action: 'hit', mode: 'session' }), true);
  assert.equal(a.decisionMade(token, { handIndex: 1, action: 'stand', mode: 'session' }), false, 'one decision stage per hand');
  assert.equal(a.handComplete(token, { handIndex: 1, optimal: false, decisions: 2, difficulty: 2 }), true);
  assert.equal(a.handComplete(token, { handIndex: 1, optimal: false, decisions: 2, difficulty: 2 }), false, 'duplicate hand_complete');
  assert.equal(a.handComplete(token, { handIndex: 2, optimal: true, decisions: 1, difficulty: 1 }), true);

  const dealt = log.find(([n]) => n === 'hand_dealt')[1];
  assert.equal(dealt.run_id, token);
  assert.equal(dealt.run_kind, 'session');
  assert.equal(dealt.game, 'blackjack');
  assert.equal(dealt.hand_index, 1);
  assert.equal(dealt.hand_total, 5);
  assert.equal(dealt.event_version, 2);
  assert.equal(dealt.ref, 'reddit');
  const decision = last('decision_made');
  assert.equal(decision.run_id, token);
  assert.equal(decision.action, 'hit');
  const complete = last('hand_complete');
  assert.equal(complete.run_id, token);
  assert.equal(complete.hand_index, 2);
  assert.equal(complete.optimal, true);
  assert.equal(count('hand_dealt'), 1);
  assert.equal(count('decision_made'), 1);
  assert.equal(count('hand_complete'), 2);
});

test('a daily hand run uses the daily run id and mode', () => {
  const { a, last } = harness();
  const token = a.startDaily({ entry: 'map', number: 7 });
  a.handDealt(token, { handIndex: 3, handTotal: 5, mode: 'daily' });
  a.decisionMade(token, { handIndex: 3, action: 'stand', mode: 'daily' });
  a.handComplete(token, { handIndex: 3, optimal: true, decisions: 1, difficulty: 2, mode: 'daily' });
  assert.equal(last('hand_dealt').run_kind, 'daily');
  assert.equal(last('hand_dealt').game, 'daily');
  assert.equal(last('hand_dealt').hand_index, 3);
  assert.equal(last('hand_complete').mode, 'daily');
  assert.equal(last('hand_complete').run_id, token);
});

test('hand events after a run ends are rejected', () => {
  const { a, count } = harness();
  const first = a.gameStart({ game: 'baccarat', mode: 'session' });
  const second = a.gameStart({ game: 'holdem', mode: 'session' });
  assert.equal(a.handDealt(first, { handIndex: 1, handTotal: 5 }), false, 'abandoned run');
  assert.equal(a.decisionMade(first, { handIndex: 1, action: 'x' }), false);
  assert.equal(a.handComplete(first, { handIndex: 1 }), false);
  assert.equal(a.handDealt(second, { handIndex: 1, handTotal: 5 }), true);
  a.sessionComplete(second, { correct: 5, hands: 5 });
  assert.equal(a.handDealt(second, { handIndex: 2, handTotal: 5 }), false, 'closed run');
  assert.equal(count('hand_dealt'), 1);
  assert.equal(count('hand_complete'), 0);
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

test('app.js wires every trainer event through the tracker, once, in the right place', () => {
  // open_trainer is fired before any game_start for a fresh visitor (78a345f)
  {
    const openIdx = app.indexOf('analytics.openTrainer(');
    const ifIdx = app.indexOf('if (profile) { renderMap(); show(\'scr-map\'); }');
    assert.ok(openIdx > -1 && ifIdx > -1, 'expected markers present');
    assert.ok(openIdx < ifIdx, 'openTrainer must precede the profile/start block');
  }
  // app.js sends trainer lifecycle events only through the tracker
  {
    for (const name of Object.values(EVENTS)) {
      assert.doesNotMatch(app, new RegExp(`trackEvent\\?\\.\\('${name}'`), `${name} bypasses src/rpg/analytics.js`);
    }
    assert.equal(app.match(/analytics\.openTrainer\(/g)?.length, 1);
    assert.equal(app.match(/analytics\.startDaily\(/g)?.length, 1);
    assert.equal(app.match(/analytics\.gameStart\(/g)?.length, 1);
    assert.equal(app.match(/analytics\.handStarted\(/g)?.length, 1);
    assert.equal(app.match(/analytics\.handDealt\(/g)?.length, 1);
    assert.equal(app.match(/analytics\.decisionMade\(/g)?.length, 1);
    assert.equal(app.match(/analytics\.handComplete\(/g)?.length, 1);
    assert.equal(app.match(/analytics\.sessionComplete\(/g)?.length, 1);
    assert.equal(app.match(/analytics\.dailyComplete\(/g)?.length, 1);
  }
  // completions declare the five-hand meaning and the hand stages are wired
  {
    assert.match(app, /analytics\.sessionComplete\(sessionToken, \{ correct: session\.optimal, hands: SESSION_HANDS \}\)/);
    assert.match(app, /analytics\.dailyComplete\(run\.token, \{ correct: tally, number: run\.number, scored: run\.scored, hands: DAILY_HANDS \}\)/);
    const settle = app.slice(app.indexOf('function settleHand('), app.indexOf('function settleDailyHand('));
    assert.match(settle, /analytics\.handComplete\(/);
    const hand = app.slice(app.indexOf('function startHand('), app.indexOf('function startHand(') + 3000);
    assert.match(hand, /analytics\.handDealt\(/);
  }
  // start_daily lives inside startDaily, after its re-entry guard
  {
    const body = app.slice(app.indexOf('function startDaily('), app.indexOf('function loadDailyHand('));
    assert.ok(body.indexOf('if (!profile || dailyMode) return;') < body.indexOf('analytics.startDaily('));
  }
  // every Daily Drill entry path names itself
  {
    const calls = [...app.matchAll(/(?<![.\w])startDaily\(([^)]*)\)/g)].map((m) => m[1]).filter((arg) => !arg.startsWith('entry ='));
    assert.deepEqual(calls.sort(), ["'daily_link'", "'map'", "'map_resume'", "'recap'", "'replay'", "'replay'", 'entry'].sort());
    assert.match(app, /const entry = sharedDaily \? \(dailyLinkEntry \?\? 'title'\) : 'title';/);
    assert.match(app, /entryParams\.daily \? 'daily_link' : sharedDaily \? 'share_link' : null/);
  }
  // game_start fires in startGym and start_training in startHand
  {
    const gym = app.slice(app.indexOf('function startGym('), app.indexOf('function typewriter('));
    assert.match(gym, /analytics\.gameStart\(/);
    const hand = app.slice(app.indexOf('function startHand('), app.indexOf('function startHand(') + 200);
    assert.match(hand, /analytics\.handStarted\(/);
  }
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
  assert.match(loader, /pg_first_touch_v1/);
  assert.match(loader, /ATTRIBUTION\['first_' \+ sourceKey\]/);
  assert.match(loader, /instagram: 'instagram', ig: 'instagram'/);
  assert.match(loader, /if \(!entry\.ref && entry\.utm_source\)/);
});

test('docs list every event', () => {
  const doc = read('../docs/analytics-events.md');
  for (const name of [...Object.values(EVENTS), 'cta_click']) assert.match(doc, new RegExp('`' + name + '`'), name);
});

test('progress bar is driven by JS, not a hardcoded three-green rule', () => {
  const css = readFileSync(new URL('../web/styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /\.battle-pips i:nth-child\(-n\+3\)/);
  assert.match(css, /\.battle-pips i\.done/);
  const app = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
  assert.match(app, /function updateBattlePips/);
  assert.match(app, /updateBattlePips\(\)/);
});

test('a returning save with no finished session still reports a visit gap', () => {
  // Oct 22-23 opens carried returning=true with a null days_since_last_visit
  // because the save had no completed session or drill to date it from.
  assert.match(app, /createdDay = profile\.createdAt \? localDayKey\(new Date\(profile\.createdAt\)\)/);
  assert.match(app, /lastVisitDay = all\.length \? all\[all\.length - 1\] : createdDay;/);
});
