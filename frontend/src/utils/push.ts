import { api } from '../services/api';

/** Web Push: lets the server alert this device about messages and calls even when the app is closed. */

const supported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return '';
  const bytes = new Uint8Array(buf);
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const x = new Uint8Array(a);
  if (x.length !== b.length) return false;
  for (let i = 0; i < x.length; i++) if (x[i] !== b[i]) return false;
  return true;
}

/** Subscribes this device (only if the user already allowed notifications). Safe to call repeatedly. */
export async function ensurePushSubscription(): Promise<void> {
  if (!supported() || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await api.getPushPublicKey();
    if (!publicKey) return;
    const serverKey = urlBase64ToUint8Array(publicKey);

    let sub = await reg.pushManager.getSubscription();
    // Server keys changed (e.g. fresh database): the old subscription can never work again
    if (sub && !sameKey(sub.options.applicationServerKey, serverKey)) {
      await sub.unsubscribe();
      sub = null;
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: serverKey });
    }
    await api.pushSubscribe({
      endpoint: sub.endpoint,
      p256dh: bufToBase64Url(sub.getKey('p256dh')),
      auth: bufToBase64Url(sub.getKey('auth')),
    });
  } catch (e) {
    console.warn('Push subscription failed', e);
  }
}

/**
 * Asks for notification permission. Browsers (especially iOS Safari) only allow the prompt after a
 * user gesture, so this is wired to the first tap/click after sign-in.
 */
export function requestPushPermissionOnFirstGesture(): () => void {
  if (!supported()) return () => {};
  if (Notification.permission !== 'default') {
    void ensurePushSubscription();
    return () => {};
  }
  const handler = async () => {
    cleanup();
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') await ensurePushSubscription();
    } catch {
      // ignore
    }
  };
  const cleanup = () => {
    window.removeEventListener('click', handler, true);
    window.removeEventListener('touchend', handler, true);
    window.removeEventListener('keydown', handler, true);
  };
  window.addEventListener('click', handler, true);
  window.addEventListener('touchend', handler, true);
  window.addEventListener('keydown', handler, true);
  return cleanup;
}

export async function disablePush(): Promise<void> {
  if (!supported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await api.pushUnsubscribe(sub.endpoint).catch(() => {});
      await sub.unsubscribe();
    }
  } catch {
    // ignore
  }
}

/** Removes delivered notifications for a chat once the user is looking at it. */
export async function clearNotifications(tag?: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const list = await reg?.getNotifications(tag ? { tag } : undefined);
    list?.forEach((n) => n.close());
  } catch {
    // ignore
  }
}

export function setAppBadge(count: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (count > 0) nav.setAppBadge?.(count)?.catch(() => {});
    else nav.clearAppBadge?.()?.catch(() => {});
  } catch {
    // unsupported
  }
}
