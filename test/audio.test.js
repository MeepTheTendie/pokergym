import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SONGS, SFX_NAMES, DRUM_SOUNDS, compileSong, validateSongs, swingOffset } from '../web/audio.js';

const CHANNELS = ['lead', 'harm', 'bass', 'drum'];
const TRACKS = ['lounge', 'academy', 'title', 'map', 'battle1', 'battle2', 'battle3', 'battle4'];

test('every track compiles without errors', () => {
  assert.deepEqual(validateSongs(), []);
});

test('the expected tracks exist', () => {
  assert.deepEqual(Object.keys(SONGS).sort(), [...TRACKS].sort());
});

test('each track has all four channels', () => {
  for (const name of TRACKS) {
    assert.deepEqual(Object.keys(SONGS[name].channels).sort(), [...CHANNELS].sort(), name);
  }
});

test('each track spans bars*16 steps on every channel', () => {
  for (const name of TRACKS) {
    const song = SONGS[name];
    const data = compileSong(song);
    assert.ok(!data.error, `${name}: ${data.error}`);
    assert.equal(data.total, song.bars * 16, name);
    assert.ok(data.at.size > 0, `${name} schedules nothing`);
  }
});

test('melodies and bass stay in a playable range', () => {
  for (const name of TRACKS) {
    const data = compileSong(SONGS[name]);
    assert.ok(!data.error, `${name}: ${data.error}`);
    for (const [step, events] of data.at) {
      for (const ev of events) {
        if (ev.channel === 'drum') continue;
        assert.ok(ev.note >= 24 && ev.note <= 108,
          `${name}@${step} ${ev.channel} note ${ev.note} out of range`);
      }
    }
  }
});

test('chords expand to more than one voice', () => {
  const data = compileSong(SONGS.title);
  const chord = [...data.at.values()].find((evs) => evs.filter((e) => e.channel === 'harm').length > 1);
  assert.ok(chord, 'title has no chord anywhere');
});

test('accidentals parse both inside chords and on their own', () => {
  // battle2 ends on A major: A2, #C3, E3 must all survive bracket parsing.
  const data = compileSong(SONGS.battle2);
  assert.ok(!data.error, data.error);
  const harm = new Set();
  for (const evs of data.at.values()) for (const ev of evs) if (ev.channel === 'harm') harm.add(ev.note);
  assert.ok(harm.has(45), 'A2 missing');   // A2
  assert.ok(harm.has(49), '#C3 missing');  // C#3
  assert.ok(harm.has(52), 'E3 missing');   // E3
  // flats: the Bb bar of bass notes
  const bass = new Set();
  for (const evs of data.at.values()) for (const ev of evs) if (ev.channel === 'bass') bass.add(ev.note);
  assert.ok(bass.has(34), 'Bb1 missing');  // Bb1
});

test('tempo is in a sensible band', () => {
  for (const [name, song] of Object.entries(SONGS)) {
    assert.ok(song.bpm >= 60 && song.bpm <= 200, `${name} bpm ${song.bpm}`);
  }
});

test('every beat of every bar carries a drum hit', () => {
  for (const name of ['title', 'battle1', 'battle2', 'battle3', 'battle4']) {
    const song = SONGS[name];
    const data = compileSong(song);
    assert.ok(!data.error, data.error);
    for (let bar = 0; bar < song.bars; bar++) {
      for (const beat of [0, 4, 8, 12]) {
        const step = bar * 16 + beat;
        const hits = (data.at.get(step) ?? []).filter((e) => e.channel === 'drum');
        assert.ok(hits.length > 0, `${name} bar ${bar + 1} beat ${beat} is silent`);
      }
    }
  }
});

test('the overworld keeps its drums light', () => {
  const data = compileSong(SONGS.map);
  assert.ok(!data.error, data.error);
  let hits = 0;
  for (const evs of data.at.values()) hits += evs.filter((e) => e.channel === 'drum').length;
  assert.ok(hits > 0 && hits < 40, `map fires ${hits} drum hits, expected a light pattern`);
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

test('the lounge loop is slow, long and quiet', () => {
  const song = SONGS.lounge;
  assert.ok(song.bpm >= 80 && song.bpm <= 90, `bpm ${song.bpm}`);
  assert.ok(song.bars >= 16, `only ${song.bars} bars`);
  assert.ok(song.level > 0 && song.level <= 0.3, `level ${song.level}`);
  const loopSeconds = song.bars * 4 * 60 / song.bpm;
  assert.ok(loopSeconds >= 40, `loop is only ${loopSeconds.toFixed(1)}s`);
});

test('the lounge loop uses soft timbres, no chip pulse waves', () => {
  for (const ch of ['lead', 'harm', 'bass']) {
    const type = SONGS.lounge.voices[ch].type;
    assert.ok(['sine', 'triangle'].includes(type), `${ch} is ${type}`);
  }
  assert.ok(SONGS.lounge.voices.harm.cutoff > 0, 'harm should be lowpassed');
  assert.ok(!/[sho c]/.test(SONGS.lounge.channels.drum.replace(/[\[\]\d:\s-]/g, '').replace(/[kbt]/g, '')),
    'lounge drums should stick to kick, brush and ride tick');
});

test('the lounge comping uses 7th chords (four-note voicings)', () => {
  const data = compileSong(SONGS.lounge);
  let fourNote = 0;
  for (const evs of data.at.values()) if (evs.filter((e) => e.channel === 'harm').length >= 4) fourNote++;
  assert.ok(fourNote >= 8, `only ${fourNote} four-note chords`);
});

test('swing delays only the off-beat eighth', () => {
  const score = { swing: 0.5 };
  assert.equal(swingOffset(score, 0, 0.2), 0);
  assert.equal(swingOffset(score, 1, 0.2), 0);
  assert.equal(swingOffset(score, 2, 0.2), 0.1);
  assert.equal(swingOffset(score, 6, 0.2), 0.1);
  assert.equal(swingOffset({}, 2, 0.2), 0);
});

test('every screen and the first request play the lounge loop', () => {
  const app = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
  const block = app.slice(app.indexOf('const BATTLE_THEME'), app.indexOf('function show('));
  const tracks = [...block.matchAll(/:\s*'([a-z0-9]+)'/g)].map((m) => m[1]);
  assert.ok(tracks.length >= 9, 'screen map not found');
  assert.deepEqual([...new Set(tracks)], ['lounge']);
  const controls = readFileSync(new URL('../web/sound-controls.js', import.meta.url), 'utf8');
  assert.match(controls, /audio\.music\('lounge'\)/);
});
