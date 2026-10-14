import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drillSequence, drillBank } from '../src/rpg/drills.js';

test('repeat master sessions cover the full authored banks without repeating within a session', () => {
  for (const game of ['blackjack', 'videopoker']) {
    const seen = new Set();
    for (let session = 0; session < drillBank(game).length; session++) {
      const sequence = drillSequence({ practice: { [game]: { played: session * 5 } } }, game, 'master');
      assert.equal(sequence.length, 5);
      assert.equal(new Set(sequence).size, 5);
      sequence.forEach(drill => seen.add(drill));
    }
    assert.equal(seen.size, drillBank(game).length);
  }
});

test('weak sessions retain missed-type priority and their captured order as mistakes change', () => {
  const profile = { practice: { blackjack: { played: 5 } }, mistakes: [{ game: 'blackjack', type: 'soft' }] };
  const sequence = drillSequence(profile, 'blackjack', 'weak');
  const labels = sequence.map(drill => drill.label);
  assert.ok(sequence.slice(0, 4).every(drill => drill.type === 'soft'));
  assert.notEqual(sequence[0], drillBank('blackjack')[0]);
  profile.mistakes.push(...Array.from({ length: 3 }, () => ({ game: 'blackjack', type: 'pair' })));
  assert.deepEqual(sequence.map(drill => drill.label), labels);
  assert.equal(drillSequence(profile, 'blackjack', 'weak')[0].type, 'pair');
});

test('drill sequence accepts legacy profiles and rejects invalid rotation totals', () => {
  const initial = drillSequence(null, 'videopoker', 'master');
  assert.deepEqual(initial, drillBank('videopoker').slice(0, 5));
  assert.deepEqual(drillSequence({ practice: { videopoker: { played: -1 } } }, 'videopoker', 'master'), initial);
  assert.deepEqual(drillSequence(null, 'unknown', 'master'), []);
});

test('coached hands earn XP and practice history but never score, streak, or rank credit', async () => {
  const { createProfile, applyResult, masteryRank } = await import('../src/rpg/state.js');
  const base = { ...createProfile('scholar'), streak: 5 };

  const coachedHit = applyResult(base, { optimal: true, difficulty: 1, game: 'blackjack', coached: true });
  assert.equal(coachedHit.points, 0, 'a coached correct hand scores nothing');
  assert.ok(coachedHit.gained > 0, 'but it still teaches: XP is granted');
  assert.equal(coachedHit.profile.streak, 5, 'a coached hand cannot build a streak');
  assert.equal(coachedHit.profile.score, base.score);
  assert.equal(coachedHit.profile.handsOptimal, base.handsOptimal + 1);
  assert.equal(coachedHit.profile.practice.blackjack.played, 1);
  assert.equal(coachedHit.profile.practice.blackjack.optimal, 1);
  assert.equal(coachedHit.profile.practice.blackjack.recent, undefined, 'coached hands never enter the ranked record');

  const coachedMiss = applyResult(base, { optimal: false, game: 'blackjack', coached: true });
  assert.equal(coachedMiss.points, 0);
  assert.equal(coachedMiss.profile.streak, 5, 'a coached miss cannot break a streak either');
  assert.equal(masteryRank(coachedMiss.profile, 'blackjack'), null);
});

test('mastery ranks come from the last twenty un-hinted decisions', async () => {
  const { createProfile, applyResult, masteryRank } = await import('../src/rpg/state.js');
  let profile = createProfile('scholar');
  for (let i = 0; i < 9; i++) profile = applyResult(profile, { optimal: true, game: 'blackjack' }).profile;
  assert.equal(masteryRank(profile, 'blackjack'), null, 'a rank needs a ten-hand sample');
  profile = applyResult(profile, { optimal: true, game: 'blackjack' }).profile;
  assert.equal(masteryRank(profile, 'blackjack'), 'gold');

  // Ten more hands at 60% drag the rolling accuracy to 16/20 = silver.
  for (let i = 0; i < 10; i++) profile = applyResult(profile, { optimal: i < 6, game: 'blackjack' }).profile;
  assert.equal(profile.practice.blackjack.recent.length, 20);
  assert.equal(masteryRank(profile, 'blackjack'), 'silver');
});

test('save sanitizing keeps rolling rank history and missed-type tags', async () => {
  const { createProfile, applyResult, recordMistake, sanitizeProfile } = await import('../src/rpg/state.js');
  let profile = applyResult(createProfile('scholar'), { optimal: true, game: 'blackjack' }).profile;
  profile = recordMistake(profile, { game: 'blackjack', situation: 'S', chosen: 'C', correction: 'X', type: 'soft' });
  const clean = sanitizeProfile(JSON.parse(JSON.stringify(profile)));
  assert.deepEqual(clean.practice.blackjack.recent, [true]);
  assert.equal(clean.mistakes[0].type, 'soft');
});

test('blackjack drills deal clean, decidable hands the coach can grade', async () => {
  const { newRound } = await import('../src/games/blackjack.js');
  const { bestAction } = await import('../src/coach/blackjack.js');
  const { BLACKJACK_DRILLS } = await import('../src/rpg/drills.js');
  assert.ok(BLACKJACK_DRILLS.length >= 10);
  for (const drill of BLACKJACK_DRILLS) {
    const round = newRound(Math.random, { player: drill.player, dealer: [drill.dealer, drill.hole] });
    assert.equal(round.settled, false, `${drill.label} must reach a real decision`);
    const answer = bestAction(round);
    assert.ok(answer.available.includes(answer.action), `${drill.label} answer must be a legal action`);
  }
});

test('video poker drills deal five distinct cards the coach can grade', async () => {
  const { newRound } = await import('../src/games/videopoker.js');
  const { bestHold } = await import('../src/coach/videopoker.js');
  const { VIDEOPOKER_DRILLS } = await import('../src/rpg/drills.js');
  assert.ok(VIDEOPOKER_DRILLS.length >= 8);
  for (const drill of VIDEOPOKER_DRILLS) {
    const distinct = new Set(drill.hand.map(card => `${card.r}:${card.s}`));
    assert.equal(distinct.size, 5, `${drill.label} must not repeat a card`);
    const round = newRound(Math.random, { hand: drill.hand });
    assert.equal(round.hand.length, 5);
    const best = bestHold(round.hand);
    assert.equal(best.holds.length, 5);
    assert.ok(best.optimal.length >= 1);
  }
});

test('weak-spot drills put the missed blackjack types first', async () => {
  const { createProfile, recordMistake } = await import('../src/rpg/state.js');
  const { orderDrills } = await import('../src/rpg/drills.js');
  const profile = recordMistake(createProfile('scholar'), {
    game: 'blackjack', situation: 'A 7 AGAINST 10', chosen: 'STAND', correction: 'HIT', type: 'soft',
  });
  const ordered = orderDrills(profile, 'blackjack');
  assert.equal(ordered[0].type, 'soft');
});

test('a rigged card that is not in the shoe is rejected', async () => {
  const { newRound } = await import('../src/games/blackjack.js');
  assert.throws(() => newRound(Math.random, {
    player: [{ r: 15, s: 0 }, { r: 2, s: 0 }], dealer: [{ r: 3, s: 0 }, { r: 4, s: 0 }],
  }));
});
