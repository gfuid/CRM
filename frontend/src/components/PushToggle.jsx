import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, BellOff, Loader2, X, Download, Share } from 'lucide-react';
import { pushState, enablePush, disablePush, sendTestPush } from '../pushClient';

const DISMISS_KEY = 'crm_push_banner_hidden_at';
const DISMISS_DAYS = 14;

// Chrome / Edge / Android offer "Install app" through this event; keep it for the Install button
let installEvent = null;
const installListeners = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e;
    installListeners.forEach((fn) => fn(true));
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    installListeners.forEach((fn) => fn(false));
  });
}

const useInstall = () => {
  const [can, setCan] = useState(Boolean(installEvent));
  useEffect(() => {
    installListeners.add(setCan);
    return () => installListeners.delete(setCan);
  }, []);
  const install = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice.catch(() => null);
    installEvent = null;
    setCan(false);
  };
  return { canInstall: can, install };
};

const usePush = () => {
  const [state, setState] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const refresh = useCallback(() => pushState().then(setState).catch(() => setState('unsupported')), []);
  useEffect(() => { refresh(); }, [refresh]);
  const run = async (fn, okText) => {
    setBusy(true); setMsg(null);
    try {
      const next = await fn();
      if (typeof next === 'string') setState(next);
      if (okText) setMsg({ ok: true, text: okText });
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'Something went wrong' });
      refresh();
    } finally { setBusy(false); }
  };
  return {
    state, busy, msg,
    turnOn: () => run(async () => { const s = await enablePush(); await sendTestPush().catch(() => {}); return s; }, 'Done! A test notification was sent to this device.'),
    turnOff: () => run(disablePush, 'Notifications are off on this device.'),
    test: () => run(async () => { await sendTestPush(); }, 'Test notification sent.'),
  };
};

const Steps = () => (
  <span>On iPhone / iPad: tap <Share size={12} className="inline -mt-0.5" /> <b>Share</b> in Safari, then <b>Add to Home Screen</b>. Open the CRM from the new icon and turn notifications on there.</span>
);

/** Card at the top of the app until notifications are on (or hidden for 14 days). */
export function PushBanner() {
  const p = usePush();
  const { canInstall, install } = useInstall();
  const [hidden, setHidden] = useState(() => {
    try { const t = Number(localStorage.getItem(DISMISS_KEY)); return t > 0 && Date.now() - t < DISMISS_DAYS * 864e5; } catch { return false; }
  });
  const hide = () => { try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ } setHidden(true); };

  const wantsPush = p.state === 'off' || p.state === 'homescreen';
  if (hidden || (!wantsPush && !canInstall && !p.msg) || p.state === 'loading') return null;
  if (p.state === 'on' && p.msg?.ok) {
    return (
      <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-2 text-xs flex items-center justify-between gap-2" role="status" data-push-banner="done">
        <span>{p.msg.text}</span>
        <button type="button" onClick={hide} className="p-1 cursor-pointer" aria-label="Close"><X size={14} /></button>
      </div>
    );
  }
  return (
    <div className="mb-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/40 px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2" data-push-banner={p.state}>
      <BellRing size={18} className="text-emerald-600 shrink-0" />
      <div className="flex-1 min-w-[12rem] text-xs text-slate-700 dark:text-slate-200">
        <b className="text-slate-900 dark:text-white">Get follow-up reminders on this {/android|iphone|ipad/i.test(navigator.userAgent) ? 'phone' : 'device'}.</b>{' '}
        {p.state === 'homescreen' ? <Steps /> : 'A notification comes when a follow-up or task is due, even when the CRM is closed.'}
        {p.msg && !p.msg.ok && <div className="text-rose-600 mt-1">{p.msg.text}</div>}
      </div>
      <div className="flex items-center gap-1.5">
        {p.state === 'off' && (
          <button type="button" onClick={p.turnOn} disabled={p.busy} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60" data-push-on>
            {p.busy ? <Loader2 size={13} className="animate-spin" /> : <BellRing size={13} />} Turn on
          </button>
        )}
        {canInstall && (
          <button type="button" onClick={install} className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-white dark:bg-slate-900 text-emerald-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer" data-install-app>
            <Download size={13} /> Install app
          </button>
        )}
        <button type="button" onClick={hide} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Not now"><X size={14} /></button>
      </div>
    </div>
  );
}

/** One line with an on / off switch (bell menu, Help & Support). */
export function PushSwitch() {
  const p = usePush();
  if (p.state === 'loading') return null;
  return (
    <div className="text-xs" data-push-switch={p.state}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
          {p.state === 'on' ? <BellRing size={14} className="text-emerald-600" /> : <BellOff size={14} className="text-slate-400" />}
          Notifications on this device
        </span>
        {p.state === 'on' && (
          <span className="flex items-center gap-1">
            <button type="button" onClick={p.test} disabled={p.busy} className="px-2 py-1 rounded-md text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 cursor-pointer">Test</button>
            <button type="button" onClick={p.turnOff} disabled={p.busy} className="px-2 py-1 rounded-md text-[11px] font-bold text-slate-500 hover:bg-slate-100 cursor-pointer">Turn off</button>
          </span>
        )}
        {p.state === 'off' && (
          <button type="button" onClick={p.turnOn} disabled={p.busy} className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1">
            {p.busy && <Loader2 size={11} className="animate-spin" />} Turn on
          </button>
        )}
      </div>
      {p.state === 'blocked' && <p className="text-[11px] text-amber-700 mt-1">Blocked in this browser. Allow notifications for this site in the browser settings (the lock icon next to the address).</p>}
      {p.state === 'unsupported' && <p className="text-[11px] text-slate-500 mt-1">This browser cannot show notifications. Use Chrome, Edge or Firefox.</p>}
      {p.state === 'homescreen' && <p className="text-[11px] text-slate-500 mt-1"><Steps /></p>}
      {p.msg && <p className={`text-[11px] mt-1 ${p.msg.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{p.msg.text}</p>}
    </div>
  );
}
