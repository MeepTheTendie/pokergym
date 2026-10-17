import { makeDeck } from '../cards.js';
import { CATEGORY } from '../evaluate.js';
import { WIN, DEFAULT_VARIANT, variantById } from '../games/videopoker.js';

export function pack(card) {
  return (card.r - 2) * 4 + card.s;
}

export function unpack(value) {
  return { r: (value >> 2) + 2, s: value & 3 };
}

const RANK_COUNTS = new Int8Array(13);
const HAND = new Int8Array(5);

// Rank indices (0 = two) captured by the last categoryOfHand call, so a win code
// can be read without re-walking the hand.
let pairRank = -1;
let quadRank = -1;
let kickerRank = -1;
let lastCategory = -1;

const isRoyal = (high) => high === 12;

export const MIN_PAIR_RANK = 11;

// The active variant drives payoutOfHand during a hold search. bestHold sets it
// around the enumeration; nothing else changes it.
let ACTIVE = DEFAULT_VARIANT;

// Windows a natural rank set must sit inside to make a straight. Rank indices run
// 0 = two through 12 = ace, so 0-8 are the ordinary five-card windows and the last
// entry is the ace-low wheel (A,2,3,4,5).
const ROYAL_MASK = (1 << 8) | (1 << 9) | (1 << 10) | (1 << 11) | (1 << 12);
const WINDOW_MASKS = (() => {
  const masks = [];
  for (let s = 0; s <= 8; s++) masks.push(((1 << (s + 5)) - 1) & ~((1 << s) - 1));
  masks.push((1 << 12) | 1 | (1 << 1) | (1 << 2) | (1 << 3));
  return masks;
})();

function naturalsFitWindow(mask) {
  for (const window of WINDOW_MASKS) {
    if ((mask & ~window) === 0) return true;
  }
  return false;
}

// Deuces Wild, analytic. With d wilds the five-card hand is the naturals plus d
// cards we choose freely, so each winning shape is a feasibility question rather
// than an enumeration. Checked top-down by payout, which matches how the hand is
// scored: no pair pays here, so a lone pair is simply no win.
function deucesWin(variant) {
  RANK_COUNTS.fill(0);
  pairRank = -1;
  quadRank = -1;
  kickerRank = -1;
  for (let i = 0; i < 5; i++) RANK_COUNTS[HAND[i] >> 2]++;
  const d = RANK_COUNTS[0];
  if (d === 0) {
    categoryOfHand();
    return winOfHand(variant);
  }
  if (d === 4) return WIN.FOUR_DEUCES;

  const n = 5 - d;
  let firstSuit = -1;
  let sameSuit = true;
  let mask = 0;
  let distinct = 0;
  let maxCount = 0;
  for (let i = 0; i < 5; i++) {
    const rank = HAND[i] >> 2;
    if (rank === 0) continue; // the wild itself
    const suit = HAND[i] & 3;
    if (firstSuit === -1) firstSuit = suit;
    else if (suit !== firstSuit) sameSuit = false;
    if (!(mask & (1 << rank))) {
      mask |= 1 << rank;
      distinct++;
    }
    if (RANK_COUNTS[rank] > maxCount) maxCount = RANK_COUNTS[rank];
  }

  // A wild royal is a flush whose naturals are all in {T..A}; a natural royal
  // needs no wilds and is handled above.
  if (sameSuit && distinct === n && (mask & ~ROYAL_MASK) === 0) return WIN.WILD_ROYAL;
  // Five of a kind: every natural is the same rank and the wilds copy it.
  if (distinct === 1) return WIN.FIVE_KIND;
  if (sameSuit && distinct === n && naturalsFitWindow(mask)) return WIN.STRAIGHT_FLUSH;
  // Quads need three naturals of one rank plus a wild, etc.
  if (maxCount + d >= 4) return WIN.FOUR_KIND;
  // Any hand with exactly two natural ranks makes a full house once wilds fill
  // the trips and the pair.
  if (distinct === 2) return WIN.FULL_HOUSE;
  if (sameSuit) return WIN.FLUSH;
  if (distinct === n && naturalsFitWindow(mask)) return WIN.STRAIGHT;
  if (maxCount + d >= 3) return WIN.THREE;
  return WIN.NONE;
}

// One entry point for "what did the active hand win", dispatching to the wild
// evaluator only when the pay table actually has wilds.
function classifyActive(variant) {
  if (variant.wild) return deucesWin(variant);
  categoryOfHand();
  return winOfHand(variant);
}

function categoryOfHand() {
  RANK_COUNTS.fill(0);
  pairRank = -1;
  quadRank = -1;
  kickerRank = -1;
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
    if (n === 4) {
      quads++;
      quadRank = r;
    } else if (n === 3) trips++;
    else if (n === 2) {
      pairs++;
      if (r > topPair) topPair = r;
    } else if (n === 1) {
      kickerRank = r;
    }
  }

  let straightHigh = 0;
  if (distinct === 5) {
    if (max - min === 4) straightHigh = max;
    else if (max === 12 && min === 0 && RANK_COUNTS[0] && RANK_COUNTS[1] && RANK_COUNTS[2] && RANK_COUNTS[3]) {
      straightHigh = 3;
    }
  }

  let category;
  if (straightHigh && flush) {
    category = isRoyal(straightHigh) ? CATEGORY.ROYAL_FLUSH : CATEGORY.STRAIGHT_FLUSH;
  } else if (quads) category = CATEGORY.FOUR_OF_A_KIND;
  else if (trips && pairs) category = CATEGORY.FULL_HOUSE;
  else if (flush) category = CATEGORY.FLUSH;
  else if (straightHigh) category = CATEGORY.STRAIGHT;
  else if (trips) category = CATEGORY.THREE_OF_A_KIND;
  else if (pairs === 2) category = CATEGORY.TWO_PAIR;
  else if (pairs === 1) {
    pairRank = topPair;
    category = CATEGORY.ONE_PAIR;
  } else category = CATEGORY.HIGH_CARD;

  lastCategory = category;
  return category;
}

// Mirrors the win-code mapping in games/videopoker.js, but reads the rank indices
// the fast evaluator already holds (values are +2 from the index).
function winOfHand(variant) {
  switch (lastCategory) {
    case CATEGORY.HIGH_CARD: return WIN.NONE;
    case CATEGORY.ONE_PAIR:
      return (pairRank + 2) >= variant.minPairRank ? WIN.JACKS : WIN.LOW_PAIR;
    case CATEGORY.TWO_PAIR: return WIN.TWO_PAIR;
    case CATEGORY.THREE_OF_A_KIND: return WIN.THREE;
    case CATEGORY.STRAIGHT: return WIN.STRAIGHT;
    case CATEGORY.FLUSH: return WIN.FLUSH;
    case CATEGORY.FULL_HOUSE: return WIN.FULL_HOUSE;
    case CATEGORY.FOUR_OF_A_KIND: {
      if (!variant.quadTiers) return WIN.FOUR_KIND;
      const q = quadRank + 2;
      const k = kickerRank + 2;
      const lowKicker = k >= 2 && k <= 4;
      if (q === 14) return lowKicker ? WIN.FOUR_ACES_KICKER : WIN.FOUR_ACES;
      if (q <= 4) return (k === 14 || lowKicker) ? WIN.FOUR_234_KICKER : WIN.FOUR_234;
      return WIN.FOUR_5K;
    }
    case CATEGORY.STRAIGHT_FLUSH: return WIN.STRAIGHT_FLUSH;
    case CATEGORY.ROYAL_FLUSH: return WIN.ROYAL;
    default: return WIN.NONE;
  }
}

export function payoutOfHand() {
  return ACTIVE.pay[classifyActive(ACTIVE)];
}

export function categoryOf(cards) {
  for (let i = 0; i < 5; i++) HAND[i] = pack(cards[i]);
  return categoryOfHand();
}

// Win code for a concrete five-card hand under a variant: the bridge the game
// layer and tests use to check the fast evaluator against evaluate5.
export function winCodeOfHand(cards, variant = DEFAULT_VARIANT) {
  const v = typeof variant === 'string' ? variantById(variant) : variant;
  for (let i = 0; i < 5; i++) HAND[i] = pack(cards[i]);
  const prev = ACTIVE;
  ACTIVE = v;
  const win = classifyActive(v);
  ACTIVE = prev;
  return win;
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

function orderedKey(hand) {
  // Cached hold patterns refer to positions in the original hand.
  // Sorting cards here would reuse those positions for a different deal order.
  return hand.map(pack).join(',');
}

export function holdPatterns(size = 5) {
  const out = [];
  for (let mask = 0; mask < 1 << size; mask++) {
    out.push(Array.from({ length: size }, (_, i) => Boolean(mask & (1 << i))));
  }
  return out;
}

export function bestHold(hand, { deck = makeDeck(), cache = STRATEGY_CACHE, variant = DEFAULT_VARIANT } = {}) {
  const v = typeof variant === 'string' ? variantById(variant) : variant;
  const key = `${v.id}|${orderedKey(hand)}`;
  if (cache.has(key)) return cache.get(key);

  const packedHand = hand.map(pack);
  const inHand = new Set(packedHand);
  const pool = deck.map(pack).filter((value) => !inHand.has(value));
  const poolLength = pool.length;

  // The enumeration pays the active variant, so pin it for the whole search and
  // put the previous variant back even if a pay table is malformed.
  const previous = ACTIVE;
  ACTIVE = v;
  let options;
  try {
    options = [];
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
  } finally {
    ACTIVE = previous;
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
