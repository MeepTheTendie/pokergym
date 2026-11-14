// Landing hero: one playable blackjack hand (9-7 vs dealer 10). The answer
// and its numbers come from src/coach/blackjack.js bestAction (6 decks, S17,
// DAS): hit -0.535, stand -0.537 per $1. Kept in a same-origin file so it
// survives the strict `script-src 'self'` policy; inline scripts are blocked.
// Clicks are tracked by posthog-loader.js through the buttons' data-track
// attributes, so this file sends no events itself.
(() => {
  const moves = document.getElementById('heroMoves');
  const coach = document.getElementById('heroCoach');
  const badge = document.getElementById('heroBadge');
  const again = document.getElementById('heroAgain');
  if (!moves || !coach || !badge) return;

  moves.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-move]');
    if (!button) return;
    const right = button.dataset.move === 'hit';
    badge.textContent = right ? 'Correct' : 'Not quite';
    badge.classList.toggle('miss', !right);
    moves.hidden = true;
    coach.hidden = false;
    coach.querySelector('a')?.focus({ preventScroll: true });
  });

  // The phone-only sticky button would cover Hit/Stand, so it waits until the
  // hand has scrolled out of view.
  const sticky = document.querySelector('.sticky-cta');
  const hand = document.getElementById('heroHand');
  if (sticky && hand && 'IntersectionObserver' in window) {
    sticky.classList.add('away');
    new IntersectionObserver(([entry]) => sticky.classList.toggle('away', entry.isIntersecting)).observe(hand);
  }

  again?.addEventListener('click', () => {
    coach.hidden = true;
    moves.hidden = false;
    moves.querySelector('button')?.focus({ preventScroll: true });
  });
})();
