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

export { GAME, BET, MAX_HANDS, sumHand, isBlackjack, legalActions, newRound, hit, stand, double, split, dealerPlay, finishRound, currentHand, rankName };
export { ACE, TEN, RANKS, MAX_HITS, cardIndex, rankOf, cardValue, shoeCounts, countsSize, addCard, dealerDistribution, standAgainst, standEv, buildHits, hitAndStand, doubleEv, splitEv, unknownPool, clearCache, bestAction };

export const near = (actual, expected, tol, label) =>
  (Math.abs(actual - expected) <= tol) || (() => { throw new Error(`${label ?? ''} expected ${expected} +/-${tol}, got ${actual}`); })();

export const c = (r, s = 0) => ({ r, s });

export function sixDeckShoe() {
  const deck = [];
  for (let d = 0; d < 6; d++) for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) deck.push(c(r, s));
  return deck;
}

export function roundWith(playerRanks, upRank) {
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

export const CHART_ACTION = { P: 'split', S: 'stand', H: 'hit', D: 'double' };
export const UPCARDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 14];

export const GOLDEN = [
  { hand: [10, 9], up: 6, action: 'stand', ev: 0.6690 },
  { hand: [10, 9], up: 10, action: 'stand', ev: 0.1696 },
  { hand: [10, 6], up: 10, action: 'hit', ev: -0.3846 },
  { hand: [10, 6], up: 6, action: 'stand', ev: 0.4367 },
  { hand: [14, 6], up: 6, action: 'stand', ev: 0.6656 },
  { hand: [14, 6], up: 10, action: 'hit', ev: -0.3851 },
  { hand: [14, 5], up: 6, action: 'double', ev: 0.6477 },
  { hand: [14, 5], up: 10, action: 'hit', ev: -0.3941 },
  { hand: [8, 8], up: 8, action: 'split', ev: -0.0211 },
  { hand: [8, 8], up: 10, action: 'split', ev: -0.4743 },
  { hand: [9, 9], up: 7, action: 'stand', ev: 0.6604 },
  { hand: [9, 9], up: 9, action: 'split', ev: 0.3128 },
  { hand: [7, 7], up: 7, action: 'split', ev: 0.2188 },
  { hand: [7, 7], up: 10, action: 'hit', ev: -0.4098 },
  { hand: [14, 14], up: 6, action: 'split', ev: 0.7013 },
];
