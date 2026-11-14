import { freshDeck, shuffle } from '../cards.js';
import { evaluate } from '../evaluate.js';

export const GAME = {
  id: 'holdem',
  name: 'Texas Hold\'em',
  handSize: 2,
  deck: 'single',
};

export const PAY_TABLE = {};

export function newRound(rng = Math.random, rigged = null) {
  const deck = freshDeck(rng);
  let hole;
  let flop;
  let turn;
  let river;
  if (rigged && Array.isArray(rigged.hole) && Array.isArray(rigged.board)) {
    if (rigged.hole.length !== 2 || rigged.board.length !== 5) {
      throw new Error('Rigged hold\'em needs 2 hole cards and a 5-card board');
    }
    const pull = (card) => {
      const at = deck.findIndex(c => c.r === card.r && c.s === card.s);
      if (at === -1) throw new Error(`Rigged card not in the deck: ${card.r}/${card.s}`);
      deck.splice(at, 1);
      return { ...card };
    };
    hole = rigged.hole.map(pull);
    const board = rigged.board.map(pull);
    flop = [board[0], board[1], board[2]];
    turn = board[3];
    river = board[4];
  } else {
    hole = [deck.shift(), deck.shift()];
    flop = [deck.shift(), deck.shift(), deck.shift()];
    turn = deck.shift();
    river = deck.shift();
  }
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
