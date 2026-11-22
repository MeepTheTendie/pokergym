import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');

test('a finished Daily Drill stops asking "Can you get 5 out of 5?"', () => {
  assert.match(html, /<p class="today-hero-title" id="todayTitle">Can you get 5 out of 5\?<\/p>/);
  assert.match(app, /const title = el\('todayTitle'\);/);
  assert.match(app, /title\.textContent = daily\.lastKey === key[\s\S]*?out of \$\{DAILY_HANDS\} today\./);
  assert.match(app, /: 'Can you get 5 out of 5\?';/);
});

test('the trainer card names the best run, not a second streak', () => {
  assert.match(html, /<span class="trainer-streak-badge"><small>Best run of correct plays<\/small>/);
  assert.doesNotMatch(html, /Best streak/);
  assert.doesNotMatch(html, /class="streak-flame"/);
});

test('the coach does not repeat the gym leader name inside his own card', () => {
  assert.doesNotMatch(app, /\$\{gym\.leader\}: That was the coach’s answer/);
  assert.doesNotMatch(app, /\$\{gym\.leader\}: \$\{goodRead\(why\)\}/);
  assert.doesNotMatch(app, /\$\{gym\.leader\}: Not quite\. \$\{betterPlay\(review\)\}/);
});

test('the baccarat deal line knows which quiz it is introducing', () => {
  assert.match(app, /quizType: gameId === 'baccarat' \? round\?\.quiz\?\.type : null/);
});

test('a blackjack miss names both actions and their cents per $1 bet', () => {
  assert.match(app, /blackjackCorrection\(before\.alternatives, action\)/);
  assert.match(app, /Under this gym’s rules\./);
});

test('player-facing EV copy is no longer a bare per-hand decimal', () => {
  for (const pattern of [
    /Average return: \$\{best\.ev\.toFixed/,
    /Average result: \$\{best\.ev\.toFixed/,
    /averages \$\{before\.ev\.toFixed/,
    /Best available return: \$\{best\.ev\.toFixed/,
    /average result \$\{best\.ev\.toFixed/,
  ]) assert.doesNotMatch(app, pattern);
  assert.match(app, /returnPerDollar\(best\.ev\)/);
  assert.match(app, /resultPerDollar\(best\.ev\)/);
});
