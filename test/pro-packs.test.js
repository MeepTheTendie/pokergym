import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bestAction, clearCache as clearBjCache } from '../src/coach/blackjack.js';
import { bestHold, clearCache as clearVpCache } from '../src/coach/videopoker.js';
import { variantById } from '../src/games/videopoker.js';
import { playerDraws, bankerDraws } from '../src/coach/baccarat.js';
import { roundWith } from './blackjack-helpers.mjs';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
function loadPack(slug) {
  return JSON.parse(readFileSync(join(root, 'data', 'pro-packs', `${slug}.json`), 'utf8'));
}

function assertSpotShape(spot, { allowRuleReason = false } = {}) {
  assert.ok(spot.id, 'spot id');
  assert.ok(spot.setup && typeof spot.setup === 'object', `${spot.id}: setup`);
  assert.ok(spot.correctAction !== undefined, `${spot.id}: correctAction`);
  assert.ok(typeof spot.explanation === 'string' && spot.explanation.length > 10, `${spot.id}: explanation`);
  assert.ok(spot.engine && typeof spot.engine === 'object', `${spot.id}: engine`);
  if (allowRuleReason) {
    assert.ok(typeof spot.engine.ruleReason === 'string' && spot.engine.ruleReason.length > 0, `${spot.id}: ruleReason`);
  } else {
    assert.equal(typeof spot.engine.ev, 'number', `${spot.id}: ev`);
    assert.equal(typeof spot.engine.evGap, 'number', `${spot.id}: evGap`);
    assert.ok(Array.isArray(spot.engine.alternatives) && spot.engine.alternatives.length >= 1, `${spot.id}: alternatives`);
  }
}

test('pro pack: blackjack soft hands (20) match engine', () => {
  const pack = loadPack('blackjack-soft-hands');
  assert.equal(pack.spots.length, 20);
  for (const spot of pack.spots) {
    assertSpotShape(spot);
    clearBjCache();
    const round = roundWith(spot.setup.playerRanks, spot.setup.dealerUpRank);
    const result = bestAction(round);
    assert.equal(result.action, spot.correctAction, `${spot.id}: expected ${spot.correctAction}, engine chose ${result.action}`);
    assert.ok(Math.abs(result.ev - spot.engine.ev) < 1e-6, `${spot.id}: ev ${result.ev} vs ${spot.engine.ev}`);
  }
});

test('pro pack: blackjack pairs/splits (20) match engine', () => {
  const pack = loadPack('blackjack-pairs-splits');
  assert.equal(pack.spots.length, 20);
  for (const spot of pack.spots) {
    assertSpotShape(spot);
    clearBjCache();
    const round = roundWith(spot.setup.playerRanks, spot.setup.dealerUpRank);
    const result = bestAction(round);
    assert.equal(result.action, spot.correctAction, `${spot.id}: expected ${spot.correctAction}, engine chose ${result.action}`);
    assert.ok(Math.abs(result.ev - spot.engine.ev) < 1e-6, `${spot.id}: ev ${result.ev} vs ${spot.engine.ev}`);
  }
});

test('pro pack: jacks or better 9/6 holds (20) match engine', () => {
  const pack = loadPack('jacks-or-better-holds-96');
  assert.equal(pack.spots.length, 20);
  const v = variantById('jacks-or-better');
  for (const spot of pack.spots) {
    assertSpotShape(spot);
    const hand = spot.setup.hand.map(c => ({ r: c.r, s: c.s }));
    clearVpCache();
    const result = bestHold(hand, { variant: v });
    const spotHolds = spot.correctAction.holds;
    assert.deepEqual(result.holds, spotHolds, `${spot.id}: expected holds ${JSON.stringify(spotHolds)}, engine chose ${JSON.stringify(result.holds)}`);
    assert.ok(Math.abs(result.ev - spot.engine.ev) < 1e-6, `${spot.id}: ev ${result.ev} vs ${spot.engine.ev}`);
  }
});

test('pro pack: baccarat third-card rule (20) match engine', () => {
  const pack = loadPack('baccarat-third-card-rule');
  assert.equal(pack.spots.length, 20);
  for (const spot of pack.spots) {
    assertSpotShape(spot, { allowRuleReason: true });
    const s = spot.setup;
    let draws;
    if (s.actor === 'player') {
      draws = playerDraws(s.playerTotal);
    } else if (s.actor === 'banker') {
      draws = s.playerStood ? bankerDraws(s.bankerTotal, undefined) : bankerDraws(s.bankerTotal, s.playerThirdValue);
    } else {
      assert.fail(`${spot.id}: unknown actor ${s.actor}`);
    }
    const action = draws ? 'draw' : 'stand';
    assert.equal(action, spot.correctAction, `${spot.id}: engine ${action} != ${spot.correctAction} (${spot.engine.ruleReason})`);
  }
});
