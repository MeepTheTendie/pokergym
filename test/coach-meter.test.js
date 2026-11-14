import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');

test('coach meter stays neutral before an action or coach request', () => {
  // Blackjack, baccarat and video poker must all gate the recommendation
  // behind acted/coachedHand/handDone. Blackjack gates on the coach alone:
  // after a hit the next decision is still the player's call (playtest
  // 2026-11-14).
  assert.match(src, /if \(!coachedHand\) \{\s*\n\s*el\('handGrade'\)\.textContent = 'Your call'/);
  assert.match(src, /if \(!handDone && !coachedHand && !acted\) \{\s*\n\s*el\('handGrade'\)\.textContent = 'Your call'/);
  assert.match(src, /if \(!handDone && !coachedHand && !acted\) \{\s*\n\s*el\('handGrade'\)\.textContent = 'Your call'/);
});

test("hold'em grade reads Your call before Confirm five", () => {
  assert.match(src, /\/\/ hold'em\r?\n  if \(!handDone && !coachedHand && !acted\) \{\r?\n    el\('handGrade'\)\.textContent = 'Your call';/);
});

test('showCoach reveals the meter on demand', () => {
  assert.match(src, /coachedHand = true;\s*\n\s*renderStatus\(\);/);
});

test('baccarat odds panel marks the best side only after the answer', () => {
  assert.match(src, /const on = handDone && alt\.side === best\.side;/);
  assert.doesNotMatch(src, /const on = !handDone && alt\.side === best\.side;/);
});

test('a missed hand names the better play and never calls the hold right', () => {
  // Video poker status after a non-paying draw depends on whether the hold was best.
  assert.match(src, /round\.holdBest\s*\n\s*\? 'The draw made no paying hand\. The hold was still the right play\.'/);
  // Practice and Daily misses both say the correction inline.
  assert.equal((src.match(/Not quite\. \$\{betterPlay\(review\)\}/g) || []).length, 2);
  assert.doesNotMatch(src, /here is why/);
});
