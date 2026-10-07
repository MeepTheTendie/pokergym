const status = document.getElementById('offlineStatus');
// Embedded distributions keep their host's storage and service workers untouched.
if (status && window.top === window && document.querySelector('link[rel="manifest"]')) {
  document.getElementById('installHelp').hidden = false;
  if ('serviceWorker' in navigator && window.isSecureContext) {
    status.textContent = 'DOWNLOADING OFFLINE PRACTICE…';
    navigator.serviceWorker.register(new URL('sw.js', import.meta.url), { updateViaCache: 'none' })
      .then(async registration => {
        const installing = registration.installing;
        installing?.addEventListener('statechange', () => {
          if (installing.state === 'redundant' && !navigator.serviceWorker.controller) {
            status.textContent = 'OFFLINE DOWNLOAD INCOMPLETE · REOPEN ONLINE TO RETRY';
          }
        });
        await navigator.serviceWorker.ready;
        const update = () => {
          if (navigator.serviceWorker.controller) {
            status.textContent = 'OFFLINE PRACTICE READY · SAVE STAYS IN THIS BROWSER';
          }
        };
        navigator.serviceWorker.addEventListener('controllerchange', update);
        update();
      }).catch(() => { status.textContent = 'OFFLINE DOWNLOAD UNAVAILABLE · YOU CAN STILL PLAY ONLINE'; });
  } else {
    status.textContent = 'PLAY ONLINE · SAVE STAYS IN THIS BROWSER';
  }
}
