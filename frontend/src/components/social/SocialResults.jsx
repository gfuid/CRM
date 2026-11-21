import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Loader2, Sparkles, TrendingUp, TrendingDown, Heart, Eye, MessageSquare, Users, ExternalLink, AlertCircle, CheckCircle2, X, Lightbulb } from 'lucide-react';
import { api } from '../../services/api';

/* Results of a month: totals, what worked (pillar / day / time / format / platform), top and weak posts,
   leads that came from posts, and the AI's review. Next month's plan reads the same numbers. */

const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card';
const btn = 'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const violet = `${btn} bg-violet-600 hover:bg-violet-700 text-white shadow-sm`;
const secondary = `${btn} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700`;
const sm = (path, method = 'GET', data) => api.request(`/social${path}`, { method, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
const n = (v) => Number(v || 0).toLocaleString('en-IN');
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

function Notice({ type = 'info', children, onClose }) {
  const cls = type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600';
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;
  return <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${cls}`}><Icon size={14} className="shrink-0 mt-px" /><div className="min-w-0 flex-1">{children}</div>{onClose && <button className="cursor-pointer" onClick={onClose} aria-label="Close message"><X size={13} /></button>}</div>;
}

function Bars({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.avg_engagement));
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2" data-results-group={title}>
      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{title} <span className="font-normal text-slate-400">· average engagement per post</span></div>
      {rows.length === 0 ? <div className="text-[11px] text-slate-400">No data yet</div> : rows.map((r, i) => (
        <div key={r.name} className="text-[11px]">
          <div className="flex justify-between gap-2"><span className="font-semibold capitalize">{i === 0 && rows.length > 1 ? '🏆 ' : ''}{r.name}</span><span className="text-slate-500 shrink-0">{r.avg_engagement} · {r.posts} post{r.posts === 1 ? '' : 's'}{r.leads ? ` · ${r.leads} lead${r.leads === 1 ? '' : 's'}` : ''}</span></div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-0.5"><div className={`h-full ${i === 0 ? 'bg-emerald-500' : i === rows.length - 1 && rows.length > 2 ? 'bg-rose-400' : 'bg-violet-400'}`} style={{ width: `${(r.avg_engagement / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function PostRow({ p, weak }) {
  return (
    <div className="flex items-center gap-3 text-[11px] py-1.5 border-t border-slate-100 dark:border-slate-800 first:border-t-0">
      {weak ? <TrendingDown size={14} className="text-rose-500 shrink-0" /> : <TrendingUp size={14} className="text-emerald-600 shrink-0" />}
      <div className="min-w-0 flex-1"><div className="font-semibold truncate">{p.title || p.text}</div><div className="text-slate-500">{p.pillar} · {p.format} · {p.day} · {(p.platforms || []).join(', ')}</div></div>
      <div className="text-right shrink-0 tabular-nums"><div><b>{n(p.engagement)}</b> eng · {n(p.reach)} reach</div>{p.leads > 0 && <div className="text-emerald-700 font-bold">{p.leads} lead{p.leads === 1 ? '' : 's'}</div>}</div>
      {p.permalink && <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-700" aria-label="Open the post"><ExternalLink size={13} /></a>}
    </div>
  );
}

export default function SocialResults({ isOwner, aiReady }) {
  const [month, setMonth] = useState(thisMonth());
  const [r, setR] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const tz = new Date().getTimezoneOffset();
  const load = useCallback(() => sm(`/report?month=${month}&tz_offset=${tz}`).then((x) => setR(x.data)).catch((e) => setMsg({ type: 'error', text: e.message })), [month, tz]);
  useEffect(() => { setR(null); load(); }, [load]);
  const refresh = async () => { setBusy('refresh'); setMsg(null); try { const x = await sm('/results/refresh', 'POST'); setMsg({ type: 'success', text: x.message }); await load(); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); } };
  const review = async () => { setBusy('review'); setMsg(null); try { await sm('/report/review', 'POST', { month, tz_offset: tz }); await load(); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); } };
  const kpis = r ? [
    ['Posts', r.posts, null], ['Reach', r.totals.reach, Eye], ['Likes & reactions', r.totals.likes, Heart], ['Comments', r.totals.comments, MessageSquare],
    ['Engagement / post', r.totals.avg_engagement, TrendingUp], ['Leads from posts', r.totals.leads, Users],
  ] : [];
  return (
    <div className="space-y-4" data-social-results>
      <div className="flex flex-wrap items-end gap-2 justify-between">
        <div><label className="block text-[11px] font-semibold text-slate-600 mb-1" htmlFor="results-month">Month</label><input id="results-month" type="month" className="px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
        <div className="flex gap-2">
          <button className={secondary} disabled={busy !== ''} onClick={refresh}>{busy === 'refresh' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Update results now</button>
          {isOwner && <button className={violet} disabled={busy !== '' || !aiReady || !r || !r.posts} onClick={review}>{busy === 'review' ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {r && r.review ? 'Review again with AI' : 'AI review of the month'}</button>}
        </div>
      </div>
      {msg && <Notice type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Notice>}
      {!r ? <div className="text-xs text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div> : r.posts === 0 ? (
        <div className={`${card} p-8 text-center`}><TrendingUp size={28} className="mx-auto text-slate-300" /><div className="text-sm font-semibold mt-2">No published posts in this month yet</div><div className="text-xs text-slate-500 mt-1">Results come in by themselves every few hours after posts go out (or press “Update results now”).</div></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2" data-results-kpis>
            {kpis.map(([l, v, Icon]) => <div key={l} className={`${card} p-3`}><div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">{Icon && <Icon size={11} />}{l}</div><div className="text-xl font-black mt-1 tabular-nums">{n(v)}</div></div>)}
          </div>
          {r.review && (
            <div className={`${card} p-4 space-y-2 border-violet-200`} data-results-review>
              <div className="text-sm font-bold flex items-center gap-2"><Sparkles size={15} className="text-violet-600" /> AI review of {month}</div>
              <p className="text-xs text-slate-700 dark:text-slate-200">{r.review.text}</p>
              <div className="grid md:grid-cols-3 gap-3 text-[11px]">
                <div><div className="font-bold text-emerald-700 mb-1">✅ What worked</div>{r.review.points.worked.map((x) => <div key={x}>• {x}</div>)}</div>
                <div><div className="font-bold text-rose-600 mb-1">⚠️ What did not</div>{r.review.points.not_worked.map((x) => <div key={x}>• {x}</div>)}</div>
                <div><div className="font-bold text-violet-700 mb-1 flex items-center gap-1"><Lightbulb size={12} /> Next month</div>{r.review.points.next_month.map((x) => <div key={x}>• {x}</div>)}</div>
              </div>
              <div className="text-[10px] text-slate-400">The next month's plan in “AI Manager” uses these results and this advice by itself.</div>
            </div>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Bars title="Content pillars" rows={r.by_pillar} />
            <Bars title="Days" rows={r.by_day} />
            <Bars title="Time of day" rows={r.by_time} />
            <Bars title="Formats" rows={r.by_format} />
            <Bars title="Platforms" rows={r.by_platform} />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className={`${card} p-3`} data-results-top><div className="text-xs font-bold mb-1">Best posts</div>{r.top.map((p) => <PostRow key={p.id} p={p} />)}</div>
            <div className={`${card} p-3`} data-results-weak><div className="text-xs font-bold mb-1">Weakest posts</div>{r.weak.length ? r.weak.map((p) => <PostRow key={p.id} p={p} weak />) : <div className="text-[11px] text-slate-400">Shown from 6 posts a month.</div>}</div>
          </div>
          <p className="text-[10px] text-slate-400">Engagement = likes + comments + shares + saves + clicks. Reach needs Facebook's “insights” access. Leads count buyers made into leads from a comment on that post (Comments tab).</p>
        </>
      )}
    </div>
  );
}
