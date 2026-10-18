// Modern flat character art: one PNG per character, loaded lazily and cached.
// Each portrait is a 512x512 transparent PNG; drawArt scales it into the
// 96x96 battle frame the way the old atlas did, so callers are unchanged.
const TRAINER_FILES = {
  scholar: 'assets/trainer-scholar.png',
  dealer: 'assets/trainer-dealer.png',
  countess: 'assets/trainer-countess.png',
  grinder: 'assets/trainer-grinder.png',
};
const MASTER_FILES = {
  videopoker: 'assets/master-royale.png',
  blackjack: 'assets/master-baron.png',
  baccarat: 'assets/master-oracle.png',
  holdem: 'assets/master-sage.png',
};

const cache = new Map();
function loadImage(src) {
  if (cache.has(src)) return cache.get(src);
  const img = new Image();
  img.src = new URL(src, import.meta.url).href;
  const promise = new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
  });
  cache.set(src, promise);
  return promise;
}

export function drawArt(canvas, id) {
  if (!canvas) return;
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, size, size);
  const src = TRAINER_FILES[id] ?? MASTER_FILES[id] ?? TRAINER_FILES.grinder;
  loadImage(src).then((img) => {
    const scale = Math.min(240 / img.naturalWidth, 250 / img.naturalHeight);
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    ctx.drawImage(img, Math.floor((size - w) / 2), size - h, w, h);
  }).catch(() => { /* keep the frame blank on failure */ });
}

export function drawTrainerBack(canvas, id) {
  // Back views are no longer shipped; reuse the front portrait.
  drawArt(canvas, id);
}