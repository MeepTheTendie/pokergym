import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dailyKey, seededRng, dailyPlan, dailyNumber, dayGap, DAILY_HANDS, DAILY_GAMES, dailySummary, dailySession, dailyPlanV1,
} from '../src/rpg/daily.js';
import { createProfile, completeDaily, dailyCompleted, setDailyProgress } from '../src/rpg/state.js';
import { readBackup, writeBackup } from '../src/rpg/backup.js';

const draws = (rng, n) => Array.from({ length: n }, () => rng());

test('daily summary uses calendar windows and attributes each decision to its seeded game', () => {
  const row = (key, correct) => ({ key, results: Array.from({ length: 5 }, (_, i) => i < correct) });
  const history = [row('2026-10-14', 3), row('2026-10-08', 5), row('2026-10-07', 2),
    row('2026-10-01', 1), row('2026-09-30', 5), row('2026-10-15', 5)];
  const summary = dailySummary(history, '2026-10-14');
  assert.deepEqual(summary.recent, { sessions: 2, hands: 10, correct: 8 });
  assert.deepEqual(summary.previous, { sessions: 2, hands: 10, correct: 3 });
  assert.deepEqual(summary.entries.map(row => row.key), ['2026-10-14', '2026-10-08', '2026-10-07', '2026-10-01']);
  for (const game of summary.games) {
    const expected = history.slice(0, 2).flatMap(row => dailyPlan(row.key).map((hand, i) => ({ ...hand, correct: row.results[i] }))).filter(hand => hand.game === game.game);
    assert.equal(game.hands, expected.length);
    assert.equal(game.correct, expected.filter(hand => hand.correct).length);
  }
});

test('daily summary ignores incomplete, malformed and duplicate scores without changing history', () => {
  const first = { key: '2026-10-14', results: [true, false, true, false, true] };
  const history = [first, { ...first, results: Array(5).fill(true) }, null,
    { key: '2026-10-13', results: [true] }, { key: '2026-10-12', results: [1, 1, 1, 1, 1] },
    { key: '2026-09-31', results: Array(5).fill(true) }];
  const original = structuredClone(history);
  assert.deepEqual(dailySummary(history, '2026-10-14').recent, { sessions: 1, hands: 5, correct: 3 });
  assert.equal(dailySummary(history, '2026-10-14').entries.length, 1);
  assert.deepEqual(history, original);
  assert.deepEqual(dailySummary(undefined, '2026-10-14').recent, { sessions: 0, hands: 0, correct: 0 });
});

test('dailyKey formats the local calendar date as YYYY-MM-DD', () => {
  assert.equal(dailyKey(new Date(2026, 9, 12)), '2026-10-12');
  assert.equal(dailyKey(new Date(2026, 0, 3)), '2026-01-03');
  assert.match(dailyKey(), /^\d{4}-\d{2}-\d{2}$/);
});

test('seededRng is deterministic for a string seed and varies across seeds', () => {
  assert.deepEqual(draws(seededRng('2026-10-12#0'), 8), draws(seededRng('2026-10-12#0'), 8));
  assert.notDeepEqual(draws(seededRng('2026-10-12#0'), 8), draws(seededRng('2026-10-12#1'), 8));
  for (const value of draws(seededRng('seed'), 32)) {
    assert.ok(value >= 0 && value < 1, 'rng stays in [0, 1)');
  }
});

test('dailyPlan is identical for a key and mixes all four games into five hands', () => {
  const plan = dailyPlan('2026-10-12');
  assert.deepEqual(plan, dailyPlan('2026-10-12'));
  assert.equal(plan.length, DAILY_HANDS);
  assert.deepEqual(plan.map((entry, i) => entry.seed),
    Array.from({ length: DAILY_HANDS }, (_, i) => `2026-10-12#${i}`));
  assert.equal(new Set(plan.map(entry => entry.game)).size, DAILY_GAMES.length);
  assert.ok(plan.every(entry => DAILY_GAMES.includes(entry.game)));
  assert.notDeepEqual(plan, dailyPlan('2026-10-13'));
});

test('dailyNumber counts days since the fixed launch date', () => {
  assert.equal(dailyNumber('2026-01-01'), 1);
  assert.equal(dailyNumber('2026-01-02'), 2);
  assert.equal(dayGap('2026-10-12', '2026-10-10'), 2);
});

test('three consecutive days build a streak of three', () => {
  let profile = createProfile('scholar');
  for (const key of ['2026-01-01', '2026-01-02', '2026-01-03']) {
    profile = completeDaily(profile, key, [true, true, true, true, true]);
  }
  assert.equal(profile.daily.streak, 3);
  assert.equal(profile.daily.best, 3);
  assert.equal(profile.daily.lastKey, '2026-01-03');
  assert.equal(profile.daily.history.length, 3);
  assert.deepEqual(profile.daily.history[0].results, [true, true, true, true, true]);
});

test('a single missed day is forgiven once as a rest day', () => {
  let profile = createProfile('scholar');
  profile = completeDaily(profile, '2026-01-01', [true, true, true, true, true]);
  profile = completeDaily(profile, '2026-01-03', [true, false, true, true, false]);
  assert.equal(profile.daily.streak, 2, 'rest day keeps the streak alive and counts the new day');
  assert.equal(profile.daily.restKey, '2026-01-03');

  // The rest day has a seven-day cooldown: another single miss inside that
  // window resets instead of being forgiven.
  profile = completeDaily(profile, '2026-01-05', [true, true, true, true, true]);
  assert.equal(profile.daily.streak, 1);
  assert.equal(profile.daily.restKey, '2026-01-03', 'cooldown rest key is preserved');
});

test('two missed days reset the streak to one', () => {
  let profile = createProfile('scholar');
  profile = completeDaily(profile, '2026-01-01', [true, true, true, true, true]);
  profile = completeDaily(profile, '2026-01-04', [true, true, true, true, true]);
  assert.equal(profile.daily.streak, 1);
  assert.equal(profile.daily.best, 1);
});

test('finishing the same day again keeps the streak and does not duplicate history', () => {
  let profile = createProfile('scholar');
  profile = completeDaily(profile, '2026-01-01', [true, true, true, true, true]);
  const again = completeDaily(profile, '2026-01-01', [false, false, false, false, false]);
  assert.equal(again.daily.streak, 1);
  assert.equal(again.daily.history.length, 1);
  assert.deepEqual(again.daily.history[0].results, [true, true, true, true, true]);
  assert.equal(dailyCompleted(profile, '2026-01-01'), true);
  assert.equal(dailyCompleted(profile, '2026-01-02'), false);
});

test('history caps at sixty entries, newest first', () => {
  let profile = createProfile('scholar');
  const start = new Date(Date.UTC(2026, 0, 1));
  for (let i = 0; i < 65; i++) {
    const day = new Date(start.getTime() + i * 86400000);
    profile = completeDaily(profile, dailyKey(day), [true, true, true, true, true]);
  }
  assert.equal(profile.daily.history.length, 60);
  assert.equal(profile.daily.streak, 65);
  assert.equal(profile.daily.best, 65);
});

test('an in-progress drill round-trips through a backup and clears on completion', () => {
  let profile = createProfile('scholar');
  profile = setDailyProgress(profile, { key: '2026-01-01', index: 2, results: [true, false] });
  assert.deepEqual(readBackup(writeBackup(profile)), profile);
  profile = completeDaily(profile, '2026-01-01', [true, false, true, true, false]);
  assert.equal(profile.daily.progress, null);
  assert.deepEqual(readBackup(writeBackup(profile)), profile);
});

test('backups carry the daily field and reject malformed daily records', () => {
  let profile = createProfile('scholar');
  profile = completeDaily(profile, '2026-01-01', [true, true, true, true, true]);
  assert.deepEqual(readBackup(writeBackup(profile)).daily, profile.daily);
  for (const patch of [
    { lastKey: 'not-a-date' }, { streak: -1 }, { best: -1 }, { best: 0, streak: 4 },
    { restKey: 7 }, { history: [{ key: '2026-01-01', results: [true, false] }] },
    { history: [{ key: 'bad', results: [true, true, true, true, true] }] },
    { progress: { key: '2026-01-01', index: 3, results: [true, true] } },
  ]) {
    assert.throws(() => readBackup(JSON.stringify({ ...profile, daily: { ...profile.daily, ...patch } })),
      /Invalid backup/);
  }
  const legacy = createProfile('scholar');
  delete legacy.daily;
  assert.doesNotThrow(() => readBackup(writeBackup(legacy)));
});


test('captured daily games survive backup and override reconstructed attribution', () => {
  const key = '2026-10-14';
  const games = ['blackjack', 'blackjack', 'blackjack', 'blackjack', 'holdem'];
  let profile = completeDaily(createProfile('scholar'), key, [true, false, true, false, true], games);
  games[0] = 'baccarat'; // caller changes cannot relabel the saved record
  profile = readBackup(writeBackup(profile));
  assert.deepEqual(dailySummary(profile.daily.history, key).games, [
    { game: 'videopoker', correct: 0, hands: 0 },
    { game: 'blackjack', correct: 2, hands: 4 },
    { game: 'baccarat', correct: 0, hands: 0 },
    { game: 'holdem', correct: 1, hands: 1 },
  ]);
  const old = structuredClone(profile);
  delete old.daily.history[0].games;
  assert.doesNotThrow(() => readBackup(writeBackup(old)));
  assert.equal(dailySummary(old.daily.history, key).recent.hands, 5);
  for (const invalid of [null, [], ['blackjack'], Array(5).fill('unknown')]) {
    const broken = structuredClone(profile);
    broken.daily.history[0].games = invalid;
    assert.throws(() => readBackup(JSON.stringify(broken)), /Invalid backup/);
    assert.equal(dailySummary(broken.daily.history, key).recent.hands, 0);
    assert.equal(completeDaily(createProfile('scholar'), key, Array(5).fill(true), invalid).daily.history.length, 0);
  }
});


test('unfinished daily plans survive changes, mutation and backup restore', () => {
  const key = '2026-10-14';
  const plan = Array.from({ length: 5 }, (_, i) => ({ game: 'blackjack', seed: `saved-${i}` }));
  const progress = { key, plan, index: 2, results: [true, false] };
  const profile = setDailyProgress(createProfile('scholar'), progress);
  progress.plan[2].game = 'holdem';
  progress.results[0] = false;
  const restored = readBackup(writeBackup(profile));
  const resumed = dailySession(key, restored.daily.progress);
  assert.equal(resumed.plan[2].game, 'blackjack');
  assert.equal(resumed.plan[2].seed, 'saved-2');
  assert.deepEqual(resumed.results, [true, false]);
  resumed.plan[2].seed = 'changed';
  resumed.results[0] = false;
  assert.equal(restored.daily.progress.plan[2].seed, 'saved-2');
  assert.equal(restored.daily.progress.results[0], true);
  assert.deepEqual(dailySession(key, { key, index: 2, results: [true, false] }).plan, dailyPlanV1(key));
  assert.equal(dailySession('2026-10-15', restored.daily.progress).index, 0);
  for (const invalid of [null, [], Array(5).fill({ game: 'unknown', seed: 'x' }),
    Array(5).fill({ game: 'blackjack', seed: '' }), Array(5).fill({ game: 'blackjack', seed: 1 })]) {
    const broken = structuredClone(restored);
    broken.daily.progress.plan = invalid;
    assert.throws(() => readBackup(JSON.stringify(broken)), /Invalid backup/);
    assert.equal(dailySession(key, broken.daily.progress).index, 0);
  }
});
