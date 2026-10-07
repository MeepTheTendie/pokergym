import audio from './audio.js?v=20261006-audio3';

// Initialize independently of the character atlas. A slow image download must
// never leave the visible sound button without a click handler.
const button = document.getElementById('btnSound');
function render() {
  const on = !audio.isMuted();
  button.textContent = on ? 'SND ON' : 'SND OFF';
  button.setAttribute('aria-pressed', String(on));
  button.setAttribute('aria-label', on ? 'Mute sound' : 'Enable sound');
  button.title = on ? 'Sound is on. Tap to mute.' : 'Sound is off. Tap to enable.';
}
button.onclick = () => {
  try { audio.toggleMute(); }
  finally { render(); }
};
for (const event of ['pointerdown', 'touchend', 'click', 'keydown']) {
  window.addEventListener(event, () => audio.unlock(), { capture: true, passive: true });
}
document.addEventListener('click', event => {
  const target = event.target.closest?.('button');
  if (!target || target.id === 'btnSound') return;
  audio.sfx(target.classList.contains('primary') ? 'confirm' : 'blip');
});
audio.music('gamecorner');
render();
