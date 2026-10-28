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
    installStatus.textContent = 'Open from your apps or home screen for quick practice.';
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
        ? 'Install request accepted. Follow your browser to finish.'
        : 'Install skipped. You can keep practicing here.';
    } catch {
      if (!installationComplete) installStatus.textContent = 'Use your browser menu to install. You can keep practicing here.';
    }
  });
  if ('serviceWorker' in navigator && window.isSecureContext) {
    status.textContent = 'Downloading offline practice…';
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
            status.textContent = 'Offline download incomplete. Reopen online to retry.';
          }
        });
        await navigator.serviceWorker.ready;
        const update = () => {
          if (navigator.serviceWorker.controller) {
            status.textContent = 'Offline practice ready. Your save stays in this browser.';
          }
        };
        navigator.serviceWorker.addEventListener('controllerchange', update);
        update();
      }).catch(() => { status.textContent = 'Offline download unavailable. You can still play online.'; });
  } else {
    status.textContent = 'Play online. Your save stays in this browser.';
  }
}
