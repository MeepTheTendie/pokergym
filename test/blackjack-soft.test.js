import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearCache, bestAction } from '../src/coach/blackjack.js';
import { roundWith, CHART_ACTION, UPCARDS } from './blackjack-helpers.mjs';

// Published basic strategy, 6 decks, S17, DAS, no surrender. Columns are dealer
// upcards 2..10,A. Expectations come from the chart, not the solver.
const SOFT_CHART = {
  'A,2': [[14, 2], 'HHHDDHHHHH'],
  'A,3': [[14, 3], 'HHHDDHHHHH'],
  'A,4': [[14, 4], 'HHDDDHHHHH'],
  'A,5': [[14, 5], 'HHDDDHHHHH'],
  'A,6': [[14, 6], 'HDDDDHHHHH'],
  'A,7': [[14, 7], 'SDDDDSSHHH'],
  'A,8': [[14, 8], 'SSSSSSSSSS'],
  'A,9': [[14, 9], 'SSSSSSSSSS'],
};

for (const [name, [cards, row]] of Object.entries(SOFT_CHART)) {
  test(`soft ${name} follows the six deck S17 DAS chart`, () => {
    const wrong = [];
    UPCARDS.forEach((up, k) => {
      clearCache();
      const got = bestAction(roundWith(cards, up)).action;
      if (got !== CHART_ACTION[row[k]]) wrong.push(`vs ${up}: chart ${CHART_ACTION[row[k]]}, coach ${got}`);
    });
    assert.deepEqual(wrong, [], `soft ${name}`);
  });
}
