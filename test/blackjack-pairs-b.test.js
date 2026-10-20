import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearCache, bestAction } from '../src/coach/blackjack.js';
import { roundWith, CHART_ACTION, UPCARDS } from './blackjack-helpers.mjs';

const PAIR_CHART = {
  7: 'PPPPPPHHHH', 8: 'PPPPPPPPPP', 9: 'PPPPPSPPSS',
  10: 'SSSSSSSSSS', 14: 'PPPPPPPPPP',
};

for (const [pair, row] of Object.entries(PAIR_CHART)) {
  test(`pair ${pair},${pair} follows the six deck S17 DAS chart`, () => {
    UPCARDS.forEach((up, k) => {
      clearCache();
      const r = Number(pair);
      assert.equal(bestAction(roundWith([r, r], up)).action, CHART_ACTION[row[k]], `${pair},${pair} vs ${up}`);
    });
  });
}
