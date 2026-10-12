import { seededRng as mulberry32 } from '../cards.js';

// One shared drill per calendar day: five hands, same seed string for everyone
// who opens the game on the same local date. Nothing here talks to a server.

export const DAILY_HANDS = 5;
export const DAILY_GAMES = ['videopoker', 'blackjack', 'baccarat', 'holdem'];
export const DAILY_LAUNCH_KEY = '2026-01-01';

const DAY_MS = 86400000;

// 'YYYY-MM-DD' in the player's own time zone, so the drill flips at local midnight.
export function dailyKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function keyToDay(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function dayGap(aKey, bKey) {
  return keyToDay(aKey) - keyToDay(bKey);
}

// FNV-1a over the seed string, then mulberry32. Pure: same string, same stream.
export function hashSeed(seedString) {
  let h = 2166136261 >>> 0;
  const text = String(seedString);
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededRng(seedString) {
  return mulberry32(hashSeed(seedString));
}

// Day count since the fixed launch date, so the card can say "Daily #42".
export function dailyNumber(key) {
  return Math.max(1, keyToDay(key) - keyToDay(DAILY_LAUNCH_KEY) + 1);
}

// Five hand descriptors. A Fisher-Yates shuffle of all four games, then one
// game repeated and the whole list reshuffled, so every drill includes each of
// the four games at least once and the duplicate is not always in last place.
export function dailyPlan(key) {
  const rng = seededRng(`plan:${key}`);
  const games = DAILY_GAMES.slice();
  for (let i = games.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [games[i], games[j]] = [games[j], games[i]];
  }
  const repeat = Math.floor(rng() * DAILY_GAMES.length) % DAILY_GAMES.length;
  games.push(games[repeat]);
  for (let i = games.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [games[i], games[j]] = [games[j], games[i]];
  }
  return games.map((game, i) => ({ game, seed: `${key}#${i}` }));
}

export const DAILY_GAME_LABEL = {
  videopoker: 'video poker',
  blackjack: 'blackjack',
  baccarat: 'baccarat',
  holdem: "hold'em",
};
