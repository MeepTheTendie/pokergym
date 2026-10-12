const status = document.getElementById('offlineStatus');
// Embedded distributions keep their host's storage and service workers untouched.
if (status && window.top === window && document.querySelector('link[rel="manifest"]')) {
  document.getElementById('installHelp').hidden = false;
  const installButton = document.getElementById('btnInstall');
  const installStatus = document.getElementById('installStatus');
  let installPrompt;
  let installationComplete = false;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const installed = () => {
    installationComplete = true;
    installPrompt = undefined;
    installButton.hidden = true;
    document.getElementById('installHelp').hidden = true;
    installStatus.textContent = 'OPEN FROM YOUR HOME SCREEN FOR QUICK PRACTICE';
  };
  if (standalone()) installed();
  window.addEventListener('beforeinstallprompt', event => {
    if (installationComplete || standalone()) return;
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });
  window.addEventListener('appinstalled', installed);
  installButton.addEventListener('click', async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = undefined;
    installButton.hidden = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (!installationComplete && !standalone()) installStatus.textContent = choice.outcome === 'accepted'
        ? 'INSTALL REQUEST ACCEPTED · FOLLOW YOUR BROWSER TO FINISH'
        : 'INSTALL SKIPPED · YOU CAN KEEP PRACTICING HERE';
    } catch {
      if (!installationComplete) installStatus.textContent = 'USE YOUR BROWSER MENU TO INSTALL · YOU CAN KEEP PRACTICING HERE';
    }
  });
  if ('serviceWorker' in navigator && window.isSecureContext) {
    status.textContent = 'DOWNLOADING OFFLINE PRACTICE…';
    // The worker script sits at the site root so it controls more than /web/:
    // index.html imports its game modules from /src/, which a /web/-scoped
    // worker could never intercept. Drop any pre-root worker registration
    // whose /web/ scope would shadow the new one for this origin.
    const legacyScope = new URL('.', import.meta.url);
    navigator.serviceWorker.getRegistrations()
      .then(all => Promise.all(all.filter(r => r.scope === legacyScope.href).map(r => r.unregister())))
      .catch(() => {});
    navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), { updateViaCache: 'none' })
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
