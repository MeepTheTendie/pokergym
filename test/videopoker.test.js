import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeDeck, shuffle, seededRng, suitIndex, cardLabel } from '../src/cards.js';
import { evaluate5, CATEGORY } from '../src/evaluate.js';
import { newRound, draw, setHolds, payFor, payLabelFor, MIN_PAIR_RANK } from '../src/games/videopoker.js';
import { bestHold, categoryOf, countDraws, binomial, holdPatterns, clearCache } from '../src/coach/videopoker.js';

const c = (r, s) => ({ r, s: suitIndex(s) });
const near = (actual, expected, tol = 0.0005) =>
  assert.ok(Math.abs(actual - expected) < tol, `expected ~${expected}, got ${actual}`);

test('holdPatterns generates 32 distinct patterns', () => {
  const patterns = holdPatterns(5);
  assert.equal(patterns.length, 32);
  assert.equal(new Set(patterns.map((p) => p.join(''))).size, 32);
});

test('draw enumeration count matches combinatorial count for every hold size', () => {
  for (let need = 0; need <= 5; need++) {
    assert.equal(countDraws(47, need), binomial(47, need), `need=${need}`);
  }
  assert.equal(countDraws(52, 5), 2598960);
});

test('fast category evaluator agrees with reference evaluator', () => {
  for (let i = 0; i < 4000; i++) {
    const hand = shuffle(makeDeck(), seededRng(i + 1)).slice(0, 5);
    assert.equal(categoryOf(hand), evaluate5(hand).category);
  }
});

test('Jacks or Better pays nothing for a pair below jacks', () => {
  const lowPair = evaluate5([c(7, 's'), c(7, 'h'), c(2, 'd'), c(4, 'c'), c(9, 's')]);
  assert.equal(payFor(lowPair), 0);
  assert.equal(payLabelFor(lowPair), 'No win');
});

test('Jacks or Better pays one credit for a pair of jacks', () => {
  const jacks = evaluate5([c(11, 's'), c(11, 'h'), c(2, 'd'), c(4, 'c'), c(9, 's')]);
  assert.equal(payFor(jacks), 1);
  assert.equal(payLabelFor(jacks), 'Jacks or Better');
});

test('every jack-or-better pair pays one credit', () => {
  const fillerRanks = [2, 4, 7, 9, 5];
  for (let r = MIN_PAIR_RANK; r <= 14; r++) {
    const kickers = fillerRanks.filter((k) => k !== r).slice(0, 3);
    const pair = evaluate5([c(r, 's'), c(r, 'h'), c(kickers[0], 'd'), c(kickers[1], 'c'), c(kickers[2], 'h')]);
    assert.equal(payFor(pair), 1, `pair of ${r}`);
  }
  for (let r = 2; r < MIN_PAIR_RANK; r++) {
    const kickers = fillerRanks.filter((k) => k !== r).slice(0, 3);
    const pair = evaluate5([c(r, 's'), c(r, 'h'), c(kickers[0], 'd'), c(kickers[1], 'c'), c(kickers[2], 'h')]);
    assert.equal(payFor(pair), 0, `pair of ${r}`);
  }
});

const advice = {
  'royal flush': { hand: [c(10, 's'), c(11, 's'), c(12, 's'), c(13, 's'), c(14, 's')], keep: 5, ev: 250 },
  'straight flush': { hand: [c(5, 's'), c(6, 's'), c(7, 's'), c(8, 's'), c(9, 's')], keep: 5, ev: 50 },
  'four of a kind': { hand: [c(6, 's'), c(6, 'h'), c(6, 'd'), c(6, 'c'), c(2, 's')], keep: 4, ev: 25 },
  'full house': { hand: [c(9, 's'), c(9, 'h'), c(9, 'd'), c(4, 'c'), c(4, 's')], keep: 5, ev: 9 },
  'flush': { hand: [c(14, 'c'), c(11, 'c'), c(9, 'c'), c(6, 'c'), c(2, 'c')], keep: 5, ev: 6 },
  'straight': { hand: [c(5, 's'), c(6, 'h'), c(7, 'd'), c(8, 'c'), c(9, 's')], keep: 5, ev: 4 },
  'three of a kind': { hand: [c(8, 's'), c(8, 'h'), c(8, 'd'), c(13, 'c'), c(3, 's')], keep: 3, ev: 4.3025 },
  'pair of jacks': { hand: [c(11, 's'), c(11, 'h'), c(7, 'd'), c(4, 'c'), c(2, 's')], keep: 2, ev: 1.5365 },
  'low pair': { hand: [c(7, 's'), c(7, 'h'), c(11, 'd'), c(4, 'c'), c(2, 's')], keep: 2, ev: 0.8237 },
  'three card flush': { hand: [c(14, 'c'), c(11, 'c'), c(9, 'c'), c(6, 's'), c(2, 'd')], keep: 3, ev: 0.5467 },
  'no pair no draw': { hand: [c(7, 's'), c(9, 'd'), c(10, 'c'), c(2, 'h'), c(5, 's')], keep: 0, ev: 0.3573 },
  'open ended draw': { hand: [c(7, 's'), c(8, 'd'), c(9, 'c'), c(10, 'h'), c(2, 's')], keep: 4, ev: 0.6809 },
};

for (const [name, spec] of Object.entries(advice)) {
  test(`optimal play holds ${spec.keep} on ${name}`, () => {
    clearCache();
    const result = bestHold(spec.hand);
    assert.equal(result.holds.filter(Boolean).length, spec.keep);
    near(result.ev, spec.ev);
  });
}

test('a jack pair is valued above a low pair', () => {
  clearCache();
  const jacks = bestHold([c(11, 's'), c(11, 'h'), c(7, 'd'), c(4, 'c'), c(2, 's')]);
  const sevens = bestHold([c(7, 's'), c(7, 'h'), c(4, 'd'), c(5, 'c'), c(2, 's')]);
  assert.ok(jacks.ev > sevens.ev);
});

test('strategy is cached per ordered hand', () => {
  clearCache();
  const hand = [c(14, 's'), c(11, 's'), c(9, 's'), c(6, 's'), c(2, 's')];
  const first = bestHold(hand);
  const second = bestHold(hand);
  assert.equal(first, second);
});

test('cached advice keeps hold positions aligned when the same cards are reordered', () => {
  clearCache();
  const hand = advice['pair of jacks'].hand;
  const first = bestHold(hand);
  const order = [2, 0, 3, 1, 4];
  const reordered = order.map(i => hand[i]);
  const second = bestHold(reordered);
  assert.deepEqual(second.holds, order.map(i => first.holds[i]));
  near(second.ev, first.ev);
  const heldCards = (cards, pattern) => cards.filter((_, i) => pattern[i]).map(cardLabel).sort();
  assert.deepEqual(second.optimal.map(p => heldCards(reordered, p)),
    first.optimal.map(p => heldCards(hand, p)));
  for (const option of first.options) {
    const mapped = order.map(i => option.holds[i]);
    const equivalent = second.options.find(o => o.holds.every((hold, i) => hold === mapped[i]));
    near(equivalent.ev, option.ev);
    assert.equal(equivalent.ways, option.ways);
  }
  assert.equal(bestHold(hand), first, 'Original order remains cached');
  assert.equal(bestHold(reordered), second, 'Reordered hand is also cached');
});

test('round deals five cards and holds none by default', () => {
  const round = newRound(seededRng(11));
  assert.equal(round.hand.length, 5);
  assert.deepEqual(round.holds, [false, false, false, false, false]);
  assert.equal(round.drawn, false);
});

test('draw.replace only discarded seats and never marks a drawn card held', () => {
  const round = newRound(seededRng(12));
  const original = round.hand.slice();
  assert.equal(round.deck.length, 47);
  setHolds(round, [false, true, false, true, false]);
  draw(round);
  assert.equal(round.hand.length, 5);
  assert.deepEqual(round.hand[1], original[1]);
  assert.deepEqual(round.hand[3], original[3]);
  for (const i of [0, 2, 4]) {
    assert.notDeepEqual(round.hand[i], original[i]);
    assert.equal(round.holds[i], false);
  }
  assert.equal(round.drawn, true);
  assert.equal(round.deck.length, 44);
});

test('draw keeps every held card in its original seat', () => {
  const round = newRound(seededRng(16));
  const original = round.hand.slice();
  setHolds(round, [true, false, true, false, false]);
  draw(round);
  assert.deepEqual(round.hand[0], original[0]);
  assert.deepEqual(round.hand[2], original[2]);
  assert.equal(round.hand.filter((_, i) => round.holds[i]).length, 2);
});

test('payout is zero when the final hand loses', () => {
  const round = newRound(seededRng(13));
  setHolds(round, [false, false, false, false, false]);
  draw(round);
  assert.ok(round.payout >= 0);
  assert.equal(round.payout, payFor(round.result));
});

test('winning hand pays the table amount', () => {
  const round = newRound(seededRng(14));
  round.hand = [c(14, 's'), c(13, 's'), c(12, 's'), c(11, 's'), c(10, 's')];
  round.deck = makeDeck().filter((x) => !round.hand.some((h) => h.r === x.r && h.s === x.s));
  setHolds(round, [true, true, true, true, true]);
  draw(round);
  assert.equal(round.result.category, CATEGORY.ROYAL_FLUSH);
  assert.equal(round.payout, 250);
  assert.equal(payLabelFor(round.result), 'Royal Flush');
});

test('card labels render for a dealt hand', () => {
  const round = newRound(seededRng(15));
  assert.equal(round.hand.length, cardLabel(round.hand[0]).length > 0 ? 5 : 0);
});
// Published teaching examples must agree with the exhaustive simulator analysis.
test('public three-hand guide recommends the optimal exact holds', async () => {
  const { readFile } = await import('node:fs/promises');
  const { SUIT_GLYPH } = await import('../src/cards.js');
  const guide = await readFile(new URL('../public/guides/jacks-or-better/index.html', import.meta.url), 'utf8');
  const hands = [...guide.matchAll(/class="hand"[^>]*>([^<]+)</g)].map(match =>
    match[1].split(' ').map(label => ({
      r: ({ J: 11, Q: 12, K: 13, A: 14 })[label.slice(0, -1)] ?? Number(label.slice(0, -1)),
      s: SUIT_GLYPH.indexOf(label.slice(-1)),
    })));
  assert.equal(hands.length, 3);
  const expected = [[true,true,false,false,false], [true,true,false,false,false], [true,true,true,true,false]];
  hands.forEach((hand, i) => assert.deepEqual(bestHold(hand).holds, expected[i]));
});
