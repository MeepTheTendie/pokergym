/* ---------------- pixel-art sprites -------------------------------------
 * Every character is a 48x48 index grid: '0'..'3' are palette slots and '.'
 * is transparent. Shapes are painted in order - torso, neck, head, hair,
 * face, accessories - enclosed gaps are then flooded shut and a single dark
 * rim is laid around the silhouette, the way a GBC sprite is assembled.
 *
 * palette: 0 outline/dark detail, 1 jacket, 2 shirt/mid, 3 skin/light
 */

export const W = 48;
export const H = 48;

const CX = 24;
const HEAD_TOP = 1;
const CHIN = 23;
const COLLAR_Y = 26;
const SHOULDER_Y = 26;
const SHIRT_BOTTOM = 40;

const DEALER_RAMPS = {
  videopoker: ['#1f3a1f', '#2f6a3f', '#7fbf8f', '#e8f8e8'],
  blackjack: ['#3a2f1a', '#7a5f2f', '#cfa95f', '#f8ecd0'],
  baccarat: ['#2a2a3a', '#4a4a6a', '#9a9abf', '#e8e8f8'],
  holdem: ['#2a1a2a', '#5f3f5f', '#a87fb0', '#f0d8f0'],
};

const TRAINER_RAMPS = {
  scholar: ['#4a1c5c', '#7b3b8f', '#a95fa8', '#d7a3d8'],
  dealer: ['#5c1c1c', '#8f3b3b', '#bf5f5f', '#ef9a9a'],
  countess: ['#0f2f5f', '#2f5f8f', '#4f8fbf', '#7fbfe8'],
  grinder: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
};

/* head = hair/hat, tie = neckwear, face = eyewear or facial hair,
 * build = shoulder half-width, which keeps the eight silhouettes apart */
const CONFIGS = {
  videopoker: { head: 'slick', tie: 'bow', face: 'mustache', build: 17 },
  blackjack: { head: 'cap', tie: 'long', face: 'none', build: 17 },
  baccarat: { head: 'bald', tie: 'bow', face: 'monocle', build: 16 },
  holdem: { head: 'brim', tie: 'bolo', face: 'none', build: 19 },
  scholar: { head: 'neat', tie: 'long', face: 'glasses', build: 15 },
  dealer: { head: 'slick', tie: 'long', face: 'beard', build: 17 },
  countess: { head: 'long', tie: 'pearls', face: 'none', build: 14 },
  grinder: { head: 'buzz', tie: 'long', face: 'stubble', build: 18 },
};

export const ART_IDS = Object.keys(CONFIGS);

const blank = () => Array.from({ length: H }, () => new Array(W).fill('.'));
const onCanvas = (x, y) => x >= 0 && x < W && y >= 0 && y < H;
const setPx = (g, x, y, c) => { if (onCanvas(x, y)) g[y][x] = String(c); };
/* paint only where the silhouette already exists - nothing may float */
const setIn = (g, x, y, c) => { if (onCanvas(x, y) && g[y][x] !== '.') g[y][x] = String(c); };

function fillBox(g, x0, y0, x1, y1, c) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setPx(g, x, y, c);
}

function fillIn(g, x0, y0, x1, y1, c) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setIn(g, x, y, c);
}

/* width of the head on a given row: cranium above, tapering jaw below,
 * with ears bulging at the temples */
function headSpan(y) {
  if (y < HEAD_TOP || y > CHIN) return null;
  if (y >= 17) {
    const hw = 11 - (y - 17);
    return [CX - hw, CX + hw];
  }
  const dy = (y - 11) / 10;
  const dx = Math.floor(12 * Math.sqrt(Math.max(0, 1 - dy * dy)));
  let lo = CX - dx;
  let hi = CX + dx;
  if (y >= 12 && y <= 16) { lo = Math.min(lo, 10); hi = Math.max(hi, 37); }
  return [lo, hi];
}

/* enclosed transparent pixels take the colour of their border, so a shape
 * that notches inwards never leaves a see-through hole */
function fillHoles(g) {
  const outside = Array.from({ length: H }, () => new Array(W).fill(false));
  const stack = [];
  for (let x = 0; x < W; x++) { stack.push([x, 0], [x, H - 1]); }
  for (let y = 0; y < H; y++) { stack.push([0, y], [W - 1, y]); }
  while (stack.length) {
    const [x, y] = stack.pop();
    if (!onCanvas(x, y) || outside[y][x] || g[y][x] !== '.') continue;
    outside[y][x] = true;
    stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (g[y][x] !== '.' || outside[y][x]) continue;
      const tally = [0, 0, 0, 0];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = g[y + dy]?.[x + dx];
        if (n !== undefined && n !== '.') tally[Number(n)]++;
      }
      let best = 0;
      for (let i = 1; i < 4; i++) if (tally[i] > tally[best]) best = i;
      g[y][x] = String(best);
    }
  }
}

/* 1px dark rim: any painted pixel touching transparency becomes the
 * darkest palette slot */
function outline(g) {
  const src = g.map((row) => row.slice());
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (src[y][x] === '.') continue;
      const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1
        || src[y][x - 1] === '.' || src[y][x + 1] === '.'
        || src[y - 1][x] === '.' || src[y + 1][x] === '.';
      if (edge) g[y][x] = '0';
    }
  }
}

function drawTorso(g, build) {
  for (let y = SHOULDER_Y; y < H; y++) {
    const s = Math.min(1, (y - SHOULDER_Y) / 11);
    const t = s * s * (3 - 2 * s);
    const hw = Math.round(4 + (build - 4) * t);
    for (let x = CX - hw; x <= CX + hw; x++) setPx(g, x, y, 1);
  }
  for (let y = 27; y <= SHIRT_BOTTOM; y++) {
    fillBox(g, 21, y, 27, y, 2);
    setPx(g, 20, y, 0);
    setPx(g, 28, y, 0);
  }
  fillBox(g, 20, 41, 28, 41, 0);
  for (let y = 42; y < H; y++) setPx(g, 24, y, 0);
  setPx(g, 24, 43, 3);
  setPx(g, 24, 46, 3);
}

function hairCap(g, y0, y1, c) {
  for (let y = y0; y <= y1; y++) {
    const s = headSpan(y);
    if (s) fillBox(g, s[0], y, s[1], y, c);
  }
}

function sideburns(g, y0, y1, width, c) {
  for (let y = y0; y <= y1; y++) {
    const s = headSpan(y);
    if (!s) continue;
    fillBox(g, s[0], y, s[0] + width - 1, y, c);
    fillBox(g, s[1] - width + 1, y, s[1], y, c);
  }
}

function drawHead(g, kind) {
  switch (kind) {
    case 'slick': {
      hairCap(g, 2, 8, 0);
      fillIn(g, 28, 3, 29, 8, 3);
      sideburns(g, 9, 11, 2, 0);
      break;
    }
    case 'neat': {
      hairCap(g, 2, 7, 0);
      fillIn(g, 16, 3, 22, 5, 1);
      sideburns(g, 8, 10, 1, 0);
      break;
    }
    case 'buzz': {
      hairCap(g, 2, 7, 0);
      for (let y = 3; y <= 7; y++) {
        for (let x = 14; x <= 34; x++) {
          if ((x + y) % 2 === 0) setIn(g, x, y, 1);
        }
      }
      sideburns(g, 8, 9, 1, 0);
      break;
    }
    case 'bald': {
      for (let y = 6; y <= 16; y++) {
        const s = headSpan(y);
        fillBox(g, s[0], y, s[0] + 2, y, 0);
        fillBox(g, s[1] - 2, y, s[1], y, 0);
      }
      break;
    }
    case 'cap': {
      for (let y = 1; y <= 7; y++) {
        const s = headSpan(y);
        fillBox(g, s[0] - 1, y, s[1] + 1, y, 1);
      }
      fillIn(g, 18, 2, 30, 4, 2);
      fillBox(g, 10, 8, 38, 9, 0);
      break;
    }
    case 'brim': {
      for (let y = 1; y <= 6; y++) {
        const s = headSpan(y);
        fillBox(g, s[0] - 1, y, s[1] + 1, y, 1);
      }
      fillIn(g, 20, 2, 28, 3, 2);
      fillBox(g, 13, 6, 35, 7, 0);
      fillBox(g, 4, 8, 44, 9, 0);
      break;
    }
    case 'long': {
      hairCap(g, 1, 9, 0);
      for (let y = 10; y <= 23; y++) {
        const s = headSpan(y);
        fillBox(g, s[0], y, s[0] + 3, y, 0);
        fillBox(g, s[1] - 3, y, s[1], y, 0);
      }
      for (let y = 24; y <= 36; y++) {
        const t = y >= 31 ? 2 : 0;
        fillBox(g, 11 + t, y, 19, y, 0);
        fillBox(g, 29, y, 37 - t, y, 0);
      }
      fillIn(g, 16, 3, 21, 6, 1);
      break;
    }
    default:
      break;
  }
}

function drawFace(g) {
  fillIn(g, 18, 11, 21, 11, 0);
  fillIn(g, 27, 11, 30, 11, 0);
  fillIn(g, 19, 13, 20, 14, 0);
  fillIn(g, 28, 13, 29, 14, 0);
  setIn(g, 25, 14, 2);
  setIn(g, 25, 15, 2);
  fillIn(g, 24, 16, 26, 16, 2);
  setIn(g, 21, 19, 0);
  setIn(g, 27, 19, 0);
  fillIn(g, 22, 20, 26, 20, 0);
}

function drawEyewear(g, kind) {
  if (kind === 'glasses') {
    const frame = (x0, x1) => {
      fillIn(g, x0, 12, x1, 12, 0);
      fillIn(g, x0, 15, x1, 15, 0);
      fillIn(g, x0, 12, x0, 15, 0);
      fillIn(g, x1, 12, x1, 15, 0);
    };
    frame(17, 22);
    frame(26, 31);
    fillIn(g, 23, 13, 25, 13, 0);
    fillIn(g, 14, 13, 16, 13, 0);
    fillIn(g, 32, 13, 34, 13, 0);
  } else if (kind === 'monocle') {
    fillIn(g, 26, 12, 32, 12, 0);
    fillIn(g, 26, 16, 32, 16, 0);
    fillIn(g, 26, 13, 26, 15, 0);
    fillIn(g, 32, 13, 32, 15, 0);
    for (const [x, y] of [[33, 17], [33, 18], [32, 19], [32, 20], [31, 21]]) {
      setIn(g, x, y, 0);
    }
  }
}

function drawFacial(g, kind) {
  if (kind === 'mustache') {
    fillIn(g, 20, 17, 28, 18, 0);
  } else if (kind === 'beard') {
    fillIn(g, 18, 17, 30, 18, 0);
    for (let y = 18; y <= 21; y++) {
      const s = headSpan(y);
      fillIn(g, s[0], y, s[0] + 3, y, 0);
      fillIn(g, s[1] - 3, y, s[1], y, 0);
    }
    for (let y = 22; y <= CHIN; y++) {
      const s = headSpan(y);
      fillIn(g, s[0], y, s[1], y, 0);
    }
  } else if (kind === 'stubble') {
    for (let y = 20; y <= CHIN; y++) {
      const s = headSpan(y);
      for (let x = s[0]; x <= s[1]; x++) {
        if (x >= 20 && x <= 28) continue;
        if ((x + y) % 2 === 0) setIn(g, x, y, 0);
      }
    }
  }
}

function drawTie(g, kind) {
  if (kind === 'long') {
    fillIn(g, 22, 27, 26, 28, 0);
    fillIn(g, 23, 29, 25, SHIRT_BOTTOM, 0);
  } else if (kind === 'bow') {
    fillIn(g, 20, 27, 21, 27, 0);
    fillIn(g, 27, 27, 28, 27, 0);
    fillIn(g, 19, 28, 22, 29, 0);
    fillIn(g, 26, 28, 29, 29, 0);
    fillIn(g, 19, 29, 21, 29, 0);
    fillIn(g, 27, 29, 29, 29, 0);
    fillIn(g, 23, 27, 25, 29, 3);
  } else if (kind === 'bolo') {
    fillIn(g, 23, 27, 25, 29, 0);
    for (let i = 0; i < 5; i++) {
      setIn(g, 22 - i, 30 + i, 0);
      setIn(g, 26 + i, 30 + i, 0);
    }
    fillIn(g, 19, 34, 21, 36, 3);
    fillIn(g, 27, 34, 29, 36, 3);
  } else if (kind === 'pearls') {
    for (let x = 21; x <= 27; x += 2) setIn(g, x, 27, 3);
    setIn(g, 24, 28, 3);
    fillIn(g, 23, 29, 25, 29, 3);
  }
}

function buildBust(cfg) {
  const g = blank();

  drawTorso(g, cfg.build);
  fillBox(g, 21, 22, 27, COLLAR_Y - 1, 3);
  fillBox(g, 20, COLLAR_Y, 28, COLLAR_Y, 0);

  for (let y = HEAD_TOP; y <= CHIN; y++) {
    const [lo, hi] = headSpan(y);
    fillBox(g, lo, y, hi, y, 3);
  }
  for (let y = HEAD_TOP; y <= CHIN; y++) {
    const [lo, hi] = headSpan(y);
    const w = hi - lo + 1;
    if (w < 6) continue;
    const shade = Math.max(1, Math.floor(w / 4));
    for (let x = hi - shade + 1; x <= hi; x++) setPx(g, x, y, 2);
  }

  drawHead(g, cfg.head);
  fillHoles(g);
  drawFace(g);
  drawEyewear(g, cfg.face);
  drawFacial(g, cfg.face);
  drawTie(g, cfg.tie);
  outline(g);

  return g.map((row) => row.join(''));
}

const CACHE = new Map();

export function artRows(id) {
  if (!CACHE.has(id)) {
    const cfg = CONFIGS[id] ?? CONFIGS.videopoker;
    CACHE.set(id, buildBust(cfg));
  }
  return CACHE.get(id);
}

export function artRamp(id) {
  return DEALER_RAMPS[id] ?? TRAINER_RAMPS[id] ?? TRAINER_RAMPS.scholar;
}

export function drawArt(canvas, id) {
  const rows = artRows(id);
  const ramp = artRamp(id);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = rows[y][x];
      if (ch === '.') continue;
      const hex = ramp[Number(ch)];
      const i = (y * W + x) * 4;
      img.data[i] = parseInt(hex.slice(1, 3), 16);
      img.data[i + 1] = parseInt(hex.slice(3, 5), 16);
      img.data[i + 2] = parseInt(hex.slice(5, 7), 16);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}
