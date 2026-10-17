import { freshDeck } from '../cards.js';
import { evaluate5, CATEGORY } from '../evaluate.js';

export const GAME = {
  id: 'videopoker',
  name: 'Jacks or Better',
  handSize: 5,
  deck: 'single',
  draws: 1,
};

/*
 * Pay-table variants.
 *
 * Every variant grades the same five-card hands; only the pays differ. A finished
 * hand is reduced to a numeric win code (WIN) and the variant's `pay` array turns
 * that code into credits per hand. Codes a variant does not distinguish simply
 * share a payout: Jacks or Better pays every four of a kind 25, so it never asks
 * which rank the quads were, while Double Double Bonus pays Aces far more than
 * Kings and pays again when the fifth card is a low kicker.
 *
 * The coach grades holds against the active variant, so the same deal can have a
 * different best hold here than under Jacks or Better.
 *
 * Deuces Wild (wild twos) adds hands the other tables never see — five of a kind,
 * four deuces, and a wild royal — so it is graded by a wild-aware evaluator rather
 * than by evaluate5.
 */
export const WIN = {
  NONE: 0,
  LOW_PAIR: 1,
  JACKS: 2,
  TWO_PAIR: 3,
  THREE: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_KIND: 8,
  FOUR_5K: 9,
  FOUR_234: 10,
  FOUR_ACES: 11,
  FOUR_234_KICKER: 12,
  FOUR_ACES_KICKER: 13,
  STRAIGHT_FLUSH: 14,
  ROYAL: 15,
  FIVE_KIND: 16,
  WILD_ROYAL: 17,
  FOUR_DEUCES: 18,
};

export const WIN_LABEL = {
  [WIN.NONE]: 'No win',
  [WIN.LOW_PAIR]: 'No win',
  [WIN.JACKS]: 'Jacks or Better',
  [WIN.TWO_PAIR]: 'Two Pair',
  [WIN.THREE]: 'Three of a Kind',
  [WIN.STRAIGHT]: 'Straight',
  [WIN.FLUSH]: 'Flush',
  [WIN.FULL_HOUSE]: 'Full House',
  [WIN.FOUR_KIND]: 'Four of a Kind',
  [WIN.FOUR_5K]: 'Four of a Kind',
  [WIN.FOUR_234]: 'Four of a Kind',
  [WIN.FOUR_ACES]: 'Four of a Kind',
  [WIN.FOUR_234_KICKER]: 'Four of a Kind',
  [WIN.FOUR_ACES_KICKER]: 'Four of a Kind',
  [WIN.STRAIGHT_FLUSH]: 'Straight Flush',
  [WIN.ROYAL]: 'Royal Flush',
  [WIN.FIVE_KIND]: 'Five of a Kind',
  [WIN.WILD_ROYAL]: 'Wild Royal Flush',
  [WIN.FOUR_DEUCES]: 'Four Deuces',
};

// Pay per hand, indexed by WIN code.
const JOB_PAY = [0, 0, 1, 2, 3, 4, 6, 9, 25, 0, 0, 0, 0, 0, 50, 250, 0, 0, 0];
const BONUS_PAY = [0, 0, 1, 2, 3, 4, 5, 8, 0, 25, 40, 80, 40, 80, 50, 250, 0, 0, 0];
const DDB_PAY = [0, 0, 1, 2, 3, 4, 6, 9, 0, 50, 80, 160, 160, 400, 50, 250, 0, 0, 0];
// Full-pay Deuces Wild: no pair pays, a wild royal is not a natural royal, and
// four deuces out-pays a straight flush.
const DEUCES_PAY = [0, 0, 0, 0, 1, 2, 2, 3, 5, 0, 0, 0, 0, 0, 9, 250, 15, 25, 200];

export const VARIANTS = [
  {
    id: 'jacks-or-better',
    name: 'Jacks or Better',
    short: 'JO B',
    ratio: '9/6',
    expectedReturn: 0.9954,
    minPairRank: 11,
    quadTiers: false,
    pay: JOB_PAY,
    rows: [
      { wins: [WIN.ROYAL], label: 'Royal Flush' },
      { wins: [WIN.STRAIGHT_FLUSH], label: 'Straight Flush' },
      { wins: [WIN.FOUR_KIND], label: 'Four of a Kind' },
      { wins: [WIN.FULL_HOUSE], label: 'Full House' },
      { wins: [WIN.FLUSH], label: 'Flush' },
      { wins: [WIN.STRAIGHT], label: 'Straight' },
      { wins: [WIN.THREE], label: 'Three of a Kind' },
      { wins: [WIN.TWO_PAIR], label: 'Two Pair' },
      { wins: [WIN.JACKS], label: 'Jacks or Better' },
    ],
  },
  {
    id: 'bonus-poker',
    name: 'Bonus Poker',
    short: 'BONUS',
    ratio: '8/5',
    expectedReturn: 0.9917,
    minPairRank: 11,
    quadTiers: true,
    pay: BONUS_PAY,
    rows: [
      { wins: [WIN.ROYAL], label: 'Royal Flush' },
      { wins: [WIN.STRAIGHT_FLUSH], label: 'Straight Flush' },
      { wins: [WIN.FOUR_ACES, WIN.FOUR_ACES_KICKER], label: 'Four Aces' },
      { wins: [WIN.FOUR_234, WIN.FOUR_234_KICKER], label: 'Four 2s–4s' },
      { wins: [WIN.FOUR_5K], label: 'Four 5s–Ks' },
      { wins: [WIN.FULL_HOUSE], label: 'Full House' },
      { wins: [WIN.FLUSH], label: 'Flush' },
      { wins: [WIN.STRAIGHT], label: 'Straight' },
      { wins: [WIN.THREE], label: 'Three of a Kind' },
      { wins: [WIN.TWO_PAIR], label: 'Two Pair' },
      { wins: [WIN.JACKS], label: 'Jacks or Better' },
    ],
  },
  {
    id: 'double-double-bonus',
    name: 'Double Double Bonus',
    short: 'DDB',
    ratio: '9/6',
    expectedReturn: 0.9898,
    minPairRank: 11,
    quadTiers: true,
    pay: DDB_PAY,
    rows: [
      { wins: [WIN.ROYAL], label: 'Royal Flush' },
      { wins: [WIN.STRAIGHT_FLUSH], label: 'Straight Flush' },
      { wins: [WIN.FOUR_ACES_KICKER], label: 'Four Aces + 2–4' },
      { wins: [WIN.FOUR_ACES], label: 'Four Aces' },
      { wins: [WIN.FOUR_234_KICKER], label: 'Four 2s–4s + A–4' },
      { wins: [WIN.FOUR_234], label: 'Four 2s–4s' },
      { wins: [WIN.FOUR_5K], label: 'Four 5s–Ks' },
      { wins: [WIN.FULL_HOUSE], label: 'Full House' },
      { wins: [WIN.FLUSH], label: 'Flush' },
      { wins: [WIN.STRAIGHT], label: 'Straight' },
      { wins: [WIN.THREE], label: 'Three of a Kind' },
      { wins: [WIN.TWO_PAIR], label: 'Two Pair' },
      { wins: [WIN.JACKS], label: 'Jacks or Better' },
    ],
  },
  {
    id: 'deuces-wild',
    name: 'Deuces Wild',
    short: 'DEUCES',
    ratio: 'full pay',
    expectedReturn: 1.0076,
    // No pair pays, so minPairRank sits above any real rank.
    minPairRank: 99,
    quadTiers: false,
    wild: 2,
    pay: DEUCES_PAY,
    rows: [
      { wins: [WIN.ROYAL], label: 'Natural Royal Flush' },
      { wins: [WIN.FOUR_DEUCES], label: 'Four Deuces' },
      { wins: [WIN.WILD_ROYAL], label: 'Wild Royal Flush' },
      { wins: [WIN.FIVE_KIND], label: 'Five of a Kind' },
      { wins: [WIN.STRAIGHT_FLUSH], label: 'Straight Flush' },
      { wins: [WIN.FOUR_KIND], label: 'Four of a Kind' },
      { wins: [WIN.FULL_HOUSE], label: 'Full House' },
      { wins: [WIN.FLUSH], label: 'Flush' },
      { wins: [WIN.STRAIGHT], label: 'Straight' },
      { wins: [WIN.THREE], label: 'Three of a Kind' },
    ],
  },
];

// Each listing carries the amount per hand so the paytable can render without
// knowing the pay array's shape.
for (const variant of VARIANTS) {
  for (const row of variant.rows) row.amount = variant.pay[row.wins[0]];
}

export const DEFAULT_VARIANT = VARIANTS[0];

export function variantById(id) {
  return VARIANTS.find(variant => variant.id === id) ?? DEFAULT_VARIANT;
}

// Legacy single-table export (Jacks or Better), kept for the return simulator.
export const PAY_TABLE = {
  [CATEGORY.HIGH_CARD]: 0,
  [CATEGORY.ONE_PAIR]: 1,
  [CATEGORY.TWO_PAIR]: 2,
  [CATEGORY.THREE_OF_A_KIND]: 3,
  [CATEGORY.STRAIGHT]: 4,
  [CATEGORY.FLUSH]: 6,
  [CATEGORY.FULL_HOUSE]: 9,
  [CATEGORY.FOUR_OF_A_KIND]: 25,
  [CATEGORY.STRAIGHT_FLUSH]: 50,
  [CATEGORY.ROYAL_FLUSH]: 250,
};

export const PAY_LABEL = {
  [CATEGORY.HIGH_CARD]: 'No win',
  [CATEGORY.ONE_PAIR]: 'Jacks or Better',
  [CATEGORY.TWO_PAIR]: 'Two Pair',
  [CATEGORY.THREE_OF_A_KIND]: 'Three of a Kind',
  [CATEGORY.STRAIGHT]: 'Straight',
  [CATEGORY.FLUSH]: 'Flush',
  [CATEGORY.FULL_HOUSE]: 'Full House',
  [CATEGORY.FOUR_OF_A_KIND]: 'Four of a Kind',
  [CATEGORY.STRAIGHT_FLUSH]: 'Straight Flush',
  [CATEGORY.ROYAL_FLUSH]: 'Royal Flush',
};

export const MIN_PAIR_RANK = 11;

// Grading a made four of a kind needs the rank of the quad and the rank of the
// single kicker, both of which evaluate5 already exposes in `strength`.
function quadWin(result, variant) {
  if (!variant.quadTiers) return WIN.FOUR_KIND;
  const quadRank = result.strength[1];
  const kickerRank = result.strength[2];
  const lowKicker = kickerRank >= 2 && kickerRank <= 4;
  if (quadRank === 14) return lowKicker ? WIN.FOUR_ACES_KICKER : WIN.FOUR_ACES;
  if (quadRank <= 4) return (kickerRank === 14 || lowKicker) ? WIN.FOUR_234_KICKER : WIN.FOUR_234;
  return WIN.FOUR_5K;
}

export function winCodeFor(result, variant = DEFAULT_VARIANT) {
  switch (result.category) {
    case CATEGORY.HIGH_CARD: return WIN.NONE;
    case CATEGORY.ONE_PAIR:
      return result.strength[1] >= variant.minPairRank ? WIN.JACKS : WIN.LOW_PAIR;
    case CATEGORY.TWO_PAIR: return WIN.TWO_PAIR;
    case CATEGORY.THREE_OF_A_KIND: return WIN.THREE;
    case CATEGORY.STRAIGHT: return WIN.STRAIGHT;
    case CATEGORY.FLUSH: return WIN.FLUSH;
    case CATEGORY.FULL_HOUSE: return WIN.FULL_HOUSE;
    case CATEGORY.FOUR_OF_A_KIND: return quadWin(result, variant);
    case CATEGORY.STRAIGHT_FLUSH: return WIN.STRAIGHT_FLUSH;
    case CATEGORY.ROYAL_FLUSH: return WIN.ROYAL;
    default: return WIN.NONE;
  }
}

// ---- Deuces Wild reference evaluator -------------------------------------
//
// With wilds on the table we cannot lean on evaluate5: a deuce stands for
// whatever card makes the best hand, so the ranking depends on the substitution.
// The reference enumerates every rank each wild could take (13 choices each, and
// a wild never needs to become another deuce) and keeps the highest-paying
// result. Suits only matter for flushes, so that is decided once the final ranks
// are known. The coach grades with a faster analytic evaluator; this one is the
// independent check it is graded against.

const ROYAL_RANKS = [10, 11, 12, 13, 14];

function straightHigh(ranks) {
  const uniq = [...new Set(ranks)].sort((a, b) => a - b);
  if (uniq.length !== 5) return 0;
  if (uniq[4] - uniq[0] === 4) return uniq[4];
  if (uniq.join(',') === '2,3,4,5,14') return 5; // ace-low wheel
  return 0;
}

function rankWin(ranks, flushPossible) {
  const counts = new Map();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.values()].sort((a, b) => b - a);
  if (groups[0] === 5) return WIN.FIVE_KIND;
  const straight = straightHigh(ranks);
  if (straight && flushPossible) {
    const royal = [...new Set(ranks)].sort((a, b) => a - b).every((r, i) => r === ROYAL_RANKS[i]);
    return royal ? WIN.WILD_ROYAL : WIN.STRAIGHT_FLUSH;
  }
  if (groups[0] === 4) return WIN.FOUR_KIND;
  if (groups[0] === 3 && groups[1] === 2) return WIN.FULL_HOUSE;
  if (flushPossible && groups.length === 5) return WIN.FLUSH;
  if (straight) return WIN.STRAIGHT;
  if (groups[0] === 3) return WIN.THREE;
  return WIN.NONE;
}

export function winCodeOf(cards, variant = DEFAULT_VARIANT) {
  if (!variant.wild) return winCodeFor(evaluate5(cards), variant);
  const deuces = cards.filter(c => c.r === variant.wild).length;
  if (deuces === 0) return winCodeFor(evaluate5(cards), variant);
  if (deuces === 4) return WIN.FOUR_DEUCES;
  const naturals = cards.filter(c => c.r !== variant.wild);
  const flushPossible = naturals.every(c => c.s === naturals[0].s);
  const base = naturals.map(c => c.r);
  const assign = new Array(deuces).fill(3);
  let best = WIN.NONE;
  const choose = (i) => {
    if (i === deuces) {
      const win = rankWin([...base, ...assign], flushPossible);
      const pay = DEUCES_PAY[win];
      const bestPay = DEUCES_PAY[best];
      if (pay > bestPay || (pay === bestPay && win > best)) best = win;
      return;
    }
    // A wild may also stand in as a natural two to complete the ace-low wheel.
    for (let r = 2; r <= 14; r++) {
      assign[i] = r;
      choose(i + 1);
    }
  };
  choose(0);
  return best;
}

export function payoutForWin(win, variant = DEFAULT_VARIANT) {
  return variant.pay[win] ?? 0;
}

export function rowForWin(variant, win) {
  return variant.rows.find(row => row.wins.includes(win)) ?? null;
}

export function payFor(result, variant = DEFAULT_VARIANT) {
  return payoutForWin(winCodeFor(result, variant), variant);
}

export function payLabelFor(result, variant = DEFAULT_VARIANT) {
  const win = winCodeFor(result, variant);
  return rowForWin(variant, win)?.label ?? WIN_LABEL[win] ?? WIN_LABEL[WIN.NONE];
}

export function pays(result, variant = DEFAULT_VARIANT) {
  return payFor(result, variant) > 0;
}

export function newRound(rng = Math.random, { hand = null, variantId = DEFAULT_VARIANT.id } = {}) {
  const deck = freshDeck(rng);
  if (Array.isArray(hand)) {
    if (hand.length !== 5) throw new Error('Rigged video poker hands need exactly five cards');
    for (const card of hand) {
      const at = deck.findIndex(c => c.r === card.r && c.s === card.s);
      if (at === -1) throw new Error(`Rigged card not in the deck: ${card.r}/${card.s}`);
      deck.splice(at, 1);
    }
  }
  const dealt = Array.isArray(hand) ? hand.map(c => ({ ...c })) : deck.splice(0, 5);
  return {
    game: GAME.id,
    hand: dealt,
    deck,
    holds: [false, false, false, false, false],
    drawn: false,
    result: null,
    payout: 0,
    win: WIN.NONE,
    winLabel: WIN_LABEL[WIN.NONE],
    variantId: variantById(variantId).id,
  };
}

export function toggleHold(round, index) {
  if (round.drawn || index < 0 || index >= 5) return round;
  round.holds = round.holds.slice();
  round.holds[index] = !round.holds[index];
  return round;
}

export function setHolds(round, holds) {
  if (round.drawn) return round;
  round.holds = holds.slice(0, 5);
  while (round.holds.length < 5) round.holds.push(false);
  return round;
}

export function draw(round) {
  if (round.drawn) return round;
  round.hand = round.hand.slice();
  for (let i = 0; i < round.hand.length; i++) {
    if (!round.holds[i]) round.hand[i] = round.deck.shift();
  }
  const variant = variantById(round.variantId);
  round.variantId = variant.id;
  round.result = evaluate5(round.hand);
  round.win = variant.wild ? winCodeOf(round.hand, variant) : winCodeFor(round.result, variant);
  round.payout = variant.pay[round.win];
  round.winLabel = rowForWin(variant, round.win)?.label ?? WIN_LABEL[round.win] ?? WIN_LABEL[WIN.NONE];
  round.drawn = true;
  return round;
}
