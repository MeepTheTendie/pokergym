// Product-analytics events for the trainer (web/app.js), with one meaning each.
// See docs/analytics-events.md. The sink is window.trackEvent from
// web/posthog-loader.js (a no-op off the production host).
//
// Every event carries the visit's ref tag when there is one, so starts and
// completions can be split by channel without relying on super properties.
// Starts hand out a run token; a completion fires only for a live token, so a
// completion can never be counted twice or without its start.

export const EVENTS = Object.freeze({
  OPEN_TRAINER: 'open_trainer',     // trainer page loaded (once per page load)
  START_TRAINING: 'start_training', // first hand dealt in this page load
  GAME_START: 'game_start',         // a five-hand session or gym run begins
  SESSION_COMPLETE: 'session_complete',
  START_DAILY: 'start_daily',       // a Daily Drill run begins (new, resumed or replay)
  DAILY_COMPLETE: 'daily_complete',
});

export const GAMES = Object.freeze(['blackjack', 'videopoker', 'baccarat', 'holdem']);

function cleanRef(value) {
  return typeof value === 'string' && value ? value.slice(0, 100) : null;
}

/**
 * @param {object} opts
 * @param {(name: string, props: object) => void} opts.send  event sink
 * @param {() => (string|null|undefined)} [opts.ref]         current ref tag
 */
export function createAnalytics({ send, ref = () => null } = {}) {
  let opened = false;
  let trained = false;
  let seq = 0;
  const live = new Map(); // token -> { kind, game }

  function emit(name, props = {}) {
    const out = { ...props };
    const tag = cleanRef(ref());
    if (tag && out.ref === undefined) out.ref = tag;
    try { send?.(name, out); } catch { /* analytics must never break the game */ }
  }

  function begin(kind, game) {
    const token = `${kind}-${++seq}`;
    live.set(token, { kind, game });
    return token;
  }

  function finish(token, kind) {
    const run = live.get(token);
    if (!run || run.kind !== kind) return null;
    live.delete(token);
    return run;
  }

  return {
    /** The trainer page loaded. Fires at most once per page load. */
    openTrainer(props = {}) {
      if (opened) return false;
      opened = true;
      emit(EVENTS.OPEN_TRAINER, props);
      return true;
    },

    /** A hand was dealt. Only the first hand of the page load emits start_training. */
    handStarted({ game, mode } = {}) {
      if (trained) return false;
      trained = true;
      emit(EVENTS.START_TRAINING, { game, mode });
      return true;
    },

    /** A five-hand session or gym run begins (including a resumed one). */
    gameStart({ game, mode, resumed = false } = {}) {
      if (!GAMES.includes(game)) return null;
      // Starting a new run abandons any unfinished one.
      for (const [token, run] of live) if (run.kind === 'session') live.delete(token);
      const token = begin('session', game);
      emit(EVENTS.GAME_START, { game, mode, resumed: Boolean(resumed) });
      return token;
    },

    sessionComplete(token, { correct } = {}) {
      const run = finish(token, 'session');
      if (!run) return false;
      emit(EVENTS.SESSION_COMPLETE, { game: run.game, correct });
      return true;
    },

    /** A Daily Drill run begins, from any entry path. */
    startDaily({ entry, number, resumed = false, scored = true, shared = false } = {}) {
      for (const [token, run] of live) if (run.kind === 'daily') live.delete(token);
      const token = begin('daily', 'daily');
      emit(EVENTS.START_DAILY, { entry, number, resumed: Boolean(resumed), scored: Boolean(scored), shared: Boolean(shared) });
      return token;
    },

    dailyComplete(token, { correct, number, scored = true } = {}) {
      if (!finish(token, 'daily')) return false;
      emit(EVENTS.DAILY_COMPLETE, { correct, number, scored: Boolean(scored) });
      return true;
    },
  };
}
