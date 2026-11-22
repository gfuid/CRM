import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageCircle, Crown, Lock, Loader2, Send, LayoutTemplate, Settings, Bot, BarChart3, Megaphone, Plus, RefreshCw, Trash2,
  CheckCircle2, AlertCircle, Copy, Image as ImageIcon, X, Check, CheckCheck, Clock, Search, Tag, ExternalLink, Eye, EyeOff, Play, CalendarClock,
} from 'lucide-react';
import { api } from '../services/api';

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card';
const input = 'w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none';
const label = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1';
const btn = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const primary = `${btn} bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm`;
const secondary = `${btn} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700`;
const fmt = (s) => (s ? new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const money = (v, cur = 'USD') => `${cur} ${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

function Notice({ type = 'info', children }) {
  const cls = type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
    : type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
    : type === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300'
    : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300';
  const Icon = type === 'error' ? AlertCircle : type === 'success' ? CheckCircle2 : AlertCircle;
  return <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${cls}`}><Icon size={14} className="shrink-0 mt-px" /><div className="min-w-0">{children}</div></div>;
}

const STATUS_STYLE = {
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200', PENDING: 'bg-amber-50 text-amber-800 border-amber-200', REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  PAUSED: 'bg-slate-100 text-slate-600 border-slate-200', DISABLED: 'bg-slate-100 text-slate-600 border-slate-200',
  sent: 'bg-emerald-50 text-emerald-700 border-emerald-200', sending: 'bg-blue-50 text-blue-700 border-blue-200', scheduled: 'bg-violet-50 text-violet-700 border-violet-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200', draft: 'bg-slate-100 text-slate-600 border-slate-200', paused: 'bg-amber-50 text-amber-800 border-amber-200', waiting_limit: 'bg-amber-50 text-amber-800 border-amber-200',
};
const Badge = ({ s }) => <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${STATUS_STYLE[s] || STATUS_STYLE.draft}`}>{String(s || '').replace('_', ' ').toLowerCase()}</span>;

/** How a template looks on the buyer's phone. */
function PhonePreview({ t, values = [] }) {
  const text = String(t.body || '').replace(/\{\{(\d+)\}\}/g, (m, n) => values[Number(n) - 1] || m);
  return (
    <div className="rounded-2xl bg-[#e5ddd5] dark:bg-slate-800 p-3" data-wa-preview>
      <div className="max-w-[300px] rounded-lg bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {t.header_type === 'image' && (t.header_url
          ? <img src={t.header_url} alt="" className="w-full max-h-40 object-cover" />
          : <div className="h-28 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400"><ImageIcon size={28} /></div>)}
        <div className="px-3 py-2 space-y-1">
          {t.header_type === 'text' && t.header_text && <div className="text-sm font-bold text-slate-900 dark:text-white">{t.header_text}</div>}
          <div className="text-[13px] text-slate-800 dark:text-slate-100 whitespace-pre-line break-words">{text || <span className="text-slate-400">Your message…</span>}</div>
          {t.footer && <div className="text-[11px] text-slate-400">{t.footer}</div>}
        </div>
        {(t.buttons || []).filter((b) => b.text).map((b, i) => (
          <div key={i} className="border-t border-slate-100 dark:border-slate-800 py-2 text-center text-[13px] font-semibold text-sky-600 flex items-center justify-center gap-1">
            {b.type === 'URL' && <ExternalLink size={12} />}{b.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

function Dashboard({ go }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.wa('/dashboard').then((r) => setD(r.data)).catch((e) => setErr(e.message)); }, []);
  if (!d) return <div className={`${card} p-5 text-xs text-slate-400 flex items-center gap-2`}>{err ? <span className="text-rose-500">{err}</span> : <><Loader2 size={14} className="animate-spin" /> Loading…</>}</div>;
  const max = Math.max(1, ...d.series.map((x) => x.sent));
  const stat = (id, title, value, sub, tone) => (
    <div className={`${card} p-4`} data-wa-stat={id}>
      <div className="text-[11px] font-semibold text-slate-500">{title}</div>
      <div className={`mt-1 text-2xl font-black tabular-nums ${tone || 'text-slate-900 dark:text-white'}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
  const usedPct = d.limit.per_day ? Math.min(100, Math.round((d.limit.used_24h / d.limit.per_day) * 100)) : 0;
  return (
    <div className="space-y-4" data-wa-dashboard>
      {!d.connected && <Notice type="warn">Your WhatsApp number is not connected yet. <button className="underline font-semibold cursor-pointer" onClick={() => go('setup')}>Open Setup</button></Notice>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className={`${card} p-4 lg:col-span-2`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm font-bold text-slate-900 dark:text-white">New chats you can start today</div>
            {d.phone && <div className="text-[11px] text-slate-500">{d.phone.display} · quality <b className={d.phone.quality === 'GREEN' ? 'text-emerald-600' : d.phone.quality === 'RED' ? 'text-rose-600' : 'text-amber-600'}>{d.phone.quality || '—'}</b></div>}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">WhatsApp limits how many people a business number can message first in 24 hours. It grows as buyers read and reply.</p>
          <div className="mt-2 flex items-end justify-between text-xs font-semibold">
            <span><span className="text-2xl font-black tabular-nums" id="wa-limit-used">{d.limit.used_24h}</span> / {d.limit.per_day ?? 'unlimited'}</span>
            <span className="text-emerald-700">{d.limit.left ?? '∞'} left</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-1 overflow-hidden"><div className={`h-full ${usedPct >= 90 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${usedPct}%` }} /></div>
        </div>
        <div className={`${card} p-4 space-y-1.5 text-xs`}>
          <div className="text-sm font-bold text-slate-900 dark:text-white">Quick actions</div>
          <button className={`${primary} w-full`} onClick={() => go('new')}><Megaphone size={14} /> New broadcast</button>
          <button className={`${secondary} w-full`} onClick={() => go('chats')}><MessageCircle size={14} /> Chats {d.contacts.unread ? <span className="px-1.5 rounded-full bg-emerald-600 text-white text-[10px]">{d.contacts.unread}</span> : null}</button>
          <div className="text-[11px] text-slate-500 pt-1">{d.templates.approved} approved templates · {d.templates.pending} waiting</div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {stat('sent', 'Sent', d.totals.sent, `last ${d.days} days`)}
        {stat('delivered', 'Delivered', d.totals.delivered, `${d.totals.delivered_rate}%`)}
        {stat('read', 'Read', d.totals.read, `${d.totals.read_rate}% of sent`, 'text-sky-600')}
        {stat('replies', 'Replies', d.totals.replies, `${d.contacts.open_chats} chats open now`, 'text-emerald-600')}
        {stat('failed', 'Failed', d.totals.failed, `${d.contacts.opted_out} opted out`, 'text-rose-600')}
        {stat('cost', 'Estimated cost', money(d.totals.cost, d.totals.currency), 'from your rate table')}
      </div>
      <div className={`${card} p-4`}>
        <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Last 14 days</div>
        <div className="mt-3 flex items-end gap-1 h-28">
          {d.series.map((x) => (
            <div key={x.date} className="flex-1 h-full flex flex-col justify-end" title={`${x.date}: ${x.sent} sent, ${x.read} read, ${x.replies} replies`}>
              <div className="relative w-full rounded-t bg-emerald-200 dark:bg-emerald-900/60" style={{ height: `${(x.sent / max) * 100}%`, minHeight: x.sent ? 3 : 0 }}>
                <div className="absolute bottom-0 inset-x-0 rounded-t bg-sky-500/80" style={{ height: x.sent ? `${(x.read / x.sent) * 100}%` : 0 }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 text-[10px] text-slate-500 mt-2"><span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-200" /> Sent</span><span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-sky-500/80" /> Read</span></div>
      </div>
      <p className="text-[10px] text-slate-400">Cost is an estimate from the rates in Setup; WhatsApp (Meta) bills you directly on your own account.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

const LANGS = [['en', 'English'], ['en_US', 'English (US)'], ['hi', 'Hindi'], ['ar', 'Arabic'], ['vi', 'Vietnamese'], ['id', 'Indonesian'], ['es', 'Spanish'], ['fr', 'French'], ['pt_BR', 'Portuguese (BR)'], ['ru', 'Russian'], ['zh_CN', 'Chinese']];
const EMPTY_TPL = { name: '', category: 'MARKETING', language: 'en', header_type: 'none', header_text: '', header_media_id: '', header_url: '', body: 'Hello {{1}},\n\n', body_examples: ['Ahmed'], footer: '', buttons: [] };

function TemplateEditor({ onClose, onSaved }) {
  const [t, setT] = useState(EMPTY_TPL);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const vars = useMemo(() => { const n = [...t.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])); return n.length ? Math.max(...n) : 0; }, [t.body]);
  const set = (p) => setT((x) => ({ ...x, ...p }));
  const upload = (file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) return setMsg({ type: 'error', text: 'Use a JPG or PNG picture.' });
    if (file.size > 1024 * 1024) return setMsg({ type: 'error', text: 'The picture must be under 1 MB.' });
    const rd = new FileReader();
    rd.onload = async () => {
      setBusy('img');
      try { const r = await api.wa('/media', 'POST', { data_url: rd.result }); set({ header_media_id: r.data.id, header_url: r.data.url }); setMsg(null); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
    };
    rd.readAsDataURL(file);
  };
  const save = async () => {
    setBusy('save');
    setMsg(null);
    try {
      await api.wa('/templates', 'POST', { ...t, body_examples: Array.from({ length: vars }, (_, i) => t.body_examples[i] || `sample ${i + 1}`) });
      onSaved('Template sent to WhatsApp for approval. It usually takes a few minutes; press “Sync from WhatsApp” to see the result.');
    } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  return (
    <div className={`${card} p-4 sm:p-5`} data-wa-template-editor>
      <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-bold text-slate-900 dark:text-white">New template</h3><button className="p-1.5 text-slate-400 cursor-pointer" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-4">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-1"><label className={label}>Name</label><input className={input} value={t.name} onChange={(e) => set({ name: e.target.value.toLowerCase().replace(/[^a-z0-9_ ]/g, '').replace(/\s+/g, '_') })} placeholder="turmeric_offer" aria-label="Template name" /></div>
            <div><label className={label}>Type</label><select className={input} value={t.category} onChange={(e) => set({ category: e.target.value })} aria-label="Template type"><option value="MARKETING">Marketing (offers)</option><option value="UTILITY">Utility (order, payment updates)</option></select></div>
            <div><label className={label}>Language</label><select className={input} value={t.language} onChange={(e) => set({ language: e.target.value })}>{LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          </div>
          <div>
            <label className={label}>Title (optional)</label>
            <div className="flex gap-1.5 mb-1.5">{[['none', 'None'], ['text', 'Text'], ['image', 'Picture']].map(([v, l]) => <button key={v} type="button" onClick={() => set({ header_type: v })} className={`px-3 py-1 rounded-md text-[11px] font-semibold border cursor-pointer ${t.header_type === v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'}`}>{l}</button>)}</div>
            {t.header_type === 'text' && <input className={input} value={t.header_text} maxLength={60} onChange={(e) => set({ header_text: e.target.value })} placeholder="New crop turmeric" />}
            {t.header_type === 'image' && <label className={`${secondary} w-fit`}>{busy === 'img' ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />} {t.header_media_id ? 'Change picture' : 'Upload picture (JPG/PNG, under 1 MB)'}<input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => upload(e.target.files?.[0])} /></label>}
          </div>
          <div>
            <div className="flex items-center justify-between"><label className={label}>Message</label><button type="button" className="text-[11px] font-bold text-emerald-700 cursor-pointer" onClick={() => set({ body: `${t.body}{{${vars + 1}}}` })}>+ Add variable {`{{${vars + 1}}}`}</button></div>
            <textarea className={`${input} min-h-[120px]`} value={t.body} maxLength={1024} onChange={(e) => set({ body: e.target.value })} aria-label="Template message" />
            <p className="text-[10px] text-slate-400 mt-0.5">{'{{1}}'}, {'{{2}}'}… are filled for each buyer (name, company, product…) when you send.</p>
          </div>
          {vars > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.from({ length: vars }, (_, i) => (
                <div key={i}><label className={label}>Example for {`{{${i + 1}}}`} (WhatsApp needs it to approve)</label><input className={input} value={t.body_examples[i] || ''} onChange={(e) => set({ body_examples: Object.assign([...t.body_examples], { [i]: e.target.value }) })} placeholder={i === 0 ? 'Ahmed' : 'turmeric'} /></div>
              ))}
            </div>
          )}
          <div><label className={label}>Footer (optional)</label><input className={input} value={t.footer} maxLength={60} onChange={(e) => set({ footer: e.target.value })} placeholder="Nova Agro Exports" /></div>
          <div>
            <label className={label}>Buttons (optional, up to 3)</label>
            {t.buttons.map((b, i) => (
              <div key={i} className="flex flex-wrap items-center gap-1.5 mb-1.5">
                <select className={`${input} w-auto`} value={b.type} onChange={(e) => set({ buttons: t.buttons.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)) })}><option value="QUICK_REPLY">Quick reply</option><option value="URL">Open a link</option><option value="PHONE_NUMBER">Call</option></select>
                <input className={`${input} w-36`} value={b.text} maxLength={25} placeholder="Button text" onChange={(e) => set({ buttons: t.buttons.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                {b.type === 'URL' && <input className={`${input} flex-1 min-w-[160px]`} value={b.url} placeholder="https://…" onChange={(e) => set({ buttons: t.buttons.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />}
                {b.type === 'PHONE_NUMBER' && <input className={`${input} w-40`} value={b.phone} placeholder="+91…" onChange={(e) => set({ buttons: t.buttons.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)) })} />}
                <button type="button" className="p-1.5 text-rose-500 cursor-pointer" onClick={() => set({ buttons: t.buttons.filter((_, j) => j !== i) })} aria-label="Remove button"><X size={13} /></button>
              </div>
            ))}
            {t.buttons.length < 3 && <button type="button" className="text-[11px] font-bold text-emerald-700 cursor-pointer" onClick={() => set({ buttons: [...t.buttons, { type: 'QUICK_REPLY', text: '', url: '', phone: '' }] })}>+ Add button</button>}
          </div>
          {msg && <Notice type={msg.type}>{msg.text}</Notice>}
          <div className="flex gap-2"><button className={primary} disabled={busy !== '' || !t.name || !t.body.trim()} onClick={save}>{busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send for approval</button><button className={secondary} onClick={onClose}>Cancel</button></div>
        </div>
        <div><div className="text-xs font-bold text-slate-600 mb-1.5">Preview</div><PhonePreview t={t} values={t.body_examples} /></div>
      </div>
    </div>
  );
}

function Templates({ templates, reload, setBanner }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const sync = async () => {
    setBusy('sync'); setMsg(null);
    try { const r = await api.wa('/templates/sync', 'POST'); setMsg({ type: 'success', text: r.message }); reload(); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const del = async (t) => {
    if (!window.confirm(`Delete the template "${t.name}"? It is also removed from WhatsApp.`)) return;
    try { await api.wa(`/templates/${t.id}`, 'DELETE'); reload(); } catch (e) { setMsg({ type: 'error', text: e.message }); }
  };
  if (editing) return <TemplateEditor onClose={() => setEditing(false)} onSaved={(text) => { setEditing(false); setBanner(text); reload(); }} />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <p className="text-xs text-slate-500 max-w-xl">WhatsApp only lets a business start a chat with an approved template. Make one here; Meta checks it (usually minutes).</p>
        <div className="flex gap-2"><button className={secondary} onClick={sync} disabled={busy !== ''}>{busy === 'sync' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Sync from WhatsApp</button><button className={primary} onClick={() => setEditing(true)}><Plus size={14} /> New template</button></div>
      </div>
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      {templates.length === 0 ? <div className={`${card} p-8 text-center text-xs text-slate-500`}>No templates yet.</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {templates.map((t) => (
            <div key={t.id} className={`${card} p-3 space-y-2`} data-wa-template={t.name}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><div className="text-sm font-bold text-slate-900 dark:text-white truncate">{t.name}</div><div className="text-[11px] text-slate-500">{t.category.toLowerCase()} · {t.language} · {t.variables} variables</div></div>
                <Badge s={t.status} />
              </div>
              {t.rejected_reason && <Notice type="error">Rejected: {t.rejected_reason}</Notice>}
              <PhonePreview t={{ ...t, header_url: t.header_media_id ? `${api.baseUrl}/whatsapp/media/${t.header_media_id}` : '' }} />
              <button className="text-[11px] font-bold text-rose-600 cursor-pointer flex items-center gap-1" onClick={() => del(t)}><Trash2 size={12} /> Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* New broadcast                                                       */
/* ------------------------------------------------------------------ */

const FIELD_OPTS = [['contact_name', 'Contact name'], ['company_name', 'Company name'], ['country', 'Country'], ['product', 'Product'], ['sender_name', 'Your name'], ['text', 'Fixed text…']];

function NewBroadcast({ templates, onCreated }) {
  const approved = templates.filter((t) => t.status === 'APPROVED');
  const [tplId, setTplId] = useState(approved[0]?.id || '');
  const tpl = approved.find((t) => t.id === tplId);
  const [name, setName] = useState('');
  const [vars, setVars] = useState([]);
  const [mode, setMode] = useState('tags');
  const [tags, setTags] = useState([]);
  const [picked, setPicked] = useState([]);
  const [numbers, setNumbers] = useState('');
  const [when, setWhen] = useState('now');
  const [at, setAt] = useState('');
  const [preview, setPreview] = useState({ count: 0, skipped: 0, est_cost: 0, currency: 'USD' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { api.wa('/tags').then((r) => setTags(r.data || [])).catch(() => {}); }, []);
  useEffect(() => { setVars(Array.from({ length: tpl?.variables || 0 }, (_, i) => vars[i] || (i === 0 ? { source: 'field', field: 'contact_name', fallback: 'Sir' } : { source: 'text', text: '' }))); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tplId]);
  useEffect(() => {
    const q = new URLSearchParams({ mode, category: tpl?.category || 'MARKETING', ...(mode === 'tags' ? { tags: picked.join(',') } : {}), ...(mode === 'custom' ? { numbers } : {}) });
    if (mode === 'tags' && !picked.length) { setPreview((p) => ({ ...p, count: 0, skipped: 0, est_cost: 0 })); return undefined; }
    const t = setTimeout(() => api.wa(`/audience/preview?${q}`).then((r) => setPreview(r.data)).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [mode, picked, numbers, tpl]);

  const sample = { contact_name: 'Ahmed', company_name: 'Al Noor Foods', country: 'UAE', product: 'Turmeric', sender_name: 'You' };
  const values = vars.map((v) => (v.source === 'field' ? sample[v.field] : v.text || '…'));

  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      const body = { name, template_id: tplId, variables: vars, audience: { mode, tags: picked, numbers }, ...(when === 'later' ? { scheduled_at: new Date(at).toISOString() } : { send_now: true }) };
      if (!window.confirm(`${when === 'later' ? 'Schedule' : 'Send'} "${tpl.name}" to ${preview.count} numbers? Estimated cost ${money(preview.est_cost, preview.currency)}.`)) { setBusy(false); return; }
      const r = await api.wa('/campaigns', 'POST', body);
      onCreated(r.message);
    } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(false); }
  };

  if (!approved.length) return <Notice type="warn">You need an approved template first. Open “Templates”, make one and wait for WhatsApp to approve it.</Notice>;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4" data-wa-new-broadcast>
      <div className={`${card} p-4 sm:p-5 space-y-4`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div><label className={label}>Broadcast name (only you see it)</label><input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Turmeric offer – Dubai" /></div>
          <div><label className={label}>Template</label><select className={input} value={tplId} onChange={(e) => setTplId(e.target.value)} aria-label="Template">{approved.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        </div>
        {vars.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">Fill the variables</div>
            {vars.map((v, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <span className="w-10 text-xs font-mono font-bold text-emerald-700">{`{{${i + 1}}}`}</span>
                <select className={`${input} w-auto`} value={v.source === 'text' ? 'text' : v.field} onChange={(e) => setVars(vars.map((x, j) => (j === i ? (e.target.value === 'text' ? { source: 'text', text: '' } : { source: 'field', field: e.target.value, fallback: x.fallback || '' }) : x)))} aria-label={`Variable ${i + 1}`}>
                  {FIELD_OPTS.map(([val, l]) => <option key={val} value={val}>{l}</option>)}
                </select>
                {v.source === 'text'
                  ? <input className={`${input} flex-1 min-w-[140px]`} value={v.text} placeholder="Same text for everyone" onChange={(e) => setVars(vars.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                  : <input className={`${input} w-40`} value={v.fallback || ''} placeholder="If empty, use…" onChange={(e) => setVars(vars.map((x, j) => (j === i ? { ...x, fallback: e.target.value } : x)))} />}
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-200">Send to</div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-[11px] font-semibold w-fit">
            {[['tags', 'By tags'], ['all', 'All leads'], ['custom', 'Paste numbers']].map(([m, l]) => <button key={m} type="button" onClick={() => setMode(m)} className={`px-3 py-1 rounded-md cursor-pointer ${mode === m ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-slate-500'}`}>{l}</button>)}
          </div>
          {mode === 'tags' && (tags.length === 0 ? <Notice>No tags yet. Add tags to leads (e.g. turmeric-buyer, dubai) and they appear here.</Notice> : (
            <div className="flex flex-wrap gap-1.5">{tags.map((t) => { const on = picked.includes(t.tag); return <button key={t.tag} type="button" onClick={() => setPicked(on ? picked.filter((x) => x !== t.tag) : [...picked, t.tag])} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer ${on ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'}`}><Tag size={10} /> {t.tag} <span className={on ? 'opacity-80' : 'text-slate-400'}>{t.with_whatsapp}</span></button>; })}</div>
          ))}
          {mode === 'all' && <Notice>Every lead with a WhatsApp number that has not opted out.</Notice>}
          {mode === 'custom' && <textarea className={`${input} min-h-[90px]`} value={numbers} onChange={(e) => setNumbers(e.target.value)} placeholder="One number per line or separated by commas, with country code: +971 50 111 2222" />}
          <div className="text-xs text-slate-600 dark:text-slate-300" data-wa-audience-count><b>{preview.count}</b> numbers{preview.skipped ? ` · ${preview.skipped} left out (no number, wrong number or opted out)` : ''} · estimated cost <b>{money(preview.est_cost, preview.currency)}</b></div>
        </div>
        <div className="space-y-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-[11px] font-semibold w-fit">{[['now', 'Send now'], ['later', 'Schedule']].map(([m, l]) => <button key={m} type="button" onClick={() => setWhen(m)} className={`px-3 py-1 rounded-md cursor-pointer ${when === m ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-slate-500'}`}>{l}</button>)}</div>
          {when === 'later' && <input type="datetime-local" className={`${input} w-auto`} value={at} onChange={(e) => setAt(e.target.value)} aria-label="Send time" />}
        </div>
        {msg && <Notice type={msg.type}>{msg.text}</Notice>}
        <button className={`${primary} w-full sm:w-auto`} disabled={busy || !preview.count || (when === 'later' && !at)} onClick={submit}>{busy ? <Loader2 size={14} className="animate-spin" /> : when === 'later' ? <CalendarClock size={14} /> : <Send size={14} />} {when === 'later' ? 'Schedule' : `Send to ${preview.count}`}</button>
      </div>
      <div className="space-y-2"><div className="text-xs font-bold text-slate-600">What buyers will see</div>{tpl && <PhonePreview t={{ ...tpl, header_url: tpl.header_media_id ? `${api.baseUrl}/whatsapp/media/${tpl.header_media_id}` : '' }} values={values} />}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Broadcast history                                                   */
/* ------------------------------------------------------------------ */

function Broadcasts({ list, reload, onNew }) {
  const [open, setOpen] = useState(null);
  const [detail, setDetail] = useState(null);
  const [msg, setMsg] = useState(null);
  const act = async (fn) => { setMsg(null); try { const r = await fn(); setMsg({ type: 'success', text: r.message }); reload(); } catch (e) { setMsg({ type: 'error', text: e.message }); } };
  const toggle = async (id) => { if (open === id) { setOpen(null); return; } setOpen(id); setDetail(null); try { setDetail((await api.wa(`/campaigns/${id}`)).data); } catch { /* shown as loading */ } };
  if (!list.length) return <div className={`${card} p-10 text-center`}><Megaphone size={30} className="mx-auto text-slate-300" /><div className="text-sm font-semibold mt-2 text-slate-700 dark:text-slate-200">No broadcasts yet</div><button className={`${primary} mt-3`} onClick={onNew}><Plus size={14} /> New broadcast</button></div>;
  return (
    <div className="space-y-3">
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      {list.map((c) => {
        const s = c.stats;
        const bar = (n, cls) => <div className={`h-full ${cls}`} style={{ width: `${s.total ? (n / s.total) * 100 : 0}%` }} />;
        return (
          <div key={c.id} className={`${card} p-4`} data-wa-campaign={c.name}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0"><div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-900 dark:text-white truncate">{c.name}</span><Badge s={c.status} /></div><div className="text-[11px] text-slate-500">Template {c.template_name} · {fmt(c.created_at)}{c.scheduled_at && c.status === 'scheduled' ? ` · sends ${fmt(c.scheduled_at)}` : ''}</div></div>
              <div className="flex flex-wrap gap-1.5">
                {['draft', 'paused'].includes(c.status) && <button className={primary} onClick={() => act(() => api.wa(`/campaigns/${c.id}/send`, 'POST', {}))}><Play size={13} /> Send</button>}
                {s.failed > 0 && c.status !== 'sending' && <button className={secondary} onClick={() => act(() => api.wa(`/campaigns/${c.id}/send`, 'POST', { retry_failed: true }))}><RefreshCw size={13} /> Retry {s.failed}</button>}
                <button className={secondary} onClick={() => toggle(c.id)}>Numbers</button>
                {c.status !== 'sending' && <button className="p-2 text-rose-500 cursor-pointer" aria-label="Delete broadcast" onClick={() => window.confirm('Delete this broadcast and its log?') && act(() => api.wa(`/campaigns/${c.id}`, 'DELETE'))}><Trash2 size={14} /></button>}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center" data-wa-campaign-stats>
              {[['Total', s.total, ''], ['Sent', s.sent, 'text-emerald-700'], ['Delivered', s.delivered, 'text-emerald-700'], ['Read', s.read, 'text-sky-600'], ['Replied', s.replied, 'text-violet-600'], ['Failed', s.failed, 'text-rose-600']].map(([l, v, cls]) => (
                <div key={l} className="rounded-lg bg-slate-50 dark:bg-slate-800/60 py-1.5"><div className={`text-base font-black tabular-nums ${cls}`}>{v}</div><div className="text-[10px] text-slate-500">{l}</div></div>
              ))}
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 mt-2 overflow-hidden flex">{bar(s.read, 'bg-sky-500')}{bar(s.delivered - s.read, 'bg-emerald-500')}{bar(s.sent - s.delivered, 'bg-emerald-300')}{bar(s.failed, 'bg-rose-400')}</div>
            <div className="text-[11px] text-slate-500 mt-1">Estimated cost {money(s.cost || c.est_cost, c.currency)}{c.error ? <span className="text-amber-700"> · {c.error}</span> : ''}</div>
            {open === c.id && (
              <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-2 max-h-64 overflow-y-auto">
                {!detail ? <div className="text-xs text-slate-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading…</div> : (
                  <table className="w-full text-[11px]"><thead className="text-left text-slate-400"><tr><th className="py-1">Number</th><th>Company</th><th>Status</th><th>Note</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{detail.recipients.map((r) => <tr key={r.to}><td className="py-1 font-semibold">+{r.to}</td><td className="text-slate-500">{r.company || '—'}</td><td><Badge s={r.status === 'pending' ? 'draft' : r.status === 'read' || r.status === 'delivered' ? 'sent' : r.status} /> <span className="text-slate-500">{r.status}</span>{r.replied_at ? <span className="text-violet-600"> · replied</span> : ''}</td><td className="text-rose-500 truncate max-w-[200px]">{r.error}</td></tr>)}</tbody></table>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chats                                                               */
/* ------------------------------------------------------------------ */

const Tick = ({ status }) => (status === 'read' ? <CheckCheck size={13} className="text-sky-500" /> : status === 'delivered' ? <CheckCheck size={13} className="text-slate-400" /> : status === 'sent' ? <Check size={13} className="text-slate-400" /> : status === 'failed' ? <AlertCircle size={13} className="text-rose-500" /> : <Clock size={12} className="text-slate-400" />);

function Chats({ templates }) {
  const [list, setList] = useState([]);
  const [sel, setSel] = useState(null);
  const [thread, setThread] = useState(null);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [tplId, setTplId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const endRef = useRef(null);
  const approved = templates.filter((t) => t.status === 'APPROVED');

  const loadList = useCallback(() => api.wa('/chats').then((r) => setList(r.data || [])).catch(() => {}), []);
  const loadThread = useCallback((id) => api.wa(`/chats/${id}`).then((r) => setThread(r.data)).catch(() => {}), []);
  useEffect(() => { loadList(); const t = setInterval(loadList, 10000); return () => clearInterval(t); }, [loadList]);
  useEffect(() => { if (!sel) return undefined; loadThread(sel); const t = setInterval(() => loadThread(sel), 8000); return () => clearInterval(t); }, [sel, loadThread]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [thread?.messages?.length]);

  const send = async () => {
    setBusy(true); setMsg(null);
    try {
      if (thread.contact.window_open) { await api.wa(`/chats/${sel}`, 'POST', { text }); setText(''); }
      else {
        const tpl = approved.find((t) => t.id === tplId);
        if (!tpl) throw new Error('Pick an approved template');
        await api.wa(`/chats/${sel}`, 'POST', { template_id: tplId, variables: Array.from({ length: tpl.variables }, (_, i) => (i === 0 ? { source: 'field', field: 'contact_name' } : { source: 'text', text: text || '-' })) });
        setText('');
      }
      loadThread(sel); loadList();
    } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(false); }
  };

  const shown = list.filter((c) => `${c.name} ${c.wa_id} ${c.last_text}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className={`${card} overflow-hidden grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] h-[70vh] min-h-[420px]`} data-wa-chats>
      <div className={`border-r border-slate-100 dark:border-slate-800 flex flex-col min-h-0 ${sel ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-2 border-b border-slate-100 dark:border-slate-800"><div className="relative"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input className={`${input} pl-8`} placeholder="Search chats" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {shown.length === 0 && <div className="p-4 text-xs text-slate-400">No chats yet. Replies from buyers appear here.</div>}
          {shown.map((c) => (
            <button key={c.wa_id} type="button" onClick={() => setSel(c.wa_id)} className={`w-full text-left px-3 py-2.5 flex items-start gap-2 cursor-pointer ${sel === c.wa_id ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`} data-wa-chat={c.wa_id}>
              <span className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">{(c.name || '#').slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="flex justify-between gap-1"><span className="text-xs font-bold truncate text-slate-800 dark:text-slate-100">{c.name || `+${c.wa_id}`}</span><span className="text-[10px] text-slate-400 shrink-0">{fmt(c.last_at).split(',')[0]}</span></span>
                <span className="flex justify-between gap-1"><span className="text-[11px] text-slate-500 truncate">{c.last_text}</span>{c.unread ? <span className="px-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shrink-0">{c.unread}</span> : null}</span>
                {c.opted_out && <span className="text-[10px] text-rose-600 font-semibold">opted out</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className={`flex flex-col min-h-0 ${sel ? 'flex' : 'hidden md:flex'}`}>
        {!thread || !sel ? <div className="flex-1 flex items-center justify-center text-xs text-slate-400">Pick a chat</div> : (
          <>
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="min-w-0"><button className="md:hidden text-[11px] text-emerald-700 font-bold mr-2 cursor-pointer" onClick={() => setSel(null)}>← Chats</button><span className="text-sm font-bold text-slate-900 dark:text-white">{thread.contact.name || `+${thread.contact.wa_id}`}</span><span className="text-[11px] text-slate-500 ml-2">+{thread.contact.wa_id}</span></div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${thread.contact.window_open ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{thread.contact.window_open ? 'Can reply freely (24h)' : 'Template only'}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#efeae2] dark:bg-slate-950" data-wa-thread>
              {thread.messages.map((m) => (
                <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-1.5 shadow-sm text-[13px] whitespace-pre-line break-words ${m.direction === 'out' ? 'bg-[#d9fdd3] dark:bg-emerald-900/60' : 'bg-white dark:bg-slate-800'}`}>
                    {m.template_name && <div className="text-[10px] text-emerald-700 font-semibold">Template · {m.template_name}</div>}
                    {m.text}
                    <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-0.5">{fmt(m.created_at).split(', ')[1]}{m.direction === 'out' && <Tick status={m.status} />}</div>
                    {m.error && <div className="text-[10px] text-rose-600">{m.error}</div>}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="p-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              {msg && <Notice type={msg.type}>{msg.text}</Notice>}
              {!thread.contact.window_open && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-amber-800"><span>24 hours have passed since this buyer wrote. Send a template:</span><select className={`${input} w-auto`} value={tplId} onChange={(e) => setTplId(e.target.value)} aria-label="Template to send"><option value="">Pick a template</option>{approved.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              )}
              <div className="flex gap-2">
                <input className={input} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && (text.trim() || tplId)) { e.preventDefault(); send(); } }} placeholder={thread.contact.window_open ? 'Type a reply…' : 'Text for the template’s second variable (optional)'} aria-label="Message" />
                <button className={primary} disabled={busy || (thread.contact.window_open ? !text.trim() : !tplId)} onClick={send} aria-label="Send">{busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Automation                                                          */
/* ------------------------------------------------------------------ */

function Automation({ optOut }) {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const load = useCallback(() => api.wa('/rules').then((r) => setRules(r.data || [])).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    setMsg(null);
    try { await api.wa(form.id ? `/rules/${form.id}` : '/rules', form.id ? 'PUT' : 'POST', { ...form, keywords: String(form.keywords || '') }); setForm(null); load(); } catch (e) { setMsg({ type: 'error', text: e.message }); }
  };
  const toggle = async (r) => { await api.wa(`/rules/${r.id}`, 'PUT', { ...r, keywords: r.keywords.join(','), active: r.active === false }).catch(() => {}); load(); };
  const del = async (r) => { if (window.confirm(`Delete the rule "${r.name}"?`)) { await api.wa(`/rules/${r.id}`, 'DELETE').catch(() => {}); load(); } };
  return (
    <div className="space-y-3" data-wa-automation>
      <Notice>Auto replies are sent the moment a buyer writes. Built in: a buyer who writes <b>{(optOut || ['STOP']).join(' / ')}</b> is opted out of broadcasts (START joins again).</Notice>
      <div className="flex gap-2">
        <button className={primary} onClick={() => setForm({ name: 'Welcome', trigger: 'welcome', keywords: '', match: 'contains', reply: 'Thank you for writing to us! Our team will reply shortly.' })}><Plus size={14} /> Welcome message</button>
        <button className={secondary} onClick={() => setForm({ name: 'Price list', trigger: 'keyword', keywords: 'price, rate, quotation', match: 'contains', reply: 'Here is our latest price list: ' })}><Plus size={14} /> Keyword reply</button>
      </div>
      {form && (
        <div className={`${card} p-4 space-y-2`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div><label className={label}>Name</label><input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className={label}>When</label><select className={input} value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} aria-label="When"><option value="welcome">A buyer writes for the first time</option><option value="keyword">The message has a keyword</option></select></div>
            {form.trigger === 'keyword' && <div><label className={label}>Match</label><select className={input} value={form.match} onChange={(e) => setForm({ ...form, match: e.target.value })}><option value="contains">Message contains the word</option><option value="exact">Message is exactly the word</option></select></div>}
          </div>
          {form.trigger === 'keyword' && <div><label className={label}>Keywords (comma separated)</label><input className={input} value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} aria-label="Keywords" /></div>}
          <div><label className={label}>Reply</label><textarea className={`${input} min-h-[80px]`} value={form.reply} onChange={(e) => setForm({ ...form, reply: e.target.value })} aria-label="Reply" /></div>
          {msg && <Notice type={msg.type}>{msg.text}</Notice>}
          <div className="flex gap-2"><button className={primary} onClick={save}>Save rule</button><button className={secondary} onClick={() => setForm(null)}>Cancel</button></div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rules.map((r) => (
          <div key={r.id} className={`${card} p-3 space-y-1`} data-wa-rule={r.name}>
            <div className="flex items-center justify-between gap-2"><span className="text-sm font-bold text-slate-900 dark:text-white">{r.name}</span><button onClick={() => toggle(r)} className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${r.active !== false ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{r.active !== false ? 'ON' : 'OFF'}</button></div>
            <div className="text-[11px] text-slate-500">{r.trigger === 'welcome' ? 'First message from a buyer' : `Keywords: ${r.keywords.join(', ')} (${r.match})`} · used {r.hits || 0}×</div>
            <div className="text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-2 py-1.5 whitespace-pre-line">{r.reply}</div>
            <div className="flex gap-3 text-[11px] font-bold"><button className="text-emerald-700 cursor-pointer" onClick={() => setForm({ ...r, keywords: r.keywords.join(', ') })}>Edit</button><button className="text-rose-600 cursor-pointer" onClick={() => del(r)}>Delete</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

function CopyField({ value, name }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center gap-1.5">
      <input className={`${input} font-mono`} readOnly value={value} aria-label={name} onFocus={(e) => e.target.select()} />
      <button type="button" className={secondary} onClick={() => { navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {}); }}>{done ? <Check size={13} /> : <Copy size={13} />}</button>
    </div>
  );
}

function Setup({ onChanged }) {
  const [s, setS] = useState(null);
  const [f, setF] = useState({ phone_number_id: '', waba_id: '', access_token: '', app_id: '', app_secret: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [rates, setRates] = useState(null);
  const load = useCallback(() => api.wa('/settings').then((r) => { setS(r.data); setF((x) => ({ ...x, phone_number_id: r.data.phone_number_id, waba_id: r.data.waba_id, app_id: r.data.app_id })); setRates(r.data.rates); }).catch((e) => setMsg({ type: 'error', text: e.message })), []);
  useEffect(() => { load(); }, [load]);
  const connect = async () => {
    setBusy('save'); setMsg(null);
    try { const r = await api.wa('/settings', 'PUT', f); setMsg({ type: 'success', text: r.message }); setF((x) => ({ ...x, access_token: '', app_secret: '' })); load(); onChanged(); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const disconnect = async () => {
    if (!window.confirm('Disconnect this WhatsApp number? The saved access token is deleted and the CRM stops sending from it.')) return;
    setBusy('disconnect'); setMsg(null);
    try { const r = await api.wa('/settings/disconnect', 'POST'); setMsg({ type: 'success', text: r.message }); load(); onChanged(); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const saveRates = async () => {
    setBusy('rates');
    try { await api.wa('/settings/rates', 'PUT', rates); setMsg({ type: 'success', text: 'Rates saved' }); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  if (!s) return <div className={`${card} p-5 text-xs text-slate-400 flex items-center gap-2`}><Loader2 size={14} className="animate-spin" /> Loading…</div>;
  const steps = [
    'Open business.facebook.com → WhatsApp Manager, and add your business phone number (one not used in the normal WhatsApp app).',
    'In developers.facebook.com create an app of type “Business” and add the WhatsApp product.',
    'Copy the Phone number ID and the WhatsApp Business Account ID from WhatsApp → API Setup.',
    'In Business Settings → System users, make a permanent access token with whatsapp_business_messaging and whatsapp_business_management.',
    'Add a payment method in WhatsApp Manager so Meta can bill the messages.',
  ];
  return (
    <div className="space-y-4 max-w-4xl" data-wa-setup>
      <div className={`${card} p-4 sm:p-5 space-y-3`}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div><h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><MessageCircle size={16} className="text-emerald-600" /> Connect your WhatsApp Business number</h3><p className="text-xs text-slate-500 mt-0.5">Official WhatsApp Cloud API from Meta. Messages go from your own number; Meta bills your own account.</p></div>
          {s.connected_at ? <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Connected · {s.display_phone} · {s.verified_name}</span> : <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Not connected</span>}
        </div>
        <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-300">{steps.map((x) => <li key={x}>{x}</li>)}</ol>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div><label className={label}>Phone number ID</label><input className={input} value={f.phone_number_id} onChange={(e) => setF({ ...f, phone_number_id: e.target.value })} placeholder="e.g. 109876543210987" aria-label="Phone number ID" /></div>
          <div><label className={label}>WhatsApp Business Account ID</label><input className={input} value={f.waba_id} onChange={(e) => setF({ ...f, waba_id: e.target.value })} placeholder="e.g. 102345678901234" aria-label="WhatsApp Business Account ID" /></div>
          <div className="sm:col-span-2"><label className={label}>Permanent access token</label><div className="relative"><input className={`${input} font-mono pr-9`} type={show ? 'text' : 'password'} value={f.access_token} onChange={(e) => setF({ ...f, access_token: e.target.value })} placeholder={s.has_token ? '•••• saved — paste a new one to replace' : 'EAAG…'} aria-label="Access token" autoComplete="new-password" /><button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer" onClick={() => setShow(!show)} aria-label="Show token">{show ? <EyeOff size={14} /> : <Eye size={14} />}</button></div><p className="text-[10px] text-slate-400 mt-0.5">Stored encrypted; never shown again.</p></div>
          <div><label className={label}>Meta App ID (for templates with a picture)</label><input className={input} value={f.app_id} onChange={(e) => setF({ ...f, app_id: e.target.value })} placeholder="optional" /></div>
          <div><label className={label}>App secret (checks that updates really come from Meta)</label><input className={input} type="password" value={f.app_secret} onChange={(e) => setF({ ...f, app_secret: e.target.value })} placeholder={s.has_app_secret ? '•••• saved' : 'recommended'} autoComplete="new-password" /></div>
        </div>
        {msg && <Notice type={msg.type}>{msg.text}</Notice>}
        <div className="flex flex-wrap gap-2">
          <button className={primary} onClick={connect} disabled={busy !== ''}>{busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Save & check connection</button>
          {(s.connected_at || s.has_token) && <button className={`${secondary} text-rose-600`} onClick={disconnect} disabled={busy !== ''} data-wa-disconnect>{busy === 'disconnect' ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Disconnect number</button>}
        </div>
      </div>

      <div className={`${card} p-4 sm:p-5 space-y-2`}>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Webhook (delivery ticks and buyers' replies)</h3>
        <p className="text-xs text-slate-500">In your Meta app → WhatsApp → Configuration, paste these two values, press “Verify and save”, then subscribe to the <b>messages</b> field.</p>
        <label className={label}>Callback URL</label><CopyField value={s.webhook_url} name="Callback URL" />
        <label className={label}>Verify token</label><CopyField value={s.verify_token} name="Verify token" />
        <p className="text-[11px] text-slate-500">{s.webhook_seen_at ? <span className="text-emerald-700 font-semibold">Last update from WhatsApp: {fmt(s.webhook_seen_at)}</span> : 'No update from WhatsApp yet.'}</p>
      </div>

      {rates && (
        <div className={`${card} p-4 sm:p-5 space-y-2`} data-wa-rates>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Message cost (for estimates)</h3>
          <p className="text-xs text-slate-500">Meta charges per message, by country and type. Copy your prices from Meta's rate card; the CRM uses them to estimate each broadcast.</p>
          <div className="grid grid-cols-[minmax(0,1fr)_90px_90px_auto] gap-1.5 items-center text-[11px] font-bold text-slate-500"><span>Country (dial code)</span><span>Marketing</span><span>Utility</span><span /></div>
          <div className="grid grid-cols-[minmax(0,1fr)_90px_90px_auto] gap-1.5 items-center"><span className="text-xs font-semibold">All other countries</span><input className={input} type="number" step="0.0001" value={rates.default.marketing} onChange={(e) => setRates({ ...rates, default: { ...rates.default, marketing: e.target.value } })} /><input className={input} type="number" step="0.0001" value={rates.default.utility} onChange={(e) => setRates({ ...rates, default: { ...rates.default, utility: e.target.value } })} /><span /></div>
          {rates.countries.map((c, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_90px_90px_auto] gap-1.5 items-center">
              <div className="flex gap-1"><input className={`${input} w-16`} value={c.prefix} placeholder="91" onChange={(e) => setRates({ ...rates, countries: rates.countries.map((x, j) => (j === i ? { ...x, prefix: e.target.value } : x)) })} /><input className={input} value={c.name} placeholder="India" onChange={(e) => setRates({ ...rates, countries: rates.countries.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} /></div>
              <input className={input} type="number" step="0.0001" value={c.marketing} onChange={(e) => setRates({ ...rates, countries: rates.countries.map((x, j) => (j === i ? { ...x, marketing: e.target.value } : x)) })} />
              <input className={input} type="number" step="0.0001" value={c.utility} onChange={(e) => setRates({ ...rates, countries: rates.countries.map((x, j) => (j === i ? { ...x, utility: e.target.value } : x)) })} />
              <button className="p-1 text-rose-500 cursor-pointer" onClick={() => setRates({ ...rates, countries: rates.countries.filter((_, j) => j !== i) })} aria-label="Remove country"><X size={13} /></button>
            </div>
          ))}
          <div className="flex gap-2"><button className={secondary} onClick={() => setRates({ ...rates, countries: [...rates.countries, { prefix: '', name: '', marketing: 0, utility: 0 }] })}><Plus size={13} /> Country</button><button className={primary} onClick={saveRates} disabled={busy !== ''}>Save rates ({rates.currency})</button></div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function WhatsAppMarketing() {
  const [status, setStatus] = useState(null);
  const [tab, setTab] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [banner, setBanner] = useState(null);

  const loadStatus = useCallback(() => api.wa('/status').then((r) => setStatus(r.data)).catch(() => setStatus({ enabled: false })), []);
  const loadTemplates = useCallback(() => api.wa('/templates').then((r) => setTemplates(r.data || [])).catch(() => {}), []);
  const loadCampaigns = useCallback(() => api.wa('/campaigns').then((r) => setCampaigns(r.data || [])).catch(() => {}), []);
  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => {
    if (!status?.enabled) return;
    loadTemplates(); loadCampaigns();
    setTab((t) => t || (status.connected ? 'dashboard' : 'setup'));
  }, [status?.enabled, status?.connected, loadTemplates, loadCampaigns]);
  const sending = campaigns.some((c) => c.status === 'sending');
  useEffect(() => { if (!sending) return undefined; const t = setInterval(loadCampaigns, 3000); return () => clearInterval(t); }, [sending, loadCampaigns]);
  useEffect(() => { if (!banner) return undefined; const t = setTimeout(() => setBanner(null), 7000); return () => clearTimeout(t); }, [banner]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'campaigns', label: 'Broadcasts', icon: Megaphone, count: campaigns.length },
    { id: 'new', label: 'New broadcast', icon: Send },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate, count: templates.length },
    { id: 'chats', label: 'Chats', icon: MessageCircle },
    { id: 'automation', label: 'Automation', icon: Bot },
    { id: 'setup', label: 'Setup', icon: Settings, dot: status && !status.connected },
  ];

  return (
    <div className="w-full space-y-5 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap"><h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">WhatsApp Marketing</h1><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"><Crown size={12} /> Premium</span></div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Approved templates with pictures and buttons, broadcasts to tagged buyers, delivery and read ticks, chats and auto replies, on the official WhatsApp Business API.</p>
        </div>
        {status?.enabled && <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${status.connected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{status.connected ? `Number ${status.display_phone}` : 'Number not connected'}</span>}
      </div>

      {!status ? <div className={`${card} p-5 text-xs text-slate-400 flex items-center gap-2`}><Loader2 size={14} className="animate-spin" /> Checking…</div> : !status.enabled ? (
        <div className={`${card} text-center py-12 px-4`} data-wa-locked>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600"><Lock size={24} /></div>
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">WhatsApp Marketing is a premium feature</h2>
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">{status.is_owner ? 'Ask the platform admin to switch on WhatsApp Marketing for your company, then connect your WhatsApp Business number.' : 'Only the company owner can use WhatsApp Marketing.'}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 w-fit max-w-full overflow-x-auto" role="tablist">
            {tabs.map((t) => { const Icon = t.icon; return (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap cursor-pointer ${tab === t.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}>
                <Icon size={14} /><span>{t.label}</span>{t.count !== undefined && <span className="px-1.5 rounded bg-slate-200/80 dark:bg-slate-600 text-[10px]">{t.count}</span>}{t.dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
              </button>
            ); })}
          </div>
          {banner && <Notice type="success">{banner}</Notice>}
          {tab === 'dashboard' && <Dashboard go={setTab} />}
          {tab === 'campaigns' && <Broadcasts list={campaigns} reload={loadCampaigns} onNew={() => setTab('new')} />}
          {tab === 'new' && <NewBroadcast templates={templates} onCreated={(t) => { setBanner(t); loadCampaigns(); setTab('campaigns'); }} />}
          {tab === 'templates' && <Templates templates={templates} reload={loadTemplates} setBanner={setBanner} />}
          {tab === 'chats' && <Chats templates={templates} />}
          {tab === 'automation' && <Automation optOut={['STOP', 'UNSUBSCRIBE']} />}
          {tab === 'setup' && <Setup onChanged={loadStatus} />}
        </>
      )}
    </div>
  );
}
