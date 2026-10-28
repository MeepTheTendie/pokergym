import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PUBLISHED_REFS, classifyRef, shareUrl, inviteUrl, buildDailyShareText,
  parseEntryParams, isSharedDayCurrent, cleanEntrySearch,
  REFERRER_REFS, refFromReferrer,
} from '../src/rpg/links.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

test('PUBLISHED_REFS is exactly the published list', () => {
  assert.deepEqual([...PUBLISHED_REFS], ['share', 'invite', 'youtube', 'tiktok', 'reels', 'x', 'reddit', 'playmygame', 'webgames', 'sideproject', 'hn', 'videopoker', 'instagram', 'facebook']);
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
  assert.deepEqual(parseEntryParams(''), { ref: 'none', day: null, practice: null, drill: null, daily: false });
  assert.deepEqual(parseEntryParams(undefined), { ref: 'none', day: null, practice: null, drill: null, daily: false });
});

test('parseEntryParams: ref and practice together', () => {
  assert.deepEqual(parseEntryParams('?ref=share&d=9&practice=blackjack'), { ref: 'share', day: 9, practice: 'blackjack', drill: null, daily: false });
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

test('?daily=1 is a supported Daily Drill entry param and is stripped from the address', async () => {
  const { DAILY_ENTRY_URL } = await import('../src/rpg/links.js');
  assert.equal(DAILY_ENTRY_URL, '/web/?daily=1');
  assert.equal(parseEntryParams('?daily=1').daily, true);
  assert.equal(parseEntryParams('?daily=yes').daily, false);
  assert.equal(parseEntryParams('?drill=bj-88-v10').drill, 'bj-88-v10');
  assert.equal(parseEntryParams('').drill, null);
  assert.equal(parseEntryParams('').daily, false);
  assert.equal(parseEntryParams('?daily=1').ref, 'none');
  assert.equal(cleanEntrySearch('?daily=1&practice=blackjack'), '?practice=blackjack');
  const landing = (await import('node:fs')).readFileSync(new URL('../web/landing.html', import.meta.url), 'utf8');
  assert.ok(landing.includes(`href="${DAILY_ENTRY_URL}"`));
});

test('REFERRER_REFS is frozen and maps instagram host', () => {
  assert.ok(Object.isFrozen(REFERRER_REFS));
  assert.equal(REFERRER_REFS['l.instagram.com'], 'instagram');
  assert.equal(REFERRER_REFS['instagram.com'], 'instagram');
});

test('refFromReferrer maps known hosts', () => {
  assert.equal(refFromReferrer('https://l.instagram.com/'), 'instagram');
  assert.equal(refFromReferrer('https://www.instagram.com/x'), 'instagram');
  assert.equal(refFromReferrer('https://l.facebook.com/y'), 'facebook');
  assert.equal(refFromReferrer('https://m.facebook.com/'), 'facebook');
  assert.equal(refFromReferrer('https://t.co/abc'), 'x');
  assert.equal(refFromReferrer('https://twitter.com/foo'), 'x');
  assert.equal(refFromReferrer('https://x.com/bar'), 'x');
  assert.equal(refFromReferrer('https://www.youtube.com/watch?v=1'), 'youtube');
  assert.equal(refFromReferrer('https://youtu.be/abc'), 'youtube');
  assert.equal(refFromReferrer('https://www.tiktok.com/@a'), 'tiktok');
  assert.equal(refFromReferrer('https://www.reddit.com/r/x'), 'reddit');
  assert.equal(refFromReferrer('https://out.reddit.com/t'), 'reddit');
});

test('refFromReferrer returns null for unknown/invalid input', () => {
  for (const v of [null, undefined, '', '   ', 'not a url', 'http://example.com/', 'https://notinstagram.com/', 'https://x.com.evil.test/']) {
    assert.equal(refFromReferrer(v), null, String(v));
  }
});

test('posthog-loader referrer map exactly mirrors REFERRER_REFS', () => {
  // posthog-loader mirrors every REFERRER_REFS host and ref
  {
    const src = readFileSync(new URL('../web/posthog-loader.js', import.meta.url), 'utf8');
    for (const [host, ref] of Object.entries(REFERRER_REFS)) {
      assert.ok(src.includes(`'${host}'`), `loader missing host ${host}`);
      assert.ok(src.includes(`'${ref}'`), `loader missing ref ${ref}`);
    }
  }
  // referrer map in posthog-loader exactly mirrors REFERRER_REFS
  {
    const src = readFileSync(new URL('../web/posthog-loader.js', import.meta.url), 'utf8');
    const match = src.match(/var REFERRER_MAP\s*=\s*\{([\s\S]*?)\};/);
    assert.ok(match, 'REFERRER_MAP not found in loader');
    const pairs = [...match[1].matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)];
    const loaderMap = Object.fromEntries(pairs.map(m => [m[1], m[2]]));
    assert.deepEqual(Object.keys(loaderMap).sort(), Object.keys(REFERRER_REFS).sort());
    for (const [host, ref] of Object.entries(loaderMap)) {
      assert.equal(REFERRER_REFS[host], ref, host);
    }
  }
});

