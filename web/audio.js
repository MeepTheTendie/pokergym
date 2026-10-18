/* ============================================================================
 * PokerGym chiptune engine.
 *
 * Four voices, the Game Boy's allocation: two pulse (duty 12.5/25/50%),
 * one triangle for bass, one noise channel for percussion. No samples, no
 * network, no dependencies -- every sound is synthesised at play time.
 *
 * Music is a step sequencer on a 16th-note grid. Each song lists four channel
 * strings; a token is NOTE:STEPS (or CHORD:STEPS, or - :STEPS for a rest), so
 * a bar is 16 steps. Songs loop by wrapping the step counter.
 *
 * Audio can only start after a user gesture, so `unlock()` is called from the
 * first pointerdown/keydown. Until then `music()` just remembers the request.
 * ========================================================================== */

const STORE_KEY = 'pokergym.sound';

let ctx = null;
let master = null;
let musicBus = null;
let sfxBus = null;
let noiseBuf = null;
const waves = new Map();       // duty -> PeriodicWave

const MUSIC_LEVEL = 0.42;     // music bus level unless a song sets its own `level`

let muted = false;
if (typeof window !== 'undefined') {          // skip under node, where there is no Storage
  try { muted = localStorage.getItem(STORE_KEY) === 'off'; } catch { muted = false; }
}
let unlocked = false;                         // a real gesture has happened yet

let desired = null;            // track name requested by the UI
let timer = null;
let song = null;               // compiled song currently stepping
let step = 0;
let nextTime = 0;
let scheduledSteps = 0;

const LOOKAHEAD = 0.12;        // seconds of events scheduled in advance
const TICK_MS = 25;

/* ------------------------------- primitives ------------------------------ */

function midiFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/** Fourier coefficients of a rectangular wave of the given duty cycle. */
function pulseWave(duty) {
  if (waves.has(duty)) return waves.get(duty);
  const n = 32;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    real[k] = 2 * Math.sin(2 * Math.PI * k * duty) / (Math.PI * k);
    imag[k] = 2 * (1 - Math.cos(2 * Math.PI * k * duty)) / (Math.PI * k);
  }
  const w = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  waves.set(duty, w);
  return w;
}

function makeNoise() {
  const len = Math.floor(ctx.sampleRate * 1.2);
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let s = 1;                                   // deterministic LFSR-ish white noise
  for (let i = 0; i < len; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    d[i] = (s / 0x3fffffff) - 1;
  }
}

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(ctx.destination);
  musicBus = ctx.createGain();
  musicBus.gain.value = MUSIC_LEVEL;
  musicBus.connect(master);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.62;
  sfxBus.connect(master);
  makeNoise();
  return ctx;
}

/** A single voice: oscillator with an amplitude envelope. */
function voice(t, midi, dur, opts) {
  const {
    type = 'square', duty = 0.5, vol = 0.12,
    bus = musicBus, attack = 0.005, hold = 0.6, glide = 0, cutoff = 0, q = 0.7,
  } = opts;
  const o = ctx.createOscillator();
  if (type === 'pulse') o.setPeriodicWave(pulseWave(duty));
  else o.type = type;
  const f = midiFreq(midi);
  if (glide) {
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f * glide), t + dur);
  } else {
    o.frequency.setValueAtTime(f, t);
  }
  const g = ctx.createGain();
  const a = Math.min(attack, dur * 0.5);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  g.gain.setValueAtTime(vol, t + Math.max(a, dur * hold));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (cutoff) {
    // A lowpass rounds off the edges of a tone: the difference between a
    // buzzy chip voice and a soft electric-piano or upright-bass colour.
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, t);
    f.Q.value = q;
    o.connect(g).connect(f).connect(bus);
  } else {
    o.connect(g).connect(bus);
  }
  o.start(t);
  o.stop(t + dur + 0.03);
  return o;
}

/** A filtered burst of noise: hats, snares, card flicks. */
function hiss(t, dur, opts) {
  const { freq = 8000, q = 1, type = 'highpass', vol = 0.12, bus = musicBus, to = 0 } = opts;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(Math.max(60, to), t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t);
  src.stop(t + dur + 0.03);
}

function kick(t, gain = 1) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(155, t);
  o.frequency.exponentialRampToValueAtTime(46, t + 0.1);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.34 * gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  o.connect(g).connect(musicBus);
  o.start(t);
  o.stop(t + 0.18);
}

const DRUMS = {
  snare: { type: 'bandpass', freq: 1900, q: 0.7, vol: 0.17, dur: 0.13 },
  hat:   { type: 'highpass', freq: 8500, q: 1.0, vol: 0.10, dur: 0.035 },
  open:  { type: 'highpass', freq: 7500, q: 1.0, vol: 0.09, dur: 0.22 },
  crash: { type: 'highpass', freq: 5500, q: 0.6, vol: 0.11, dur: 0.5 },
  // lounge kit: a brushed snare swish and a quiet ride tick
  brush: { type: 'bandpass', freq: 2600, q: 0.45, vol: 0.07, dur: 0.2, to: 1400 },
  tick:  { type: 'highpass', freq: 6800, q: 0.8, vol: 0.035, dur: 0.07 },
};

/* Song strings use one letter per drum. */
export const DRUM_SOUNDS = {
  k: 'kick', s: 'snare', h: 'hat', o: 'open', c: 'crash', b: 'brush', t: 'tick',
};

function drum(letter, t, gain = 1) {
  const name = DRUM_SOUNDS[letter] ?? letter;
  if (name === 'kick') return kick(t, gain);
  const d = DRUMS[name];
  if (d) hiss(t, d.dur, { ...d, vol: d.vol * gain });
}

/* --------------------------------- songs --------------------------------- */

// Accidental may lead ("#C5") or trail ("Bb4"); accept both.
const NOTE_RE = /^([#b]?)([A-Ga-g])([#b]?)(-?\d)$/;
const SHARPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteToMidi(tok) {
  const m = NOTE_RE.exec(tok);
  if (!m) return null;
  const [, lead, letter, trail, oct] = m;
  const acc = (lead === '#' ? 1 : lead === 'b' ? -1 : 0)
            + (trail === '#' ? 1 : trail === 'b' ? -1 : 0);
  return SHARPS[letter.toUpperCase()] + acc + (parseInt(oct, 10) + 1) * 12;
}

/** Split "C4", "[CEG]" or "k" from its ":steps" suffix. */
function splitToken(tok) {
  const i = tok.lastIndexOf(':');
  if (i < 0) return [tok, '1'];
  return [tok.slice(0, i), tok.slice(i + 1)];
}

const DRUM_KIT = new Set(Object.keys(DRUM_SOUNDS));

/** Expand one token head into the notes (or drum hits) it triggers.
 *  Throws on anything that does not parse, so a typo in a song surfaces
 *  as a compile error instead of a silently missing voice. */
function expand(channel, head) {
  if (channel === 'drum') {
    const inner = head.startsWith('[') ? head.slice(1, -1) : head;
    const hits = inner.split('').filter(Boolean);
    for (const h of hits) {
      if (!DRUM_KIT.has(h)) throw new Error(`unknown drum "${h}" in "${head}"`);
    }
    return hits;
  }
  const inner = head.startsWith('[') ? head.slice(1, -1) : head;
  // Accidental leads the note ("#C3"), so let the match accept one before it.
  const parts = head.startsWith('[') ? inner.match(/#?[A-Ga-g][#b]?-?\d/g) : [head];
  if (!parts || parts.length === 0) throw new Error(`unparsable note "${head}"`);
  return parts.map((p) => {
    const midi = noteToMidi(p);
    if (midi === null) throw new Error(`unparsable note "${p}"`);
    return midi;
  });
}

/**
 * Flatten a song into a map of absolute step -> events, and check that every
 * channel spans the same number of steps.
 */
function compile(song) {
  const at = new Map();
  let total = 0;
  for (const [channel, text] of Object.entries(song.channels)) {
    let cursor = 0;
    try {
      for (const tok of String(text).trim().split(/\s+/).filter(Boolean)) {
        const [head, stepsRaw] = splitToken(tok);
        const len = Math.max(1, parseInt(stepsRaw, 10) || 1);
        if (head !== '-' && head !== '') {
          for (const n of expand(channel, head)) {
            if (!at.has(cursor)) at.set(cursor, []);
            at.get(cursor).push({ channel, note: n, len });
          }
        }
        cursor += len;
      }
    } catch (e) {
      return { error: `${channel}: ${e.message}` };
    }
    if (total === 0) total = cursor;
    else if (cursor !== total) {
      return { error: `channel "${channel}" spans ${cursor} steps, expected ${total}` };
    }
  }
  if (total !== song.bars * 16) {
    return { error: `spans ${total} steps, expected ${song.bars * 16} (${song.bars} bars)` };
  }
  return { at, total, gain: song.gain ?? 1 };
}

/** Returns a list of problems; empty means every song is well formed. */
export function validateSongs() {
  const out = [];
  for (const [name, s] of Object.entries(SONGS)) {
    const c = compile(s);
    if (c.error) out.push(`${name}: ${c.error}`);
    else if (!s.bpm || s.bpm < 60 || s.bpm > 220) out.push(`${name}: bad bpm ${s.bpm}`);
  }
  return out;
}

const compiled = new Map();
function getCompiled(name) {
  if (!compiled.has(name)) compiled.set(name, compile(SONGS[name]));
  return compiled.get(name);
}

/* ------------------------------- scheduling ------------------------------ */

function fire(ev, t, sps, gain, voices = {}) {
  const settings = voices[ev.channel] ?? {};
  const dur = ev.len * sps * (settings.gate ?? 1);
  if (ev.channel === 'drum') return drum(ev.note, t, gain * (settings.vol ?? 1));
  if (ev.channel === 'bass') {
    return voice(t, ev.note, dur, { type: 'triangle', vol: 0.17 * gain, hold: 0.5, ...settings });
  }
  if (ev.channel === 'harm') {
    return voice(t, ev.note, dur, { type: 'pulse', duty: 0.5, vol: 0.055 * gain, hold: 0.85, ...settings });
  }
  return voice(t, ev.note, dur, { type: 'pulse', duty: 0.25, vol: 0.13 * gain, hold: 0.7, ...settings });
}

/** Swing: push the off-beat 8th (step 2 of each beat) late by a fraction of
 *  a 16th. 0 is straight; about 0.67 is a full triplet shuffle. */
export function swingOffset(score, step, sps) {
  return score.swing && step % 4 === 2 ? score.swing * sps : 0;
}

function tick() {
  if (!song || !ctx || ctx.state !== 'running') return;
  const score = SONGS[song.name];
  const sps = 60 / score.bpm / 4;              // seconds per 16th step
  if (nextTime < ctx.currentTime - 0.05) {
    nextTime = ctx.currentTime + 0.05;          // fell behind: resync, don't burst
  }
  let guard = 0;
  while (nextTime < ctx.currentTime + LOOKAHEAD && guard++ < 64) {
    const events = song.data.at.get(song.step);
    const t = nextTime + swingOffset(score, song.step, sps);
    if (events) for (const ev of events) fire(ev, t, sps, song.data.gain, score.voices);
    nextTime += sps;
    song.step = (song.step + 1) % song.data.total;
    scheduledSteps++;
  }
}

function stopSequencer() {
  if (timer) clearInterval(timer);
  timer = null;
  song = null;
}

function startSequencer() {
  stopSequencer();
  if (!desired || !ctx) return;
  const data = getCompiled(desired);
  if (data.error) { console.warn('[audio] ' + desired + ': ' + data.error); return; }
  song = { name: desired, data, step: 0 };
  if (musicBus) musicBus.gain.setValueAtTime(SONGS[desired].level ?? MUSIC_LEVEL, ctx.currentTime);
  nextTime = ctx.currentTime + 0.06;
  timer = setInterval(tick, TICK_MS);
  tick();
}

/* ---------------------------------- SFX ---------------------------------- */

const SFX_PLAYS = {
  blip:   (t) => voice(t, 72, 0.05, { type: 'pulse', duty: 0.5, vol: 0.22, bus: sfxBus, hold: 0.3 }),
  move:   (t) => voice(t, 67, 0.04, { type: 'pulse', duty: 0.25, vol: 0.18, bus: sfxBus, hold: 0.3 }),
  confirm: (t) => {
    voice(t, 72, 0.05, { type: 'pulse', duty: 0.5, vol: 0.2, bus: sfxBus, hold: 0.3 });
    voice(t + 0.05, 79, 0.09, { type: 'pulse', duty: 0.5, vol: 0.2, bus: sfxBus, hold: 0.4 });
  },
  back:   (t) => {
    voice(t, 67, 0.05, { type: 'pulse', duty: 0.5, vol: 0.2, bus: sfxBus, hold: 0.3 });
    voice(t + 0.05, 62, 0.09, { type: 'pulse', duty: 0.5, vol: 0.2, bus: sfxBus, hold: 0.4 });
  },
  // a card flicking off the deck: a short downward noise sweep
  deal:   (t) => hiss(t, 0.07, { type: 'bandpass', freq: 3400, to: 1100, q: 1.6, vol: 0.3, bus: sfxBus }),
  chip:   (t) => {
    hiss(t, 0.03, { type: 'highpass', freq: 4000, vol: 0.14, bus: sfxBus });
    voice(t, 84, 0.05, { type: 'triangle', vol: 0.14, bus: sfxBus, hold: 0.2 });
  },
  hit:    (t) => voice(t, 69, 0.11, { type: 'pulse', duty: 0.125, vol: 0.2, bus: sfxBus, hold: 0.4, glide: 0.6 }),
  stand:  (t) => voice(t, 62, 0.12, { type: 'pulse', duty: 0.125, vol: 0.2, bus: sfxBus, hold: 0.5, glide: 1.4 }),
  win:    (t, shift = 0) => [72, 76, 79, 84].forEach((n, i) =>
    voice(t + i * 0.07, n + shift, 0.16, { type: 'pulse', duty: 0.25, vol: 0.2, bus: sfxBus, hold: 0.6 })),
  lose:   (t) => [67, 63, 58].forEach((n, i) =>
    voice(t + i * 0.11, n, 0.2, { type: 'pulse', duty: 0.5, vol: 0.18, bus: sfxBus, hold: 0.6 })),
  bust:   (t) => {
    hiss(t, 0.22, { type: 'lowpass', freq: 900, q: 0.7, vol: 0.24, bus: sfxBus });
    voice(t, 55, 0.3, { type: 'pulse', duty: 0.5, vol: 0.16, bus: sfxBus, hold: 0.5, glide: 0.45 });
  },
  level:  (t) => [72, 76, 79, 84, 88].forEach((n, i) =>
    voice(t + i * 0.06, n, 0.14, { type: 'pulse', duty: 0.25, vol: 0.2, bus: sfxBus, hold: 0.7 })),
  badge:  (t) => [67, 72, 76, 79, 84].forEach((n, i) =>
    voice(t + i * 0.09, n, 0.3, { type: 'pulse', duty: 0.25, vol: 0.2, bus: sfxBus, hold: 0.8 })),
  fanfare: (t) => [60, 60, 60, 67, 72].forEach((n, i) =>
    voice(t + i * 0.1, n, 0.16, { type: 'pulse', duty: 0.25, vol: 0.2, bus: sfxBus, hold: 0.7 })),
};

export const SFX_NAMES = Object.keys(SFX_PLAYS);

/* ---------------------------------- songs -------------------------------- */
/* Each channel string is a run of NOTE:STEPS tokens on a 16-step bar grid.
 * "-" is a rest, "[CEG]" is a chord, drums take k/s/h/o/c/b/t for kick,
 * snare, closed hat, open hat, crash, brush and ride tick. Keep every channel on bars*16 steps --
 * validateSongs() will tell you when one has drifted.                     */

const SONGS = {
  /* Lounge: the soundtrack for every screen. Slow, swung and quiet, so it can
     sit under a study session without nagging. Rootless 7th/9th voicings on a
     filtered triangle "electric piano", a sine melody with plenty of space, a
     walking upright-style bass and brushes. 16 bars, mostly ii-V-I in C:
       A: Dm9 | G13 | Cmaj9 | A7b9 | Dm9 | G7 | Em7 A7 | Dm7 G7
       B: Fmaj7 | Fm7 Bb7 | Em7 | A7b9 | Dm9 | G7sus G7 | Cmaj9 | Cmaj9 A7 */
  lounge: {
    bpm: 84, bars: 16, gain: 1, level: 0.25, swing: 0.55,
    voices: {
      lead: { type: 'sine', gate: 0.95, attack: 0.03, hold: 0.55, vol: 0.085 },
      harm: { type: 'triangle', gate: 1, attack: 0.012, hold: 0.18, vol: 0.042, cutoff: 1500 },
      bass: { type: 'triangle', gate: 0.92, attack: 0.008, hold: 0.45, vol: 0.15, cutoff: 700 },
      drum: { vol: 0.55 },
    },
    channels: {
      lead: [
        '-:4 A4:2 C5:2 E5:6 D5:2',
        '-:2 B4:2 D5:2 F5:2 E5:8',
        '-:8 D5:2 E5:2 G5:4',
        'G5:4 F5:2 E5:2 #C5:8',
        'D5:6 -:2 F4:2 A4:2 C5:4',
        'B4:8 -:4 G4:2 B4:2',
        'D5:4 B4:4 #C5:4 E5:4',
        'F5:6 E5:2 D5:4 B4:4',
        'C5:8 -:4 A4:2 C5:2',
        'Eb5:6 C5:2 D5:4 Ab4:4',
        'B4:4 G4:2 B4:2 D5:8',
        '-:4 E5:2 #C5:2 Bb4:4 G4:4',
        'A4:6 C5:2 E5:4 F5:4',
        'E5:4 D5:4 F5:4 D5:4',
        'E5:12 -:4',
        '-:8 G4:2 A4:2 #C5:2 E5:2',
      ].join(' '),
      harm: [
        '[F3A3C4E4]:6 [F3A3C4E4]:10',
        '[F3B3E4]:6 [F3B3E4]:10',
        '[E3G3B3D4]:6 [E3G3B3D4]:10',
        '[G3Bb3#C4E4]:6 [G3Bb3#C4E4]:10',
        '[F3A3C4E4]:6 [F3A3C4E4]:10',
        '[F3B3D4]:6 [F3B3D4]:10',
        '[G3B3D4]:8 [G3#C4E4]:8',
        '[F3A3C4]:8 [F3B3D4]:8',
        '[A3C4E4]:6 [A3C4E4]:10',
        '[Ab3C4Eb4]:8 [Ab3D4F4]:8',
        '[G3B3D4]:6 [G3B3D4]:10',
        '[G3Bb3#C4E4]:6 [G3Bb3#C4E4]:10',
        '[F3A3C4E4]:6 [F3A3C4E4]:10',
        '[F3C4D4]:8 [F3B3D4]:8',
        '[E3G3B3D4]:6 [E3G3B3D4]:10',
        '[E3G3B3D4]:8 [G3#C4E4]:8',
      ].join(' '),
      bass: [
        'D2:4 F2:4 A2:4 C3:4',
        'G2:4 B2:4 D3:4 #C3:4',
        'C3:4 G2:4 E2:4 Bb2:4',
        'A2:4 G2:4 E2:4 #C2:4',
        'D2:4 F2:4 A2:4 Ab2:4',
        'G2:4 F2:4 D2:4 #D2:4',
        'E2:4 G2:4 A2:4 #C3:4',
        'D3:4 A2:4 G2:4 E2:4',
        'F2:4 A2:4 C3:4 E3:4',
        'F2:4 Ab2:4 Bb2:4 D2:4',
        'E2:4 G2:4 B2:4 D3:4',
        'A2:4 G2:4 E2:4 #C2:4',
        'D2:4 F2:4 A2:4 C3:4',
        'G2:4 F2:4 D2:4 B1:4',
        'C2:4 E2:4 G2:4 B2:4',
        'C3:4 G2:4 A2:4 E2:4',
      ].join(' '),
      // ride "spang-a-lang" with brushes on 2 and 4, a soft kick on 1
      drum: Array(16).fill('[kt]:4 [bt]:2 t:2 t:4 [bt]:2 t:2').join(' '),
    },
  },

  /* Original arcade theme: animated call/response, chromatic pickups and
     bouncing single-note accompaniment instead of sustained synth chords.
     Three pitched voices + restrained noise, in the handheld sound idiom. */
  academy: {
    bpm: 144, bars: 8, gain: 0.85,
    voices: {
      lead: { duty: 0.5, gate: 0.82, attack: 0.002, hold: 0.35, vol: 0.10 },
      harm: { duty: 0.25, gate: 0.65, attack: 0.002, hold: 0.3, vol: 0.075 },
      bass: { gate: 0.55, attack: 0.002, hold: 0.6, vol: 0.14 },
    },
    channels: {
      lead: [
        'E5:2 -:1 E5:1 G5:2 A5:1 G5:1 E5:2 C5:2 D5:2 E5:2',
        'G5:3 E5:1 D5:2 C5:2 B4:2 C5:1 #C5:1 D5:2 G5:2',
        'A5:2 -:1 A5:1 C6:2 B5:1 A5:1 G5:2 E5:2 F5:2 G5:2',
        'F5:3 E5:1 D5:2 B4:2 G4:2 A4:1 Bb4:1 B4:2 D5:2',
        'E5:2 G5:2 C6:3 B5:1 A5:2 G5:2 E5:2 G5:2',
        'A5:3 G5:1 F5:2 E5:2 D5:2 E5:1 F5:1 #F5:2 A5:2',
        'G5:2 D5:2 B5:2 A5:2 G5:3 F5:1 E5:2 D5:2',
        'C5:3 E5:1 G5:2 C6:2 B5:1 Bb5:1 A5:2 G5:2 D5:2',
      ].join(' '),
      harm: [
        'C4:2 G4:2 E4:2 G4:2 C4:2 G4:2 E4:2 G4:2',
        'B3:2 G4:2 D4:2 G4:2 B3:2 D4:2 F4:2 G4:2',
        'C4:2 A4:2 E4:2 A4:2 C4:2 A4:2 E4:2 G4:2',
        'B3:2 G4:2 F4:2 G4:2 B3:2 G4:2 D4:2 F4:2',
        'E4:2 G4:2 C5:2 G4:2 E4:2 G4:2 C5:2 G4:2',
        'D4:2 A4:2 F4:2 A4:2 D4:2 A4:2 #F4:2 A4:2',
        'D4:2 G4:2 B4:2 G4:2 D4:2 G4:2 F4:2 G4:2',
        'E4:2 G4:2 C5:2 G4:2 D4:2 G4:2 B4:2 G4:2',
      ].join(' '),
      bass: [
        'C3:2 G2:2 E3:2 G2:2 C3:2 G2:2 A2:2 Bb2:2',
        'B2:2 G2:2 D3:2 G2:2 B2:2 G2:2 A2:2 B2:2',
        'A2:2 E3:2 C3:2 E3:2 A2:2 E3:2 G2:2 A2:2',
        'G2:2 D3:2 B2:2 D3:2 G2:2 D3:2 A2:2 B2:2',
        'C3:2 G2:2 E3:2 G2:2 C3:2 G2:2 E3:2 #C3:2',
        'D3:2 A2:2 F3:2 A2:2 D3:2 A2:2 #F3:2 A2:2',
        'G2:2 D3:2 B2:2 D3:2 G2:2 D3:2 A2:2 B2:2',
        'C3:2 G2:2 E3:2 G2:2 B2:2 D3:2 G2:2 B2:2',
      ].join(' '),
      drum: Array(8).fill('h:2 -:2 s:2 -:2 h:2 -:2 s:2 h:2').join(' '),
    },
  },
  /* Title: A minor, heroic. Am - F - C - G. */
  title: {
    bpm: 112, bars: 4, gain: 0.9,
    channels: {
      lead: 'E5:4 A5:4 G5:2 E5:2 D5:4 C5:4 F5:4 E5:2 C5:2 A4:4 '
          + 'G5:4 E5:4 G5:2 A5:2 G5:4 D5:4 B4:4 A4:2 B4:2 D5:4',
      harm: '[A3C4E4]:8 [A3C4E4]:8 [F3A3C4]:8 [F3A3C4]:8 '
          + '[G3C4E4]:8 [G3C4E4]:8 [G3B3D4]:8 [G3B3D4]:8',
      bass: 'A1:4 A2:4 A1:4 E2:4 F1:4 F2:4 F1:4 C2:4 '
          + 'C2:4 C3:4 C2:4 G2:4 G1:4 G2:4 G1:4 D2:4',
      drum: '[kh]:2 h:2 [sh]:2 h:2 [kh]:2 h:2 [sh]:2 h:2 '
          + '[kh]:2 h:2 [sh]:2 h:2 [kh]:2 h:2 [sh]:2 h:2 '
          + '[kh]:2 h:2 [sh]:2 h:2 [kh]:2 h:2 [sh]:2 h:2 '
          + '[kh]:2 h:2 [sh]:2 h:2 [kh]:2 h:2 [sh]:2 h:2',
    },
  },

  /* Overworld / lesson: C major, gentle. C - G - Am - F. */
  map: {
    bpm: 96, bars: 4, gain: 0.8,
    channels: {
      lead: 'E5:8 G5:4 E5:4 D5:8 B4:4 D5:4 C5:4 E5:4 A5:8 G5:8 F5:4 E5:4',
      harm: '[E3G3C4]:8 [E3G3C4]:8 [D3G3B3]:8 [D3G3B3]:8 '
          + '[E3A3C4]:8 [E3A3C4]:8 [F3A3C4]:8 [F3A3C4]:8',
      bass: 'C2:8 G2:8 G1:8 D2:8 A1:8 E2:8 F1:8 C2:8',
      drum: 'k:2 h:2 -:2 h:2 k:2 h:2 -:2 h:2 '
          + 'k:2 h:2 -:2 h:2 k:2 h:2 -:2 h:2 '
          + 'k:2 h:2 -:2 h:2 k:2 h:2 -:2 h:2 '
          + 'k:2 h:2 -:2 h:2 k:2 h:2 -:2 h:2',
    },
  },

  /* Gym 1, video poker: E minor, driving. Em - C - G - D. */
  battle1: {
    bpm: 148, bars: 4,
    channels: {
      lead: 'B4:2 E5:2 G5:2 B5:2 A5:2 G5:2 E5:4 G4:2 C5:2 E5:2 G5:2 E5:2 D5:2 C5:4 '
          + 'B4:2 D5:2 G5:2 B5:2 A5:2 G5:2 D5:4 A4:2 D5:2 #F5:2 A5:2 G5:2 #F5:2 D5:4',
      harm: '-:2 [E3G3B3]:2 -:2 [E3G3B3]:2 -:2 [E3G3B3]:2 -:2 [E3G3B3]:2 '
          + '-:2 [E3G3C4]:2 -:2 [E3G3C4]:2 -:2 [E3G3C4]:2 -:2 [E3G3C4]:2 '
          + '-:2 [D3G3B3]:2 -:2 [D3G3B3]:2 -:2 [D3G3B3]:2 -:2 [D3G3B3]:2 '
          + '-:2 [D3#F3A3]:2 -:2 [D3#F3A3]:2 -:2 [D3#F3A3]:2 -:2 [D3#F3A3]:2',
      bass: 'E2:2 E2:2 E3:2 E2:2 E2:2 E2:2 G2:2 A2:2 C2:2 C2:2 C3:2 C2:2 C2:2 C2:2 E2:2 G2:2 '
          + 'G1:2 G1:2 G2:2 G1:2 G1:2 G1:2 B1:2 D2:2 D2:2 D2:2 D3:2 D2:2 D2:2 D2:2 #F2:2 A2:2',
      drum: '[kh]:2 h:2 [sh]:2 h:2 [kh]:2 [kh]:2 [sh]:2 h:2 '
          + '[kh]:2 h:2 [sh]:2 h:2 [kh]:2 [kh]:2 [sh]:2 h:2 '
          + '[kh]:2 h:2 [sh]:2 h:2 [kh]:2 [kh]:2 [sh]:2 h:2 '
          + '[kh]:2 h:2 [sh]:2 h:2 [kh]:2 [kh]:2 [sh]:2 [sh]:2',
    },
  },

  /* Gym 2, blackjack: D minor Andalusian, swagger. Dm - C - Bb - A. */
  battle2: {
    bpm: 152, bars: 4,
    channels: {
      lead: 'A4:2 D5:2 F5:2 A5:2 G5:2 F5:2 D5:4 G4:2 C5:2 E5:2 G5:2 F5:2 E5:2 C5:4 '
          + 'F4:2 Bb4:2 D5:2 F5:2 E5:2 D5:2 Bb4:4 A4:2 #C5:2 E5:2 A5:2 G5:2 E5:2 #C5:4',
      harm: '-:2 [D3F3A3]:2 -:2 [D3F3A3]:2 -:2 [D3F3A3]:2 -:2 [D3F3A3]:2 '
          + '-:2 [C3E3G3]:2 -:2 [C3E3G3]:2 -:2 [C3E3G3]:2 -:2 [C3E3G3]:2 '
          + '-:2 [Bb2D3F3]:2 -:2 [Bb2D3F3]:2 -:2 [Bb2D3F3]:2 -:2 [Bb2D3F3]:2 '
          + '-:2 [A2#C3E3]:2 -:2 [A2#C3E3]:2 -:2 [A2#C3E3]:2 -:2 [A2#C3E3]:2',
      bass: 'D2:2 D2:2 D3:2 D2:2 D2:2 D2:2 F2:2 A2:2 C2:2 C2:2 C3:2 C2:2 C2:2 C2:2 E2:2 G2:2 '
          + 'Bb1:2 Bb1:2 Bb2:2 Bb1:2 Bb1:2 Bb1:2 D2:2 F2:2 A1:2 A1:2 A2:2 A1:2 A1:2 A1:2 #C2:2 E2:2',
      drum: '[kh]:2 h:2 [sh]:2 h:2 [kh]:2 [kh]:2 [sh]:2 h:2 '
          + '[kh]:2 h:2 [sh]:2 h:2 [kh]:2 [kh]:2 [sh]:2 h:2 '
          + '[kh]:2 h:2 [sh]:2 h:2 [kh]:2 [kh]:2 [sh]:2 h:2 '
          + '[kh]:2 h:2 [sh]:2 h:2 [kh]:2 [kh]:2 [sh]:2 o:2',
    },
  },

  /* Gym 3, baccarat: B minor, elegant. Bm - G - D - A. */
  battle3: {
    bpm: 138, bars: 4, gain: 0.9,
    channels: {
      lead: '#F5:4 B5:4 A5:4 #F5:4 G5:8 D5:4 B4:4 A5:4 #F5:4 D5:8 E5:4 #C5:4 A4:4 B4:4',
      harm: '[B2D3#F3]:8 [B2D3#F3]:8 [G2B2D3]:8 [G2B2D3]:8 '
          + '[D3#F3A3]:8 [D3#F3A3]:8 [A2#C3E3]:8 [A2#C3E3]:8',
      bass: 'B1:4 B1:4 #F2:4 B1:4 G1:4 G1:4 D2:4 G1:4 '
          + 'D2:4 D2:4 A2:4 D2:4 A1:4 A1:4 E2:4 A1:4',
      drum: '[kh]:4 h:4 [sh]:4 h:4 '
          + '[kh]:4 h:4 [sh]:4 h:4 '
          + '[kh]:4 h:4 [sh]:4 h:4 '
          + '[kh]:4 h:4 [sh]:4 h:4',
    },
  },

  /* Gym 4, hold'em: A harmonic minor, fastest. Am - G - F - E. */
  battle4: {
    bpm: 156, bars: 4,
    channels: {
      lead: 'A4:2 C5:2 E5:2 A5:2 G5:2 E5:2 C5:4 G4:2 B4:2 D5:2 G5:2 #F5:2 D5:2 B4:4 '
          + 'F4:2 A4:2 C5:2 F5:2 E5:2 C5:2 A4:4 E4:2 #G4:2 B4:2 E5:2 D5:2 B4:2 #G4:4',
      harm: '-:2 [A2C3E3]:2 -:2 [A2C3E3]:2 -:2 [A2C3E3]:2 -:2 [A2C3E3]:2 '
          + '-:2 [G2B2D3]:2 -:2 [G2B2D3]:2 -:2 [G2B2D3]:2 -:2 [G2B2D3]:2 '
          + '-:2 [F2A2C3]:2 -:2 [F2A2C3]:2 -:2 [F2A2C3]:2 -:2 [F2A2C3]:2 '
          + '-:2 [E2#G2B2]:2 -:2 [E2#G2B2]:2 -:2 [E2#G2B2]:2 -:2 [E2#G2B2]:2',
      bass: 'A1:2 A1:2 A2:2 A1:2 A1:2 A1:2 C2:2 E2:2 G1:2 G1:2 G2:2 G1:2 G1:2 G1:2 B1:2 D2:2 '
          + 'F1:2 F1:2 F2:2 F1:2 F1:2 F1:2 A1:2 C2:2 E1:2 E1:2 E2:2 E1:2 E1:2 E1:2 #G1:2 B1:2',
      drum: '[kh]:2 h:2 [sh]:2 h:2 [kh]:2 h:2 [sh]:2 h:2 '
          + '[kh]:2 h:2 [sh]:2 h:2 [kh]:2 h:2 [sh]:2 h:2 '
          + '[kh]:2 h:2 [sh]:2 h:2 [kh]:2 h:2 [sh]:2 h:2 '
          + '[kh]:2 h:2 [sh]:2 h:2 [kh]:2 h:2 [sh]:2 [sh]:2',
    },
  },
};

export { SONGS, compile as compileSong };

/* ---------------------------------- public ------------------------------- */

function applyMute() {
  if (master) master.gain.value = muted ? 0 : 1;
}

/** Create/resume the context. Safe to call on every input event. */
export function unlock() {
  unlocked = true;
  // Mobile browsers grant activation on touchend/click, not necessarily on
  // pointerdown. Retry resume on every gesture, including after interruptions.
  if (ctx?.state === 'closed') {
    ctx = null;
    waves.clear();
    stopSequencer();
  }
  if (!ensure()) return;
  if (ctx.state !== 'running') {
    ctx.resume().then(() => {
      if (ctx.state === 'running' && desired && !muted && !timer) startSequencer();
    }).catch(() => {});
  } else if (desired && !muted && !timer) {
    startSequencer();
  }
}

/** Request a looping track ("title", "map", "battle1".."battle4") or null. */
export function music(name) {
  if (desired === name) return;
  desired = name;
  if (!ctx) return;
  stopSequencer();
  if (desired && !muted) startSequencer();
}

/** Fire a one-shot sound effect. `shift` transposes pitch-aware cues. */
export function sfx(name, shift = 0) {
  const play = SFX_PLAYS[name];
  // Before a gesture there is no context to play into, and asking for one just
  // earns a "AudioContext was not allowed to start" warning from the browser.
  if (!play || muted || !unlocked) return;
  if (!ensure()) return;
  if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
  play(ctx.currentTime + 0.001, shift);
}

export function setMuted(v) {
  muted = !!v;
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(STORE_KEY, muted ? 'off' : 'on'); } catch { /* private mode */ }
  }
  applyMute();
  if (muted) stopSequencer();
  else unlock();
}

export function toggleMute() {
  setMuted(!muted);
  return muted;
}

export function isMuted() { return muted; }

/** What the engine thinks it is doing. Used by the browser probe. */
export function status() {
  return {
    muted,
    context: ctx ? ctx.state : 'none',
    track: desired,
    playing: Boolean(song),
    scheduled: scheduledSteps,
  };
}

// Keep the loop honest when the tab is backgrounded: AudioContext pauses with
// it, so on return `nextTime` is still valid and nothing needs rewinding.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else if (unlocked && !muted) unlock();
  });
}

const audio = { unlock, music, sfx, setMuted, toggleMute, isMuted, status };
export default audio;
