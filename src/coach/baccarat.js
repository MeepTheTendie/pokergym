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

/*
 * Problem-set quiz bank for the baccarat gym. Each question is a percentage
 * judgment derived from the exact values above; the answer key is the math, not
 * an opinion. Every item was Jev-screened on answer-key entailment and wording
 * neutrality (controls calibrated ~0.99/~0.01 on the same domain before use).
 */

const pct = (ev) => (ev >= 0 ? '+' : '-') + (Math.abs(ev) * 100).toFixed(2) + '%';

export function tieBreakEven() {
  const p = outcomeProbabilities();
  return (1 / p.tie) - 1; // payout per unit at which the tie bet is EV-neutral
}

export function quizFor(rng = Math.random) {
  const roll = rng();
  if (roll < 0.5) return betSelectQuiz();
  if (roll < 0.75) return rotate(commissionQuiz(rng()), rng());
  return rotate(tieOddQuiz(rng()), rng());
}

// Shuffle the button order so the correct choice is not always in the same
// position (a fixed slot is a free answer for anyone who notices, and reusing
// the value draw would correlate the slot with the answer). Takes the rng value
// directly so the bank stays a pure function of the rng stream.
function rotate(quiz, r) {
  const options = quiz.options;
  const at = Math.floor(r * options.length) % options.length;
  return {
    ...quiz,
    options: options.slice(at).concat(options.slice(0, at)),
  };
}

function betSelectQuiz() {
  const evs = sideEvs();
  return {
    type: 'select',
    prompt: 'FULL SHOE BACCARAT WITH 5% BANKER COMMISSION. PLACE YOUR HIGHEST-EV BET.',
    options: ['BANKER', 'PLAYER', 'TIE'],
    correct: 'BANKER',
    reason: `BANKER ${pct(evs.banker)} HOUSE EDGE. PLAYER ${pct(evs.player)}. TIE ${pct(evs.tie)}. BANKER LOSES THE LEAST.`,
    deal: true,
  };
}

function commissionQuiz(r01) {
  const bet = 20 + Math.floor(r01 * 4) * 20; // 20, 40, 60, 80
  const won = bet * 0.95;
  const distractor = bet + 1;
  const low = foundDistractor(r01, won, distractor);
  return {
    type: 'commission',
    prompt: `YOUR ${bet}-CHIP BANKER BET WINS. THE CASINO TAKES A 5% COMMISSION. HOW MANY CHIPS DO YOU WIN, BEFORE YOUR ${bet}-CHIP STAKE COMES BACK?`,
    options: [chips(won), chips(low), chips(distractor)],
    correct: chips(won),
    reason: `${bet} X 0.95 = ${won}. BANKER PAYS 0.95:1 AFTER THE 5% COMMISSION, NOT 1:1. STILL THE BEST BET AT -1.06% HOUSE EDGE.`,
    deal: false,
  };
}

function tieOddQuiz(r01) {
  const odds = 8 + Math.floor(r01 * 4); // 8, 9, 10, 11
  const worthwhile = odds >= 10;
  return {
    type: 'tieodds',
    prompt: `CASINO PROMO TONIGHT: TIE PAYS ${odds}:1 ON AN OTHERWISE STANDARD GAME. IS THE TIE BET A WORTHWHILE PLAY AT THAT PRICE?`,
    options: ['YES, WORTHWHILE', 'NO, STILL LOSING'],
    correct: worthwhile ? 'YES, WORTHWHILE' : 'NO, STILL LOSING',
    reason: `TIE LANDS ON 9.52% OF HANDS AND BREAKS EVEN AT ${tieBreakEven().toFixed(1)}:1. AT ${odds}:1 IT IS ${
      worthwhile ? 'SLIGHTLY POSITIVE EXPECTED VALUE.' : 'STILL A LOSING BET.'}`,
    deal: false,
  };
}

function foundDistractor(r, won, distractor) {
  const candidates = [won + 1, won - 1].filter((v) => v > 0 && v !== distractor);
  return candidates[Math.floor(r * candidates.length)];
}

function chips(n) {
  return `${Number.isInteger(n) ? n : Math.round(n * 2) / 2} CHIPS`;
}