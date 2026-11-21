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

// Nov 13-19 slate clips (PG-CLAUDE-SLATE-BALLOT-20261109-01). These use
// descriptive slugs instead of the p1-p6 pair ids. Suits follow the rendered
// slate (docs/reviews/2026-11-10-slate-renders/render_slate.py); ranks carry
// the decision, suits do not affect blackjack EV.
const SLUGS = {
  'nine-vs-three': {
    game: 'blackjack',
    label: 'HARD 9 AGAINST A THREE',
    player: [C(6, 3), C(3, 1)],   // 6♣ 3♥ = 9
    dealer: C(3, 2),              // 3♦
    hole: C(10, 3),               // 10♣
  },
  'soft18-vs-nine': {
    game: 'blackjack',
    label: 'SOFT 18 AGAINST A NINE',
    player: [C(14, 0), C(7, 2)],  // A♠ 7♦ = soft 18
    dealer: C(9, 3),              // 9♣
    hole: C(10, 1),               // 10♥
  },
  'nines-vs-seven': {
    game: 'blackjack',
    label: 'NINES AGAINST A SEVEN',
    player: [C(9, 0), C(9, 1)],   // 9♠ 9♥
    dealer: C(7, 3),              // 7♣
    hole: C(10, 2),               // 10♦
  },
  // Nov 15/17/18 slate (Claude, video owner; posted on #41 2026-11-13 with a
  // Sat Nov 14 10 AM CT veto window). Ranks carry the decision.
  'double-18-vs-six': {
    game: 'blackjack',
    label: 'SOFT 18 AGAINST A SIX',
    player: [C(14, 2), C(7, 3)],  // A♦ 7♣ = soft 18
    dealer: C(6, 0),              // 6♠
    hole: C(10, 1),               // 10♥
  },
  'split-16-vs-ten': {
    game: 'blackjack',
    label: 'EIGHTS AGAINST A TEN',
    player: [C(8, 1), C(8, 3)],   // 8♥ 8♣ = 16
    dealer: C(13, 2),             // K♦
    hole: C(6, 0),                // 6♠
  },
  'split-18-vs-nine': {
    game: 'blackjack',
    label: 'NINES AGAINST A NINE',
    player: [C(9, 2), C(9, 3)],   // 9♦ 9♣ = 18
    dealer: C(9, 1),              // 9♥
    hole: C(10, 0),               // 10♠
  },
  // Nov 20/21 slate (Claude, video owner; posted on #41 2026-11-14 with a
  // Sun Nov 15 10 AM CT veto window). EVs: docs/video/slate-20261120-21.md.
  'break-a-straight': {
    game: 'videopoker',
    label: 'BREAK UP A STRAIGHT',
    hand: [C(13, 0), C(12, 0), C(11, 0), C(10, 0), C(9, 1)], // K♠ Q♠ J♠ 10♠ 9♥
  },
  'fours-vs-five': {
    game: 'blackjack',
    label: 'FOURS AGAINST A FIVE',
    player: [C(4, 1), C(4, 3)],   // 4♥ 4♣ = 8
    dealer: C(5, 0),              // 5♠
    hole: C(10, 2),               // 10♦
  },
  'double-11-vs-ten': {
    game: 'blackjack',
    label: 'HARD 11 AGAINST A TEN',
    player: [C(6, 1), C(5, 0)],   // 6♥ 5♠ = 11
    dealer: C(13, 2),             // K♦
    hole: C(7, 3),                // 7♣
  },
  'throw-away-your-pair': {
    game: 'videopoker',
    label: 'LOW PAIR OR FOUR TO A FLUSH',
    hand: [C(7, 2), C(7, 1), C(2, 1), C(11, 1), C(13, 1)], // 7♦ 7♥ 2♥ J♥ K♥
  },
  'hit-16-vs-seven': {
    game: 'blackjack',
    label: 'HARD 16 AGAINST A SEVEN',
    player: [C(10, 0), C(6, 1)],  // 10♠ 6♥ = 16
    dealer: C(7, 2),              // 7♦
    hole: C(10, 3),               // 10♣
  },
  'hit-18-vs-ten': {
    game: 'blackjack',
    label: 'SOFT 18 AGAINST A TEN',
    player: [C(14, 1), C(7, 2)],  // A♥ 7♦ = soft 18
    dealer: C(10, 0),             // 10♠
    hole: C(9, 3),                // 9♣
  },
  // Nov 22/23 slate (docs/video/slate-20261122-23.md).
  'drop-the-ace': {
    game: 'videopoker',
    label: 'THROW AWAY THE ACE',
    hand: [C(14, 0), C(13, 1), C(12, 1), C(5, 3), C(2, 2)], // A♠ K♥ Q♥ 5♣ 2♦
  },
  'eights-vs-ace': {
    game: 'blackjack',
    label: 'EIGHTS AGAINST AN ACE',
    player: [C(8, 0), C(8, 1)],   // 8♠ 8♥ = 16
    dealer: C(14, 2),             // A♦
    hole: C(9, 3),                // 9♣
  },
  'split-nines-vs-six': {
    game: 'blackjack',
    label: 'NINES AGAINST A SIX',
    player: [C(9, 1), C(9, 3)],   // 9♥ 9♣ = 18
    dealer: C(6, 0),              // 6♠
    hole: C(10, 2),               // 10♦
  },
  'draw-five-new': {
    game: 'videopoker',
    label: 'THROW AWAY ALL FIVE',
    hand: [C(9, 0), C(7, 1), C(5, 2), C(3, 3), C(2, 1)], // 9♠ 7♥ 5♦ 3♣ 2♥
  },
  'fives-vs-nine': {
    game: 'blackjack',
    label: 'FIVES AGAINST A NINE',
    player: [C(5, 1), C(5, 3)],   // 5♥ 5♣ = 10
    dealer: C(9, 0),              // 9♠
    hole: C(10, 2),               // 10♦
  },
  'hit-12-vs-three': {
    game: 'blackjack',
    label: 'HARD 12 AGAINST A THREE',
    player: [C(10, 0), C(2, 1)],  // 10♠ 2♥ = 12
    dealer: C(3, 2),              // 3♦
    hole: C(10, 3),               // 10♣
  },
  // Tue Nov 17 fill (docs/video/slate-20261117-fill.md).
  'keep-the-fives': {
    game: 'videopoker',
    label: 'LOW PAIR OR KING-QUEEN',
    hand: [C(5, 0), C(5, 1), C(13, 2), C(12, 3), C(8, 1)], // 5♠ 5♥ K♦ Q♣ 8♥
  },
  'dont-double-11-vs-ace': {
    game: 'blackjack',
    label: 'HARD 11 AGAINST AN ACE',
    player: [C(6, 1), C(5, 3)],   // 6♥ 5♣ = 11
    dealer: C(14, 0),             // A♠
    hole: C(9, 2),                // 9♦
  },
  // Nov 18/19 backfill (docs/video/slate-20261118-19-backfill.md).
  'queen-jack-not-king': {
    game: 'videopoker',
    label: 'KING, QUEEN, JACK: KEEP TWO',
    hand: [C(13, 0), C(12, 1), C(11, 1), C(5, 2), C(3, 3)], // K♠ Q♥ J♥ 5♦ 3♣
  },
  'jacks-over-royal-draw': {
    game: 'videopoker',
    label: 'JACKS OR THREE TO A ROYAL',
    hand: [C(13, 1), C(12, 1), C(11, 1), C(11, 0), C(3, 2)], // K♥ Q♥ J♥ J♠ 3♦
  },
  'soft17-vs-three': {
    game: 'blackjack',
    label: 'SOFT 17 AGAINST A THREE',
    player: [C(14, 1), C(6, 0)],  // A♥ 6♠ = soft 17
    dealer: C(3, 2),              // 3♦
    hole: C(10, 3),               // 10♣
  },
  'hit-15-vs-ten': {
    game: 'blackjack',
    label: 'HARD 15 AGAINST A TEN',
    player: [C(10, 1), C(5, 3)],  // 10♥ 5♣ = 15
    dealer: C(10, 0),             // 10♠
    hole: C(9, 3),                // 9♣
  },
  // Tue Nov 24 slate (docs/video/slate-20261124.md).
  'break-a-flush': {
    game: 'videopoker',
    label: 'THROW AWAY A FLUSH',
    hand: [C(14, 1), C(13, 1), C(12, 1), C(11, 1), C(3, 1)], // A♥ K♥ Q♥ J♥ 3♥
  },
  'sixes-vs-two': {
    game: 'blackjack',
    label: 'SIXES AGAINST A TWO',
    player: [C(6, 0), C(6, 2)],   // 6♠ 6♦ = 12
    dealer: C(2, 1),              // 2♥
    hole: C(10, 3),               // 10♣
  },
  'double-9-vs-three': {
    game: 'blackjack',
    label: 'HARD 9 AGAINST A THREE',
    player: [C(5, 0), C(4, 2)],   // 5♠ 4♦ = 9
    dealer: C(3, 1),              // 3♥
    hole: C(10, 3),               // 10♣
  },
  // Reveal-timing re-cut (docs/video/renders-revealtest/README.md): replaces hit-12-vs-three, Mon Nov 23 4 PM.
  'twos-vs-seven': {
    game: 'blackjack',
    label: 'TWO 2s AGAINST A 7',
    player: [C(2, 0), C(2, 2)],   // 2♠ 2♦
    dealer: C(7, 1),              // 7♥
    hole: C(10, 3),               // 10♣
  },
  // Wed Nov 25 slate (docs/video/slate-20261125.md).
  'fives-not-the-straight': {
    game: 'videopoker',
    label: 'THROW AWAY A STRAIGHT DRAW',
    hand: [C(5, 3), C(5, 2), C(6, 1), C(7, 0), C(8, 3)], // 5♣ 5♦ 6♥ 7♠ 8♣
  },
  'aces-vs-ace': {
    game: 'blackjack',
    label: 'TWO ACES AGAINST AN ACE',
    player: [C(14, 0), C(14, 2)], // A♠ A♦
    dealer: C(14, 1),             // A♥
    hole: C(9, 3),                // 9♣
  },
  'double-soft18-vs-three': {
    game: 'blackjack',
    label: 'DOUBLE ON 18',
    player: [C(14, 2), C(7, 3)],  // A♦ 7♣ = soft 18
    dealer: C(3, 0),              // 3♠
    hole: C(10, 1),               // 10♥
  },
  // Thu Nov 26 slate (docs/video/slate-20261126.md).
  'soft15-vs-five': {
    game: 'blackjack',
    label: 'ACE-FOUR AGAINST A 5',
    player: [C(14, 3), C(4, 2)],  // A♣ 4♦ = soft 15
    dealer: C(5, 0),              // 5♠
    hole: C(10, 1),               // 10♥
  },
  'double-on-14': {
    game: 'blackjack',
    label: 'DOUBLE ON 14',
    player: [C(14, 1), C(3, 0)],  // A♥ 3♠ = soft 14
    dealer: C(6, 2),              // 6♦
    hole: C(10, 3),               // 10♣
  },
  'dump-the-threes': {
    game: 'videopoker',
    label: 'DUMP THE PAIR',
    hand: [C(12, 0), C(11, 0), C(10, 0), C(3, 2), C(3, 3)], // Q♠ J♠ 10♠ 3♦ 3♣
  },
  // Fri Nov 27 slate (docs/video/slate-20261127.md).
  'double-on-17': {
    game: 'blackjack',
    label: 'DOUBLE ON 17',
    player: [C(14, 0), C(6, 1)],  // A♠ 6♥ = soft 17
    dealer: C(3, 2),              // 3♦
    hole: C(10, 3),               // 10♣
  },
  'soft13-vs-six': {
    game: 'blackjack',
    label: 'ACE-TWO AGAINST A 6',
    player: [C(14, 3), C(2, 2)],  // A♣ 2♦ = soft 13
    dealer: C(6, 0),              // 6♠
    hole: C(10, 1),               // 10♥
  },
  'three-to-a-royal': {
    game: 'videopoker',
    label: 'KEEP THREE, NOT FOUR',
    hand: [C(13, 1), C(12, 1), C(11, 1), C(10, 0), C(4, 2)], // K♥ Q♥ J♥ 10♠ 4♦
  },
  // Sat Nov 28 slate (docs/video/slate-20261128.md).
  'soft17-vs-four': {
    game: 'blackjack',
    label: 'ACE-SIX AGAINST A 4',
    player: [C(14, 2), C(6, 0)],  // A♦ 6♠ = soft 17
    dealer: C(4, 3),              // 4♣
    hole: C(10, 1),               // 10♥
  },
  'double-on-16': {
    game: 'blackjack',
    label: 'DOUBLE ON 16',
    player: [C(14, 1), C(5, 3)],  // A♥ 5♣ = soft 16
    dealer: C(5, 0),              // 5♠
    hole: C(10, 2),               // 10♦
  },
  'hit-12-vs-two': {
    game: 'blackjack',
    label: 'HIT 12',
    player: [C(9, 0), C(3, 1)],   // 9♠ 3♥ = hard 12
    dealer: C(2, 3),              // 2♣
    hole: C(10, 2),               // 10♦
  },
};

// Accept "p1-QF", "p1-AF", "p1", case-insensitively, or one of the Nov 13+
// slate slugs (case-insensitive).
const CLIP_RE = /^p([1-6])(?:-(?:qf|af))?$/i;

export function normalizeClipId(id) {
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  const m = CLIP_RE.exec(trimmed);
  if (m) return `p${m[1]}`;
  const slug = trimmed.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(SLUGS, slug)) return slug;
  return null;
}

export function reelClipFor(id) {
  const norm = normalizeClipId(id);
  if (!norm) return null;
  if (norm.startsWith('p')) {
    const pair = Number(norm.slice(1));
    const spec = PAIRS[pair];
    return spec ? { clip: norm, ...spec } : null;
  }
  const spec = SLUGS[norm];
  return spec ? { clip: norm, ...spec } : null;
}

export function reelClipIds() {
  return Object.keys(PAIRS).map(n => `p${n}`);
}
