import { CLASS_BY_ID, startingStats } from './classes.js';
import { GYMS, GYM_BY_ID, gymForClass, isUnlocked } from './gyms.js';

export const SAVE_VERSION = 1;

export function xpForLevel(level) {
  return Math.round(40 * level ** 1.45);
}

export function levelFromXp(totalXp) {
  let level = 1;
  let spent = 0;
  while (totalXp - spent >= xpForLevel(level) && level < 99) {
    spent += xpForLevel(level);
    level++;
  }
  return { level, into: totalXp - spent, needed: xpForLevel(level) };
}

export function correctXp(state, difficulty = 1) {
  const cls = CLASS_BY_ID[state.classId];
  const base = 10 * difficulty;
  return Math.round(base * (cls?.growth?.focus ?? 1) * 1.4);
}

export function createProfile(classId) {
  if (!CLASS_BY_ID[classId]) throw new Error(`unknown trainer class: ${classId}`);
  return {
    version: SAVE_VERSION,
    name: 'RED',
    classId,
    xp: 0,
    chips: 500,
    badges: [],
    stats: startingStats(classId),
    gym: gymForClass(classId)?.id ?? GYMS[0].id,
    handsPlayed: 0,
    handsOptimal: 0,
    lessonsDone: [],
    createdAt: null,
  };
}

export function applyResult(state, { optimal, difficulty = 1, payout = 0 }) {
  const next = { ...state, stats: { ...state.stats } };
  next.handsPlayed++;
  if (!optimal) {
    next.chips = Math.max(0, next.chips - Math.min(next.chips, 25));
    return { profile: next, gained: 0, leveled: false };
  }
  next.handsOptimal++;
  const gained = correctXp(next, difficulty);
  next.xp += gained;
  next.chips = next.chips + 50 + payout;

  const before = levelFromXp(next.xp - gained).level;
  const after = levelFromXp(next.xp).level;
  if (after > before) {
    for (const key of Object.keys(next.stats)) next.stats[key]++;
  }
  return { profile: next, gained, leveled: after > before, level: after };
}

export function awardBadge(state, gymId) {
  const gym = GYM_BY_ID[gymId];
  if (!gym) throw new Error(`unknown gym: ${gymId}`);
  if (state.badges.includes(gymId)) return { profile: state, alreadyHad: true };
  const next = { ...state, badges: [...state.badges, gymId], chips: state.chips + 250 };
  const upcoming = GYMS.find((g) => !next.badges.includes(g.id));
  if (upcoming) next.gym = upcoming.id;
  return { profile: next, badge: gym, alreadyHad: false };
}

export function canBattle(state, gymId) {
  return Boolean(state) && !state.badges.includes(gymId) && isUnlocked(gymId, state.badges);
}

export function handDifficulty(result) {
  const category = result?.category ?? 0;
  return 1 + category * 0.35;
}

export function serialize(profile) {
  return JSON.stringify(profile);
}

export function deserialize(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== SAVE_VERSION) return null;
    if (!CLASS_BY_ID[parsed.classId]) return null;
    return parsed;
  } catch {
    return null;
  }
}