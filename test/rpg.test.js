import test from 'node:test';
import assert from 'node:assert/strict';

import { CLASSES, CLASS_BY_ID, startingStats } from '../src/rpg/classes.js';
import { GYMS, gymForClass, isUnlocked, gymByOrder } from '../src/rpg/gyms.js';
import {
  createProfile, applyResult, awardBadge, canBattle,
  xpForLevel, levelFromXp, serialize, deserialize, handDifficulty, SAVE_VERSION,
} from '../src/rpg/state.js';
import { lessonFor, lessonIntro, lessonTips, LESSON_INTRO_PAGES, hasCompletedLesson, markLessonDone } from '../src/rpg/lessons.js';
import { evaluate5 } from '../src/evaluate.js';

test('every class maps to exactly one gym and every gym to one class', () => {
  const gyms = new Set(GYMS.map((g) => g.game));
  for (const cls of CLASSES) {
    assert.ok(gyms.has(cls.game), `${cls.id} has no gym for ${cls.game}`);
    const gym = gymForClass(cls.id);
    assert.equal(gym.game, cls.game);
    assert.equal(gym.order, CLASSES.indexOf(cls) + 1);
  }
  assert.equal(GYMS.length, CLASSES.length);
});

test('gyms are strictly ordered 1..n', () => {
  GYMS.forEach((g, i) => assert.equal(g.order, i + 1));
});

test('starting stats apply the class bias over the base of 1', () => {
  for (const cls of CLASSES) {
    const stats = startingStats(cls.id);
    for (const key of ['focus', 'nerve', 'read']) {
      assert.equal(stats[key], 1 + (cls.biases[key] ?? 0), `${cls.id}.${key}`);
    }
  }
});

test('createProfile rejects unknown classes', () => {
  assert.throws(() => createProfile('pikachu'), /unknown trainer class/);
});

test('level curve is monotonic and levelFromXp is consistent with it', () => {
  for (let lvl = 1; lvl < 40; lvl++) {
    assert.ok(xpForLevel(lvl + 1) > xpForLevel(lvl));
  }
  let cumulative = 0;
  for (let lvl = 1; lvl < 20; lvl++) {
    cumulative += xpForLevel(lvl);
    const r = levelFromXp(cumulative);
    assert.equal(r.level, lvl + 1, `XP through level ${lvl} should reach level ${lvl + 1}`);
    assert.equal(r.into, 0);
    assert.equal(r.needed, xpForLevel(lvl + 1));
  }
});

test('levelFromXp reports progress within a level', () => {
  const r = levelFromXp(xpForLevel(1) + 5);
  assert.equal(r.level, 2);
  assert.equal(r.into, 5);
});

test('a correct play awards XP and an incorrect play awards none', () => {
  const base = createProfile('scholar');
  const good = applyResult(base, { optimal: true });
  const bad = applyResult(base, { optimal: false });
  assert.ok(good.gained > 0);
  assert.equal(bad.gained, 0);
  assert.equal(good.profile.handsOptimal, 1);
  assert.equal(bad.profile.handsOptimal, 0);
});

test('a losing hand played correctly still pays full score and XP', () => {
  const base = createProfile('scholar');
  const winning = applyResult(base, { optimal: true });
  const r = applyResult(base, { optimal: true });
  assert.equal(r.gained, winning.gained);
  assert.equal(r.points, winning.points);
});

test('a correct decision scores and grows the streak; a wrong one only resets it', () => {
  const first = applyResult(createProfile('scholar'), { optimal: true, difficulty: 1 });
  assert.equal(first.points, 10);            // streak 0 -> x1.0
  assert.equal(first.profile.score, 10);
  assert.equal(first.profile.streak, 1);
  assert.equal(first.profile.bestStreak, 1);

  const second = applyResult(first.profile, { optimal: true, difficulty: 1 });
  assert.equal(second.points, 11);           // streak 1 -> x1.1
  assert.equal(second.profile.score, 21);
  assert.equal(second.profile.streak, 2);

  const wrong = applyResult(second.profile, { optimal: false });
  assert.equal(wrong.points, 0);
  assert.equal(wrong.profile.score, 21, 'score never decreases');
  assert.equal(wrong.profile.streak, 0);
  assert.equal(wrong.profile.bestStreak, 2);
});

test('the combo multiplier caps at a streak of nine', () => {
  let p = createProfile('scholar');
  for (let i = 0; i < 12; i++) p = applyResult(p, { optimal: true, difficulty: 1 }).profile;
  assert.equal(applyResult(p, { optimal: true, difficulty: 1 }).points, 19); // x1.9
});

test('stats only increase when a level is gained', () => {
  const base = createProfile('scholar');
  const noLevel = applyResult(base, { optimal: true, difficulty: 0.1 });
  assert.equal(noLevel.leveled, false);
  assert.deepEqual(noLevel.profile.stats, base.stats);

  const big = applyResult(base, { optimal: true, difficulty: 50 });
  assert.equal(big.leveled, true);
  assert.ok(big.profile.stats.focus > base.stats.focus);
});

test('applyResult does not mutate the original profile', () => {
  const base = createProfile('scholar');
  const snapshot = JSON.stringify(base);
  applyResult(base, { optimal: true });
  assert.equal(JSON.stringify(base), snapshot);
});

test('only gym one is unlocked with no badges', () => {
  assert.equal(isUnlocked(GYMS[0].id, []), true);
  for (const gym of GYMS.slice(1)) assert.equal(isUnlocked(gym.id, []), false);
});

test('beating a gym unlocks exactly the next one', () => {
  let profile = createProfile('scholar');
  for (let i = 0; i < GYMS.length; i++) {
    const gym = gymByOrder(i + 1);
    assert.equal(canBattle(profile, gym.id), true, `gym ${i + 1} should be open`);
    profile = awardBadge(profile, gym.id).profile;
    if (i + 1 < GYMS.length) {
      assert.equal(canBattle(profile, gymByOrder(i + 2).id), true);
    }
  }
  for (const gym of GYMS) assert.equal(canBattle(profile, gym.id), false, 'all cleared');
});

test('awarding a badge adds score and advances the current gym', () => {
  const base = createProfile('scholar');
  const first = GYMS[0];
  const { profile, badge } = awardBadge(base, first.id);
  assert.equal(badge.id, first.id);
  assert.deepEqual(profile.badges, [first.id]);
  assert.equal(profile.score, base.score + 250);
  assert.equal(profile.gym, GYMS[1].id);
});

test('awarding the same badge twice is a no-op', () => {
  const once = awardBadge(createProfile('scholar'), GYMS[0].id).profile;
  const twice = awardBadge(once, GYMS[0].id);
  assert.equal(twice.alreadyHad, true);
  assert.deepEqual(twice.profile.badges, once.badges);
  assert.equal(twice.profile.score, once.score);
});

test('higher ranked hands are worth more XP', () => {
  const royal = handDifficulty(evaluate5([
    { r: 14, s: 0 }, { r: 13, s: 0 }, { r: 12, s: 0 }, { r: 11, s: 0 }, { r: 10, s: 0 },
  ]));
  const junk = handDifficulty(evaluate5([
    { r: 2, s: 0 }, { r: 5, s: 1 }, { r: 9, s: 2 }, { r: 7, s: 3 }, { r: 13, s: 1 },
  ]));
  assert.ok(royal > junk);
  assert.ok(junk >= 1);
});

test('every playable gym has a valid lesson', () => {
  for (const gym of GYMS) {
    const lesson = lessonFor(gym.game);
    assert.ok(lesson, `${gym.game} has no lesson`);
    assert.equal(lesson.gym, gym.id);
    assert.ok(lesson.pages.length >= 8, `${gym.game} lesson is too short`);
    for (const page of lesson.pages) {
      assert.ok(page.who?.length > 0, `${gym.game} page missing speaker`);
      assert.ok(page.text?.length > 20, `${gym.game} page text too short`);
    }
  }
});

test('lesson lookup returns null for an unknown game', () => {
  assert.equal(lessonFor('keno'), null);
});

test('a lesson is marked done once and only once', () => {
  const base = createProfile('scholar');
  assert.equal(hasCompletedLesson(base, 'videopoker'), false);
  const once = markLessonDone(base, 'videopoker');
  assert.equal(hasCompletedLesson(once, 'videopoker'), true);
  const twice = markLessonDone(once, 'videopoker');
  assert.equal(twice.lessonsDone.length, 1);
});

test('completing one lesson does not mark the others', () => {
  const p = markLessonDone(createProfile('dealer'), 'videopoker');
  assert.equal(hasCompletedLesson(p, 'blackjack'), false);
});

test('markLessonDone does not mutate the original profile', () => {
  const base = createProfile('scholar');
  markLessonDone(base, 'videopoker');
  assert.equal(base.lessonsDone.length, 0);
});

test('a brand new profile has completed no lessons', () => {
  assert.deepEqual(createProfile('grinder').lessonsDone, []);
});

test('a lesson splits into a short intro and reusable tips', () => {
  for (const game of ['videopoker', 'blackjack', 'baccarat', 'holdem']) {
    const lesson = lessonFor(game);
    const intro = lessonIntro(lesson);
    const tips = lessonTips(lesson);
    assert.equal(intro.length, LESSON_INTRO_PAGES);
    assert.equal(intro.length + tips.length, lesson.pages.length);
    assert.deepEqual(intro, lesson.pages.slice(0, LESSON_INTRO_PAGES));
    assert.deepEqual(tips, lesson.pages.slice(LESSON_INTRO_PAGES));
    assert.ok(tips.length >= 4, `${game} needs at least four tips`);
  }
  assert.deepEqual(lessonIntro(null), []);
  assert.deepEqual(lessonTips(null), []);
});

test('save round-trips and rejects corrupt or stale data', () => {
  const profile = { ...createProfile('grinder'), badges: [GYMS[0].id], xp: 1234 };
  const back = deserialize(serialize(profile));
  assert.deepEqual(back, profile);
  assert.equal(deserialize(null), null);
  assert.equal(deserialize('{not json'), null);
  assert.equal(deserialize(JSON.stringify({ ...profile, version: 99 })), null);
  assert.equal(deserialize(JSON.stringify({ ...profile, classId: 'nope' })), null);
});

test('version 1 saves migrate to score without wiping progress', () => {
  const v1 = {
    version: 1, name: 'RED', classId: 'scholar', xp: 1234, chips: 3288,
    badges: [GYMS[0].id], stats: { focus: 6, nerve: 2, read: 3 }, gym: GYMS[1].id,
    handsPlayed: 40, handsOptimal: 30, lessonsDone: ['videopoker'],
    mistakes: [{ game: 'blackjack', situation: 'a', chosen: 'b', correction: 'c' }],
    sessions: [{ gymId: GYMS[0].id, played: 5, optimal: 4, completedAt: '2026-01-01T00:00:00.000Z' }],
  };
  const migrated = deserialize(JSON.stringify(v1));
  assert.equal(migrated.version, SAVE_VERSION);
  assert.equal(migrated.chips, undefined);
  assert.equal(migrated.score, 300);
  assert.equal(migrated.streak, 0);
  assert.equal(migrated.bestStreak, 0);
  assert.equal(migrated.xp, 1234);
  assert.deepEqual(migrated.badges, [GYMS[0].id]);
  assert.deepEqual(migrated.lessonsDone, ['videopoker']);
  assert.equal(migrated.mistakes.length, 1);
  assert.equal(migrated.sessions.length, 1);
});

test('difficulty scales XP payout', () => {
  const base = createProfile('scholar');
  const easy = applyResult(base, { optimal: true, difficulty: 1 });
  const hard = applyResult(base, { optimal: true, difficulty: 3 });
  assert.ok(hard.gained > easy.gained);
});
