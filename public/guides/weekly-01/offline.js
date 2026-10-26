(() => {
  const button = document.getElementById('pack-download');
  const status = document.getElementById('pack-offline');
  if (!button || !status) return;
  button.onclick = async () => {
    if (window.top !== window || !window.isSecureContext || !('serviceWorker' in navigator)) {
      status.textContent = 'Offline download unavailable here. You can still practice online.';
      return;
    }
    button.disabled = true;
    status.textContent = 'Downloading this pack and the free practice game…';
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      const update = async () => {
        if (registration.waiting) {
          status.textContent = 'Update downloaded. Close all Play Poker Gym tabs, then reopen this page online to finish.';
          button.disabled = false;
          return;
        }
        if (!navigator.serviceWorker.controller) return;
        const cacheNames = (await caches.keys()).filter(name => name.startsWith('pokergym-offline-'));
        for (const name of cacheNames) {
          const cache = await caches.open(name);
          const complete = await Promise.all(['index.html', 'score.js', 'offline.js']
            .map(file => cache.match(`/guides/weekly-01/${file}`)));
          if (complete.every(Boolean)) {
            status.textContent = 'Offline pack ready. Bookmark this page; your attempt stays in this browser. Feedback links need a connection.';
            button.disabled = false;
            return;
          }
        }
        status.textContent = 'Reopen online after closing all Play Poker Gym tabs to finish the offline update.';
        button.disabled = false;
      };
      const check = () => { update().catch(() => {
        status.textContent = 'Offline storage unavailable. You can still practice online.';
        button.disabled = false;
      }); };
      navigator.serviceWorker.addEventListener('controllerchange', check);
      const watch = worker => worker?.addEventListener('statechange', () => {
        if (worker.state === 'redundant') {
          status.textContent = 'Download incomplete. Reconnect and try again.';
          button.disabled = false;
        } else if (worker.state === 'installed' || worker.state === 'activated') check();
      });
      watch(registration.installing);
      registration.addEventListener('updatefound', () => watch(registration.installing));
      check();
    } catch {
      status.textContent = 'Offline download unavailable. Reconnect and try again; online practice still works.';
      button.disabled = false;
    }
  };
})();
