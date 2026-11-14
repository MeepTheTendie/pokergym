// Keep a live hand and the controls that act on it inside the first viewport.
//
// The battle column stacks the coach card above the table, so on a 768 px-tall
// laptop the Hit/Stand row landed just below the fold, and on a 360x740 phone
// the pinned action bar sat over the player's own cards. Both are silent: the
// player is asked for a decision they cannot see or reach.
//
// Pure on purpose, so the rule is testable without a browser: pass the measured
// boxes and get back the pixels to scroll (0 means the hand is already usable).

export const REVEAL_GAP = 8;

export function revealDelta({ cardBottom, controlBottom, viewportHeight, barTop = null }) {
  if (!Number.isFinite(cardBottom) || !Number.isFinite(controlBottom) || !Number.isFinite(viewportHeight)) {
    return 0;
  }
  // A pinned action bar hides the bottom of the table, so the cards must clear
  // its top edge rather than the viewport's. The bar itself is always on
  // screen, so only the cards can overflow it.
  const pinned = Number.isFinite(barTop);
  const limit = pinned ? barTop - REVEAL_GAP : viewportHeight - REVEAL_GAP;
  const cardOverflow = cardBottom - limit;
  // A control row that scrolls with the page only has to clear the viewport.
  const controlOverflow = pinned ? 0 : controlBottom - (viewportHeight - REVEAL_GAP);
  const delta = Math.max(0, cardOverflow, controlOverflow);
  return Math.ceil(delta);
}
