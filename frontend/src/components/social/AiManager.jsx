import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles, Loader2, Save, Wand2, Trash2, CheckCircle2, AlertCircle, CalendarDays, Clock, PenLine, Send, X, Target, Building2, Pencil } from 'lucide-react';
import { api } from '../../services/api';

/*
 * AI Social Media Manager (Part 1):
 *   1. Brand Profile  – what the AI must know about the business (drafted by AI from the CRM, checked by the owner)
 *   2. Month plan     – content pillars, best times, every post of the month (dates, topics) – editable
 *   3. Posts          – the AI writes every post as a draft (owner's own AI key), then "Schedule all"
 */

const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card';
const input = 'w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none';
const label = 'block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1';
const btn = 'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const primary = `${btn} bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm`;
const violet = `${btn} bg-violet-600 hover:bg-violet-700 text-white shadow-sm`;
const secondary = `${btn} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700`;
const sm = (path, method = 'GET', data) => api.request(`/social${path}`, { method, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
const fmtDay = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
const nextMonth = () => { const d = new Date(); const n = new Date(d.getFullYear(), d.getMonth() + (d.getDate() > 20 ? 1 : 0), 1); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`; };
const PILLAR_COLORS = ['bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-sky-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-orange-500'];
const POST_STATUS = { draft: ['Written (draft)', 'bg-slate-100 text-slate-700 border-slate-200'], pending_approval: ['Needs approval', 'bg-amber-50 text-amber-800 border-amber-200'], scheduled: ['Scheduled', 'bg-violet-50 text-violet-700 border-violet-200'], posted: ['Posted', 'bg-emerald-50 text-emerald-700 border-emerald-200'], failed: ['Failed', 'bg-rose-50 text-rose-700 border-rose-200'], partial: ['Partly posted', 'bg-amber-50 text-amber-800 border-amber-200'], publishing: ['Posting…', 'bg-blue-50 text-blue-700 border-blue-200'] };

function Notice({ type = 'info', children, onClose }) {
  const cls = type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : type === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600';
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;
  return <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${cls}`}><Icon size={14} className="shrink-0 mt-px" /><div className="min-w-0 flex-1">{children}</div>{onClose && <button className="cursor-pointer" onClick={onClose} aria-label="Close message"><X size={13} /></button>}</div>;
}

const BRAND_FORM = [
  ['company', 'Company name *', 'Nova Agro Exports Pvt Ltd'],
  ['website', 'Website', 'www.yourcompany.com'],
  ['about', 'About the company (2–3 lines)', 'Indian exporter of turmeric, maize and DDGS with our own processing unit in Kerala.', true],
  ['products', 'Products and key specs *', 'Turmeric finger (curcumin 3%+), Maize (feed grade), Rice DDGS (protein 45%+)', true],
  ['certifications', 'Certificates / registrations', 'APEDA, Spices Board, FSSAI, ISO 22000'],
  ['countries', 'Target buyer countries', 'UAE, Saudi Arabia, Vietnam, Bangladesh'],
  ['buyers', 'Who are the buyers?', 'Importers, distributors, feed mills'],
  ['usp', 'What makes you different?', 'Own processing unit, lab report with every lot, 15 years of exports', true],
  ['competitors', 'Competitors (optional)', 'Vietnam and Myanmar suppliers'],
  ['tone', 'Tone of voice', 'professional and friendly'],
  ['language', 'Language of posts', 'English'],
  ['goal', 'Goal of social media', 'Get enquiries from importers'],
  ['cta', 'Usual call to action', 'WhatsApp us for today\'s CIF price'],
  ['avoid', 'Never say / avoid', 'No prices in posts; no claims about organic'],
  ['photos', 'Photos you have / can take', 'Product close-ups, packing, container loading, factory'],
];

/* ---------------- Step 1: Brand Profile ---------------- */

function BrandStep({ isOwner, onSaved }) {
  const [b, setB] = useState(null);
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  useEffect(() => { sm('/brand').then((r) => { setB(r.data); setEditing(!r.data.saved); }).catch((e) => setMsg({ type: 'error', text: e.message })); }, []);
  if (!b) return <div className="text-xs text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>;
  const draft = async () => {
    setBusy('draft'); setMsg(null);
    try { const r = await sm('/brand/draft', 'POST', { description: desc }); setB({ ...b, ...r.data, saved: b.saved }); setMsg({ type: 'success', text: r.message }); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const save = async () => {
    setBusy('save'); setMsg(null);
    try { const r = await sm('/brand', 'PUT', b); setB(r.data); setEditing(false); setMsg({ type: 'success', text: r.message }); onSaved(); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  if (!editing) {
    return (
      <div className="space-y-2" data-ai-brand-summary>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          {BRAND_FORM.filter(([k]) => b[k]).map(([k, l]) => <div key={k}><span className="text-slate-500">{l.replace(' *', '')}:</span> <span className="text-slate-800 dark:text-slate-100 font-medium">{b[k]}</span></div>)}
        </div>
        {msg && <Notice type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Notice>}
        {isOwner && <button className={secondary} onClick={() => setEditing(true)}><Pencil size={13} /> Edit profile</button>}
      </div>
    );
  }
  return (
    <div className="space-y-3" data-ai-brand-form>
      {!isOwner ? <Notice>Only the company owner fills in the Brand Profile.</Notice> : (
        <div className="rounded-xl border border-violet-200 bg-violet-50/60 dark:bg-violet-950/20 dark:border-violet-900 p-3 space-y-2">
          <div className="text-xs font-bold text-violet-800 dark:text-violet-200 flex items-center gap-1.5"><Sparkles size={13} /> Let the AI fill it in</div>
          <p className="text-[11px] text-violet-700/80 dark:text-violet-300/80">Write a few lines about your business in your own words (Hindi / Hinglish is fine). The AI also uses the products and buyer countries already in your CRM, then fills the form. You check it and save.</p>
          <textarea className={`${input} min-h-[70px]`} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Hum Kerala se turmeric aur maize export karte hain, mainly Dubai aur Vietnam. Apni processing unit hai, har lot ki lab report dete hain…" aria-label="Describe your business" />
          <button className={violet} disabled={busy !== ''} onClick={draft}>{busy === 'draft' ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Fill the profile with AI</button>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-2">
        {BRAND_FORM.map(([k, l, ph, long]) => (
          <div key={k} className={long ? 'sm:col-span-2' : ''}>
            <label className={label} htmlFor={`brand-${k}`}>{l}</label>
            {long ? <textarea id={`brand-${k}`} className={`${input} min-h-[56px]`} value={b[k] || ''} onChange={(e) => setB({ ...b, [k]: e.target.value })} placeholder={ph} disabled={!isOwner} />
              : <input id={`brand-${k}`} className={input} value={b[k] || ''} onChange={(e) => setB({ ...b, [k]: e.target.value })} placeholder={ph} disabled={!isOwner} />}
          </div>
        ))}
      </div>
      {msg && <Notice type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Notice>}
      {isOwner && <div className="flex gap-2"><button className={primary} disabled={busy !== ''} onClick={save}>{busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Brand Profile</button>{b.saved && <button className={secondary} onClick={() => setEditing(false)}>Cancel</button>}</div>}
    </div>
  );
}

/* ---------------- Steps 2 + 3: month plan and posts ---------------- */

function PlanSteps({ status, isOwner, accounts, onPostsChanged, onOpenPost }) {
  const [month, setMonth] = useState(nextMonth());
  const [plan, setPlan] = useState(undefined);
  const [items, setItems] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [perWeek, setPerWeek] = useState(3);
  const connected = [...new Set(accounts.map((a) => a.platform))];
  const [platforms, setPlatforms] = useState(connected.length ? connected : ['facebook', 'instagram']);
  const [focus, setFocus] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [notReady, setNotReady] = useState([]);

  const load = useCallback(() => sm(`/plan?month=${month}`).then((r) => { setPlan(r.data); setItems(r.data ? r.data.items : []); setDirty(false); return r.data; }).catch((e) => setMsg({ type: 'error', text: e.message })), [month]);
  useEffect(() => { setPlan(undefined); setNotReady([]); load(); }, [load]);
  const running = Boolean(plan && plan.job && plan.job.running);
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(async () => {
      const p = await load();
      if (!(p && p.job && !p.job.running)) return;
      onPostsChanged();
      const pics = p.job.kind === 'pictures';
      setMsg(p.job.failed
        ? { type: 'warn', text: `${p.job.done} ${pics ? 'pictures made' : 'posts written'}, ${p.job.failed} failed. ${p.job.stopped || (p.job.errors || [])[0] || ''}` }
        : { type: 'success', text: pics ? `${p.job.done} pictures made. Press “Schedule all” again.` : `${p.job.done} posts written as drafts. Check them in the list or calendar, then press “Schedule all”.` });
    }, 2000);
    return () => clearInterval(t);
  }, [running, load, onPostsChanged]);

  const make = async () => {
    setBusy('make'); setMsg(null);
    try { const r = await sm('/plan', 'POST', { month, posts_per_week: perWeek, platforms, focus }); setPlan(r.data); setItems(r.data.items); setMsg({ type: 'success', text: r.message }); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const saveItems = async () => {
    setBusy('save');
    try { const r = await sm(`/plan/${plan.id}`, 'PUT', { items }); setPlan(r.data); setItems(r.data.items); setDirty(false); setMsg({ type: 'success', text: 'Plan saved' }); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const write = async () => {
    if (dirty) await saveItems();
    setBusy('write'); setMsg(null);
    try { const r = await sm(`/plan/${plan.id}/write`, 'POST', { tz_offset: new Date().getTimezoneOffset() }); setPlan({ ...r.data, job: { running: true, done: 0, total: r.data.items.filter((i) => !i.post_id).length } }); setMsg({ type: 'info', text: r.message }); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const scheduleAll = async () => {
    setBusy('schedule'); setMsg(null);
    try { const r = await sm(`/plan/${plan.id}/schedule`, 'POST', {}); setPlan(r.data); setItems(r.data.items); setNotReady(r.data.not_ready || []); setMsg({ type: r.data.not_ready?.length ? 'warn' : 'success', text: r.message }); onPostsChanged(); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const needPic = notReady.filter((n) => /picture/i.test(n.problem)).length;
  const pictures = async () => {
    setBusy('pictures'); setMsg(null);
    try { const r = await sm(`/plan/${plan.id}/pictures`, 'POST', {}); setPlan({ ...r.data, job: { running: true, kind: 'pictures', done: 0, total: needPic } }); setNotReady([]); setMsg({ type: 'info', text: r.message }); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const facebookOnly = async () => {
    setBusy('fbonly'); setMsg(null);
    try { const r = await sm(`/plan/${plan.id}/facebook-only`, 'POST', {}); setNotReady([]); setMsg({ type: 'success', text: r.message }); onPostsChanged(); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const remove = async () => {
    if (!window.confirm('Delete this plan? Its unpublished drafts are removed; scheduled and posted posts stay.')) return;
    try { const r = await sm(`/plan/${plan.id}`, 'DELETE'); setMsg({ type: 'success', text: r.message }); setPlan(null); setItems([]); onPostsChanged(); } catch (e) { setMsg({ type: 'error', text: e.message }); }
  };
  const setItem = (i, p) => { setItems(items.map((it, j) => (j === i ? { ...it, ...p } : it))); setDirty(true); };
  const toWrite = items.filter((i) => !i.post_id).length;
  const drafts = items.filter((i) => i.post_status === 'draft').length;
  const pillars = plan ? plan.pillars || [] : [];
  const colorOf = (name) => PILLAR_COLORS[Math.max(0, pillars.findIndex((p) => p.name === name)) % PILLAR_COLORS.length];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div><label className={label} htmlFor="ai-month">Month</label><input id="ai-month" type="month" className={`${input} w-auto`} value={month} onChange={(e) => setMonth(e.target.value)} /></div>
        {plan === undefined && <Loader2 size={14} className="animate-spin text-slate-400 mb-2" />}
      </div>

      {plan === null && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2" data-ai-plan-form>
          {!isOwner ? <Notice>The company owner makes the monthly plan.</Notice> : (
            <>
              <div className="grid sm:grid-cols-3 gap-2">
                <div><label className={label} htmlFor="ai-perweek">Posts per week</label><input id="ai-perweek" type="number" min={1} max={14} className={input} value={perWeek} onChange={(e) => setPerWeek(e.target.value)} /></div>
                <div className="sm:col-span-2"><div className={label}>Platforms</div><div className="flex gap-3 pt-1.5">{['facebook', 'instagram'].map((p) => <label key={p} className="flex items-center gap-1.5 text-xs capitalize cursor-pointer"><input type="checkbox" checked={platforms.includes(p)} onChange={(e) => setPlatforms(e.target.checked ? [...platforms, p] : platforms.filter((x) => x !== p))} /> {p}</label>)}</div></div>
              </div>
              <div><label className={label} htmlFor="ai-focus">Anything special this month? (optional)</label><input id="ai-focus" className={input} value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="New crop turmeric, Gulfood trade fair on 17–21 Feb, new price list…" /></div>
              <button className={violet} disabled={busy !== '' || !platforms.length || !status.ai?.text} onClick={make}>{busy === 'make' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Make the plan for {month}</button>
              {!status.ai?.text && <p className="text-[11px] text-amber-700">Add your AI key in “AI settings” first.</p>}
            </>
          )}
        </div>
      )}

      {plan && (
        <div className="space-y-4" data-ai-plan>
          {plan.summary && <div className="text-xs text-slate-700 dark:text-slate-200 rounded-xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 px-3 py-2"><b>Strategy:</b> {plan.summary}</div>}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2" data-ai-pillars>
              <div className="text-xs font-bold flex items-center gap-1.5"><Target size={13} className="text-violet-600" /> Content pillars</div>
              <div className="flex h-2.5 rounded-full overflow-hidden">{pillars.map((p) => <div key={p.name} className={colorOf(p.name)} style={{ width: `${p.share}%` }} title={`${p.name} ${p.share}%`} />)}</div>
              {pillars.map((p) => <div key={p.name} className="text-[11px] flex gap-2"><span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${colorOf(p.name)}`} /><span><b>{p.name}</b> {p.share}% <span className="text-slate-500">— {p.why}</span></span></div>)}
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-1.5" data-ai-best-times>
              <div className="text-xs font-bold flex items-center gap-1.5"><Clock size={13} className="text-violet-600" /> Best times to post</div>
              {(plan.best_times || []).map((t, i) => <div key={i} className="text-[11px]"><b>{t.day} {t.time}</b> <span className="text-slate-500">— {t.why}</span></div>)}
              <div className="text-[10px] text-slate-400 pt-1">Times are your own clock. Part 2 will learn the best times from your real results.</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs min-w-[760px]" data-ai-plan-items>
              <thead><tr className="text-left text-[10px] uppercase text-slate-500 bg-slate-50 dark:bg-slate-800/60"><th className="px-2 py-2 w-32">Date</th><th className="px-2 w-20">Time</th><th className="px-2 w-24">Pillar</th><th className="px-2">Post idea</th><th className="px-2 w-24">Where</th><th className="px-2 w-28">Status</th><th className="w-8" /></tr></thead>
              <tbody>{items.map((it, i) => {
                const locked = Boolean(it.post_id) || !isOwner;
                const st = POST_STATUS[it.post_status];
                return (
                  <tr key={it.id} className="border-t border-slate-100 dark:border-slate-800 align-top">
                    <td className="px-2 py-1.5">{locked ? fmtDay(it.date) : <input type="date" className={`${input} !py-1`} value={it.date} onChange={(e) => setItem(i, { date: e.target.value })} aria-label={`Date ${i + 1}`} />}</td>
                    <td className="px-2 py-1.5">{locked ? it.time : <input type="time" className={`${input} !py-1`} value={it.time} onChange={(e) => setItem(i, { time: e.target.value })} aria-label={`Time ${i + 1}`} />}</td>
                    <td className="px-2 py-1.5"><span className="inline-flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${colorOf(it.pillar)}`} />{it.pillar}</span><div className="text-[10px] text-slate-400">{it.format}</div></td>
                    <td className="px-2 py-1.5">{locked ? <><div className="font-semibold">{it.title}</div><div className="text-[11px] text-slate-500">{it.brief}</div></> : <><input className={`${input} !py-1 font-semibold`} value={it.title} onChange={(e) => setItem(i, { title: e.target.value })} aria-label={`Idea ${i + 1}`} /><textarea className={`${input} !py-1 mt-1 min-h-[40px]`} value={it.brief} onChange={(e) => setItem(i, { brief: e.target.value })} /></>}</td>
                    <td className="px-2 py-1.5 capitalize">{(it.platforms || []).join(', ')}</td>
                    <td className="px-2 py-1.5">{st ? <button type="button" className={`px-2 py-0.5 rounded-full border text-[10px] font-bold cursor-pointer ${st[1]}`} onClick={() => onOpenPost(it.post_id)}>{st[0]}</button> : <span className="text-[10px] text-slate-400">Not written</span>}</td>
                    <td className="py-1.5">{!locked && <button type="button" className="p-1 text-rose-500 cursor-pointer" onClick={() => { setItems(items.filter((_, j) => j !== i)); setDirty(true); }} aria-label={`Remove idea ${i + 1}`}><Trash2 size={13} /></button>}</td>
                  </tr>);
              })}</tbody>
            </table>
          </div>

          {running && (
            <div className="space-y-1" data-ai-writing>
              <div className="text-xs text-violet-700 flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> {plan.job.kind === 'pictures' ? 'The AI is making pictures…' : 'The AI is writing your posts…'} {plan.job.done} of {plan.job.total}</div>
              <div className="h-2 rounded-full bg-violet-100 overflow-hidden"><div className="h-full bg-violet-600 transition-all" style={{ width: `${plan.job.total ? (plan.job.done / plan.job.total) * 100 : 5}%` }} /></div>
            </div>
          )}
          {msg && <Notice type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Notice>}
          {notReady.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-1.5" data-ai-not-ready>
              <div className="text-xs font-bold text-amber-800">These posts need something before they can be scheduled:</div>
              {needPic > 0 && (
                <div className="flex flex-wrap gap-2 pb-1">
                  <button className={violet} disabled={busy !== '' || !status.ai?.image} onClick={pictures} title={status.ai?.image ? '' : 'Add an OpenAI, Gemini or Grok key in AI settings'}>{busy === 'pictures' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Make pictures with AI for all {needPic}</button>
                  <button className={secondary} disabled={busy !== ''} onClick={facebookOnly}>Post these on Facebook only</button>
                </div>
              )}
              {notReady.map((n) => <div key={n.post_id} className="flex items-center gap-2 text-[11px]"><span className="text-slate-500 w-24 shrink-0">{n.date ? fmtDay(n.date) : ''}</span><span className="font-semibold flex-1 truncate">{n.title}</span><span className="text-amber-800">{n.problem}</span><button className={`${secondary} !px-2 !py-1`} onClick={() => onOpenPost(n.post_id, true)}><PenLine size={12} /> Fix</button></div>)}
            </div>
          )}
          {isOwner && (
            <div className="flex flex-wrap gap-2">
              {dirty && <button className={secondary} disabled={busy !== ''} onClick={saveItems}>{busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save plan changes</button>}
              {toWrite > 0 && <button className={violet} disabled={busy !== '' || running || !status.ai?.text} onClick={write}>{busy === 'write' ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Write {toWrite === items.length ? 'all' : 'the remaining'} {toWrite} posts with AI</button>}
              {drafts > 0 && !running && <button className={primary} disabled={busy !== ''} onClick={scheduleAll}>{busy === 'schedule' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Schedule all {drafts} written posts</button>}
              <button className={`${secondary} text-rose-600`} disabled={busy !== '' || running} onClick={remove}><Trash2 size={13} /> Delete plan</button>
            </div>
          )}
          <p className="text-[11px] text-slate-500">Tip: click a post's status to open it — change the text, add a photo (Instagram needs one), or make one with AI. Nothing is published until it is scheduled.</p>
        </div>
      )}
    </div>
  );
}

export default function AiManager({ status, isOwner, accounts, onPostsChanged, onOpenPost, onStatusChanged }) {
  const [step, setStep] = useState(status.brand_saved ? 2 : 1);
  const steps = [[1, 'Know the business', Building2], [2, 'Month plan & posts', CalendarDays]];
  return (
    <div className="space-y-4" data-ai-manager>
      <div className={`${card} p-4`}>
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-700 flex items-center justify-center shrink-0"><Sparkles size={18} /></span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Your AI Social Media Manager</h3>
            <p className="text-xs text-slate-500 mt-0.5">1. It learns your business once. 2. It plans the month — themes, best days and times, every post. 3. It writes every post with your own AI key. You check, change anything, then schedule them all. Results and the next month's plan from them come in Part 2.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {steps.map(([n, l, Icon]) => (
            <button key={n} type="button" onClick={() => setStep(n)} className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${step === n ? 'border-violet-400 bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200' : 'border-slate-200 dark:border-slate-700 text-slate-600'}`} aria-pressed={step === n}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === n ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{n}</span><Icon size={13} /> {l}
              {n === 1 && status.brand_saved && <CheckCircle2 size={13} className="text-emerald-600 ml-auto" />}
            </button>
          ))}
        </div>
      </div>
      <div className={`${card} p-4 sm:p-5`}>
        {step === 1 ? <BrandStep isOwner={isOwner} onSaved={() => { onStatusChanged(); setStep(2); }} />
          : !status.brand_saved ? <Notice type="warn">First fill in step 1, so the AI knows your business. <button className="font-bold underline cursor-pointer" onClick={() => setStep(1)}>Go to step 1</button></Notice>
          : <PlanSteps status={status} isOwner={isOwner} accounts={accounts} onPostsChanged={onPostsChanged} onOpenPost={onOpenPost} />}
      </div>
    </div>
  );
}
