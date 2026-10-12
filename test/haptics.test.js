import test from 'node:test';
import assert from 'node:assert/strict';

// haptics.js reads navigator.vibrate at call time, so a mock installed before
// the first buzz is enough. No browser, no AudioContext, no storage required.
test('haptics fire only when enabled, unmuted and supported', async () => {
  const calls = [];
  Object.defineProperty(globalThis, 'navigator', {
    value: { vibrate: (pattern) => { calls.push(pattern); return true; } },
    configurable: true,
    writable: true,
  });

  const haptics = (await import('../web/haptics.js')).default;

  assert.equal(haptics.buzz('correct'), true);
  assert.deepEqual(calls, [15]);

  assert.equal(haptics.buzz('badge'), true);
  assert.deepEqual(calls, [15, [40, 40, 80]]);

  // An unknown kind is ignored.
  assert.equal(haptics.buzz('nope'), false);
  assert.equal(calls.length, 2);

  // The saved toggle stops everything, even a known kind.
  assert.equal(haptics.setHapticsEnabled(false), false);
  assert.equal(haptics.isHapticsEnabled(), false);
  assert.equal(haptics.buzz('correct'), false);
  assert.equal(calls.length, 2);

  // A muted sound switch silences haptics even when enabled.
  haptics.setHapticsEnabled(true);
  assert.equal(haptics.buzz('correct', true), false);
  assert.equal(calls.length, 2);

  // No Vibration API: a silent no-op, never a throw.
  Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
  assert.equal(haptics.buzz('correct'), false);
});
