export const RANK_MIN = 2;
export const RANK_MAX = 14;

export const SUITS = ['s', 'h', 'd', 'c'];
export const SUIT_GLYPH = ['♠', '♥', '♦', '♣'];
export const SUIT_NAME = ['spades', 'hearts', 'diamonds', 'clubs'];

const RANK_GLYPH = {
  14: 'A',
  13: 'K',
  12: 'Q',
  11: 'J',
  10: '10',
};

export function rankLabel(rank) {
  return RANK_GLYPH[rank] ?? String(rank);
}

export function cardLabel(card) {
  return rankLabel(card.r) + SUIT_GLYPH[card.s];
}

export function cardName(card) {
  return rankLabel(card.r) + SUITS[card.s];
}

export function suitIndex(char) {
  return SUITS.indexOf(char);
}

export function makeDeck() {
  const deck = [];
  for (let r = RANK_MIN; r <= RANK_MAX; r++) {
    for (let s = 0; s < SUITS.length; s++) deck.push({ r, s });
  }
  return deck;
}

export function shuffle(deck, rng = Math.random) {
  const out = deck.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function freshDeck(rng = Math.random) {
  return shuffle(makeDeck(), rng);
}

export function seededRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dealFrom(deck, count) {
  return deck.splice(0, count);
}

export function combinations(cards, size) {
  if (size === 0) return [[]];
  if (cards.length < size) return [];
  const out = [];
  const walk = (start, acc) => {
    if (acc.length === size) {
      out.push(acc.slice());
      return;
    }
    for (let i = start; i <= cards.length - (size - acc.length); i++) {
      acc.push(cards[i]);
      walk(i + 1, acc);
      acc.pop();
    }
  };
  walk(0, []);
  return out;
}