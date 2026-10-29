// Web-push opt-in. One reminder a day, no email, no account.
//
// The browser gives us a push endpoint and two public keys; the Worker stores
// them in KV. Nothing personal is sent, and turning reminders off deletes the
// stored subscription.
const VAPID_PUBLIC = 'BLGQOJaihQQyiu_UFygBDpyrLTQEkPB-U4HEgpA7coYib7wdW0z_qDc3TFRqZ3hf_F86uFwIFbDc5TdxZBXwpow';

export function pushSupported() {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    window.isSecureContext;
}

export function urlBase64ToUint8Array(text) {
  const padded = String(text).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function registration() {
  const ready = await navigator.serviceWorker.ready;
  return ready;
}

export async function currentSubscription() {
  if (!pushSupported()) return null;
  try {
    const reg = await registration();
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export function permission() {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Ask, subscribe, and store. Returns 'subscribed' | 'denied' | 'dismissed' |
 * 'error' so the caller can report one honest outcome.
 */
export async function enablePush() {
  if (!pushSupported()) {
    window.trackEvent?.('push_subscribe', { result: 'unsupported' });
    return 'error';
  }
  try {
    const answer = await Notification.requestPermission();
    if (answer === 'denied') {
      window.trackEvent?.('push_subscribe', { result: 'denied' });
      return 'denied';
    }
    if (answer !== 'granted') {
      window.trackEvent?.('push_subscribe', { result: 'dismissed' });
      return 'dismissed';
    }
    const reg = await registration();
    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });
    const json = sub.toJSON();
    const response = await fetch('/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });
    if (!response.ok) {
      await sub.unsubscribe().catch(() => {});
      window.trackEvent?.('push_subscribe', { result: 'error' });
      return 'error';
    }
    window.trackEvent?.('push_subscribe', { result: 'granted' });
    return 'subscribed';
  } catch {
    window.trackEvent?.('push_subscribe', { result: 'error' });
    return 'error';
  }
}

/** Unsubscribe locally and delete the stored endpoint. */
export async function disablePush() {
  if (!pushSupported()) return 'error';
  try {
    const reg = await registration();
    const sub = await reg.pushManager.getSubscription();
    if (!sub) {
      return 'unsubscribed';
    }
    const { endpoint } = sub.toJSON();
    await sub.unsubscribe();
    await fetch('/push/unsubscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});
    window.trackEvent?.('push_unsubscribe');
    return 'unsubscribed';
  } catch {
    return 'error';
  }
}
