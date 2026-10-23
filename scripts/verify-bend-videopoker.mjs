import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const bend = process.env.BEND_BIN || 'bend';

const check = spawnSync(bend, ['--help'], { encoding: 'utf8' });
if (check.status !== 0) {
  console.log('bend not found; skipping Bend verification.');
  process.exit(0);
}

const work = mkdtempSync(path.join(tmpdir(), 'pokergym-bend-vp-'));
try {
  const out = path.join(work, 'videopoker-win.mjs');
  const r = spawnSync(bend, [path.join(root, 'src/videopoker-win.bend'), '-o', out], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stderr || r.stdout); process.exit(1); }

  const mod = await import(out);
  const bendWin = mod.default.win_code;

  const { winCodeOf, VARIANTS } = await import(path.join(root, 'src/games/videopoker.js'));
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

  const nonWild = VARIANTS.filter(v => !v.wild);
  let mismatches = 0;
  for (const variant of nonWild) {
    for (let t = 0; t < 2000; t++) {
      const hand = randHand();
      const js = winCodeOf(hand, variant);
      const b = bendWin(...hand.map(pack), variant.minPairRank - 2, variant.quadTiers ? 1 : 0);
      if (js !== b) {
        mismatches++;
        if (mismatches <= 10) console.log('MISMATCH', variant.id, hand.map(x => `${x.r}${x.s}`).join(' '), 'js', js, 'bend', b);
      }
    }
  }
  if (mismatches) {
    console.error(`Bend video poker verification FAILED: ${mismatches} mismatches`);
    process.exit(1);
  }
  console.log(`Bend video poker verification passed: ${nonWild.length * 2000} hands match.`);
} finally {
  rmSync(work, { recursive: true, force: true });
}