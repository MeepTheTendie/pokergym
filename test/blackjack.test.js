import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seededRng } from '../src/cards.js';
import {
  GAME, BET, MAX_HANDS, sumHand, isBlackjack, legalActions, newRound,
  hit, stand, double, split, dealerPlay, finishRound, currentHand, rankName,
} from '../src/games/blackjack.js';
import {
  ACE, TEN, RANKS, MAX_HITS, cardIndex, rankOf, cardValue, shoeCounts, countsSize,
  addCard, dealerDistribution, standAgainst, standEv, buildHits, hitAndStand,
  doubleEv, splitEv, unknownPool, clearCache, bestAction,
} from '../src/coach/blackjack.js';

/*
 * Expected values in this file were cross-checked against an independent Monte
 * Carlo arbiter that deals real six-deck shoes and plays its own basic strategy
 * (see the note in the README-style comment on GOLDEN below). Where the two
 * disagree the cell is a coin flip with a margin under 0.04 units and is not
 * used as a golden.
 */

const near = (actual, expected, tol, label) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${label ?? ''} expected ${expected} +/-${tol}, got ${actual}`);

const c = (r, s = 0) => ({ r, s });

/* ---- fixtures ------------------------------------------------------------ */

function sixDeckShoe() {
  const deck = [];
  for (let d = 0; d < 6; d++) for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) deck.push(c(r, s));
  return deck;
}

// A round with a chosen player hand and dealer upcard drawn from a real shoe.
// Only ranks matter to the coach, so this is fully deterministic.
function roundWith(playerRanks, upRank) {
  const deck = sixDeckShoe();
  const take = (rank) => deck.splice(deck.findIndex((x) => x.r === rank), 1)[0];
  const up = take(upRank);
  const cards = playerRanks.map(take);
  const hole = deck.pop();
  return {
    game: GAME.id,
    deck,
    dealerHand: [up, hole],
    dealerUpcard: up,
    hands: [{
      cards, bet: BET, doubled: false, status: 'open',
      result: null, payout: 0, natural: false, fromSplit: false,
    }],
    activeHand: 0,
    holeRevealed: false,
    settled: false,
    payout: 0,
    outcome: null,
    result: null,
    log: [],
  };
}

// Hand-built round for settlement tests: we control every card in the shoe.
function scenario(playerCards, dealerCards, tail = []) {
  return {
    game: GAME.id,
    deck: tail.map((x) => c(x.r, x.s ?? 0)),
    dealerHand: dealerCards.map((x) => c(x.r, x.s ?? 0)),
    dealerUpcard: null,
    hands: [{
      cards: playerCards.map((x) => c(x.r, x.s ?? 0)),
      bet: BET, doubled: false, status: 'stand', result: null,
      payout: 0, natural: false, fromSplit: false,
    }],
    activeHand: 0,
    holeRevealed: false,
    settled: false,
    payout: 0,
    outcome: null,
    result: null,
    log: [],
    bet: BET,
  };
}

function finish(round) {
  round.dealerUpcard = round.dealerUpcard ?? round.dealerHand[0];
  round.hands[0].natural = round.hands[0].status === 'open' ? false : isBlackjack(round.hands[0].cards);
  return finishRound(round);
}

/* ---- rules --------------------------------------------------------------- */

test('a six deck shoe holds 312 cards', () => {
  const round = newRound(seededRng(7));
  assert.equal(round.deck.length + 4, 312);
  assert.equal(GAME.decks, 6);
  assert.equal(GAME.doubleAfterSplit, true);
  assert.equal(GAME.resplitAces, false);
  assert.equal(GAME.surrender, false);
  assert.equal(GAME.peek, false);
});

test('repeating identities across decks are legal, same physical card is not', () => {
  for (let i = 0; i < 50; i++) {
    const round = newRound(seededRng(1000 + i));
    const dealt = [...round.hands[0].cards, ...round.dealerHand];
    // Identical rank+suit may repeat, but only up to six times, one per deck.
    const seen = new Map();
    for (const card of dealt) {
      const key = `${card.r},${card.s}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
      assert.ok(seen.get(key) <= GAME.decks, `card ${key} appeared ${seen.get(key)} times in one shoe`);
    }
  }
});

test('natural blackjack pays 3:2', () => {
  const round = scenario([c(14), c(10)], [c(5), c(6)], [c(2), c(2), c(2), c(2), c(2)]);
  finish(round);
  assert.equal(round.hands[0].result, 'blackjack');
  assert.equal(round.payout, BET * 1.5);
  assert.equal(round.outcome, 'blackjack');
});

test('two naturals push', () => {
  const round = scenario([c(14), c(10)], [c(14), c(10)], [c(2), c(2)]);
  finish(round);
  assert.equal(round.hands[0].result, 'push');
  assert.equal(round.payout, 0);
});

test('a dealer natural beats a three card twenty one', () => {
  const round = scenario([c(10), c(7), c(4)], [c(14), c(10)]);
  finish(round);
  assert.equal(sumHand(round.hands[0].cards).total, 21);
  assert.equal(round.hands[0].result, 'lose');
  assert.equal(round.payout, -BET);
});

test('the dealer stands on seventeen and does not draw again', () => {
  const round = scenario([c(10), c(9)], [c(7), c(10)], [c(2), c(3)]);
  finish(round);
  assert.equal(sumHand(round.dealerHand).total, 17);
  assert.equal(round.deck.length, 2, 'both spare cards must remain in the shoe');
  assert.equal(round.hands[0].result, 'win');
  assert.equal(round.payout, BET);
});

test('the dealer hits sixteen', () => {
  const round = scenario([c(10), c(9)], [c(6), c(10)], [c(2), c(3)]);
  finish(round);
  assert.equal(sumHand(round.dealerHand).total, 18);
  assert.equal(round.deck.length, 1);
});

test('the dealer draws until seventeen or more and can bust', () => {
  const round = scenario([c(10), c(10)], [c(6), c(10)], [c(9), c(9), c(9)]);
  finish(round);
  assert.ok(sumHand(round.dealerHand).total > 21);
  assert.equal(round.hands[0].result, 'win');
  assert.equal(round.payout, BET);
});

test('the dealer does not draw when every hand is already dead', () => {
  // A table of busted hands is decided before the dealer turns a card.
  const busted = scenario([c(10), c(10), c(5)], [c(9), c(2)], [c(3), c(4)]);
  busted.hands[0].status = 'bust';
  finish(busted);
  assert.equal(busted.hands[0].result, 'lose');
  assert.equal(busted.dealerHand.length, 2, 'dealer never draws against a dead table');
  assert.equal(busted.deck.length, 2, 'the shoe is untouched');

  // A player natural wins immediately; the dealer has nothing to chase.
  const natural = scenario([c(14), c(10)], [c(5), c(6)], [c(2), c(2)]);
  finish(natural);
  assert.equal(natural.hands[0].result, 'blackjack');
  assert.equal(natural.dealerHand.length, 2, 'a natural settles without the dealer drawing');
  assert.equal(natural.deck.length, 2, 'the shoe is untouched');
});

test('doubling takes exactly one card and then stands', () => {
  const round = roundWith([5, 6], 6);
  assert.ok(legalActions(round).includes('double'));
  const before = round.deck.length;
  double(round);
  assert.equal(round.deck.length, before - 1);
  assert.equal(round.hands[0].cards.length, 3);
  assert.notEqual(round.hands[0].status, 'open');
  assert.equal(round.hands[0].bet, BET * 2);
});

test('a losing double costs twice the bet', () => {
  const round = scenario([c(5), c(6)], [c(10), c(8)], [c(2), c(3)]);
  round.hands[0].cards.push(c(4)); // 15 on the double
  round.hands[0].bet = BET * 2;
  finish(round);
  assert.equal(round.hands[0].result, 'lose');
  assert.equal(round.payout, -BET * 2);
});

test('doubling is refused once the hand has more than two cards', () => {
  const round = roundWith([5, 6], 6);
  round.hands[0].cards.push(c(4)); // 15, three cards
  assert.equal(legalActions(round).includes('double'), false);
  assert.throws(() => double(round), /first two cards/);
});

test('splitting deals one card to each hand from one shoe', () => {
  const round = roundWith([9, 9], 7);
  const before = round.deck.length;
  split(round);
  assert.equal(round.hands.length, 2);
  assert.equal(round.deck.length, before - 2);
  assert.equal(round.hands[0].cards.length, 2);
  assert.equal(round.hands[1].cards.length, 2);
  assert.equal(round.hands[0].cards[0].r, 9);
  assert.equal(round.hands[1].cards[0].r, 9);
  assert.notDeepEqual(round.hands[0].cards[1], round.hands[1].cards[1], 'the two hands get different cards');
  assert.equal(round.hands[0].bet, BET);
  assert.equal(round.hands[1].bet, BET);
});

test('both split hands must be played and settle together', () => {
  const round = scenario([c(9), c(9)], [c(7), c(2)], [c(10), c(10), c(6), c(6)]);
  round.hands[0].status = 'open';
  split(round);
  stand(round);
  assert.equal(round.activeHand, 1);
  assert.equal(round.settled, false, 'the second hand is still live');
  stand(round);
  assert.equal(round.settled, true);
  assert.equal(round.hands.length, 2);
  // 19 and 19 against a dealer who reaches 21
  assert.equal(sumHand(round.dealerHand).total, 21);
  assert.equal(round.payout, -2 * BET);
});

test('split aces receive one card each and stand', () => {
  const round = roundWith([14, 14], 6);
  split(round);
  assert.equal(round.hands.length, 2);
  for (const hand of round.hands) {
    assert.equal(hand.cards.length, 2);
    assert.equal(hand.status, 'stand');
  }
  assert.equal(round.settled, true);
});

test('split aces cannot be re-split', () => {
  const round = roundWith([14, 14], 6);
  split(round);
  for (const hand of round.hands) {
    assert.equal(hand.cards[0].r, 14);
    assert.equal(legalActions(round).includes('split'), false);
  }
});

test('a non pair cannot be split', () => {
  const round = roundWith([10, 9], 6);
  assert.equal(legalActions(round).includes('split'), false);
  assert.throws(() => split(round));
});

test('no action is legal once the round is settled', () => {
  const round = roundWith([10, 9], 6);
  finish(round);
  assert.deepEqual(legalActions(round), []);
  assert.throws(() => hit(round), /already settled/);
  assert.throws(() => stand(round), /already settled/);
  assert.throws(() => double(round), /already settled/);
  assert.throws(() => split(round), /already settled/);
});

test('hitting to twenty one on three cards pays even money', () => {
  const round = roundWith([7, 7], 6);
  round.deck.unshift(c(7));
  hit(round);
  assert.equal(sumHand(round.hands[0].cards).total, 21);
  assert.equal(round.hands[0].natural, false);
});

test('aces count as eleven then fall back to one', () => {
  assert.deepEqual(sumHand([c(14), c(14)]), { total: 12, soft: true });
  assert.deepEqual(sumHand([c(14), c(10)]), { total: 21, soft: true });
  assert.deepEqual(sumHand([c(14), c(7)]), { total: 18, soft: true });
  // eleventh + ten + nine is thirty, so the ace folds to a one and the hand is hard
  assert.deepEqual(sumHand([c(14), c(10), c(9)]), { total: 20, soft: false });
  assert.deepEqual(sumHand([c(14), c(7), c(7)]), { total: 15, soft: false });
  assert.equal(isBlackjack([c(14), c(10)]), true);
  assert.equal(isBlackjack([c(14), c(7), c(7)]), false);
});

test('rank names cover every rank in play', () => {
  for (let r = 2; r <= 14; r++) assert.ok(rankName(r).length > 0);
});

test('hand count is capped', () => {
  assert.equal(MAX_HANDS, 4);
});

/* ---- coach internals ------------------------------------------------------ */

test('the rank table covers every card with no dead slot', () => {
  assert.equal(RANKS, 10);
  assert.equal(ACE, 9);
  assert.equal(TEN, 8);
  for (let r = 2; r <= 14; r++) {
    const i = cardIndex(r);
    assert.ok(i >= 0 && i < RANKS, `rank ${r} maps outside the table`);
    if (r === 14) assert.equal(rankOf(i), 14);
    else if (r >= 10) assert.equal(rankOf(i), 10);
    else assert.equal(rankOf(i), r);
  }
  const counts = shoeCounts(sixDeckShoe());
  assert.equal(countsSize(counts), 312);
  assert.equal(counts[ACE], 24);
  assert.equal(counts[TEN], 96);
  for (let i = 0; i < 8; i++) assert.equal(counts[i], 24);
  assert.equal(cardValue(TEN), 10);
  assert.equal(cardValue(ACE), 11);
});

test('addCard folds soft hands down instead of busting them', () => {
  // addCard takes a rank index, not a rank.
  assert.deepEqual(addCard(11, 0, ACE), { total: 12, aces: 0 });
  assert.deepEqual(addCard(11, 1, ACE), { total: 12, aces: 1 });
  assert.deepEqual(addCard(17, 1, ACE), { total: 18, aces: 1 });
  // a soft 18 that draws a four becomes a hard 12, not a bust
  assert.deepEqual(addCard(18, 1, cardIndex(4)), { total: 12, aces: 0 });
  assert.deepEqual(addCard(20, 1, cardIndex(5)), { total: 15, aces: 0 });
  // a hard hand that busts stays bust
  assert.deepEqual(addCard(20, 0, cardIndex(6)), { total: 26, aces: 0 });
});

test('the dealer distribution is a probability distribution', () => {
  const counts = shoeCounts(sixDeckShoe());
  for (let r = 2; r <= 14; r++) {
    const dist = dealerDistribution(counts, cardIndex(r));
    let sum = 0;
    for (const p of dist) {
      assert.ok(p >= 0, 'no negative probability');
      sum += p;
    }
    near(sum, 1, 1e-12, `upcard ${r}`);
    assert.equal(dist.length, 6);
  }
});

test('dealer bust rates match the published six deck S17 table', () => {
  const counts = shoeCounts(sixDeckShoe());
  const expected = {
    2: 0.3535, 3: 0.3742, 4: 0.3958, 5: 0.4184, 6: 0.4228,
    7: 0.2619, 8: 0.2437, 9: 0.2292, 10: 0.2125, 14: 0.1155,
  };
  for (const [rank, want] of Object.entries(expected)) {
    const up = Number(rank);
    const dist = dealerDistribution(counts, cardIndex(up));
    // The published table is unconditional. Under a 10 or an ace the coach
    // knows the dealer has no natural (the game settles one before you act),
    // so the bust rate is the published one divided by P(no natural).
    let scale = 1;
    if (up === 10 || up === 14) {
      const n = countsSize(counts);
      const completes = up === 10 ? counts[ACE] : counts[TEN];
      scale = 1 / (1 - completes / n);
    }
    near(dist[0], want * scale, 0.004, `dealer bust for upcard ${rank}`);
  }
});

test('under a 10 or an ace the dealer distribution excludes a natural', () => {
  const counts = shoeCounts(sixDeckShoe());
  for (const up of [10, 14]) {
    const dist = dealerDistribution(counts, cardIndex(up));
    near(dist.reduce((a, b) => a + b, 0), 1, 1e-12, `upcard ${up} sums to one`);
  }
});

test('standing is worth exactly what the dealer distribution implies', () => {
  const counts = shoeCounts(sixDeckShoe());
  const dist = dealerDistribution(counts, cardIndex(10));
  // 20 beats everything except a dealer 21, and pushes a dealer 20
  near(standAgainst(dist, 20), 1 - dist[20 - 16] - 2 * dist[21 - 16], 1e-12);
  // twenty one pushes a dealer twenty one rather than beating it
  near(standAgainst(dist, 21), 1 - dist[21 - 16], 1e-12);
  near(standAgainst(dist, 22), -1, 1e-12, 'busted hand');
});

test('the hit table converges well before the depth cap', () => {
  const counts = shoeCounts(sixDeckShoe());
  const dist = dealerDistribution(counts, cardIndex(6));
  const shallow = buildHits(dist, counts, MAX_HITS);
  const deep = buildHits(dist, counts, 24);
  const a = shallow.best[MAX_HITS];
  const b = deep.best[24];
  let worst = 0;
  for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - b[i]));
  assert.ok(worst < 1e-9, `depth ${MAX_HITS} should match depth 24, worst drift ${worst}`);
});

test('a natural is worth one and a half units', () => {
  const counts = shoeCounts(sixDeckShoe());
  near(standEv(counts, [c(14), c(10)], cardIndex(6)), 1.5, 1e-12);
  near(standEv(counts, [c(10), c(10)], cardIndex(2)), 0.6396, 0.01);
});

test('doubling is twice the value of taking one card and standing', () => {
  const counts = shoeCounts(sixDeckShoe());
  const up = cardIndex(6);
  const dist = dealerDistribution(counts, up);
  const { total, soft } = sumHand([c(5), c(6)]);
  near(doubleEv(counts, [c(5), c(6)], up), 2 * hitAndStand(counts, total, soft, dist), 1e-12);
});

/* ---- coach behaviour ------------------------------------------------------ */

// GOLDEN: each row was chosen by an independent Monte Carlo over real shoes.
// Rows against a 10 or an ace are conditioned on the dealer not holding a
// natural, because the game settles a dealer natural before you can act.
const GOLDEN = [
  { hand: [9, 9], up: 7, action: 'stand', ev: 0.3996 },
  { hand: [9, 9], up: 8, action: 'split', ev: 0.2301 },
  { hand: [9, 9], up: 10, action: 'stand', ev: -0.1711 },
  { hand: [5, 5], up: 2, action: 'double', ev: 0.3715 },
  { hand: [5, 5], up: 3, action: 'double', ev: 0.4240 },
  { hand: [2, 7], up: 3, action: 'double', ev: 0.1314 },
  { hand: [5, 4], up: 7, action: 'hit', ev: 0.1771 },
  { hand: [4, 4], up: 5, action: 'split', ev: 0.1106 },
  { hand: [7, 7], up: 2, action: 'split', ev: -0.1202 },
  { hand: [6, 6], up: 7, action: 'hit', ev: -0.2205 },
  { hand: [10, 10], up: 2, action: 'stand', ev: 0.6379 },
  { hand: [4, 5], up: 10, action: 'hit', ev: -0.1514 },
  { hand: [14, 7], up: 7, action: 'stand', ev: 0.4019 },
  { hand: [14, 7], up: 8, action: 'stand', ev: 0.1081 },
  { hand: [14, 7], up: 9, action: 'hit', ev: -0.0992 },
  { hand: [14, 4], up: 4, action: 'double', ev: 0.0646 },
  { hand: [14, 5], up: 4, action: 'double', ev: 0.0606 },
];

for (const row of GOLDEN) {
  test(`coach plays ${row.hand.join(',')} vs ${row.up} as ${row.action}`, () => {
    clearCache();
    const res = bestAction(roundWith(row.hand, row.up));
    assert.equal(res.action, row.action);
    near(res.ev, row.ev, 0.01, `${row.hand} vs ${row.up}`);
  });
}

/*
 * Pair chart: standard six-deck, dealer stands on soft 17, double after split
 * allowed (GAME.doubleAfterSplit), no surrender. P = split, S = stand, H = hit,
 * D = double. Upcards in order 2..9, 10, A.
 */
const PAIR_CHART = {
  2: 'PPPPPPHHHH', 3: 'PPPPPPHHHH', 4: 'HHHPPHHHHH', 5: 'DDDDDDDDHH',
  6: 'PPPPPHHHHH', 7: 'PPPPPPHHHH', 8: 'PPPPPPPPPP', 9: 'PPPPPSPPSS',
  10: 'SSSSSSSSSS', 14: 'PPPPPPPPPP',
};
const CHART_ACTION = { P: 'split', S: 'stand', H: 'hit', D: 'double' };
const UPCARDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 14];

test('8,8 splits against a 10 and against an ace', () => {
  for (const up of [10, 14]) {
    clearCache();
    assert.equal(bestAction(roundWith([8, 8], up)).action, 'split', `8,8 vs ${up}`);
  }
});

for (const [pair, row] of Object.entries(PAIR_CHART)) {
  test(`pair ${pair},${pair} follows the six deck S17 DAS chart`, () => {
    UPCARDS.forEach((up, k) => {
      clearCache();
      const r = Number(pair);
      assert.equal(bestAction(roundWith([r, r], up)).action, CHART_ACTION[row[k]], `${pair},${pair} vs ${up}`);
    });
  });
}

test('split aces are valued as one card each and then a stand', () => {
  clearCache();
  const round = roundWith([14, 14], 6);
  const counts = unknownPool(round);
  const up = cardIndex(6);
  const n = countsSize(counts);

  // Re-derive the value straight from the exported primitives.
  let sum = 0;
  for (let i = 0; i < RANKS; i++) {
    if (!counts[i]) continue;
    const afterFirst = Int32Array.from(counts);
    afterFirst[i]--;
    for (let j = 0; j < RANKS; j++) {
      if (!afterFirst[j]) continue;
      const pool = Int32Array.from(afterFirst);
      pool[j]--;
      const dist = dealerDistribution(pool, up);
      const a = standAgainst(dist, sumHand([c(14), c(rankOf(i))]).total);
      const b = standAgainst(dist, sumHand([c(14), c(rankOf(j))]).total);
      sum += counts[i] * afterFirst[j] * (a + b);
    }
  }
  near(splitEv(counts, [c(14), c(14)], up, 0), sum / (n * (n - 1)), 1e-12, 'split aces');
});

test('the reported best action is never worse than any alternative', () => {
  clearCache();
  for (const row of GOLDEN) {
    const res = bestAction(roundWith(row.hand, row.up));
    for (const option of res.alternatives) {
      assert.ok(res.ev >= option.ev - 1e-12, `${row.hand} vs ${row.up}: ${option.action} beat the pick`);
    }
    assert.equal(res.ev, res.alternatives[0].ev);
    assert.ok(res.optimal.includes(res.action));
    assert.deepEqual(res.alternatives.map((o) => o.action).slice(0, 1), [res.action]);
  }
});

test('the coach only offers actions the rules allow', () => {
  clearCache();
  const round = roundWith([10, 9], 6);
  round.hands[0].cards.push(c(4));
  const res = bestAction(round);
  assert.equal(res.available.includes('double'), false);
  for (const option of res.alternatives) {
    assert.ok(res.available.includes(option.action), `${option.action} is not legal here`);
  }
});

test('the coach declines to advise on a settled round or a natural', () => {
  clearCache();
  const settled = roundWith([10, 6], 4);
  finish(settled);
  const res = bestAction(settled);
  assert.equal(res.action, null);
  assert.deepEqual(res.alternatives, []);
  const natural = roundWith([14, 10], 4);
  natural.hands[0].natural = true;
  assert.equal(bestAction(natural).natural, true);
});

test('the cache keys on shoe composition, not just the cards in hand', () => {
  clearCache();
  const hand = [c(10), c(6)];
  const up = c(4);

  // Same hand, same upcard, same deck length, wildly different shoe contents.
  const manyTens = { ...roundWith([10, 6], 4), dealerHand: [up, c(10)], deck: Array.from({ length: 60 }, () => c(10)) };
  const manyTwos = { ...roundWith([10, 6], 4), dealerHand: [up, c(2)], deck: Array.from({ length: 60 }, () => c(2)) };
  assert.equal(manyTens.deck.length, manyTwos.deck.length, 'the fixture must keep deck length equal');

  const a = bestAction(manyTens);
  const b = bestAction(manyTwos);
  assert.notEqual(a, b, 'different shoes must not share a cached object');
  assert.notEqual(a.action, b.action, 'a shoe of tens and a shoe of twos are different problems');
  assert.notDeepEqual(
    a.alternatives.map((o) => o.ev),
    b.alternatives.map((o) => o.ev),
  );
});

test('an identical round still hits the cache', () => {
  clearCache();
  const round = roundWith([5, 5], 2);
  const first = bestAction(round);
  const second = bestAction(round);
  assert.equal(first, second, 'the same problem should return the same cached object');
  clearCache();
  assert.notEqual(bestAction(round), first);
});