import { validMistakeType } from './state.js';

/*
 * Drill banks: fixed, hand-picked situations the coach already grades exactly.
 * The banks never store an "answer" of their own — the existing blackjack and
 * video-poker coaches remain the single source of truth, so a drill hand can
 * never disagree with the feedback the game gives during normal play.
 *
 * Blackjack scenarios are all two-card hands with no natural on either side, so
 * the round always reaches a real decision. Each carries the situation type the
 * weak-spot drill uses to bias the order toward what the player has been
 * missing. Video poker scenarios are five-card hands chosen because the correct
 * hold is genuinely non-obvious.
 */

function C(r, s) { return { r, s }; }

// type: 'soft' | 'pair' | 'hard' — used only to order weak-spot drills.
export const BLACKJACK_DRILLS = [
  { label: 'SOFT 18 AGAINST A TEN', type: 'soft', player: [C(14, 0), C(7, 1)], dealer: C(10, 2), hole: C(8, 3) },
  { label: 'SOFT 17 AGAINST A TWO', type: 'soft', player: [C(14, 0), C(6, 1)], dealer: C(2, 2), hole: C(9, 3) },
  { label: 'SOFT 18 AGAINST A NINE', type: 'soft', player: [C(14, 0), C(7, 1)], dealer: C(9, 2), hole: C(4, 3) },
  { label: 'SOFT 19 AGAINST A FOUR', type: 'soft', player: [C(14, 0), C(8, 1)], dealer: C(4, 2), hole: C(6, 3) },
  { label: 'EIGHTS AGAINST A NINE', type: 'pair', player: [C(8, 0), C(8, 1)], dealer: C(9, 2), hole: C(2, 3) },
  { label: 'NINES AGAINST A SEVEN', type: 'pair', player: [C(9, 0), C(9, 1)], dealer: C(7, 2), hole: C(2, 3) },
  { label: 'ACES AGAINST A TEN', type: 'pair', player: [C(14, 0), C(14, 1)], dealer: C(10, 2), hole: C(9, 3) },
  { label: 'FOURS AGAINST A FIVE', type: 'pair', player: [C(4, 0), C(4, 1)], dealer: C(5, 2), hole: C(10, 3) },
  { label: 'TENS AGAINST A SIX', type: 'pair', player: [C(10, 0), C(10, 1)], dealer: C(6, 2), hole: C(8, 3) },
  { label: 'HARD NINE AGAINST A TWO', type: 'hard', player: [C(6, 0), C(3, 1)], dealer: C(2, 2), hole: C(10, 3) },
  { label: 'SIXTEEN AGAINST A TEN', type: 'hard', player: [C(10, 0), C(6, 1)], dealer: C(10, 2), hole: C(7, 3) },
];

export const VIDEOPOKER_DRILLS = [
  { label: 'FOUR TO A ROYAL', hand: [C(13, 0), C(12, 0), C(11, 0), C(10, 0), C(2, 1)] },
  { label: 'THREE TO A ROYAL', hand: [C(14, 1), C(13, 1), C(12, 1), C(10, 0), C(5, 2)] },
  { label: 'LOW PAIR OR THREE HIGH CARDS', hand: [C(5, 0), C(5, 1), C(13, 2), C(12, 2), C(11, 2)] },
  { label: 'FOUR TO A FLUSH OR A LOW PAIR', hand: [C(13, 0), C(12, 0), C(7, 0), C(5, 0), C(5, 1)] },
  { label: 'OPEN-ENDED STRAIGHT', hand: [C(6, 0), C(5, 1), C(4, 2), C(3, 3), C(2, 0)] },
  { label: 'FOUR TO AN INSIDE STRAIGHT', hand: [C(9, 0), C(8, 0), C(7, 1), C(5, 0), C(11, 0)] },
  { label: 'TWO PAIR', hand: [C(9, 0), C(9, 1), C(4, 2), C(4, 3), C(11, 0)] },
  { label: 'THREE OF A KIND', hand: [C(8, 0), C(8, 1), C(8, 2), C(12, 3), C(3, 0)] },
  { label: 'FOUR TO A FLUSH AGAINST HIGH CARDS', hand: [C(11, 0), C(11, 1), C(13, 2), C(14, 2), C(9, 3)] },
];

export const DRILL_GAMES = ['blackjack', 'videopoker'];
export const DRILL_HANDS = 5;

export function drillBank(game) {
  if (game === 'blackjack') return BLACKJACK_DRILLS;
  if (game === 'videopoker') return VIDEOPOKER_DRILLS;
  return [];
}

// Weak-spot drills reorder the blackjack bank so the hand types the player has
// actually missed come first. Video poker has no situation tags, so its bank
// keeps its authored order; the coach still grades every hold exactly.
function missedTypes(profile) {
  const missed = { soft: 0, pair: 0, hard: 0 };
  for (const mistake of profile?.mistakes ?? []) {
    if (mistake.game === 'blackjack' && validMistakeType(mistake.type)) missed[mistake.type]++;
  }
  return missed;
}

export function orderDrills(profile, game) {
  const bank = drillBank(game);
  if (game !== 'blackjack') return bank.slice();
  const missed = missedTypes(profile);
  return bank
    .map((drill, index) => ({ drill, index }))
    .sort((a, b) => (missed[b.drill.type] - missed[a.drill.type]) || a.index - b.index)
    .map(row => row.drill);
}

// The exact deal for one drill hand: blackjack rigs both hands, video poker
// rigs the five-card deal. Rotation keeps a five-hand drill from repeating the
// same situation.
export function drillScenario(profile, game, index, mode) {
  const bank = mode === 'weak' ? orderDrills(profile, game) : drillBank(game);
  if (!bank.length) return null;
  return bank[index % bank.length];
}

// Capture once at session start: recording a new mistake must not reshuffle
// the remaining hands. Existing local practice totals provide the rotation;
// no new tracking or save format is required.
export function drillSequence(profile, game, mode) {
  const bank = mode === 'weak' ? orderDrills(profile, game) : drillBank(game);
  if (!bank.length) return [];
  const played = profile?.practice?.[game]?.played;
  const offset = Number.isSafeInteger(played) && played >= 0 ? played : 0;
  let ordered;
  if (mode === 'weak' && game === 'blackjack') {
    // Rotate each equal-priority tier as a whole. Rotating within each type
    // alone leaves later tied types permanently outside a five-hand session.
    const missed = missedTypes(profile);
    const priorities = [...new Set(bank.map(drill => missed[drill.type]))];
    ordered = priorities.flatMap(priority => {
      const group = bank.filter(drill => missed[drill.type] === priority);
      const start = offset % group.length;
      return [...group.slice(start), ...group.slice(0, start)];
    });
  } else {
    const start = offset % bank.length;
    ordered = [...bank.slice(start), ...bank.slice(0, start)];
  }
  return ordered.slice(0, DRILL_HANDS);
}
