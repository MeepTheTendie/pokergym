import test from 'node:test';
import assert from 'node:assert/strict';
import { keyAction, shouldIgnoreKey, GAME_KEYS, CARD_KEYS } from '../src/rpg/keys.js';

const hand = (game, handDone = false) => ({ screen: 'battle', game, handDone });

test('video poker: 1–5 hold, D and Enter deal/draw', () => {
  for (let i = 1; i <= 5; i++) assert.deepEqual(keyAction(String(i), hand('videopoker')), { card: i - 1 });
  assert.equal(keyAction('6', hand('videopoker')), null);
  assert.deepEqual(keyAction('d', hand('videopoker')), { buttons: ['btnDraw', 'btnDeal'] });
  assert.deepEqual(keyAction('D', hand('videopoker')), { buttons: ['btnDraw', 'btnDeal'] });
  assert.deepEqual(keyAction('Enter', hand('videopoker')).buttons.slice(1), ['btnDraw', 'btnDeal']);
});

test('blackjack: H S D P', () => {
  assert.deepEqual(keyAction('h', hand('blackjack')), { buttons: ['btnHit'] });
  assert.deepEqual(keyAction('s', hand('blackjack')), { buttons: ['btnStand'] });
  assert.deepEqual(keyAction('d', hand('blackjack')), { buttons: ['btnDouble'] });
  assert.deepEqual(keyAction('p', hand('blackjack')), { buttons: ['btnSplit'] });
  assert.equal(keyAction('1', hand('blackjack')), null);
});

test('baccarat: B P T', () => {
  assert.deepEqual(keyAction('b', hand('baccarat')), { quiz: 'BANKER' });
  assert.deepEqual(keyAction('p', hand('baccarat')), { quiz: 'PLAYER' });
  assert.deepEqual(keyAction('t', hand('baccarat')), { quiz: 'TIE' });
  for (let i = 1; i <= 3; i++) assert.deepEqual(keyAction(String(i), hand('baccarat')), { option: i - 1 });
  assert.equal(keyAction('4', hand('baccarat')), null);
  assert.equal(keyAction('1', hand('baccarat', true)), null);
});

test("hold'em: 1–7 pick, Enter confirms", () => {
  for (let i = 1; i <= 7; i++) assert.deepEqual(keyAction(String(i), hand('holdem')), { card: i - 1 });
  assert.equal(keyAction('8', hand('holdem')), null);
  assert.ok(keyAction('Enter', hand('holdem')).buttons.includes('btnConfirm'));
});

test('cards are not selectable once the hand is done', () => {
  assert.equal(keyAction('1', hand('videopoker', true)), null);
  assert.equal(keyAction('3', hand('holdem', true)), null);
});

test('common keys: Enter/Space next, C coach, A apply, Esc only between hands', () => {
  for (const g of Object.keys(GAME_KEYS)) {
    assert.equal(keyAction('Enter', hand(g)).buttons[0], 'btnNext');
    assert.deepEqual(keyAction(' ', hand(g)), keyAction('Enter', hand(g)));
    assert.deepEqual(keyAction('c', hand(g)), { buttons: ['btnAsk'] });
    assert.deepEqual(keyAction('a', hand(g)), { buttons: ['btnApply'] });
    assert.equal(keyAction('Escape', hand(g)), null, 'Esc is ignored mid-hand');
    assert.deepEqual(keyAction('Escape', hand(g, true)), { buttons: ['btnMap'] });
  }
});

test('lesson and title screens', () => {
  assert.deepEqual(keyAction('Enter', { screen: 'lesson' }), { advance: true });
  assert.deepEqual(keyAction(' ', { screen: 'lesson' }), { advance: true });
  assert.deepEqual(keyAction('Escape', { screen: 'lesson' }), { buttons: ['btnSkip'] });
  assert.deepEqual(keyAction('Enter', { screen: 'title' }), { buttons: ['btnDaily', 'btnStart'] });
  assert.equal(keyAction('h', { screen: 'map' }), null);
  assert.equal(keyAction('', hand('blackjack')), null);
  assert.equal(keyAction(undefined, hand('blackjack')), null);
});

test('typing, modifiers and native button activation are left alone', () => {
  assert.equal(shouldIgnoreKey({ key: 'h', targetTag: 'TEXTAREA' }), true);
  assert.equal(shouldIgnoreKey({ key: 'h', targetTag: 'input' }), true);
  assert.equal(shouldIgnoreKey({ key: 'h', targetTag: 'SELECT' }), true);
  assert.equal(shouldIgnoreKey({ key: 'h', targetTag: 'DIV', targetEditable: true }), true);
  assert.equal(shouldIgnoreKey({ key: 'r', ctrlKey: true, targetTag: 'BODY' }), true);
  assert.equal(shouldIgnoreKey({ key: 'Enter', targetTag: 'BUTTON' }), true);
  assert.equal(shouldIgnoreKey({ key: ' ', targetTag: 'DIV', targetRole: 'button' }), true);
  assert.equal(shouldIgnoreKey({ key: 'h', targetTag: 'BUTTON' }), false);
  assert.equal(shouldIgnoreKey({ key: 'Enter', targetTag: 'BODY' }), false);
  assert.deepEqual(CARD_KEYS, { videopoker: 5, holdem: 7 });
});
