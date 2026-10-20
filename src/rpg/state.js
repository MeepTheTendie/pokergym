import { CLASS_BY_ID, startingStats } from './classes.js';
import { GYMS, GYM_BY_ID, gymForClass, isUnlocked } from './gyms.js';
import { dayGap, dailyPlan, validDailyGames, validDailyPlan, DAILY_HANDS } from './daily.js';

import { validDrillPlan } from './drills.js';

export const SAVE_VERSION = 2;

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
    name: 'PLAYER',
    classId,
    xp: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    badges: [],
    stats: startingStats(classId),
    gym: gymForClass(classId)?.id ?? GYMS[0].id,
    handsPlayed: 0,
    handsOptimal: 0,
    lessonsDone: [],
    createdAt: null,
    daily: { lastKey: null, streak: 0, best: 0, restKey: null, history: [], progress: null },
  };
}

/* ---------------- daily drill ----------------
 * A day-streak record kept entirely on the device. completeDaily is the only
 * writer: it folds one finished drill into the streak, allowing a single missed
 * day to be forgiven as a rest day at most once per seven days. There are no
 * guilt messages here or in the UI; a broken streak just starts again at one.
 */
export const DAILY_HISTORY_CAP = 60;
export const REST_COOLDOWN_DAYS = 7;

export function defaultDaily() {
  return { lastKey: null, streak: 0, best: 0, restKey: null, history: [], progress: null };
}

export function dailyOf(profile) {
  const d = profile?.daily;
  if (!d || typeof d !== 'object') return defaultDaily();
  return {
    lastKey: typeof d.lastKey === 'string' ? d.lastKey : null,
    streak: Number.isSafeInteger(d.streak) && d.streak > 0 ? d.streak : 0,
    best: Number.isSafeInteger(d.best) && d.best > 0 ? d.best : 0,
    restKey: typeof d.restKey === 'string' ? d.restKey : null,
    history: Array.isArray(d.history) ? d.history : [],
    progress: sanitizeDailyProgress(d.progress),
  };
}

// A locally saved day-in-progress must not survive as a shape the resumer or the
// external backup validator would reject; keep the parts that are valid.
function sanitizeDailyProgress(progress) {
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return null;
  if (!validDayKey(progress.key)) return null;
  if (!Number.isSafeInteger(progress.index) || progress.index < 0 || progress.index >= DAILY_HANDS) return null;
  if (!Array.isArray(progress.results) || progress.results.length !== progress.index) return null;
  const out = { key: progress.key, index: progress.index, results: progress.results.map(Boolean) };
  if (progress.plan !== undefined && validDailyPlan(progress.plan)) {
    out.plan = progress.plan.map(hand => ({ game: hand.game, seed: hand.seed }));
  }
  return out;
}

export function dailyResults(results) {
  const out = Array.isArray(results) ? results.slice(0, DAILY_HANDS).map(Boolean) : [];
  while (out.length < DAILY_HANDS) out.push(false);
  return out;
}

export function dailyCompleted(profile, key) {
  const daily = dailyOf(profile);
  return daily.lastKey === key || daily.history.some(entry => entry?.key === key);
}

export function setDailyProgress(profile, progress) {
  if (!profile) return profile;
  const captured = progress == null ? null : {
    ...progress,
    results: Array.isArray(progress.results) ? [...progress.results] : progress.results,
    ...(Array.isArray(progress.plan) ? { plan: progress.plan.map(hand => ({ ...hand })) } : {}),
  };
  return { ...profile, daily: { ...dailyOf(profile), progress: captured } };
}

export function completeDaily(profile, key, results, games = dailyPlan(key).map(hand => hand.game)) {
  if (!profile) return profile;
  if (!validDailyGames(games)) return profile;
  if (!validDayKey(key)) return profile;
  const daily = dailyOf(profile);
  const scored = dailyResults(results);

  // Today is already done: keep the streak and the history, just retire any
  // practice run that was attached to the same day.
  if (daily.lastKey === key) {
    return { ...profile, daily: { ...daily, progress: null } };
  }

  const gap = daily.lastKey ? dayGap(key, daily.lastKey) : null;
  // A past or out-of-order day must never regress the streak or rewrite history.
  if (gap !== null && gap <= 0) return profile;
  let streak;
  let restKey = daily.restKey;
  if (gap === null) {
    streak = 1;
  } else if (gap === 1) {
    streak = daily.streak + 1;
  } else if (gap === 2 && restAvailable(daily, key)) {
    streak = daily.streak + 1;
    restKey = key;
  } else {
    streak = 1;
  }

  const history = [{ key, results: scored, games: [...games] }, ...daily.history].slice(0, DAILY_HISTORY_CAP);
  return { ...profile, daily: {
    lastKey: key,
    streak,
    best: Math.max(daily.best, streak),
    restKey,
    history,
    progress: null,
  } };
}

function restAvailable(daily, key) {
  if (!daily.restKey) return true;
  return dayGap(key, daily.restKey) >= REST_COOLDOWN_DAYS;
}

// A correct decision is the only thing that scores. A wrong decision resets the
// combo streak but never takes score away. Score rewards the decision, not the
// luck of the cards, so a losing hand played correctly still scores in full.
// A "coached" hand asked the coach before deciding, so it earns no score and no
// streak in either direction; the player still gets XP for reading the answer.
export function applyResult(state, { optimal, difficulty = 1, game = null, coached = false }) {
  const next = { ...state, stats: { ...state.stats } };
  if (GYMS.some(g => g.game === game)) {
    const previous = state.practice?.[game] ?? { played: 0, optimal: 0 };
    const counts = {
      played: previous.played + 1,
      optimal: previous.optimal + (optimal ? 1 : 0),
    };
    if (!coached) {
      const recent = Array.isArray(previous.recent) ? previous.recent.slice(-19) : [];
      recent.push(optimal);
      counts.recent = recent;
    } else if (Array.isArray(previous.recent)) {
      counts.recent = previous.recent;
    }
    next.practice = { ...state.practice, [game]: counts };
  }
  next.handsPlayed++;
  if (coached) {
    // Learning counts; the decision does not — nobody can farm streak or score
    // by copying the coach's answer. A coached miss leaves the streak alone.
    if (!optimal) {
      return { profile: next, gained: 0, points: 0, leveled: false };
    }
    next.handsOptimal++;
    const gained = correctXp(next, difficulty);
    next.xp += gained;
    const before = levelFromXp(next.xp - gained).level;
    const after = levelFromXp(next.xp).level;
    const levels = after - before;
    if (levels > 0) for (const key of Object.keys(next.stats)) next.stats[key] += levels;
    return { profile: next, gained, points: 0, leveled: levels > 0, level: after };
  }
  if (!optimal) {
    next.streak = 0;
    return { profile: next, gained: 0, points: 0, leveled: false };
  }
  next.handsOptimal++;
  const gained = correctXp(next, difficulty);
  next.xp += gained;

  const streak = Number.isSafeInteger(next.streak) && next.streak > 0 ? next.streak : 0;
  const comboMultiplier = 1 + Math.min(streak, 9) * 0.1;
  const points = Math.round(10 * difficulty * comboMultiplier);
  next.score = (Number.isSafeInteger(next.score) ? next.score : 0) + points;
  next.streak = streak + 1;
  next.bestStreak = Math.max(Number.isSafeInteger(next.bestStreak) ? next.bestStreak : 0, next.streak);

  const before = levelFromXp(next.xp - gained).level;
  const after = levelFromXp(next.xp).level;
  const levels = after - before;
  if (levels > 0) for (const key of Object.keys(next.stats)) next.stats[key] += levels;
  return { profile: next, gained, points, leveled: levels > 0, level: after };
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

// Mastery is earned and rolling: it is the accuracy of the last twenty hands a
// player decided WITHOUT the coach, so copying answers can never rank you up.
// A game needs a ten-hand uncoached sample before any rank is handed out.
export const MASTERY_FLOOR = 10;
export const MASTERY_TIERS = [
  { rank: 'bronze', threshold: 0.7 },
  { rank: 'silver', threshold: 0.8 },
  { rank: 'gold', threshold: 0.9 },
];
export const MASTERY_LABEL = { bronze: 'BRONZE', silver: 'SILVER', gold: 'GOLD' };

export function masteryRank(profile, game) {
  const recent = profile?.practice?.[game]?.recent;
  if (!Array.isArray(recent) || recent.length < MASTERY_FLOOR) return null;
  const rate = recent.filter(Boolean).length / recent.length;
  // Highest tier earned wins, so scan from the top down.
  return MASTERY_TIERS.filter(tier => rate >= tier.threshold).at(-1)?.rank ?? null;
}

export function masteryUnlocked(profile, game) {
  return Boolean(masteryRank(profile, game));
}

// Suggest only from a completed session's worth of tracked decisions. This is
// a practice priority, not a claim of skill or a prediction of gambling results.
export function recommendedPractice(profile) {
  if (!profile || profile.activeSession) return null;
  const candidates = practiceSummary(profile).filter(row => row.played >= SESSION_HANDS && row.optimal < row.played);
  candidates.sort((a, b) => a.optimal / a.played - b.optimal / b.played || a.played - b.played);
  const row = candidates[0];
  return row ? { ...row, gymId: GYMS.find(gym => gym.game === row.game).id } : null;
}

export function awardBadge(state, gymId) {
  const gym = GYM_BY_ID[gymId];
  if (!gym) throw new Error(`unknown gym: ${gymId}`);
  if (state.badges.includes(gymId)) return { profile: state, alreadyHad: true };
  const next = { ...state, badges: [...state.badges, gymId],
    score: (Number.isSafeInteger(state.score) ? state.score : 0) + 250 };
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

// Version 1 rewarded chips. Migrate those saves instead of rejecting them:
// keep everything the player earned and translate the old chip balance into a
// one-time starting score so no progress is wiped.
export function deserialize(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!CLASS_BY_ID[parsed?.classId]) return null;
    if (parsed.version === 1) {
      const rest = { ...parsed };
      delete rest.chips;
      return migrateMistakeBoxes({ ...rest, version: SAVE_VERSION,
        score: (Number.isSafeInteger(parsed.handsOptimal) ? parsed.handsOptimal : 0) * 10,
        streak: 0, bestStreak: 0 });
    }
    if (parsed.version !== SAVE_VERSION) return null;
    return migrateMistakeBoxes(parsed);
  } catch {
    return null;
  }
}

// Saves written before spaced repetition stored no box/due on a notebook entry.
// Give those entries box 1 due today so they surface exactly once, then reschedule.
export function migrateMistakeBoxes(profile, today = localDayKey()) {
  if (!Array.isArray(profile?.mistakes)) return profile;
  let changed = false;
  const mistakes = profile.mistakes.map(entry => {
    if (!entry || typeof entry !== 'object') return entry;
    const needsBox = entry.box === undefined;
    const needsDue = entry.due === undefined;
    const needsMastered = entry.mastered === undefined;
    if (!needsBox && !needsDue && !needsMastered) return entry;
    changed = true;
    const mastered = needsMastered ? false : entry.mastered;
    return { ...entry, box: needsBox ? 1 : entry.box,
      due: needsDue ? (mastered ? null : today) : entry.due, mastered };
  });
  return changed ? { ...profile, mistakes } : profile;
}

// Local saves live only in this browser and may predate newer fields. Rather
// than reject them (which would silently wipe progress) or trust them (which
// lets one corrupt entry crash a render), normalize the shape: keep what is
// valid, drop what is not, and always return a usable profile.
const isCount = n => Number.isSafeInteger(n) && n >= 0;
const clampCount = (n, fallback = 0) => (isCount(n) ? n : fallback);
const asList = xs => (Array.isArray(xs) ? xs : []);

function sanitizeSession(s) {
  if (!s || typeof s !== 'object' || !GYM_BY_ID[s.gymId]) return null;
  const played = clampCount(s.played);
  if (played > SESSION_HANDS) return null;
  const out = { gymId: s.gymId, played, optimal: Math.min(clampCount(s.optimal), played),
    startedAt: typeof s.startedAt === 'string' && s.startedAt.length <= 100 ? s.startedAt : new Date().toISOString() };
  if (validDrillPlan(s.drill, GYM_BY_ID[s.gymId].game)) out.drill = { mode: s.drill.mode, indices: [...s.drill.indices] };
  if (typeof s.completedAt === 'string' && s.completedAt.length <= 100) out.completedAt = s.completedAt;
  return out;
}

function sanitizeMistake(m) {
  if (!m || typeof m !== 'object' || !GYMS.some(g => g.game === m.game)) return null;
  const situation = typeof m.situation === 'string' ? m.situation.slice(0, 600) : '';
  const chosen = typeof m.chosen === 'string' ? m.chosen.slice(0, 600) : '';
  const correction = typeof m.correction === 'string' ? m.correction.slice(0, 1200) : '';
  if (!situation.trim() || !chosen.trim() || !correction.trim()) return null;
  const mastered = m.mastered === true;
  const entry = { game: m.game, situation, chosen, correction,
    box: validMistakeBox(m.box) ? m.box : 1, mastered };
  entry.due = mastered ? null : (validMistakeDue(m.due) ? m.due : localDayKey());
  if (isCount(m.reviews)) entry.reviews = m.reviews;
  if (validMistakeType(m.type)) entry.type = m.type;
  if (validMistakeQuiz(m.quiz, m.game)) entry.quiz = { choices: [...m.quiz.choices], optimal: [...m.quiz.optimal] };
  if (entry.quiz && m.retries && isCount(m.retries.attempted) && isCount(m.retries.correct) &&
      m.retries.correct <= m.retries.attempted) {
    entry.retries = { attempted: m.retries.attempted, correct: m.retries.correct };
  }
  return entry;
}

export function sanitizeProfile(profile) {
  if (!profile || typeof profile !== 'object' || !CLASS_BY_ID[profile.classId]) return null;
  const classId = profile.classId;
  const stats = startingStats(classId);
  for (const key of Object.keys(stats)) stats[key] = clampCount(profile.stats?.[key], stats[key]);
  const practice = {};
  if (profile.practice && typeof profile.practice === 'object' && !Array.isArray(profile.practice)) {
    for (const [id, counts] of Object.entries(profile.practice)) {
      if (!GYMS.some(g => g.game === id)) continue;
      const played = clampCount(counts?.played);
      const entry = { played, optimal: Math.min(clampCount(counts?.optimal), played) };
      if (Array.isArray(counts?.recent)) {
        entry.recent = counts.recent.map(Boolean).slice(-20);
      }
      practice[id] = entry;
    }
  }
  const mistakes = asList(profile.mistakes).map(sanitizeMistake).filter(Boolean).slice(0, MISTAKE_CAP);
  const sessions = asList(profile.sessions).map(sanitizeSession).filter(s => s && s.completedAt).slice(0, 30);
  const active = sanitizeSession(profile.activeSession);
  const handsPlayed = clampCount(profile.handsPlayed);
  return { ...profile,
    version: SAVE_VERSION,
    classId,
    name: typeof profile.name === 'string' && profile.name.length <= 100 ? profile.name : 'PLAYER',
    gym: GYM_BY_ID[profile.gym] ? profile.gym : (gymForClass(classId)?.id ?? GYMS[0].id),
    xp: clampCount(profile.xp),
    score: clampCount(profile.score),
    streak: clampCount(profile.streak),
    bestStreak: Math.max(clampCount(profile.bestStreak), clampCount(profile.streak)),
    handsPlayed,
    handsOptimal: Math.min(clampCount(profile.handsOptimal), handsPlayed),
    stats,
    badges: [...new Set(asList(profile.badges).filter(id => GYM_BY_ID[id]))],
    lessonsDone: [...new Set(asList(profile.lessonsDone).filter(id => GYMS.some(g => g.game === id)))],
    practice,
    mistakes,
    sessions,
    activeSession: active && active.played < SESSION_HANDS ? active : null,
    daily: dailyOf(profile),
  };
}

// Keep review local and bounded; old saves acquire a notebook on their first mistake.
export const MISTAKE_CAP = 20;
export function recordMistake(profile, { game, situation, chosen, correction, quiz, type, today = localDayKey() }) {
  if (!GYMS.some(g => g.game === game)) return profile;
  if (![situation, chosen, correction].every(value => typeof value === 'string' && value.trim())) return profile;
  const entry = { game, situation: situation.slice(0, 600), chosen: chosen.slice(0, 600),
    correction: correction.slice(0, 1200), box: 1, due: today, mastered: false };
  if (validMistakeQuiz(quiz, game)) entry.quiz = { choices: [...quiz.choices], optimal: [...quiz.optimal] };
  if (validMistakeType(type)) entry.type = type;
  return { ...profile, mistakes: [entry, ...(profile.mistakes ?? [])].slice(0, MISTAKE_CAP) };
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
    game === 'videopoker' ? typeof a === 'string' && /^[01]{5}$/.test(a) :
    game === 'holdem' ? typeof a === 'string' && /^[01]{7}$/.test(a) && [...a].filter(bit => bit === '1').length === 5 :
    game === 'baccarat' && typeof a === 'string' && a.trim().length > 0 && a.length <= 80;
  return Boolean(quiz && Array.isArray(quiz.choices) && quiz.choices.length >= 2 &&
    quiz.choices.length <= (game === 'videopoker' ? 32 : game === 'holdem' ? 21 : 4) &&
    (game !== 'videopoker' || quiz.choices.length === 32) &&
    (game !== 'holdem' || quiz.choices.length === 21) && new Set(quiz.choices).size === quiz.choices.length &&
    quiz.choices.every(validChoice) && Array.isArray(quiz.optimal) &&
    quiz.optimal.length > 0 && quiz.optimal.length <= quiz.choices.length &&
    new Set(quiz.optimal).size === quiz.optimal.length && quiz.optimal.every(a => quiz.choices.includes(a)));
}
// Spaced repetition for the mistake notebook: a miss is due today, then 2, 4, 8
// and 16 days out after successive correct retries. A wrong retry resets to box 1.
export const REVIEW_INTERVALS = [1, 2, 4, 8, 16];
export const REVIEW_SCORE_BONUS = 5;
export function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
export function addDays(dayKey, days) {
  const [year, month, day] = String(dayKey).split('-').map(Number);
  return localDayKey(new Date(year, month - 1, day + days));
}
export function validDayKey(key) {
  return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key);
}
export function validMistakeBox(box) {
  return Number.isInteger(box) && box >= 1 && box <= REVIEW_INTERVALS.length;
}
export const MISTAKE_TYPES = ['soft', 'pair', 'hard'];
export function validMistakeType(type) {
  return MISTAKE_TYPES.includes(type);
}
export function validMistakeDue(due) {
  return due === null || validDayKey(due);
}
export function mistakeDue(entry, today = localDayKey()) {
  if (!entry || entry.mastered) return false;
  if (!validMistakeQuiz(entry.quiz, entry.game)) return false;
  return !validDayKey(entry.due) || entry.due <= today;
}
// Original indices remain stable even when due reviews are displayed first.
export function mistakeReviewQueue(profile, today = localDayKey()) {
  return (profile.mistakes ?? []).map((entry, index) => {
    const scored = validMistakeQuiz(entry.quiz, entry.game);
    return { index, entry, scored, mastered: Boolean(entry.mastered), due: mistakeDue(entry, today) };
  }).sort((a, b) => Number(b.due) - Number(a.due) || Number(a.mastered) - Number(b.mastered) ||
    Number(b.scored) - Number(a.scored) || a.index - b.index);
}
export function answerMistakeQuiz(profile, index, action, today = localDayKey()) {
  if (!Number.isInteger(index)) return profile;
  const entry = profile.mistakes?.[index];
  if (!entry || !validMistakeQuiz(entry.quiz, entry.game)) return profile;
  if (entry.mastered) return profile;
  if (!entry.quiz.choices.includes(action) || !validDayKey(today)) return profile;
  const previous = entry.retries ?? { attempted: 0, correct: 0 };
  const correct = entry.quiz.optimal.includes(action);
  const box = validMistakeBox(entry.box) ? entry.box : 1;
  let update;
  if (!correct) {
    update = { box: 1, due: addDays(today, 1), mastered: false, bonus: 0 };
  } else if (box >= REVIEW_INTERVALS.length) {
    update = { box: REVIEW_INTERVALS.length, due: null, mastered: true, bonus: REVIEW_SCORE_BONUS };
  } else {
    update = { box: box + 1, due: addDays(today, REVIEW_INTERVALS[box]), mastered: false, bonus: REVIEW_SCORE_BONUS };
  }
  const { bonus, ...fields } = update;
  const score = (Number.isSafeInteger(profile.score) ? profile.score : 0) + bonus;
  return { ...profile, score, mistakes: profile.mistakes.map((m, i) => i === index ? {
    ...m, ...fields, retries: { attempted: previous.attempted + 1,
      correct: previous.correct + (correct ? 1 : 0) },
  } : m) };
}
