// Clip → exact hand mapping for the Nov 1-12 social-reel funnel
// (PG-CLAUDE-SOCIAL-FUNNEL-20261108-01, directive #51 6727802841, task -B).
//
// Each clip id (utm_content value like "p1-QF") resolves to the exact hand
// shown in that video so /reel?c=<clip> can deal it as hand 1. QF/AF variants
// of the same pair show the same hand (they differ in hook, not the hand).
//
// Pair descriptions come from the Nov 1-12 hook-test batch delivery recorded
// in docs/PokerGymControlDoc.md (2026-10-28, ca869a4). The manifest CSV
// (Drive file 1Ew5PR03M-amH4y3Vj0RNV1Tg0EBRQb03) is the authoritative source
// but is not in the repo; where the description names exact cards those cards
// are used verbatim, otherwise cards are reconstructed to match the described
// situation and suits are assigned canonically (suits do not affect the
// blackjack/baccarat decisions named). Assumptions are stated per pair.

function C(r, s) { return { r, s }; }

// p1 — hard 13 vs 2 (stand). Blackjack. Cards reconstructed to match "hard 13
// vs 2"; ranks give the named totals, suits canonical.
const P1 = {
  pair: 1,
  game: 'blackjack',
  label: 'HARD 13 AGAINST A TWO',
  player: [C(10, 0), C(3, 1)],   // 10♠ 3♥ = 13
  dealer: C(2, 2),               // 2♦
  hole: C(9, 3),                 // 9♣
};

// p2 — hard 9 vs 3 (double). Blackjack.
const P2 = {
  pair: 2,
  game: 'blackjack',
  label: 'HARD 9 AGAINST A THREE',
  player: [C(6, 0), C(3, 1)],    // 6♠ 3♥ = 9
  dealer: C(3, 2),               // 3♦
  hole: C(10, 3),                // 10♣
};

// p3 — Jacks or Better, Q-Q vs straight draw (hold QQ). Exact cards named in
// the QA record: Q♦ Q♠ J♣ 10♥ 9♠.
const P3 = {
  pair: 3,
  game: 'videopoker',
  label: 'PAIR OF QUEENS OR A STRAIGHT DRAW',
  hand: [C(12, 2), C(12, 0), C(11, 3), C(10, 1), C(9, 0)],
};

// p4 — Jacks or Better, KQ suited vs ace (hold KQ). Exact cards named in the
// QA record: K♦Q♦ A♣ 7♠ 3♥.
const P4 = {
  pair: 4,
  game: 'videopoker',
  label: 'KING-QUEEN SUITED AGAINST AN ACE',
  hand: [C(13, 2), C(12, 2), C(14, 3), C(7, 0), C(3, 1)],
};

// p5 — Baccarat, banker 3 vs player third-card 8 (banker stands). Rigged deal
// sequence: player 2♠,3♥ (total 5, draws) / banker A♦,2♣ (total 3) / player
// third 8♠ (value 8) → banker stands (tableau: banker 3 draws unless player
// third is 8). Final: player (2+3+8)%10=3, banker 3.
const P5 = {
  pair: 5,
  game: 'baccarat',
  label: 'BANKER THREE, PLAYER DRAWS AN EIGHT',
  // Deal order consumed by a rigged baccarat round: P1, P2, B1, B2, P3.
  sequence: [C(2, 0), C(3, 1), C(14, 2), C(2, 3), C(8, 0)],
  quiz: {
    prompt: 'Player draws a third card: 8. Banker\u2019s total is 3. Does the banker draw a third card?',
    options: ['DRAW', 'STAND'],
    correct: 'STAND',
    reason: 'Banker 3 draws against any player third card except an 8. The player drew an 8, so banker stands. Player finishes on 3 (2+3+8 = 13, last digit 3); banker stays on 3. It\u2019s a tie.',
    deal: true,
  },
};

// p6 — Hold'em JJ on 9-9-5-5-2 board (jacks and nines, 5 kicker). Exact ranks
// named in the batch description; suits canonical.
const P6 = {
  pair: 6,
  game: 'holdem',
  label: 'JACKS ON A PAIRED BOARD',
  hole: [C(11, 0), C(11, 1)],                          // J♠ J♥
  board: [C(9, 2), C(9, 3), C(5, 0), C(5, 1), C(2, 2)], // 9♦ 9♣ 5♠ 5♥ 2♦
};

const PAIRS = { 1: P1, 2: P2, 3: P3, 4: P4, 5: P5, 6: P6 };

// Accept "p1-QF", "p1-AF", "p1", case-insensitively.
const CLIP_RE = /^p([1-6])(?:-(?:qf|af))?$/i;

export function normalizeClipId(id) {
  if (typeof id !== 'string') return null;
  const m = CLIP_RE.exec(id.trim());
  return m ? `p${m[1]}` : null;
}

export function reelClipFor(id) {
  const norm = normalizeClipId(id);
  if (!norm) return null;
  const pair = Number(norm.slice(1));
  const spec = PAIRS[pair];
  return spec ? { clip: norm, ...spec } : null;
}

export function reelClipIds() {
  return Object.keys(PAIRS).map(n => `p${n}`);
}
