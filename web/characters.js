// The generated atlas is shipped locally; canvas keeps its transparent pixels
// and snaps every character to the same native 96px battle frame.
const atlas = new Image();
atlas.src = new URL('./assets/characters-v2.png', import.meta.url).href;
await atlas.decode();

const trainerIds = ['scholar', 'dealer', 'countess', 'grinder'];
const leaderIds = ['videopoker', 'blackjack', 'baccarat', 'holdem'];
const cells = new Map();
const source = document.createElement('canvas');
source.width = atlas.naturalWidth;
source.height = atlas.naturalHeight;
const sourceContext = source.getContext('2d', { willReadFrequently: true });
sourceContext.drawImage(atlas, 0, 0);

function bounds(column, row) {
  // The artist uses a shorter middle band for waist-up back views.
  const rowEdges = [0, 374 / 1086, 665 / 1086, 1];
  const x = Math.round(column * source.width / 4);
  const y = Math.round(rowEdges[row] * source.height);
  const width = Math.round((column + 1) * source.width / 4) - x;
  const height = Math.round(rowEdges[row + 1] * source.height) - y;
  const pixels = sourceContext.getImageData(x, y, width, height).data;
  let left = width, top = height, right = -1, bottom = -1;
  for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
    if (pixels[(py * width + px) * 4 + 3] < 32) continue;
    left = Math.min(left, px); top = Math.min(top, py);
    right = Math.max(right, px); bottom = Math.max(bottom, py);
  }
  if (right < left) throw new Error(`Empty character cell ${column},${row}`);
  return [x + left, y + top, right - left + 1, bottom - top + 1];
}

trainerIds.forEach((id, column) => {
  cells.set(id, bounds(column, 0));
  cells.set(`${id}:back`, bounds(column, 1));
});
leaderIds.forEach((id, column) => cells.set(id, bounds(column, 2)));

export function drawArt(canvas, id) {
  const cell = cells.get(id) ?? cells.get('scholar');
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const scale = Math.min(88 / cell[2], 90 / cell[3]);
  const width = Math.round(cell[2] * scale);
  const height = Math.round(cell[3] * scale);
  ctx.drawImage(atlas, ...cell, Math.floor((96 - width) / 2), 94 - height, width, height);
}

export function drawTrainerBack(canvas, id) { drawArt(canvas, `${id}:back`); }
