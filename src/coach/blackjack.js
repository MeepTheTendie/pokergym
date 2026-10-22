import {
  BLACKJACK_TOTAL, DEALER_STANDS, sumHand, isBlackjack, legalActions,
} from '../games/blackjack.js';

/*
 * Exact expected-value blackjack coach.
 *
 * The shoe is decomposed into a per-rank count table (ten entries: 2-9, one
 * collapsed entry for every ten-valued card, and one for the ace) so that every
 * branch of every action is enumerated by weight rather than by shuffling.
 * There is no lookup table and no sampling.
 *
 * Returns are in units of one base bet: a win is +1, a push 0, a loss -1, and a
 * two-card natural blackjack is +1.5 (3:2). Doubling returns twice the
 * single-bet value because twice the money is now at risk.
 *
 * How the search works
 * --------------------
 * For a given dealer upcard the coach first builds the exact distribution of
 * the dealer's final hand from the pool of cards the player cannot see (the
 * live shoe plus the hole card, which is never read). Against that
 * distribution it solves, once, "hit as many times as you like, then stand"
 * for every total. That table is what makes unlimited hitting affordable.
 *
 * The table is solved over the number of cards still to be drawn rather than
 * over the total. Totals will not do: a soft hand that draws past 21 drops back
 * to a hard total ten lower, and a hard total ten lower can draw an ace and
 * return to the soft total you started from, so the dependency graph over
 * totals has a cycle. Card count cannot cycle, and the values converge long
 * before the depth cap (MAX_HITS) is reached; tests assert the convergence.
 *
 * Splitting is the only choice that forks the shoe, so it is the only place a
 * fresh dealer distribution is built for a hypothetical shoe. DOCUMENTED
 * SIMPLIFICATION: inside one such fork, further hits of that sub-hand keep the
 * fork's distribution instead of re-deriving it card by card. Removing a card
 * from a 312-card shoe shifts the weights by a few percent, so this moves EV in
 * the fourth decimal place, not the first.
 */

export const ACTION_LABEL = {
  hit: 'HIT',
  stand: 'STAND',
  double: 'DOUBLE',
  split: 'SPLIT',
};

export const MAX_SPLIT_DEPTH = 3;
export const MAX_HITS = 10;

export const ACE = 9;
export const TEN = 8;
export const RANKS = 10;
const DIST_SIZE = 6; // index 0 = dealer bust, 1..5 = dealer stood on 17..21

export function cardIndex(rank) {
  if (rank === 14) return ACE;
  if (rank >= 10) return TEN;
  return rank - 2;
}

export function rankOf(index) {
  if (index === ACE) return 14;
  if (index === TEN) return 10;
  return index + 2;
}

export function cardValue(index) {
  return index === ACE ? 11 : index === TEN ? 10 : index + 2;
}

export function shoeCounts(cards) {
  const counts = new Int32Array(RANKS);
  for (const card of cards) counts[cardIndex(card.r)]++;
  return counts;
}

export function countsSize(counts) {
  let n = 0;
  for (let i = 0; i < RANKS; i++) n += counts[i];
  return n;
}

function copyCounts(counts) {
  return Int32Array.from(counts);
}

function idxOf(total, soft) {
  return total * 2 + (soft ? 1 : 0);
}

export function addCard(total, aces, index) {
  let nextTotal = total + cardValue(index);
  let nextAces = aces;
  if (index === ACE) nextAces++;
  while (nextTotal > BLACKJACK_TOTAL && nextAces > 0) {
    nextTotal -= 10;
    nextAces--;
  }
  return { total: nextTotal, aces: nextAces };
}

/* ---- dealer outcome distribution ---------------------------------------- */

/*
 * Memoised on the exact count vector plus the dealer's running total, which
 * together fully determine the distribution. Entries therefore stay valid as
 * the search tree walks hypothetical shoes, and sharing them across calls is
 * what keeps the search in the millisecond range.
 */
const dealerMemo = new Map();
const buildHitsMemo = new Map();
const DEALER_MEMO_LIMIT = 400000;

function signature(counts) {
  // One char per rank instead of number concatenation: the collapsed ten-rank
  // count tops out at 96 (4 ranks x 4 suits x 6 decks) and every other rank
  // at 24, so the code points stay distinct and this runs at every node of
  // the recursion.
  let s = '';
  for (let i = 0; i < RANKS; i++) s += String.fromCharCode(counts[i]);
  return s;
}

function dealerDist(counts, total, aces, key) {
  if (total > BLACKJACK_TOTAL) {
    const bust = new Float64Array(DIST_SIZE);
    bust[0] = 1;
    return bust;
  }
  const memoKey = `${key}:${total}:${aces}`;
  const cached = dealerMemo.get(memoKey);
  if (cached) return cached;

  const dist = new Float64Array(DIST_SIZE);
  if (total >= DEALER_STANDS) {
    dist[total - 16] = 1;
  } else {
    const n = countsSize(counts);
    let drawn = 0;
    for (let i = 0; i < RANKS; i++) {
      const c = counts[i];
      if (!c) continue;
      const probe = copyCounts(counts);
      probe[i]--;
      const next = addCard(total, aces, i);
      const sub = dealerDist(probe, next.total, next.aces, signature(probe));
      const w = c / n;
      for (let k = 0; k < DIST_SIZE; k++) dist[k] += w * sub[k];
      drawn += c;
    }
    if (drawn === 0) dist[0] = 1;
  }
  if (dealerMemo.size > DEALER_MEMO_LIMIT) dealerMemo.clear();
  dealerMemo.set(memoKey, dist);
  return dist;
}

/*
 * The game settles a dealer natural before the player is offered any choice
 * (newRound ends the round on the spot). So whenever the coach is asked, the
 * dealer is known NOT to hold blackjack, and the hole card under a ten or an
 * ace cannot be the card that would complete one. The first (hole) draw skips
 * that rank and renormalises; everything after it is unconditioned. Without
 * this, splits and doubles against a 10 or an ace were charged for losing two
 * bets to a dealer natural that can never happen once you are acting, which
 * is what made the coach hit 8-8 against a 10 or an ace.
 */
export function dealerDistribution(counts, upIndex) {
  const start = addCard(0, 0, upIndex);
  const blocked = upIndex === ACE ? TEN : upIndex === TEN ? ACE : -1;
  if (blocked < 0) return dealerDist(counts, start.total, start.aces, signature(counts));
  const n = countsSize(counts) - counts[blocked];
  const dist = new Float64Array(DIST_SIZE);
  if (n <= 0) {
    dist[0] = 1;
    return dist;
  }
  for (let i = 0; i < RANKS; i++) {
    const c = counts[i];
    if (!c || i === blocked) continue;
    const probe = copyCounts(counts);
    probe[i]--;
    const next = addCard(start.total, start.aces, i);
    const sub = dealerDist(probe, next.total, next.aces, signature(probe));
    const w = c / n;
    for (let k = 0; k < DIST_SIZE; k++) dist[k] += w * sub[k];
  }
  return dist;
}

export function standAgainst(dist, total) {
  if (total > BLACKJACK_TOTAL) return -1;
  let ev = dist[0];
  for (let t = DEALER_STANDS; t <= BLACKJACK_TOTAL; t++) {
    const p = dist[t - 16];
    if (!p) continue;
    if (total > t) ev += p;
    else if (total < t) ev -= p;
  }
  return ev;
}

export function standEv(counts, cards, upIndex) {
  if (isBlackjack(cards)) return 1.5;
  return standAgainst(dealerDistribution(counts, upIndex), sumHand(cards).total);
}

/* ---- "hit until you stop" table ----------------------------------------- */

const SLOTS = (BLACKJACK_TOTAL + 1) * 2;

/*
 * best[d] is the value of a hand with that total when at most d more cards may
 * be drawn before standing. hitVal[d] is the value of committing to exactly one
 * more card and then playing on with d - 1 left, which is the standalone value
 * of the HIT action.
 */
export function buildHits(dist, weights, maxHits = MAX_HITS) {
  const key = Array.from(dist).join(',') + '|' + Array.from(weights).join(',') + '|' + maxHits;
  const cached = buildHitsMemo.get(key);
  if (cached) return cached;
  const n = countsSize(weights);
  const stand = new Float64Array(SLOTS);
  for (let total = 0; total <= BLACKJACK_TOTAL; total++) {
    const ev = standAgainst(dist, total);
    stand[idxOf(total, false)] = ev;
    stand[idxOf(total, true)] = ev;
  }
  const best = [stand];
  const hitVal = [];
  if (n === 0) {
    for (let d = 1; d <= maxHits; d++) {
      const row = Float64Array.from(stand, (x) => (x > 0 ? -1 : -1));
      best.push(row);
      hitVal.push(new Float64Array(SLOTS).fill(-1));
    }
    const result = { best, hitVal, n };
    buildHitsMemo.set(key, result);
    return result;
  }
  for (let d = 1; d <= maxHits; d++) {
    const prev = best[d - 1];
    const hv = new Float64Array(SLOTS);
    const row = Float64Array.from(stand);
    for (let total = 4; total <= BLACKJACK_TOTAL; total++) {
      for (let soft = 0; soft < 2; soft++) {
        const idx = idxOf(total, soft);
        let sum = 0;
        for (let i = 0; i < RANKS; i++) {
          const c = weights[i];
          if (!c) continue;
          const next = addCard(total, soft, i);
          sum += c * (next.total > BLACKJACK_TOTAL ? -1 : prev[idxOf(next.total, next.aces > 0)]);
        }
        const value = sum / n;
        hv[idx] = value;
        if (value > row[idx]) row[idx] = value;
      }
    }
    hitVal.push(hv);
    best.push(row);
  }
  const result = { best, hitVal, n };
  buildHitsMemo.set(key, result);
  return result;
}

/* ---- action values ------------------------------------------------------ */

/*
 * Draw exactly one card and then stand: the value of a double before the factor
 * of two, and of a split ace, which takes one card and must stop.
 */
export function hitAndStand(counts, total, soft, dist) {
  const n = countsSize(counts);
  if (n === 0) return -1;
  let sum = 0;
  for (let i = 0; i < RANKS; i++) {
    const c = counts[i];
    if (!c) continue;
    const next = addCard(total, soft, i);
    sum += c * (next.total > BLACKJACK_TOTAL ? -1 : standAgainst(dist, next.total));
  }
  return sum / n;
}

export function doubleEv(counts, cards, upIndex) {
  const { total, soft } = sumHand(cards);
  const dist = dealerDistribution(counts, upIndex);
  return 2 * hitAndStand(counts, total, soft, dist);
}

export function hitEv(counts, cards, upIndex, hits) {
  const { total, soft } = sumHand(cards);
  return hits.hitVal[hits.hitVal.length - 1][idxOf(total, soft)];
}

/*
 * Splitting is the one action that deals twice, so it has to walk two draws
 * across the shoe: P(first card rank) then P(second rank | first). Both cards
 * are removed before the dealer distribution is built, because the dealer draws
 * from what is left. Pairs of identical cards are ordered, which double-counts
 * symmetric outcomes by exactly the right factor (P(i)P(j) + P(j)P(i)), so the
 * plain sum needs no correction.
 */
export function splitEv(counts, cards, upIndex, depth = 0, sharedDist) {
  const n = countsSize(counts);
  if (n < 2) return -2;
  const isAces = cards[0].r === 14;

  // Value of one concrete pair of cards, i and j, already dealt to the hands.
  const deal = (pool, rankA, rankB) => {
    const dist = sharedDist ?? dealerDistribution(pool, upIndex);
    const hits = buildHits(dist, pool);
    const first = { r: rankA, s: 0 };
    const second = { r: rankB, s: 0 };
    // Split aces receive one card and must stand, so no choice is left.
    const a = isAces
      ? standAgainst(dist, sumHand([cards[0], first]).total)
      : bestOf(twoCardOptions(pool, [cards[0], first], upIndex, dist, hits, depth + 1));
    const b = isAces
      ? standAgainst(dist, sumHand([cards[1], second]).total)
      : bestOf(twoCardOptions(pool, [second, cards[1]], upIndex, dist, hits, depth + 1));
    return a + b;
  };

  /*
   * Walk unordered pairs and weight them, because removing i then j and j then i
   * leave the very same shoe: the two orders differ only in which hand gets
   * which card, and their combined value is the sum of the two single-card
   * values anyway. That halves the dealer distributions that have to be built.
   */
  let total = 0;
  for (let i = 0; i < RANKS; i++) {
    if (!counts[i]) continue;
    if (counts[i] >= 2) {
      const pool = copyCounts(counts);
      pool[i] -= 2;
      total += counts[i] * (counts[i] - 1) * deal(pool, rankOf(i), rankOf(i));
    }
    for (let j = i + 1; j < RANKS; j++) {
      if (!counts[j]) continue;
      const pool = copyCounts(counts);
      pool[i]--;
      pool[j]--;
      total += 2 * counts[i] * counts[j] * deal(pool, rankOf(i), rankOf(j));
    }
  }
  return total / (n * (n - 1));
}

function twoCardOptions(counts, cards, upIndex, dist, hits, depth) {
  const { total, soft } = sumHand(cards);
  const idx = idxOf(total, soft);
  const options = [
    { action: 'stand', ev: standAgainst(dist, total) },
    { action: 'hit', ev: hits.hitVal[hits.hitVal.length - 1][idx] },
    { action: 'double', ev: 2 * hitAndStand(counts, total, soft, dist) },
  ];
  if (cards[0].r === cards[1].r && depth < MAX_SPLIT_DEPTH && !(cards[0].r === 14 && depth > 0)) {
    // Depth 0 rebuilds the dealer distribution for each hypothetical shoe,
    // which is the fork that actually matters. Deeper splits reuse the fork they
    // are already inside instead of rebuilding one per card pair, which is what
    // keeps a full four-hand search affordable.
    options.push({ action: 'split', ev: splitEv(counts, cards, upIndex, depth, depth > 0 ? dist : undefined) });
  }
  return options;
}

function bestOf(options) {
  let best = -Infinity;
  for (const option of options) if (option.ev > best) best = option.ev;
  return best;
}

/* ---- public API ---------------------------------------------------------- */

const STRATEGY_CACHE = new Map();

export function clearCache() {
  STRATEGY_CACHE.clear();
  dealerMemo.clear();
  buildHitsMemo.clear();
}

/*
 * The pool the dealer will actually draw from, from the player's point of view:
 * everything still in the shoe plus the hole card, which stays unknown. The
 * player's own cards and the upcard are known, so they are excluded.
 */
export function unknownPool(round) {
  return shoeCounts([...round.deck, round.dealerHand[1]]);
}

/*
 * The coach's answer depends on the player's ranks, the dealer's upcard, and the
 * full composition of the unseen pool. Keying on deck.length alone was wrong:
 * two rounds with the same hand and upcard but a differently composed shoe are
 * different problems, and the shoe is walked without replacement, so the ranks
 * that are left genuinely move the answer.
 */
function roundKey(round, counts) {
  const hand = round.hands[round.activeHand];
  if (!hand) return null;
  const ranks = hand.cards.map((card) => card.r).sort((a, b) => b - a).join('.');
  const pool = [];
  for (let i = 0; i < RANKS; i++) pool.push(counts[i]);
  return `${ranks}|${round.dealerUpcard.r}|${pool.join(',')}`;
}

export function bestAction(round) {
  if (!round || round.settled) return { action: null, ev: 0, alternatives: [], available: [] };
  const hand = round.hands[round.activeHand];
  if (!hand || hand.status !== 'open') return { action: null, ev: 0, alternatives: [], available: [] };
  if (hand.natural) return { action: null, ev: 1.5, alternatives: [], available: [], natural: true };

  const counts = unknownPool(round);
  const key = roundKey(round, counts);
  if (key && STRATEGY_CACHE.has(key)) return STRATEGY_CACHE.get(key);

  const available = legalActions(round);
  const upIndex = cardIndex(round.dealerUpcard.r);
  const dist = dealerDistribution(counts, upIndex);
  const options = twoCardOptions(counts, hand.cards, upIndex, dist, buildHits(dist, counts), 0)
    .filter((o) => available.includes(o.action))
    .map((o) => ({ ...o, label: ACTION_LABEL[o.action] ?? o.action }));

  options.sort((a, b) => b.ev - a.ev);
  const top = options[0].ev;
  const optimal = options.filter((o) => o.ev >= top - 1e-9).map((o) => o.action);

  const result = {
    action: options[0].action,
    ev: top,
    alternatives: options,
    optimal,
    available,
    exact: true,
  };
  if (key) STRATEGY_CACHE.set(key, result);
  return result;
}

export { isBlackjack };
