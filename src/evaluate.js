import { combinations } from './cards.js';

export const CATEGORY = {
  HIGH_CARD: 0,
  ONE_PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
  ROYAL_FLUSH: 9,
};

export const CATEGORY_LABEL = {
  0: 'High Card',
  1: 'One Pair',
  2: 'Two Pair',
  3: 'Three of a Kind',
  4: 'Straight',
  5: 'Flush',
  6: 'Full House',
  7: 'Four of a Kind',
  8: 'Straight Flush',
  9: 'Royal Flush',
};

function groupsOf(ranks) {
  const counts = new Map();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  return [...counts.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
}

function straightHigh(ranks) {
  const unique = [...new Set(ranks)].sort((a, b) => b - a);
  if (unique.length !== 5) return 0;
  if (unique[0] - unique[4] === 4) return unique[0];
  if (unique[0] === 14 && unique[1] === 5 && unique[4] === 2) return 5;
  return 0;
}

export function evaluate5(cards) {
  const ranks = cards.map((c) => c.r);
  const sorted = [...ranks].sort((a, b) => b - a);
  const groups = groupsOf(ranks);
  const flush = cards.every((c) => c.s === cards[0].s);
  const straight = straightHigh(ranks);

  const byCount = (n) => groups.filter((g) => g.count === n).map((g) => g.rank);
  const quads = byCount(4);
  const trips = byCount(3);
  const pairs = byCount(2);
  const kickers = byCount(1);
  const desc = (arr) => [...arr].sort((a, b) => b - a);

  let category;
  let strength;

  if (straight && flush) {
    if (straight === 14) category = CATEGORY.ROYAL_FLUSH;
    else category = CATEGORY.STRAIGHT_FLUSH;
    strength = [straight];
  } else if (quads.length) {
    category = CATEGORY.FOUR_OF_A_KIND;
    strength = [quads[0], kickers[0]];
  } else if (trips.length && pairs.length) {
    category = CATEGORY.FULL_HOUSE;
    strength = [trips[0], pairs[0]];
  } else if (flush) {
    category = CATEGORY.FLUSH;
    strength = desc(sorted);
  } else if (straight) {
    category = CATEGORY.STRAIGHT;
    strength = [straight];
  } else if (trips.length) {
    category = CATEGORY.THREE_OF_A_KIND;
    strength = [trips[0], ...desc(kickers)];
  } else if (pairs.length === 2) {
    category = CATEGORY.TWO_PAIR;
    strength = [...desc(pairs), kickers[0]];
  } else if (pairs.length === 1) {
    category = CATEGORY.ONE_PAIR;
    strength = [pairs[0], ...desc(kickers)];
  } else {
    category = CATEGORY.HIGH_CARD;
    strength = desc(sorted);
  }

  return {
    category,
    label: CATEGORY_LABEL[category],
    strength: [category, ...strength],
    cards,
    ranks: desc(sorted),
  };
}

export function compareStrength(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

export function evaluate(cards) {
  if (cards.length === 5) return evaluate5(cards);
  if (cards.length < 5) return null;
  let best = null;
  for (const combo of combinations(cards, 5)) {
    const result = evaluate5(combo);
    if (!best || compareStrength(result.strength, best.strength) > 0) best = result;
  }
  return best;
}