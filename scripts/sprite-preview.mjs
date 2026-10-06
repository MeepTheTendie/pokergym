/* Print every sprite as ASCII so the grids can be inspected without a browser.
 * usage: node scripts/sprite-preview.mjs [id...]                                */
import { artRows, artRamp, ART_IDS } from '../web/sprites.js';

const GLYPH = { 0: '@', 1: '#', 2: '+', 3: 'o', '.': ' ' };
const wanted = process.argv.slice(2);
const ids = wanted.length ? wanted : ART_IDS;

for (const id of ids) {
  const rows = artRows(id);
  const ramp = artRamp(id);
  const painted = rows.join('').replace(/\./g, '').length;
  console.log(`\n===== ${id}  (${painted} painted px)  ramp ${ramp.join(' ')}`);
  rows.forEach((row, y) => {
    const line = [...row].map((c) => GLYPH[c] ?? '?').join('');
    console.log(`${String(y).padStart(2, '0')}|${line}|`);
  });
}
