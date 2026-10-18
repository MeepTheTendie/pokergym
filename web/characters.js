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
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 96, 96);
  const src = TRAINER_FILES[id] ?? MASTER_FILES[id] ?? TRAINER_FILES.grinder;
  loadImage(src).then((img) => {
    const scale = Math.min(88 / img.naturalWidth, 90 / img.naturalHeight);
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    ctx.drawImage(img, Math.floor((96 - w) / 2), 94 - h, w, h);
  }).catch(() => { /* keep the frame blank on failure */ });
}

export function drawTrainerBack(canvas, id) {
  // Back views are no longer shipped; reuse the front portrait.
  drawArt(canvas, id);
}