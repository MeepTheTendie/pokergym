import { readBackup, writeBackup } from '../src/rpg/backup.js';
import { feedbackDraft } from './feedback.js?v=no-pricing-1';
import { SUIT_GLYPH, SUIT_NAME, rankLabel, cardLabel } from '../src/cards.js';
import { CATEGORY_LABEL, evaluate5 } from '../src/evaluate.js';
import {
  newRound as newVpRound, toggleHold, setHolds, draw as drawRound,
  VARIANTS, variantById, DEFAULT_VARIANT, rowForWin,
} from '../src/games/videopoker.js';
import { bestHold } from '../src/coach/videopoker.js';
import {
  newRound as newBjRound, legalActions, sumHand, outcomeLabel,
  hit as bjHit, stand as bjStand, double as bjDouble, split as bjSplit,
} from '../src/games/blackjack.js';
import { bestAction as bjBest, ACTION_LABEL } from '../src/coach/blackjack.js';
import { bestBet as bacBest, quizFor, tieBreakEven } from '../src/coach/baccarat.js';
import { newRound as newHeRound } from '../src/games/holdem.js';
import { playsBestFive, bestFiveQuiz } from '../src/coach/holdem.js';
import { CLASSES, CLASS_BY_ID, STAT_LABEL } from '../src/rpg/classes.js';
import { GYMS, GYM_BY_ID, gymForClass } from '../src/rpg/gyms.js';
import { lessonFor, lessonIntro, lessonTips, hasCompletedLesson, markLessonDone } from '../src/rpg/lessons.js';
import {
  createProfile, applyResult, awardBadge, canBattle, canPractice, canTrain, levelFromXp,
  serialize, deserialize, sanitizeProfile, handDifficulty, practiceSummary, recommendedPractice, recordMistake, markMistakeReviewed, validMistakeQuiz, answerMistakeQuiz, mistakeReviewQueue, localDayKey, beginSession, scoreSession, SESSION_HANDS,
  masteryRank, MASTERY_LABEL,
  completeDaily, dailyOf, dailyCompleted, setDailyProgress,
} from '../src/rpg/state.js';
import {
  dailyKey, dailyPlan, dailyNumber, seededRng as dailySeedRng, DAILY_HANDS, dayGap,
  DAILY_GAME_LABEL, dailySummary, dailySession, formatDailyCountdown,
} from '../src/rpg/daily.js';
import { parseEntryParams, isSharedDayCurrent, cleanEntrySearch, buildDailyShareText, shareUrl, inviteUrl, newShareId } from '../src/rpg/links.js';
import { keyAction, shouldIgnoreKey } from '../src/rpg/keys.js';
import { createAnalytics } from '../src/rpg/analytics.js';
import { captureDrillPlan, restoreDrillPlan, BLACKJACK_DRILLS, DRILL_HANDS, DRILL_GAMES, findDrill, drillPlanStartingWith } from '../src/rpg/drills.js';
import { drawArt, drawTrainerBack } from './characters.js';
import audio from './audio.js?v=20261017-vegas1';
import haptics from './haptics.js';
import { pushSupported, currentSubscription, enablePush, disablePush } from './push.js';

const SAVE_KEY = 'pokergym:save:v1';
const HANDS_TO_WIN = 10;
const PASS_RATE = 0.7;
// START TRAINING is the primary path: it quietly becomes this trainer and drops
// the player straight into five hands of blackjack. CHOOSE STYLE stays one tap
// away for anyone who wants to pick a different class first.
const DEFAULT_CLASS = 'dealer';

const HAND_TITLE = {
  videopoker: 'Your hand',
  blackjack: 'The table',
  baccarat: 'The shoe',
  holdem: 'The table',
};
const TRAINING_LABEL = {
  videopoker: 'Jacks or Better', blackjack: 'Blackjack',
  baccarat: 'Baccarat', holdem: 'Hold’em hand reading',
};

const el = (id) => document.getElementById(id);
const fmt = (n) => Number(n).toLocaleString('en-US');
// Some authored drill labels are stored in caps. Display them as a sentence
// without changing the data other screens and tests key off.
const sentence = (text) => {
  const value = String(text ?? '').toLocaleLowerCase();
  return value ? value[0].toLocaleUpperCase() + value.slice(1) : value;
};
// JavaScript motion (typing, smooth scroll, floats) defers to the CSS
// prefers-reduced-motion rules so the setting is honoured by both layers.
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function storageWarning() {
  el('saveStatus').hidden = false;
  el('saveStatus').textContent = 'Progress is not saving. Browser storage is blocked or full. You can still practise in this tab. Prepare a backup below before closing or reloading; open the standalone game if embedded storage is blocked.';
}
let profile = null;
// Blocked storage (privacy modes, third-party iframes) throws on access; read as unset.
function storedFlag(key) { try { return localStorage.getItem(key); } catch { return null; } }
try { profile = sanitizeProfile(deserialize(localStorage.getItem(SAVE_KEY))); }
catch { storageWarning(); }
let pendingClass = null;
let becomeArmed = false; // BECOME asks for a second tap before replacing an existing save
let round = null;
let advice = null;
let gameId = 'videopoker';
let vpVariantId = DEFAULT_VARIANT.id; // pay table the video poker trainer grades against
const vpVariant = () => variantById(vpVariantId);
// The table the paytable panel shows: a hand already drawn keeps the table it was
// dealt under, so the highlighted row always matches the payout it actually paid.
const activePaytable = () =>
  (round && round.game === 'videopoker' ? variantById(round.variantId) : vpVariant());
let handDone = false;
let acted = false; // the player has made a decision this hand (reveals the coach meter)
let autoAdvanceTimer = null;

// Off-main-thread video-poker coach. Kicked off on deal; result lands on
// round.vpBest when ready. Falls back to a synchronous compute if the worker
// is unavailable or the player acts before it finishes.
let vpWorker = null;
function getVpWorker() {
  if (vpWorker) return vpWorker;
  try { vpWorker = new Worker(new URL('./vp-coach-worker.js', import.meta.url), { type: 'module' }); }
  catch { vpWorker = null; }
  return vpWorker;
}
function vpKickoff(round) {
  const w = getVpWorker();
  if (!w || !round) { if (round) round.vpBest = null; return; }
  round.vpBest = undefined; // pending
  const jobId = (round._vpJobId = Math.random().toString(36).slice(2));
  const handler = (event) => {
    if (event.data?.id !== jobId) return;
    w.removeEventListener('message', handler);
    if (round._vpJobId !== jobId) return;
    if (event.data?.result) round.vpBest = event.data.result;
    else round.vpBest = null;
  };
  w.addEventListener('message', handler);
  try { w.postMessage({ id: jobId, hand: round.hand, variantId: round.variantId }); }
  catch { round.vpBest = null; }
}
function vpBest() {
  const cached = round?.vpBest;
  if (cached && cached.holds) return cached;
  return bestHold(round.hand, { variant: round.variantId });
}
let firstDecisionStart = 0;   // performance.now() when the session's first hand was dealt
let firstDecisionEmitted = false;
let decisions = [];   // blackjack: one entry per action taken this round
let picked = new Set(); // hold'em: indices into round.hand7
let handsWon = 0;
let handsAtGym = 0;
let awaitingBadge = false;
let shortSession = false;
let tutorialTips = []; // first-session lesson tips, shown one per hand after hands 1-4
let newDeal = false;   // cards stagger in on a fresh deal only
let holeShown = false; // blackjack: the dealer hole card has flipped face up
let sessionBest = 0;   // best streak reached in the current five-hand session
let sessionMistakes = []; // misses recorded this session, for the end-of-session summary
let sessionResults = []; // per-hand boolean results in the current five-hand session
let coachedHand = false; // the coach was opened this hand, so it cannot score or count
let dailyMode = false;
let dailyRun = null; // { key, plan, number, index, results, scored, finished }
let holdHintShown = false; // one-time first-hand hint for video poker holds
let drillMode = null; // 'master' | 'weak' | null — a rigged five-hand drill session
let drillHands = [];
let drillLabel = ''; // the situation name for the current drill hand
// The first hand is where a new player either acts or leaves. If nothing has
// been pressed six seconds after hand 1 is dealt, point at the legal controls
// once per device. It never fires again, and the first decision clears it.
const FIRST_NUDGE_KEY = 'pg_first_nudge_v1';
const FIRST_NUDGE_DELAY_MS = 6000;
let firstNudgeTimer = null;
const entryParams = parseEntryParams(location.search);
// A scenario link (?drill=<id>) names one authored hand, so a guide or video
// can land on the exact decision it promised instead of a random deal.
let requestedDrill = entryParams.drill ? findDrill(entryParams.drill) : null;
let requestedGym = GYMS.find(gym => gym.game === (entryParams.practice ?? requestedDrill?.game)) ?? null;
// A shared Daily Drill link (?d=<n>) highlights today's drill when n is within
// one day of today's number; otherwise it is ignored silently. ref is read only
// to strip it: it is never stored (no localStorage, cookie or sessionStorage).
let sharedDaily = entryParams.daily || isSharedDayCurrent(entryParams.day, dailyNumber(dailyKey()));
// How a Daily Drill link reached us, for start_daily's `entry` property.
const dailyLinkEntry = entryParams.daily ? 'daily_link' : sharedDaily ? 'share_link' : null;
// The entry source for this page load, carried onto run-level events so starts
// and completions can be split by daily link, practice link, or direct.
const trainerEntry = dailyLinkEntry ?? (requestedDrill ? 'drill_link' : entryParams.practice ? 'practice_link' : 'direct');
// One meaning per event; see docs/analytics-events.md. The ref tag is the
// loader's snapshot (it also covers referrer fallback), else the parsed ?ref=.
const analytics = createAnalytics({
  send: (name, props) => window.trackEvent?.(name, props),
  ref: () => window.__pgAttribution?.ref ?? (entryParams.ref !== 'none' ? entryParams.ref : null),
});
let sessionToken = null; // live game_start run, closed by session_complete
let handNumber = 0;      // 1-based index of the hand being dealt in this run
let decisionsThisHand = 0;
// Hand-level events share the run token of their game_start/start_daily parent.
function handToken() { return dailyMode ? (dailyRun?.token ?? null) : sessionToken; }
function handMode() { return dailyMode ? 'daily' : shortSession ? (drillMode ?? 'session') : 'challenge'; }
function trackDecision(action) {
  clearFirstNudge();
  decisionsThisHand += 1;
  // The first decision marks the hand as started by the player; later
  // blackjack actions are counted in hand_complete.decisions instead.
  if (decisionsThisHand === 1) {
    analytics.decisionMade(handToken(), { handIndex: handNumber, action, mode: handMode() });
  }
}
if (['ref', 'd', 'daily'].some(k => new URLSearchParams(location.search).has(k))) {
  try { history.replaceState(history.state, '', location.pathname + cleanEntrySearch(location.search) + location.hash); } catch {}
}

function save() {
  if (!profile) return;
  try {
    localStorage.setItem(SAVE_KEY, serialize(profile));
    el('saveStatus').hidden = true;
  } catch { storageWarning(); }
}

let pendingRestore = null;
el('btnBackup').onclick = () => {
  pendingRestore = null;
  el('btnConfirmRestore').hidden = true;
  try {
    if (!profile) throw new Error('No save');
    el('backupText').value = writeBackup(profile);
    el('backupText').focus(); el('backupText').select();
    el('backupStatus').textContent = 'Backup prepared. Copy this text into a private note. Nothing is uploaded.';
  } catch { el('backupStatus').textContent = 'No valid progress to back up.'; }
};
el('backupText').oninput = () => { pendingRestore = null; el('btnConfirmRestore').hidden = true; };
el('btnRestore').onclick = () => {
  pendingRestore = null;
  el('btnConfirmRestore').hidden = true;
  try {
    pendingRestore = readBackup(el('backupText').value);
    el('backupStatus').textContent = `Valid backup: ${CLASS_BY_ID[pendingRestore.classId].name}, ${pendingRestore.handsPlayed} hands, ${pendingRestore.badges.length} badges. Confirm to replace local progress.`;
    el('btnConfirmRestore').hidden = false;
  } catch { el('backupStatus').textContent = 'Invalid or unsupported backup. Your progress is unchanged.'; }
};
el('btnConfirmRestore').onclick = () => {
  if (!pendingRestore) return;
  try {
    // Persist successfully before replacing the in-memory profile.
    localStorage.setItem(SAVE_KEY, serialize(pendingRestore));
    el('saveStatus').hidden = true;
    profile = pendingRestore; pendingRestore = null; round = null; shortSession = false;
    el('btnConfirmRestore').hidden = true;
    el('btnContinue').disabled = false;
    renderMap(); show('scr-map');
    el('backupStatus').textContent = 'Progress restored on this browser. Nothing was uploaded.';
  } catch { el('backupStatus').textContent = 'Restore failed. Browser storage may be full or blocked.'; }
};

/* Music follows the screen. Every screen and every gym currently shares the
 * "vegas" piano-trio loop ("lounge" is still defined, to switch back); the
 * maps stay so a screen can get its own track later.
 * Nothing actually starts until the first click, because browsers will not
 * let an AudioContext run before a user gesture. */
const BATTLE_THEME = {
  pokergym: 'vegas',
  countyfair: 'vegas',
  villaoak: 'vegas',
  riverstone: 'vegas',
};
const AMBIENT = {
  'scr-title': 'vegas',
  'scr-class': 'vegas',
  'scr-map': 'vegas',
  'scr-review': 'vegas',
  'scr-lesson': 'vegas',
};

function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  el(id).hidden = false;
  el('btnMap').hidden = !['scr-battle', 'scr-lesson', 'scr-class'].includes(id) || !profile;
  el('btnTitle').hidden = id !== 'scr-map' || !profile;
  window.scrollTo(0, 0);
  audio.music(AMBIENT[id] ?? (id === 'scr-battle' ? (BATTLE_THEME[gymId] ?? null) : null));
}

/* ---------------- sprite: 48x48 outlined pixel portrait --------------------
 * The grids, palettes and drawing pipeline all live in sprites.js. This module
 * only picks which character to draw: the four trainers sit in class order,
 * the four gym masters are keyed by game id.
 */
const TRAINER_IDS = ['scholar', 'dealer', 'countess', 'grinder'];

function drawSprite(canvas, rampIndex) {
  drawArt(canvas, TRAINER_IDS[rampIndex] ?? 'scholar');
}

/* ---------------- dealer: the house character who talks you through a gym ----
 * One dealer per gym, the way a game corner has an attendant behind the counter.
 * Each gym master has its own 48x48 portrait in sprites.js, keyed by game id.
 */
function drawDealer(canvas, gymId) {
  drawArt(canvas, gymId);
}

function renderSprite(profileOrClass) {
  const id = typeof profileOrClass === 'string' ? profileOrClass : profileOrClass.classId;
  const idx = Math.max(0, CLASSES.findIndex((c) => c.id === id));
  // The map screen carries a copy of the trainer; the battle master and the
  // lesson portrait are drawn from the gym's dealer instead.
  for (const canvasId of ['sprite', 'battleSprite']) {
    const canvas = el(canvasId);
    if (canvasId === 'battleSprite') drawTrainerBack(canvas, id);
    else if (canvas) drawSprite(canvas, idx);
  }
}

/* ---------------- palette ---------------------------------------------------
 * The chrome reads --gbc-0..3, --panel and --panel-2. Those come from
 * html[data-class], one set per trainer class, so picking a class repaints
 * the whole game in the same four ramps its sprite is drawn with.
 */
function applyPalette(classId) {
  const root = document.documentElement;
  if (classId) root.dataset.class = classId;
  else delete root.dataset.class;
  const hex = getComputedStyle(root).getPropertyValue('--bg').trim();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && hex) meta.setAttribute('content', hex);
}

/* ---------------- sound ----------------------------------------------------
 * Browsers refuse to start an AudioContext before a user gesture, so the
 * context opens on the first click or keypress and any track show() already
 * asked for begins then. The switch itself is persisted next to the save.
 */
// Sound controls initialize in sound-controls.js, before the atlas is ready.
el('btnMap').onclick = () => { dailyMode = false; dailyRun = null; renderMap(); show('scr-map'); };
el('btnTitle').onclick = () => { dailyMode = false; dailyRun = null; initTitle(); };

/* ---------------- title ---------------- */
function initTitle() {
  el('btnContinue').disabled = !profile;
  // Without a save the daily is reachable only from a shared link (option a).
  // The Daily Drill is the built-in reason to come back; show it to everyone,
  // including first-time visitors with no save. The onclick path below creates
  // a profile on tap, so no save is required to start it.
  el('btnDaily').hidden = false;
  const key = dailyKey();
  const number = dailyNumber(key);
  const done = profile && dailyCompleted(profile, key);
  const streak = profile?.daily?.streak ?? 0;
  const progress = profile?.daily?.progress;
  const partial = progress?.key === key ? Math.max(0, Math.min(DAILY_HANDS, progress.index ?? 0)) : 0;
  if (sharedDaily) {
    el('btnDaily').textContent = profile
      ? `Play today’s Daily Drill #${number}${done ? ' ✓' : ''}${streak > 0 ? ` · ${streak}-day streak` : ''}`
      : `Play today’s Daily Drill #${number}`;
  } else if (profile) {
    el('btnDaily').textContent = done
      ? `Daily Drill #${number} ✓${streak > 0 ? ` · ${streak}-day streak` : ''}`
      : `Play today’s Daily Drill #${number}${streak > 0 ? ` · ${streak}-day streak` : ''}`;
  } else {
    el('btnDaily').textContent = `Play today’s Daily Drill #${number}`;
  }
  if (partial > 0 && !done) {
    el('btnDaily').textContent = `Resume Daily Drill #${number} · ${partial} of ${DAILY_HANDS} done`;
  }
  // Weak-spot nudge: one tap into the blackjack mistakes you have actually made.
  const weakBtn = el('btnPracticeMisses');
  if (weakBtn) {
    const bjMisses = (profile?.mistakes ?? []).filter(m => m.game === 'blackjack');
    const hasMisses = bjMisses.length > 0 && !requestedGym;
    weakBtn.hidden = !hasMisses;
    if (hasMisses) {
      weakBtn.textContent = `Practice my mistakes (${bjMisses.length})`;
      weakBtn.onclick = () => {
        const gym = GYMS.find(g => g.game === 'blackjack');
        if (!gym || !profile) return;
        if (profile.activeSession && profile.activeSession.gymId !== gym.id) {
          profile = { ...profile, activeSession: null };
        }
        profile = beginSession(profile, gym.id);
        save();
        startGym(gym, true, 'weak');
      };
    }
  }
  const card = el('trainerCard');
  if (card && profile) {
    const badges = profile.badges?.length ?? 0;
    const streak = profile.daily?.streak ?? 0;
    const lvl = levelFromXp(profile.xp).level;
    const playStreak = sessionStreak(profile);
    card.textContent = `Level ${lvl} · ${badges} of 4 badges · ${profile.handsPlayed ?? 0} hands played`;
    const streakLine = el('playStreakLine');
    if (streakLine) {
      if (playStreak > 0) {
        streakLine.textContent = `🔥 ${playStreak}-day streak — play tomorrow to make it ${playStreak + 1}`;
        streakLine.hidden = false;
      } else {
        streakLine.hidden = true;
      }
    }
    card.hidden = false;
  } else if (card) {
    card.hidden = true;
  }
  // Practice wins for routing: with ?practice= the start button stays primary.
  const promoteDaily = sharedDaily && !requestedGym;
  el('btnDaily').classList.toggle('primary', promoteDaily);
  el('btnStart').classList.toggle('primary', !promoteDaily);
  const row = el('btnStart').parentElement;
  if (promoteDaily) row.insertBefore(el('btnDaily'), row.firstElementChild);
  else row.appendChild(el('btnDaily'));
  const invitation = el('practiceInvitation');
  invitation.hidden = !requestedGym;
  if (requestedGym) {
    const unfinished = profile?.activeSession;
    invitation.textContent = unfinished && unfinished.gymId !== requestedGym.id
      ? `Your unfinished ${TRAINING_LABEL[GYM_BY_ID[unfinished.gymId].game]} session will resume first. All four games are available on the home screen.`
      : `Five-hand ${TRAINING_LABEL[requestedGym.game]} practice. Choose a playing style or continue your save to start.`;
  }
  drawArt(el('titleTrainer'), profile?.classId ?? 'grinder');
  applyPalette(profile?.classId ?? null);
  show('scr-title');
}
function enterTraining() {
  if (requestedGym) {
    // A named scenario always wins over a resumed session, so the link cannot
    // land on a different game than the one it promised.
    const gym = requestedDrill && requestedGym
      ? requestedGym
      : GYM_BY_ID[profile.activeSession?.gymId] ?? requestedGym;
    const scenario = requestedDrill && requestedDrill.game === gym.game ? requestedDrill : null;
    requestedGym = null;
    if (scenario) {
      // A scenario link always opens fresh on the promised hand, even when an
      // unfinished session exists, so the page and the deal cannot disagree.
      profile = { ...profile, activeSession: { gymId: gym.id, played: 0, optimal: 0, dealt: 0, startedAt: new Date().toISOString() } };
    } else {
      profile = beginSession(profile, gym.id);
    }
    save();
    startGym(gym, true, scenario ? 'master' : null);
    return;
  }
  renderMap(); show('scr-map');
}
el('btnContinue').onclick = enterTraining;
el('btnDaily').onclick = () => {
  // A new visitor from a shared link: create the local profile on tap, exactly
  // as START TRAINING does, then go straight into the daily.
  if (!profile) {
    profile = createProfile(DEFAULT_CLASS);
    profile.createdAt = new Date().toISOString();
    save();
    applyPalette(DEFAULT_CLASS);
  }
  const entry = sharedDaily ? (dailyLinkEntry ?? 'title') : 'title';
  sharedDaily = false;
  startDaily(entry);
};
el('btnReview').onclick = openReview;
el('btnReviewDone').onclick = () => { renderMap(); show('scr-map'); };
el('btnStart').onclick = startTraining;

function startTraining() {
  if (!profile) {
    profile = createProfile(DEFAULT_CLASS);
    profile.createdAt = new Date().toISOString();
    save();
    applyPalette(DEFAULT_CLASS);
  }
  if (requestedGym) { enterTraining(); return; }
  startDefaultSession();
}

function startDefaultSession() {
  if (profile.activeSession) { startGym(GYM_BY_ID[profile.activeSession.gymId], true); return; }
  const gym = GYMS.find(g => g.game === 'blackjack');
  profile = beginSession(profile, gym.id);
  save();
  startGym(gym, true);
}

el('btnNew').onclick = () => {
  pendingClass = null;
  applyPalette(profile?.classId ?? null);
  renderClassSelect();
  show('scr-class');
};

/* ---------------- class select ---------------- */
function renderClassSelect() {
  const grid = el('classGrid');
  grid.innerHTML = '';
  for (const cls of CLASSES) {
    const gym = gymForClass(cls.id);
    const card = document.createElement('button');
    card.className = 'class-card';
    card.type = 'button';
    card.setAttribute('aria-pressed', String(pendingClass === cls.id));
    const nmSpan = document.createElement('span'); nmSpan.className = 'nm'; nmSpan.textContent = cls.name;
    const blSpan = document.createElement('span'); blSpan.className = 'bl'; blSpan.textContent = gym.name;
    const br = document.createElement('br');
    blSpan.append(br, document.createTextNode(cls.blurb));
    card.append(nmSpan, blSpan);
    const portrait = document.createElement('canvas');
    portrait.width = portrait.height = 48;
    portrait.className = 'class-portrait';
    portrait.setAttribute('aria-hidden', 'true');
    drawArt(portrait, cls.id);
    card.prepend(portrait);
    card.onclick = () => { pendingClass = cls.id; applyPalette(cls.id); renderClassSelect(); showClassDetail(cls); };
    grid.appendChild(card);
  }
  el('classDetail').hidden = true;
}

function showClassDetail(cls) {
  const gym = gymForClass(cls.id);
  becomeArmed = false;
  el('btnBecome').textContent = 'Choose this style';
  el('classDetailName').textContent = cls.name;
  el('classDetailText').textContent = `${gym.name} is your first gym. ${cls.perk} ${cls.blurb}`;
  const stats = el('classDetailStats');
  stats.innerHTML = '';
  for (const key of ['focus', 'nerve', 'read']) {
    const b = document.createElement('div');
    b.className = 'badge';
    b.style.width = 'auto';
    b.style.padding = '4px 6px';
    b.style.fontSize = '9px';
    const base = 1 + (cls.biases[key] ?? 0);
    const stars = '\u25c6'.repeat(base);
    const statLabel = document.createElement('span'); statLabel.className = 'stat-label'; statLabel.textContent = STAT_LABEL[key];
    b.append(statLabel, document.createTextNode(' ' + stars));
    stats.appendChild(b);
  }
  el('classDetail').hidden = false;
  el('classDetail').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest' });
}

el('btnBack').onclick = () => {
  pendingClass = null;
  becomeArmed = false;
  applyPalette(profile?.classId ?? null);
  renderClassSelect();
};
el('btnBecome').onclick = () => {
  if (!pendingClass) return;
  // Replacing an existing save is destructive, so require a confirming second tap.
  if (profile && !becomeArmed) {
    becomeArmed = true;
    el('btnBecome').textContent = 'Replace your save?';
    el('classDetailText').textContent = 'This replaces your current player profile, level, badges, and record on this browser. Press again to confirm, or go back to keep your save.';
    return;
  }
  becomeArmed = false;
  profile = createProfile(pendingClass);
  profile.createdAt = new Date().toISOString();
  save();
  applyPalette(pendingClass);
  enterTraining();
};

el('btnShare').hidden = typeof navigator.share !== 'function';
el('btnShare').onclick = async () => {
  try {
    const shareId = newShareId();
    await navigator.share({ title: 'Play Poker Gym — free training demo', text: el('sharePreview').value });
    window.trackEvent?.('share', { channel: 'native' });
    window.trackEvent?.('share_click', { game: 'invite', channel: 'native', share_id: shareId });
    el('shareStatus').textContent = 'Share options closed. Delivery is handled by your chosen app.';
  } catch (error) {
    el('shareStatus').textContent = error.name === 'AbortError'
      ? 'Sharing canceled. Nothing sent by Play Poker Gym.'
      : 'Share options unavailable. Copy the invitation or select it above.';
  }
};
el('btnCopyShare').onclick = async () => {
  try {
    const shareId = newShareId();
    await navigator.clipboard.writeText(el('sharePreview').value);
    window.trackEvent?.('share', { channel: 'copy' });
    window.trackEvent?.('share_click', { game: 'invite', channel: 'copy', share_id: shareId });
    el('shareStatus').textContent = 'Invitation copied. Nothing sent; paste it where you choose.';
  } catch {
    el('sharePreview').focus();
    el('sharePreview').select();
    el('shareStatus').textContent = 'Copy unavailable. Invitation selected; use your device’s Copy command. Nothing sent.';
  }
};

el('feedbackForm').onsubmit = event => {
  event.preventDefault();
  const draft = feedbackDraft({
    clarity: el('feedbackClarity').value,
    returnInterest: el('feedbackReturn').value,
    note: el('feedbackNote').value,
  });
  el('feedbackPreview').value = draft.body;
  el('feedbackEmail').href = draft.href;
  el('feedbackGithub').href = draft.githubHref;
  el('feedbackDraft').hidden = false;
  window.trackEvent?.('feedback_submit', { clarity: el('feedbackClarity').value, returnInterest: el('feedbackReturn').value });
};

/* ---------------- map ---------------- */
// The TODAY card offers exactly one primary action, picked by priority: resume
// a live session, then the daily drill, then due mistake reviews, then five
// hands of the weakest game. Everything else on the map is secondary.
function computeToday() {
  if (profile.activeSession) {
    const s = profile.activeSession;
    return {
      state: `You have an unfinished ${GYM_BY_ID[s.gymId].name} session: ${s.played} of ${SESSION_HANDS} hands done.`,
      label: `Resume five hands · ${s.played} of ${SESSION_HANDS}`,
      action: () => startGym(GYM_BY_ID[s.gymId], true),
    };
  }
  const key = dailyKey();
  const number = dailyNumber(key);
  const daily = dailyOf(profile);
  const progress = daily.progress;
  if (progress && progress.key === key && progress.index < DAILY_HANDS) {
    return {
      state: `Daily Drill #${number} is in progress: ${progress.index} of ${DAILY_HANDS} hands done.`,
      label: 'Resume Daily Drill',
      action: () => startDaily('map_resume'),
    };
  }
  if (daily.lastKey !== key) {
    return {
      state: `Daily Drill #${number} is ready. Five hands, one from each game, the same drill for everyone today.`,
      label: `Play Daily Drill #${number}`,
      action: () => startDaily('map'),
    };
  }
  const due = mistakeReviewQueue(profile, localDayKey()).filter(row => row.due).length;
  const countdown = formatDailyCountdown();
  if (due) {
    return {
      state: `Daily Drill #${number} is done. The next one unlocks in ${countdown}. You have ${due} mistake review${due === 1 ? '' : 's'} due now.`,
      label: `Review ${due} mistake${due === 1 ? '' : 's'}`,
      action: () => openReview(),
    };
  }
  const rec = recommendedPractice(profile);
  const gym = rec ? GYM_BY_ID[rec.gymId] : gymForClass(profile.classId);
  return {
    state: `Daily Drill #${number} is done. The next one unlocks in ${countdown}. Keep training with five hands of ${TRAINING_LABEL[gym.game]}.`,
    label: `Play five hands of ${TRAINING_LABEL[gym.game]}`,
    action: () => {
      if (!profile.activeSession) profile = beginSession(profile, gym.id);
      save();
      startGym(gym, true);
    },
  };
}

function renderToday() {
  const state = el('todayState');
  const actions = el('todayActions');
  if (!state || !actions || !profile) return;
  actions.replaceChildren();
  el('dailySharePreview').hidden = true;
  el('dailySharePreview').value = '';
  el('dailyShareStatus').hidden = true;

  const today = computeToday();
  state.textContent = today.state;
  const primary = document.createElement('button');
  primary.className = 'primary';
  primary.textContent = today.label;
  primary.onclick = today.action;
  actions.appendChild(primary);

  // A completed daily can still be replayed or shared, but never with a second
  // primary button.
  const key = dailyKey();
  const daily = dailyOf(profile);
  renderDailyHistory(daily.history, key);
  if (daily.lastKey === key) {
    const results = daily.history.find(entry => entry.key === key)?.results ?? [];
    const text = dailyShareText(key, results, dailyNumber(key));
    const number = dailyNumber(key);
    const games = [...new Set(dailyPlan(key).map(entry => DAILY_GAME_LABEL[entry.game]))];
    const again = document.createElement('button');
    again.type = 'button';
    again.textContent = 'Replay Daily Drill';
    again.onclick = () => startDaily('replay');
    actions.appendChild(again);
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy Daily result';
    copy.onclick = () => shareDaily(text, false, results, number, games);
    actions.appendChild(copy);
    el('dailySharePreview').value = text;
    const fb = document.createElement('p');
    fb.className = 'hint';
    fb.innerHTML = 'Feedback? <a href="mailto:meep@mail.grokbot.com?subject=Poker%20Gym%20feedback">Email</a> · <a href="https://github.com/MeepTheTendie/pokergym/issues/1" target="_blank" rel="noopener noreferrer">GitHub</a>';
    actions.appendChild(fb);
    const tip = document.createElement('p');
    tip.className = 'hint tip-link';
    tip.innerHTML = TIP_HTML;
    actions.appendChild(tip);
  }
}

function renderDailyHistory(history, key) {
  const host = el('dailyHistoryContent');
  host.replaceChildren();
  const summary = dailySummary(history, key);
  const line = text => {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = text;
    host.appendChild(p);
  };
  if (!summary.entries.length) {
    line('Finish a Daily Drill to start your record. No completed drills in the last 14 days.');
    return;
  }
  const score = row => row.hands ? `${row.correct}/${row.hands} correct (${Math.round(100 * row.correct / row.hands)}%) · ${row.sessions} drills` : 'No completed drills';
  line(`Last 7 days: ${score(summary.recent)}`);
  line(`Previous 7 days: ${score(summary.previous)}`);
  line('By game, last 7 days:');
  for (const row of summary.games) {
    line(`${DAILY_GAME_LABEL[row.game]}: ${row.hands ? `${row.correct}/${row.hands} correct` : 'no hands'}`);
  }
  line('Recent days:');
  for (const row of summary.entries) line(`${row.key} · ${row.correct}/${DAILY_HANDS} correct`);
}

function dailyShareText(key, results, number, _unused = null, shareId = null) {
  const plan = dailyPlan(key);
  const games = [...new Set(plan.map(entry => DAILY_GAME_LABEL[entry.game]))];
  return buildDailyShareText({ number, results, total: DAILY_HANDS, games, shareId });
}

async function shareDaily(text, useShare, results = null, number = null, games = null) {
  const status = el('dailyShareStatus');
  const preview = el('dailySharePreview');
  const shareId = newShareId();
  const url = number ? shareUrl(number, shareId) : null;
  const textWithId = url && text ? text.replace(/https:\/\/playpokergym\.com\/web\/\?ref=share&d=\d+/, url) : text;
  try {
    if (useShare && typeof navigator.share === 'function') {
      if (results && number && typeof navigator.canShare === 'function') {
        try {
          const canvas = renderDailyImage(number, results, games ?? []);
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
            const file = new File([blob], 'poker-gym-daily.png', { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ title: 'Poker Gym Daily', text: textWithId, files: [file] });
              status.textContent = 'Share options closed. Delivery is handled by your chosen app.';
              window.trackEvent?.('share', { channel: 'daily', format: 'image' });
              window.trackEvent?.('share_click', { game: 'daily', channel: 'native', share_id: shareId });
              return;
            }
          }
        } catch { /* fall through to text share */ }
      }
      await navigator.share({ title: 'Poker Gym Daily', text: textWithId });
      status.textContent = 'Share options closed. Delivery is handled by your chosen app.';
      window.trackEvent?.('share', { channel: 'daily', format: 'text' });
      window.trackEvent?.('share_click', { game: 'daily', channel: 'native', share_id: shareId });
    } else {
      await navigator.clipboard.writeText(textWithId);
      status.textContent = 'Result copied. Nothing sent; paste it where you choose.';
      window.trackEvent?.('share', { channel: 'copy', surface: 'daily' });
      window.trackEvent?.('share_click', { game: 'daily', channel: 'copy', share_id: shareId });
    }
  } catch (error) {
    status.textContent = error?.name === 'AbortError'
      ? 'Sharing canceled. Nothing sent by Play Poker Gym.'
      : 'Copy unavailable. Result selected; use your device’s Copy command. Nothing sent.';
    preview.hidden = false;
    preview.focus();
    preview.select();
  }
  status.hidden = false;
}

function renderDailyImage(number, results, games) {
  const tally = results.filter(v => v).length;
  const canvas = document.createElement('canvas');
  const w = 600, h = 360;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0a1a14';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#d4a843';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Poker Gym Daily', w / 2, 56);
  ctx.fillStyle = '#e8f0e8';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(`#${number}  ${tally}/${results.length}`, w / 2, 100);
  const sq = 52, gap = 10;
  const gridW = results.length * (sq + gap) - gap;
  const startX = (w - gridW) / 2;
  const startY = 130;
  results.forEach((ok, i) => {
    ctx.fillStyle = ok ? '#27ae60' : '#c0392b';
    const x = startX + i * (sq + gap);
    ctx.fillRect(x, startY, sq, sq);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ok ? '\u2713' : '\u2715', x + sq / 2, startY + sq / 2 + 10);
  });
  ctx.fillStyle = '#8fa89a';
  ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText((games || []).join(' \u00b7 '), w / 2, startY + sq + 44);
  ctx.fillStyle = '#d4a843';
  ctx.font = '16px monospace';
  ctx.fillText('playpokergym.com', w / 2, h - 28);
  return canvas;
}

function renderMap() {
  renderToday();
  const cls = CLASS_BY_ID[profile.classId];
  const lvl = levelFromXp(profile.xp);
  renderSprite(profile);

  el('trainerLine').textContent = `${cls.name} · Level ${lvl.level}`;
  el('trainerStats').textContent =
    `${STAT_LABEL.focus} ${profile.stats.focus}  ${STAT_LABEL.nerve} ${profile.stats.nerve}  ${STAT_LABEL.read} ${profile.stats.read}`;
  el('xpBar').style.width = `${Math.round((lvl.into / lvl.needed) * 100)}%`;
  el('xpLine').textContent = `${fmt(lvl.into)} / ${fmt(lvl.needed)} XP`;
  el('scoreCount').textContent = fmt(profile.score);
  el('bestStreak').textContent = fmt(profile.bestStreak);
  const practice = el('practiceSummary');
  if (practice) {
    practice.replaceChildren();
    for (const row of practiceSummary(profile)) {
      const tier = masteryRank(profile, row.game);
      const result = document.createElement('p');
      result.className = 'hint';
      result.textContent = `${row.name}${tier ? ` · ${MASTERY_LABEL[tier]}` : ''} · ${
        row.played ? `${row.accuracy}% correct · ${row.optimal}/${row.played}` : 'No hands yet'}`;
      practice.appendChild(result);
    }
    if (practiceSummary(profile).some(row => masteryRank(profile, row.game))) {
      const legend = document.createElement('p');
      legend.className = 'hint';
      legend.textContent = 'Ranks track your last 20 un-hinted hands: 70% Bronze, 80% Silver, 90% Gold. A rank unlocks that game’s Master Drill.';
      practice.appendChild(legend);
    }
  }

  const sessions = el('shortSessions');
  sessions.replaceChildren();
  if (profile.activeSession) {
    const resume = document.createElement('button');
    resume.id = 'btnResumeSession';
    resume.textContent = `Resume five hands · ${profile.activeSession.played} of ${SESSION_HANDS} done`;
    resume.onclick = () => startGym(GYM_BY_ID[profile.activeSession.gymId], true);
    sessions.append(resume);
  } else {
    const recommendation = recommendedPractice(profile);
    if (recommendation) {
      const reason = document.createElement('p');
      reason.id = 'practiceRecommendation';
      reason.className = 'hint';
      reason.textContent = `Suggested next: ${TRAINING_LABEL[recommendation.game]} · ${recommendation.optimal}/${recommendation.played} correct. This is the game where your recent accuracy is lowest, among games with at least five hands. Hinted plays count too; it is a practice suggestion, not a skill rating.`;
      sessions.append(reason);
    }
    for (const gym of GYMS.filter(g => canTrain(profile, g.id))) {
      const button = document.createElement('button');
      button.dataset.sessionGym = gym.id;
      button.textContent = `${gym.id === recommendation?.gymId ? 'Suggested · ' : ''}Five hands · ${TRAINING_LABEL[gym.game]}`;
      button.onclick = () => { profile = beginSession(profile, gym.id); save(); startGym(gym, true); };
      sessions.append(button);
    }
    // Master drills: a rank (earned on un-hinted hands) unlocks a five-hand set
    // of hard, hand-picked situations. The coach still grades every decision.
    for (const game of DRILL_GAMES) {
      const rank = masteryRank(profile, game);
      if (!rank) continue;
      const gym = GYMS.find(g => g.game === game);
      const button = document.createElement('button');
      button.dataset.drillGym = gym.id;
      button.dataset.drillMode = 'master';
      button.textContent = `Master Drill · ${MASTERY_LABEL[rank]} · ${TRAINING_LABEL[game]}`;
      button.onclick = () => { profile = beginSession(profile, gym.id); save(); startGym(gym, true, 'master'); };
      sessions.append(button);
    }
    // Weak-spot drill: auto-deals the blackjack hand types you have actually
    // missed, most-missed first.
    if ((profile.mistakes ?? []).some(m => m.game === 'blackjack')) {
      const gym = GYMS.find(g => g.game === 'blackjack');
      const button = document.createElement('button');
      button.dataset.drillGym = gym.id;
      button.dataset.drillMode = 'weak';
      button.textContent = 'Weak-spot drill · Blackjack';
      button.onclick = () => { profile = beginSession(profile, gym.id); save(); startGym(gym, true, 'weak'); };
      sessions.append(button);
    }
  }
  for (const session of (profile.sessions ?? []).slice(0, 7)) {
    const result = document.createElement('p');
    result.className = 'hint';
    result.textContent = `${session.completedAt.slice(0, 10)} · ${GYM_BY_ID[session.gymId].name} · ${session.optimal}/${SESSION_HANDS} correct`;
    sessions.append(result);
  }

  el('playerFeedback').hidden = !(profile.sessions?.length);
  el('playerShare').hidden = !(profile.sessions?.length);

  renderReviewCard();

  const badges = el('badgeList');

  badges.innerHTML = '';
  for (const gym of GYMS) {
    const d = document.createElement('img');
    const owned = profile.badges.includes(gym.id);
    d.className = `badge${owned ? '' : ' locked'}`;
    d.src = `assets/badge-${{ videopoker: 'spade', blackjack: 'diamond', baccarat: 'heart', holdem: 'club' }[gym.game]}.png`;
    d.alt = owned ? gym.badge : `${gym.badge} (locked)`;
    d.width = 32;
    d.height = 32;
    d.style.opacity = owned ? '1' : '0.35';
    d.title = owned ? gym.badge : 'Locked';
    badges.appendChild(d);
  }

  const list = el('gymList');
  list.innerHTML = '';
  for (const gym of GYMS) {
    const cleared = profile.badges.includes(gym.id);
    const open = canBattle(profile, gym.id) || canPractice(profile, gym.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = open ? 'primary' : '';
    btn.dataset.gym = gym.id;
    btn.disabled = !open;
    const nameSpan = document.createElement('span'); nameSpan.textContent = gym.name;
    const labelSmall = document.createElement('small'); labelSmall.textContent = TRAINING_LABEL[gym.game];
    const statusSmall = document.createElement('small'); statusSmall.textContent = cleared ? '✓ Badge earned · practice' : open ? '▶ Enter gym' : 'Locked';
    btn.append(nameSpan, labelSmall, statusSmall);
    btn.onclick = () => startGym(gym);
    list.appendChild(btn);
  }
}

/* ---------------- mistake review ----------------
 * Spaced recall over the saved notebook: only scored decisions reach the due
 * queue, served one at a time with the battle card styling. A wrong retry resets
 * to the first box and returns tomorrow; a correct answer at the last box marks
 * the entry mastered. Correct reviews add a small Decision Score bonus, no XP.
 */
let reviewQueue = [];
let reviewPos = 0;

function renderReviewCard() {
  const button = el('btnReview');
  if (!button) return;
  const due = mistakeReviewQueue(profile, localDayKey()).filter(row => row.due).length;
  button.textContent = due ? `Review ${due} mistake${due === 1 ? '' : 's'}` : 'All caught up';
  button.classList.toggle('primary', due > 0);
  button.disabled = !(profile.mistakes?.length);
}

function mistakeTitle(entry) {
  return `${GYMS.find(g => g.game === entry.game)?.name ?? entry.game}: ${entry.situation}`;
}

function openReview() {
  reviewQueue = mistakeReviewQueue(profile, localDayKey()).filter(row => row.due);
  reviewPos = 0;
  renderReview();
  show('scr-review');
}

function renderReview() {
  const summary = el('reviewSummary');
  const card = el('reviewCard');
  card.replaceChildren();
  const queue = mistakeReviewQueue(profile, localDayKey());
  const due = queue.filter(row => row.due).length;
  const mastered = queue.filter(row => row.mastered).length;
  summary.textContent = due
    ? `${due} scored review${due === 1 ? '' : 's'} due. Recall the better play before revealing it. Correct reviews add a small decision-score bonus, but no XP.${mastered ? ` ${mastered} mastered.` : ''}`
    : `All caught up. A new missed decision is due the same day. Correct retries bring it back after 2, 4, 8, then 16 days.${mastered ? ` ${mastered} mastered.` : ''}`;
  if (reviewPos < reviewQueue.length) {
    renderReviewEntry(card, reviewQueue[reviewPos], true);
  } else if (profile.mistakes?.length) {
    const done = document.createElement('p');
    done.className = 'hint';
    done.textContent = 'All caught up for today. Scored retries return on their scheduled day; self-review entries are listed below.';
    card.append(done);
  } else {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'No saved mistakes yet. Missed decisions will appear here, due the same day.';
    card.append(empty);
  }
  for (const row of mistakeReviewQueue(profile, localDayKey()).filter(r => !r.scored)) {
    renderReviewEntry(card, row, false);
  }
}

function renderReviewEntry(container, row, scoredDue) {
  const entry = row.entry;
  const hasQuiz = validMistakeQuiz(entry.quiz, entry.game);
  const markReviewed = () => {
    profile = markMistakeReviewed(profile, row.index);
    save();
  };
  const block = document.createElement('div');
  block.className = 'review-entry';
  const heading = document.createElement('h3');
  heading.textContent = mistakeTitle(entry);
  block.append(heading);

  const status = document.createElement('p');
  status.className = 'hint';
  if (entry.mastered) status.textContent = 'Mastered · answered correctly at the final step.';
  else if (scoredDue && hasQuiz) status.textContent = 'Due now · recall the better play before revealing it.';
  else if (hasQuiz) status.textContent = `Next due ${entry.due ?? 'later'} · early practice does not change the schedule.`;
  else status.textContent = 'Self review · no scored answer key.';
  block.append(status);

  const play = document.createElement('p');
  play.textContent = `Your play: ${entry.chosen}`;
  block.append(play);

  const answer = document.createElement('p');
  answer.className = 'mistake-answer';
  answer.textContent = `Coach: ${entry.correction}`;
  answer.hidden = true;
  const reviewed = document.createElement('button');
  reviewed.type = 'button';
  reviewed.textContent = 'Mark self-reviewed';
  reviewed.hidden = true;
  reviewed.onclick = markReviewed;

  if (hasQuiz && scoredDue) {
    const cardRetry = ['videopoker', 'holdem'].includes(entry.game);
    const bestFive = entry.game === 'holdem';
    let holdPattern = bestFive ? '0000000' : '00000';
    let answered = false;
    const choices = document.createElement('div');
    choices.className = 'mistake-choices';
    const result = document.createElement('p');
    result.setAttribute('aria-live', 'polite');
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'primary';
    next.textContent = 'Next review';
    next.hidden = true;
    next.onclick = () => { reviewPos += 1; renderReview(); renderReviewCard(); };
    const submit = (action) => {
      if (answered) return;
      answered = true;
      const correct = entry.quiz.optimal.includes(action);
      profile = answerMistakeQuiz(profile, row.index, action, localDayKey());
      save();
      const updated = profile.mistakes[row.index];
      for (const child of choices.children) child.disabled = true;
      answer.hidden = false;
      reviewed.hidden = false;
      result.textContent = correct
        ? (updated.mastered ? 'Correct · mastered. This one leaves the due queue.'
          : `Correct · moved to step ${updated.box} · next review ${updated.due}. +5 decision score.`)
        : 'Missed · back to the first step · due tomorrow.';
      next.hidden = false;
    };
    if (['videopoker', 'holdem'].includes(entry.game)) {
      const bestFive = entry.game === 'holdem';
      entry.situation.split(' ').forEach((label, position) => {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.textContent = `${position + 1}: ${label}`;
        toggle.setAttribute('aria-pressed', 'false');
        toggle.dataset.retryCard = position;
        toggle.onclick = () => {
          if (answered) return;
          const pattern = holdPattern.split('');
          pattern[position] = pattern[position] === '1' ? '0' : '1';
          holdPattern = pattern.join('');
          toggle.setAttribute('aria-pressed', pattern[position] === '1' ? 'true' : 'false');
          toggle.textContent = `${position + 1}: ${label}${pattern[position] === '1' ? (bestFive ? ' · Picked' : ' · Held') : ''}`;
        };
        choices.append(toggle);
      });
      const check = document.createElement('button');
      check.type = 'button';
      check.className = 'primary';
      check.textContent = bestFive ? 'Check best five' : 'Check hold';
      check.dataset.retryAction = bestFive ? 'bestfive' : 'hold';
      check.onclick = () => {
        if (bestFive && [...holdPattern].filter(bit => bit === '1').length !== 5) {
          result.textContent = 'Select exactly five cards.';
          return;
        }
        submit(holdPattern);
      };
      choices.append(check);
    } else {
      for (const action of entry.quiz.choices) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = ACTION_LABEL[action] ?? action;
        button.dataset.retryAction = action;
        button.onclick = () => submit(action);
        choices.append(button);
      }
    }
    const revealAnswer = document.createElement('button');
    revealAnswer.type = 'button';
    revealAnswer.textContent = 'Reveal answer';
    revealAnswer.onclick = () => {
      if (answered) return;
      answered = true;
      for (const child of choices.children) child.disabled = true;
      answer.hidden = false;
      reviewed.hidden = false;
    };
    block.append(choices, revealAnswer, result, answer, reviewed, next);
  } else {
    const revealAnswer = document.createElement('button');
    revealAnswer.type = 'button';
    revealAnswer.textContent = 'Reveal answer';
    revealAnswer.onclick = () => { answer.hidden = false; reviewed.hidden = false; };
    block.append(revealAnswer, answer, reviewed);
  }
  container.append(block);
}

/* ---------------- daily drill ----------------
 * Five seeded hands, one mix of all four games, the same for every trainer on
 * the same local date. Runs through the ordinary battle flow so the coach
 * explains each hand; the first complete run of a day counts toward XP, score
 * and the daily streak, and any replay is practice only.
 */
function startDaily(entry = 'other') {
  if (!profile || dailyMode) return;
  const key = dailyKey();
  const number = dailyNumber(key);
  const daily = dailyOf(profile);
  const { plan, index, results } = dailySession(key, daily.progress);
  const completed = dailyCompleted(profile, key);
  dailyRun = { key, plan, number, index, results, scored: !completed, finished: false };
  dailyRun.token = analytics.startDaily({
    entry, number, resumed: index > 0, scored: !completed, shared: entry === 'daily_link' || entry === 'share_link',
  });
  profile = setDailyProgress(profile, { key, plan, index, results });
  save();
  dailyMode = true;
  shortSession = false;
  tutorialTips = [];
  handsWon = 0;
  handsAtGym = index;
  handNumber = index;
  decisionsThisHand = 0;
  awaitingBadge = false;
  firstDecisionStart = performance.now();
  firstDecisionEmitted = false;
  renderSprite(profile);
  show('scr-battle');
  loadDailyHand();
}

function loadDailyHand() {
  if (!dailyRun || dailyRun.index >= DAILY_HANDS) return;
  const entry = dailyRun.plan[dailyRun.index];
  const gym = GYMS.find(g => g.game === entry.game);
  gymId = gym.id;
  gameId = gym.game;
  el('masterLabel').textContent = gym.leader;
  el('masterName').textContent = gym.leader;
  drawDealer(el('masterSprite'), entry.game);
  startHand();
}

function startGym(gym, sprint = false, mode = null) {
  dailyMode = false;
  dailyRun = null;
  if (sprint) {
    if (!canTrain(profile, gym.id) || profile.activeSession?.gymId !== gym.id) return;
  } else if (!canBattle(profile, gym.id) && !canPractice(profile, gym.id)) return;
  shortSession = sprint;
  const scenario = requestedDrill && requestedDrill.game === gym.game ? requestedDrill.drill.id : null;
  const targeted = scenario ? drillPlanStartingWith(profile, gym.game, scenario) : null;
  if (targeted) {
    // The named scenario opens the five-hand set; the rest continues the
    // normal rotation so the drill still covers other situations.
    profile = { ...profile, activeSession: { ...profile.activeSession, drill: targeted } };
    save();
    requestedDrill = null;
  } else if (sprint && mode && !profile.activeSession.drill) {
    const drill = captureDrillPlan(profile, gym.game, mode);
    if (drill) {
      profile = { ...profile, activeSession: { ...profile.activeSession, drill } };
      save();
    }
  }
  const plan = sprint ? profile.activeSession.drill : null;
  drillHands = restoreDrillPlan(plan, gym.game);
  drillMode = drillHands.length ? plan.mode : null;
  gymId = gym.id;
  sessionToken = analytics.gameStart({
    game: gym.game,
    mode: sprint ? (drillMode ?? 'session') : 'challenge',
    resumed: Boolean(sprint && profile.activeSession?.played > 0),
    entry: trainerEntry,
  });
  firstDecisionStart = performance.now();
  firstDecisionEmitted = false;
  gameId = gym.game;
  handsWon = 0;
  handsAtGym = 0;
  handNumber = shortSession ? (profile.activeSession?.dealt || profile.activeSession?.played || 0) : 0;
  decisionsThisHand = 0;
  awaitingBadge = false;
  sessionBest = 0;
  sessionMistakes = [];
  sessionResults = [];
  el('masterLabel').textContent = gym.leader;
  el('masterName').textContent = gym.leader;
  renderSprite(profile);
  drawDealer(el('masterSprite'), gym.game);

  const lesson = lessonFor(gym.game);
  const firstTime = Boolean(lesson) && !hasCompletedLesson(profile, gym.game);
  const begin = () => {
    // The pages beyond the intro surface one per hand across the first four
    // hands of this first session.
    tutorialTips = firstTime ? lessonTips(lesson).slice(0, 4) : [];
    if (firstTime) { profile = markLessonDone(profile, gameId); save(); }
    show('scr-battle');
    startHand();
  };
  // Skip the multi-page lesson entirely for first-time visitors. The intro
  // tips still surface as in-game coaching during the first four hands.
  begin();
}

function typewriter(node, text, done) {
  clearInterval(node._typer);
  node._typer = null;
  if (reduceMotion()) {
    node.textContent = text;
    done?.();
    return;
  }
  node.textContent = '';
  let i = 0;
  // Build the visible string in a local variable and assign once per tick so
  // the browser does a single text update instead of read-append-write.
  let shown = '';
  function tick() {
    shown += text[i++];
    node.textContent = shown;
    if (i >= text.length) {
      clearInterval(node._typer);
      node._typer = null;
      if (done) done();
    }
  }
  node._typer = setInterval(tick, 14);
  tick();
}

function fastForward(node) {
  if (node._typer) {
    clearInterval(node._typer);
    node._typer = null;
    if (node._dataset && node._dataset.full) {
      node.textContent = node._dataset.full;
    }
    return true;
  }
  return false;
}

function cancelAutoAdvance() {
  if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
}

function finishTyping(node) {
  return fastForward(node);
}

/* ---------------- lesson screen ---------------- */
let lesson = null;
let lessonIndex = 0;

function startLesson(gameIdArg, onDone) {
  lesson = lessonFor(gameIdArg);
  lessonIndex = 0;
  if (!lesson) { onDone(); return; }
  lesson._pages = lessonIntro(lesson);
  lesson._onDone = onDone;
  el('lessonTitle').textContent = lesson.title;
  el('lessonBar').innerHTML = lesson._pages.map(() => '<i></i>').join('');
  drawDealer(el('lessonDealer'), gameIdArg);
  show('scr-lesson');
  paintLessonPage();
}

function paintLessonPage() {
  const page = lesson._pages[lessonIndex];
  el('lessonWho').textContent = page.who;
  el('lessonText')._dataset = { full: page.text };
  el('lessonPage').textContent = `${lessonIndex + 1}/${lesson._pages.length}`;
  const pct = ((lessonIndex + 1) / lesson._pages.length) * 100;
  el('lessonGauge').style.width = `${pct}%`;
  [...el('lessonBar').children].forEach((n, i) => { n.classList.toggle('on', i <= lessonIndex); });
  el('lessonPrompt').hidden = true;
  typewriter(el('lessonText'), page.text, () => { el('lessonPrompt').hidden = false; });
  el('btnLessonNext').textContent = lessonIndex === lesson._pages.length - 1 ? 'Play!' : 'Next';
}

function advanceLesson() {
  if (finishTyping(el('lessonText'))) return;
  if (lessonIndex < lesson._pages.length - 1) {
    lessonIndex++;
    paintLessonPage();
    return;
  }
  // Lessons are recorded per game, not per gym: `gameId` is the gym's game and
  // LESSONS is keyed by it.
  profile = markLessonDone(profile, gameId);
  save();
  const onDone = lesson._onDone;
  lesson = null;
  onDone?.();
}

el('btnLessonNext').addEventListener('click', (e) => {
  e.stopPropagation();
  finishTyping(el('lessonText'));
  advanceLesson();
});
el('lessonBox').onclick = () => {
  const line = el('lessonText');
  if (line._typer) return fastForward(line);
  advanceLesson();
};
el('lessonBox').onkeydown = (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    const line = el('lessonText');
    if (line._typer) return fastForward(line);
    advanceLesson();
  }
};
el('btnSkip').onclick = () => {
  const onDone = lesson?._onDone;
  if (lesson) { profile = markLessonDone(profile, gameId); save(); }
  lesson = null;
  onDone?.();
};
el('variantSelect').onchange = (e) => chooseVariant(e.target.value);

/* ---------------- hand potential gauge (video poker) ---------------- */
function gradeFor(ev) {
  if (ev >= 2.5) return { label: 'Strong hand', cls: 'high' };
  if (ev >= 1.2) return { label: 'Playable hand', cls: 'mid' };
  if (ev >= 0.6) return { label: 'Thin hand', cls: 'mid' };
  return { label: 'No paying pair', cls: 'low' };
}

function setGauge(pct, cls) {
  el('potentialBar').style.width = `${Math.max(0, Math.min(100, pct))}%`;
  el('potentialBar').parentElement.className = `gauge ${cls}`;
}

function renderPotential() {
  const best = vpBest();
  const pct = Math.max(0, Math.min(100, (best.ev / 3) * 100));
  const g = gradeFor(best.ev);
  setGauge(pct, g.cls);
  el('handGrade').textContent = g.label;
  el('potentialText').textContent =
    g.label === 'No paying pair'
      ? 'Nothing here pays. Even the best hold still loses on average.'
      : `Best available return: ${best.ev.toFixed(2)} per hand on this pay table.`;
}

/* ---------------- battle: cards on the table ---------------- */
let gymId = null;

function cardNode(card, zone, i) {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = 'card';

  if (zone.downAt === i) {
    node.dataset.down = 'true';
    node.innerHTML = '<span>?</span><span class="pip">?</span>';
    node.disabled = true;
    node.setAttribute('aria-label', 'face down card');
    return node;
  }

  const name = `${rankLabel(card.r)} of ${SUIT_NAME[card.s]}`;
  node.classList.add(card.s === 1 || card.s === 2 ? 'suit-red' : 'suit-black');
  const rankSpan = document.createElement('span'); rankSpan.className = 'rank'; rankSpan.textContent = rankLabel(card.r);
  const pipSpan = document.createElement('span'); pipSpan.className = 'pip'; pipSpan.textContent = SUIT_GLYPH[card.s];
  node.append(rankSpan, pipSpan);

  if (zone.holds) {
    const held = Boolean(zone.holds[i]);
    node.dataset.held = String(held);
    node.disabled = Boolean(zone.disabled);
    node.setAttribute('aria-pressed', String(held));
    node.setAttribute('aria-label', `${name}, ${held ? 'held' : 'to be redrawn'}`);
    node.onclick = () => { try { audio.sfx('chip'); } catch {} zone.onCard(i); };
  } else if (zone.indices) {
    const isPicked = picked.has(zone.indices[i]);
    node.dataset.picked = String(isPicked);
    node.disabled = Boolean(zone.disabled);
    node.setAttribute('aria-pressed', String(isPicked));
    node.setAttribute('aria-label', `${name}, ${isPicked ? 'picked' : 'not picked'}`);
    node.onclick = () => { try { audio.sfx('chip'); } catch {} zone.onCard(zone.indices[i]); };
  } else {
    node.setAttribute('aria-label', name);
    node.disabled = true;
  }
  if (zone.flip && i === 1) node.classList.add('flip-in');
  return node;
}

function renderZones(zones) {
  const wrap = el('zones');
  wrap.innerHTML = '';
  for (const z of zones) {
    const zone = document.createElement('div');
    zone.className = 'zone';
    if (z.label) {
      const head = document.createElement('p');
      head.className = 'hint zone-head';
      head.textContent = '';
      head.append(document.createTextNode(z.label));
      if (z.note) {
        head.append(document.createTextNode(' '));
        const bold = document.createElement('b'); bold.textContent = z.note;
        head.appendChild(bold);
      }
      zone.appendChild(head);
    }
    const hand = document.createElement('div');
    hand.className = newDeal ? 'hand deal' : 'hand';
    z.cards.forEach((card, i) => hand.appendChild(cardNode(card, z, i)));
    zone.appendChild(hand);
    wrap.appendChild(zone);
  }
  newDeal = false;
}

function renderPlay() {
  if (gameId === 'videopoker') {
    renderZones([{ cards: round.hand, holds: round.holds, disabled: round.drawn, onCard: toggleVpHold }]);
    el('pays').textContent = round.drawn
      ? `Result: ${round.winLabel}. Your hold was ${round.holdBest ? 'the best play' : 'not the best play'}.`
      : `Holding ${round.holds.filter(Boolean).length} of 5 cards`;
    const hint = el('holdHint');
    if (hint && !round.drawn && !holdHintShown && !storedFlag('pg_hold_hint')) {
      holdHintShown = true;
      hint.hidden = false;
      setTimeout(() => { hint.hidden = true; try { localStorage.setItem('pg_hold_hint', '1'); } catch {} }, 6000);
    }
    if (round.drawn && hint) hint.hidden = true;
    return;
  }

  if (gameId === 'blackjack') {
    const up = sumHand([round.dealerUpcard]).total;
    const justRevealed = round.holeRevealed && !holeShown;
    holeShown = round.holeRevealed;
    const zones = [{
      label: 'Dealer',
      note: round.holeRevealed ? String(sumHand(round.dealerHand).total) : `shows ${up}`,
      cards: round.dealerHand,
      downAt: round.holeRevealed ? -1 : 1,
      flip: justRevealed,
    }];
    round.hands.forEach((hand, i) => {
      const t = sumHand(hand.cards);
      zones.push({
        label: round.hands.length > 1 ? `Hand ${i + 1} of ${round.hands.length}` : 'You',
        note: hand.status === 'bust' ? `Bust ${t.total}` : String(t.total),
        cards: hand.cards,
      });
    });
    renderZones(zones);
    el('pays').textContent = handDone
      ? outcomeLabel(round)
      : (round.hands.length > 1 ? `Hand ${round.activeHand + 1} of ${round.hands.length}` : 'Your move.');
    return;
  }

  if (gameId === 'baccarat') {
    // Baccarat is a knowledge quiz: answer the percentage question, never back
    // a side on a felt. Every number the player needs is on the odds panel.
    renderZones([]);
    const quiz = round?.quiz;
    if (handDone && quiz) {
      el('pays').textContent = `${quiz.correct}. ${quiz.reason}`;
      return;
    }
    el('pays').textContent = quiz ? quiz.prompt : '';
    return;
  }

  // hold'em
  renderZones([
    { label: 'Your hand', cards: round.hole, indices: [0, 1], disabled: handDone, onCard: togglePick },
    { label: 'Board', cards: round.community, indices: [2, 3, 4, 5, 6], disabled: handDone, onCard: togglePick },
  ]);
  el('pays').textContent = handDone
    ? `Your best five is ${round.result.label}.`
    : `Pick five of seven cards for your best hand. ${picked.size} picked.`;
}

function renderStatus() {
  if (gameId === 'videopoker') {
    if (!handDone && !coachedHand && !acted) {
      el('handGrade').textContent = 'Your call';
      setGauge(0, 'mid');
      el('potentialText').textContent = 'Choose the cards to keep, then press Draw.';
      return;
    }
    if (!handDone) {
      // The gauge reads the hand as it was dealt, so it only refreshes before
      // the draw; afterwards the panel reports what the hand actually became.
      renderPotential();
      return;
    }
    el('handGrade').textContent = round.winLabel;
    setGauge(Math.min(100, round.payout > 0 ? 25 + round.payout : 0),
      round.payout >= 25 ? 'high' : round.payout > 0 ? 'mid' : 'low');
    el('potentialText').textContent = round.payout > 0
      ? `${round.winLabel} pays ${round.payout} on this pay table.`
      : 'The draw made no paying hand. The hold was still the right play.';
    return;
  }

  if (gameId === 'blackjack') {
    if (handDone) {
      el('handGrade').textContent = outcomeLabel(round);
      setGauge(50, 'mid');
      el('potentialText').textContent = 'The hand is over. The coach will explain the result.';
      return;
    }
    if (!coachedHand && !acted) {
      el('handGrade').textContent = 'Your call';
      setGauge(0, 'mid');
      el('potentialText').textContent = 'Choose your answer.';
      return;
    }
    const best = bjBest(round);
    el('handGrade').textContent = best.action ? ACTION_LABEL[best.action] : 'Deal';
    setGauge((best.ev + 1) * 40, best.ev >= 0.1 ? 'high' : best.ev >= -0.1 ? 'mid' : 'low');
    el('potentialText').textContent = best.action
      ? `Best play: ${ACTION_LABEL[best.action]} · average result ${best.ev.toFixed(2)} per hand`
      : 'Natural. There is no decision left to make.';
    return;
  }

  if (gameId === 'baccarat') {
    if (!handDone && !coachedHand && !acted) {
      el('handGrade').textContent = 'Your call';
      setGauge(0, 'mid');
      el('potentialText').textContent = 'Choose your answer.';
      return;
    }
    const p = bacBest().probabilities;
    const quiz = round?.quiz;
    if (quiz?.type === 'commission') {
      el('handGrade').textContent = '0.95:1';
      setGauge(50, 'mid');
      el('potentialText').textContent = 'Banker wins pay 0.95:1 because of the 5% commission.';
      return;
    }
    if (quiz?.type === 'tieodds') {
      el('handGrade').textContent = `~${tieBreakEven().toFixed(1)}:1`;
      setGauge(50, 'mid');
      el('potentialText').textContent = 'The tie bet breaks even at that payout. Below it, the bet loses.';
      return;
    }
    el('handGrade').textContent = 'Banker';
    setGauge(p.banker * 100, 'mid');
    el('potentialText').textContent = `Banker wins ${(p.banker * 100).toFixed(1)}% of the time and has the lowest house edge.`;
    return;
  }

  // hold'em
  const cat = round.result.category;
  el('handGrade').textContent = round.result.label;
  setGauge((cat / 9) * 100, cat >= 5 ? 'high' : cat >= 3 ? 'mid' : 'low');
  el('potentialText').textContent = 'This is the best five-card hand these seven cards can make.';
}

/* ---------------- video poker pay tables ---------------- */
// Each variant reruns the same exact-EV search under a different pay table, so
// switching one changes both the paytable panel and the coach's best hold.
function renderVariantSelect() {
  const select = el('variantSelect');
  if (select.options.length !== VARIANTS.length) {
    select.replaceChildren();
    for (const v of VARIANTS) {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.name + (v.ratio ? ` (${v.ratio})` : '');
      select.appendChild(opt);
    }
  }
  select.value = dailyMode ? DEFAULT_VARIANT.id : vpVariantId;
  select.disabled = dailyMode;
}

function chooseVariant(id) {
  if (dailyMode) return;
  vpVariantId = variantById(id).id;
  // A hand not yet drawn is regraded under the new table; a finished hand keeps
  // the payout it was dealt.
  if (round && round.game === 'videopoker' && !round.drawn) {
    round.variantId = vpVariantId;
    vpKickoff(round);
  }
  advice = null;
  el('coachPanel').hidden = true;
  renderBattle();
  audio.sfx('chip');
}

function payRow(label, amt, on) {
  const wrap = document.createElement('div');
  wrap.className = on ? 'won' : '';
  const left = document.createElement('div');
  left.textContent = (on ? '> ' : '') + label;
  const right = document.createElement('div');
  right.className = 'amt' + (on ? ' won' : '');
  right.textContent = amt;
  wrap.append(left, right);
  return wrap;
}

function renderPaytable() {
  el('paytableTitle').textContent =
    gameId === 'baccarat' ? 'Odds'
      : gameId === 'holdem' ? 'Hand rankings'
        : gameId === 'videopoker' ? `Pay table · ${activePaytable().name}`
          : 'Pay table';
  const rows = [];

  if (gameId === 'videopoker') {
    // A finished hand keeps the table it was dealt under; before the draw the
    // panel follows the player's current selection.
    const variant = activePaytable();
    const wonRow = handDone && round ? rowForWin(variant, round.win) : null;
    for (const row of variant.rows) {
      rows.push(payRow(row.label, fmt(row.amount), row === wonRow));
    }
    rows.push(payRow('Nothing', '0', false));
  } else if (gameId === 'blackjack') {
    rows.push(payRow('Blackjack', '3:2', false));
    rows.push(payRow('Win', '+1', false));
    rows.push(payRow('Push', '0', false));
    rows.push(payRow('Lose', '-1', false));
  } else if (gameId === 'baccarat') {
    const best = bacBest();
    for (const alt of best.alternatives) {
      const on = !handDone && alt.side === best.side;
      const p = best.probabilities[alt.side];
      rows.push(payRow(
        `${alt.side.toUpperCase()} ${(p * 100).toFixed(1)}%`,
        `${alt.ev >= 0 ? '+' : ''}${alt.ev.toFixed(4)}`,
        on,
      ));
    }
  } else {
    for (let cat = 9; cat >= 0; cat--) {
      const on = handDone && round.result.category === cat;
      rows.push(payRow(CATEGORY_LABEL[cat], on ? 'Best' : '', on));
    }
  }

  el('paytable').replaceChildren(...rows);
}

function setControls() {
  el('handTitle').textContent = HAND_TITLE[gameId];
  const vp = gameId === 'videopoker';
  el('btnDeal').hidden = !vp;
  el('btnDraw').hidden = !vp;
  el('rowVariant').hidden = !vp;
  if (vp) renderVariantSelect();
  el('rowActions').hidden = gameId !== 'blackjack';
  el('rowBet').hidden = gameId !== 'baccarat';
  el('rowPick').hidden = gameId !== 'holdem';
  el('btnAsk').disabled = handDone;
  // The daily drill is scored as a clean read: no coach, so nobody can farm the
  // streak by copying answers. Hide it after a hand so a dead disabled control
  // does not invite repeated taps (the rageclick signal).
  el('btnAsk').hidden = dailyMode || handDone;

  if (vp) {
    // A fresh hand is dealt automatically. DEAL stays disabled while a hand is
    // live so it cannot be used to discard a bad deal and reroll for free.
    el('btnDeal').disabled = !handDone;
    el('btnDraw').disabled = handDone;
    el('btnDraw').classList.toggle('primary', !handDone);
    el('btnDeal').classList.toggle('primary', handDone);
    return;
  }
  if (gameId === 'blackjack') {
    const legal = handDone ? [] : legalActions(round);
    for (const [id, action] of [
      ['btnHit', 'hit'], ['btnStand', 'stand'], ['btnDouble', 'double'], ['btnSplit', 'split'],
    ]) {
      el(id).disabled = !legal.includes(action);
    }
    return;
  }
  if (gameId === 'baccarat') {
    if (round?.quiz) {
      renderQuizButtons();
      return;
    }
    for (const id of ['btnBanker', 'btnPlayer', 'btnTie']) el(id).disabled = handDone;
    return;
  }
  el('btnConfirm').disabled = handDone || picked.size !== 5;
  el('btnClear').disabled = handDone || picked.size === 0;
}

function updateBattlePips() {
  const pips = document.querySelectorAll('.battle-pips i');
  if (!pips.length) return;
  let done = 0;
  if (dailyMode && dailyRun) done = dailyRun.index;
  else if (shortSession) done = profile?.activeSession?.played ?? 0;
  else done = Math.min(handsWon ?? 0, pips.length);
  pips.forEach((pip, i) => pip.classList.toggle('done', i < done));
}

function renderBattle() {
  renderPlay();
  renderStatus();
  renderPaytable();
  setControls();
  updateBattlePips();
}

/* ---------------- first-hand nudge ---------------- */
function clearFirstNudge() {
  if (firstNudgeTimer) { clearTimeout(firstNudgeTimer); firstNudgeTimer = null; }
  document.getElementById('firstNudge')?.setAttribute('hidden', '');
  for (const id of ['rowActions', 'rowBet', 'rowPick']) document.getElementById(id)?.classList.remove('nudge');
  document.getElementById('btnDraw')?.classList.remove('nudge');
}

function scheduleFirstNudge() {
  if (handNumber !== 1) return;
  try { if (localStorage.getItem(FIRST_NUDGE_KEY)) return; } catch { /* storage blocked */ }
  firstNudgeTimer = setTimeout(() => {
    firstNudgeTimer = null;
    // Re-check at fire time: the hand can settle, or a decision can land, first.
    if (handNumber !== 1 || handDone || decisionsThisHand > 0) return;
    if (document.visibilityState !== 'visible') return;
    const copy = {
      blackjack: 'Your call — tap Hit, Stand, Double, or Split.',
      videopoker: 'Tap the cards you want to keep, then press Draw.',
      baccarat: 'Pick Banker, Player, or Tie.',
      holdem: 'Tap your best five, then press Confirm five.',
    }[gameId];
    if (!copy) return;
    const line = document.getElementById('firstNudge');
    if (!line) return;
    line.textContent = copy;
    line.hidden = false;
    const row = gameId === 'blackjack' ? document.getElementById('rowActions')
      : gameId === 'baccarat' ? document.getElementById('rowBet')
      : gameId === 'holdem' ? document.getElementById('rowPick')
      : document.getElementById('btnDraw');
    row?.classList.add('nudge');
    try { localStorage.setItem(FIRST_NUDGE_KEY, '1'); } catch { /* storage blocked */ }
    window.trackEvent?.('first_nudge', { game: gameId, mode: handMode() });
    firstNudgeTimer = setTimeout(clearFirstNudge, 9000);
  }, FIRST_NUDGE_DELAY_MS);
}

/* ---------------- battle: one hand in, one hand out ---------------- */
function startHand() {
  cancelAutoAdvance();
  clearFirstNudge();
  analytics.handStarted({ game: gameId, mode: dailyMode ? 'daily' : shortSession ? 'session' : 'challenge', entry: trainerEntry });
  handNumber += 1;
  decisionsThisHand = 0;
  handDone = false;
  acted = false;
  decisions = [];
  picked = new Set();
  advice = null;
  coachedHand = false;
  newDeal = true;
  holeShown = false;
  el('coachPanel').hidden = true;
  el('why').hidden = true;
  el('tipBox').hidden = true;
  el('sessionSummary').hidden = true;
  el('battleEndRow').hidden = true;

  const rng = dailyMode && dailyRun ? dailySeedRng(dailyRun.plan[dailyRun.index].seed) : null;
  // A drill session deals from a fixed bank of instructive situations instead
  // of a random deal. The coach still grades the hand exactly as always.
  // A new player's first practice hand must offer a decision, rather than
  // randomly ending on a natural. Daily and authored drills keep their deals.
  const introductory = shortSession && !dailyMode && !drillMode && gameId === 'blackjack'
    && profile.handsPlayed === 0 ? BLACKJACK_DRILLS.find(hand => hand.type === 'hard') : null;
  const drilled = drillMode ? drillHands[profile.activeSession?.played ?? 0] : introductory;
  drillLabel = drilled?.label ?? '';
  if (gameId === 'videopoker') {
    // The daily drill is the same for every trainer, so it always uses the
    // default pay table no matter which variant the player has selected.
    round = newVpRound(rng ?? Math.random, {
      hand: drilled?.hand ?? null,
      variantId: dailyMode ? DEFAULT_VARIANT.id : vpVariantId,
    });
    vpKickoff(round);
  } else if (gameId === 'blackjack') {
    round = newBjRound(rng ?? Math.random,
      drilled?.player ? { player: drilled.player, dealer: [drilled.dealer, drilled.hole] } : undefined);
  } else if (gameId === 'baccarat') {
    round = { quiz: quizFor(rng ?? Math.random) };
  } else {
    round = newHeRound(rng ?? Math.random);
  }

  analytics.handDealt(handToken(), {
    handIndex: handNumber,
    handTotal: dailyMode ? DAILY_HANDS : shortSession ? SESSION_HANDS : HANDS_TO_WIN,
    mode: handMode(),
  });
  renderBattle();
  audio.sfx('deal');
  const instructions = {
    videopoker: 'Tap the cards you want to keep. The cards you leave alone are replaced when you press Draw. The coach will explain the best hold afterwards.',
    blackjack: 'Look at your hand and the dealer’s upcard, then choose Hit, Stand, Double, or Split. Not sure? Ask the coach for a hint.',
    baccarat: 'Answer the percentage question. Every number you need is in the odds panel below.',
    holdem: 'Tap the five cards that make your best hand, then press Confirm five. Not sure? Ask the coach for a hint.',
  };
  const message = el('masterLine');
  clearInterval(message._typer);
  message._typer = null;
  const dailyIntro = dailyMode && dailyRun && dailyRun.index === 0
    ? 'This is the Daily Drill: five hands, one from each game. Make the play you think is best; the coach grades it and explains why after each hand. '
    : '';
  message.textContent = dailyIntro + instructions[gameId];
  el('masterPrompt').hidden = true;
  document.querySelector('.battle-label').textContent = dailyMode && dailyRun
    ? `Daily Drill #${dailyRun.number} · hand ${dailyRun.index + 1} of ${DAILY_HANDS}`
    : drillMode
      ? `${drillMode === 'weak' ? 'Weak-spot drill' : 'Master Drill'} · ${drillLabel ? sentence(drillLabel) : TRAINING_LABEL[gameId]} · ${profile.activeSession?.played ?? 0} of ${SESSION_HANDS}`
      : introductory ? `First practice · ${sentence(introductory.label)}`
      : shortSession ? `Five hands · ${profile.activeSession.played} of ${SESSION_HANDS} done` : `${canPractice(profile, gymId) ? 'Practice' : 'Gym challenge'} · ${handsWon} of ${HANDS_TO_WIN} good plays`;

  scheduleFirstNudge();

  // A natural settles before anybody gets to touch anything.
  if (gameId === 'blackjack' && round.settled) settleBlackjack();
}

function settleHand({ optimal, difficulty, line, review }) {
  if (handDone) return;
  handDone = true;
  analytics.handComplete(handToken(), {
    handIndex: handNumber,
    optimal: Boolean(optimal),
    decisions: decisionsThisHand,
    difficulty,
    mode: handMode(),
  });
  if (!firstDecisionEmitted && firstDecisionStart > 0) {
    firstDecisionEmitted = true;
    analytics.firstDecision(dailyMode ? dailyRun?.token : sessionToken, {
      ms: Math.round(performance.now() - firstDecisionStart),
      game: gameId,
      mode: dailyMode ? 'daily' : (shortSession ? 'session' : 'challenge'),
    });
  }

  const coached = coachedHand;

  if (dailyMode) return settleDailyHand({ optimal, difficulty, line, review });

  // A coached hand is a learning rep: it earns XP and practice history but
  // never a point, a streak step, or a place on the exam card. That is the
  // whole defence against farming the badge by copying the coach.
  if (!coached) handsAtGym++;

  const applied = applyResult(profile, { optimal, difficulty, game: GYM_BY_ID[gymId].game, coached });
  profile = applied.profile;
  if (!optimal && review) profile = recordMistake(profile, { game: gameId, ...review });
  if (optimal && !coached) handsWon++;
  if (shortSession && profile?.activeSession) {
    profile = { ...profile, activeSession: { ...profile.activeSession, dealt: (profile.activeSession.dealt || 0) + 1 } };
  }
  if (shortSession && !coached) {
    if (optimal) sessionBest = Math.max(sessionBest, profile.streak);
    else if (review) sessionMistakes.push(review);
    sessionResults.push(Boolean(optimal));
    profile = scoreSession(profile, optimal);
  }
  save();

  const gym = GYM_BY_ID[gymId];
  const rate = handsAtGym ? handsWon / handsAtGym : 0;
  const passed = !shortSession && handsAtGym >= HANDS_TO_WIN && rate >= PASS_RATE;

  renderBattle();
  el('battleEndRow').hidden = false;

  const say = coached
    ? `${gym.leader}: That was the coach’s answer. Read the explanation — this hand does not count.`
    : optimal
      ? `${gym.leader}: Good read. That was the best play.`
      : `${gym.leader}: Not quite. The better play was different — here is why.`;
  const gainLine = coached
    ? (optimal ? `Learning rep: +${fmt(applied.gained)} XP. No score and no streak change.` : 'Coached hand. No score. Read the review below.')
    : optimal
      ? `+${fmt(applied.points)} points · ${fmt(profile.streak)}-hand streak · +${fmt(applied.gained)} XP`
      : 'Your streak reset. The review explains the better play.';

  let verdict;
  const exhausted = !shortSession && !passed && handsAtGym >= HANDS_TO_WIN;
  if (coached) {
    verdict = shortSession
      ? `Coached hand — not counted toward your five. ${profile.activeSession ? `${profile.activeSession.played} of ${SESSION_HANDS} done.` : ''}`
      : `Coached hand — not counted on your card. ${handsWon} of ${handsAtGym} good plays so far.`;
    awaitingBadge = false;
  } else if (shortSession) {
    awaitingBadge = !profile.activeSession;
    const session = profile.activeSession ?? profile.sessions[0];
    verdict = awaitingBadge
      ? `Five hands complete: ${session.optimal} of ${SESSION_HANDS} correct decisions. Next: ${computeToday().label}.`
      : `Five hands: ${session.played} of ${SESSION_HANDS} done. ${session.optimal} correct so far.`;
  } else if (passed && canPractice(profile, gym.id)) {
    awaitingBadge = true;
    verdict = `${gym.leader}: Practice complete. Your badge is already earned. Come back to keep training.`;
  } else if (passed && !awaitingBadge) {
    awaitingBadge = true;
    const awarded = awardBadge(profile, gym.id);
    profile = awarded.profile;
    save();
    verdict = `${gym.leader}: Enough. You have the ${gym.badge}. Exam passed.`;
  } else if (passed) {
    verdict = `${gym.leader}: Well done. The badge is yours. Exam passed.`;
  } else if (exhausted) {
    // Ten hands is the exam. Below the pass line there is no eleventh hand.
    awaitingBadge = true;
    verdict = `${gym.leader}: Exam over. ${handsWon} of ${handsAtGym} good plays. You need ${Math.ceil(PASS_RATE * HANDS_TO_WIN)} of ${HANDS_TO_WIN}. Head back and try again when ready.`;
  } else {
    verdict = `${handsWon} of ${handsAtGym} good plays. You need ${Math.ceil(PASS_RATE * HANDS_TO_WIN)} of ${HANDS_TO_WIN}. Keep going.`;
  }

  // One cue per hand, in priority order: a badge outranks a level, which
  // outranks the win itself. A win after a streak raises the arpeggio one
  // semitone per step, capped at seven.
  const cue = passed ? 'badge' : exhausted ? 'lose' : applied.leveled ? 'level' : optimal ? 'win' : 'lose';
  const shift = cue === 'win' && profile.streak > 1 ? Math.min(profile.streak - 1, 7) : 0;
  audio.sfx(cue, shift);
  haptics.buzz(
    cue === 'badge' ? 'badge' : cue === 'level' ? 'level' : cue === 'win' ? 'correct' : 'wrong',
    audio.isMuted(),
  );

  if (optimal && !coached) floatText(`+${fmt(applied.points)}`, 'gain-float');
  if (applied.leveled) floatText('Level up!', 'xp-float');
  flashScene(optimal);

  if (shortSession && !profile.activeSession) renderSessionSummary(profile.sessions[0]);

  const full = `${line} ${say} ${gainLine} ${verdict}`;
  el('masterLine')._dataset = { full };
  el('masterPrompt').hidden = false;
  cancelAutoAdvance();
  typewriter(el('masterLine'), full, () => {
    if (dailyMode || awaitingBadge || reduceMotion()) return;
    if (!el('coachPanel').hidden) return;
    autoAdvanceTimer = setTimeout(() => {
      autoAdvanceTimer = null;
      if (!handDone || awaitingBadge || dailyMode) return;
      if (!el('coachPanel').hidden) return;
      el('btnNext').click();
    }, 3000);
  });

  advice = null;
  el('coachPanel').hidden = true;
  el('why').hidden = true;
  el('btnNext').textContent = awaitingBadge ? 'Back to home' : 'Next hand';
  maybeShowTip();
}

function maybeShowTip() {
  if (!tutorialTips.length) return;
  const tip = tutorialTips.shift();
  el('tipText').textContent = tip.text;
  el('tipBox').hidden = false;
}

function floatText(text, cls) {
  const scene = document.querySelector('#scr-battle .scene');
  if (!scene || reduceMotion()) return;
  const f = document.createElement('span');
  f.className = cls;
  f.textContent = text;
  scene.appendChild(f);
  setTimeout(() => f.remove(), 950);
}

function flashScene(optimal) {
  const scene = document.querySelector('#scr-battle .scene');
  if (!scene) return;
  const cls = optimal ? 'flash-ok' : 'shake';
  scene.classList.remove('flash-ok', 'shake');
  void scene.offsetWidth; // restart the animation if it is already applied
  scene.classList.add(cls);
  setTimeout(() => scene.classList.remove(cls), 520);
}

// A five-hand session ends with a compact recap: the score, the best streak
// reached, and one miss worth another look. One tap dismisses it.
// Optional tip link. Unlocks nothing; the app stays free.
const TIP_URL = 'https://ko-fi.com/playpokergym';
const TIP_HTML = `Play Poker Gym is free. If it helped, you can <a href="${TIP_URL}" target="_blank" rel="noopener">Support Play Poker Gym ☕</a> on Ko-fi.`;

function sessionStreak(profile) {
  const days = new Set();
  for (const s of (profile?.sessions ?? [])) {
    try { days.add(localDayKey(new Date(s.completedAt))); } catch {}
  }
  const daily = profile?.daily;
  if (daily?.lastKey) days.add(daily.lastKey);
  for (const entry of (daily?.history ?? [])) {
    if (typeof entry?.key === 'string') days.add(entry.key);
  }
  if (!days.size) return 0;
  const sorted = [...days].sort();
  const latest = sorted[sorted.length - 1];
  const today = localDayKey();
  const toKeyDate = (key) => { const [y, m, d] = String(key).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const gap = Math.round((toKeyDate(today) - toKeyDate(latest)) / 86400000);
  if (gap > 1) return 0;
  let streak = 0;
  let cursor = latest;
  while (days.has(cursor)) {
    streak += 1;
    const dt = toKeyDate(cursor);
    dt.setDate(dt.getDate() - 1);
    cursor = localDayKey(dt);
  }
  return streak;
}

function nextReminderLabel(now = new Date()) {
  // The Worker sends at 14:00 UTC. After today's drill, the useful reminder is
  // the next day's, so show that exact time in the player's own time zone.
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 14, 0, 0));
  try {
    return next.toLocaleString(undefined, {
      weekday: 'long', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    });
  } catch {
    return 'tomorrow morning';
  }
}

function renderSessionSummary(session, daily = null) {
  const box = el('sessionSummary');
  if (!box || (!session && !daily)) return;
  const results = daily ? daily.results : sessionResults;
  const total = daily ? DAILY_HANDS : SESSION_HANDS;
  const correct = daily ? results.filter(Boolean).length : session.optimal;
  const missed = results.filter(ok => !ok).length;
  const recapRunId = daily ? daily.token : sessionToken;
  const recapKind = daily ? 'daily' : 'session';
  const bestStreak = daily ? (profile?.daily?.streak ?? 0) : sessionBest;
  box.replaceChildren();
  const head = document.createElement('h2');
  head.textContent = daily ? `Daily Drill #${daily.number} complete` : 'Five hands complete';
  box.appendChild(head);

  const explain = document.createElement('p');
  explain.className = 'hint';
  explain.textContent = daily
    ? 'You played five hands from across the four games. Green squares are decisions you got right; red squares are the ones worth reviewing.'
    : 'You played five hands. Green squares are decisions you got right; red squares are the ones worth reviewing.';
  box.appendChild(explain);

  if (results.length > 0) {
    const grid = document.createElement('p');
    grid.className = 'session-grid';
    grid.setAttribute('aria-label', `${correct} of ${results.length} decisions correct`);
    grid.textContent = results.map(ok => ok ? '🟩' : '🟥').join('');
    box.appendChild(grid);
  }
  const score = document.createElement('p');
  score.className = 'hint';
  score.textContent = daily
    ? `You got ${correct} of ${total} decisions right · ${bestStreak}-day Daily streak`
    : `You got ${correct} of ${total} decisions right · best streak ${bestStreak}`;
  box.appendChild(score);
  if (correct === total - 1) {
    const near = document.createElement('p');
    near.className = 'hint';
    near.textContent = daily
      ? 'So close — one more correct would have been a perfect drill. Try again tomorrow?'
      : 'So close — one more correct would have been a perfect run. Play again?';
    box.appendChild(near);
  }
  // A regular session announces itself here; a daily already emitted
  // daily_complete in settleDailyHand. Never fire both.
  if (!daily) analytics.sessionComplete(sessionToken, { correct: session.optimal, hands: SESSION_HANDS });
  const miss = daily ? null : sessionMistakes[0];
  if (miss) {
    const detail = document.createElement('p');
    detail.className = 'hint';
    detail.textContent = `Worth another look: ${miss.situation} — ${miss.correction}`;
    box.appendChild(detail);
  }
  const dailyDone = daily ? true : Boolean(profile && dailyCompleted(profile, dailyKey()));
  const todayNum = dailyNumber(dailyKey());
  // Measurement: the recap is seen whenever a five-hand session or daily ends.
  analytics.recapView({ daily_done: dailyDone, missed, run_id: recapRunId, run_kind: recapKind });

  const actions = document.createElement('div');
  actions.className = 'row';
  if (missed > 0 && profile?.mistakes?.length) {
    const review = document.createElement('button');
    review.type = 'button';
    review.textContent = 'Review my mistakes';
    review.onclick = () => {
      analytics.recapTap({ button: 'review_mistakes', run_id: recapRunId });
      openReview();
    };
    actions.appendChild(review);
  }
  if (!daily && !dailyDone) {
    // Tomorrow hook: point the player at today's Daily Drill first.
    const dailyBtn = document.createElement('button');
    dailyBtn.type = 'button';
    dailyBtn.className = 'primary';
    dailyBtn.textContent = `Play Daily Drill #${todayNum}`;
    dailyBtn.onclick = () => {
      analytics.recapTap({ button: 'daily_drill', run_id: recapRunId });
      startDaily('recap');
    };
    actions.appendChild(dailyBtn);
  }

  const again = document.createElement('button');
  again.type = 'button';
  again.className = daily || dailyDone ? 'primary' : '';
  again.textContent = daily ? 'Replay this drill' : 'Play another five hands';
  again.onclick = () => {
    analytics.recapTap({ button: daily ? 'replay_daily' : 'play_again', run_id: recapRunId });
    box.hidden = true;
    if (daily) {
      dailyMode = false;
      dailyRun = null;
      startDaily('replay');
      return;
    }
    const gym = gymId ? GYM_BY_ID[gymId] : null;
    if (!gym || !profile) return;
    profile = beginSession(profile, gym.id);
    save();
    startGym(gym, true);
  };
  actions.appendChild(again);
  const challenge = document.createElement('button');
  challenge.type = 'button';
  challenge.textContent = 'Challenge a friend';
  challenge.onclick = async () => {
    const dayNum = dailyNumber(dailyKey());
    const shareId = newShareId();
    const text = daily
      ? dailyShareText(daily.key, daily.results, daily.number, null, shareId)
      : `Play Poker Gym: ${correct}/${SESSION_HANDS} correct in ${GYM_BY_ID[gymId]?.name ?? 'training'}. Beat my score on Daily Drill #${dayNum}: ${shareUrl(dayNum, shareId)}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Play Poker Gym Challenge', text });
        window.trackEvent?.('share', { channel: 'native', surface: daily ? 'recap_daily' : 'recap' });
        window.trackEvent?.('share_click', { game: daily ? 'daily' : (GYM_BY_ID[gymId]?.game ?? 'session'), channel: 'native', share_id: shareId });
      } else {
        await navigator.clipboard.writeText(text);
        window.trackEvent?.('share', { channel: 'copy', surface: daily ? 'recap_daily' : 'recap' });
        window.trackEvent?.('share_click', { game: daily ? 'daily' : (GYM_BY_ID[gymId]?.game ?? 'session'), channel: 'copy', share_id: shareId });
      }
      analytics.recapTap({ button: 'challenge', run_id: recapRunId });
    } catch (e) { /* user cancelled */ }
  };
  actions.appendChild(challenge);
  box.appendChild(actions);

  // Two different ways to come back tomorrow. Explain both before anyone taps,
  // and keep the browser-notification action visually separate from the file.
  const reminders = document.createElement('section');
  reminders.className = 'recap-reminders';
  const remindHead = document.createElement('h3');
  remindHead.textContent = 'Want a reminder for tomorrow?';
  reminders.appendChild(remindHead);
  const remindIntro = document.createElement('p');
  remindIntro.className = 'hint';
  remindIntro.textContent = 'These two options do different things. Pick the one that matches what you want.';
  reminders.appendChild(remindIntro);

  if (pushSupported()) {
    window.trackEvent?.('push_prompt_shown', { surface: 'recap' });
    const pushBox = document.createElement('div');
    pushBox.className = 'reminder-option reminder-push';
    const pushTitle = document.createElement('h4');
    pushTitle.textContent = 'Browser notification';
    const pushCopy = document.createElement('p');
    pushCopy.className = 'hint';
    pushCopy.textContent = 'Sends a notification to this browser tomorrow morning. It works on this device only. No email, no account.';
    const remind = document.createElement('button');
    remind.type = 'button';
    remind.className = 'primary reminder-push-button';
    remind.textContent = 'Turn on browser reminder';
    const pushStatus = document.createElement('p');
    pushStatus.className = 'reminder-status';
    pushStatus.setAttribute('role', 'status');
    pushStatus.hidden = true;
    const setPushState = (on, message, tone = '') => {
      remind.textContent = on ? 'Turn off browser reminders' : 'Turn on browser reminder';
      remind.classList.toggle('is-on', on);
      pushStatus.hidden = !message;
      pushStatus.textContent = message;
      pushStatus.className = `reminder-status${message ? ' is-visible' : ''}${tone ? ` ${tone}` : ''}`;
    };
    remind.onclick = async () => {
      const existing = await currentSubscription();
      remind.disabled = true;
      const result = existing ? await disablePush() : await enablePush();
      remind.disabled = false;
      window.trackEvent?.('push_opt_in', { result, surface: 'recap' });
      if (result === 'subscribed') {
        setPushState(true, `Reminders are on. Your next one arrives ${nextReminderLabel()}.`, 'is-on');
      } else if (result === 'unsubscribed') {
        setPushState(false, 'Reminders are off. You can turn them back on any time.');
      } else if (result === 'denied') {
        setPushState(false, 'Notifications are blocked for this site. Allow them in your browser settings, then try again.', 'is-error');
      } else if (result === 'dismissed') {
        setPushState(false, 'No permission was given, so reminders are still off.');
      } else {
        setPushState(false, 'Reminders could not be turned on. Check your connection and try again.', 'is-error');
      }
    };
    currentSubscription().then(sub => {
      if (sub) setPushState(true, `Reminders are on. Your next one arrives ${nextReminderLabel()}.`, 'is-on');
    });
    pushBox.append(pushTitle, pushCopy, remind, pushStatus);
    reminders.appendChild(pushBox);
  } else {
    const unsupported = document.createElement('p');
    unsupported.className = 'hint';
    unsupported.textContent = 'This browser can’t send notifications here. Add to Home Screen to get reminders. You can still download a calendar reminder below.';
    reminders.appendChild(unsupported);
  }

  const calBox = document.createElement('div');
  calBox.className = 'reminder-option reminder-calendar';
  const calTitle = document.createElement('h4');
  calTitle.textContent = 'Calendar file';
  const calCopy = document.createElement('p');
  calCopy.className = 'hint';
  calCopy.textContent = 'Downloads a calendar file (.ics) that you can open in your calendar app. It does not send a browser notification.';
  const calLink = document.createElement('a');
  calLink.className = 'calendar-download';
  calLink.textContent = 'Download calendar reminder (.ics)';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const end = new Date(tomorrow.getTime() + 15 * 60 * 1000);
  const toStamp = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `poker-gym-${tomorrow.toISOString().slice(0, 10)}@playpokergym.com`;
  const dtstamp = toStamp(new Date());
  const url = 'https://playpokergym.com/web/?daily=1&ref=ics';
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Poker Gym//Daily Drill//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${toStamp(tomorrow)}`,
    `DTEND:${toStamp(end)}`,
    'SUMMARY:Poker Gym Daily Drill',
    `DESCRIPTION:${url}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  calLink.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body);
  calLink.download = 'poker-gym-reminder.ics';
  calLink.onclick = () => {
    window.trackEvent?.('calendar_reminder', { surface: 'recap' });
    analytics.recapTap({ button: 'calendar_reminder', run_id: recapRunId });
  };
  calBox.append(calTitle, calCopy, calLink);
  reminders.appendChild(calBox);
  box.appendChild(reminders);

  if (missed > 0) {
    const handWord = missed === 1 ? 'hand' : 'hands';
    const line = document.createElement('p');
    line.className = 'hint';
    line.textContent = `${missed} missed ${handWord}. Review my mistakes opens your saved notebook. The next Daily Drill unlocks in ${formatDailyCountdown()}.`;
    box.appendChild(line);
  }

  // Streak from the first finished session: any five-hand session counts.
  const streak = daily ? bestStreak : sessionStreak(profile);
  if (streak > 0) {
    const streakLine = document.createElement('p');
    streakLine.textContent = `🔥 ${streak}-day streak — play tomorrow to make it ${streak + 1}`;
    box.appendChild(streakLine);
  }

  // Install / Add to Home Screen. Hidden when already installed; iPhone shows
  // instructions only (the browser prompt never fires on iOS); elsewhere the
  // button appears only when an install prompt is actually available.
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || '') && !window.MSStream;
  if (!standalone) {
    if (isIOS) {
      const installNote = document.createElement('p');
      installNote.className = 'hint';
      installNote.textContent = 'On iPhone, tap Share, then Add to Home Screen.';
      box.appendChild(installNote);
    } else {
      const existing = document.getElementById('btnInstall');
      const installBtn = document.createElement('button');
      installBtn.type = 'button';
      installBtn.textContent = 'Install app / add to home screen';
      installBtn.hidden = !existing || existing.hidden;
      installBtn.onclick = () => {
        analytics.recapTap({ button: 'install', run_id: recapRunId });
        if (existing && !existing.hidden) existing.click();
      };
      box.appendChild(installBtn);
      // Reveal the button later if the browser fires beforeinstallprompt.
      const syncInstall = () => { installBtn.hidden = !existing || existing.hidden; };
      window.addEventListener('beforeinstallprompt', syncInstall, { once: false });
    }
    window.addEventListener('appinstalled', () => {
      window.trackEvent?.('a2hs_installed', { display_mode: window.__pgAttribution?.display_mode || 'browser' });
    });
  }

  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.textContent = 'Close recap';
  dismiss.onclick = () => { box.hidden = true; };
  box.appendChild(dismiss);
  const fb = document.createElement('p');
  fb.className = 'hint';
  fb.innerHTML = 'Feedback? <a href="mailto:meep@mail.grokbot.com?subject=Poker%20Gym%20feedback">Email</a> · <a href="https://github.com/MeepTheTendie/pokergym/issues/1" target="_blank" rel="noopener noreferrer">GitHub</a>';
  box.appendChild(fb);
  const tip = document.createElement('p');
  tip.className = 'hint tip-link';
  tip.innerHTML = TIP_HTML;
  box.appendChild(tip);
  box.hidden = false;
}

function settleDailyHand({ optimal, difficulty, line, review }) {
  const run = dailyRun;
  if (run.scored) {
    const applied = applyResult(profile, { optimal, difficulty, game: GYM_BY_ID[gymId].game });
    profile = applied.profile;
    if (!optimal && review) profile = recordMistake(profile, { game: gameId, ...review });
  } else if (!optimal && review) {
    profile = recordMistake(profile, { game: gameId, ...review });
  }

  run.results = [...run.results, Boolean(optimal)].slice(0, DAILY_HANDS);
  run.index = run.results.length;
  if (run.index < DAILY_HANDS) {
    // Persist after every hand so a closed tab resumes from the last completed hand.
    profile = setDailyProgress(profile, { key: run.key, plan: run.plan, index: run.index, results: run.results });
  } else {
    profile = completeDaily(profile, run.key, run.results, run.plan.map(hand => hand.game));
    run.finished = true;
  }
  save();

  renderBattle();
  el('battleEndRow').hidden = false;

  const tally = run.results.filter(Boolean).length;
  if (run.finished) {
    analytics.dailyComplete(run.token, { correct: tally, number: run.number, scored: run.scored, hands: DAILY_HANDS });
    // Completing the daily is the habit loop. Give it the same return hooks
    // (share, install, calendar reminder, streak) as a five-hand session
    // instead of ending on a single line of verdict text.
    renderSessionSummary(null, run);
  }
  const say = optimal
    ? 'Good read. That was the best play.'
    : 'Not quite. The better play was different — the review explains why.';
  const verdict = run.finished
    ? (run.scored
        ? `Daily Drill #${run.number} complete: ${tally} of ${DAILY_HANDS} correct. Come back tomorrow for #${run.number + 1} (unlocks in ${formatDailyCountdown()}). Your streak is ${fmt(profile.daily.streak)}.${[3, 7, 14].includes(profile.daily.streak) ? ' Streak milestone!' : ''}`
        : `Practice replay done: ${tally} of ${DAILY_HANDS} correct. No new XP or score today.`)
    : `Daily Drill · hand ${run.index + 1} of ${DAILY_HANDS}. ${tally} correct so far.`;
  const full = `${line} ${say} ${verdict}`;
  el('masterLine')._dataset = { full };
  el('masterPrompt').hidden = false;
  typewriter(el('masterLine'), full);

  advice = null;
  el('coachPanel').hidden = true;
  el('why').hidden = true;
  el('btnNext').textContent = run.finished ? 'Back to home' : 'Next hand';
  const cue = run.finished ? 'badge' : optimal ? 'win' : 'lose';
  audio.sfx(cue);
  haptics.buzz(cue === 'badge' ? 'badge' : cue === 'win' ? 'correct' : 'wrong', audio.isMuted());
  flashScene(optimal);
}

/* ---- video poker ---- */
function toggleVpHold(index) {
  if (!round || round.drawn) return;
  toggleHold(round, index);
  advice = null;
  el('coachPanel').hidden = true;
  const hint = el('holdHint');
  if (hint) hint.hidden = true;
  try { localStorage.setItem('pg_hold_hint', '1'); } catch {}
  haptics.buzz('tap', audio.isMuted());
  renderBattle();
}

function doDraw() {
  if (!round || round.drawn || handDone) return;
  acted = true;
  trackDecision('draw');
  // Grade the hold against the coach's answer rather than against whatever
  // advice happens to be on screen: a hold played correctly without opening
  // the panel is still the correct hold.
  const best = vpBest();
  const optimal = best.optimal.some((pattern) => pattern.join('') === round.holds.join(''));
  const review = {
    situation: round.hand.map(cardLabel).join(' '),
    quiz: { choices: Array.from({ length: 32 }, (_, mask) => mask.toString(2).padStart(5, '0')),
      optimal: best.optimal.map(pattern => pattern.map(Number).join('')) },
    chosen: 'Hold ' + (round.hand.filter((_, i) => round.holds[i]).map(cardLabel).join(' ') || 'none'),
    correction: 'Hold ' + (round.hand.filter((_, i) => best.holds[i]).map(cardLabel).join(' ') || 'none') + `. Average return: ${best.ev.toFixed(3)} per hand on this pay table.`,
  };
  // The pay table lists the average return per hand. The draw result is shown
  // for learning; the decision score comes from the hold, not the payout.
  drawRound(round);
  round.holdBest = optimal;
  settleHand({
    optimal,
    difficulty: handDifficulty(round.result),
    review,
    line: `Result: ${round.winLabel}. Your hold was ${optimal ? 'the best play' : 'not the best play'}.`,
  });
}

/* ---- blackjack ---- */
function bjSituationType(round) {
  const cards = round.hands[round.activeHand].cards;
  if (cards.length === 2 && cards[0].r === cards[1].r) return 'pair';
  return sumHand(cards).soft ? 'soft' : 'hard';
}

function bjAct(action) {
  if (handDone || !round || round.settled) return;
  acted = true;
  const before = bjBest(round); // grade against the state the player is deciding in
  if (!legalActions(round).includes(action)) return;
  const review = {
    situation: `${round.hands[round.activeHand].cards.map(cardLabel).join(' ')} against ${cardLabel(round.dealerUpcard)}`,
    chosen: ACTION_LABEL[action],
    type: bjSituationType(round),
    quiz: { choices: legalActions(round), optimal: before.optimal ?? [before.action] },
    correction: `${ACTION_LABEL[before.action]}. Average result: ${before.ev.toFixed(3)} per hand under this gym’s rules.`,
  };
  if (action === 'hit') bjHit(round);
  else if (action === 'stand') bjStand(round);
  else if (action === 'double') bjDouble(round);
  else if (action === 'split') bjSplit(round);
  else return;

  decisions.push({ action, optimal: Boolean(before.optimal?.includes(action)), review });
  trackDecision(action);
  advice = null;
  el('coachPanel').hidden = true;
  el('why').hidden = true;

  if (round.settled) settleBlackjack();
  else renderBattle();
}

function settleBlackjack() {
  settleHand({
    // A round with no decision at all (a natural) cannot be played wrong.
    optimal: decisions.every((d) => d.optimal),
    review: decisions.find(d => !d.optimal)?.review,
    // handDifficulty reads a hand category, which blackjack rounds do not have
    // (round.result is a word). The difficulty here is the decision count: the
    // more places the player had to be right, the more a correct round is worth.
    difficulty: 1 + Math.min(decisions.length, 4) * 0.35,
    line: outcomeLabel(round),
  });
}

/* ---- baccarat ---- */
function renderQuizButtons() {
  const quiz = round?.quiz;
  const row = el('rowBet');
  if (!quiz) return;
  row.innerHTML = '';
  for (const option of quiz.options) {
    const button = document.createElement('button');
    button.textContent = option;
    button.dataset.quizAnswer = option;
    button.dataset.quizCorrect = option === quiz.correct ? 'true' : 'false';
    button.dataset.key = { BANKER: 'B', PLAYER: 'P', TIE: 'T' }[option] ?? String(quiz.options.indexOf(option) + 1);
    button.disabled = handDone;
    button.onclick = () => {
      audio.sfx('chip');
      bacAnswer(option);
    };
    row.appendChild(button);
  }
}

function bacAnswer(choice) {
  if (handDone || !round?.quiz) return;
  acted = true;
  trackDecision(choice);
  const quiz = round.quiz;
  const correct = choice === quiz.correct;
  settleHand({
    optimal: correct,
    difficulty: 1,
    review: {
      situation: quiz.prompt,
      chosen: choice,
      correction: quiz.reason,
      quiz: { choices: quiz.options, optimal: [quiz.correct] },
    },
    line: correct ? `Correct. ${quiz.correct}.` : `Not quite. ${choice} is not the answer. The answer is ${quiz.correct}.`,
  });
}

/* ---- hold'em ---- */
function togglePick(index) {
  if (handDone) return;
  if (picked.has(index)) picked.delete(index);
  else if (picked.size < 5) picked.add(index);
  renderBattle();
}

function heConfirm() {
  if (handDone || picked.size !== 5) return;
  acted = true;
  trackDecision('confirm');
  const chosen = round.hand7.filter((_, i) => picked.has(i));
  settleHand({
    optimal: playsBestFive(round.hand7, chosen),
    review: { quiz: bestFiveQuiz(round.hand7), situation: round.hand7.map(cardLabel).join(' '), chosen: chosen.map(cardLabel).join(' '), correction: `${round.result.label}: ${round.result.cards.map(cardLabel).join(' ')}. Choose five cards for the highest-ranking hand; equally ranked selections are accepted.` },
    difficulty: handDifficulty(round.result),
    line: `You read the board. Your best five is ${round.result.label}.`,
  });
}

/* ---------------- coach ---------------- */
function reasonFor(kept, variant = vpVariant()) {
  const pairPays = variant.minPairRank <= 14;
  const counts = {};
  for (const c of kept) counts[c.r] = (counts[c.r] ?? 0) + 1;
  const groups = Object.values(counts).sort((a, b) => b - a);
  const pairs = groups.filter((n) => n === 2).length;
  if (groups.includes(4)) return 'Four of a kind already pays, so keep all five cards.';
  if (groups.includes(3)) return 'Three of a kind. Keep the trips and draw two.';
  if (!pairPays && pairs > 0) return 'That pair does not pay, but it is still the best draw.';
  if (pairs === 2) return 'Two pair. Keep both pairs for four shots at a full house.';
  if (pairs === 1) {
    const r = Number(Object.keys(counts).find((k) => counts[k] === 2));
    return r >= 11
      ? 'Jacks or better pays, so build on the pair.'
      : 'The pair is below jacks, so it pays nothing. It is still the best hold.';
  }
  if (kept.length >= 3 && new Set(kept.map((c) => c.s)).size === 1) return `${kept.length} cards to a flush. Go for it.`;
  if (kept.length === 5) return 'This hand already pays, so keep all five cards.';
  if (kept.length === 4) return 'Four cards to an outside straight draw, with eight outs.';
  return 'This is the best chance of a paying hand from these cards.';
}

function buildAdvice() {
  if (handDone) return null;

  if (gameId === 'videopoker') {
    const best = vpBest();
    const kept = round.hand.filter((_, i) => best.holds[i]);
    return {
      holds: best.holds,
      text: `Keep ${kept.length} card${kept.length === 1 ? '' : 's'}. ${reasonFor(kept, variantById(round.variantId))} Average return: ${best.ev.toFixed(3)} per hand.`,
      why: `Best holds: ${best.options.slice(0, 3)
        .map((o) => `${o.keptCount} kept, ${o.ev.toFixed(2)} average return`).join('  ')}`,
      apply: () => { setHolds(round, best.holds); renderBattle(); },
    };
  }

  if (gameId === 'blackjack') {
    const best = bjBest(round);
    if (best.natural) {
      // A natural is already the best hand the round can have; it only reaches
      // here if a split somehow produced one, and then standing is the answer.
      return { text: 'Natural twenty-one. There is nothing left to decide.', why: 'Two cards. No decision.', apply: () => bjStand(round) };
    }
    if (!best.action) return null;
    return {
      text: `${ACTION_LABEL[best.action]}. Average result: ${best.ev.toFixed(3)} per hand.`,
      why: best.alternatives
        .map((o) => `${o.label}: ${o.ev >= 0 ? '+' : ''}${o.ev.toFixed(2)}`).join('  '),
      apply: () => bjAct(best.action),
    };
  }

  if (gameId === 'baccarat') {
    const quiz = round?.quiz;
    if (quiz && !quiz.deal) {
      return {
        text: `${quiz.correct}.`,
        why: quiz.reason,
        apply: () => bacAnswer(quiz.correct),
      };
    }
    const best = bacBest();
    const p = best.probabilities;
    return {
      text: `Banker has the lowest house edge. Average result: ${(best.ev * 100).toFixed(2)}% per hand. ${best.alternatives
        .map((o) => `${o.side} ${o.ev >= 0 ? '+' : ''}${(o.ev * 100).toFixed(2)}%`)
        .join('  ')}.`,
      why: `Win rates: Banker ${(p.banker * 100).toFixed(1)}% · Player ${(p.player * 100).toFixed(1)}% · Tie ${(p.tie * 100).toFixed(1)}%.`,
      apply: () => bacAnswer(best.side.toUpperCase()),
    };
  }

  // hold'em: the engine already evaluated all seven cards for the round
  const best = round.result;
  if (!best) return null;
  const labels = best.cards.map(cardLabel).join(' ');
  const board = evaluate5(round.community);
  const indices = best.cards.map((card) => round.hand7.indexOf(card));
  return {
    text: `Your best five is ${best.label}: ${labels}.`,
    why: `Pick ${labels}. The board alone makes ${board.label}.`,
    apply: () => { picked = new Set(indices); renderBattle(); },
  };
}

function showCoach() {
  if (handDone) return;
  advice = buildAdvice();
  if (!advice) return;
  el('advice').textContent = advice.text;
  el('why').hidden = true;
  el('coachPanel').hidden = false;
  // Opening the coach reveals the answer, so this hand is a learning rep: it can
  // still teach (XP, practice record) but it can never score or count.
  coachedHand = true;
  renderStatus();
}

el('btnAsk').onclick = () => { cancelAutoAdvance(); showCoach(); };
el('btnWhy').onclick = () => {
  if (!advice) return;
  el('why').textContent = advice.why;
  el('why').hidden = false;
};
el('btnApply').onclick = () => {
  if (!advice || handDone) return;
  advice.apply();
};

/* ---------------- battle controls ---------------- */
el('btnDeal').onclick = () => { cancelAutoAdvance(); if (handDone) el('btnNext').click(); };
el('btnDraw').onclick = doDraw;
el('btnHit').onclick = () => bjAct('hit');
el('btnStand').onclick = () => bjAct('stand');
el('btnDouble').onclick = () => bjAct('double');
el('btnSplit').onclick = () => bjAct('split');
el('btnBanker').onclick = () => bacAnswer('BANKER');
el('btnPlayer').onclick = () => bacAnswer('PLAYER');
el('btnTie').onclick = () => bacAnswer('TIE');
el('btnConfirm').onclick = heConfirm;
el('btnClear').onclick = () => { if (!handDone) { picked = new Set(); renderBattle(); } };

el('btnNext').onclick = () => {
  cancelAutoAdvance();
  // Hide the row immediately so a fast second tap cannot skip or double-deal
  // the next hand while the screen is changing.
  el('battleEndRow').hidden = true;
  if (dailyMode && dailyRun) {
    if (dailyRun.finished) {
      dailyMode = false;
      dailyRun = null;
      renderMap();
      show('scr-map');
      return;
    }
    loadDailyHand();
    return;
  }
  if (awaitingBadge) {
    awaitingBadge = false;
    renderMap();
    show('scr-map');
    return;
  }
  startHand();
};

function advanceCoachDialogue() {
  // Let players reveal and read feedback before a second activation moves on.
  if (finishTyping(el('masterLine')) || !handDone) return;
  el('btnNext').click();
}
el('masterBox').onclick = advanceCoachDialogue;
el('masterBox').onkeydown = (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    e.stopPropagation();
    advanceCoachDialogue();
  }
};

// Keyboard play (src/rpg/keys.js). A key only ever clicks a visible, enabled
// on-screen button or selects a card, so it can do nothing a click could not.
function usable(button) {
  return button && !button.disabled && button.getClientRects().length > 0 && !button.closest('[hidden]');
}
document.addEventListener('keydown', (e) => {
  const target = e.target instanceof Element ? e.target : null;
  if (shouldIgnoreKey({
    key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey,
    targetTag: target?.tagName, targetEditable: target?.isContentEditable, targetRole: target?.getAttribute('role'),
  })) return;
  const screen = document.querySelector('.screen:not([hidden])')?.id?.replace('scr-', '');
  const action = keyAction(e.key, { screen, game: gameId, handDone });
  if (!action) return;
  if (action.advance) { e.preventDefault(); advanceLesson(); return; }
  if (action.card !== undefined) {
    if (gameId === 'videopoker') {
      if (round && !round.drawn && !handDone) { e.preventDefault(); toggleVpHold(action.card); }
      return;
    }
    const card = el('zones').querySelectorAll('.card[data-picked]')[action.card];
    if (usable(card)) { e.preventDefault(); card.click(); }
    return;
  }
  if (action.option !== undefined || action.quiz) {
    const options = [...el('rowBet').querySelectorAll('button')];
    const choice = action.quiz ? options.find(b => b.dataset.quizAnswer === action.quiz) : options[action.option];
    if (usable(choice)) { e.preventDefault(); choice.click(); }
    return;
  }
  const button = action.buttons.map(id => el(id)).find(usable);
  if (button) { e.preventDefault(); button.click(); }
});

// Returning trainers land on their home screen; first-time visitors get dropped
// straight into a five-hand blackjack session so the first hand happens in one
// page load instead of two or three taps. The title screen (daily drill,
// choose style, etc.) is still reachable from HOME.
const returning = Boolean(profile);
let lastVisitDay = profile ? storedFlag('pg_last_visit_day') : null;
if (profile && !lastVisitDay) {
  const sessionDays = (profile.sessions ?? []).map(s => {
    try { return localDayKey(new Date(s.completedAt)); } catch { return null; }
  }).filter(Boolean);
  const dailyDays = (profile.daily?.history ?? []).map(e => e?.key).filter(k => typeof k === 'string');
  if (profile.daily?.lastKey) dailyDays.push(profile.daily.lastKey);
  const all = [...sessionDays, ...dailyDays].sort();
  // A save can exist before its first completed session or drill (someone who
  // opened the trainer and left). Without this fallback those returning visits
  // report a null gap, which is the exact shape seen on Oct 22-23. createdAt is
  // written when the save is created, so it always has a day to compare.
  let createdDay = null;
  try { createdDay = profile.createdAt ? localDayKey(new Date(profile.createdAt)) : null; } catch { createdDay = null; }
  lastVisitDay = all.length ? all[all.length - 1] : createdDay;
}
const daysSinceLastVisit = lastVisitDay ? dayGap(localDayKey(), lastVisitDay) : null;
// Write the visit day on every load, not only when a save exists. Otherwise a
// first-time visitor who comes back tomorrow still reports days_since_last_visit
// as null, and the retention report cannot measure the gap.
try { localStorage.setItem('pg_last_visit_day', localDayKey()); } catch {}
analytics.openTrainer({
  entry: trainerEntry,
  returning,
  days_since_last_visit: daysSinceLastVisit,
});
// Attach the save state to the stable device id created by the loader, so
// retention and funnel reports can segment by class, level and experience.
// Everything here is game state; no name, email or device fingerprint is sent.
if (typeof window.pgIdentify === 'function') {
  window.pgIdentify({
    trainer_class: profile?.classId ?? null,
    level: profile ? levelFromXp(profile.xp).level : null,
    hands_played: profile?.handsPlayed ?? 0,
    returning,
    days_since_last_visit: daysSinceLastVisit,
  });
}
function startFromEntry() {
  const wantsDaily = Boolean(entryParams.daily);
  const wantsPractice = Boolean(requestedGym);
  if (!wantsDaily && !wantsPractice) return false;
  if (!profile) {
    profile = createProfile(DEFAULT_CLASS);
    profile.createdAt = new Date().toISOString();
    save();
    applyPalette(DEFAULT_CLASS);
  }
  if (wantsDaily) {
    sharedDaily = false;
    startDaily('daily_link');
  } else {
    enterTraining();
  }
  return true;
}
if (!startFromEntry()) {
  if (profile) { renderMap(); show('scr-map'); }
  else { initTitle(); }
}
