import React, { useCallback, useEffect, useState } from 'react';
import {
  PhoneCall, Crown, Lock, Loader2, BarChart3, ListChecks, Megaphone, Settings, Plus, Play, Pause, Trash2, CheckCircle2, AlertCircle,
  Tag, Search, X, PhoneOutgoing, Clock, Globe, Volume2, FileText,
} from 'lucide-react';
import { api } from '../services/api';

const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card';
const input = 'w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none';
const label = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1';
const btn = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const primary = `${btn} bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm`;
const secondary = `${btn} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700`;
const ai = (path, method = 'GET', data) => api.request(`/ai-calls${path}`, { method, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
const fmt = (s) => (s ? new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const mins = (secs) => (secs ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : '0:00');
const money = (v, cur = 'USD') => `${cur} ${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export const OUTCOMES = {
  interested: { label: 'Interested', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  callback: { label: 'Call back', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  not_interested: { label: 'Not interested', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  do_not_call: { label: 'Do not call', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  answered: { label: 'Talked', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  no_answer: { label: 'No answer', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  calling: { label: 'Calling…', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  failed: { label: 'Failed', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};
export const OutcomeBadge = ({ call }) => {
  const k = call.status === 'calling' ? 'calling' : call.outcome || (call.status === 'failed' ? 'failed' : 'answered');
  const o = OUTCOMES[k] || OUTCOMES.answered;
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${o.cls}`}>{o.label}</span>;
};

function Notice({ type = 'info', children }) {
  const cls = type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : type === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300';
  return <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${cls}`}>{type === 'success' ? <CheckCircle2 size={14} className="shrink-0 mt-px" /> : <AlertCircle size={14} className="shrink-0 mt-px" />}<div className="min-w-0">{children}</div></div>;
}

/** The recording: loaded with the login token, then played in the browser. */
export function Recording({ callId }) {
  const [url, setUrl] = useState('');
  const [state, setState] = useState('');
  const load = async () => {
    setState('loading');
    try {
      const res = await fetch(`${api.baseUrl}/ai-calls/calls/${callId}/audio`, { headers: api.getHeaders() });
      if (!res.ok) throw new Error();
      setUrl(URL.createObjectURL(await res.blob()));
      setState('');
    } catch { setState('none'); }
  };
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  if (url) return <audio controls autoPlay src={url} className="w-full h-9" data-ai-audio />;
  if (state === 'none') return <span className="text-[11px] text-slate-400">Recording not available yet</span>;
  return <button type="button" className={secondary} onClick={load} disabled={state === 'loading'}>{state === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />} Play recording</button>;
}

/** One call, opened: summary, what the AI collected, recording and transcript. */
export function CallDetail({ id, onClose }) {
  const [c, setC] = useState(null);
  useEffect(() => { ai(`/calls/${id}`).then((r) => setC(r.data)).catch(() => {}); }, [id]);
  if (!c) return <div className="p-4 text-xs text-slate-400 flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Loading…</div>;
  const data = c.data || {};
  return (
    <div className="space-y-3" data-ai-call-detail>
      <div className="flex items-start justify-between gap-2">
        <div><div className="text-sm font-bold text-slate-900 dark:text-white">{c.company || `+${c.to}`}</div><div className="text-[11px] text-slate-500">{c.name} · +{c.to} · {c.country} · {fmt(c.started_at)} · {mins(c.duration_secs)} min · from {c.from_number}</div></div>
        <div className="flex items-center gap-2"><OutcomeBadge call={c} />{onClose && <button className="p-1 text-slate-400 cursor-pointer" onClick={onClose} aria-label="Close"><X size={15} /></button>}</div>
      </div>
      {c.summary && <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-100"><b>Summary:</b> {c.summary}</div>}
      {Object.keys(data).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
          {Object.entries(data).map(([k, v]) => <div key={k} className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2 py-1.5"><div className="text-slate-400 uppercase text-[9px] font-bold">{k.replace(/_/g, ' ')}</div><div className="font-semibold text-slate-800 dark:text-slate-100 break-words">{String(v)}</div></div>)}
        </div>
      )}
      {c.duration_secs > 0 && <Recording callId={c.id} />}
      {(c.transcript || []).length > 0 && (
        <div className="max-h-72 overflow-y-auto space-y-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 p-3" data-ai-transcript>
          {c.transcript.map((t, i) => (
            <div key={i} className={`flex ${t.who === 'ai' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs ${t.who === 'ai' ? 'bg-white dark:bg-slate-800' : 'bg-emerald-100 dark:bg-emerald-900/60'}`}><span className="block text-[9px] font-bold text-slate-400 uppercase">{t.who === 'ai' ? 'AI agent' : 'Buyer'}</span>{t.text}</div>
            </div>
          ))}
        </div>
      )}
      {c.ended_reason && <div className="text-[10px] text-slate-400">Ended: {c.ended_reason}</div>}
    </div>
  );
}

/* ---------------- Dashboard ---------------- */
function Dashboard({ go }) {
  const [d, setD] = useState(null);
  useEffect(() => { ai('/dashboard').then((r) => setD(r.data)).catch(() => {}); }, []);
  if (!d) return <div className={`${card} p-5 text-xs text-slate-400 flex items-center gap-2`}><Loader2 size={14} className="animate-spin" /> Loading…</div>;
  const t = d.totals;
  const tile = (id, title, v, sub, tone) => <div className={`${card} p-4`} data-ai-stat={id}><div className="text-[11px] font-semibold text-slate-500">{title}</div><div className={`mt-1 text-2xl font-black tabular-nums ${tone || 'text-slate-900 dark:text-white'}`}>{v}</div>{sub && <div className="text-[11px] text-slate-500">{sub}</div>}</div>;
  return (
    <div className="space-y-4" data-ai-dashboard>
      {!d.connected && <Notice type="warn">AI Calling is not set up yet. <button className="underline font-semibold cursor-pointer" onClick={() => go('setup')}>Open Setup</button></Notice>}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {tile('calls', 'Calls', t.calls, `${t.in_progress} in progress`)}
        {tile('answered', 'Answered', t.answered, `${t.answer_rate}% picked up`)}
        {tile('interested', 'Interested', t.interested, 'see Calls → Interested', 'text-emerald-600')}
        {tile('callback', 'Call back', t.callback, 'follow-up set on the lead', 'text-violet-600')}
        {tile('minutes', 'Minutes', t.minutes, `${t.no_answer} no answer`)}
        {tile('cost', 'Estimated cost', money(t.cost, t.currency), `last ${d.days} days`)}
      </div>
      <div className={`${card} p-4`}>
        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-1"><Globe size={13} /> By country</div>
        {d.countries.length === 0 ? <div className="text-xs text-slate-400">No calls yet.</div> : (
          <table className="w-full text-xs"><thead className="text-left text-slate-400 text-[11px]"><tr><th className="py-1">Country</th><th>Calls</th><th>Answered</th><th>Interested</th><th>Minutes</th><th className="text-right">Cost</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{d.countries.map((c) => <tr key={c.country}><td className="py-1.5 font-semibold">{c.country}</td><td>{c.calls}</td><td>{c.answered}</td><td className="text-emerald-700 font-bold">{c.interested}</td><td>{c.minutes}</td><td className="text-right">{money(c.cost, t.currency)}</td></tr>)}</tbody></table>
        )}
      </div>
      <p className="text-[10px] text-slate-400">Cost is an estimate from the rates in Setup (ElevenLabs minutes + phone minutes). ElevenLabs and your phone company bill you directly.</p>
    </div>
  );
}

/* ---------------- Calls ---------------- */
function Calls() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const load = useCallback(() => ai(`/calls?outcome=${filter}&q=${encodeURIComponent(q)}`).then((r) => setList(r.data || [])).catch(() => {}), [filter, q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  return (
    <div className="space-y-3" data-ai-calls>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-[11px] font-semibold">
          {[['', 'All'], ['interested', 'Interested'], ['callback', 'Call back'], ['not_interested', 'Not interested'], ['no_answer', 'No answer'], ['calling', 'In progress']].map(([v, l]) => <button key={v} type="button" onClick={() => setFilter(v)} className={`px-2.5 py-1 rounded-md cursor-pointer ${filter === v ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-slate-500'}`}>{l}</button>)}
        </div>
        <div className="relative flex-1 min-w-[180px]"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input className={`${input} pl-8`} placeholder="Search company, number, summary" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      {list.length === 0 ? <div className={`${card} p-8 text-center text-xs text-slate-500`}>No calls here yet.</div> : (
        <div className={`${card} divide-y divide-slate-100 dark:divide-slate-800`}>
          {list.map((c) => (
            <div key={c.id} data-ai-call={c.to}>
              <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} className="w-full text-left px-4 py-3 flex flex-wrap sm:flex-nowrap items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                <span className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0"><PhoneOutgoing size={15} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2"><span className="text-xs font-bold text-slate-900 dark:text-white truncate">{c.company || `+${c.to}`}</span>{c.test && <span className="text-[9px] font-bold text-slate-400">TEST</span>}</span>
                  <span className="block text-[11px] text-slate-500 truncate">{c.summary || (c.status === 'calling' ? 'Call in progress…' : '—')}</span>
                </span>
                <span className="text-[11px] text-slate-500 text-right shrink-0">{c.country || `+${c.to.slice(0, 3)}`}<br />{fmt(c.started_at)} · {mins(c.duration_secs)}</span>
                <OutcomeBadge call={c} />
              </button>
              {open === c.id && <div className="px-4 pb-4"><CallDetail id={c.id} /></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Campaigns ---------------- */
function NewCampaign({ onCreated, onCancel }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState('tags');
  const [tags, setTags] = useState([]);
  const [picked, setPicked] = useState([]);
  const [numbers, setNumbers] = useState('');
  const [startAt, setStartAt] = useState('');
  const [prev, setPrev] = useState({ count: 0, skipped: 0, est_cost_2min: 0, currency: 'USD', countries: {} });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { ai('/tags').then((r) => setTags(r.data || [])).catch(() => {}); }, []);
  useEffect(() => {
    if (mode === 'tags' && !picked.length) { setPrev((p) => ({ ...p, count: 0, skipped: 0, est_cost_2min: 0, countries: {} })); return undefined; }
    const qs = new URLSearchParams({ mode, ...(mode === 'tags' ? { tags: picked.join(',') } : {}), ...(mode === 'custom' ? { numbers } : {}) });
    const t = setTimeout(() => ai(`/audience/preview?${qs}`).then((r) => setPrev(r.data)).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [mode, picked, numbers]);
  const start = async () => {
    if (!window.confirm(`Start AI calls to ${prev.count} buyers? Each buyer is called only in their own office hours.`)) return;
    setBusy(true); setMsg(null);
    try { const r = await ai('/campaigns', 'POST', { name, audience: { mode, tags: picked, numbers }, ...(startAt ? { start_at: new Date(startAt).toISOString() } : {}) }); onCreated(r.message); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(false); }
  };
  return (
    <div className={`${card} p-4 sm:p-5 space-y-3`} data-ai-new-campaign>
      <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900 dark:text-white">New call campaign</h3><button className="p-1 text-slate-400 cursor-pointer" onClick={onCancel} aria-label="Close"><X size={15} /></button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div><label className={label}>Name (only you see it)</label><input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Turmeric buyers – Gulf" aria-label="Campaign name" /></div>
        <div><label className={label}>Start (optional)</label><input type="datetime-local" className={input} value={startAt} onChange={(e) => setStartAt(e.target.value)} /></div>
      </div>
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-[11px] font-semibold w-fit">{[['tags', 'By tags'], ['all', 'All leads'], ['custom', 'Paste numbers']].map(([m, l]) => <button key={m} type="button" onClick={() => setMode(m)} className={`px-3 py-1 rounded-md cursor-pointer ${mode === m ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-slate-500'}`}>{l}</button>)}</div>
      {mode === 'tags' && (tags.length ? <div className="flex flex-wrap gap-1.5">{tags.map((t) => { const on = picked.includes(t.tag); return <button key={t.tag} type="button" onClick={() => setPicked(on ? picked.filter((x) => x !== t.tag) : [...picked, t.tag])} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer ${on ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'}`}><Tag size={10} /> {t.tag} <span className={on ? 'opacity-80' : 'text-slate-400'}>{t.with_phone}</span></button>; })}</div> : <Notice>No tags yet. Add tags to leads, e.g. turmeric-buyer or gulf.</Notice>)}
      {mode === 'all' && <Notice>Every lead with a phone number, except buyers who asked not to be called.</Notice>}
      {mode === 'custom' && <textarea className={`${input} min-h-[80px]`} value={numbers} onChange={(e) => setNumbers(e.target.value)} placeholder="One number per line, with country code" />}
      <div className="text-xs text-slate-600 dark:text-slate-300" data-ai-audience><b>{prev.count}</b> buyers{prev.skipped ? ` · ${prev.skipped} left out (no or wrong number)` : ''} · about <b>{money(prev.est_cost_2min, prev.currency)}</b> if each talks 2 minutes{Object.keys(prev.countries || {}).length > 0 && <span className="text-slate-400"> · {Object.entries(prev.countries).map(([k, v]) => `${k} ${v}`).join(', ')}</span>}</div>
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      <button className={primary} disabled={busy || !prev.count} onClick={start}>{busy ? <Loader2 size={14} className="animate-spin" /> : <PhoneCall size={14} />} Start calling {prev.count || ''}</button>
    </div>
  );
}

function Campaigns() {
  const [list, setList] = useState([]);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState(null);
  const load = useCallback(() => ai('/campaigns').then((r) => setList(r.data || [])).catch(() => {}), []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  const act = async (fn) => { setMsg(null); try { const r = await fn(); setMsg({ type: 'success', text: r.message }); load(); } catch (e) { setMsg({ type: 'error', text: e.message }); } };
  if (creating) return <NewCampaign onCancel={() => setCreating(false)} onCreated={(t) => { setCreating(false); setMsg({ type: 'success', text: t }); load(); }} />;
  return (
    <div className="space-y-3" data-ai-campaigns>
      <div className="flex justify-between items-center gap-2 flex-wrap"><p className="text-xs text-slate-500 max-w-xl">Pick buyers by tag. The AI calls each one in their own office hours (their country's time), tries again later if nobody answers, and writes the result on the lead.</p><button className={primary} onClick={() => setCreating(true)}><Plus size={14} /> New campaign</button></div>
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      {list.length === 0 && <div className={`${card} p-8 text-center text-xs text-slate-500`}>No campaigns yet.</div>}
      {list.map((c) => {
        const s = c.stats;
        return (
          <div key={c.id} className={`${card} p-4`} data-ai-campaign={c.name}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-900 dark:text-white">{c.name}</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${c.status === 'running' ? 'bg-blue-50 text-blue-700 border-blue-200' : c.status === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>{c.status}</span></div><div className="text-[11px] text-slate-500">{fmt(c.created_at)}{c.start_at ? ` · starts ${fmt(c.start_at)}` : ''}{c.error ? ` · ${c.error}` : ''}</div></div>
              <div className="flex gap-1.5">
                {c.status === 'running' && <button className={secondary} onClick={() => act(() => ai(`/campaigns/${c.id}/pause`, 'POST'))}><Pause size={13} /> Pause</button>}
                {c.status === 'paused' && <button className={primary} onClick={() => act(() => ai(`/campaigns/${c.id}/resume`, 'POST'))}><Play size={13} /> Resume</button>}
                <button className="p-2 text-rose-500 cursor-pointer" aria-label="Delete campaign" onClick={() => window.confirm('Delete this campaign? The calls stay in the call log.') && act(() => ai(`/campaigns/${c.id}`, 'DELETE'))}><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-7 gap-2 text-center">
              {[['Buyers', s.total, ''], ['Called', s.called, ''], ['Answered', s.answered, 'text-sky-600'], ['Interested', s.interested, 'text-emerald-700'], ['Call back', s.callback, 'text-violet-600'], ['Waiting', s.pending, 'text-amber-700'], ['Cost', money(s.cost), '']].map(([l, v, cls]) => (
                <div key={l} className="rounded-lg bg-slate-50 dark:bg-slate-800/60 py-1.5"><div className={`text-sm font-black tabular-nums ${cls}`}>{v}</div><div className="text-[10px] text-slate-500">{l}</div></div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Setup ---------------- */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LANGS = [['en', 'English'], ['hi', 'Hindi'], ['ar', 'Arabic'], ['vi', 'Vietnamese'], ['id', 'Indonesian'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['pt', 'Portuguese'], ['ru', 'Russian'], ['zh', 'Chinese']];

function Setup({ onChanged }) {
  const [s, setS] = useState(null);
  const [key, setKey] = useState('');
  const [agentId, setAgentId] = useState('');
  const [script, setScript] = useState({});
  const [testTo, setTestTo] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const load = useCallback(() => ai('/settings').then((r) => { setS(r.data); setAgentId(r.data.agent_id); setScript(r.data.script || {}); }).catch((e) => setMsg({ type: 'error', text: e.message })), []);
  useEffect(() => { load(); }, [load]);
  const run = async (name, fn) => { setBusy(name); setMsg(null); try { const r = await fn(); setMsg({ type: 'success', text: r.message }); load(); onChanged(); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); } };
  if (!s) return <div className={`${card} p-5 text-xs text-slate-400 flex items-center gap-2`}><Loader2 size={14} className="animate-spin" /> Loading…</div>;
  const set = (p) => setS({ ...s, ...p });
  const steps = [
    'ElevenLabs: make an account with agent (conversational AI) minutes, create an agent, copy its Agent ID, and create an API key (Profile → API keys).',
    'Phone number: buy a number. India: Vobiz (console.vobiz.ai, KYC needed). Other countries: Twilio, Telnyx or Plivo. Ask them to switch on international outbound calls for the countries you need.',
    'Vobiz / SIP: create an outbound SIP trunk with a username and password. In ElevenLabs → Phone Numbers → Import number → From SIP trunk, enter the number (+91…), the trunk address, TCP and the same username and password. Twilio numbers can be imported directly.',
    'Paste the API key and Agent ID below and press Save. The numbers of your ElevenLabs account appear here.',
    'Write the sales script, press “Save script to my agent”, then make a test call to your own phone.',
  ];
  return (
    <div className="space-y-4 max-w-4xl" data-ai-setup>
      <div className={`${card} p-4 sm:p-5 space-y-3`}>
        <div className="flex items-start justify-between gap-2 flex-wrap"><h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><PhoneCall size={16} className="text-emerald-600" /> 1. Connect ElevenLabs</h3>{s.connected ? <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Connected · agent {s.agent_name || s.agent_id} · {s.numbers.length} numbers</span> : <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Not connected</span>}</div>
        <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-300">{steps.map((x) => <li key={x}>{x}</li>)}</ol>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div><label className={label}>ElevenLabs API key</label><input className={`${input} font-mono`} type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={s.has_key ? '•••• saved — paste a new one to replace' : 'sk_…'} aria-label="ElevenLabs API key" autoComplete="new-password" /></div>
          <div><label className={label}>Agent ID</label><input className={`${input} font-mono`} value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="agent_…" aria-label="Agent ID" /></div>
        </div>
        <button className={primary} disabled={busy !== ''} onClick={() => run('connect', () => ai('/settings', 'PUT', { api_key: key, agent_id: agentId }).then((r) => { setKey(''); return r; }))}>{busy === 'connect' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Save & read my numbers</button>
      </div>

      {s.numbers.length > 0 && (
        <div className={`${card} p-4 sm:p-5 space-y-3`} data-ai-numbers>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Numbers, calling hours and retries</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div><label className={label}>Call from (default)</label><select className={input} value={s.default_number_id} onChange={(e) => set({ default_number_id: e.target.value })}>{s.numbers.map((n) => <option key={n.id} value={n.id}>{n.number} · {n.label || n.provider}</option>)}</select></div>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Use a different number for some countries (e.g. buyers with +1 from your US number)</div>
            {s.country_numbers.map((c, i) => (
              <div key={i} className="flex items-center gap-2"><span className="text-xs">+</span><input className={`${input} w-20`} value={c.prefix} placeholder="971" onChange={(e) => set({ country_numbers: s.country_numbers.map((x, j) => (j === i ? { ...x, prefix: e.target.value } : x)) })} /><span className="text-xs text-slate-500">→</span><select className={input} value={c.number_id} onChange={(e) => set({ country_numbers: s.country_numbers.map((x, j) => (j === i ? { ...x, number_id: e.target.value } : x)) })}>{s.numbers.map((n) => <option key={n.id} value={n.id}>{n.number} · {n.label || n.provider}</option>)}</select><button className="p-1 text-rose-500 cursor-pointer" onClick={() => set({ country_numbers: s.country_numbers.filter((_, j) => j !== i) })} aria-label="Remove"><X size={13} /></button></div>
            ))}
            <button className="text-[11px] font-bold text-emerald-700 cursor-pointer" onClick={() => set({ country_numbers: [...s.country_numbers, { prefix: '', number_id: s.numbers[0].id }] })}>+ Add country</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div><label className={label}>Call from (buyer's time)</label><input type="number" min={0} max={23} className={input} value={s.window.from_hour} onChange={(e) => set({ window: { ...s.window, from_hour: Number(e.target.value) } })} /></div>
            <div><label className={label}>Until</label><input type="number" min={1} max={24} className={input} value={s.window.to_hour} onChange={(e) => set({ window: { ...s.window, to_hour: Number(e.target.value) } })} /></div>
            <div><label className={label}>Tries if no answer</label><input type="number" min={1} max={5} className={input} value={s.max_attempts} onChange={(e) => set({ max_attempts: Number(e.target.value) })} /></div>
            <div><label className={label}>Try again after (hours)</label><input type="number" min={1} max={72} className={input} value={s.retry_hours} onChange={(e) => set({ retry_hours: Number(e.target.value) })} /></div>
            <div><label className={label}>Calls at the same time</label><input type="number" min={1} max={10} className={input} value={s.concurrency} onChange={(e) => set({ concurrency: Number(e.target.value) })} /></div>
          </div>
          <div className="flex flex-wrap gap-1.5">{DAYS.map((d, i) => { const on = s.window.days.includes(i); return <button key={d} type="button" onClick={() => set({ window: { ...s.window, days: on ? s.window.days.filter((x) => x !== i) : [...s.window.days, i] } })} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border cursor-pointer ${on ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}>{d}</button>; })}</div>
          <div className="space-y-1.5" data-ai-rates>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cost per minute (for estimates, {s.rates.currency})</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div><label className={label}>ElevenLabs (AI)</label><input type="number" step="0.001" className={input} value={s.rates.ai_per_min} onChange={(e) => set({ rates: { ...s.rates, ai_per_min: e.target.value } })} /></div>
              <div><label className={label}>Phone, other countries</label><input type="number" step="0.001" className={input} value={s.rates.phone_default_per_min} onChange={(e) => set({ rates: { ...s.rates, phone_default_per_min: e.target.value } })} /></div>
            </div>
            {s.rates.countries.map((c, i) => (
              <div key={i} className="flex items-center gap-2"><span className="text-xs">+</span><input className={`${input} w-16`} value={c.prefix} onChange={(e) => set({ rates: { ...s.rates, countries: s.rates.countries.map((x, j) => (j === i ? { ...x, prefix: e.target.value } : x)) } })} /><input className={input} value={c.name} placeholder="Country" onChange={(e) => set({ rates: { ...s.rates, countries: s.rates.countries.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) } })} /><input type="number" step="0.001" className={`${input} w-24`} value={c.per_min} onChange={(e) => set({ rates: { ...s.rates, countries: s.rates.countries.map((x, j) => (j === i ? { ...x, per_min: e.target.value } : x)) } })} /><button className="p-1 text-rose-500 cursor-pointer" onClick={() => set({ rates: { ...s.rates, countries: s.rates.countries.filter((_, j) => j !== i) } })} aria-label="Remove rate"><X size={13} /></button></div>
            ))}
            <button className="text-[11px] font-bold text-emerald-700 cursor-pointer" onClick={() => set({ rates: { ...s.rates, countries: [...s.rates.countries, { prefix: '', name: '', per_min: 0 }] } })}>+ Phone rate for a country</button>
          </div>
          <button className={primary} disabled={busy !== ''} onClick={() => run('opts', () => ai('/settings/options', 'PUT', { default_number_id: s.default_number_id, country_numbers: s.country_numbers, window: s.window, max_attempts: s.max_attempts, retry_hours: s.retry_hours, concurrency: s.concurrency, rates: s.rates }))}>Save</button>
        </div>
      )}

      {s.has_key && (
        <div className={`${card} p-4 sm:p-5 space-y-2`} data-ai-script>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileText size={15} /> 3. Sales script of the AI agent</h3>
          <p className="text-xs text-slate-500">The AI says it is your AI assistant, asks one question at a time, never promises prices you did not write, asks for a better time when the buyer is busy, and stops if the buyer says do not call. After each call it notes: interested, call back time, quantity, email, do not call.</p>
          <div><label className={label}>About your company (one or two lines)</label><input className={input} value={script.company_intro || ''} onChange={(e) => setScript({ ...script, company_intro: e.target.value })} placeholder="Indian exporter of spices and animal feed since 2010" aria-label="About your company" /></div>
          <div><label className={label}>Products, specs, prices it may say</label><textarea className={`${input} min-h-[90px]`} value={script.product_info || ''} onChange={(e) => setScript({ ...script, product_info: e.target.value })} placeholder={'Turmeric finger, curcumin 3%+, 25 kg bags, MOQ 1 container\nPrices are sent by email after the call'} aria-label="Products" /></div>
          <div><label className={label}>Goal of the call</label><input className={input} value={script.goal || ''} onChange={(e) => setScript({ ...script, goal: e.target.value })} placeholder="Find the need and monthly quantity, and offer a price list by email" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div><label className={label}>Language</label><select className={input} value={script.language || 'en'} onChange={(e) => setScript({ ...script, language: e.target.value })}>{LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div className="sm:col-span-2"><label className={label}>First sentence</label><input className={input} value={script.first_message || ''} onChange={(e) => setScript({ ...script, first_message: e.target.value })} placeholder="Hello {{buyer_name}}, this is the AI assistant of {{sender_company}}. Do you have one minute to talk about {{product}}?" /></div>
          </div>
          <div><label className={label}>Anything else (optional)</label><input className={input} value={script.extra || ''} onChange={(e) => setScript({ ...script, extra: e.target.value })} placeholder="If asked, say samples are free; freight is paid by the buyer" /></div>
          <p className="text-[10px] text-slate-400">Words in double curly brackets are filled for each buyer: buyer_name, company_name, country, product, sender_company.</p>
          <div className="flex flex-wrap items-center gap-2">
            <button className={primary} disabled={busy !== ''} onClick={() => run('script', () => ai('/settings/script', 'PUT', script))}>{busy === 'script' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Save script to my agent</button>
            {s.script_applied_at && <span className="text-[11px] text-emerald-700">Saved {fmt(s.script_applied_at)}</span>}
          </div>
          {s.connected && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <input className={`${input} w-56`} value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Your phone, e.g. +91 98765 43210" aria-label="Test number" />
              <button className={secondary} disabled={busy !== '' || !testTo} onClick={() => run('test', () => ai('/test-call', 'POST', { to: testTo }))}><PhoneOutgoing size={13} /> Test call to me</button>
            </div>
          )}
        </div>
      )}
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function AiCalling() {
  const [status, setStatus] = useState(null);
  const [tab, setTab] = useState(null);
  const loadStatus = useCallback(() => ai('/status').then((r) => setStatus(r.data)).catch(() => setStatus({ enabled: false })), []);
  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { if (status?.enabled) setTab((t) => t || (status.connected ? 'dashboard' : 'setup')); }, [status?.enabled, status?.connected]);
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'calls', label: 'Calls', icon: ListChecks },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'setup', label: 'Setup', icon: Settings, dot: status && !status.connected },
  ];
  return (
    <div className="w-full space-y-5 pb-12">
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
        <div className="flex items-center gap-2.5 flex-wrap"><h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">AI Calling</h1><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"><Crown size={12} /> Premium</span></div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">An AI sales agent (ElevenLabs) calls your buyers in any country, in their office hours, from your own number. You see who is interested, hear the recording and read the call; the lead's follow-up is set for you.</p>
      </div>
      {!status ? <div className={`${card} p-5 text-xs text-slate-400 flex items-center gap-2`}><Loader2 size={14} className="animate-spin" /> Checking…</div> : !status.enabled ? (
        <div className={`${card} text-center py-12 px-4`} data-ai-locked><div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600"><Lock size={24} /></div><h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">AI Calling is a premium feature</h2><p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">{status.is_owner ? 'Ask the platform admin to switch on AI Calling for your company.' : 'Only the company owner can use AI Calling.'}</p></div>
      ) : (
        <>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 w-fit max-w-full overflow-x-auto" role="tablist">
            {tabs.map((t) => { const Icon = t.icon; return <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap cursor-pointer ${tab === t.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}><Icon size={14} /><span>{t.label}</span>{t.dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}</button>; })}
          </div>
          {tab === 'dashboard' && <Dashboard go={setTab} />}
          {tab === 'calls' && <Calls />}
          {tab === 'campaigns' && <Campaigns />}
          {tab === 'setup' && <Setup onChanged={loadStatus} />}
        </>
      )}
    </div>
  );
}

/** For the lead's detail window: AI calls of this lead (owner only; shows nothing if none). */
export function LeadAiCalls({ leadId }) {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => { let alive = true; setList(null); if (leadId) ai(`/calls?lead_id=${encodeURIComponent(leadId)}`).then((r) => alive && setList(r.data || [])).catch(() => alive && setList([])); return () => { alive = false; }; }, [leadId]);
  if (!list || !list.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2" data-lead-ai-calls>
      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><PhoneCall size={13} className="text-emerald-600" /> AI calls</div>
      {list.map((c) => (
        <div key={c.id}>
          <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} className="w-full text-left flex items-center gap-2 text-[11px] cursor-pointer">
            <OutcomeBadge call={c} /><span className="text-slate-500 shrink-0"><Clock size={10} className="inline" /> {fmt(c.started_at)} · {mins(c.duration_secs)}</span><span className="truncate text-slate-700 dark:text-slate-200">{c.summary}</span>
          </button>
          {open === c.id && <div className="mt-2"><CallDetail id={c.id} /></div>}
        </div>
      ))}
    </div>
  );
}
