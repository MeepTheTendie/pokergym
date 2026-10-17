// First-party PostHog loader for the landing page, learning guides and the
// trainer. Loaded as a classic same-origin script so the content policy stays
// script-src 'self' — no inline snippet and no third-party host in the policy.
// The SDK bundle is fetched through /ingest/static/array.js and all event data
// is sent through /ingest/*, both proxied to PostHog by the edge worker
// (worker/proxy.js). That keeps requests first-party, so filters that target
// *.posthog.com do not drop them.
//
// Product analytics + session replay. Events fired before the SDK finishes
// loading are queued and replayed on load. Nothing here may ever break a page:
// every step is guarded and failures are swallowed.
(function () {
  // Report only from the real site. The itch.io build, local previews and the
  // offline bundle load this file too, and must never send analytics.
  var PROD_HOSTS = ['playpokergym.com', 'www.playpokergym.com'];
  if (PROD_HOSTS.indexOf(window.location.hostname) === -1) {
    window.trackEvent = function () {};
    return;
  }

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

  // Snapshot the entry parameters synchronously, before the SDK starts loading.
  // The trainer strips ref/d from the address bar as soon as its modules run
  // (web/app.js), which happens before the SDK finishes loading and calls the
  // onload handler below. Reading the URL there would lose the source of every
  // trainer event, so read it here instead.
  var ATTRIBUTION = {};
  try {
    var params = new URLSearchParams(window.location.search);
    ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'd', 'practice'].forEach(function (key) {
      var value = params.get(key);
      if (value) ATTRIBUTION[key] = String(value).slice(0, 100);
    });
  } catch (error) {
    // Analytics must never break the page.
  }

  // Any element can be marked data-track="event_name"; the event fires with the
  // path, the element's other data-* attributes, and its own text. Capture
  // phase so the click is recorded before the link navigates away.
  document.addEventListener('click', function (event) {
    var node = event.target;
    while (node && node !== document && !(node.getAttribute && node.getAttribute('data-track'))) node = node.parentNode;
    if (!node || node === document) return;
    var payload = { path: window.location.pathname };
    var attrs = node.attributes || [];
    for (var i = 0; i < attrs.length; i++) {
      var name = attrs[i].name;
      if (name.indexOf('data-') === 0 && name !== 'data-track') {
        payload[name.slice(5).replace(/-/g, '_')] = attrs[i].value;
      }
    }
    payload.text = (node.textContent || '').trim().slice(0, 80);
    window.trackEvent(node.getAttribute('data-track'), payload);
  }, true);

  var script = document.createElement('script');
  script.async = true;
  script.src = API_HOST + '/static/array.js';
  script.onload = function () {
    try {
      window.posthog.init(KEY, CONFIG);
      window.__pgAnalyticsReady = true;
      // Attribution travels with every event on this page and onward while the
      // identifier lasts, so source -> guide -> play is one funnel.
      window.posthog.register(ATTRIBUTION);
      for (var i = 0; i < queue.length; i++) window.posthog.capture(queue[i][0], queue[i][1]);
      queue.length = 0;
    } catch (error) {
      // Analytics must never break the page.
    }
  };
  // Offline or blocked: the page keeps working with no analytics.
  script.onerror = function () {};
  document.head.appendChild(script);
})();
