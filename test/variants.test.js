import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeDeck, shuffle, seededRng, suitIndex } from '../src/cards.js';
import { evaluate5 } from '../src/evaluate.js';
import {
  VARIANTS, DEFAULT_VARIANT, variantById, WIN, winCodeOf, payFor, payLabelFor,
  payoutForWin, rowForWin, newRound, draw, setHolds,
} from '../src/games/videopoker.js';
import { bestHold, winCodeOfHand, clearCache } from '../src/coach/videopoker.js';

const c = (r, s) => ({ r, s: suitIndex(s) });
const near = (actual, expected, tol = 5e-4) =>
  assert.ok(Math.abs(actual - expected) < tol, `expected ~${expected}, got ${actual}`);

test('variant registry is well formed', () => {
  assert.ok(VARIANTS.length >= 3);
  assert.equal(DEFAULT_VARIANT.id, 'jacks-or-better');
  const ids = new Set();
  for (const v of VARIANTS) {
    assert.ok(!ids.has(v.id), `duplicate variant id ${v.id}`);
    ids.add(v.id);
    assert.equal(v.pay.length, Object.keys(WIN).length, `${v.id} pay table length`);
    assert.ok(v.rows.length >= 9, `${v.id} paytable rows`);
    for (const row of v.rows) {
      assert.ok(row.wins.length > 0, `${v.id} ${row.label} covers a win`);
      assert.ok(row.amount > 0, `${v.id} ${row.label} pays`);
      assert.equal(row.amount, v.pay[row.wins[0]], `${v.id} ${row.label} amount`);
    }
    // Rows are listed in printed paytable order (royal at the top), not by
    // amount: on a one-credit DDB table four aces with a kicker out-pays a royal.
    assert.equal(new Set(v.rows.map(r => r.label)).size, v.rows.length, `${v.id} labels are unique`);
    assert.equal(variantById(v.id), v, `${v.id} lookup`);
  }
  assert.equal(variantById('does-not-exist'), DEFAULT_VARIANT, 'unknown id falls back');
});

test('every variant pays 250 for a royal flush', () => {
  const royal = evaluate5([c(10, 's'), c(11, 's'), c(12, 's'), c(13, 's'), c(14, 's')]);
  for (const v of VARIANTS) {
    assert.equal(payFor(royal, v), 250, v.id);
    assert.match(payLabelFor(royal, v), /Royal Flush/, v.id);
  }
});

test('the fast evaluator agrees with the reference on every variant', () => {
  for (const v of VARIANTS) {
    for (let i = 0; i < 3000; i++) {
      const hand = shuffle(makeDeck(), seededRng(i * 7 + 1)).slice(0, 5);
      assert.equal(winCodeOfHand(hand, v), winCodeOf(hand, v), `${v.id} hand ${i}`);
    }
  }
});

test('Jacks or Better pays every four of a kind the same', () => {
  const aces = evaluate5([c(14, 's'), c(14, 'h'), c(14, 'd'), c(14, 'c'), c(13, 's')]);
  const twos = evaluate5([c(2, 's'), c(2, 'h'), c(2, 'd'), c(2, 'c'), c(13, 's')]);
  assert.equal(payFor(aces), 25);
  assert.equal(payFor(twos), 25);
  assert.equal(payLabelFor(aces), 'Four of a Kind');
});

test('Bonus Poker splits four of a kind by the rank of the quad', () => {
  const v = variantById('bonus-poker');
  const aces = evaluate5([c(14, 's'), c(14, 'h'), c(14, 'd'), c(14, 'c'), c(13, 's')]);
  const twos = evaluate5([c(2, 's'), c(2, 'h'), c(2, 'd'), c(2, 'c'), c(13, 's')]);
  const kings = evaluate5([c(13, 's'), c(13, 'h'), c(13, 'd'), c(13, 'c'), c(2, 's')]);
  assert.equal(payFor(aces, v), 80);
  assert.equal(payFor(twos, v), 40);
  assert.equal(payFor(kings, v), 25);
});

test('Double Double Bonus pays a low kicker alongside four aces the most', () => {
  const v = variantById('double-double-bonus');
  const acesWithThree = evaluate5([c(14, 's'), c(14, 'h'), c(14, 'd'), c(14, 'c'), c(3, 's')]);
  const acesWithQueen = evaluate5([c(14, 's'), c(14, 'h'), c(14, 'd'), c(14, 'c'), c(12, 's')]);
  assert.equal(payFor(acesWithThree, v), 400);
  assert.equal(payFor(acesWithQueen, v), 160);
  assert.match(payLabelFor(acesWithThree, v), /Aces/);
});

test('Double Double Bonus teaches the kicker discard on four aces', () => {
  clearCache();
  const hand = [c(14, 's'), c(14, 'h'), c(14, 'd'), c(14, 'c'), c(13, 's')];
  const ddb = bestHold(hand, { variant: 'double-double-bonus' });
  // Break the aces to chase a low kicker: 12 of 47 draws pay 400, the other 35 pay 160.
  assert.equal(ddb.holds.filter(Boolean).length, 4, 'discards the king');
  near(ddb.ev, (12 * 400 + 35 * 160) / 47);
  // Jacks or Better never improves on the made quad, so holding all five ties.
  const job = bestHold(hand);
  assert.equal(job.ev, 25);
  assert.ok(job.optimal.some(p => p.filter(Boolean).length === 5), 'holding all five is still optimal');
});

test('pair pays stay the same under every pair-paying variant, and nothing under Deuces', () => {
  // A lone pair of kings is a win on a Jacks-or-better table and no win at all
  // on Deuces Wild, where only three of a kind or better pays.
  const kings = evaluate5([c(13, 's'), c(13, 'h'), c(7, 'd'), c(4, 'c'), c(2, 's')]);
  for (const v of VARIANTS) {
    if (v.minPairRank > 14) assert.equal(payFor(kings, v), 0, v.id);
    else assert.equal(payFor(kings, v), v.pay[WIN.JACKS], v.id);
  }
});

test('a rigged draw pays the active variant table', () => {
  const hand = [c(14, 's'), c(14, 'h'), c(14, 'd'), c(14, 'c'), c(3, 's')];
  const round = newRound(seededRng(1), { hand, variantId: 'double-double-bonus' });
  setHolds(round, [true, true, true, true, true]);
  draw(round);
  assert.equal(round.win, WIN.FOUR_ACES_KICKER);
  assert.equal(round.payout, 400);
  assert.equal(payoutForWin(round.win, variantById('double-double-bonus')), 400);
  assert.ok(round.winLabel.toLowerCase().includes('four aces'));
  assert.equal(rowForWin(variantById('double-double-bonus'), round.win).amount, 400);
});

// ---- Deuces Wild -----------------------------------------------------------

const deuces = () => variantById('deuces-wild');
const winOf = (cards, v = deuces()) => winCodeOf(cards, v);
const payOf = (cards, v = deuces()) => payoutForWin(winOf(cards, v), v);

test('Deuces Wild pays nothing for a pair and reports every wild-only hand', () => {
  const v = deuces();
  assert.ok(v.minPairRank > 14, 'no pair pays');
  // Four deuces sits just under a natural royal.
  assert.equal(winOf([c(2, 's'), c(2, 'h'), c(2, 'd'), c(2, 'c'), c(13, 's')], v), WIN.FOUR_DEUCES);
  assert.equal(payOf([c(2, 's'), c(2, 'h'), c(2, 'd'), c(2, 'c'), c(13, 's')], v), 200);
  // One deuce filling a royal is only a wild royal.
  assert.equal(winOf([c(2, 'h'), c(10, 's'), c(11, 's'), c(12, 's'), c(13, 's')], v), WIN.WILD_ROYAL);
  assert.equal(payOf([c(2, 'h'), c(10, 's'), c(11, 's'), c(12, 's'), c(13, 's')], v), 25);
  // Three deuces copy a natural pair into five of a kind.
  assert.equal(winOf([c(9, 's'), c(9, 'h'), c(2, 's'), c(2, 'h'), c(2, 'd')], v), WIN.FIVE_KIND);
  assert.equal(payOf([c(9, 's'), c(9, 'h'), c(2, 's'), c(2, 'h'), c(2, 'd')], v), 15);
});

test('a natural royal out-pays a wild royal, and a lone pair pays nothing', () => {
  const v = deuces();
  const natural = [c(10, 's'), c(11, 's'), c(12, 's'), c(13, 's'), c(14, 's')];
  assert.equal(winOf(natural, v), WIN.ROYAL);
  assert.equal(payOf(natural, v), 250);
  const pair = [c(13, 's'), c(13, 'h'), c(7, 'd'), c(4, 'c'), c(11, 's')];
  assert.equal(winOf(pair, v), WIN.LOW_PAIR);
  assert.equal(payOf(pair, v), 0);
});

test('a deuce completes the ace-low straight A-2-3-4-5', () => {
  assert.equal(winOf([c(14, 's'), c(3, 's'), c(4, 'h'), c(5, 'd'), c(2, 'c')]), WIN.STRAIGHT);
});

test('the fast Deuces evaluator agrees with the reference over many hands', () => {
  for (let i = 0; i < 20000; i++) {
    const hand = shuffle(makeDeck(), seededRng(i * 13 + 5)).slice(0, 5);
    assert.equal(winCodeOfHand(hand, 'deuces-wild'), winCodeOf(hand, deuces()), `deuces hand ${i}`);
  }
});

test('Deuces Wild keeps a deuce that Jacks or Better throws away', () => {
  clearCache();
  // Two deuces plus three spades is a made straight flush under Deuces, but Jacks
  // or Better reads the deuces as dead twos and keeps the four-card flush draw.
  const hand = [c(2, 's'), c(2, 'h'), c(5, 's'), c(6, 's'), c(7, 's')];
  const wild = bestHold(hand, { variant: 'deuces-wild' });
  assert.ok(wild.holds.every(Boolean), 'Deuces holds all five');
  assert.equal(wild.ev, 9);
  const job = bestHold(hand);
  assert.equal(job.holds[1], false, 'JoB discards the off-suit deuce');
  assert.ok(job.holds[0] && job.holds[2] && job.holds[3] && job.holds[4], 'JoB keeps four to a flush');
});

test('a rigged Deuces draw pays the Deuces table', () => {
  const hand = [c(2, 's'), c(2, 'h'), c(2, 'd'), c(2, 'c'), c(13, 's')];
  const round = newRound(seededRng(1), { hand, variantId: 'deuces-wild' });
  setHolds(round, [true, true, true, true, true]);
  draw(round);
  assert.equal(round.win, WIN.FOUR_DEUCES);
  assert.equal(round.payout, 200);
  assert.equal(round.winLabel, 'Four Deuces');
});
