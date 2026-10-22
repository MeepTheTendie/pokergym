// Product-analytics events for the trainer (web/app.js), with one meaning each.
// See docs/analytics-events.md. The sink is window.trackEvent from
// web/posthog-loader.js (a no-op off the production host).
//
// Every event carries the visit's ref tag when there is one, so starts and
// completions can be split by channel without relying on super properties.
// Starts hand out a run token; a completion fires only for a live token, so a
// completion can never be counted twice or without its start.
//
// Run tokens are also sent as `run_id` so hand-level events can be grouped
// into one session. They are unique per page load (random boot segment), so
// two visits that both start their first session cannot merge.

export const EVENT_VERSION = 2;

export const EVENTS = Object.freeze({
  OPEN_TRAINER: 'open_trainer',       // trainer page loaded (once per page load)
  START_TRAINING: 'start_training',   // first hand dealt in this page load
  GAME_START: 'game_start',           // a five-hand session or gym run begins
  HAND_DEALT: 'hand_dealt',           // a hand (or Daily Drill step) was dealt
  DECISION_MADE: 'decision_made',     // first player decision in a hand
  HAND_COMPLETE: 'hand_complete',     // that hand was settled
  SESSION_COMPLETE: 'session_complete', // five finished hands in one session
  START_DAILY: 'start_daily',         // a Daily Drill run begins (new, resumed or replay)
  DAILY_COMPLETE: 'daily_complete',   // five finished Daily Drill hands
  RECAP_VIEW: 'recap_view',           // five-hand recap shown
  RECAP_TAP: 'recap_tap',             // a recap button tapped
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
  // Anonymous runs need a unique id even when two page loads start at once.
  const boot = Math.random().toString(36).slice(2, 8);
  const live = new Map(); // token -> { kind, game, mode, hands, decisions }

  function emit(name, props = {}) {
    const out = { ...props };
    const tag = cleanRef(ref());
    if (tag && out.ref === undefined) out.ref = tag;
    try { send?.(name, out); } catch { /* analytics must never break the game */ }
  }

  function begin(kind, game, mode) {
    const token = `${kind}-${boot}-${++seq}`;
    live.set(token, { kind, game, mode, hands: new Set(), decisions: new Set() });
    return token;
  }

  function finish(token, kind) {
    const run = live.get(token);
    if (!run || run.kind !== kind) return null;
    live.delete(token);
    return run;
  }

  function runFor(token, kind) {
    const run = live.get(token);
    if (!run || (kind && run.kind !== kind)) return null;
    return run;
  }

  function runProps(run, token, extra = {}) {
    return {
      run_id: token,
      run_kind: run.kind,
      game: run.game,
      mode: run.mode,
      event_version: EVENT_VERSION,
      ...extra,
    };
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
      const token = begin('session', game, mode);
      emit(EVENTS.GAME_START, { game, mode, resumed: Boolean(resumed), run_id: token, event_version: EVENT_VERSION });
      return token;
    },

    /** A hand was dealt inside a live run. */
    handDealt(token, { handIndex, handTotal, mode } = {}) {
      const run = runFor(token, 'session') ?? runFor(token, 'daily');
      if (!run) return false;
      emit(EVENTS.HAND_DEALT, runProps(run, token, {
        hand_index: Number.isInteger(handIndex) ? handIndex : null,
        hand_total: Number.isInteger(handTotal) ? handTotal : null,
        mode: mode ?? run.mode,
      }));
      return true;
    },

    /**
     * The first player decision in a hand. Later actions in the same hand do
     * not emit again; hand_complete's `decisions` count keeps the total.
     */
    decisionMade(token, { handIndex, action, mode } = {}) {
      const run = runFor(token, 'session') ?? runFor(token, 'daily');
      if (!run) return false;
      const index = Number.isInteger(handIndex) ? handIndex : null;
      if (index !== null) {
        if (run.decisions.has(index)) return false;
        run.decisions.add(index);
      }
      emit(EVENTS.DECISION_MADE, runProps(run, token, {
        hand_index: index,
        action: typeof action === 'string' ? action.slice(0, 40) : null,
        mode: mode ?? run.mode,
      }));
      return true;
    },

    /** The hand was settled. Fires once per hand index per run. */
    handComplete(token, { handIndex, optimal, decisions = 0, difficulty, mode } = {}) {
      const run = runFor(token, 'session') ?? runFor(token, 'daily');
      if (!run) return false;
      const index = Number.isInteger(handIndex) ? handIndex : run.hands.size + 1;
      if (run.hands.has(index)) return false;
      run.hands.add(index);
      emit(EVENTS.HAND_COMPLETE, runProps(run, token, {
        hand_index: index,
        optimal: Boolean(optimal),
        decisions: Number.isFinite(decisions) ? decisions : 0,
        difficulty: Number.isFinite(difficulty) ? difficulty : null,
        mode: mode ?? run.mode,
      }));
      return true;
    },

    sessionComplete(token, { correct, hands = 5 } = {}) {
      const run = finish(token, 'session');
      if (!run) return false;
      emit(EVENTS.SESSION_COMPLETE, {
        game: run.game,
        correct,
        run_id: token,
        hands_completed: hands,
        event_version: EVENT_VERSION,
      });
      return true;
    },

    /** A Daily Drill run begins, from any entry path. */
    startDaily({ entry, number, resumed = false, scored = true, shared = false } = {}) {
      for (const [token, run] of live) if (run.kind === 'daily') live.delete(token);
      const token = begin('daily', 'daily', 'daily');
      emit(EVENTS.START_DAILY, {
        entry, number, resumed: Boolean(resumed), scored: Boolean(scored), shared: Boolean(shared),
        run_id: token, event_version: EVENT_VERSION,
      });
      return token;
    },

    dailyComplete(token, { correct, number, scored = true, hands = 5 } = {}) {
      if (!finish(token, 'daily')) return false;
      emit(EVENTS.DAILY_COMPLETE, {
        correct, number, scored: Boolean(scored), run_id: token,
        hands_completed: hands, event_version: EVENT_VERSION,
      });
      return true;
    },

    /** A five-hand recap screen was shown. */
    recapView(props = {}) {
      emit(EVENTS.RECAP_VIEW, { ...props, event_version: EVENT_VERSION });
      return true;
    },

    /** A button on the five-hand recap was tapped. */
    recapTap(props = {}) {
      emit(EVENTS.RECAP_TAP, { ...props, event_version: EVENT_VERSION });
      return true;
    },
  };
}
