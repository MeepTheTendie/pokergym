import { SUIT_GLYPH, SUIT_NAME, rankLabel, cardLabel } from '../src/cards.js';
import { CATEGORY_LABEL, evaluate5 } from '../src/evaluate.js';
import {
  newRound as newVpRound, toggleHold, setHolds, draw as drawRound, PAY_TABLE,
} from '../src/games/videopoker.js';
import { bestHold } from '../src/coach/videopoker.js';
import {
  newRound as newBjRound, legalActions, sumHand, outcomeLabel,
  hit as bjHit, stand as bjStand, double as bjDouble, split as bjSplit,
} from '../src/games/blackjack.js';
import { bestAction as bjBest, ACTION_LABEL } from '../src/coach/blackjack.js';
import { newRound as newBacRound } from '../src/games/baccarat.js';
import { bestBet as bacBest } from '../src/coach/baccarat.js';
import { newRound as newHeRound } from '../src/games/holdem.js';
import { playsBestFive } from '../src/coach/holdem.js';
import { CLASSES, CLASS_BY_ID, STAT_LABEL } from '../src/rpg/classes.js';
import { GYMS, GYM_BY_ID, gymForClass } from '../src/rpg/gyms.js';
import { lessonFor, hasCompletedLesson, markLessonDone } from '../src/rpg/lessons.js';
import {
  createProfile, applyResult, awardBadge, canBattle, levelFromXp,
  serialize, deserialize, handDifficulty,
} from '../src/rpg/state.js';
import { drawArt } from './sprites.js';
import audio from './audio.js';

const SAVE_KEY = 'pokergym:save:v1';
const HANDS_TO_WIN = 10;
const PASS_RATE = 0.7;
// Stakes for the table games. Small enough that a correct hand is always
// chip-positive (50 XP stipend +/- TABLE_BET), so the badge gate cannot be
// reached by a player who is correct but ruined.
const TABLE_BET = 20;

const HAND_TITLE = {
  videopoker: 'YOUR HAND',
  blackjack: 'THE TABLE',
  baccarat: 'THE SHOE',
  holdem: 'THE TABLE',
};

const el = (id) => document.getElementById(id);
const fmt = (n) => Number(n).toLocaleString('en-US');

let profile = deserialize(localStorage.getItem(SAVE_KEY));
let pendingClass = null;
let round = null;
let advice = null;
let gameId = 'videopoker';
let handDone = false;
let decisions = [];   // blackjack: one entry per action taken this round
let picked = new Set(); // hold'em: indices into round.hand7
let handsWon = 0;
let handsAtGym = 0;
let awaitingBadge = false;

function save() {
  if (profile) localStorage.setItem(SAVE_KEY, serialize(profile));
}

/* Music follows the screen: title and class select get the fanfare, the map
 * and lessons share the quiet overworld loop, and each gym has its own battle
 * theme. Nothing actually starts until the first click, because browsers will
 * not let an AudioContext run before a user gesture. */
const BATTLE_THEME = {
  pokergym: 'battle1',
  countyfair: 'battle2',
  villaoak: 'battle3',
  riverstone: 'battle4',
};
const AMBIENT = {
  'scr-title': 'title',
  'scr-class': 'title',
  'scr-map': 'map',
  'scr-lesson': 'map',
};

function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  el(id).hidden = false;
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
    if (canvas) drawSprite(canvas, idx);
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
  const hex = getComputedStyle(root).getPropertyValue('--gbc-0').trim();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && hex) meta.setAttribute('content', hex);
}

/* ---------------- sound ----------------------------------------------------
 * Browsers refuse to start an AudioContext before a user gesture, so the
 * context opens on the first click or keypress and any track show() already
 * asked for begins then. The switch itself is persisted next to the save.
 */
const btnSound = el('btnSound');

function renderSound() {
  const on = !audio.isMuted();
  btnSound.textContent = on ? 'SND ON' : 'SND OFF';
  btnSound.setAttribute('aria-pressed', String(on));
}

btnSound.onclick = () => {
  audio.toggleMute();
  renderSound();
};

for (const ev of ['pointerdown', 'keydown']) {
  window.addEventListener(ev, () => audio.unlock(), { capture: true, passive: true });
}

/* Every button ticks, except the one that is about the ticking. */
document.addEventListener('click', (e) => {
  const btn = e.target.closest?.('button');
  if (!btn || btn.id === 'btnSound') return;
  audio.sfx(btn.classList.contains('primary') ? 'confirm' : 'blip');
});

renderSound();

/* ---------------- title ---------------- */
function initTitle() {
  el('btnContinue').disabled = !profile;
  applyPalette(profile?.classId ?? null);
  show('scr-title');
}
el('btnContinue').onclick = () => { renderMap(); show('scr-map'); };
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
    card.innerHTML = `<span class="nm">${cls.name}</span><span class="bl">${gym.name}<br>${cls.blurb}</span>`;
    card.onclick = () => { pendingClass = cls.id; applyPalette(cls.id); renderClassSelect(); showClassDetail(cls); };
    grid.appendChild(card);
  }
  el('classDetail').hidden = true;
}

function showClassDetail(cls) {
  const gym = gymForClass(cls.id);
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
    b.innerHTML = `<span class="stat-label">${STAT_LABEL[key]}</span> ${stars}`;
    stats.appendChild(b);
  }
  el('classDetail').hidden = false;
  el('classDetail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

el('btnBack').onclick = () => {
  pendingClass = null;
  applyPalette(profile?.classId ?? null);
  renderClassSelect();
};
el('btnBecome').onclick = () => {
  if (!pendingClass) return;
  profile = createProfile(pendingClass);
  profile.createdAt = new Date().toISOString();
  save();
  applyPalette(pendingClass);
  renderMap();
  show('scr-map');
};

/* ---------------- map ---------------- */
function renderMap() {
  const cls = CLASS_BY_ID[profile.classId];
  const lvl = levelFromXp(profile.xp);
  renderSprite(profile);

  el('trainerLine').textContent = `${cls.name}  LV ${lvl.level}`;
  el('trainerStats').textContent =
    `${STAT_LABEL.focus} ${profile.stats.focus}  ${STAT_LABEL.nerve} ${profile.stats.nerve}  ${STAT_LABEL.read} ${profile.stats.read}`;
  el('xpBar').style.width = `${Math.round((lvl.into / lvl.needed) * 100)}%`;
  el('xpLine').textContent = `XP ${fmt(lvl.into)} / ${fmt(lvl.needed)}`;
  el('chipCount').textContent = fmt(profile.chips);

  const badges = el('badgeList');
  badges.innerHTML = '';
  for (const gym of GYMS) {
    const d = document.createElement('div');
    const owned = profile.badges.includes(gym.id);
    d.className = `badge${owned ? '' : ' locked'}`;
    d.textContent = gym.badgeGlyph;
    d.title = owned ? gym.badge : 'LOCKED';
    badges.appendChild(d);
  }

  const list = el('gymList');
  list.innerHTML = '';
  for (const gym of GYMS) {
    const cleared = profile.badges.includes(gym.id);
    const open = canBattle(profile, gym.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = open ? 'primary' : '';
    btn.style.width = '100%';
    btn.style.marginBottom = '8px';
    btn.disabled = !open;
    btn.innerHTML = `${gym.name}<br><span style="font-weight:400; font-size:9px;">${
      cleared ? 'BADGE EARNED' : open ? gym.leaderTitle : 'LOCKED'
    }</span>`;
    btn.onclick = () => startGym(gym);
    list.appendChild(btn);
  }
}

function startGym(gym) {
  gymId = gym.id;
  gameId = gym.game;
  handsWon = 0;
  handsAtGym = 0;
  awaitingBadge = false;
  el('foeName').textContent = gym.leader;
  el('masterName').textContent = gym.leader;
  renderSprite(profile);
  drawDealer(el('masterSprite'), gym.game);

  const lesson = lessonFor(gym.game);
  const begin = () => { show('scr-battle'); startHand(); };
  if (lesson && !hasCompletedLesson(profile, gym.game)) startLesson(gym.game, begin);
  else begin();
}

function typewriter(node, text, done) {
  let i = 0;
  node.textContent = '';
  clearInterval(node._typer);
  function tick() {
    node.textContent += text[i++];
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
  lesson._onDone = onDone;
  el('lessonTitle').textContent = lesson.title;
  el('lessonBar').innerHTML = lesson.pages.map(() => '<i></i>').join('');
  drawDealer(el('lessonDealer'), gameIdArg);
  show('scr-lesson');
  paintLessonPage();
}

function paintLessonPage() {
  const page = lesson.pages[lessonIndex];
  el('lessonWho').textContent = page.who;
  el('lessonText')._dataset = { full: page.text };
  el('lessonPage').textContent = `${lessonIndex + 1}/${lesson.pages.length}`;
  const pct = ((lessonIndex + 1) / lesson.pages.length) * 100;
  el('lessonGauge').style.width = `${pct}%`;
  [...el('lessonBar').children].forEach((n, i) => { n.classList.toggle('on', i <= lessonIndex); });
  el('lessonPrompt').hidden = true;
  typewriter(el('lessonText'), page.text, () => { el('lessonPrompt').hidden = false; });
  el('btnLessonNext').textContent = lessonIndex === lesson.pages.length - 1 ? 'FIGHT!' : 'NEXT';
}

function advanceLesson() {
  if (finishTyping(el('lessonText'))) return;
  if (lessonIndex < lesson.pages.length - 1) {
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

el('btnLessonNext').onclick = advanceLesson;
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

/* ---------------- hand potential gauge (video poker) ---------------- */
function gradeFor(ev) {
  if (ev >= 2.5) return { label: 'MONSTER', cls: 'high' };
  if (ev >= 1.2) return { label: 'SOLID', cls: 'mid' };
  if (ev >= 0.6) return { label: 'THIN', cls: 'mid' };
  return { label: 'DEAD', cls: 'low' };
}

function setGauge(pct, cls) {
  el('potentialBar').style.width = `${Math.max(0, Math.min(100, pct))}%`;
  el('potentialBar').parentElement.className = `gauge ${cls}`;
}

function renderPotential() {
  const best = bestHold(round.hand);
  const pct = Math.max(0, Math.min(100, (best.ev / 3) * 100));
  const g = gradeFor(best.ev);
  setGauge(pct, g.cls);
  el('handGrade').textContent = g.label;
  el('potentialText').textContent =
    g.label === 'DEAD'
      ? 'NOTHING HERE PAYS. THE BEST YOU CAN DO STILL LOSES.'
      : `BEST AVAILABLE RETURN IS ${best.ev.toFixed(2)} PER CREDIT.`;
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
  node.innerHTML = `<span>${rankLabel(card.r)}</span><span class="pip">${SUIT_GLYPH[card.s]}</span>`;

  if (zone.holds) {
    const held = Boolean(zone.holds[i]);
    node.dataset.held = String(held);
    node.disabled = Boolean(zone.disabled);
    node.setAttribute('aria-label', `${name}, ${held ? 'held' : 'discarded'}`);
    node.onclick = () => { audio.sfx('chip'); zone.onCard(i); };
  } else if (zone.indices) {
    node.dataset.picked = String(picked.has(zone.indices[i]));
    node.disabled = Boolean(zone.disabled);
    node.setAttribute('aria-label', `${name}, ${picked.has(zone.indices[i]) ? 'picked' : 'not picked'}`);
    node.onclick = () => { audio.sfx('chip'); zone.onCard(zone.indices[i]); };
  } else {
    node.setAttribute('aria-label', name);
    node.disabled = true;
  }
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
      head.innerHTML = z.note ? `${z.label} <b>${z.note}</b>` : z.label;
      zone.appendChild(head);
    }
    const hand = document.createElement('div');
    hand.className = 'hand';
    z.cards.forEach((card, i) => hand.appendChild(cardNode(card, z, i)));
    zone.appendChild(hand);
    wrap.appendChild(zone);
  }
}

function renderPlay() {
  if (gameId === 'videopoker') {
    renderZones([{ cards: round.hand, holds: round.holds, disabled: round.drawn, onCard: toggleVpHold }]);
    el('pays').textContent = round.drawn
      ? `YOU WON ${fmt(round.payout)} CHIPS`
      : `HOLDING ${round.holds.filter(Boolean).length} OF 5`;
    return;
  }

  if (gameId === 'blackjack') {
    const up = sumHand([round.dealerUpcard]).total;
    const zones = [{
      label: 'DEALER',
      note: round.holeRevealed ? String(sumHand(round.dealerHand).total) : `SHOWS ${up}`,
      cards: round.dealerHand,
      downAt: round.holeRevealed ? -1 : 1,
    }];
    round.hands.forEach((hand, i) => {
      const t = sumHand(hand.cards);
      zones.push({
        label: round.hands.length > 1 ? `HAND ${i + 1} OF ${round.hands.length} · BET ${fmt(hand.bet)}` : 'YOU',
        note: hand.status === 'bust' ? `BUST ${t.total}` : String(t.total),
        cards: hand.cards,
      });
    });
    renderZones(zones);
    const live = round.hands[round.activeHand];
    el('pays').textContent = handDone
      ? `NET ${round.payout >= 0 ? '+' : ''}${fmt(round.payout)} CHIPS`
      : `BET ${fmt(live.bet)} · HAND ${round.activeHand + 1} OF ${round.hands.length}`;
    return;
  }

  if (gameId === 'baccarat') {
    if (!round) {
      renderZones([]);
      el('pays').textContent = 'PLACE A BET. THE CARDS DO THE REST.';
      return;
    }
    renderZones([
      { label: 'PLAYER', note: String(round.playerTotal), cards: round.playerHand },
      { label: 'BANKER', note: String(round.bankerTotal), cards: round.bankerHand },
    ]);
    el('pays').textContent =
      `${round.result.toUpperCase()} · NET ${round.payout >= 0 ? '+' : ''}${fmt(round.payout)} CHIPS`;
    return;
  }

  // hold'em
  renderZones([
    { label: 'YOUR HAND', cards: round.hole, indices: [0, 1], disabled: handDone, onCard: togglePick },
    { label: 'BOARD', cards: round.community, indices: [2, 3, 4, 5, 6], disabled: handDone, onCard: togglePick },
  ]);
  el('pays').textContent = handDone
    ? `YOUR BEST FIVE IS ${round.result.label.toUpperCase()}.`
    : `PICK 5 OF 7 CARDS FOR YOUR BEST HAND. ${picked.size} PICKED.`;
}

function renderStatus() {
  if (gameId === 'videopoker') {
    if (!handDone) {
      // The gauge reads the hand as it was dealt, so it only refreshes before
      // the draw; afterwards the panel reports what the hand actually became.
      renderPotential();
      return;
    }
    const cat = round.result.category;
    el('handGrade').textContent = round.result.label.toUpperCase();
    setGauge((cat / 9) * 100, cat >= 5 ? 'high' : cat >= 3 ? 'mid' : 'low');
    el('potentialText').textContent = round.payout > 0
      ? `${round.result.label.toUpperCase()} PAYS ${round.payout} CREDITS.`
      : 'THE DRAW CHANGED NOTHING, AND NOTHING PAYS.';
    return;
  }

  if (gameId === 'blackjack') {
    if (handDone) {
      el('handGrade').textContent = outcomeLabel(round);
      setGauge(50, 'mid');
      el('potentialText').textContent = 'THE SHOE HAS SPOKEN.';
      return;
    }
    const best = bjBest(round);
    el('handGrade').textContent = best.action ? ACTION_LABEL[best.action] : 'DEAL';
    setGauge((best.ev + 1) * 40, best.ev >= 0.1 ? 'high' : best.ev >= -0.1 ? 'mid' : 'low');
    el('potentialText').textContent = best.action
      ? `BEST PLAY ${ACTION_LABEL[best.action]} · EV ${best.ev.toFixed(2)} PER BET`
      : 'NATURAL. NO DECISION LEFT TO MAKE.';
    return;
  }

  if (gameId === 'baccarat') {
    const best = bacBest();
    const p = best.probabilities;
    if (!round) {
      el('handGrade').textContent = best.side.toUpperCase();
      setGauge(p[best.side] * 100, 'mid');
      el('potentialText').textContent =
        `BEST BET WINS ${(p[best.side] * 100).toFixed(1)}% OF THE TIME`;
      return;
    }
    el('handGrade').textContent = round.result.toUpperCase();
    setGauge(p[round.result] * 100, round.result === 'tie' ? 'low' : 'mid');
    el('potentialText').textContent = `PLAYER ${round.playerTotal} · BANKER ${round.bankerTotal}`;
    return;
  }

  // hold'em
  const cat = round.result.category;
  el('handGrade').textContent = round.result.label.toUpperCase();
  setGauge((cat / 9) * 100, cat >= 5 ? 'high' : cat >= 3 ? 'mid' : 'low');
  el('potentialText').textContent = 'THE BEST FIVE CARD HAND THESE SEVEN CARDS MAKE.';
}

function payRow(label, amt, on) {
  const cls = on ? ' class="won"' : '';
  return `<div${cls}>${on ? '>' : ''}${label}</div><div class="amt${on ? ' won' : ''}">${amt}</div>`;
}

function renderPaytable() {
  el('paytableTitle').textContent =
    gameId === 'baccarat' ? 'ODDS' : gameId === 'holdem' ? 'RANKINGS' : 'PAYS';
  const rows = [];

  if (gameId === 'videopoker') {
    const result = handDone ? round.result : null;
    for (let cat = 9; cat >= 1; cat--) {
      const on = result?.category === cat;
      rows.push(payRow(CATEGORY_LABEL[cat], fmt(PAY_TABLE[cat]), on));
    }
    rows.push(payRow('NOTHING', '0', false));
  } else if (gameId === 'blackjack') {
    rows.push(payRow('BLACKJACK', '3:2', false));
    rows.push(payRow('WIN', '+1', false));
    rows.push(payRow('PUSH', '0', false));
    rows.push(payRow('LOSE', '-1', false));
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
      rows.push(payRow(CATEGORY_LABEL[cat], on ? 'BEST' : '', on));
    }
  }

  el('paytable').innerHTML = rows.join('');
}

function setControls() {
  el('handTitle').textContent = HAND_TITLE[gameId];
  const vp = gameId === 'videopoker';
  el('btnDeal').hidden = !vp;
  el('btnDraw').hidden = !vp;
  el('rowActions').hidden = gameId !== 'blackjack';
  el('rowBet').hidden = gameId !== 'baccarat';
  el('rowPick').hidden = gameId !== 'holdem';
  el('btnAsk').disabled = handDone;

  if (vp) {
    el('btnDeal').disabled = handDone;
    el('btnDraw').disabled = handDone;
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
    for (const id of ['btnBanker', 'btnPlayer', 'btnTie']) el(id).disabled = handDone;
    return;
  }
  el('btnConfirm').disabled = handDone || picked.size !== 5;
  el('btnClear').disabled = handDone || picked.size === 0;
}

function renderBattle() {
  renderPlay();
  renderStatus();
  renderPaytable();
  setControls();
}

/* ---------------- battle: one hand in, one hand out ---------------- */
function startHand() {
  handDone = false;
  decisions = [];
  picked = new Set();
  advice = null;
  el('coachPanel').hidden = true;
  el('why').hidden = true;
  el('battleEndRow').hidden = true;

  if (gameId === 'videopoker') {
    round = newVpRound();
  } else if (gameId === 'blackjack') {
    round = newBjRound(Math.random, { bet: TABLE_BET });
  } else if (gameId === 'baccarat') {
    round = null;
  } else {
    round = newHeRound();
  }

  renderBattle();
  audio.sfx('deal');

  // A natural settles before anybody gets to touch anything.
  if (gameId === 'blackjack' && round.settled) settleBlackjack();
}

function settleHand({ optimal, difficulty, payout, line }) {
  handDone = true;
  handsAtGym++;

  // The XP contract: correctness alone decides XP, difficulty scales it, and
  // payout only moves chips. A losing hand played correctly still pays in full.
  const applied = applyResult(profile, { optimal, difficulty, payout });
  profile = applied.profile;
  if (optimal) handsWon++;
  save();

  const gym = GYM_BY_ID[gymId];
  const rate = handsAtGym ? handsWon / handsAtGym : 0;
  const passed = handsAtGym >= HANDS_TO_WIN && rate >= PASS_RATE;

  renderBattle();
  el('battleEndRow').hidden = false;

  const say = optimal
    ? `${gym.leader}: GOOD READ. THAT IS THE PLAY.`
    : `${gym.leader}: NO. THE BETTER MOVE WAS DIFFERENT.`;
  const gainLine = optimal ? 'YOU GAIN ' + fmt(applied.gained) + ' XP.' : 'NO XP. WRONG DECISION.';

  let verdict;
  if (passed && !awaitingBadge) {
    awaitingBadge = true;
    const awarded = awardBadge(profile, gym.id);
    profile = awarded.profile;
    save();
    verdict = `${gym.leader}: ENOUGH. YOU HAVE THE ${gym.badge}. GYM BEATEN!`;
  } else if (passed) {
    verdict = `${gym.leader}: WELL DONE. THE BADGE IS YOURS. GYM BEATEN!`;
  } else {
    verdict = `${handsWon} OF ${handsAtGym} GOOD PLAYS. YOU NEED ${Math.ceil(PASS_RATE * HANDS_TO_WIN)} OF ${HANDS_TO_WIN}. KEEP GOING.`;
  }

  // One cue per hand, in priority order: a badge outranks a level, which
  // outranks the win itself.
  audio.sfx(passed ? 'badge' : applied.leveled ? 'level' : optimal ? 'win' : 'lose');

  if (applied.leveled) {
    const elMap = el('scr-map');
    const f = document.createElement('span');
    f.className = 'xp-float';
    f.textContent = `LEVEL UP +1`;
    elMap.appendChild(f);
    setTimeout(() => f.remove(), 950);
  }

  const full = `${line} ${say} ${gainLine} ${verdict}`;
  el('masterLine')._dataset = { full };
  el('masterPrompt').hidden = false;
  typewriter(el('masterLine'), full);

  advice = null;
  el('coachPanel').hidden = true;
  el('why').hidden = true;
  el('btnNext').textContent = awaitingBadge ? 'RETURN TO MAP' : 'NEXT HAND';
}

/* ---- video poker ---- */
function toggleVpHold(index) {
  if (!round || round.drawn) return;
  toggleHold(round, index);
  advice = null;
  el('coachPanel').hidden = true;
  renderBattle();
}

function doDraw() {
  if (!round || round.drawn || handDone) return;
  // Grade the hold against the coach's answer rather than against whatever
  // advice happens to be on screen: a hold played correctly without opening
  // the panel is still the correct hold.
  const best = bestHold(round.hand);
  const optimal = best.optimal.some((pattern) => pattern.join('') === round.holds.join(''));
  const heldBefore = round.holds.filter(Boolean).length;
  drawRound(round);
  settleHand({
    optimal,
    difficulty: handDifficulty(round.result),
    payout: round.payout * heldBefore,
    line: `${round.result.label} FOR ${fmt(round.payout)} CHIPS.`,
  });
}

/* ---- blackjack ---- */
function bjAct(action) {
  if (handDone || !round || round.settled) return;
  const before = bjBest(round); // grade against the state the player is deciding in
  if (!legalActions(round).includes(action)) return;
  if (action === 'hit') bjHit(round);
  else if (action === 'stand') bjStand(round);
  else if (action === 'double') bjDouble(round);
  else if (action === 'split') bjSplit(round);
  else return;

  decisions.push({ action, optimal: Boolean(before.optimal?.includes(action)) });
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
    // handDifficulty reads a hand category, which blackjack rounds do not have
    // (round.result is a word). The difficulty here is the decision count: the
    // more places the player had to be right, the more a correct round is worth.
    difficulty: 1 + Math.min(decisions.length, 4) * 0.35,
    payout: round.payout,
    line: round.log[round.log.length - 1] ?? outcomeLabel(round),
  });
}

/* ---- baccarat ---- */
function bacBet(side) {
  if (handDone) return;
  round = newBacRound(Math.random, side, TABLE_BET);
  settleHand({
    optimal: side === bacBest().side,
    difficulty: handDifficulty(round.result),
    payout: round.payout,
    line: round.log.join(' '),
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
  const chosen = round.hand7.filter((_, i) => picked.has(i));
  settleHand({
    optimal: playsBestFive(round.hand7, chosen),
    difficulty: handDifficulty(round.result),
    payout: 0,
    line: `YOU READ THE BOARD. IT IS ${round.result.label.toUpperCase()}.`,
  });
}

/* ---------------- coach ---------------- */
function reasonFor(kept) {
  const counts = {};
  for (const c of kept) counts[c.r] = (counts[c.r] ?? 0) + 1;
  const groups = Object.values(counts).sort((a, b) => b - a);
  const pairs = groups.filter((n) => n === 2).length;
  if (groups.includes(4)) return 'FOUR OF A KIND PAYS. HOLD IT ALL.';
  if (groups.includes(3)) return 'THREE OF A KIND. HOLD THE TRIPS, DRAW TWO.';
  if (pairs === 2) return 'TWO PAIR. HOLD BOTH FOR FOUR SHOTS AT TRIPS.';
  if (pairs === 1) {
    const r = Number(Object.keys(counts).find((k) => counts[k] === 2));
    return r >= 11
      ? 'JACKS OR BETTER PAYS. BUILD ON IT.'
      : 'BELOW JACKS, SO IT PAYS NOTHING. STILL THE BEST HOLD.';
  }
  if (kept.length >= 3 && new Set(kept.map((c) => c.s)).size === 1) return `${kept.length} TO A FLUSH. GO FOR IT.`;
  if (kept.length === 5) return 'ALREADY PAYING. HOLD IT ALL.';
  if (kept.length === 4) return 'FOUR TO AN OUTSIDE DRAW. EIGHT OUTS.';
  return 'BEST CHANCE OF PAYING FROM THESE.';
}

function buildAdvice() {
  if (handDone) return null;

  if (gameId === 'videopoker') {
    const best = bestHold(round.hand);
    const kept = round.hand.filter((_, i) => best.holds[i]);
    return {
      holds: best.holds,
      text: `HOLD ${kept.length}. ${reasonFor(kept)} EV ${best.ev.toFixed(3)}/CREDIT.`,
      why: `ALL 32 HOLDS: ${best.options.slice(0, 3)
        .map((o) => `${o.keptCount}HELD ${o.ev.toFixed(2)}`).join('  ')}`,
      apply: () => { setHolds(round, best.holds); renderBattle(); },
    };
  }

  if (gameId === 'blackjack') {
    const best = bjBest(round);
    if (best.natural) {
      // A natural is already the best hand the round can have; it only reaches
      // here if a split somehow produced one, and then standing is the answer.
      return { text: 'NATURAL TWENTY ONE. NOTHING LEFT TO DECIDE.', why: 'TWO CARDS. NO DECISION.', apply: () => bjStand(round) };
    }
    if (!best.action) return null;
    return {
      text: `${ACTION_LABEL[best.action]}. EV ${best.ev.toFixed(3)} PER BET.`,
      why: best.alternatives
        .map((o) => `${o.label} ${o.ev >= 0 ? '+' : ''}${o.ev.toFixed(2)}`).join('  '),
      apply: () => bjAct(best.action),
    };
  }

  if (gameId === 'baccarat') {
    const best = bacBest();
    const p = best.probabilities;
    return {
      text: `BET ${best.side.toUpperCase()}. ${best.alternatives
        .map((o) => `${o.side.toUpperCase()} ${o.ev >= 0 ? '+' : ''}${o.ev.toFixed(4)}`)
        .join('  ')} PER UNIT STAKED.`,
      why: `WIN RATES: BANKER ${(p.banker * 100).toFixed(1)}%  PLAYER ${(p.player * 100).toFixed(1)}%  TIE ${(p.tie * 100).toFixed(1)}%.`,
      apply: () => bacBet(best.side),
    };
  }

  // hold'em: the engine already evaluated all seven cards for the round
  const best = round.result;
  if (!best) return null;
  const labels = best.cards.map(cardLabel).join(' ');
  const board = evaluate5(round.community);
  const indices = best.cards.map((card) => round.hand7.indexOf(card));
  return {
    text: `YOUR BEST FIVE IS ${best.label.toUpperCase()}. ${labels}.`,
    why: `PICK ${labels}. BOARD ALONE MAKES ${board.label.toUpperCase()}.`,
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
}

el('btnAsk').onclick = showCoach;
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
el('btnDeal').onclick = () => startHand();
el('btnDraw').onclick = doDraw;
el('btnHit').onclick = () => bjAct('hit');
el('btnStand').onclick = () => bjAct('stand');
el('btnDouble').onclick = () => bjAct('double');
el('btnSplit').onclick = () => bjAct('split');
el('btnBanker').onclick = () => bacBet('banker');
el('btnPlayer').onclick = () => bacBet('player');
el('btnTie').onclick = () => bacBet('tie');
el('btnConfirm').onclick = heConfirm;
el('btnClear').onclick = () => { if (!handDone) { picked = new Set(); renderBattle(); } };

el('btnNext').onclick = () => {
  if (awaitingBadge) {
    awaitingBadge = false;
    renderMap();
    show('scr-map');
    return;
  }
  startHand();
};

el('masterBox').onclick = () => { finishTyping(el('masterLine')); if (!handDone) return; el('btnNext').click(); };
el('masterBox').onkeydown = (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    finishTyping(el('masterLine'));
    if (!handDone) return;
    el('btnNext').click();
  }
};

document.addEventListener('keydown', (e) => {
  if (!el('scr-lesson').hidden) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advanceLesson(); }
    return;
  }
  if (gameId === 'videopoker' && e.key >= '1' && e.key <= '5'
      && round && !round.drawn && !handDone && !el('scr-battle').hidden) {
    toggleVpHold(Number(e.key) - 1);
  }
});

initTitle();
