import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');

test('coach meter stays neutral before an action or coach request', () => {
  // Blackjack, baccarat and video poker must all gate the recommendation
  // behind acted/coachedHand/handDone.
  assert.match(src, /if \(!coachedHand && !acted\) \{\s*\n\s*el\('handGrade'\)\.textContent = 'YOUR CALL'/);
  assert.match(src, /if \(!handDone && !coachedHand && !acted\) \{\s*\n\s*el\('handGrade'\)\.textContent = 'YOUR CALL'/);
  assert.match(src, /if \(!handDone && !coachedHand && !acted\) \{\s*\n\s*el\('handGrade'\)\.textContent = 'YOUR CALL'/);
});

test('showCoach reveals the meter on demand', () => {
  assert.match(src, /coachedHand = true;\s*\n\s*renderStatus\(\);/);
});
