// Off-main-thread computation of the video-poker coach's best hold. The
// enumeration (~2.6M five-card evaluations) blocks the UI for ~200-300 ms on
// desktop and ~0.8-1.2 s on a phone, so it runs here instead. The main thread
// kicks this off as soon as a hand is dealt and reads the cached result when
// the player acts.
import { bestHold } from '../src/coach/videopoker.js';

self.addEventListener('message', (event) => {
  const { id, hand, variantId } = event.data || {};
  try {
    const result = bestHold(hand, { variant: variantId });
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
});
