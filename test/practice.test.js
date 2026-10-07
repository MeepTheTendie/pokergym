import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, applyResult, practiceSummary, serialize, deserialize, canPractice, canBattle, awardBadge } from '../src/rpg/state.js';

test('practice accuracy measures decisions, not winning payouts, and persists', () => {
  const base = createProfile('scholar');
  const first = applyResult(base, { game: 'videopoker', optimal: true, payout: 0 }).profile;
  const second = applyResult(first, { game: 'videopoker', optimal: false, payout: 1000 }).profile;
  const summary = practiceSummary(deserialize(serialize(second)));
  assert.equal(summary[0].played, 2);
  assert.equal(summary[0].optimal, 1);
  assert.equal(summary[0].accuracy, 50);
  assert.equal(summary[1].accuracy, null);
  assert.equal(base.practice, undefined);
  assert.equal(first.practice.videopoker.played, 1);
});

test('legacy saves have no invented per-game results', () => {
  const legacy = { ...createProfile('scholar'), handsPlayed: 20, handsOptimal: 15 };
  assert.ok(practiceSummary(legacy).every(row => row.played === 0 && row.accuracy === null));
  assert.equal(applyResult(legacy, { game: 'unknown', optimal: true }).profile.practice, undefined);
});

test('earned gyms reopen for practice without duplicate badge rewards', () => {
  const base = createProfile('scholar');
  assert.equal(canPractice(base, 'pokergym'), false);
  assert.equal(canPractice(base, 'countyfair'), false);
  const earned = awardBadge(base, 'pokergym').profile;
  assert.equal(canBattle(earned, 'pokergym'), false);
  assert.equal(canPractice(earned, 'pokergym'), true);
  assert.equal(canPractice(earned, 'missing'), false);
  assert.equal(canPractice(null, 'pokergym'), false);
  const again = awardBadge(earned, 'pokergym');
  assert.equal(again.profile.chips, earned.chips);
  assert.deepEqual(again.profile.badges, ['pokergym']);
});

test('mistake notebook preserves old saves, limits history and survives resume', async () => {
  const { recordMistake } = await import('../src/rpg/state.js');
  const base = createProfile('scholar');
  let profile = base;
  for (let i = 0; i < 25; i++) profile = recordMistake(profile, {
    game: 'blackjack', situation: `Hand ${i}`, chosen: 'HIT', correction: 'STAND',
  });
  const resumed = deserialize(serialize(profile));
  assert.equal(resumed.mistakes.length, 20);
  assert.equal(resumed.mistakes[0].situation, 'Hand 24');
  assert.equal(resumed.mistakes[19].situation, 'Hand 5');
  assert.equal(base.mistakes, undefined);
  assert.equal(recordMistake(profile, { game: 'unknown' }), profile);
  assert.equal(recordMistake(profile, { game: 'blackjack', situation: '', chosen: 'HIT', correction: 'STAND' }), profile);
});

test('self review persists without changing earned progress or gameplay accuracy', async () => {
  const { recordMistake, markMistakeReviewed } = await import('../src/rpg/state.js');
  const base = recordMistake(createProfile('scholar'), {
    game: 'blackjack', situation: '16 vs 10', chosen: 'STAND', correction: 'HIT',
  });
  const reviewed = markMistakeReviewed(markMistakeReviewed(base, 0), 0);
  assert.equal(deserialize(serialize(reviewed)).mistakes[0].reviews, 2);
  assert.equal(base.mistakes[0].reviews, undefined);
  for (const key of ['xp', 'chips', 'handsPlayed', 'handsOptimal']) assert.equal(reviewed[key], base[key]);
  assert.equal(markMistakeReviewed(base, -1), base);
  assert.equal(markMistakeReviewed(base, 0.5), base);
  const legacy = createProfile('scholar');
  assert.equal(markMistakeReviewed(legacy, 0), legacy);
});


test('five-hand sessions resume, complete at five, and preserve badge rewards', async () => {
  const { beginSession, scoreSession } = await import('../src/rpg/state.js');
  const base = createProfile('scholar');
  assert.equal(beginSession(base, 'missing'), base);
  let profile = beginSession(base, 'pokergym', '2026-10-07T12:00:00Z');
  profile = scoreSession(profile, true);
  profile = deserialize(serialize(profile));
  assert.equal(profile.activeSession.played, 1);
  assert.equal(beginSession(profile, 'pokergym'), profile);
  for (let i = 0; i < 4; i++) profile = scoreSession(profile, false, '2026-10-08T12:00:00Z');
  assert.equal(profile.activeSession, null);
  assert.equal(profile.sessions[0].played, 5);
  assert.equal(profile.sessions[0].optimal, 1);
  assert.equal(profile.sessions[0].completedAt, '2026-10-08T12:00:00Z');
  assert.deepEqual(profile.badges, []);
  assert.equal(profile.xp, base.xp);
  assert.equal(profile.chips, base.chips);
  assert.equal(scoreSession(profile, true), profile);
  assert.equal(base.activeSession, undefined);
  for (let session = 0; session < 35; session++) {
    profile = beginSession(profile, 'pokergym');
    for (let hand = 0; hand < 5; hand++) profile = scoreSession(profile, true);
  }
  assert.equal(profile.sessions.length, 30);
});

test('new trainers can train every game without unlocking the badge journey', async () => {
  const { canTrain, beginSession, scoreSession } = await import('../src/rpg/state.js');
  const { GYMS } = await import('../src/rpg/gyms.js');
  const base = createProfile('scholar');
  assert.equal(canTrain(null, 'pokergym'), false);
  assert.equal(canTrain(base, 'missing'), false);
  assert.equal(beginSession(null, 'pokergym'), null);
  for (const gym of GYMS) {
    assert.equal(canTrain(base, gym.id), true);
    let profile = beginSession(base, gym.id);
    assert.equal(profile.activeSession.gymId, gym.id);
    assert.equal(beginSession(profile, 'pokergym'), profile, 'Cannot replace an unfinished session');
    profile = deserialize(serialize(profile));
    for (let hand = 0; hand < 5; hand++) profile = scoreSession(profile, true);
    assert.equal(profile.sessions[0].gymId, gym.id);
    assert.deepEqual(profile.badges, []);
    assert.equal(profile.xp, base.xp);
    assert.equal(profile.chips, base.chips);
    assert.equal(canBattle(profile, 'countyfair'), false);
    assert.equal(canPractice(profile, gym.id), false);
  }
});
