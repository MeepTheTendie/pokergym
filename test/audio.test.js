import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SONGS, SFX_NAMES, DRUM_SOUNDS, HARMONICS, compileSong, validateSongs, swingOffset } from '../web/audio.js';

const CHANNELS = ['lead', 'harm', 'bass', 'drum'];
const TRACKS = ['vegas', 'lounge', 'academy', 'title', 'map', 'battle1', 'battle2', 'battle3', 'battle4'];

test('every track compiles without errors', () => {
  assert.deepEqual(validateSongs(), []);
});

test('the expected tracks exist', () => {
  assert.deepEqual(Object.keys(SONGS).sort(), [...TRACKS].sort());
});

test('the SFX bank exposes every sound the game asks for', () => {
  for (const name of ['blip', 'confirm', 'deal', 'chip', 'win', 'lose', 'badge']) {
    assert.ok(SFX_NAMES.includes(name), `missing sfx: ${name}`);
  }
});

test('every drum letter a song can use maps to a real sound', () => {
  for (const [letter, name] of Object.entries(DRUM_SOUNDS)) {
    assert.equal(letter.length, 1, letter);
    assert.ok(typeof name === 'string' && name.length > 1, `${letter} -> ${name}`);
  }
  // every letter actually used in a score must resolve
  for (const [song, s] of Object.entries(SONGS)) {
    for (const ch of s.channels.drum.replace(/[\[\]\d:\s-]/g, '')) {
      assert.ok(DRUM_SOUNDS[ch], `${song} uses unmapped drum "${ch}"`);
    }
  }
});

