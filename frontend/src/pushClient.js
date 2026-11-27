/**
 * Phone / desktop notifications in the browser (Web Push) and the app's service worker (/sw.js).
 * The service worker caches nothing; it only shows notifications and makes "Install app" possible.
 */
import { api } from './services/api';

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent || '');
export const isInstalled = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

/** iPhone / iPad allow notifications only for an app added to the Home Screen. */
export const needsHomeScreen = () => isIos() && !isInstalled();

let registering = null;
export const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return Promise.resolve(null);
  if (!registering) {
    registering = navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((e) => {
      console.warn('[sw]', e.message);
      return null;
    });
    // A tap on a notification while the CRM is open: go to that section
    navigator.serviceWorker.addEventListener?.('message', (e) => {
      if (e.data && e.data.type === 'crm_navigate' && e.data.tab) {
        window.dispatchEvent(new CustomEvent('crm_navigate', { detail: { tab: e.data.tab } }));
      }
    });
  }
  return registering;
};

const keyBytes = (base64) => {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const deviceLabel = () => {
  const ua = navigator.userAgent || '';
  const os = /android/i.test(ua) ? 'Android' : isIos() ? 'iPhone / iPad' : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'Mac' : 'Device';
  const br = /edg\//i.test(ua) ? 'Edge' : /chrome|crios/i.test(ua) ? 'Chrome' : /firefox|fxios/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : 'Browser';
  return `${os} · ${br}`;
};

/** 'on' | 'off' | 'blocked' | 'unsupported' | 'homescreen' (iPhone: add to Home Screen first) */
export async function pushState() {
  if (needsHomeScreen()) return 'homescreen';
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  const reg = await registerServiceWorker();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser cannot show notifications.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error(permission === 'denied'
    ? 'Notifications are blocked. Allow them in the browser settings for this site, then try again.'
    : 'Notifications were not allowed.');
  const reg = await registerServiceWorker();
  if (!reg) throw new Error('Could not start notifications in this browser.');
  await navigator.serviceWorker.ready;
  const status = await api.push('');
  const publicKey = status?.data?.public_key;
  if (!publicKey) throw new Error('The server did not send its notification key.');
  let sub = await reg.pushManager.getSubscription();
  // A subscription made for another key (e.g. a different server) cannot receive our messages
  const current = sub?.options?.applicationServerKey;
  if (sub && current) {
    const a = new Uint8Array(current); const b = keyBytes(publicKey);
    if (a.length !== b.length || a.some((x, i) => x !== b[i])) { await sub.unsubscribe(); sub = null; }
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  await api.push('/subscribe', 'POST', { subscription: sub.toJSON(), label: deviceLabel() });
  return 'on';
}

export async function disablePush() {
  const reg = await registerServiceWorker();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    await api.push('/unsubscribe', 'POST', { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  return 'off';
}

export const sendTestPush = () => api.push('/test', 'POST', {});
