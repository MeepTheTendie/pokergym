/* ============================================================================
 * PokerGym haptics.
 *
 * A thin wrapper over navigator.vibrate. Three gates decide whether a buzz
 * actually fires: the player's saved haptics toggle, the sound mute switch
 * (vibration is feedback and follows sound), and whether the device exposes
 * the Vibration API at all. Everything degrades to a no-op, so a desktop
 * browser without vibration never throws.
 *
 * The toggle is stored beside the save under its own key so it survives
 * reloads without being part of the portable backup.
 * ==========================================================================*/

const HAPTICS_KEY = 'pokergym:haptics';

// Kind -> the pattern handed to navigator.vibrate. Numbers are milliseconds;
// an array is buzz / pause / buzz ...
export const HAPTIC_PATTERNS = {
  correct: 15,
  wrong: [30, 40, 30],
  level: [20, 30, 20, 30, 60],
  badge: [40, 40, 80],
};

let enabled = true;
try {
  enabled = globalThis.localStorage?.getItem(HAPTICS_KEY) !== 'off';
} catch {
  enabled = true;
}

export function isHapticsEnabled() {
  return enabled;
}

export function setHapticsEnabled(next) {
  enabled = Boolean(next);
  try { globalThis.localStorage?.setItem(HAPTICS_KEY, enabled ? 'on' : 'off'); } catch {}
  return enabled;
}

export function toggleHaptics() {
  return setHapticsEnabled(!enabled);
}

/** Fire one haptic pattern. Returns true only when the device buzzed.
 *  `muted` mirrors audio.isMuted() so the sound switch silences vibration too. */
export function buzz(kind, muted = false) {
  if (!enabled || muted) return false;
  const pattern = HAPTIC_PATTERNS[kind];
  if (pattern === undefined) return false;
  const nav = globalThis.navigator;
  if (!nav || typeof nav.vibrate !== 'function') return false;
  try {
    return navigator.vibrate(pattern) !== false;
  } catch {
    return false;
  }
}

export default { buzz, isHapticsEnabled, setHapticsEnabled, toggleHaptics, HAPTIC_PATTERNS };
