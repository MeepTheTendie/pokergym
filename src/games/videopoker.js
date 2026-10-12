import { freshDeck } from '../cards.js';
import { evaluate5, CATEGORY } from '../evaluate.js';

export const GAME = {
  id: 'videopoker',
  name: 'Jacks or Better',
  handSize: 5,
  deck: 'single',
  draws: 1,
};

export const PAY_TABLE = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 6,
  6: 9,
  7: 25,
  8: 50,
  9: 250,
};

export const PAY_LABEL = {
  0: 'No win',
  1: 'Jacks or Better',
  2: 'Two Pair',
  3: 'Three of a Kind',
  4: 'Straight',
  5: 'Flush',
  6: 'Full House',
  7: 'Four of a Kind',
  8: 'Straight Flush',
  9: 'Royal Flush',
};

export const MIN_PAIR_RANK = 11;

export function pays(result) {
  if (result.category === CATEGORY.ONE_PAIR && result.strength[1] < MIN_PAIR_RANK) return false;
  return result.payout == null ? PAY_TABLE[result.category] > 0 : result.payout > 0;
}

export function payFor(result) {
  if (result.category === CATEGORY.ONE_PAIR && result.strength[1] < MIN_PAIR_RANK) return 0;
  return PAY_TABLE[result.category];
}

export function payLabelFor(result) {
  return payFor(result) ? PAY_LABEL[result.category] : PAY_LABEL[0];
}

export function newRound(rng = Math.random, { hand = null } = {}) {
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
  round.result = evaluate5(round.hand);
  round.payout = payFor(round.result);
  round.drawn = true;
  return round;
}