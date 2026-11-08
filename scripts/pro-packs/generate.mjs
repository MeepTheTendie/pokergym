// Generates Gym Pro practice pack data from the existing scenario/strategy engine.
// No hand-written EVs or correct actions: every answer is computed by the engine.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seededRng } from '../../src/cards.js';
import { bestAction, clearCache as clearBjCache, ACTION_LABEL } from '../../src/coach/blackjack.js';
import { bestHold, clearCache as clearVpCache } from '../../src/coach/videopoker.js';
import { variantById } from '../../src/games/videopoker.js';
import { playerDraws, bankerDraws } from '../../src/coach/baccarat.js';
import { roundWith, UPCARDS } from '../../test/blackjack-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../../data/pro-packs');
mkdirSync(outDir, { recursive: true });

const RANK_NAME = { 2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K',14:'A' };
const SUITS = ['s','h','d','c'];
const SUIT_NAME = { s:'spades', h:'hearts', d:'diamonds', c:'clubs' };

function cardStr(c) { return `${RANK_NAME[c.r]}${c.s}`; }
function handStr(cards) { return cards.map(cardStr).join(' '); }
function upStr(r) { return r === 14 ? 'A' : r === 10 ? '10' : String(r); }
function bjHandLabel(ranks) {
  if (ranks[0] === ranks[1]) return `${RANK_NAME[ranks[0]]}-${RANK_NAME[ranks[1]]}`;
  if (ranks.includes(14)) {
    const other = ranks.find(r => r !== 14);
    return `A-${RANK_NAME[other]} (soft ${11 + other})`;
  }
  const sum = ranks.reduce((a,b)=>a+(b===14?11:b>=10?10:b),0);
  return `${RANK_NAME[ranks[0]]}-${RANK_NAME[ranks[1]]} (hard ${sum})`;
}

function bjSpot(id, playerRanks, dealerUpRank, explanation) {
  clearBjCache();
  const round = roundWith(playerRanks, dealerUpRank);
  const result = bestAction(round);
  const alts = [...result.alternatives].sort((a,b)=>b.ev-a.ev);
  const best = alts[0];
  const second = alts.find(a => a.action !== best.action) ?? alts[1];
  const evGap = second ? +(best.ev - second.ev).toFixed(6) : 0;
  return {
    id,
    setup: {
      playerRanks: [...playerRanks],
      playerHand: bjHandLabel(playerRanks),
      dealerUpRank,
      dealerUpcard: upStr(dealerUpRank),
      rules: '6 decks, dealer stands on soft 17, double after split, no surrender',
    },
    correctAction: best.action,
    correctActionLabel: ACTION_LABEL[best.action] ?? best.action,
    engine: {
      ev: +best.ev.toFixed(6),
      evGap,
      alternatives: alts.map(a => ({ action: a.action, label: a.label, ev: +a.ev.toFixed(6) })),
    },
    explanation,
  };
}

// 20 soft-hand spots: A,2-A,9 vs varied upcards, covering hit/stand/double decisions.
function blackjackSoftHands() {
  const spots = [
    // A,7 borderline stand/double/hit
    bjSpot('bj-soft-01', [14,7], 2, 'Soft 18 vs 2 is a close stand; doubling and hitting lose a bit more expected value.'),
    bjSpot('bj-soft-02', [14,7], 3, 'Soft 18 vs 3 earns more by doubling: you can improve and the dealer is weak.'),
    bjSpot('bj-soft-03', [14,7], 6, 'Double soft 18 against a dealer 6 to press a strong edge.'),
    bjSpot('bj-soft-04', [14,7], 9, 'Soft 18 cannot stand profitably against a 9; hitting is the least costly play.'),
    bjSpot('bj-soft-05', [14,7], 10, 'Against a 10, hit soft 18 rather than standing on a likely loser.'),
    // A,6 double zone
    bjSpot('bj-soft-06', [14,6], 2, 'Soft 17 is too weak to stand vs 2; take a hit and try to improve.'),
    bjSpot('bj-soft-07', [14,6], 3, 'Double soft 17 vs 3: the dealer is vulnerable and you cannot bust on one card.'),
    bjSpot('bj-soft-08', [14,6], 4, 'Soft 17 becomes a strong double against a dealer 4.'),
    bjSpot('bj-soft-09', [14,6], 6, 'Double soft 17 vs 6, one of the best soft doubling spots.'),
    bjSpot('bj-soft-10', [14,6], 7, 'Against a 7, soft 17 should hit; standing gives up too much.'),
    // A,4/A,5 double zone
    bjSpot('bj-soft-11', [14,5], 4, 'Double soft 16 vs 4: one card cannot bust you and the dealer may break.'),
    bjSpot('bj-soft-12', [14,5], 6, 'Soft 16 is a clear double against a dealer 6.'),
    bjSpot('bj-soft-13', [14,4], 4, 'Double soft 15 vs 4; hitting is weaker when the dealer shows weakness.'),
    bjSpot('bj-soft-14', [14,4], 7, 'Soft 15 should hit against a 7 because standing wins too rarely.'),
    // A,2/A,3
    bjSpot('bj-soft-15', [14,3], 5, 'Double soft 14 vs 5 to take advantage of dealer weakness.'),
    bjSpot('bj-soft-16', [14,3], 6, 'Soft 14 is a profitable double against a dealer 6.'),
    bjSpot('bj-soft-17', [14,2], 6, 'Double soft 13 vs 6; you need improvement and cannot bust on the next card.'),
    bjSpot('bj-soft-18', [14,2], 10, 'Soft 13 has no standing value against a 10, so hit.'),
    // Strong soft hands
    bjSpot('bj-soft-19', [14,8], 6, 'Soft 19 is already strong; stand and let the dealer play into a 6.'),
    bjSpot('bj-soft-20', [14,9], 10, 'Soft 20 is a stand even against a 10 because improving it is very unlikely.'),
  ];
  return packFile('blackjack-soft-hands', 'Blackjack Soft Hands', '20 graded soft-hand decisions (A,2-A,9) using exact expected value from the blackjack engine.', spots);
}

// 20 pair/split spots.
function blackjackPairsSplits() {
  const spots = [
    bjSpot('bj-pair-01', [14,14], 6, 'Always split aces: two chances to make strong hands beats one soft 12.'),
    bjSpot('bj-pair-02', [14,14], 10, 'Split aces even against a 10; one soft 12 is a poor starting point.'),
    bjSpot('bj-pair-03', [8,8], 10, 'Split 8s against a 10 to escape hard 16, the worst common total.'),
    bjSpot('bj-pair-04', [8,8], 14, 'Split 8s vs ace: hard 16 is still a losing hand, so splitting loses less.'),
    bjSpot('bj-pair-05', [8,8], 6, 'Split 8s against a 6; two hands starting at 8 beat standing on 16.'),
    bjSpot('bj-pair-06', [9,9], 7, 'Stand on 18 vs 7; splitting 9s gives up a strong made total.'),
    bjSpot('bj-pair-07', [9,9], 9, 'Split 9s against a 9 because two hands starting at 9 outplay standing on 18.'),
    bjSpot('bj-pair-08', [9,9], 10, 'Stand on 18 vs 10; splitting exposes more money to a strong upcard.'),
    bjSpot('bj-pair-09', [9,9], 14, 'Stand on 18 vs ace; the split is close but standing keeps the better total.'),
    bjSpot('bj-pair-10', [7,7], 7, 'Split 7s vs 7: hard 14 is weak, and matching the dealer favors splitting.'),
    bjSpot('bj-pair-11', [7,7], 8, 'Hit 7s vs 8; splitting is not worth it when the dealer shows strength.'),
    bjSpot('bj-pair-12', [6,6], 6, 'Split 6s vs 6 (DAS rules): hard 12 improves into two hands against weakness.'),
    bjSpot('bj-pair-13', [6,6], 7, 'Hit 6s vs 7; do not split into a dealer hand that often makes 17.'),
    bjSpot('bj-pair-14', [4,4], 5, 'Hit 4s vs 5 in this game; you cannot split and 8 is a hand to build, not double.'),
    bjSpot('bj-pair-15', [4,4], 6, 'Hit 4s vs 6; splitting fours is not available here, so treat it as hard 8.'),
    bjSpot('bj-pair-16', [3,3], 7, 'Split 3s vs 7: hard 6 is terrible, and two draws from 3 have better prospects.'),
    bjSpot('bj-pair-17', [2,2], 7, 'Split 2s vs 7 to break up hard 4 when the dealer is not dominant.'),
    bjSpot('bj-pair-18', [2,2], 3, 'Split 2s vs 3; hard 4 plays poorly, so start two hands instead.'),
    bjSpot('bj-pair-19', [10,10], 6, 'Never split 10s: 20 is a premium total even against a dealer 6.'),
    bjSpot('bj-pair-20', [5,5], 10, 'Do not split 5s; treat them as hard 10 and hit against a dealer 10.'),
  ];
  return packFile('blackjack-pairs-splits', 'Blackjack Pairs and Splits', '20 graded pair decisions using exact expected value from the blackjack engine.', spots);
}

// 20 Jacks or Better 9/6 hold spots, deterministic hands.
function jacksOrBetterHolds() {
  const v = variantById('jacks-or-better');
  const rng = seededRng(0xC0FFEE);
  const deck = [];
  for (let r = 2; r <= 14; r++) for (let s = 0; s < 4; s++) deck.push({ r, s });
  function drawHand() {
    const d = deck.slice();
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [d[i],d[j]]=[d[j],d[i]]; }
    return d.slice(0, 5);
  }
  function holdLabel(holds) {
    const kept = holds.map((h,i)=>h?i:null).filter(i=>i!==null);
    if (kept.length === 0) return 'Hold nothing (draw 5)';
    return `Hold ${kept.map(i => cardStr(spots_hand[i])).join(', ')}`;
  }
  // hand-picked + seeded to get clear, varied decisions; we still compute answers from engine.
  const fixedHands = [
    [{r:11,s:0},{r:11,s:1},{r:7,s:2},{r:4,s:3},{r:2,s:0}], // pair of jacks
    [{r:14,s:0},{r:14,s:1},{r:9,s:2},{r:5,s:3},{r:3,s:0}], // pair of aces
    [{r:8,s:0},{r:8,s:1},{r:8,s:2},{r:13,s:3},{r:4,s:0}], // trips
    [{r:10,s:0},{r:11,s:0},{r:12,s:0},{r:13,s:0},{r:9,s:1}], // 4 to royal
    [{r:10,s:0},{r:11,s:0},{r:12,s:0},{r:13,s:0},{r:2,s:1}], // 4 to royal (low kicker)
    [{r:9,s:0},{r:10,s:0},{r:11,s:0},{r:12,s:0},{r:4,s:1}], // open straight draw? 9-Q
    [{r:5,s:0},{r:6,s:0},{r:7,s:0},{r:8,s:0},{r:13,s:1}], // 4 to straight flush / open
    [{r:2,s:0},{r:5,s:0},{r:9,s:0},{r:11,s:0},{r:3,s:1}], // 4 flush (1 high)
    [{r:2,s:0},{r:5,s:0},{r:9,s:0},{r:7,s:0},{r:3,s:1}], // 4 flush (no high)
    [{r:10,s:0},{r:11,s:1},{r:12,s:2},{r:13,s:3},{r:6,s:0}], // open-ended straight draw K-high
    [{r:14,s:0},{r:13,s:1},{r:12,s:2},{r:11,s:3},{r:2,s:0}], // AKQJ (gutshot/broadway draw context)
    [{r:9,s:0},{r:9,s:1},{r:5,s:2},{r:5,s:3},{r:14,s:0}], // two pair
    [{r:11,s:0},{r:11,s:1},{r:11,s:2},{r:11,s:3},{r:4,s:0}], // quads
    [{r:10,s:0},{r:10,s:1},{r:7,s:2},{r:3,s:3},{r:2,s:0}], // low pair (tens - paying pair)
    [{r:9,s:0},{r:9,s:1},{r:14,s:2},{r:13,s:3},{r:4,s:0}], // low pair + 2 high cards
    [{r:14,s:0},{r:13,s:0},{r:12,s:0},{r:5,s:1},{r:2,s:2}], // 3 to royal
    [{r:14,s:0},{r:11,s:1},{r:8,s:2},{r:4,s:3},{r:2,s:0}], // A + J suited? no, mixed; has high cards
    [{r:7,s:0},{r:8,s:1},{r:9,s:2},{r:10,s:3},{r:3,s:0}], // open straight draw, no high pair
    [{r:6,s:0},{r:7,s:0},{r:8,s:0},{r:10,s:1},{r:11,s:2}], // 3 to straight flush-ish? 6,7,8 suited
    [{r:14,s:0},{r:13,s:0},{r:4,s:1},{r:7,s:2},{r:9,s:3}], // suited A,K only
  ];

  let spots_hand;
  const spots = fixedHands.slice(0, 20).map((hand, idx) => {
    spots_hand = hand;
    clearVpCache();
    const result = bestHold(hand, { variant: v });
    const opts = [...result.options].sort((a,b)=>b.ev-a.ev);
    const best = opts[0];
    const second = opts.find(o => o.ev < best.ev - 1e-9) ?? opts[1];
    const evGap = second ? +(best.ev - second.ev).toFixed(6) : 0;
    const keptCards = hand.filter((_,i)=>best.holds[i]);
    const heldIdx = best.holds.map((h,i)=>h?i:null).filter(x=>x!==null);
    const explanation = explainVp(hand, best.holds, best.ev, second ? (best.ev-second.ev) : 0);
    return {
      id: `vp96-${String(idx+1).padStart(2,'0')}`,
      setup: {
        hand: hand.map(c => ({ r: c.r, s: c.s, card: cardStr(c) })),
        handDisplay: handStr(hand),
        variant: 'jacks-or-better',
        payTable: '9/6 (full house 9, flush 6)',
      },
      correctAction: {
        holds: best.holds,
        heldIndices: heldIdx,
        heldCards: keptCards.map(cardStr),
        label: heldIdx.length ? `Hold ${keptCards.map(cardStr).join(', ')}` : 'Draw 5',
      },
      engine: {
        ev: +best.ev.toFixed(6),
        evGap,
        alternatives: opts.slice(0, 5).map(o => ({
          holds: o.holds,
          heldCards: hand.filter((_,i)=>o.holds[i]).map(cardStr),
          ev: +o.ev.toFixed(6),
        })),
      },
      explanation,
    };
  });
  return packFile('jacks-or-better-holds-96', 'Jacks or Better Holds (9/6)', '20 graded 9/6 Jacks or Better hold decisions using exact draw expected value from the video poker engine.', spots);
}

function explainVp(hand, holds, ev, gap) {
  const kept = hand.filter((_,i)=>holds[i]);
  if (kept.length === 0) return 'No made hand or strong draw is worth keeping, so drawing five new cards has the highest expected return.';
  if (kept.length === 5) return 'The dealt hand is already a made paying hand; holding all five preserves its full value.';
  const ranks = kept.map(c=>c.r).sort((a,b)=>a-b);
  const sameRank = kept.every(c=>c.r===kept[0].r);
  const suited = kept.every(c=>c.s===kept[0].s);
  if (sameRank && kept.length >= 2) return `Keeping the ${kept.length === 2 ? 'pair' : kept.length === 3 ? 'three of a kind' : 'four of a kind'} gives the best expected return (${ev.toFixed(3)} credits).`;
  if (suited && kept.length === 4) return 'Four to a flush is stronger here than breaking it up; hold the four suited cards and draw one.';
  if (kept.length === 4) return 'The four-card draw has higher expected value than keeping a weaker made piece or drawing more cards.';
  if (suited && kept.length === 3) return 'Three suited high cards offer strong royal/flush/straight potential; hold them over weaker alternatives.';
  return `Holding ${kept.map(cardStr).join(', ')} maximizes expected value at ${ev.toFixed(3)} credits for this 9/6 hand.`;
}

// 20 baccarat third-card rule spots.
function baccaratThirdCardRule() {
  // each spot: setup describes decision point; correctAction is draw/stand; ruleReason from engine.
  const spots = [];
  let n = 0;
  const add = (id, setup, action, ruleReason, explanation) => {
    spots.push({ id, setup, correctAction: action, correctActionLabel: action === 'draw' ? 'Draw' : 'Stand', engine: { evGap: null, ruleReason }, explanation });
  };
  // Player decisions (initial totals 0-7; 8-9 are naturals, no decision)
  add('bac-01', { actor:'player', playerTotal:0, note:'Player initial two-card total' }, playerDraws(0)?'draw':'stand', 'playerDraws(0)=true (total <= 5)', 'Player draws on totals 0 through 5.');
  add('bac-02', { actor:'player', playerTotal:3, note:'Player initial two-card total' }, playerDraws(3)?'draw':'stand', 'playerDraws(3)=true (total <= 5)', 'A player total of 3 requires a third card.');
  add('bac-03', { actor:'player', playerTotal:5, note:'Player initial two-card total' }, playerDraws(5)?'draw':'stand', 'playerDraws(5)=true (total <= 5)', 'Player draws on 5; it is the highest total that still takes a card.');
  add('bac-04', { actor:'player', playerTotal:6, note:'Player initial two-card total' }, playerDraws(6)?'draw':'stand', 'playerDraws(6)=false (total >= 6)', 'Player stands on 6 and does not take a third card.');
  add('bac-05', { actor:'player', playerTotal:7, note:'Player initial two-card total' }, playerDraws(7)?'draw':'stand', 'playerDraws(7)=false (total >= 6)', 'Player stands on 7; only naturals 8 and 9 are higher before the draw phase resolves.');

  // Banker when player stood (player third undefined)
  add('bac-06', { actor:'banker', bankerTotal:2, playerStood:true, playerThirdValue:null, note:'Player stood (total 6 or 7)' }, bankerDraws(2, undefined)?'draw':'stand', 'bankerDraws(2, undefined)=true (total <= 5)', 'When the player stands, banker draws on 0 through 5.');
  add('bac-07', { actor:'banker', bankerTotal:5, playerStood:true, playerThirdValue:null, note:'Player stood (total 6 or 7)' }, bankerDraws(5, undefined)?'draw':'stand', 'bankerDraws(5, undefined)=true (total <= 5)', 'Banker draws on 5 when the player did not take a third card.');
  add('bac-08', { actor:'banker', bankerTotal:6, playerStood:true, playerThirdValue:null, note:'Player stood (total 6 or 7)' }, bankerDraws(6, undefined)?'draw':'stand', 'bankerDraws(6, undefined)=false (total >= 6)', 'Banker stands on 6 when the player stands.');

  // Banker responses to player's third card (key third-card rule cases)
  add('bac-09', { actor:'banker', bankerTotal:3, playerStood:false, playerThirdValue:8, note:"Player drew a third card with value 8" }, bankerDraws(3,8)?'draw':'stand', 'bankerDraws(3, 8)=false (banker 3 stands vs player third 8)', 'Banker total 3 draws against most player third cards, but stands if the player drew an 8.');
  add('bac-10', { actor:'banker', bankerTotal:3, playerStood:false, playerThirdValue:7, note:"Player drew a third card with value 7" }, bankerDraws(3,7)?'draw':'stand', 'bankerDraws(3, 7)=true (banker 3 draws vs player third 7)', 'Against a player third card of 7, banker total 3 takes another card.');
  add('bac-11', { actor:'banker', bankerTotal:4, playerStood:false, playerThirdValue:1, note:"Player drew a third card with value 1 (Ace)" }, bankerDraws(4,1)?'draw':'stand', 'bankerDraws(4, 1)=false (player third not in 2-7)', 'Banker total 4 draws only when the player third card is 2 through 7.');
  add('bac-12', { actor:'banker', bankerTotal:4, playerStood:false, playerThirdValue:2, note:"Player drew a third card with value 2" }, bankerDraws(4,2)?'draw':'stand', 'bankerDraws(4, 2)=true (player third in 2-7)', 'A player third card of 2 makes banker total 4 draw.');
  add('bac-13', { actor:'banker', bankerTotal:4, playerStood:false, playerThirdValue:7, note:"Player drew a third card with value 7" }, bankerDraws(4,7)?'draw':'stand', 'bankerDraws(4, 7)=true (player third in 2-7)', 'Banker total 4 still draws against a player third card of 7.');
  add('bac-14', { actor:'banker', bankerTotal:4, playerStood:false, playerThirdValue:8, note:"Player drew a third card with value 8" }, bankerDraws(4,8)?'draw':'stand', 'bankerDraws(4, 8)=false (player third not in 2-7)', 'Banker total 4 stands when the player third card is 8 or higher than 7.');
  add('bac-15', { actor:'banker', bankerTotal:5, playerStood:false, playerThirdValue:3, note:"Player drew a third card with value 3" }, bankerDraws(5,3)?'draw':'stand', 'bankerDraws(5, 3)=false (player third not in 4-7)', 'Banker total 5 draws only on player third cards 4 through 7; 3 is too low.');
  add('bac-16', { actor:'banker', bankerTotal:5, playerStood:false, playerThirdValue:4, note:"Player drew a third card with value 4" }, bankerDraws(5,4)?'draw':'stand', 'bankerDraws(5, 4)=true (player third in 4-7)', 'With banker total 5, a player third card of 4 triggers a banker draw.');
  add('bac-17', { actor:'banker', bankerTotal:5, playerStood:false, playerThirdValue:7, note:"Player drew a third card with value 7" }, bankerDraws(5,7)?'draw':'stand', 'bankerDraws(5, 7)=true (player third in 4-7)', 'Banker total 5 draws against a player third card of 7.');
  add('bac-18', { actor:'banker', bankerTotal:6, playerStood:false, playerThirdValue:5, note:"Player drew a third card with value 5" }, bankerDraws(6,5)?'draw':'stand', 'bankerDraws(6, 5)=false (player third not in 6-7)', 'Banker total 6 draws only if the player third card is 6 or 7.');
  add('bac-19', { actor:'banker', bankerTotal:6, playerStood:false, playerThirdValue:6, note:"Player drew a third card with value 6" }, bankerDraws(6,6)?'draw':'stand', 'bankerDraws(6, 6)=true (player third in 6-7)', 'A player third card of 6 gives banker total 6 permission to draw.');
  add('bac-20', { actor:'banker', bankerTotal:7, playerStood:false, playerThirdValue:6, note:"Player drew a third card with value 6" }, bankerDraws(7,6)?'draw':'stand', 'bankerDraws(7, 6)=false (banker total >= 7 always stands)', 'Banker always stands on 7, regardless of the player third card.');

  return packFile('baccarat-third-card-rule', 'Baccarat Third-Card Rule', '20 graded third-card rule decisions using the baccarat engine rules (playerDraws/bankerDraws).', spots);
}

function packFile(slug, title, description, spots) {
  if (spots.length !== 20) throw new Error(`${slug}: expected 20 spots, got ${spots.length}`);
  const ids = new Set(spots.map(s => s.id));
  if (ids.size !== spots.length) throw new Error(`${slug}: duplicate ids`);
  return {
    packId: slug,
    title,
    description,
    spotCount: spots.length,
    generatedFrom: 'existing scenario/strategy engine (no hand-written EVs or correct actions)',
    spots,
  };
}

const packs = [
  blackjackSoftHands(),
  blackjackPairsSplits(),
  jacksOrBetterHolds(),
  baccaratThirdCardRule(),
];

for (const pack of packs) {
  const file = join(outDir, `${pack.packId}.json`);
  writeFileSync(file, JSON.stringify(pack, null, 2) + '\n');
  console.log(`wrote ${file} (${pack.spots.length} spots)`);
}
console.log('done');
