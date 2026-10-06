import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeDeck, shuffle, combinations, seededRng, cardLabel, suitIndex } from '../src/cards.js';
import { evaluate, evaluate5, compareStrength, CATEGORY } from '../src/evaluate.js';

const c = (r, s) => ({ r, s: suitIndex(s) });

test('deck is 52 unique cards', () => {
  const deck = makeDeck();
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck.map((x) => `${x.r}${x.s}`)).size, 52);
  for (const card of deck) assert.equal(typeof card.s, 'number');
});

test('shuffle preserves the deck and seeded shuffle is deterministic', () => {
  const order = (d) => [...d].sort((x, y) => x.r - y.r || x.s - y.s);
  const deck = makeDeck();
  assert.deepEqual(shuffle(deck, seededRng(42)), shuffle(deck, seededRng(42)));
  assert.deepEqual(order(shuffle(deck, seededRng(42))), order(deck));
});

test('combinations of 7 choose 5 yields 21', () => {
  assert.equal(combinations(makeDeck().slice(0, 7), 5).length, 21);
});

test('cardLabel renders rank and suit glyph', () => {
  assert.equal(cardLabel(c(14, 's')), 'A♠');
  assert.equal(cardLabel(c(10, 'h')), '10♥');
  assert.equal(cardLabel(c(13, 'd')), 'K♦');
});

const cases = [
  ['royal flush', [c(14, 's'), c(13, 's'), c(12, 's'), c(11, 's'), c(10, 's')], CATEGORY.ROYAL_FLUSH],
  ['straight flush K high', [c(13, 'h'), c(12, 'h'), c(11, 'h'), c(10, 'h'), c(9, 'h')], CATEGORY.STRAIGHT_FLUSH],
  ['five high straight flush', [c(5, 'd'), c(4, 'd'), c(3, 'd'), c(2, 'd'), c(14, 'd')], CATEGORY.STRAIGHT_FLUSH],
  ['four of a kind', [c(7, 's'), c(7, 'h'), c(7, 'd'), c(7, 'c'), c(2, 's')], CATEGORY.FOUR_OF_A_KIND],
  ['full house', [c(6, 's'), c(6, 'h'), c(6, 'd'), c(14, 'c'), c(14, 's')], CATEGORY.FULL_HOUSE],
  ['flush', [c(14, 'c'), c(11, 'c'), c(9, 'c'), c(6, 'c'), c(2, 'c')], CATEGORY.FLUSH],
  ['straight', [c(9, 's'), c(8, 'h'), c(7, 'd'), c(6, 'c'), c(5, 's')], CATEGORY.STRAIGHT],
  ['wheel straight', [c(14, 's'), c(5, 'h'), c(4, 'd'), c(3, 'c'), c(2, 's')], CATEGORY.STRAIGHT],
  ['broadway straight', [c(14, 's'), c(13, 'h'), c(12, 'd'), c(11, 'c'), c(10, 's')], CATEGORY.STRAIGHT],
  ['three of a kind', [c(11, 's'), c(11, 'h'), c(11, 'd'), c(9, 'c'), c(4, 's')], CATEGORY.THREE_OF_A_KIND],
  ['two pair', [c(9, 's'), c(9, 'h'), c(4, 'd'), c(4, 'c'), c(2, 's')], CATEGORY.TWO_PAIR],
  ['one pair', [c(11, 's'), c(11, 'h'), c(7, 'd'), c(4, 'c'), c(2, 's')], CATEGORY.ONE_PAIR],
  ['high card', [c(14, 's'), c(12, 'h'), c(9, 'd'), c(6, 'c'), c(2, 's')], CATEGORY.HIGH_CARD],
  ['not a straight when duplicated rank breaks run', [c(9, 's'), c(9, 'h'), c(7, 'd'), c(6, 'c'), c(5, 's')], CATEGORY.ONE_PAIR],
];

for (const [name, hand, expected] of cases) {
  test(`classifies ${name}`, () => {
    assert.equal(evaluate5(hand).category, expected);
  });
}

test('wheel straight reports high card 5, not ace', () => {
  const r = evaluate5([c(14, 's'), c(5, 'h'), c(4, 'd'), c(3, 'c'), c(2, 's')]);
  assert.deepEqual(r.strength, [CATEGORY.STRAIGHT, 5]);
});

test('royal flush strength is ace high', () => {
  const r = evaluate5([c(14, 's'), c(13, 's'), c(12, 's'), c(11, 's'), c(10, 's')]);
  assert.deepEqual(r.strength, [CATEGORY.ROYAL_FLUSH, 14]);
});

test('kickers break ties between equal categories', () => {
  const aa = evaluate5([c(14, 's'), c(14, 'h'), c(5, 'd'), c(3, 'c'), c(2, 's')]);
  const kk = evaluate5([c(13, 's'), c(13, 'h'), c(5, 'd'), c(3, 'c'), c(2, 's')]);
  assert.ok(compareStrength(aa.strength, kk.strength) > 0);

  const aceKicker = evaluate5([c(9, 's'), c(9, 'h'), c(14, 'd'), c(3, 'c'), c(2, 's')]);
  const jackKicker = evaluate5([c(9, 's'), c(9, 'h'), c(11, 'd'), c(3, 'c'), c(2, 's')]);
  assert.ok(compareStrength(aceKicker.strength, jackKicker.strength) > 0);
});

test('two pair orders by higher pair first', () => {
  const kkjj = evaluate5([c(13, 's'), c(13, 'h'), c(11, 'd'), c(11, 'c'), c(2, 's')]);
  const qqjj = evaluate5([c(12, 's'), c(12, 'h'), c(11, 'd'), c(11, 'c'), c(2, 's')]);
  assert.ok(compareStrength(kkjj.strength, qqjj.strength) > 0);
});

test('full house orders by trips rank', () => {
  const acesFull = evaluate5([c(14, 's'), c(14, 'h'), c(14, 'd'), c(3, 'c'), c(3, 's')]);
  const kingsFull = evaluate5([c(13, 's'), c(13, 'h'), c(13, 'd'), c(3, 'c'), c(3, 's')]);
  assert.ok(compareStrength(acesFull.strength, kingsFull.strength) > 0);
});

test('category ordering beats kicker differences', () => {
  const straight = evaluate5([c(9, 's'), c(8, 'h'), c(7, 'd'), c(6, 'c'), c(5, 's')]);
  const trips = evaluate5([c(11, 's'), c(11, 'h'), c(11, 'd'), c(3, 'c'), c(2, 's')]);
  assert.ok(compareStrength(straight.strength, trips.strength) > 0);
});

test('evaluate picks best five from seven cards', () => {
  const seven = [c(14, 's'), c(13, 's'), c(12, 's'), c(11, 's'), c(10, 's'), c(2, 'c'), c(7, 'd')];
  assert.equal(evaluate(seven).category, CATEGORY.ROYAL_FLUSH);
});

test('evaluate finds a buried flush in seven cards', () => {
  const seven = [c(2, 'c'), c(5, 'c'), c(9, 'c'), c(13, 'c'), c(14, 'c'), c(3, 'h'), c(7, 'd')];
  assert.equal(evaluate(seven).category, CATEGORY.FLUSH);
});

test('evaluate on seven cards beats its own subcombos', () => {
  const seven = [c(9, 's'), c(9, 'h'), c(9, 'd'), c(4, 'd'), c(4, 'c'), c(3, 's'), c(8, 'd')];
  const best = evaluate(seven);
  assert.equal(best.category, CATEGORY.FULL_HOUSE);
  assert.deepEqual(best.strength, [CATEGORY.FULL_HOUSE, 9, 4]);
});

test('three pairs in seven cards cannot make a full house', () => {
  const seven = [c(9, 's'), c(9, 'h'), c(4, 'd'), c(4, 'c'), c(3, 's'), c(3, 'h'), c(8, 'd')];
  const best = evaluate(seven);
  assert.equal(best.category, CATEGORY.TWO_PAIR);
});

test('two pair outranks one pair regardless of kicker strength', () => {
  const twoPair = evaluate5([c(2, 's'), c(2, 'h'), c(3, 'd'), c(3, 'c'), c(7, 's')]);
  const onePairAceKicker = evaluate5([c(9, 's'), c(9, 'h'), c(14, 'd'), c(13, 'c'), c(12, 's')]);
  assert.ok(compareStrength(twoPair.strength, onePairAceKicker.strength) > 0);
});

test('evaluate returns null with fewer than five cards', () => {
  assert.equal(evaluate([c(2, 's'), c(3, 's')]), null);
});

test('label text is human readable', () => {
  assert.equal(evaluate5([c(14, 's'), c(13, 's'), c(12, 's'), c(11, 's'), c(10, 's')]).label, 'Royal Flush');
});