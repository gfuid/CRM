import React, { useCallback, useEffect, useState } from 'react';
import { Send, MailOpen, MousePointerClick, AlertCircle, UserX, Gauge, Loader2, RefreshCw, Clock } from 'lucide-react';
import { api } from '../../services/api';

const fmt = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};
const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card';

function Stat({ icon: Icon, label, value, sub, tone, id }) {
  return (
    <div className={`${card} p-4`} data-stat={id}>
      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${tone}`}><Icon size={14} /></span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

/** Email Marketing dashboard: today's limit, what was sent, opened, clicked, failed and unsubscribed. */
export default function EmailDashboard({ onOpenSettings }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.getEmailDashboard(days)
      .then((res) => { setData(res?.data || null); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [days]);
  useEffect(load, [load]);

  if (!data) {
    return (
      <div className={`${card} p-5 text-xs text-slate-400 flex items-center gap-2`}>
        {error ? <span className="text-rose-500">{error}</span> : <><Loader2 size={14} className="animate-spin" /> Loading dashboard…</>}
      </div>
    );
  }

  const { limit, totals, series, recent } = data;
  const usedPct = limit.daily_limit ? Math.min(100, Math.round((limit.sent_24h / limit.daily_limit) * 100)) : 0;
  const maxDay = Math.max(1, ...series.map((d) => d.sent));

  return (
    <div className="space-y-4" data-email-dashboard>
      {/* Daily limit */}
      <div className={`${card} p-4 sm:p-5`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Gauge size={16} className="text-emerald-600" /> Daily sending limit</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Counted over the last 24 hours, the way Gmail and Outlook count. When the limit is reached, campaigns wait and continue by themselves.
            </p>
          </div>
          <button type="button" onClick={onOpenSettings} className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer">
            Change limit
          </button>
        </div>
        <div className="mt-3 flex items-end justify-between text-xs font-semibold">
          <span className="text-slate-700 dark:text-slate-200" id="email-limit-used"><span className="text-2xl font-bold tabular-nums">{limit.sent_24h}</span> / {limit.daily_limit} sent</span>
          <span className={limit.left > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}>{limit.left > 0 ? `${limit.left} left` : 'Limit reached'}</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-1.5 overflow-hidden">
          <div className={`h-full transition-all ${usedPct >= 100 ? 'bg-rose-500' : usedPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${usedPct}%` }} />
        </div>
        {limit.is_default && <p className="text-[10px] text-slate-400 mt-1">Safe default for your email provider. You can change it in Sender setup.</p>}
        {limit.next_free_at && <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1"><Clock size={11} /> Sending continues after {fmt(limit.next_free_at)}</p>}
        {limit.waiting_campaigns.length > 0 && (
          <ul className="mt-2 space-y-1">
            {limit.waiting_campaigns.map((c) => (
              <li key={c.id} className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md px-2 py-1">
                “{c.name}” is waiting: {c.left_to_send} left to send{c.resume_at ? `, continues after ${fmt(c.resume_at)}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Period + numbers */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">Results</div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-[11px] font-semibold" role="radiogroup" aria-label="Period">
            {[7, 30, 90].map((d) => (
              <button key={d} type="button" role="radio" aria-checked={days === d} onClick={() => setDays(d)}
                className={`px-2.5 py-1 rounded-md cursor-pointer ${days === d ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}>
                {d} days
              </button>
            ))}
          </div>
          <button type="button" onClick={load} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Refresh dashboard">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat id="sent" icon={Send} label="Sent" value={totals.sent} sub={`in the last ${days} days`} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" />
        <Stat id="opened" icon={MailOpen} label="Opened" value={totals.opened} sub={`${totals.open_rate}% of sent`} tone="bg-blue-50 text-blue-600 dark:bg-blue-500/10" />
        <Stat id="clicked" icon={MousePointerClick} label="Clicked a link" value={totals.clicked} sub={`${totals.click_rate}% of sent`} tone="bg-violet-50 text-violet-600 dark:bg-violet-500/10" />
        <Stat id="failed" icon={AlertCircle} label="Failed / bounced" value={totals.failed} sub={`${totals.fail_rate}% of tried`} tone="bg-rose-50 text-rose-600 dark:bg-rose-500/10" />
        <Stat id="unsub" icon={UserX} label="Unsubscribed" value={totals.unsubscribed} sub={`${totals.unsubscribed_all_time} in total`} tone="bg-amber-50 text-amber-600 dark:bg-amber-500/10" />
      </div>
      <p className="text-[10px] text-slate-400 -mt-1">
        “Opened” counts when the buyer’s email app loads the pictures. Some apps block pictures and some open them by themselves, so treat it as a guide; a click is the surest sign.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Last 14 days */}
        <div className={`${card} p-4 sm:p-5`}>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Last 14 days</div>
          <div className="mt-3 flex items-end gap-1 h-32" role="img" aria-label="Emails sent and opened per day">
            {series.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full min-w-0" title={`${d.date}: ${d.sent} sent, ${d.opened} opened, ${d.clicked} clicked`}>
                <div className="w-full relative rounded-t bg-emerald-200 dark:bg-emerald-900/60" style={{ height: `${(d.sent / maxDay) * 100}%`, minHeight: d.sent ? 3 : 0 }}>
                  <div className="absolute bottom-0 inset-x-0 rounded-t bg-blue-500/80" style={{ height: d.sent ? `${(d.opened / d.sent) * 100}%` : 0 }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-slate-400 mt-1">
            <span>{series[0]?.date.slice(5)}</span><span>{series[series.length - 1]?.date.slice(5)}</span>
          </div>
          <div className="flex gap-3 text-[10px] text-slate-500 mt-2">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 dark:bg-emerald-900" /> Sent</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500/80" /> Opened</span>
          </div>
        </div>

        {/* Recent opens and clicks */}
        <div className={`${card} p-4 sm:p-5`}>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Who opened or clicked recently</div>
          {recent.length === 0 ? (
            <p className="text-[11px] text-slate-400 mt-3">Nothing yet. Opens and clicks of your campaigns show up here.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800" data-recent-activity>
              {recent.map((r, i) => (
                <li key={`${r.email}-${i}`} className="py-1.5 flex items-start gap-2 text-[11px]">
                  <span className={`mt-0.5 shrink-0 ${r.what === 'clicked' ? 'text-violet-600' : 'text-blue-600'}`}>
                    {r.what === 'clicked' ? <MousePointerClick size={13} /> : <MailOpen size={13} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{r.company || r.email}</div>
                    <div className="text-slate-500 truncate">{r.what === 'clicked' ? 'Clicked' : 'Opened'} “{r.campaign}”{r.company ? ` · ${r.email}` : ''}</div>
                  </div>
                  <span className="text-slate-400 shrink-0">{fmt(r.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
