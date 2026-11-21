import test from 'node:test';
import assert from 'node:assert/strict';
import { resultPerDollar, returnPerDollar, perDollarShort, blackjackCorrection } from '../src/ui/ev-copy.js';

test('blackjack EV reads as cents per $1 bet, the landing page wording', () => {
  assert.equal(resultPerDollar(0.055), 'wins 5.5¢ per $1 bet');
  assert.equal(resultPerDollar(-0.535), 'loses 53.5¢ per $1 bet');
  assert.equal(resultPerDollar(0), 'breaks even');
});

test('video-poker return reads as cents back per $1 bet', () => {
  assert.equal(returnPerDollar(0.828), '82.8¢ back per $1 bet');
  assert.equal(returnPerDollar(1.25), '125.0¢ back per $1 bet');
});

test('a compact alternative list still names cents, not bare decimals', () => {
  assert.equal(perDollarShort(0.055), '+5.5¢');
  assert.equal(perDollarShort(-0.535), '−53.5¢');
});

test('a blackjack miss names the better play and the chosen play', () => {
  const alternatives = [
    { action: 'hit', ev: 0.055, label: 'Hit' },
    { action: 'stand', ev: -0.535, label: 'Stand' },
  ];
  assert.equal(
    blackjackCorrection(alternatives, 'stand'),
    'Hit wins 5.5¢ per $1 bet; Stand loses 53.5¢ per $1 bet.',
  );
  assert.equal(blackjackCorrection(alternatives, 'hit'), 'Hit wins 5.5¢ per $1 bet.');
  assert.equal(blackjackCorrection([], 'stand'), '');
});
