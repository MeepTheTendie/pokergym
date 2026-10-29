import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');

test('the Daily Drill owns its deal and never inherits a drill bank', () => {
  assert.match(src, /dailyMode = true;\s*\n\s*shortSession = false;\s*\n\s*\/\/ Never let a drill-mode deal leak[\s\S]*?drillMode = null;\s*\n\s*drillHands = \[\];/);
  assert.match(src, /drillMode = null;\s*\n\s*drillHands = \[\];\s*\n\s*tutorialTips = \[\];/);
});

test('a coached Daily hand is practice-only and replays the same hand', () => {
  assert.match(src, /settleDailyHand\(\{ optimal, difficulty, line, review, coached \}\)/);
  assert.match(src, /if \(coached\) \{\s*\n\s*\/\/ The Daily is a clean read/);
  assert.match(src, /this Daily hand does not count\. Try the same hand again\./);
  assert.match(src, /el\('btnNext'\)\.textContent = 'Try hand again';/);
  assert.match(src, /function showCoach\(\) \{\s*\n\s*if \(handDone \|\| dailyMode\) return;/);
});

test('natural blackjack deals through rather than awarding a free decision', () => {
  assert.match(src, /!rigged && round\.settled && skip < 100/);
  assert.match(src, /if \(!decisions\.length\) \{\s*\n\s*if \(drillMode\)/);
});

test('restore sanitizes and review reveal can advance', () => {
  assert.match(src, /pendingRestore = sanitizeProfile\(readBackup\(el\('backupText'\)\.value\)\)/);
  assert.match(src, /const restored = sanitizeProfile\(pendingRestore\);/);
  assert.match(src, /result\.textContent = 'Answer revealed · no score for this review\.';\s*\n\s*next\.hidden = false;/);
});
