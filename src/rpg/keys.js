// Keyboard shortcuts for desktop play. Pure: maps a key + context to an
// action, and web/app.js performs it by clicking the matching on-screen button
// (only when that button is visible and enabled), so keys can never do
// anything a click could not.
//
// context: { screen: 'title'|'map'|'lesson'|'battle'|..., game, handDone }
// returns: null | { buttons: [ids] } | { card: index } | { option: index } | { quiz: answer } | { advance: true }

export const GAME_KEYS = Object.freeze({
  videopoker: { d: ['btnDraw', 'btnDeal'] },
  blackjack: { h: ['btnHit'], s: ['btnStand'], d: ['btnDouble'], p: ['btnSplit'] },
  // Baccarat answers are built per question (web/app.js renderQuizButtons):
  // B/P/T pick that side when offered; 1–3 pick any option by position.
  baccarat: { b: { quiz: 'BANKER' }, p: { quiz: 'PLAYER' }, t: { quiz: 'TIE' } },
  holdem: { x: ['btnClear'] },
});

// Number keys select cards: 1–5 in video poker (hold), 1–7 in hold'em (pick).
export const CARD_KEYS = Object.freeze({ videopoker: 5, holdem: 7 });
export const OPTION_KEYS = Object.freeze({ baccarat: 3 });

// Enter/Space in a hand: settle or move on.
const ENTER_IN_HAND = Object.freeze({
  videopoker: ['btnNext', 'btnDraw', 'btnDeal'],
  blackjack: ['btnNext'],
  baccarat: ['btnNext'],
  holdem: ['btnNext', 'btnConfirm'],
});

export function shouldIgnoreKey(event) {
  if (!event || event.ctrlKey || event.metaKey || event.altKey) return true;
  const tag = String(event.targetTag ?? '').toUpperCase();
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || event.targetEditable) return true;
  // Enter/Space on a focused button, link or summary already activates it natively.
  if ((event.key === 'Enter' || event.key === ' ') && (['BUTTON', 'A', 'SUMMARY'].includes(tag) || event.targetRole === 'button')) return true;
  return false;
}

export function keyAction(key, context = {}) {
  if (typeof key !== 'string' || !key) return null;
  const k = key.length === 1 ? key.toLowerCase() : key;
  const { screen, game, handDone } = context;
  if (screen === 'lesson') {
    if (k === 'Enter' || k === ' ') return { advance: true };
    if (k === 'Escape') return { buttons: ['btnSkip'] };
    return null;
  }
  if (screen === 'battle') {
    if (/^[1-9]$/.test(k) && CARD_KEYS[game] && Number(k) <= CARD_KEYS[game] && !handDone) return { card: Number(k) - 1 };
    if (/^[1-9]$/.test(k) && OPTION_KEYS[game] && Number(k) <= OPTION_KEYS[game] && !handDone) return { option: Number(k) - 1 };
    if (k === 'Enter' || k === ' ') return { buttons: ENTER_IN_HAND[game] ?? ['btnNext'] };
    if (k === 'c') return { buttons: ['btnAsk'] };
    if (k === 'a') return { buttons: ['btnApply'] };
    if (k === 'w') return { buttons: ['btnWhy'] };
    // Esc leaves for the map only between hands, never mid-hand.
    if (k === 'Escape') return handDone ? { buttons: ['btnMap'] } : null;
    const entry = GAME_KEYS[game]?.[k];
    if (!entry) return null;
    return Array.isArray(entry) ? { buttons: [...entry] } : { ...entry };
  }
  if (screen === 'title') {
    if (k === 'Enter' || k === ' ') return { buttons: ['btnDaily', 'btnStart'] };
    return null;
  }
  if (screen === 'review' || screen === 'class') {
    if (k === 'Escape') return { buttons: ['btnReviewDone', 'btnMap', 'btnTitle'] };
    return null;
  }
  return null;
}
