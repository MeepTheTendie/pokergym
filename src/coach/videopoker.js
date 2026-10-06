import { makeDeck } from '../cards.js';
import { CATEGORY } from '../evaluate.js';
import { PAY_TABLE } from '../games/videopoker.js';

export function pack(card) {
  return (card.r - 2) * 4 + card.s;
}

export function unpack(value) {
  return { r: (value >> 2) + 2, s: value & 3 };
}

const RANK_COUNTS = new Int8Array(13);
const HAND = new Int8Array(5);

let pairRank = -1;

const isRoyal = (high) => high === 12;

export const MIN_PAIR_RANK = 11;
const MIN_PAIR_INDEX = MIN_PAIR_RANK - 2;

function categoryOfHand() {
  RANK_COUNTS.fill(0);
  pairRank = -1;
  const firstSuit = HAND[0] & 3;
  let flush = true;
  for (let i = 0; i < 5; i++) {
    RANK_COUNTS[HAND[i] >> 2]++;
    if ((HAND[i] & 3) !== firstSuit) flush = false;
  }

  let distinct = 0;
  let max = -1;
  let min = 13;
  let pairs = 0;
  let trips = 0;
  let quads = 0;
  let topPair = -1;

  for (let r = 0; r < 13; r++) {
    const n = RANK_COUNTS[r];
    if (n === 0) continue;
    distinct++;
    if (r > max) max = r;
    if (r < min) min = r;
    if (n === 4) quads++;
    else if (n === 3) trips++;
    else if (n === 2) {
      pairs++;
      if (r > topPair) topPair = r;
    }
  }

  let straightHigh = 0;
  if (distinct === 5) {
    if (max - min === 4) straightHigh = max;
    else if (max === 12 && min === 0 && RANK_COUNTS[0] && RANK_COUNTS[1] && RANK_COUNTS[2] && RANK_COUNTS[3]) {
      straightHigh = 3;
    }
  }

  if (straightHigh && flush) {
    return isRoyal(straightHigh) ? CATEGORY.ROYAL_FLUSH : CATEGORY.STRAIGHT_FLUSH;
  }
  if (quads) return CATEGORY.FOUR_OF_A_KIND;
  if (trips && pairs) return CATEGORY.FULL_HOUSE;
  if (flush) return CATEGORY.FLUSH;
  if (straightHigh) return CATEGORY.STRAIGHT;
  if (trips) return CATEGORY.THREE_OF_A_KIND;
  if (pairs === 2) return CATEGORY.TWO_PAIR;
  if (pairs === 1) {
    pairRank = topPair;
    return CATEGORY.ONE_PAIR;
  }
  return CATEGORY.HIGH_CARD;
}

export function payoutOfHand() {
  const category = categoryOfHand();
  if (category === CATEGORY.ONE_PAIR && pairRank < MIN_PAIR_INDEX) return 0;
  return PAY_TABLE[category];
}

export function categoryOf(cards) {
  for (let i = 0; i < 5; i++) HAND[i] = pack(cards[i]);
  return categoryOfHand();
}

const BINOM = (() => {
  const t = [];
  for (let n = 0; n <= 53; n++) {
    t[n] = [];
    for (let k = 0; k <= n; k++) t[n][k] = k === 0 ? 1 : (t[n - 1][k - 1] ?? 0) + (t[n - 1][k] ?? 0);
  }
  return t;
})();

export function binomial(n, k) {
  if (k < 0 || k > n) return 0;
  return BINOM[n][k];
}

function payoutSum(pool, poolLength, need, heldLength, start, depth) {
  if (depth === need) return payoutOfHand();
  let sum = 0;
  const limit = poolLength - (need - depth);
  for (let i = start; i <= limit; i++) {
    HAND[heldLength + depth] = pool[i];
    sum += payoutSum(pool, poolLength, need, heldLength, i + 1, depth + 1);
  }
  return sum;
}

export function countDraws(poolLength, need) {
  let count = 0;
  const walk = (start, depth) => {
    if (depth === need) {
      count++;
      return;
    }
    const limit = poolLength - (need - depth);
    for (let i = start; i <= limit; i++) walk(i + 1, depth + 1);
  };
  walk(0, 0);
  return count;
}

const STRATEGY_CACHE = new Map();

function canonicalKey(hand) {
  return hand.map(pack).sort((a, b) => a - b).join(',');
}

export function holdPatterns(size = 5) {
  const out = [];
  for (let mask = 0; mask < 1 << size; mask++) {
    out.push(Array.from({ length: size }, (_, i) => Boolean(mask & (1 << i))));
  }
  return out;
}

export function bestHold(hand, { deck = makeDeck(), cache = STRATEGY_CACHE } = {}) {
  const key = canonicalKey(hand);
  if (cache.has(key)) return cache.get(key);

  const packedHand = hand.map(pack);
  const inHand = new Set(packedHand);
  const pool = deck.map(pack).filter((v) => !inHand.has(v));
  const poolLength = pool.length;

  const options = [];
  for (const pattern of holdPatterns(5)) {
    let heldLength = 0;
    for (let i = 0; i < 5; i++) {
      if (pattern[i]) HAND[heldLength++] = packedHand[i];
    }
    const need = 5 - heldLength;
    const ways = binomial(poolLength, need);
    const ev = need === 0
      ? payoutOfHand()
      : payoutSum(pool, poolLength, need, heldLength, 0, 0) / ways;
    options.push({ holds: pattern, ev, keptCount: heldLength, ways });
  }

  options.sort((a, b) => b.ev - a.ev);
  const top = options[0].ev;
  const optimal = options.filter((o) => o.ev >= top - 1e-9);

  const result = {
    holds: options[0].holds,
    ev: options[0].ev,
    optimal: optimal.map((o) => o.holds),
    options,
  };
  cache.set(key, result);
  return result;
}

export function clearCache() {
  STRATEGY_CACHE.clear();
}