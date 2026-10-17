import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, beginSession, scoreSession, recordMistake, applyResult } from '../src/rpg/state.js';
import { readBackup, writeBackup } from '../src/rpg/backup.js';

test('backups round-trip legacy profiles, practice, active sessions and notebooks', () => {
  let p = createProfile('scholar');
  assert.deepEqual(readBackup(writeBackup(p)), p);
  p = beginSession(p, 'pokergym');
  p = applyResult(p, { optimal: false, game: 'videopoker' }).profile;
  p = scoreSession(p, false);
  p = recordMistake(p, { game: 'videopoker', situation: 'J pair', chosen: 'Discard', correction: 'Hold pair' });
  assert.deepEqual(readBackup(writeBackup(p)), p);
  for (let i = 0; i < 4; i++) p = scoreSession(p, true);
  assert.deepEqual(readBackup(writeBackup(p)), p);
});
test('malformed external saves are rejected before changing local progress', () => {
  const p = createProfile('scholar');
  for (const patch of [{ stats: null }, { xp: -1 }, { score: -1 }, { streak: -1 }, { bestStreak: -1 }, { streak: 2, bestStreak: 1 }, { badges: ['missing'] }, { lessonsDone: null }, { mistakes: [null] }, { sessions: [{}] }, { activeSession: { gymId: 'missing' } }, { practice: { bad: {} } }, { practice: { videopoker: { played: 2, optimal: 1, recent: 'x' } } }, { practice: { videopoker: { played: 2, optimal: 1, recent: [1, 0] } } }, { practice: { videopoker: { played: 21, optimal: 1, recent: Array(21).fill(true) } } }, { handsOptimal: 99 }, { version: 99 }]) {
    assert.throws(() => readBackup(JSON.stringify({ ...p, ...patch })));
  }
  for (const raw of ['oops', 'null', 'x'.repeat(100001)]) assert.throws(() => readBackup(raw));
});

test('a version 1 backup is migrated and accepted instead of rejected', () => {
  const v1 = JSON.stringify({
    version: 1, name: 'RED', classId: 'scholar', xp: 500, chips: 900,
    badges: [], stats: { focus: 4, nerve: 1, read: 1 }, gym: 'pokergym',
    handsPlayed: 10, handsOptimal: 8, lessonsDone: ['videopoker'],
  });
  const migrated = readBackup(v1);
  assert.equal(migrated.score, 80);
  assert.equal(migrated.streak, 0);
  assert.equal(migrated.bestStreak, 0);
  assert.equal(migrated.xp, 500);
});

test('a daily round that claims a finished score is rejected as a backup', () => {
  const p = createProfile('scholar');
  p.daily = { ...p.daily, progress: { key: '2026-01-01', index: 5, results: [true, true, true, true, true] } };
  assert.throws(() => writeBackup(p), /Invalid backup/);
});
