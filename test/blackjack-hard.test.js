import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearCache, bestAction } from '../src/coach/blackjack.js';
import { roundWith, CHART_ACTION, UPCARDS } from './blackjack-helpers.mjs';

// Published basic strategy, 6 decks, dealer stands on soft 17, double after
// split, no surrender (the rules in src/games/blackjack.js GAME).
// Columns are dealer upcards 2,3,4,5,6,7,8,9,10,A. Expectations come from the
// chart, never from the solver: a mismatch is a possible coach bug.
// Each total uses a two-card, non-pair hand.
const HARD_CHART = {
  5: [[2, 3], 'HHHHHHHHHH'],
  6: [[2, 4], 'HHHHHHHHHH'],
  7: [[2, 5], 'HHHHHHHHHH'],
  8: [[2, 6], 'HHHHHHHHHH'],
  9: [[2, 7], 'HDDDDHHHHH'],
  10: [[2, 8], 'DDDDDDDDHH'],
  11: [[2, 9], 'DDDDDDDDDH'],
  12: [[10, 2], 'HHSSSHHHHH'],
  13: [[10, 3], 'SSSSSHHHHH'],
  14: [[10, 4], 'SSSSSHHHHH'],
  15: [[10, 5], 'SSSSSHHHHH'],
  16: [[10, 6], 'SSSSSHHHHH'],
  17: [[10, 7], 'SSSSSSSSSS'],
};

for (const [total, [cards, row]] of Object.entries(HARD_CHART)) {
  test(`hard ${total} (${cards.join(',')}) follows the six deck S17 DAS chart`, () => {
    const wrong = [];
    UPCARDS.forEach((up, k) => {
      clearCache();
      const got = bestAction(roundWith(cards, up)).action;
      if (got !== CHART_ACTION[row[k]]) wrong.push(`vs ${up}: chart ${CHART_ACTION[row[k]]}, coach ${got}`);
    });
    assert.deepEqual(wrong, [], `hard ${total}`);
  });
}
