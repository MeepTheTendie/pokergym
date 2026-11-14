// Battle-screen coach copy for the trainer (web/app.js). Pure so the hand-1
// prompt can be unit-tested: the Daily Drill hides the coach button (a clean,
// unassisted read), so its instructions must never tell the player to use it.

const INSTRUCTIONS = {
  videopoker: 'Tap the cards you want to keep. The cards you leave alone are replaced when you press Draw. The coach will explain the best hold afterwards.',
  blackjack: 'Look at your hand and the dealer’s upcard, then choose Hit, Stand, Double, or Split. Not sure? Ask the coach for a hint.',
  baccarat: 'Answer the percentage question. Every number you need is in the odds panel below.',
  holdem: 'Tap the five cards that make your best hand, then press Confirm five. Not sure? Ask the coach for a hint.',
};

// The Daily Drill opens hand 1 with a short, actionable line rather than a
// paragraph: a player auto-started into the drill should see the move to make,
// not a wall of text that ends by pointing at a button that is not there.
const DAILY_INTRO = 'Five hands, all four games — the coach grades each one. ';

/**
 * The coach line shown when a hand is dealt.
 * @param {string} gameId one of `videopoker`, `blackjack`, `baccarat`, `holdem`
 * @param {{ daily?: boolean, dailyIntro?: boolean }} [opts]
 */
export function battleMessage(gameId, { daily = false, dailyIntro = false } = {}) {
  let instruction = INSTRUCTIONS[gameId] ?? '';
  if (daily) {
    // The coach button is hidden during the Daily Drill, so never send the
    // player looking for it.
    instruction = instruction.replace(' Not sure? Ask the coach for a hint.', '');
  }
  const intro = dailyIntro ? DAILY_INTRO : '';
  return intro + instruction;
}
