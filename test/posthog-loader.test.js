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

function setupLoader(search, ls = makeStorage()) {
  const events = [];
  const registered = [];
  const identified = [];
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

test('crew test link (?pg_test=1) sends nothing and marks the browser', () => {
  const { events, registered, identified, ls, windowObj } = setupLoader('?pg_test=1&ref=share&sh=abc');
  assert.deepEqual(events, []);
  assert.deepEqual(registered, []);
  assert.deepEqual(identified, []);
  assert.equal(ls.getItem('pg_internal_v1'), '1');
  assert.equal(windowObj.__pgInternal, true);
});

test('a marked browser stays out on later untagged visits; pg_test=0 clears it', () => {
  const ls = makeStorage();
  setupLoader('?pg_test=1', ls);
  const later = setupLoader('?ref=share&sh=x', ls);
  assert.deepEqual(later.events, []);
  assert.deepEqual(later.registered, []);
  const cleared = setupLoader('?pg_test=0&ref=share&sh=x', ls);
  assert.equal(ls.getItem('pg_internal_v1'), null);
  assert.deepEqual(cleared.events, [['share_arrival', { sh: 'x', ref: 'share' }]]);
});

test('a pasted link with a stray backtick is treated as a test visit', () => {
  for (const search of ['?utm_source=fb&utm_content=nine-vs-three%60', '?utm_content=ig-bio`']) {
    const { events, registered } = setupLoader(search + '&ref=share&sh=y');
    assert.deepEqual(events, [], search);
    assert.deepEqual(registered, [], search);
  }
});

test('ordinary visits are still counted', () => {
  const { registered, ls } = setupLoader('?utm_source=fb&utm_content=p4-QF');
  assert.ok(registered.length > 0);
  assert.equal(ls.getItem('pg_internal_v1'), null);
});
