import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, applyResult, practiceSummary, serialize, deserialize, canPractice, canBattle, awardBadge } from '../src/rpg/state.js';
import { recommendedPractice } from '../src/rpg/state.js';

test('next practice uses measured accuracy, ignores small samples and preserves unfinished sessions', () => {
  const base = createProfile('scholar');
  assert.equal(recommendedPractice(base), null);
  assert.equal(recommendedPractice(null), null);
  const profile = { ...base, practice: {
    videopoker: { played: 4, optimal: 0 },
    blackjack: { played: 10, optimal: 6 },
    baccarat: { played: 5, optimal: 2 },
    holdem: { played: 5, optimal: 5 },
  } };
  const before = JSON.stringify(profile);
  assert.equal(recommendedPractice(profile).gymId, 'villaoak');
  assert.equal(JSON.stringify(profile), before);
  assert.equal(recommendedPractice({ ...profile, activeSession: { gymId: 'countyfair' } }), null);
  assert.equal(recommendedPractice({ ...base, practice: { holdem: { played: 5, optimal: 5 } } }), null);
  // Compare exact ratios, not rounded display percentages; break equal ratios
  // by fewer decisions to give the smaller sample another session.
  assert.equal(recommendedPractice({ ...base, practice: {
    blackjack: { played: 200, optimal: 101 }, baccarat: { played: 100, optimal: 50 },
  } }).game, 'baccarat');
  assert.equal(recommendedPractice({ ...base, practice: {
    blackjack: { played: 10, optimal: 4 }, baccarat: { played: 5, optimal: 2 },
  } }).game, 'baccarat');
});

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

test('blackjack mistake retries retain original coach choices and independent scores', async () => {
  const { recordMistake, answerMistakeQuiz } = await import('../src/rpg/state.js');
  const { newRound, legalActions } = await import('../src/games/blackjack.js');
  const { bestAction } = await import('../src/coach/blackjack.js');
  const { readBackup, writeBackup } = await import('../src/rpg/backup.js');
  const { seededRng } = await import('../src/cards.js');
  const round = newRound(seededRng(7));
  assert.equal(round.settled, false);
  const coach = bestAction(round);
  const quiz = { choices: legalActions(round), optimal: coach.optimal };
  const base = recordMistake(createProfile('scholar'), {
    game: 'blackjack', situation: 'original decision', chosen: 'missed', correction: 'coach', quiz,
  });
  quiz.choices.pop();
  assert.deepEqual(base.mistakes[0].quiz.choices, legalActions(round), 'Capture must not share mutable round arrays');
  const correct = coach.optimal[0];
  const wrong = legalActions(round).find(a => !coach.optimal.includes(a));
  assert.ok(wrong, 'Non-natural round has a suboptimal action');
  let scored = answerMistakeQuiz(base, 0, wrong);
  scored = answerMistakeQuiz(scored, 0, correct);
  assert.deepEqual(scored.mistakes[0].retries, { attempted: 2, correct: 1 });
  assert.equal(base.mistakes[0].retries, undefined);
  assert.deepEqual(readBackup(writeBackup(scored)), scored);
  for (const key of ['xp', 'chips', 'handsPlayed', 'handsOptimal', 'badges', 'practice', 'sessions']) assert.deepEqual(scored[key], base[key]);
  for (const index of [-1, 0.5, 2]) assert.equal(answerMistakeQuiz(base, index, correct), base);
  assert.equal(answerMistakeQuiz(base, 0, 'surrender'), base);
  assert.equal(answerMistakeQuiz(createProfile('scholar'), 0, correct).mistakes, undefined);
});

test('invalid quiz answer keys cannot create retry scores or survive external restore', async () => {
  const { recordMistake, validMistakeQuiz, answerMistakeQuiz } = await import('../src/rpg/state.js');
  const { readBackup } = await import('../src/rpg/backup.js');
  const base = createProfile('scholar');
  for (const quiz of [null, {}, { choices: ['hit', 'hit'], optimal: ['hit'] }, { choices: ['hit', 'stand'], optimal: ['split'] }, { choices: ['hit', 'stand'], optimal: [] }]) {
    assert.equal(validMistakeQuiz(quiz), false);
    const p = recordMistake(base, { game: 'blackjack', situation: '16 vs 10', chosen: 'STAND', correction: 'HIT', quiz });
    assert.equal(p.mistakes[0].quiz, undefined);
    assert.equal(answerMistakeQuiz(p, 0, 'hit'), p);
    if (quiz) assert.throws(() => readBackup(JSON.stringify({ ...p, mistakes: [{ ...p.mistakes[0], quiz }] })));
  }
  const p = recordMistake(base, { game: 'blackjack', situation: '16 vs 10', chosen: 'STAND', correction: 'HIT', quiz: { choices: ['hit', 'stand'], optimal: ['hit'] } });
  for (const retries of [{ attempted: 1, correct: 2 }, { attempted: -1, correct: 0 }, { attempted: 1.5, correct: 0 }]) {
    assert.throws(() => readBackup(JSON.stringify({ ...p, mistakes: [{ ...p.mistakes[0], retries }] })));
  }
});

test('baccarat retries preserve all original question types and survive backup without rewards', async () => {
  const { quizFor } = await import('../src/coach/baccarat.js');
  const { recordMistake, answerMistakeQuiz, validMistakeQuiz } = await import('../src/rpg/state.js');
  const { readBackup, writeBackup } = await import('../src/rpg/backup.js');
  for (const roll of [0.1, 0.6, 0.9]) {
    const question = quizFor(() => roll);
    const wrong = question.options.find(a => a !== question.correct);
    const base = recordMistake(createProfile('scholar'), {
      game: 'baccarat', situation: question.prompt, chosen: wrong, correction: question.reason,
      quiz: { choices: question.options, optimal: [question.correct] },
    });
    assert.equal(validMistakeQuiz(base.mistakes[0].quiz, 'baccarat'), true);
    question.options.pop();
    assert.ok(base.mistakes[0].quiz.choices.includes(wrong));
    const scored = answerMistakeQuiz(answerMistakeQuiz(base, 0, wrong), 0, question.correct);
    assert.deepEqual(scored.mistakes[0].retries, { attempted: 2, correct: 1 });
    assert.deepEqual(readBackup(writeBackup(scored)), scored);
    for (const key of ['xp', 'chips', 'handsPlayed', 'handsOptimal', 'practice', 'sessions']) assert.deepEqual(scored[key], base[key]);
    assert.equal(answerMistakeQuiz(base, 0, 'invented'), base);
    assert.equal(validMistakeQuiz(base.mistakes[0].quiz, 'holdem'), false);
    for (const choices of [['', 'BANKER'], ['BANKER', 'BANKER'], [42, 'BANKER'], ['x'.repeat(81), 'BANKER']]) {
      const quiz = { choices, optimal: ['BANKER'] };
      assert.equal(validMistakeQuiz(quiz, 'baccarat'), false);
      assert.throws(() => readBackup(JSON.stringify({ ...base, mistakes: [{ ...base.mistakes[0], quiz }] })));
    }
  }
});


test('video poker recall scores exact original hold positions and preserves tied best holds', async () => {
  const { recordMistake, answerMistakeQuiz, validMistakeQuiz } = await import('../src/rpg/state.js');
  const { bestHold } = await import('../src/coach/videopoker.js');
  const { readBackup, writeBackup } = await import('../src/rpg/backup.js');
  const hand = [{ r: 2, s: 3 }, { r: 11, s: 2 }, { r: 5, s: 1 }, { r: 11, s: 3 }, { r: 8, s: 0 }];
  const coach = bestHold(hand);
  const quiz = { choices: Array.from({ length: 32 }, (_, mask) => mask.toString(2).padStart(5, '0')),
    optimal: coach.optimal.map(pattern => pattern.map(Number).join('')) };
  assert.deepEqual(quiz.optimal, ['01010']);
  const base = recordMistake(createProfile('scholar'), { game: 'videopoker', situation: '2C JD 5H JC 8S', chosen: 'NONE', correction: 'HOLD JACKS', quiz });
  quiz.optimal.pop();
  let scored = answerMistakeQuiz(base, 0, '11000');
  scored = answerMistakeQuiz(scored, 0, '01010');
  assert.deepEqual(scored.mistakes[0].retries, { attempted: 2, correct: 1 });
  assert.deepEqual(readBackup(writeBackup(scored)), scored);
  for (const key of ['xp', 'chips', 'handsPlayed', 'handsOptimal', 'practice', 'sessions']) assert.deepEqual(scored[key], base[key]);
  const tied = { ...base.mistakes[0].quiz, optimal: ['01010', '00000'] };
  assert.equal(validMistakeQuiz(tied, 'videopoker'), true);
  for (const action of tied.optimal) {
    const p = { ...base, mistakes: [{ ...base.mistakes[0], quiz: tied }] };
    assert.equal(answerMistakeQuiz(p, 0, action).mistakes[0].retries.correct, 1);
  }
  for (const bad of [{ choices: ['00000', '01010'], optimal: ['01010'] }, { ...tied, optimal: ['xxxxx'] }]) {
    assert.equal(validMistakeQuiz(bad, 'videopoker'), false);
    assert.throws(() => readBackup(JSON.stringify({ ...base, mistakes: [{ ...base.mistakes[0], quiz: bad }] })));
  }
});
