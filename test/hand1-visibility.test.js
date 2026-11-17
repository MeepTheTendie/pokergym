// The Daily Drill's first hand is dealt to a cold visitor: a shared ?daily=1
// link starts it 1.5 s after load. These tests pin the fixes for the hand-1
// leak — the hand and its decision buttons must be in the first viewport, the
// opener must be short, and the "your move" nudge must be visible where the
// player is already looking.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { revealDelta, REVEAL_GAP } from '../src/ui/reveal.js';

const src = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
const copy = readFileSync(new URL('../src/rpg/battle-copy.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');

test('reveal: a 1366x768 laptop scrolls the action row into view', () => {
  // Measured before the fix: cards ended at 767, the Hit/Stand row at 839.
  const delta = revealDelta({ cardBottom: 767, controlBottom: 839, viewportHeight: 768 });
  assert.equal(delta, 839 - (768 - REVEAL_GAP));
  assert.ok(delta > 0);
});

test('reveal: a 360x740 phone scrolls the cards clear of the pinned bar', () => {
  // Measured before the fix: cards ended at 763, the pinned bar started at 675.
  const delta = revealDelta({ cardBottom: 763, controlBottom: 740, viewportHeight: 740, barTop: 675 });
  assert.equal(delta, 763 - (675 - REVEAL_GAP));
});

test('reveal: 390x844 already fits and must not scroll', () => {
  const delta = revealDelta({ cardBottom: 763, controlBottom: 844, viewportHeight: 844, barTop: 779 });
  assert.equal(delta, 0);
});

test('reveal: a hand above the pinned bar keeps the page still', () => {
  const delta = revealDelta({ cardBottom: 600, controlBottom: 740, viewportHeight: 740, barTop: 675 });
  assert.equal(delta, 0);
});

test('reveal: unknown or missing boxes never move the page', () => {
  assert.equal(revealDelta({ cardBottom: NaN, controlBottom: 700, viewportHeight: 740 }), 0);
  assert.equal(revealDelta({ cardBottom: undefined, controlBottom: undefined, viewportHeight: 740 }), 0);
});

test('every dealt hand re-checks that its controls are reachable', () => {
  assert.match(src, /import \{ revealDelta \} from '\.\.\/src\/ui\/reveal\.js';/);
  assert.match(src, /function revealHand\(\) \{[\s\S]*?window\.scrollBy\(\{ top: delta/);
  // startHand deals, prints the opener, then reveals the hand.
  assert.match(src, /scheduleFirstNudge\(\);\s*\n\s*revealHand\(\);/);
  // The one-time nudge adds a line to the coach card, so it re-checks too.
  assert.match(src, /trackEvent\?\.\('first_nudge',[\s\S]*?revealHand\(\);/);
});

test('the Daily opener no longer fills the coach card', () => {
  assert.doesNotMatch(copy, /This is the Daily Drill: five hands across all four games/);
  assert.match(copy, /const DAILY_INTRO = 'Five hands, all four games — the coach grades each one\. '/);
  // The battle label already names the drill and the hand.
  // It names the hand on the table, also after that hand settles.
  assert.match(src, /Daily Drill #\$\{dailyRun\.number\} · hand \$\{Math\.min\(dailyRun\.index \+ \(handDone \? 0 : 1\), DAILY_HANDS\)\} of \$\{DAILY_HANDS\}/);
});

test('the first-hand nudge sits where the player can read it', () => {
  // In the status box above the table: on phones the pinned bar used to cover
  // the old in-panel line, and on laptops it fell below the fold.
  assert.match(html, /<div class="statusbox">[\s\S]*?id="firstNudge"[\s\S]*?id="potentialText"/);
  assert.equal((html.match(/id="firstNudge"/g) ?? []).length, 1);
});
