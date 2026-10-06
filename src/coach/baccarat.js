import { GAME, PAY_TABLE } from '../games/baccarat.js';

/*
 * Exact baccarat expected values for an eight deck shoe.
 *
 * The outcome of a round depends only on card values, so the whole game can be
 * enumerated exactly rather than sampled. The shoe holds 416 cards whose values
 * are laid out like this:
 *
 *   value 0  the four ten ranks: 4 ranks x 4 suits x 8 decks = 128 cards
 *   value 1  aces: 4 x 8 = 32
 *   values 2..9  one rank each: 4 x 8 = 32 each
 *
 * For an ordered sequence of n values the probability of drawing them is the
 * product of falling factorials over the shoe's total, because the numerator
 * only depends on how many of each value were taken and the denominator only on
 * n. The drawing rules then decide whether a third card follows, so the tree is
 * walked in real deal order: player, banker, then the optional third cards.
 */

const COUNTS = [128, 32, 32, 32, 32, 32, 32, 32, 32, 32];
const TOTAL = COUNTS.reduce((sum, n) => sum + n, 0);

export const SHOE_SIZE = TOTAL;
export const DECKS = GAME.decks;

/*
 * A baccarat pair is the first two cards of one side showing the SAME RANK.
 * The walk below enumerates by value class, where tens, jacks, queens and kings
 * all collapse into class 0, so it cannot see rank: counting p1 === p2 down
 * there reports 14.5876%, the chance of two cards sharing a value class, not a
 * pair. The third card rules never touch the first two cards, so the true pair
 * rate does not depend on the walk at all and is taken straight from the shoe:
 * 13 ranks, each holding one card per suit per deck, drawn as the first two
 * cards dealt to that side.
 */
const RANKS = 13;
const CARDS_PER_RANK = 4 * GAME.decks;
export const PAIR_P = (RANKS * CARDS_PER_RANK * (CARDS_PER_RANK - 1)) / (TOTAL * (TOTAL - 1));

function falling(count, m) {
  let p = 1;
  for (let k = 0; k < m; k++) p *= count - k;
  return p;
}


// The standard third card rules.
export function playerDraws(playerTotal) {
  return playerTotal <= 5;
}

export function bankerDraws(bankerTotal, playerThirdValue) {
  if (playerThirdValue === undefined) return bankerTotal <= 5;
  switch (bankerTotal) {
    case 0:
    case 1:
    case 2:
      return true;
    case 3:
      return playerThirdValue !== 8;
    case 4:
      return playerThirdValue >= 2 && playerThirdValue <= 7;
    case 5:
      return playerThirdValue >= 4 && playerThirdValue <= 7;
    case 6:
      return playerThirdValue >= 6 && playerThirdValue <= 7;
    default:
      return false;
  }
}

let cached = null;

/*
 * Walks every reachable value sequence exactly once. `m` always holds the
 * multiplicity of each value drawn so far, so the weight of a leaf is just the
 * falling-factorial product over the total of the cards actually in hand.
 */
export function outcomeProbabilities() {
  if (cached) return cached;

  const tally = { player: 0, banker: 0, tie: 0, playerPair: PAIR_P, bankerPair: PAIR_P };
  const m = new Array(10).fill(0);

  const weight = (n) => {
    let numerator = 1;
    for (let v = 0; v < 10; v++) if (m[v] > 0) numerator *= falling(COUNTS[v], m[v]);
    let denominator = 1;
    for (let k = 0; k < n; k++) denominator *= TOTAL - k;
    return numerator / denominator;
  };

  const record = (playerTotal, bankerTotal, n) => {
    const w = weight(n);
    if (playerTotal > bankerTotal) tally.player += w;
    else if (bankerTotal > playerTotal) tally.banker += w;
    else tally.tie += w;
  };

  // All four initial cards are dealt before anything else happens. The natural
  // rule has to be tested on those four cards alone: if either side shows 8 or 9
  // the round ends here and no third card is ever drawn by either hand. Testing
  // the natural after committing a third card is what produced the wrong 11.32%
  // tie rate, because a banker natural must also void the player's third card.
  function resolve(playerInitial, bankerInitial) {
    if (playerInitial >= 8 || bankerInitial >= 8) {
      record(playerInitial, bankerInitial, 4);
      return;
    }

    if (playerDraws(playerInitial)) {
      for (let p3 = 0; p3 < 10; p3++) {
        m[p3]++;
        const playerFinal = (playerInitial + p3) % 10;
        if (bankerDraws(bankerInitial, p3)) {
          for (let b3 = 0; b3 < 10; b3++) {
            m[b3]++;
            record(playerFinal, (bankerInitial + b3) % 10, 6);
            m[b3]--;
          }
        } else {
          record(playerFinal, bankerInitial, 5);
        }
        m[p3]--;
      }
      return;
    }

    if (bankerDraws(bankerInitial, undefined)) {
      for (let b3 = 0; b3 < 10; b3++) {
        m[b3]++;
        record(playerInitial, (bankerInitial + b3) % 10, 5);
        m[b3]--;
      }
    } else {
      record(playerInitial, bankerInitial, 4);
    }
  }

  for (let p1 = 0; p1 < 10; p1++) {
    m[p1]++;
    for (let p2 = 0; p2 < 10; p2++) {
      m[p2]++;
      const playerInitial = (p1 + p2) % 10;
      for (let b1 = 0; b1 < 10; b1++) {
        m[b1]++;
        for (let b2 = 0; b2 < 10; b2++) {
          m[b2]++;
          resolve(playerInitial, (b1 + b2) % 10);
          m[b2]--;
        }
        m[b1]--;
      }
      m[p2]--;
    }
    m[p1]--;
  }

  cached = tally;
  return tally;
}

/*
 * Expected value per unit staked, in units of the bet. A tie pushes on the
 * player and banker sides, so it contributes nothing to those two.
 */
export function sideEvs() {
  const p = outcomeProbabilities();
  return {
    player: p.player * PAY_TABLE.player - p.banker,
    banker: p.banker * PAY_TABLE.banker - p.player,
    tie: p.tie * PAY_TABLE.tie - (p.player + p.banker),
  };
}

export function bestBet() {
  const evs = sideEvs();
  const probabilities = outcomeProbabilities();
  const alternatives = [
    { side: 'banker', ev: evs.banker },
    { side: 'player', ev: evs.player },
    { side: 'tie', ev: evs.tie },
  ].sort((a, b) => b.ev - a.ev);

  return {
    side: alternatives[0].side,
    ev: alternatives[0].ev,
    alternatives,
    probabilities,
    exact: true,
  };
}

export function clearCache() {
  cached = null;
}