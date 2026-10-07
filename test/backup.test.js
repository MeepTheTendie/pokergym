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
  for (const patch of [{ stats: null }, { xp: -1 }, { chips: '500' }, { badges: ['missing'] }, { lessonsDone: null }, { mistakes: [null] }, { sessions: [{}] }, { activeSession: { gymId: 'missing' } }, { practice: { bad: {} } }, { handsOptimal: 99 }, { version: 2 }]) {
    assert.throws(() => readBackup(JSON.stringify({ ...p, ...patch })));
  }
  for (const raw of ['oops', 'null', 'x'.repeat(100001)]) assert.throws(() => readBackup(raw));
});
