import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const bend = process.env.BEND_BIN || 'bend';

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (r.status !== 0) {
    console.error(r.stdout);
    console.error(r.stderr);
    process.exit(r.status ?? 1);
  }
  return r;
}

// 1. Make sure bend is available.
const check = spawnSync(bend, ['--help'], { encoding: 'utf8' });
if (check.status !== 0) {
  console.log('bend not found; skipping Bend verification (install from https://bend-lang.com).');
  process.exit(0);
}

const work = mkdtempSync(path.join(tmpdir(), 'pokergym-bend-'));
try {
  const out = path.join(work, 'evaluate.mjs');
  run(bend, [path.join(root, 'src/evaluate.bend'), '-o', out], { cwd: work });

  const mod = await import(out);
  const bendCat = mod.default.eval5_cat;

  const { evaluate5 } = await import(path.join(root, 'src/evaluate.js'));
  const { suitIndex } = await import(path.join(root, 'src/cards.js'));

  const c = (r, s) => ({ r, s: suitIndex(s) });
  const pack = (card) => (card.r - 2) * 4 + card.s;

  function randHand() {
    const deck = [];
    for (let r = 2; r <= 14; r++) for (let s of ['s', 'h', 'd', 'c']) deck.push(c(r, s));
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck.slice(0, 5);
  }

  let mismatches = 0;
  for (let t = 0; t < 5000; t++) {
    const hand = randHand();
    const jsCat = evaluate5(hand).category;
    const bCat = bendCat(...hand.map(pack));
    if (jsCat !== bCat) {
      mismatches++;
      if (mismatches <= 10) console.log('MISMATCH', hand.map(x => `${x.r}${x.s}`).join(' '), 'js', jsCat, 'bend', bCat);
    }
  }
  if (mismatches) {
    console.error(`Bend verification FAILED: ${mismatches}/5000 mismatches`);
    process.exit(1);
  }
  console.log('Bend verification passed: 5000/5000 hands match.');
} finally {
  rmSync(work, { recursive: true, force: true });
}
