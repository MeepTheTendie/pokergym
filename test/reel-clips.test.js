import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeClipId, reelClipFor, reelClipIds } from '../src/rpg/reel-clips.js';
import { newRound as newBacRound } from '../src/games/baccarat.js';
import { newRound as newHeRound } from '../src/games/holdem.js';
import { newRound as newBjRound } from '../src/games/blackjack.js';
import { bestHold } from '../src/coach/videopoker.js';
import { bestAction } from '../src/coach/blackjack.js';
import { evaluate, CATEGORY } from '../src/evaluate.js';

test('normalizeClipId accepts p1-p6 with optional QF/AF suffix', () => {
  assert.equal(normalizeClipId('p1-QF'), 'p1');
  assert.equal(normalizeClipId('p1-AF'), 'p1');
  assert.equal(normalizeClipId('p1'), 'p1');
  assert.equal(normalizeClipId('P6-qf'), 'p6');
  assert.equal(normalizeClipId('p0'), null);
  assert.equal(normalizeClipId('p7'), null);
  assert.equal(normalizeClipId('x1'), null);
  assert.equal(normalizeClipId(''), null);
  assert.equal(normalizeClipId(null), null);
});

test('reelClipFor returns the exact hand spec for each Nov 1-12 pair', () => {
  const ids = reelClipIds();
  assert.deepEqual(ids, ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  for (const id of ids) {
    const clip = reelClipFor(`${id}-QF`);
    assert.equal(clip.clip, id);
    assert.equal(clip.pair, Number(id.slice(1)));
    assert.ok(['blackjack', 'videopoker', 'baccarat', 'holdem'].includes(clip.game));
  }
});

test('reel p1/p2 deal the described blackjack decisions', () => {
  const p1 = reelClipFor('p1');
  const r1 = newBjRound(Math.random, { player: p1.player, dealer: [p1.dealer, p1.hole] });
  const best1 = bestAction(r1);
  assert.ok(best1.optimal.includes('stand'), `p1 hard 13 vs 2 should stand, got ${best1.optimal}`);

  const p2 = reelClipFor('p2');
  const r2 = newBjRound(Math.random, { player: p2.player, dealer: [p2.dealer, p2.hole] });
  const best2 = bestAction(r2);
  assert.ok(best2.optimal.includes('double'), `p2 hard 9 vs 3 should double, got ${best2.optimal}`);
});

test('reel p3/p4 deal the described video poker holds', () => {
  const p3 = reelClipFor('p3');
  const h3 = bestHold(p3.hand);
  // Hold the pair of queens (indices 0,1).
  assert.equal(h3.holds[0], true);
  assert.equal(h3.holds[1], true);
  assert.equal(h3.holds.filter(Boolean).length, 2);

  const p4 = reelClipFor('p4');
  const h4 = bestHold(p4.hand);
  // Hold KQ suited (indices 0,1).
  assert.equal(h4.holds[0], true);
  assert.equal(h4.holds[1], true);
});

test('reel p5 baccarat rigs the banker-stands tableau and quiz', () => {
  const p5 = reelClipFor('p5-AF');
  assert.equal(p5.game, 'baccarat');
  assert.equal(p5.quiz.correct, 'STAND');
  assert.match(p5.quiz.prompt, /Player draws a third card: 8/i);
  const round = newBacRound(Math.random, 'player', 1, 8, { sequence: p5.sequence });
  assert.equal(round.playerThird?.r, 8);
  assert.equal(round.bankerThird, null, 'banker 3 stands when player third card is 8');
  assert.equal(round.playerTotal, 3);
  assert.equal(round.bankerTotal, 3);
  assert.equal(round.result, 'tie');
});

test('reel p6 holdem rigs jacks on a paired 9-9-5-5-2 board', () => {
  const p6 = reelClipFor('p6');
  const round = newHeRound(Math.random, { hole: p6.hole, board: p6.board });
  const best = evaluate(round.hand7);
  assert.equal(best.category, CATEGORY.TWO_PAIR, 'two pair');
  assert.deepEqual(best.cards.map(c => c.r).slice(0, 4), [11, 11, 9, 9]);
  assert.equal(best.cards[4].r, 5, '5 kicker plays over the board 2');
});
