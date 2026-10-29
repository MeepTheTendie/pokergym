import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function makeStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

function setupLoader(search) {
  const events = [];
  const registered = [];
  const identified = [];
  const ls = makeStorage();
  const ss = makeStorage();

  const windowObj = {
    location: { hostname: 'playpokergym.com', search, pathname: '/web/' },
    localStorage: ls,
    sessionStorage: ss,
    matchMedia: () => ({ matches: false }),
    crypto: { randomUUID: () => 'uuid-1' },
    trackEvent: (name, props) => events.push([name, props || {}]),
    __pgAnalyticsReady: false,
  };

  const script = { async: true, src: '', onload: null, onerror: null };
  const documentObj = {
    referrer: '',
    head: {
      appendChild: (s) => {
        windowObj.posthog = {
          init: () => {},
          register: (attr) => registered.push(attr),
          capture: (name, props) => events.push([name, props || {}]),
          identify: (id, props) => identified.push([id, props]),
        };
        windowObj.__pgAnalyticsReady = true;
        if (typeof s.onload === 'function') s.onload();
      },
    },
    addEventListener: () => {},
    createElement: () => script,
  };

  // Provide globals.
  globalThis.window = windowObj;
  Object.defineProperty(globalThis, 'navigator', { value: { standalone: false }, writable: true, configurable: true });
  globalThis.document = documentObj;
  globalThis.localStorage = ls;
  globalThis.sessionStorage = ss;

  const source = readFileSync(new URL('../web/posthog-loader.js', import.meta.url), 'utf8');
  globalThis.eval(source);

  return { events, registered, identified, ls, ss, windowObj };
}

test('share_arrival fires on load with sh and ref', () => {
  const { events } = setupLoader('?ref=share&sh=abc123');
  assert.deepEqual(events, [['share_arrival', { sh: 'abc123', ref: 'share' }]]);
});

test('push_open fires on load when ref=push', () => {
  const { events } = setupLoader('?ref=push');
  assert.deepEqual(events, [['push_open', { ref: 'push' }]]);
});

test('display_mode super property is registered', () => {
  const { registered } = setupLoader('?ref=share&sh=x');
  assert.ok(registered.length > 0);
  assert.equal(registered[0].display_mode, 'browser');
});

test('first-touch UTMs are set once via $set_once', () => {
  const { identified } = setupLoader('?ref=share&sh=x&utm_source=yt&utm_medium=social&utm_campaign=c1&utm_content=ad');
  assert.ok(identified.length > 0);
  const props = identified[0][1];
  assert.deepEqual(props.$set_once, {
    utm_source: 'yt',
    utm_medium: 'social',
    utm_campaign: 'c1',
    utm_content: 'ad',
    ref: 'share',
    sh: 'x',
  });
});

test('first-touch is not overwritten by a later visit', () => {
  // First visit stores utm_source=first.
  const first = setupLoader('?ref=share&sh=a&utm_source=first');
  assert.equal(JSON.parse(first.ls.getItem('pg_first_touch_v1')).utm_source, 'first');
  // Second visit with a different utm_source keeps the first value.
  const secondLs = first.ls;
  const secondSs = makeStorage();
  // Re-run loader against the same localStorage by reusing it.
  globalThis.localStorage = secondLs;
  globalThis.sessionStorage = secondSs;
  const windowObj = {
    location: { hostname: 'playpokergym.com', search: '?ref=share&sh=b&utm_source=second', pathname: '/web/' },
    localStorage: secondLs,
    sessionStorage: secondSs,
    matchMedia: () => ({ matches: false }),
    crypto: { randomUUID: () => 'uuid-2' },
    trackEvent: () => {},
    __pgAnalyticsReady: false,
  };
  globalThis.window = windowObj;
  const script = { async: true, src: '', onload: null, onerror: null };
  globalThis.document = {
    referrer: '',
    head: { appendChild: (s) => { windowObj.posthog = { init: () => {}, register: () => {}, capture: (name, props) => events.push([name, props || {}]), identify: () => {} }; windowObj.__pgAnalyticsReady = true; if (s.onload) s.onload(); } },
    addEventListener: () => {},
    createElement: () => script,
  };
  globalThis.eval(readFileSync(new URL('../web/posthog-loader.js', import.meta.url), 'utf8'));
  assert.equal(JSON.parse(secondLs.getItem('pg_first_touch_v1')).utm_source, 'first');
  assert.equal(JSON.parse(secondLs.getItem('pg_first_touch_v1')).sh, 'a');
});
