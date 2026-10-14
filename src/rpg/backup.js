import { deserialize, serialize, validMistakeQuiz, validMistakeBox, validMistakeDue } from './state.js';
import { GYMS, GYM_BY_ID } from './gyms.js';
import { validDailyGames, validDailyPlan } from './daily.js';

import { validDrillPlan } from './drills.js';

const count = n => Number.isSafeInteger(n) && n >= 0;
const text = (s, max) => typeof s === 'string' && s.length <= max;
const game = id => GYMS.some(g => g.game === id);
const list = (xs, max, check) => Array.isArray(xs) && xs.length <= max && xs.every(check);
const session = s => s && GYM_BY_ID[s.gymId] && count(s.played) && s.played <= 5 && count(s.optimal) && s.optimal <= s.played && text(s.startedAt, 100) && (s.drill === undefined || validDrillPlan(s.drill, GYM_BY_ID[s.gymId].game));
const dayKey = k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
const dayResults = r => Array.isArray(r) && r.length === 5 && r.every(v => typeof v === 'boolean');
const daily = d => d && typeof d === 'object' && !Array.isArray(d) &&
  (d.lastKey == null || dayKey(d.lastKey)) &&
  count(d.streak) && count(d.best) && d.best >= d.streak &&
  (d.restKey == null || dayKey(d.restKey)) &&
  list(d.history, 60, e => e && typeof e === 'object' && dayKey(e.key) && dayResults(e.results) &&
    (e.games === undefined || validDailyGames(e.games))) &&
  (d.progress == null || (typeof d.progress === 'object' && !Array.isArray(d.progress) &&
    dayKey(d.progress.key) && count(d.progress.index) && d.progress.index <= 5 &&
    Array.isArray(d.progress.results) && d.progress.results.every(v => typeof v === 'boolean') &&
    d.progress.results.length === d.progress.index &&
    (d.progress.plan === undefined || validDailyPlan(d.progress.plan))));

// External backups require stronger validation than legacy local saves.
export function readBackup(raw) {
  if (typeof raw !== 'string' || raw.length > 100000) throw new Error('Invalid backup');
  const p = deserialize(raw);
  if (!p || !text(p.name, 100) || !GYM_BY_ID[p.gym] ||
      !['xp', 'score', 'streak', 'bestStreak', 'handsPlayed', 'handsOptimal'].every(k => count(p[k])) || p.handsOptimal > p.handsPlayed ||
      p.bestStreak < p.streak ||
      !['focus', 'nerve', 'read'].every(k => count(p.stats?.[k])) ||
      !list(p.badges, 4, id => Boolean(GYM_BY_ID[id])) ||
      !list(p.lessonsDone, 4, game) ||
      (p.practice != null && (typeof p.practice !== 'object' || Array.isArray(p.practice) || !Object.entries(p.practice).every(([id, s]) => game(id) && count(s?.played) && count(s?.optimal) && s.optimal <= s.played))) ||
      (p.mistakes != null && !list(p.mistakes, 20, m => m && game(m.game) && text(m.situation, 600) && text(m.chosen, 600) && text(m.correction, 1200) && (m.box == null || validMistakeBox(m.box)) && (m.due == null || validMistakeDue(m.due)) && (m.mastered == null || typeof m.mastered === 'boolean') && (m.reviews == null || count(m.reviews)) && (m.quiz == null || validMistakeQuiz(m.quiz, m.game)) && (m.retries == null || (m.quiz && count(m.retries.attempted) && count(m.retries.correct) && m.retries.correct <= m.retries.attempted)))) ||
      (p.activeSession != null && (!session(p.activeSession) || p.activeSession.played >= 5)) ||
      (p.daily != null && !daily(p.daily)) ||
      (p.sessions != null && !list(p.sessions, 30, s => session(s) && s.played === 5 && text(s.completedAt, 100)))) throw new Error('Invalid backup');
  return p;
}
export function writeBackup(profile) {
  const raw = serialize(profile);
  readBackup(raw);
  return raw;
}
