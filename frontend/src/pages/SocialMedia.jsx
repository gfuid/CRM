import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Share2, Lock, Loader2, Plus, CalendarDays, List, Settings, Sparkles, Image as ImageIcon, Upload, X, Trash2, RefreshCw,
  CheckCircle2, AlertCircle, Clock, Send, ChevronLeft, ChevronRight, ExternalLink, KeyRound, Wand2, Check, Lightbulb, Pencil,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

/* Simple brand marks (the icon set has none) */
const Facebook = ({ size = 14, className = '' }) => (<svg width={size} height={size} viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden='true'><path d='M14 8.5V6.8c0-.8.5-1 .9-1H17V2.1L14 2c-3.3 0-4 2.4-4 4v2.5H8V12h2v10h4V12h2.8l.4-3.5H14z' /></svg>);
const Instagram = ({ size = 14, className = '' }) => (<svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className={className} aria-hidden='true'><rect x='3' y='3' width='18' height='18' rx='5' /><circle cx='12' cy='12' r='4' /><circle cx='17.5' cy='6.5' r='1' fill='currentColor' stroke='none' /></svg>);

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card';
const input = 'w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none';
const label = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1';
const btn = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const primary = `${btn} bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm`;
const secondary = `${btn} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700`;
const sm = (path, method = 'GET', data) => api.request(`/social${path}`, { method, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
const fmt = (s) => (s ? new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localInput = (iso) => { if (!iso) return ''; const d = new Date(iso); return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const LIMITS = { facebook: 5000, instagram: 2200 };

const PLATFORM = {
  facebook: { label: 'Facebook', Icon: Facebook, chip: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900', dot: 'bg-blue-600' },
  instagram: { label: 'Instagram', Icon: Instagram, chip: 'bg-pink-50 text-pink-800 border-pink-200 dark:bg-pink-950/40 dark:text-pink-200 dark:border-pink-900', dot: 'bg-pink-600' },
};
const STATUS = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  pending_approval: { label: 'Needs approval', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  scheduled: { label: 'Scheduled', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  publishing: { label: 'Posting…', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  posted: { label: 'Posted', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  partial: { label: 'Partly posted', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  failed: { label: 'Failed', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};
const StatusBadge = ({ s }) => <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${(STATUS[s] || STATUS.draft).cls}`}>{(STATUS[s] || STATUS.draft).label}</span>;

function Notice({ type = 'info', children, onClose }) {
  const cls = type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
    : type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
    : type === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300'
    : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300';
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;
  return <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${cls}`}><Icon size={14} className="shrink-0 mt-px" /><div className="min-w-0 flex-1">{children}</div>{onClose && <button className="cursor-pointer" onClick={onClose} aria-label="Close message"><X size={13} /></button>}</div>;
}

const accountsOf = (post, accounts) => (post.account_ids || []).map((id) => accounts.find((a) => a.id === id)).filter(Boolean);
const platformsOf = (post, accounts) => [...new Set(accountsOf(post, accounts).map((a) => a.platform))];

const readFile = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error('Could not read the file'));
  r.readAsDataURL(file);
});

/* ------------------------------------------------------------------ */
/* Composer (new / edit post)                                          */
/* ------------------------------------------------------------------ */

function Composer({ status, isOwner, accounts, initial, onClose, onSaved }) {
  const editing = Boolean(initial && initial.id);
  const [text, setText] = useState(initial?.text || '');
  const [texts, setTexts] = useState(initial?.texts || {});
  const [separate, setSeparate] = useState(Boolean(initial?.texts && Object.keys(initial.texts).length));
  const [picked, setPicked] = useState(initial?.account_ids?.length ? initial.account_ids : accounts.filter((a) => a.status !== 'expired').map((a) => a.id));
  const [media, setMedia] = useState(initial?.media || []);
  const [when, setWhen] = useState(localInput(initial?.scheduled_at) || '');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [aiOpen, setAiOpen] = useState(Boolean(initial?.topic));
  const [topic, setTopic] = useState(initial?.topic || '');
  const [details, setDetails] = useState('');
  const [tone, setTone] = useState('professional and friendly');
  const [language, setLanguage] = useState('English');
  const [imgPrompt, setImgPrompt] = useState('');
  const platforms = [...new Set(picked.map((id) => (accounts.find((a) => a.id === id) || {}).platform).filter(Boolean))];
  const textFor = (p) => (separate && texts[p] !== undefined ? texts[p] : text);

  const writeAi = async () => {
    setBusy('write'); setMsg(null);
    try {
      const r = await sm('/ai/write', 'POST', { topic, details, tone, language, platforms: platforms.length ? platforms : ['facebook', 'instagram'] });
      const t = r.data.texts || {};
      const first = t.facebook || t.instagram || '';
      setText(first);
      if (t.facebook && t.instagram && t.facebook !== t.instagram) { setTexts(t); setSeparate(true); }
      if (r.data.image_idea && !imgPrompt) setImgPrompt(r.data.image_idea);
      setMsg({ type: 'success', text: 'Written by AI. Read it, change anything you like, then post or schedule.' });
    } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const makeImage = async () => {
    setBusy('image'); setMsg(null);
    try { const r = await sm('/ai/image', 'POST', { prompt: imgPrompt }); setMedia([{ id: r.data.id, url: r.data.url }]); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const upload = async (file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) { setMsg({ type: 'error', text: 'Use a JPG or PNG picture.' }); return; }
    if (file.size > 4 * 1024 * 1024) { setMsg({ type: 'error', text: 'The picture is larger than 4 MB.' }); return; }
    setBusy('upload'); setMsg(null);
    try { const r = await sm('/media', 'POST', { data_url: await readFile(file) }); setMedia([{ id: r.data.id, url: r.data.url }]); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const submit = async (action) => {
    setBusy(action); setMsg(null);
    const body = {
      text, texts: separate ? Object.fromEntries(platforms.map((p) => [p, texts[p] !== undefined ? texts[p] : text])) : {},
      media_ids: media.map((m) => m.id), account_ids: picked, scheduled_at: when ? new Date(when).toISOString() : null, action,
    };
    try {
      const r = editing ? await sm(`/posts/${initial.id}`, 'PUT', body) : await sm('/posts', 'POST', body);
      onSaved(r.message || 'Saved');
    } catch (e) { setMsg({ type: 'error', text: e.message }); setBusy(''); }
  };

  return (
    <div className={`${card} p-4 sm:p-5 space-y-4`} data-social-composer>
      <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900 dark:text-white">{editing ? 'Edit post' : 'New post'}</h3><button className="p-1 text-slate-400 cursor-pointer" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-5">
        <div className="space-y-4 min-w-0">
          <div>
            <div className={label}>Post to</div>
            {accounts.length === 0 ? <Notice type="warn">No account connected yet. {isOwner ? 'Open the Accounts tab and press Connect Facebook / Instagram.' : 'Ask your company owner to connect the Facebook Page.'}</Notice> : (
              <div className="flex flex-wrap gap-1.5">{accounts.map((a) => { const on = picked.includes(a.id); const P = PLATFORM[a.platform]; return (
                <button key={a.id} type="button" onClick={() => setPicked(on ? picked.filter((x) => x !== a.id) : [...picked, a.id])} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${on ? P.chip : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`} aria-pressed={on}>
                  {on ? <Check size={12} /> : <P.Icon size={12} />} {a.name}{a.status === 'expired' && <span className="text-rose-600">(login expired)</span>}
                </button>); })}</div>
            )}
          </div>

          <div className="rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50/60 dark:bg-violet-950/20 p-3 space-y-2" data-social-ai-write>
            <button type="button" className="w-full flex items-center justify-between text-xs font-bold text-violet-800 dark:text-violet-200 cursor-pointer" onClick={() => setAiOpen(!aiOpen)}>
              <span className="flex items-center gap-1.5"><Sparkles size={14} /> Write with AI {status.ai?.text ? <span className="font-normal text-violet-600">({status.ai.text})</span> : <span className="font-normal text-violet-500">(add your AI key first)</span>}</span>
              <span>{aiOpen ? '−' : '+'}</span>
            </button>
            {aiOpen && (
              <div className="space-y-2">
                <div><label className={label}>What is the post about?</label><input className={input} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. New crop turmeric ready for export" aria-label="Post topic" /></div>
                <div><label className={label}>Facts to use (optional)</label><textarea className={`${input} min-h-[60px]`} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Curcumin 3%+, 25 kg bags, ready to ship from Cochin, ask for CIF price" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={label}>Tone</label><select className={input} value={tone} onChange={(e) => setTone(e.target.value)}>{['professional and friendly', 'formal', 'exciting', 'short and simple'].map((t) => <option key={t}>{t}</option>)}</select></div>
                  <div><label className={label}>Language</label><select className={input} value={language} onChange={(e) => setLanguage(e.target.value)}>{['English', 'Hindi', 'Hinglish', 'Arabic', 'Spanish', 'French', 'Vietnamese', 'Indonesian'].map((t) => <option key={t}>{t}</option>)}</select></div>
                </div>
                <button type="button" className={primary} disabled={busy !== '' || !topic.trim() || !status.ai?.text} onClick={writeAi}>{busy === 'write' ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Write the post</button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className={label}>Text</span>
              {platforms.length > 1 && <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer"><input type="checkbox" checked={separate} onChange={(e) => { setSeparate(e.target.checked); if (e.target.checked) setTexts(Object.fromEntries(platforms.map((p) => [p, texts[p] !== undefined ? texts[p] : text]))); }} /> Different text for each platform</label>}
            </div>
            {separate && platforms.length > 1 ? platforms.map((p) => (
              <div key={p}>
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1"><span>{PLATFORM[p].label}</span><span className={textFor(p).length > LIMITS[p] ? 'text-rose-600' : ''}>{textFor(p).length} / {LIMITS[p]}</span></div>
                <textarea className={`${input} min-h-[110px]`} value={textFor(p)} onChange={(e) => setTexts({ ...texts, [p]: e.target.value })} aria-label={`${PLATFORM[p].label} text`} />
              </div>
            )) : (
              <>
                <textarea className={`${input} min-h-[140px]`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your post…" aria-label="Post text" />
                <div className="text-[11px] text-slate-400 text-right">{text.length} characters{platforms.includes('instagram') && text.length > 2200 ? ' · too long for Instagram (2,200)' : ''}</div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <span className={label}>Picture {platforms.includes('instagram') ? <span className="text-rose-500">(Instagram needs one)</span> : '(optional)'}</span>
            <div className="flex flex-wrap gap-2 items-center">
              <label className={`${secondary} cursor-pointer`}>{busy === 'upload' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Upload JPG / PNG<input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => upload(e.target.files[0])} aria-label="Upload picture" /></label>
              {media.length > 0 && <button type="button" className="text-[11px] font-bold text-rose-600 cursor-pointer" onClick={() => setMedia([])}>Remove picture</button>}
            </div>
            <div className="flex gap-2 items-start">
              <input className={input} value={imgPrompt} onChange={(e) => setImgPrompt(e.target.value)} placeholder={status.ai?.image ? 'Or describe a picture for AI: turmeric fingers in a jute bag, warm light' : 'Add an OpenAI, Gemini or Grok key to make pictures with AI'} aria-label="Picture description" disabled={!status.ai?.image} />
              <button type="button" className={secondary} disabled={busy !== '' || !imgPrompt.trim() || !status.ai?.image} onClick={makeImage}>{busy === 'image' ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />} Make</button>
            </div>
          </div>

          <div className="space-y-2">
            <label className={label} htmlFor="social-when">When</label>
            <input id="social-when" type="datetime-local" className={`${input} w-auto`} value={when} onChange={(e) => setWhen(e.target.value)} />
            <p className="text-[11px] text-slate-500">Your computer's time. Leave empty and press "Post now" to publish straight away.{!isOwner ? ' Your post goes to the company owner for approval first.' : ''}</p>
          </div>

          {msg && <Notice type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Notice>}
          <div className="flex flex-wrap gap-2">
            {isOwner ? (
              <>
                <button type="button" className={primary} disabled={busy !== '' || !when} onClick={() => submit('schedule')}>{busy === 'schedule' ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />} Schedule</button>
                <button type="button" className={secondary} disabled={busy !== ''} onClick={() => submit('now')}>{busy === 'now' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Post now</button>
              </>
            ) : (
              <button type="button" className={primary} disabled={busy !== ''} onClick={() => submit(when ? 'schedule' : 'now')}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send for approval</button>
            )}
            <button type="button" className={secondary} disabled={busy !== ''} onClick={() => submit('draft')}>Save draft</button>
          </div>
        </div>

        <div className="space-y-3" data-social-preview>
          <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Preview</div>
          {(platforms.length ? platforms : ['facebook']).map((p) => { const P = PLATFORM[p]; return (
            <div key={p} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-700"><span className={`w-5 h-5 rounded-full ${P.dot} text-white flex items-center justify-center`}><P.Icon size={11} /></span><span className="text-[11px] font-bold">{(accounts.find((a) => a.platform === p && picked.includes(a.id)) || {}).name || P.label}</span></div>
              {p === 'instagram' && (media[0] ? <img src={media[0].url} alt="" className="w-full aspect-square object-cover" /> : <div className="w-full aspect-square bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[11px] text-slate-400">Picture needed</div>)}
              <div className="px-3 py-2 text-[11px] whitespace-pre-wrap break-words text-slate-700 dark:text-slate-200 max-h-48 overflow-y-auto">{textFor(p) || <span className="text-slate-400">Your text…</span>}</div>
              {p === 'facebook' && media[0] && <img src={media[0].url} alt="" className="w-full" />}
            </div>
          ); })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Post detail                                                          */
/* ------------------------------------------------------------------ */

function PostDetail({ post, accounts, isOwner, meId, onClose, onEdit, onChanged }) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const act = async (name, fn) => { setBusy(name); setMsg(null); try { const r = await fn(); onChanged(r.message); } catch (e) { setMsg({ type: 'error', text: e.message }); setBusy(''); } };
  const canEdit = isOwner ? ['draft', 'pending_approval', 'scheduled', 'failed'].includes(post.status) : post.created_by === meId && ['draft', 'pending_approval', 'failed'].includes(post.status);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-3" onClick={onClose}>
      <div className={`${card} w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 space-y-3`} onClick={(e) => e.stopPropagation()} data-social-post-detail>
        <div className="flex items-start justify-between gap-2">
          <div><div className="flex items-center gap-2"><StatusBadge s={post.status} /><span className="text-[11px] text-slate-500">{post.status === 'posted' ? `Posted ${fmt(post.posted_at)}` : post.scheduled_at ? `For ${fmt(post.scheduled_at)}` : 'No date yet'}</span></div>
            <div className="text-[11px] text-slate-500 mt-1">By {post.created_by_name || '—'}{post.approved_by_name ? ` · approved by ${post.approved_by_name}` : ''}</div></div>
          <button className="p-1 text-slate-400 cursor-pointer" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        {post.note && <Notice type="warn">{post.note}</Notice>}
        {post.media[0] && <img src={post.media[0].url} alt="" className="w-full max-h-64 object-contain rounded-lg bg-slate-50" />}
        <div className="text-xs whitespace-pre-wrap break-words text-slate-700 dark:text-slate-200">{post.text || Object.values(post.texts || {})[0] || ''}</div>
        <div className="space-y-1.5">
          {accountsOf(post, accounts).map((a) => { const t = (post.targets || []).find((x) => x.account_id === a.id) || {}; const P = PLATFORM[a.platform]; return (
            <div key={a.id} className="flex items-center gap-2 text-[11px] rounded-lg border border-slate-100 dark:border-slate-800 px-2 py-1.5">
              <P.Icon size={13} className={a.platform === 'facebook' ? 'text-blue-600' : 'text-pink-600'} /><span className="font-semibold">{a.name}</span>
              <span className="ml-auto">{t.status === 'posted' ? (t.permalink ? <a href={t.permalink} target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold inline-flex items-center gap-1">Posted <ExternalLink size={11} /></a> : <span className="text-emerald-700 font-bold">Posted</span>) : t.status === 'failed' ? <span className="text-rose-600 font-bold" title={t.error}>Failed</span> : <span className="text-slate-400">Waiting</span>}</span>
            </div>
          ); })}
        </div>
        {post.error && <Notice type="error">{post.error}</Notice>}
        {msg && <Notice type={msg.type}>{msg.text}</Notice>}
        <div className="flex flex-wrap gap-2 pt-1">
          {isOwner && post.status === 'pending_approval' && <><button className={primary} disabled={busy !== ''} onClick={() => act('ok', () => sm(`/posts/${post.id}/approve`, 'POST'))}>{busy === 'ok' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve</button><button className={secondary} disabled={busy !== ''} onClick={() => act('no', () => sm(`/posts/${post.id}/reject`, 'POST', { note: window.prompt('Note for the staff member (optional)') || '' }))}>Send back</button></>}
          {['failed', 'partial'].includes(post.status) && <button className={primary} disabled={busy !== ''} onClick={() => act('retry', () => sm(`/posts/${post.id}/retry`, 'POST'))}><RefreshCw size={14} /> Try again</button>}
          {canEdit && <button className={secondary} onClick={() => onEdit(post)}><Pencil size={13} /> Edit</button>}
          {(isOwner || post.created_by === meId) && post.status !== 'publishing' && <button className={`${secondary} text-rose-600`} disabled={busy !== ''} onClick={() => window.confirm(post.status === 'posted' ? 'Remove from the calendar? The post stays on Facebook / Instagram.' : 'Delete this post?') && act('del', () => sm(`/posts/${post.id}`, 'DELETE'))}><Trash2 size={13} /> Delete</button>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

function Calendar({ posts, accounts, month, setMonth, onOpen, onNewOn, onMove }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7)); // weeks start on Monday
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const byDay = useMemo(() => {
    const m = {};
    posts.forEach((p) => { const d = ymd(new Date(p.scheduled_at || p.posted_at || p.created_at)); (m[d] = m[d] || []).push(p); });
    return m;
  }, [posts]);
  const today = ymd(new Date());
  return (
    <div className={`${card} p-3 sm:p-4`} data-social-calendar>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white w-36 text-center">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3>
          <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-500">{Object.entries(PLATFORM).map(([k, P]) => <span key={k} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${P.dot}`} />{P.label}</span>)}<span className="text-slate-400">Drag a post to another day to move it</span></div>
      </div>
      <div className="grid grid-cols-7 text-[10px] font-bold text-slate-400 uppercase mb-1">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="px-1">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
        {days.map((d) => { const key = ymd(d); const inMonth = d.getMonth() === month.getMonth(); const list = byDay[key] || []; return (
          <div key={key} className={`min-h-[86px] sm:min-h-[104px] p-1 ${inMonth ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-900/60'} group`} data-day={key}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData('text/plain'); if (id) onMove(id, key); }}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${key === today ? 'bg-emerald-600 text-white' : inMonth ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300'}`}>{d.getDate()}</span>
              <button className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-emerald-600 cursor-pointer" onClick={() => onNewOn(key)} aria-label={`New post on ${key}`}><Plus size={12} /></button>
            </div>
            <div className="space-y-0.5 mt-0.5">
              {list.slice(0, 3).map((p) => { const pls = platformsOf(p, accounts); const movable = ['draft', 'scheduled', 'pending_approval'].includes(p.status); return (
                <button key={p.id} type="button" draggable={movable} onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)} onClick={() => onOpen(p)} data-social-chip={p.status}
                  className={`w-full text-left flex items-center gap-1 px-1 py-0.5 rounded border text-[10px] leading-tight cursor-pointer ${(STATUS[p.status] || STATUS.draft).cls}`}>
                  <span className="flex gap-0.5 shrink-0">{pls.map((x) => <span key={x} className={`w-1.5 h-1.5 rounded-full ${PLATFORM[x].dot}`} />)}</span>
                  <span className="shrink-0 font-semibold">{p.scheduled_at || p.posted_at ? new Date(p.scheduled_at || p.posted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  <span className="truncate">{p.status === 'failed' ? '⚠ ' : p.status === 'posted' ? '✓ ' : ''}{(p.text || Object.values(p.texts || {})[0] || 'Picture post').slice(0, 40)}</span>
                </button>); })}
              {list.length > 3 && <button type="button" className="text-[10px] text-slate-500 px-1 cursor-pointer" onClick={() => onOpen(list[3])}>+{list.length - 3} more</button>}
            </div>
          </div>); })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Post list (all, needing approval, failed)                           */
/* ------------------------------------------------------------------ */

function PostList({ posts, accounts, onOpen }) {
  const [filter, setFilter] = useState('all');
  const list = posts.filter((p) => filter === 'all' || p.status === filter).slice().reverse();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">{[['all', 'All'], ['pending_approval', 'Needs approval'], ['scheduled', 'Scheduled'], ['posted', 'Posted'], ['failed', 'Failed'], ['draft', 'Drafts']].map(([k, l]) => <button key={k} className={`px-3 py-1 rounded-full text-[11px] font-semibold border cursor-pointer ${filter === k ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'}`} onClick={() => setFilter(k)}>{l} {k !== 'all' ? `(${posts.filter((p) => p.status === k).length})` : ''}</button>)}</div>
      {list.length === 0 ? <div className={`${card} p-8 text-center text-xs text-slate-500`}>No posts here.</div> : list.map((p) => (
        <button key={p.id} type="button" onClick={() => onOpen(p)} className={`${card} w-full text-left p-3 flex items-center gap-3 hover:border-emerald-300 cursor-pointer`} data-social-row>
          {p.media[0] ? <img src={p.media[0].url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" /> : <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center text-slate-400"><Share2 size={16} /></div>}
          <div className="min-w-0 flex-1"><div className="text-xs text-slate-800 dark:text-slate-100 truncate">{p.text || Object.values(p.texts || {})[0] || 'Picture post'}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">{platformsOf(p, accounts).map((x) => { const P = PLATFORM[x]; return <P.Icon key={x} size={11} />; })}<span>{p.scheduled_at || p.posted_at ? fmt(p.scheduled_at || p.posted_at) : 'No date'}</span><span>· {p.created_by_name}</span></div></div>
          <StatusBadge s={p.status} />
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AI month plan                                                       */
/* ------------------------------------------------------------------ */

function IdeasPanel({ month, onUse, onClose }) {
  const [focus, setFocus] = useState('');
  const [countries, setCountries] = useState('');
  const [ideas, setIdeas] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const run = async () => {
    setBusy(true); setMsg(null);
    try { const r = await sm('/ai/ideas', 'POST', { month: `${month.getFullYear()}-${pad(month.getMonth() + 1)}`, focus, countries, count: 12 }); setIdeas(r.data.ideas); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(false); }
  };
  return (
    <div className={`${card} p-4 space-y-3`} data-social-ideas>
      <div className="flex items-center justify-between"><h3 className="text-sm font-bold flex items-center gap-2"><Lightbulb size={15} className="text-amber-500" /> AI plan for {month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3><button className="p-1 text-slate-400 cursor-pointer" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
      <div className="grid sm:grid-cols-2 gap-2">
        <div><label className={label}>Products / focus</label><input className={input} value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Turmeric, maize, rice DDGS" /></div>
        <div><label className={label}>Buyer countries</label><input className={input} value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="UAE, Vietnam, Netherlands" /></div>
      </div>
      <button className={primary} disabled={busy} onClick={run}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Make the plan</button>
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      {ideas && <div className="space-y-1.5">{ideas.map((i, n) => (
        <div key={n} className="flex items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-700 p-2">
          <span className="text-[10px] font-bold text-slate-500 w-14 shrink-0">{i.date ? new Date(`${i.date}T00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</span>
          <div className="min-w-0 flex-1"><div className="text-xs font-semibold">{i.title}</div><div className="text-[11px] text-slate-500">{i.brief}</div></div>
          <button className={`${secondary} !px-2.5 !py-1`} onClick={() => onUse(i)}>Use</button>
        </div>))}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

function Accounts({ status, isOwner, reload, setBanner }) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const connect = async () => {
    setBusy('connect'); setMsg(null);
    try { const r = await sm('/connect/meta', 'POST'); window.location.assign(r.data.url); } catch (e) { setMsg({ type: 'error', text: e.message }); setBusy(''); }
  };
  const remove = async (a) => {
    if (!window.confirm(`Remove ${a.name} from the CRM? Scheduled posts for it will not be published.`)) return;
    try { const r = await sm(`/accounts/${a.id}`, 'DELETE'); setBanner(r.message); reload(); } catch (e) { setMsg({ type: 'error', text: e.message }); }
  };
  return (
    <div className="space-y-4 max-w-3xl" data-social-accounts>
      <div className={`${card} p-4 sm:p-5 space-y-3`}>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Connect Facebook and Instagram</h3>
        <ol className="list-decimal pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <li>Your Instagram must be a <b>Business or Creator</b> account and linked to your Facebook Page (Instagram app → Settings → Account type).</li>
          <li>Press <b>Connect</b>, log in to Facebook, choose your Page (and its Instagram account) and press <b>Allow</b>.</li>
          <li>You come back here with the accounts listed below. No key or password is stored in the CRM — only Facebook's access for posting.</li>
        </ol>
        {!status.meta_ready && <Notice type="warn">The platform admin has not finished the Facebook app set-up yet, so Connect is not available.</Notice>}
        {msg && <Notice type={msg.type}>{msg.text}</Notice>}
        {isOwner ? <button className={primary} disabled={busy !== '' || !status.meta_ready} onClick={connect}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Facebook size={14} />} {status.accounts.length ? 'Connect again / add Pages' : 'Connect Facebook / Instagram'}</button> : <Notice>Only the company owner can connect accounts.</Notice>}
      </div>
      <div className={`${card} divide-y divide-slate-100 dark:divide-slate-800`}>
        {status.accounts.length === 0 ? <div className="p-6 text-center text-xs text-slate-500">No accounts connected yet.</div> : status.accounts.map((a) => { const P = PLATFORM[a.platform]; return (
          <div key={a.id} className="p-3 flex items-center gap-3" data-social-account={a.platform}>
            {a.picture ? <img src={a.picture} alt="" className="w-9 h-9 rounded-full object-cover" /> : <span className={`w-9 h-9 rounded-full ${P.dot} text-white flex items-center justify-center`}><P.Icon size={16} /></span>}
            <div className="min-w-0 flex-1"><div className="text-xs font-bold">{a.name}</div><div className="text-[11px] text-slate-500">{P.label}{a.page_name ? ` · linked to ${a.page_name}` : ''} · connected {fmt(a.connected_at)}</div>{a.status === 'expired' && <div className="text-[11px] text-rose-600 font-semibold">Facebook login expired — press Connect again.</div>}</div>
            {isOwner && <button className="p-2 text-rose-500 cursor-pointer" onClick={() => remove(a)} aria-label={`Remove ${a.name}`}><Trash2 size={14} /></button>}
          </div>); })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AI settings (the company's own keys)                                */
/* ------------------------------------------------------------------ */

function AiSettings({ reload }) {
  const [s, setS] = useState(null);
  const [keys, setKeys] = useState({});
  const [models, setModels] = useState({});
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const load = useCallback(() => sm('/ai').then((r) => { setS(r.data); setModels(Object.fromEntries(Object.entries(r.data.providers).map(([k, p]) => [k, { text_model: p.text_model, image_model: p.image_model }]))); }).catch((e) => setMsg({ type: 'error', text: e.message })), []);
  useEffect(() => { load(); }, [load]);
  if (!s) return <div className={`${card} p-5 text-xs text-slate-400 flex items-center gap-2`}><Loader2 size={14} className="animate-spin" /> Loading…</div>;
  const save = async (extra = {}) => {
    setBusy('save'); setMsg(null);
    const providers = Object.fromEntries(Object.keys(s.providers).map((k) => [k, { ...(keys[k] ? { api_key: keys[k] } : {}), ...(models[k] || {}) }]));
    try { const r = await sm('/ai', 'PUT', { providers, ...extra }); setS(r.data); setKeys({}); setMsg({ type: 'success', text: 'Saved. Press Test to check a key.' }); reload(); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const test = async (k) => {
    setBusy(`t-${k}`); setMsg(null);
    try { const r = await sm('/ai/test', 'POST', { provider: k }); setMsg({ type: 'success', text: r.message }); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const removeKey = async (k) => {
    if (!window.confirm(`Remove the ${s.providers[k].label} key?`)) return;
    try { const r = await sm('/ai', 'PUT', { providers: { [k]: { remove: true } } }); setS(r.data); reload(); } catch (e) { setMsg({ type: 'error', text: e.message }); }
  };
  const withKey = Object.entries(s.providers).filter(([, p]) => p.has_key);
  return (
    <div className="space-y-4 max-w-4xl" data-social-ai-settings>
      <Notice>The CRM uses <b>your own</b> AI account to write posts and make pictures. You pay the AI company directly (usually a few rupees a month). Keys are stored encrypted and never shown again.</Notice>
      <div className="grid sm:grid-cols-2 gap-3">
        {Object.entries(s.providers).map(([k, p]) => (
          <div key={k} className={`${card} p-4 space-y-2`} data-ai-provider={k}>
            <div className="flex items-center justify-between"><span className="text-sm font-bold">{p.label}</span>{p.has_key ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Key saved ••••{p.key_last4}</span> : <span className="text-[10px] text-slate-400">No key</span>}</div>
            <div className="text-[11px] text-slate-500">{p.text ? 'Writes posts' : ''}{p.image ? ' · makes pictures' : ' · no pictures'} · <a className="text-emerald-700 font-semibold" href={p.key_url} target="_blank" rel="noopener noreferrer">get a key</a></div>
            <div className="relative"><KeyRound size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type="password" className={`${input} pl-7 font-mono`} value={keys[k] || ''} onChange={(e) => setKeys({ ...keys, [k]: e.target.value })} placeholder={p.has_key ? 'Paste a new key to replace' : p.key_hint} aria-label={`${p.label} API key`} autoComplete="off" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Writing model</label><input className={input} value={(models[k] || {}).text_model || ''} onChange={(e) => setModels({ ...models, [k]: { ...models[k], text_model: e.target.value } })} /></div>
              {p.image && <div><label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Picture model</label><input className={input} value={(models[k] || {}).image_model || ''} onChange={(e) => setModels({ ...models, [k]: { ...models[k], image_model: e.target.value } })} /></div>}
            </div>
            <div className="flex gap-2">{p.has_key && <><button className={secondary} disabled={busy !== ''} onClick={() => test(k)}>{busy === `t-${k}` ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Test</button><button className="text-[11px] text-rose-600 font-semibold cursor-pointer" onClick={() => removeKey(k)}>Remove key</button></>}</div>
          </div>
        ))}
      </div>
      {withKey.length > 0 && (
        <div className={`${card} p-4 grid sm:grid-cols-2 gap-3`}>
          <div><label className={label}>Use for writing posts</label><select className={input} value={s.text_provider} onChange={(e) => save({ text_provider: e.target.value })}>{withKey.filter(([, p]) => p.text).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</select></div>
          <div><label className={label}>Use for pictures</label><select className={input} value={s.image_provider} onChange={(e) => save({ image_provider: e.target.value })}><option value="">— none —</option>{withKey.filter(([, p]) => p.image).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</select></div>
        </div>
      )}
      {msg && <Notice type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Notice>}
      <button className={primary} disabled={busy !== ''} onClick={() => save()}>{busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Save keys</button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function SocialMedia() {
  const [status, setStatus] = useState(null);
  const [tab, setTab] = useState('calendar');
  const [posts, setPosts] = useState([]);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [composer, setComposer] = useState(null);
  const [open, setOpen] = useState(null);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [banner, setBanner] = useState(null);
  const { profile: me } = useAuth();

  const loadStatus = useCallback(() => api.request('/social/status').then((r) => setStatus(r.data)).catch(() => setStatus({ enabled: false, can_use: false })), []);
  const loadPosts = useCallback(() => {
    const from = new Date(month.getFullYear(), month.getMonth() - 1, 20);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 12);
    return sm(`/posts?from=${ymd(from)}&to=${ymd(to)}`).then((r) => setPosts(r.data || [])).catch(() => {});
  }, [month]);
  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { if (status?.can_use) loadPosts(); }, [status?.can_use, loadPosts]);
  // Back from Facebook login: ?social=connected | error&msg=…
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (!q.get('social')) return;
    setBanner(q.get('social') === 'connected' ? { type: 'success', text: `Connected ${q.get('n') || ''} account(s). You can post now.` } : { type: 'error', text: q.get('msg') || 'Connection failed.' });
    setTab('accounts');
    window.history.replaceState({}, '', window.location.pathname);
  }, []);
  useEffect(() => { if (!banner) return undefined; const t = setTimeout(() => setBanner(null), 9000); return () => clearTimeout(t); }, [banner]);
  const busyPosts = posts.some((p) => p.status === 'publishing');
  useEffect(() => { if (!busyPosts) return undefined; const t = setInterval(loadPosts, 3000); return () => clearInterval(t); }, [busyPosts, loadPosts]);

  if (!status) return <div className={`${card} p-5 text-xs text-slate-400 flex items-center gap-2`}><Loader2 size={14} className="animate-spin" /> Checking…</div>;
  if (!status.can_use) return (
    <div className={`${card} text-center py-12 px-4`} data-social-locked>
      <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600"><Lock size={24} /></div>
      <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Social Media is a premium feature</h2>
      <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">{status.enabled ? 'Ask your company owner to give you access to Social Media (Team → your name → Permissions).' : status.is_owner ? 'Ask the platform admin to switch on Social Media for your company. Then connect your Facebook Page and Instagram.' : 'Your company has not switched on Social Media yet.'}</p>
    </div>
  );

  const accounts = status.accounts || [];
  const saved = (text) => { setComposer(null); setTab('calendar'); setBanner({ type: 'success', text }); loadPosts(); loadStatus(); };
  const changed = (text) => { setOpen(null); setBanner({ type: 'success', text: text || 'Done' }); loadPosts(); loadStatus(); };
  const move = async (id, day) => {
    const p = posts.find((x) => x.id === id);
    if (!p || !['draft', 'scheduled', 'pending_approval'].includes(p.status)) return;
    const old = p.scheduled_at ? new Date(p.scheduled_at) : new Date(`${day}T10:00`);
    const next = new Date(`${day}T${pad(old.getHours())}:${pad(old.getMinutes())}`);
    if (p.status === 'scheduled' && next.getTime() < Date.now()) { setBanner({ type: 'error', text: 'That time is in the past.' }); return; }
    try { await sm(`/posts/${id}`, 'PUT', { scheduled_at: next.toISOString(), action: 'keep' }); setBanner({ type: 'success', text: `Moved to ${fmt(next)}` }); loadPosts(); } catch (e) { setBanner({ type: 'error', text: e.message }); }
  };
  const tabs = [
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'posts', label: 'Posts', icon: List, count: status.pending_approval ? `${status.pending_approval} to approve` : undefined },
    { id: 'accounts', label: 'Accounts', icon: Share2, dot: !accounts.length },
    ...(status.is_owner ? [{ id: 'ai', label: 'AI settings', icon: Settings, dot: !status.ai?.text }] : []),
  ];

  return (
    <div className="w-full space-y-5 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap"><h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Social Media</h1><span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">Premium</span></div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Plan, write (with your own AI), approve and schedule posts for your Facebook Page and Instagram — all on one calendar.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className={secondary} onClick={() => { setIdeasOpen(true); setTab('calendar'); }} disabled={!status.ai?.text} title={status.ai?.text ? '' : 'Add an AI key first'}><Lightbulb size={14} /> AI month plan</button>
          <button className={primary} onClick={() => setComposer({})}><Plus size={14} /> New post</button>
        </div>
      </div>

      {banner && <Notice type={banner.type} onClose={() => setBanner(null)}>{banner.text}</Notice>}
      {!accounts.length && tab !== 'accounts' && <Notice type="warn">No Facebook Page or Instagram connected yet. <button className="font-bold underline cursor-pointer" onClick={() => setTab('accounts')}>Connect now</button></Notice>}
      {status.is_owner && !status.ai?.text && tab !== 'ai' && <Notice>Want AI to write posts and make pictures? <button className="font-bold underline cursor-pointer" onClick={() => setTab('ai')}>Add your OpenAI, Gemini, Claude or Grok key</button></Notice>}

      {composer ? (
        <Composer status={status} isOwner={status.is_owner} accounts={accounts} initial={composer} onClose={() => setComposer(null)} onSaved={saved} />
      ) : (
        <>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 w-fit max-w-full overflow-x-auto" role="tablist">
            {tabs.map((t) => { const Icon = t.icon; return (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap cursor-pointer ${tab === t.id ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                <Icon size={14} /><span>{t.label}</span>{t.count && <span className="px-1.5 rounded bg-amber-100 text-amber-800 text-[10px]">{t.count}</span>}{t.dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
              </button>); })}
          </div>
          {tab === 'calendar' && (
            <div className="space-y-4">
              {ideasOpen && <IdeasPanel month={month} onClose={() => setIdeasOpen(false)} onUse={(i) => { setIdeasOpen(false); setComposer({ topic: `${i.title}. ${i.brief}`, scheduled_at: i.date ? new Date(`${i.date}T10:00`).toISOString() : null }); }} />}
              <Calendar posts={posts} accounts={accounts} month={month} setMonth={setMonth} onOpen={setOpen} onNewOn={(day) => setComposer({ scheduled_at: new Date(`${day}T10:00`).toISOString() })} onMove={move} />
            </div>
          )}
          {tab === 'posts' && <PostList posts={posts} accounts={accounts} onOpen={setOpen} />}
          {tab === 'accounts' && <Accounts status={status} isOwner={status.is_owner} reload={loadStatus} setBanner={(t) => setBanner({ type: 'success', text: t })} />}
          {tab === 'ai' && status.is_owner && <AiSettings reload={loadStatus} />}
        </>
      )}
      {open && <PostDetail post={open} accounts={accounts} isOwner={status.is_owner} meId={me?.id} onClose={() => setOpen(null)} onEdit={(p) => { setOpen(null); setComposer(p); }} onChanged={changed} />}
    </div>
  );
}
