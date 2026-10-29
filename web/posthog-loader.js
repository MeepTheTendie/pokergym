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
    // Create/update a person profile for every visitor (not only identified
    // ones). PostHog's default is 'identified_only', which left our anonymous
    // visitors without profiles and made the lifecycle/retention insights
    // (New vs returning, Do players come back?) render all zeros.
    person_profiles: 'always',
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
  var FIRST_KEY = 'pg_first_touch_v1';
  var SESSION_KEY = 'pg_session_source_v1';
  var SOURCE_KEYS = ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  function readStore(store, key) {
    try { var raw = store.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function writeStore(store, key, value) {
    try { store.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked or full */ }
  }
  try {
    var params = new URLSearchParams(window.location.search);
    var entry = {};
    SOURCE_KEYS.concat(['d', 'practice', 'sh']).forEach(function (key) {
      var value = params.get(key);
      if (value) entry[key] = String(value).slice(0, 100);
    });
    // Fallback attribution from the referrer when no explicit ?ref= tag is
    // present. Mirror of REFERRER_REFS in src/rpg/links.js — keep in sync.
    if (!entry.ref) {
      var referrerHost = '';
      try { referrerHost = new URL(document.referrer).hostname.toLowerCase(); } catch (e) { referrerHost = ''; }
      if (referrerHost.startsWith('www.')) referrerHost = referrerHost.slice(4);
      var REFERRER_MAP = {
        'instagram.com': 'instagram', 'l.instagram.com': 'instagram',
        'facebook.com': 'facebook', 'l.facebook.com': 'facebook', 'm.facebook.com': 'facebook', 'lm.facebook.com': 'facebook',
        'x.com': 'x', 't.co': 'x', 'twitter.com': 'x',
        'youtube.com': 'youtube', 'm.youtube.com': 'youtube', 'youtu.be': 'youtube',
        'tiktok.com': 'tiktok',
        'reddit.com': 'reddit', 'www.reddit.com': 'reddit', 'out.reddit.com': 'reddit'
      };
      var matched = REFERRER_MAP[referrerHost];
      if (!matched) {
        for (var k in REFERRER_MAP) {
          if (Object.prototype.hasOwnProperty.call(REFERRER_MAP, k)) {
            var bare = k.startsWith('www.') ? k.slice(4) : k;
            if (referrerHost === bare || referrerHost.endsWith('.' + bare)) { matched = REFERRER_MAP[k]; break; }
          }
        }
      }
      if (matched) entry.ref = String(matched).slice(0, 100);
    }
    // An explicit UTM source is attribution too: in-app browsers often hide the
    // referrer, and Instagram's link-in-bio tag arrives as utm_source=ig.
    if (!entry.ref && entry.utm_source) {
      var UTM_REFS = {
        youtube: 'youtube', yt: 'youtube',
        instagram: 'instagram', ig: 'instagram', reels: 'reels', ig_reels: 'reels',
        facebook: 'facebook', fb: 'facebook',
        tiktok: 'tiktok', x: 'x', twitter: 'x', reddit: 'reddit',
      };
      var utm = String(entry.utm_source).toLowerCase();
      if (UTM_REFS[utm]) entry.ref = UTM_REFS[utm];
    }

    function sourceOnly(obj) {
      var out = { at: Date.now() };
      for (var i = 0; i < SOURCE_KEYS.length; i++) {
        var key = SOURCE_KEYS[i];
        if (obj[key]) out[key] = obj[key];
      }
      return out;
    }

    // First touch is written once and never overwritten by a later visit.
    var first = readStore(window.localStorage, FIRST_KEY);
    if (!first || typeof first !== 'object') {
      first = sourceOnly(entry);
      if (entry.sh) first.sh = String(entry.sh).slice(0, 100);
      writeStore(window.localStorage, FIRST_KEY, first);
    } else if (!first.sh && entry.sh) {
      first.sh = String(entry.sh).slice(0, 100);
      writeStore(window.localStorage, FIRST_KEY, first);
    }
    // Current-session source: kept across internal navigation, renewed after
    // 30 idle minutes (PostHog's default session window), and separate from
    // the first-touch source above.
    var session = readStore(window.sessionStorage, SESSION_KEY);
    if (!session || typeof session !== 'object' || !session.at || Date.now() - session.at > 30 * 60 * 1000) {
      session = sourceOnly(entry);
      writeStore(window.sessionStorage, SESSION_KEY, session);
    } else if (!session.ref && entry.ref) {
      // A tagged link opened inside the same session fills a missing source.
      session.ref = entry.ref;
      writeStore(window.sessionStorage, SESSION_KEY, session);
    }

    // Current page's explicit params remain the unprefixed super properties.
    for (var p in entry) if (Object.prototype.hasOwnProperty.call(entry, p)) ATTRIBUTION[p] = entry[p];
    // `ref` keeps its old meaning (this visit's source) for existing reports.
    if (session.ref || entry.ref) ATTRIBUTION.ref = session.ref || entry.ref;
    else delete ATTRIBUTION.ref;
    if (session.ref) ATTRIBUTION.session_ref = session.ref;
    if (first.ref) ATTRIBUTION.first_ref = first.ref;
    for (var s = 0; s < SOURCE_KEYS.length; s++) {
      var sourceKey = SOURCE_KEYS[s];
      if (sourceKey !== 'ref' && first[sourceKey]) ATTRIBUTION['first_' + sourceKey] = first[sourceKey];
    }
    if (first.sh) ATTRIBUTION.first_sh = first.sh;
    // Fire arrival events for tagged entry links (queued until the SDK loads).
    if (entry.ref === 'share') window.trackEvent('share_arrival', { sh: entry.sh || null, ref: 'share' });
    if (entry.ref === 'push') window.trackEvent('push_open', { ref: 'push' });
  } catch (error) {
    // Analytics must never break a page.
  }
  // Read-only copy for the trainer, which adds `ref` to its own events
  // (src/rpg/analytics.js). Nothing here changes how ref is parsed.
  var DISPLAY_MODE = 'browser';
  try {
    if ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true) DISPLAY_MODE = 'standalone';
  } catch (e) { /* ignore */ }
  ATTRIBUTION.display_mode = DISPLAY_MODE;
  window.__pgAttribution = ATTRIBUTION;

  // Stable device identity. PostHog's own distinct_id lives in a cookie as well
  // as localStorage, so clearing cookies splits one person into several. A plain
  // localStorage id survives that, which makes "did this person come back" a
  // question about one profile instead of several. There is no login, so this is
  // device-level only: two devices are still two people. No PII is stored.
  var PLAYER_KEY = 'pg_player_id_v1';
  var FIRST_SEEN_KEY = 'pg_first_seen_v1';
  var PLAYER_ID = '';
  var FIRST_SEEN = '';
  try {
    PLAYER_ID = window.localStorage.getItem(PLAYER_KEY) || '';
    if (!PLAYER_ID) {
      PLAYER_ID = 'pg_' + (
        window.crypto && typeof window.crypto.randomUUID === 'function'
          ? window.crypto.randomUUID()
          : Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
      );
      window.localStorage.setItem(PLAYER_KEY, PLAYER_ID);
    }
    FIRST_SEEN = window.localStorage.getItem(FIRST_SEEN_KEY) || '';
    if (!FIRST_SEEN) {
      FIRST_SEEN = new Date().toISOString();
      window.localStorage.setItem(FIRST_SEEN_KEY, FIRST_SEEN);
    }
  } catch (error) {
    // Storage blocked: fall back to the SDK's anonymous distinct_id.
    PLAYER_ID = '';
  }

  // The trainer calls this once the save is loaded, so the person profile knows
  // the class, level and visit count without sending anything personal.
  var identifyQueue = [];
  window.pgIdentify = function (props) {
    if (!PLAYER_ID) return;
    var payload = props && typeof props === 'object' ? props : {};
    if (window.__pgAnalyticsReady && window.posthog && typeof window.posthog.identify === 'function') {
      window.posthog.identify(PLAYER_ID, payload);
    } else {
      identifyQueue.push(payload);
    }
  };

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
      if (PLAYER_ID) {
        var setOnce = {};
        if (ATTRIBUTION.first_utm_source) setOnce.utm_source = ATTRIBUTION.first_utm_source;
        if (ATTRIBUTION.first_utm_medium) setOnce.utm_medium = ATTRIBUTION.first_utm_medium;
        if (ATTRIBUTION.first_utm_campaign) setOnce.utm_campaign = ATTRIBUTION.first_utm_campaign;
        if (ATTRIBUTION.first_utm_content) setOnce.utm_content = ATTRIBUTION.first_utm_content;
        if (ATTRIBUTION.first_ref === 'share') {
          setOnce.ref = 'share';
          if (ATTRIBUTION.first_sh) setOnce.sh = ATTRIBUTION.first_sh;
        }
        window.posthog.identify(PLAYER_ID, {
          pg_player_id: PLAYER_ID,
          first_seen: FIRST_SEEN || null,
          first_ref: ATTRIBUTION.first_ref || null,
          $set_once: setOnce,
        });
        for (var q = 0; q < identifyQueue.length; q++) window.posthog.identify(PLAYER_ID, identifyQueue[q]);
        identifyQueue.length = 0;
      }
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
