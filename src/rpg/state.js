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

export function applyResult(state, { optimal, difficulty = 1, payout = 0, game = null }) {
  const next = { ...state, stats: { ...state.stats } };
  if (GYMS.some(g => g.game === game)) {
    const previous = state.practice?.[game] ?? { played: 0, optimal: 0 };
    next.practice = { ...state.practice, [game]: {
      played: previous.played + 1,
      optimal: previous.optimal + (optimal ? 1 : 0),
    } };
  }
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

export function practiceSummary(profile) {
  return GYMS.map(gym => {
    const counts = profile?.practice?.[gym.game];
    const played = counts?.played ?? 0;
    const optimal = counts?.optimal ?? 0;
    return { game: gym.game, name: gym.name, played, optimal,
      accuracy: played ? Math.round(optimal / played * 100) : null };
  });
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

export function canPractice(state, gymId) {
  return Boolean(state) && Boolean(GYM_BY_ID[gymId]) && state.badges.includes(gymId);
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

// Keep review local and bounded; old saves acquire a notebook on their first mistake.
export function recordMistake(profile, { game, situation, chosen, correction, quiz }) {
  if (!GYMS.some(g => g.game === game)) return profile;
  if (![situation, chosen, correction].every(value => typeof value === 'string' && value.trim())) return profile;
  const entry = { game, situation: situation.slice(0, 600), chosen: chosen.slice(0, 600), correction: correction.slice(0, 1200) };
  if (validMistakeQuiz(quiz, game)) entry.quiz = { choices: [...quiz.choices], optimal: [...quiz.optimal] };
  return { ...profile, mistakes: [entry, ...(profile.mistakes ?? [])].slice(0, 20) };
}

// Self-reported recall is separate from scored gameplay accuracy and rewards.
export function markMistakeReviewed(profile, index) {
  if (!Number.isInteger(index) || !profile.mistakes?.[index]) return profile;
  return { ...profile, mistakes: profile.mistakes.map((entry, i) =>
    i === index ? { ...entry, reviews: (entry.reviews ?? 0) + 1 } : entry) };
}

// Short sessions reuse real gameplay scoring. History is local, not customer analytics.
export const SESSION_HANDS = 5;
export function canTrain(profile, gymId) {
  return Boolean(profile) && Boolean(GYM_BY_ID[gymId]);
}
export function beginSession(profile, gymId, now = new Date().toISOString()) {
  if (!canTrain(profile, gymId)) return profile;
  if (profile.activeSession) return profile;
  return { ...profile, activeSession: { gymId, played: 0, optimal: 0, startedAt: now } };
}
export function scoreSession(profile, optimal, now = new Date().toISOString()) {
  if (!profile.activeSession) return profile;
  const session = { ...profile.activeSession,
    played: profile.activeSession.played + 1,
    optimal: profile.activeSession.optimal + (optimal ? 1 : 0) };
  if (session.played < SESSION_HANDS) return { ...profile, activeSession: session };
  return { ...profile, activeSession: null,
    sessions: [{ ...session, completedAt: now }, ...(profile.sessions ?? [])].slice(0, 30) };
}

// Answer keys are captured from the original coach decision, never inferred from text.
export function validMistakeQuiz(quiz, game = "blackjack") {
  const actions = ['hit', 'stand', 'double', 'split'];
  const validChoice = a => game === 'blackjack' ? actions.includes(a) :
    game === 'baccarat' && typeof a === 'string' && a.trim().length > 0 && a.length <= 80;
  return Boolean(quiz && Array.isArray(quiz.choices) && quiz.choices.length >= 2 &&
    quiz.choices.length <= 4 && new Set(quiz.choices).size === quiz.choices.length &&
    quiz.choices.every(validChoice) && Array.isArray(quiz.optimal) &&
    quiz.optimal.length > 0 && quiz.optimal.length <= quiz.choices.length &&
    new Set(quiz.optimal).size === quiz.optimal.length && quiz.optimal.every(a => quiz.choices.includes(a)));
}
export function answerMistakeQuiz(profile, index, action) {
  if (!Number.isInteger(index)) return profile;
  const entry = profile.mistakes?.[index];
  if (!entry || !validMistakeQuiz(entry.quiz, entry.game) || !entry.quiz.choices.includes(action)) return profile;
  const previous = entry.retries ?? { attempted: 0, correct: 0 };
  return { ...profile, mistakes: profile.mistakes.map((m, i) => i === index ? {
    ...m, retries: { attempted: previous.attempted + 1,
      correct: previous.correct + (entry.quiz.optimal.includes(action) ? 1 : 0) },
  } : m) };
}
