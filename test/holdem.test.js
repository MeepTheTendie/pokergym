import { test } from 'node:test';
import assert from 'node:assert/strict';

import { seededRng, combinations } from '../src/cards.js';
import { CATEGORY_LABEL, evaluate, evaluate5, compareStrength } from '../src/evaluate.js';
import { GAME, newRound } from '../src/games/holdem.js';
import { playsBestFive } from '../src/coach/holdem.js';
import { handDifficulty } from '../src/rpg/state.js';

const c = (r, s) => ({ r, s });

const deal = (seed) => newRound(seededRng(seed));

test('a round deals two hole cards and a five card board, all distinct', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const round = deal(seed);
    assert.equal(round.game, GAME.id);
    assert.equal(round.hole.length, 2, `seed ${seed}: hole cards`);
    assert.equal(round.community.length, 5, `seed ${seed}: board`);
    assert.equal(round.hand7.length, 7, `seed ${seed}: the seven cards in play`);
    assert.deepEqual(round.hand7, [...round.hole, ...round.community], `seed ${seed}: order`);
    assert.equal(round.settled, true, `seed ${seed}: the reading hand settles immediately`);

    const keys = round.hand7.map((card) => `${card.r}${card.s}`);
    assert.equal(new Set(keys).size, 7, `seed ${seed}: no card is dealt twice`);

    assert.ok(round.result, `seed ${seed}: the hand evaluates`);
    assert.equal(round.label, CATEGORY_LABEL[round.category], `seed ${seed}: label`);
    assert.equal(round.bestFive.length, 5, `seed ${seed}: best five is five cards`);
    assert.deepEqual(round.bestFive, round.result.cards, `seed ${seed}: engine keeps its best five`);
  }
});

test('the engine really does return the best five of the seven', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const round = deal(seed);
    for (const combo of combinations(round.hand7, 5)) {
      const strength = evaluate5(combo).strength;
      assert.ok(
        compareStrength(strength, round.result.strength) <= 0,
        `seed ${seed}: ${combo.map((x) => `${x.r}${x.s}`).join(' ')} cannot beat the reported best five`,
      );
    }
  }
});

test('playsBestFive grades every subset exactly by strength, across fifty deals', () => {
  let tiesAccepted = 0;
  for (let seed = 1; seed <= 50; seed++) {
    const round = deal(seed);
    for (const combo of combinations(round.hand7, 5)) {
      const tied = compareStrength(evaluate5(combo).strength, round.result.strength) === 0;
      const accepted = playsBestFive(round.hand7, combo);
      assert.equal(
        accepted,
        tied,
        `seed ${seed}: ${combo.map((x) => `${x.r}${x.s}`).join(' ')} `
          + `should be ${tied ? 'accepted' : 'rejected'}`,
      );
      if (tied) tiesAccepted++;
    }
  }
  assert.ok(tiesAccepted >= 25, `expected many tying subsets, saw ${tiesAccepted}`);
});

test('a board that plays on its own still grades as a correct read', () => {
  // Board full house: nothing in hand changes the best five, and the best five
  // is exactly the board.
  const hole = [c(2, 0), c(3, 1)];
  const community = [c(9, 0), c(9, 1), c(9, 2), c(13, 0), c(13, 1)];
  const hand7 = [...hole, ...community];
  const best = evaluate(hand7);
  assert.deepEqual(best.cards, community, 'the board itself is the best hand');
  assert.equal(playsBestFive(hand7, community), true, 'picking the board is correct');
  assert.equal(
    playsBestFive(hand7, [c(2, 0), c(3, 1), c(9, 0), c(9, 1), c(9, 2)]),
    false,
    'trips without the board pair is a worse five',
  );
});

test('kickers decide it: interchangeable cards of the same rank all count', () => {
  // Two pair, aces over nines, with two different sevens available as the
  // kicker. Both five card subsets have identical strength, so both are correct
  // even though they are not the same five cards.
  const hand7 = [c(7, 2), c(2, 1), c(14, 0), c(14, 1), c(9, 0), c(9, 1), c(7, 3)];
  const better = [c(14, 0), c(14, 1), c(9, 0), c(9, 1), c(7, 2)];
  const sameStrength = [c(14, 0), c(14, 1), c(9, 0), c(9, 1), c(7, 3)];
  const worseKicker = [c(14, 0), c(14, 1), c(9, 0), c(9, 1), c(2, 1)];

  assert.equal(playsBestFive(hand7, better), true, 'the reported best five');
  assert.equal(playsBestFive(hand7, sameStrength), true, 'the other seven of the same kicker');
  assert.equal(playsBestFive(hand7, worseKicker), false, 'kicker of two loses the tie');
  assert.equal(
    playsBestFive(hand7, [c(7, 2), c(2, 1), c(14, 0), c(14, 1), c(9, 0)]),
    false,
    'one pair is worse than two pair',
  );
});

test('malformed picks are rejected', () => {
  const round = deal(4);
  const [a, b, d, e, f, g, h] = round.hand7;
  assert.equal(playsBestFive(round.hand7, [a, b, d, e]), false, 'four cards');
  assert.equal(playsBestFive(round.hand7, [a, b, d, e, f, g]), false, 'six cards');
  assert.equal(playsBestFive(round.hand7, [a, a, b, d, e]), false, 'the same card twice');
  assert.equal(playsBestFive(round.hand7, [c(14, 3), b, d, e, f]), false, 'a card not in the seven');
  assert.equal(playsBestFive([a, b, d, e], round.result.cards), false, 'too few cards in the pool');
  assert.equal(playsBestFive(round.hand7, null), false, 'no pick at all');
  assert.equal(playsBestFive(null, round.result.cards), false, 'no pool at all');
});

test('deals are reproducible from a fixed seed', () => {
  const a = newRound(seededRng(4242));
  const b = newRound(seededRng(4242));
  assert.deepEqual(a, b);
  assert.notDeepEqual(deal(1).hand7, deal(2).hand7, 'different seeds deal different hands');
});

test('hand difficulty scales with the category the player reads', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    const round = deal(seed);
    assert.ok(round.category >= 0 && round.category <= 9, `seed ${seed}: category in range`);
    seen.add(round.category);
    nearDifficulty(handDifficulty(round.result), 1 + round.category * 0.35, `seed ${seed}`);
  }
  assert.ok(seen.size >= 5, `expected a spread of hand strengths, saw ${seen.size} categories`);
});

function nearDifficulty(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: expected ${expected}, got ${actual}`);
}
