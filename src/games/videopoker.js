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
 * Deuces Wild (wild twos, five of a kind, four deuces) is a different evaluator
 * and is intentionally not part of this set.
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
};

// Pay per hand, indexed by WIN code.
const JOB_PAY = [0, 0, 1, 2, 3, 4, 6, 9, 25, 0, 0, 0, 0, 0, 50, 250];
const BONUS_PAY = [0, 0, 1, 2, 3, 4, 5, 8, 0, 25, 40, 80, 40, 80, 50, 250];
const DDB_PAY = [0, 0, 1, 2, 3, 4, 6, 9, 0, 50, 80, 160, 160, 400, 50, 250];

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
  round.win = winCodeFor(round.result, variant);
  round.payout = variant.pay[round.win];
  round.winLabel = rowForWin(variant, round.win)?.label ?? WIN_LABEL[round.win] ?? WIN_LABEL[WIN.NONE];
  round.drawn = true;
  return round;
}
