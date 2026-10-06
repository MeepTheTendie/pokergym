import { freshDeck, shuffle } from '../cards.js';
import { evaluate } from '../evaluate.js';

export const GAME = {
  id: 'holdem',
  name: 'Texas Hold\'em',
  handSize: 2,
  deck: 'single',
};

export const PAY_TABLE = {};

export function newRound(rng = Math.random) {
  const deck = freshDeck(rng);
  const hole = [deck.shift(), deck.shift()];
  const flop = [deck.shift(), deck.shift(), deck.shift()];
  const turn = deck.shift();
  const river = deck.shift();
  const community = [flop[0], flop[1], flop[2], turn, river];
  const hand7 = hole.concat(community);
  const result = evaluate(hand7);
  return {
    game: GAME.id,
    deck,
    hole,
    flop,
    turn,
    river,
    community,
    hand7,
    result,
    bestFive: result?.cards || [],
    category: result?.category,
    label: result?.label,
    payout: 0,
    settled: true,
    log: ['DEALT HAND'],
  };
}

export function setHolds() { return null; }
export function toggleHold() { return null; }
