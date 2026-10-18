import audio from './audio.js?v=20261017-lounge1';
import { isHapticsEnabled, toggleHaptics } from './haptics.js';

// Initialize independently of the character atlas. A slow image download must
// never leave the visible sound button without a click handler.
const button = document.getElementById('btnSound');
function render() {
  const on = !audio.isMuted();
  button.textContent = on ? 'SND ON' : 'SND OFF';
  button.setAttribute('aria-pressed', String(on));
  button.setAttribute('aria-label', on ? 'Mute sound' : 'Enable sound');
  button.title = on ? 'Sound is on. Press to mute.' : 'Sound is off. Press to enable.';
}
button.onclick = () => {
  try { audio.toggleMute(); }
  finally { render(); }
};

const hapticButton = document.getElementById('btnHaptics');
function renderHaptics() {
  const on = isHapticsEnabled();
  hapticButton.textContent = on ? 'HAPTICS ON' : 'HAPTICS OFF';
  hapticButton.setAttribute('aria-pressed', String(on));
  hapticButton.setAttribute('aria-label', on ? 'Disable haptics' : 'Enable haptics');
  hapticButton.title = on ? 'Haptics on. Press to disable.' : 'Haptics off. Press to enable.';
}
hapticButton.onclick = () => { toggleHaptics(); renderHaptics(); };
// Vibration only means something on a touch device that supports it; desktop
// Chrome exposes navigator.vibrate with no motor behind it, so hide the switch
// unless the primary pointer is coarse too.
const canVibrate = typeof navigator.vibrate === 'function' && Boolean(window.matchMedia?.('(pointer: coarse)').matches);
hapticButton.hidden = !canVibrate;
renderHaptics();

for (const event of ['pointerdown', 'touchend', 'click', 'keydown']) {
  window.addEventListener(event, () => audio.unlock(), { capture: true, passive: true });
}
document.addEventListener('click', event => {
  const target = event.target.closest?.('button');
  if (!target || target.id === 'btnSound' || target.id === 'btnHaptics') return;
  audio.sfx(target.classList.contains('primary') ? 'confirm' : 'blip');
});
audio.music('lounge');
render();
