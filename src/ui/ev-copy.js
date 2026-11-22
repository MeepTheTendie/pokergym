// Player-facing expected-value copy. Blackjack and video-poker EVs are in
// units of the bet (1 = a full bet), so a bare 0.055 is hard to read. Cents
// per $1 bet reads the way the landing page's sample hand does.
export function resultPerDollar(ev) {
  const cents = Number(ev) * 100;
  if (!Number.isFinite(cents)) return 'has no measurable result';
  const amount = Math.abs(cents).toFixed(1);
  if (Number(amount) === 0) return 'breaks even';
  return cents > 0 ? `wins ${amount}¢ per $1 bet` : `loses ${amount}¢ per $1 bet`;
}

// Video poker quotes an average return, not a net win: 0.828 is 82.8¢ back
// for every $1 bet.
export function returnPerDollar(ev) {
  const cents = Number(ev) * 100;
  if (!Number.isFinite(cents)) return 'no measurable return';
  return `${cents.toFixed(1)}¢ back per $1 bet`;
}

// Compact form for a list of alternatives.
export function perDollarShort(ev) {
  const cents = Number(ev) * 100;
  if (!Number.isFinite(cents)) return '—';
  return `${cents >= 0 ? '+' : '−'}${Math.abs(cents).toFixed(1)}¢`;
}

// A miss has to name both prices: the better play and the one the player
// chose. `alternatives` is bestAction()'s sorted list, so the first entry is
// the better play.
export function blackjackCorrection(alternatives, chosenAction) {
  const best = alternatives?.[0];
  const chosen = alternatives?.find((option) => option.action === chosenAction);
  const label = (option) => option.label ?? option.action;
  if (!best) return '';
  if (!chosen || chosen.action === best.action) return `${label(best)} ${resultPerDollar(best.ev)}.`;
  return `${label(best)} ${resultPerDollar(best.ev)}; ${label(chosen)} ${resultPerDollar(chosen.ev)}.`;
}
