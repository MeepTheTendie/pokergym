import test from 'node:test';
import assert from 'node:assert/strict';

import { battleMessage } from '../src/rpg/battle-copy.js';

test('session hands keep the coach hint, daily hands never point at the hidden coach', () => {
  // In a five-hand session the Ask coach button exists, so the hint stays.
  assert.match(battleMessage('blackjack'), /Ask the coach for a hint/);
  assert.match(battleMessage('holdem'), /Ask the coach for a hint/);

  // The Daily Drill is a clean, unassisted read: Ask coach is hidden, so the
  // instruction must not send the player looking for it.
  assert.doesNotMatch(battleMessage('blackjack', { daily: true }), /Ask the coach/);
  assert.doesNotMatch(battleMessage('holdem', { daily: true }), /Ask the coach/);
});

test('the daily intro is one short line, not the old paragraph', () => {
  const line = battleMessage('blackjack', { daily: true, dailyIntro: true });
  // The battle label already says "Daily Drill #N · hand 1 of 5", so the coach
  // line spends no words repeating it.
  assert.ok(line.startsWith('Five hands, all four games'), 'short opener comes first');
  assert.doesNotMatch(line, /^This is the Daily Drill/);
  assert.doesNotMatch(line, /Make the play you think is best; the coach grades it and explains why/,
    'the verbose two-sentence opening is gone');
  assert.ok(line.includes('choose Hit, Stand, Double, or Split'), 'action is still stated');
  assert.ok(line.length < 200, `daily hand-1 line stays short (${line.length} chars)`);
  assert.doesNotMatch(line, /Ask the coach/);
});

test('videopoker and baccarat instructions are unchanged in either mode', () => {
  assert.match(battleMessage('videopoker'), /press Draw/);
  assert.match(battleMessage('baccarat'), /odds panel below/);
  // Neither game advertises the coach, so daily mode must not alter them.
  assert.equal(battleMessage('videopoker', { daily: true }), battleMessage('videopoker'));
  assert.equal(battleMessage('baccarat', { daily: true }), battleMessage('baccarat'));
});

test('unknown games yield an empty instruction without throwing', () => {
  assert.equal(battleMessage('craps'), '');
  assert.equal(battleMessage('craps', { daily: true, dailyIntro: true }), battleMessage('craps', { dailyIntro: true }));
});
