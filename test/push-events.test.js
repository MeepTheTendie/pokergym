import test from 'node:test';
import assert from 'node:assert/strict';

const calls = [];
let subscribeOptions = null;
const fakeSub = {
  toJSON: () => ({ endpoint: 'https://push.example.test/x', keys: { p256dh: 'p', auth: 'a' } }),
  unsubscribe: async () => true,
};

function defineGlobal(name, value) {
  Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
}

function resetGlobals(overrides = {}) {
  calls.length = 0;
  subscribeOptions = null;
  const windowObj = {
    trackEvent: (name, props) => calls.push([name, props === undefined ? undefined : (props || {})]),
    __pgAttribution: { display_mode: 'browser' },
    isSecureContext: true,
    Notification: globalThis.Notification,
    ...(overrides.window || {}),
  };
  if (overrides.pushManager === false) {
    // leave PushManager off
  } else {
    windowObj.PushManager = function () {};
  }
  defineGlobal('window', windowObj);

  const navigatorObj = overrides.navigator || {
    serviceWorker: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: async () => (overrides.subscription === undefined ? null : overrides.subscription),
          subscribe: async (options) => {
            subscribeOptions = options;
            return fakeSub;
          },
        },
      }),
    },
    standalone: false,
  };
  if (overrides.pushSupported === false) {
    delete navigatorObj.serviceWorker;
  }
  defineGlobal('navigator', navigatorObj);

  defineGlobal('Notification', overrides.Notification || {
    permission: 'granted',
    requestPermission: async () => 'granted',
  });

  defineGlobal('fetch', overrides.fetch || (async () => ({ ok: true, json: async () => ({}) })));
}

resetGlobals();
const { enablePush, disablePush, pushSupported } = await import('../web/push.js');

test('push_subscribe: granted attempt logs granted', async () => {
  resetGlobals({ subscription: null });
  const result = await enablePush();
  assert.equal(result, 'subscribed');
  assert.deepEqual(calls, [['push_subscribe', { result: 'granted' }]]);
});

test('push_subscribe: dismissed prompt logs dismissed', async () => {
  resetGlobals({
    subscription: null,
    Notification: { permission: 'default', requestPermission: async () => 'default' },
  });
  const result = await enablePush();
  assert.equal(result, 'dismissed');
  assert.deepEqual(calls, [['push_subscribe', { result: 'dismissed' }]]);
});

test('push_subscribe: denied permission logs denied', async () => {
  resetGlobals({
    subscription: null,
    Notification: { permission: 'denied', requestPermission: async () => 'denied' },
  });
  const result = await enablePush();
  assert.equal(result, 'denied');
  assert.deepEqual(calls, [['push_subscribe', { result: 'denied' }]]);
});

test('push_subscribe: subscribe failure logs error', async () => {
  resetGlobals({
    subscription: null,
    fetch: async () => ({ ok: false, json: async () => ({}) }),
  });
  const result = await enablePush();
  assert.equal(result, 'error');
  assert.deepEqual(calls, [['push_subscribe', { result: 'error' }]]);
});

test('push_subscribe: unsupported logs unsupported', async () => {
  resetGlobals({ pushSupported: false });
  const result = await enablePush();
  assert.equal(result, 'error');
  assert.deepEqual(calls, [['push_subscribe', { result: 'unsupported' }]]);
});

test('push_subscribe: thrown error logs error', async () => {
  resetGlobals({
    subscription: null,
    Notification: { permission: 'granted', requestPermission: async () => { throw new Error('boom'); } },
  });
  const result = await enablePush();
  assert.equal(result, 'error');
  assert.deepEqual(calls, [['push_subscribe', { result: 'error' }]]);
});

test('push_unsubscribe: fires only when a subscription existed', async () => {
  resetGlobals({ subscription: null });
  let result = await disablePush();
  assert.equal(result, 'unsubscribed');
  assert.deepEqual(calls, []);

  resetGlobals({ subscription: fakeSub });
  result = await disablePush();
  assert.equal(result, 'unsubscribed');
  assert.deepEqual(calls, [['push_unsubscribe', undefined]]);
});
