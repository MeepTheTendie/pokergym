import test from 'node:test';
import assert from 'node:assert/strict';
import { suitIndex, cardLabel } from '../src/cards.js';
import { variantById } from '../src/games/videopoker.js';
import { reasonFor } from '../src/coach/videopoker-reason.js';

const c = (txt) => {
  const rank = { T: 10, J: 11, Q: 12, K: 13, A: 14 }[txt[0]] ?? Number(txt[0]);
  return { r: rank, s: suitIndex(txt[1]) };
};
const cards = (spec) => spec.split(' ').map(c);
const jab = variantById('jacks-or-better');

test('daily #324 hand 5: three to a royal is not called three to a flush', () => {
  // 5♦ 10♠ 7♣ Q♠ A♠, correct hold A♠ Q♠ 10♠.
  const hand = cards('5d Ts 7c Qs As');
  const kept = [hand[1], hand[3], hand[4]];
  assert.deepEqual(kept.map(cardLabel), ['10♠', 'Q♠', 'A♠']);
  assert.equal(reasonFor(kept, jab), '3 cards to a royal flush.');
});

test('royal draws are checked before straight-flush and flush draws', () => {
  assert.equal(reasonFor(cards('Ts Js Qs Ks'), jab), '4 cards to a royal flush.');
  assert.equal(reasonFor(cards('5h 6h 7h 8h'), jab), '4 cards to a straight flush.');
  assert.equal(reasonFor(cards('2h 5h 9h'), jab), '3 cards to a flush.');
  assert.equal(reasonFor(cards('Ah 2h 3h'), jab), '3 cards to a straight flush.');
});

test('made five-card flush hands are called made hands, not flush draws', () => {
  assert.equal(reasonFor(cards('2h 5h 9h Jh Kh'), jab), 'That is a flush. Keep all five cards.');
  assert.equal(reasonFor(cards('Ts Js Qs Ks As'), jab), 'That is a royal flush. Keep all five cards.');
  assert.equal(reasonFor(cards('5h 6h 7h 8h 9h'), jab), 'That is a straight flush. Keep all five cards.');
});

test('pair and trip reasons are unchanged', () => {
  assert.equal(reasonFor(cards('Ah Ad'), jab), 'Jacks or better pays, so build on the pair.');
  assert.equal(reasonFor(cards('8h 8d'), jab), 'The pair is below jacks, so it pays nothing. It is still the best hold.');
  assert.equal(reasonFor(cards('9h 9d 9c'), jab), 'Three of a kind. Keep the trips and draw two.');
});
