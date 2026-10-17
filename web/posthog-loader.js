// First-party PostHog loader. Loaded as a classic same-origin script (see
// web/index.html) so the content policy stays script-src 'self' — no inline
// snippet and no third-party host in the policy. The SDK bundle is fetched
// through /ingest/static/array.js and all event data is sent through /ingest/*,
// both proxied to PostHog by the edge worker (worker/proxy.js). That keeps the
// requests first-party, so ad-blockers that target *.posthog.com do not drop
// them.
//
// Product analytics + session replay. Events fired before the SDK finishes
// loading are queued and replayed on load. Nothing here may ever break the
// game: every step is guarded and failures are swallowed.
(function () {
  // Project API key (public — it ships in client code). Empty disables analytics.
  var KEY = 'phc_wLPfBDNvoMeS7rSD8goD293GphD5aWjwznZbAz2yf6sc';
  var API_HOST = '/ingest';
  var UI_HOST = 'https://us.posthog.com';
  var CONFIG = {
    api_host: API_HOST,
    ui_host: UI_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    // Replay: mask every text input so a typed feedback note or backup paste is
    // never recorded. The game itself shows no personal data.
    session_recording: { maskAllInputs: true },
  };

  if (!KEY) {
    window.trackEvent = function () {};
    return;
  }

  var queue = [];
  window.trackEvent = function (name, props) {
    if (window.__pgAnalyticsReady && window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(name, props);
    } else {
      queue.push([name, props]);
    }
  };

  var script = document.createElement('script');
  script.async = true;
  script.src = API_HOST + '/static/array.js';
  script.onload = function () {
    try {
      window.posthog.init(KEY, CONFIG);
      window.__pgAnalyticsReady = true;
      for (var i = 0; i < queue.length; i++) window.posthog.capture(queue[i][0], queue[i][1]);
      queue.length = 0;
    } catch (error) {
      // Analytics must never break the game.
    }
  };
  // Offline or blocked: the game keeps working with no analytics.
  script.onerror = function () {};
  document.head.appendChild(script);
})();
