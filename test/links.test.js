import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PUBLISHED_REFS, classifyRef, shareUrl, inviteUrl, buildDailyShareText,
  parseEntryParams, isSharedDayCurrent, cleanEntrySearch,
} from '../src/rpg/links.js';

test('PUBLISHED_REFS is exactly the published list', () => {
  assert.deepEqual([...PUBLISHED_REFS], ['share', 'invite', 'webgames', 'sideproject', 'hn', 'videopoker']);
  assert.ok(Object.isFrozen(PUBLISHED_REFS));
});

test('classifyRef maps each published ref to itself', () => {
  for (const ref of PUBLISHED_REFS) assert.equal(classifyRef(ref), ref);
});

test("classifyRef maps 'none', blank and missing to 'none'", () => {
  assert.equal(classifyRef(undefined), 'none');
  assert.equal(classifyRef(null), 'none');
  assert.equal(classifyRef(''), 'none');
  assert.equal(classifyRef('   '), 'none');
  assert.equal(classifyRef('none'), 'other'); // 'none' as a literal value is not a published ref
});

test("classifyRef maps junk to 'other'", () => {
  for (const junk of ['SHARE', 'Share', 'share ', ' hn', 'web games', 'x'.repeat(64), '__proto__',
    'constructor', 'toString', 'hasOwnProperty', 'share,invite', '<script>', '0']) {
    assert.equal(classifyRef(junk), 'other', junk);
  }
});

test('share and invite URLs', () => {
  assert.equal(shareUrl(42), 'https://playpokergym.com/web/?ref=share&d=42');
  assert.equal(inviteUrl(), 'https://playpokergym.com/web/?ref=invite');
});

test('daily share text keeps the format and carries ref=share&d=<n>', () => {
  const text = buildDailyShareText({ number: 7, results: [true, true, false, true, true], total: 5, games: ['Blackjack', 'Baccarat'] });
  assert.equal(text, 'Poker Gym Daily #7  4/5\n🟩🟩🟥🟩🟩\n🃏 Blackjack · Baccarat\nhttps://playpokergym.com/web/?ref=share&d=7');
  assert.match(text, /ref=share&d=7$/);
});

test('parseEntryParams: d values', () => {
  assert.equal(parseEntryParams('?d=0').day, null);
  assert.equal(parseEntryParams('?d=-1').day, null);
  assert.equal(parseEntryParams('?d=abc').day, null);
  assert.equal(parseEntryParams('?d=1e21').day, null);
  assert.equal(parseEntryParams('?d=1.5').day, null);
  assert.equal(parseEntryParams('?d=12').day, 12);
  assert.equal(parseEntryParams('?d=1&d=2').day, 1);
});

test('parseEntryParams: missing params', () => {
  assert.deepEqual(parseEntryParams(''), { ref: 'none', day: null, practice: null });
  assert.deepEqual(parseEntryParams(undefined), { ref: 'none', day: null, practice: null });
});

test('parseEntryParams: ref and practice together', () => {
  assert.deepEqual(parseEntryParams('?ref=share&d=9&practice=blackjack'), { ref: 'share', day: 9, practice: 'blackjack' });
  assert.equal(parseEntryParams('?ref=Evil').ref, 'other');
});

test('±1 day tolerance', () => {
  assert.equal(isSharedDayCurrent(99, 100), true);
  assert.equal(isSharedDayCurrent(100, 100), true);
  assert.equal(isSharedDayCurrent(101, 100), true);
  assert.equal(isSharedDayCurrent(98, 100), false);
  assert.equal(isSharedDayCurrent(102, 100), false);
  assert.equal(isSharedDayCurrent(null, 100), false);
});

test('cleanEntrySearch strips ref and d but keeps practice', () => {
  assert.equal(cleanEntrySearch('?ref=share&d=3'), '');
  assert.equal(cleanEntrySearch('?ref=share&d=3&practice=blackjack'), '?practice=blackjack');
  assert.equal(cleanEntrySearch('?practice=holdem'), '?practice=holdem');
});
