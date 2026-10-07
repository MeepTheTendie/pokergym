import { test } from 'node:test';
import assert from 'node:assert/strict';

import { seededRng, shuffle } from '../src/cards.js';
import { GAME, PAY_TABLE, cardValue, handTotal, newRound, newShoe } from '../src/games/baccarat.js';
import {
  SHOE_SIZE, DECKS, PAIR_P, playerDraws, bankerDraws,
  outcomeProbabilities, sideEvs, bestBet, quizFor, tieBreakEven,
} from '../src/coach/baccarat.js';

const near = (actual, expected, tol, label) =>
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `${label ?? ''} expected ${expected} +/-${tol}, got ${actual}`,
  );

test('a shoe is eight decks of 416 cards', () => {
  assert.equal(DECKS, 8);
  assert.equal(SHOE_SIZE, 416);
  assert.equal(GAME.decks, 8);
  const shoe = newShoe(seededRng(1));
  assert.equal(shoe.length, SHOE_SIZE);
  const counts = new Map();
  for (const card of shoe) {
    const key = `${card.r}${card.s}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  assert.equal(counts.size, 52);
  for (const n of counts.values()) assert.equal(n, 8, 'every card appears once per deck');
});

test('card values follow baccarat rules and totals wrap modulo ten', () => {
  for (const rank of [10, 11, 12, 13]) assert.equal(cardValue(rank), 0, `rank ${rank} is worth nothing`);
  assert.equal(cardValue(14), 1, 'ace is worth one');
  for (let r = 2; r <= 9; r++) assert.equal(cardValue(r), r);
  assert.equal(handTotal([{ r: 14, s: 0 }, { r: 14, s: 1 }]), 2, 'A + A = 2');
  assert.equal(handTotal([{ r: 14, s: 0 }, { r: 9, s: 1 }]), 0, 'A + 9 = 10, which is zero');
  assert.equal(handTotal([{ r: 10, s: 0 }, { r: 7, s: 1 }]), 7, 'face card counts for nothing');
  assert.equal(
    handTotal([{ r: 6, s: 0 }, { r: 5, s: 1 }, { r: 7, s: 2 }]),
    8,
    'third card wraps: 6 + 5 + 7 = 18 -> 8',
  );
});

test('the player tableau draws on five or less and stands on six or more', () => {
  for (let total = 0; total <= 9; total++) {
    assert.equal(playerDraws(total), total <= 5, `player total ${total}`);
  }
});

test('the banker tableau matches the published third card rules', () => {
  // No player third card: the banker draws on five or less, exactly as if the
  // player had stood.
  for (let total = 0; total <= 9; total++) {
    assert.equal(bankerDraws(total, undefined), total <= 5, `no player card, banker ${total}`);
  }
  for (let p3 = 0; p3 <= 9; p3++) {
    for (let banker = 0; banker <= 6; banker++) {
      let expected;
      if (banker <= 2) expected = true;
      else if (banker === 3) expected = p3 !== 8;
      else if (banker === 4) expected = p3 >= 2 && p3 <= 7;
      else if (banker === 5) expected = p3 >= 4 && p3 <= 7;
      else expected = p3 >= 6 && p3 <= 7; // banker 6
      assert.equal(bankerDraws(banker, p3), expected, `banker ${banker} vs player third ${p3}`);
    }
    // Seven always stands, whatever the player drew.
    assert.equal(bankerDraws(7, p3), false, `banker 7 vs player third ${p3}`);
  }
});

test('a natural ends the round before either side can draw a third card', () => {
  let naturals = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const round = newRound(seededRng(seed), 'player', 20);
    const playerInitial = handTotal(round.playerHand.slice(0, 2));
    const bankerInitial = handTotal(round.bankerHand.slice(0, 2));
    const natural = playerInitial >= 8 || bankerInitial >= 8;
    if (natural) {
      naturals++;
      assert.equal(round.playerHand.length, 2, `seed ${seed}: natural player hand stays at two`);
      assert.equal(round.bankerHand.length, 2, `seed ${seed}: natural banker hand stays at two`);
    }
  }
  assert.ok(naturals > 10, `expected naturals in 300 deals, saw ${naturals}`);
});

test('third cards follow the tableau exactly, in real deal order', () => {
  let withPlayerThird = 0;
  let withBankerThird = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const round = newRound(seededRng(seed), 'player', 20);
    const playerInitial = handTotal(round.playerHand.slice(0, 2));
    const bankerInitial = handTotal(round.bankerHand.slice(0, 2));
    const natural = playerInitial >= 8 || bankerInitial >= 8;

    const playerDrew = round.playerHand.length === 3;
    if (!natural) {
      assert.equal(playerDrew, playerDraws(playerInitial), `seed ${seed}: player third card`);
      if (playerDrew) withPlayerThird++;

      const p3 = playerDrew ? cardValue(round.playerThird.r) : undefined;
      assert.equal(
        round.bankerHand.length === 3,
        bankerDraws(bankerInitial, p3),
        `seed ${seed}: banker third card`,
      );
      if (round.bankerHand.length === 3) withBankerThird++;
    }
    assert.ok(round.playerTotal >= 0 && round.playerTotal <= 9, 'player total in range');
    assert.ok(round.bankerTotal >= 0 && round.bankerTotal <= 9, 'banker total in range');
    assert.ok(['player', 'banker', 'tie'].includes(round.result), 'result is one of the three sides');
  }
  assert.ok(withPlayerThird > 50, `player drew third cards ${withPlayerThird} times`);
  assert.ok(withBankerThird > 50, `banker drew third cards ${withBankerThird} times`);
});

test('payouts follow the pay table for every side and every result', () => {
  const seen = { player: 0, banker: 0, tie: 0 };
  for (let seed = 1; seed <= 400; seed++) {
    const rng = seededRng(seed * 7);
    const amount = 20;
    const onPlayer = newRound(rng, 'player', amount);
    // The same deal replayed with the other two bets: the bet never touches
    // the shuffle, so identical seeds must deal identical cards.
    const onBanker = newRound(seededRng(seed * 7), 'banker', amount);
    const onTie = newRound(seededRng(seed * 7), 'tie', amount);

    assert.deepEqual(onPlayer.playerHand, onBanker.playerHand, `seed ${seed}: player cards`);
    assert.deepEqual(onPlayer.playerHand, onTie.playerHand, `seed ${seed}: player cards`);
    assert.equal(onPlayer.result, onBanker.result, `seed ${seed}: same result`);
    assert.equal(onPlayer.result, onTie.result, `seed ${seed}: same result`);

    const { result } = onPlayer;
    seen[result]++;
    if (result === 'player') {
      assert.equal(onPlayer.payout, amount * PAY_TABLE.player, 'player bet wins even money');
      assert.equal(onBanker.payout, -amount, 'banker bet loses');
      assert.equal(onTie.payout, -amount, 'tie bet loses');
    } else if (result === 'banker') {
      assert.equal(onPlayer.payout, -amount, 'player bet loses');
      assert.equal(onBanker.payout, amount * PAY_TABLE.banker, 'banker bet wins after commission');
      assert.equal(onTie.payout, -amount, 'tie bet loses');
    } else {
      assert.equal(onPlayer.payout, 0, 'a tie pushes the player bet');
      assert.equal(onBanker.payout, 0, 'a tie pushes the banker bet');
      assert.equal(onTie.payout, amount * PAY_TABLE.tie, 'tie bet wins eight to one');
    }
  }
  assert.ok(seen.player > 100, `saw ${seen.player} player wins`);
  assert.ok(seen.banker > 100, `saw ${seen.banker} banker wins`);
  assert.ok(seen.tie > 5, `saw ${seen.tie} ties, need the tie branch covered`);
});

test('the same seed deals the same round twice', () => {
  const a = newRound(seededRng(99), 'banker', 20);
  const b = newRound(seededRng(99), 'banker', 20);
  assert.deepEqual(a, b);
});

/* ---- coach: exact enumeration of the whole shoe ------------------------- */

test('exact side probabilities sum to one and match the published figures', () => {
  const p = outcomeProbabilities();
  const total = p.player + p.banker + p.tie;
  near(total, 1, 1e-9, 'probabilities must partition the sample space');
  near(p.player, 0.4462466093431425, 1e-9, 'player');
  near(p.banker, 0.45859742263229153, 1e-9, 'banker');
  near(p.tie, 0.09515596802363312, 1e-9, 'tie');
});

test('the house edge is smallest on banker and largest on tie', () => {
  const evs = sideEvs();
  near(evs.banker, -0.010579057842465545, 1e-9, 'banker EV');
  near(evs.player, -0.012350813289149054, 1e-9, 'player EV');
  near(evs.tie, -0.14359628778636913, 1e-9, 'tie EV');
  assert.ok(evs.banker < 0, 'banker is still a losing bet');
  assert.ok(evs.player < 0, 'player is still a losing bet');
  assert.ok(evs.banker > evs.player, 'banker beats player');
  assert.ok(evs.player > evs.tie, 'player beats tie');

  const best = bestBet();
  assert.equal(best.side, 'banker');
  near(best.ev, evs.banker, 1e-12, 'bestBet reports the banker EV');
  assert.deepEqual(
    best.alternatives.map((a) => a.side),
    ['banker', 'player', 'tie'],
    'alternatives are ranked best first',
  );
  assert.equal(best.probabilities.tie, outcomeProbabilities().tie);
});

test('a pair means two cards of the same rank, not the same value class', () => {
  const p = outcomeProbabilities();
  // Same-rank pairs in an eight deck shoe: 13 ranks x 32 cards x 31 over
  // 416 x 415. Counting p1 === p2 in the value-class walk gives 14.5876%,
  // which is two cards of the same value, tens included - not a pair.
  const exact = (13 * 32 * 31) / (416 * 415);
  near(PAIR_P, exact, 1e-15, 'PAIR_P matches the shoe arithmetic');
  near(p.playerPair, exact, 1e-12, 'player pair probability');
  near(p.bankerPair, exact, 1e-12, 'banker pair probability');
  assert.ok(PAIR_P < 0.08, `pair rate ${PAIR_P} must be the 7.47% rate, not the 14.59% one`);
  assert.ok(PAIR_P > 0.07, `pair rate ${PAIR_P} is implausibly low`);
});

test('the pair rate agrees with deals of a real shuffled shoe', () => {
  const shoe = [];
  for (let d = 0; d < 8; d++) {
    for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) shoe.push({ r, s });
  }
  const rng = seededRng(20260106);
  const trials = 40000;
  let pairs = 0;
  for (let i = 0; i < trials; i++) {
    const dealt = shuffle(shoe, rng);
    // The pair is decided by the first two cards of that side, which the third
    // card rules never revisit.
    if (dealt[0].r === dealt[1].r) pairs++;
  }
  const observed = pairs / trials;
  const sd = Math.sqrt(PAIR_P * (1 - PAIR_P) / trials);
  near(observed, PAIR_P, 3.5 * sd, `Monte Carlo pair rate over ${trials} deals`);
});

/* ---- the problem-set quiz bank ------------------------------------------ */

const rngOf = (...values) => { let i = 0; return () => values[i++] ?? Math.random(); };

test('the tie bet breaks even around 9.5:1', () => {
  near(tieBreakEven(), 9.50906, 1e-3, 'break-even payout');
});

test('bet-select quizzes always key to banker and deal a real round', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const q = quizFor(rngOf(seed / 100));
    if (q.type !== 'select') continue;
    assert.equal(q.correct, 'BANKER');
    assert.deepEqual(q.options, ['BANKER', 'PLAYER', 'TIE']);
    assert.equal(q.deal, true);
    assert.ok(q.prompt.length > 0);
  }
});

test('commission quizzes return banker wins minus the 5% commission', () => {
  const q = quizFor(rngOf(0.6, 0.0)); // 20-chip bet
  assert.equal(q.type, 'commission');
  assert.equal(q.correct, '19 CHIPS');
  assert.equal(q.options.length, 3);
  assert.equal(new Set(q.options).size, 3, 'distractors are distinct');

  const q2 = quizFor(rngOf(0.6, 0.9)); // 80-chip bet
  assert.equal(q2.correct, '76 CHIPS');
  assert.equal(q2.deal, false);
  assert.ok(q2.prompt.includes('80-CHIP'));
});

test('tie promo quizzes flip to worthwhile only at 10:1 or higher', () => {
  assert.equal(quizFor(rngOf(0.9, 0.0)).correct, 'NO, STILL LOSING');   // 8:1
  assert.equal(quizFor(rngOf(0.9, 0.25)).correct, 'NO, STILL LOSING');  // 9:1
  assert.equal(quizFor(rngOf(0.9, 0.5)).correct, 'YES, WORTHWHILE');    // 10:1
  assert.equal(quizFor(rngOf(0.9, 0.75)).correct, 'YES, WORTHWHILE');   // 11:1
  for (let seed = 1; seed <= 50; seed++) {
    const q = quizFor(rngOf(0.9, seed / 100));
    assert.equal(q.deal, false);
    assert.equal(q.options.length, 2);
    assert.ok(q.options.includes(q.correct));
  }
  const q = quizFor(rngOf(0.9, 0.75));
  assert.ok(q.prompt.includes('11:1'));
});
