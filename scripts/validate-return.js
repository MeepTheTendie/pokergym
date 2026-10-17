import { makeDeck, shuffle, seededRng } from '../src/cards.js';
import { bestHold, clearCache } from '../src/coach/videopoker.js';
import { DEFAULT_VARIANT, variantById } from '../src/games/videopoker.js';

const hands = Number(process.argv[2] ?? 400);
const variant = variantById(process.argv[3] ?? DEFAULT_VARIANT.id);
const EXPECTED_RETURN = variant.expectedReturn;

const evs = [];
let start = Date.now();

for (let i = 0; i < hands; i++) {
  if (i % 100 === 0 && i > 0) {
    process.stdout.write(`  ${i}/${hands} (${((Date.now() - start) / 1000).toFixed(0)}s)\n`);
  }
  const hand = shuffle(makeDeck(), seededRng(i + 1)).slice(0, 5);
  evs.push(bestHold(hand, { variant }).ev);
}

const n = evs.length;
const meanEv = evs.reduce((a, b) => a + b, 0) / n;
const variance = evs.reduce((a, b) => a + (b - meanEv) ** 2, 0) / (n - 1);
const stderr = Math.sqrt(variance / n);

console.log('');
console.log(`${variant.name} (${variant.ratio}) optimal-play simulation`);
console.log(`  hands simulated  : ${n}`);
console.log(`  mean EV / credit : ${meanEv.toFixed(5)}`);
console.log(`  standard error   : ${stderr.toFixed(5)}`);
console.log(`  95% CI           : ${(meanEv - 1.96 * stderr).toFixed(4)} .. ${(meanEv + 1.96 * stderr).toFixed(4)}`);
console.log(`  published return : ${EXPECTED_RETURN.toFixed(4)}`);

const drift = Math.abs(meanEv - EXPECTED_RETURN);
const resolvable = 1.96 * stderr;

console.log('');
console.log('Pay table (per credit wagered):');
for (const row of variant.rows) {
  console.log(`  ${String(row.amount).padStart(3)}  ${row.label}`);
}
console.log(
  variant.minPairRank > 14
    ? '  (no pair pays on this table)'
    : `  minimum paying pair rank: ${variant.minPairRank} (Jack)`,
);
clearCache();

console.log('');
if (drift > resolvable) {
  console.log(`INCONCLUSIVE: drift ${(drift * 100).toFixed(2)}pp but 95% CI is +/-${(resolvable * 100).toFixed(2)}pp`);
  console.log(`Per-hand EV has huge variance (royal flushes alone contribute 250), so`);
  console.log(`resolving ${(EXPECTED_RETURN * 100).toFixed(2)}% to within 1pp needs roughly`);
  console.log(`${Math.ceil((1.96 * Math.sqrt(variance) / 0.005) ** 2).toLocaleString()} hands.`);
  console.log(`Use the per-hand EV assertions in test/videopoker.test.js as the real check.`);
} else {
  console.log(`OK: drift ${(drift * 100).toFixed(2)}pp is inside the 95% confidence interval`);
}
