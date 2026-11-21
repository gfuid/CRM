import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Loader2, Send, UserPlus, Check, RefreshCw, ExternalLink, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { api } from '../../services/api';

/* Comments on the company's posts, newest first: reply from the CRM, or turn a buyer into a lead
   (the lead remembers the post, so the Results tab can count leads per post). */

const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card';
const input = 'w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none';
const btn = 'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const primary = `${btn} bg-emerald-600 hover:bg-emerald-700 text-white`;
const secondary = `${btn} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50`;
const sm = (path, method = 'GET', data) => api.request(`/social${path}`, { method, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
const fmt = (s) => (s ? new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

function Notice({ type = 'info', children, onClose }) {
  const cls = type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600';
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;
  return <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${cls}`}><Icon size={14} className="shrink-0 mt-px" /><div className="min-w-0 flex-1">{children}</div>{onClose && <button className="cursor-pointer" onClick={onClose} aria-label="Close message"><X size={13} /></button>}</div>;
}

function CommentCard({ c, onChanged, setMsg }) {
  const [reply, setReply] = useState('');
  const [leadOpen, setLeadOpen] = useState(false);
  const [lead, setLead] = useState({ company_name: '', country: '', phone: '', email: '' });
  const [busy, setBusy] = useState('');
  const send = async () => { setBusy('reply'); try { const r = await sm(`/comments/${c.id}/reply`, 'POST', { text: reply }); setReply(''); setMsg({ type: 'success', text: r.message }); onChanged(); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); } };
  const mark = async (status) => { try { await sm(`/comments/${c.id}`, 'PUT', { status }); onChanged(); } catch (e) { setMsg({ type: 'error', text: e.message }); } };
  const makeLead = async () => { setBusy('lead'); try { const r = await sm(`/comments/${c.id}/lead`, 'POST', lead); setLeadOpen(false); setMsg({ type: 'success', text: r.message }); onChanged(); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); } };
  return (
    <div className={`${card} p-3 space-y-2 ${c.status === 'new' ? 'border-l-4 border-l-emerald-500' : ''}`} data-social-comment={c.status}>
      <div className="flex items-start gap-2">
        <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${c.platform === 'facebook' ? 'bg-blue-600' : 'bg-pink-600'}`}>{(c.author || '?').replace('@', '').slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <div className="text-xs"><b>{c.author}</b> <span className="text-slate-400">· {c.platform === 'facebook' ? 'Facebook' : 'Instagram'} · {fmt(c.created_time)}</span>{c.status === 'new' && <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">NEW</span>}{c.lead_id && <span className="ml-1 px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 text-[10px] font-bold">Lead made</span>}</div>
          <div className="text-sm text-slate-800 dark:text-slate-100 mt-0.5 whitespace-pre-wrap break-words">{c.text}</div>
          {c.post && <div className="text-[11px] text-slate-500 mt-1 truncate">On: “{c.post.text}” {c.post.permalink && <a href={c.post.permalink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold">open <ExternalLink size={10} /></a>}</div>}
          {(c.replies || []).map((r, i) => <div key={i} className="mt-1.5 ml-3 pl-2 border-l-2 border-emerald-200 text-[11px]"><b>You{r.by ? ` (${r.by})` : ''}:</b> {r.text}</div>)}
        </div>
      </div>
      <div className="flex gap-2">
        <input className={input} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a public reply…" aria-label={`Reply to ${c.author}`} onKeyDown={(e) => { if (e.key === 'Enter' && reply.trim()) send(); }} />
        <button className={primary} disabled={busy !== '' || !reply.trim()} onClick={send}>{busy === 'reply' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Reply</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {!c.lead_id && <button className={secondary} onClick={() => { setLead({ company_name: '', country: '', phone: '', email: '' }); setLeadOpen(!leadOpen); }}><UserPlus size={13} /> Make lead</button>}
        {c.status === 'new' ? <button className={secondary} onClick={() => mark('done')}><Check size={13} /> Mark done</button> : <button className={secondary} onClick={() => mark('new')}>Mark as new</button>}
      </div>
      {leadOpen && (
        <div className="rounded-xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900 p-3 space-y-2" data-comment-lead-form>
          <div className="text-[11px] text-violet-800 dark:text-violet-200">A new lead is made with this comment as the first remark and a follow-up for today. Fill what you know (you can add more later).</div>
          <div className="grid sm:grid-cols-2 gap-2">
            <input className={input} value={lead.company_name} onChange={(e) => setLead({ ...lead, company_name: e.target.value })} placeholder={`Company (or leave: ${c.author})`} aria-label="Lead company" />
            <input className={input} value={lead.country} onChange={(e) => setLead({ ...lead, country: e.target.value })} placeholder="Country" aria-label="Lead country" />
            <input className={input} value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} placeholder="WhatsApp / phone with country code" aria-label="Lead phone" />
            <input className={input} value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} placeholder="Email" aria-label="Lead email" />
          </div>
          <button className={primary} disabled={busy !== ''} onClick={makeLead}>{busy === 'lead' ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Save as lead</button>
        </div>
      )}
    </div>
  );
}

export default function SocialComments({ onCount }) {
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('new');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const load = useCallback(() => sm('/comments?status=all').then((r) => { setList(r.data || []); if (onCount) onCount((r.data || []).filter((c) => c.status === 'new').length); }).catch((e) => setMsg({ type: 'error', text: e.message })), [onCount]);
  useEffect(() => { load(); }, [load]);
  const refresh = async () => { setBusy(true); try { const r = await sm('/results/refresh', 'POST'); setMsg({ type: 'success', text: r.message }); await load(); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(false); } };
  const shown = (list || []).filter((c) => filter === 'all' || c.status === filter || (filter === 'leads' && c.lead_id));
  return (
    <div className="space-y-3 max-w-3xl" data-social-comments>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">{[['new', 'New'], ['done', 'Done'], ['leads', 'Made into leads'], ['all', 'All']].map(([k, l]) => <button key={k} className={`px-3 py-1 rounded-full text-[11px] font-semibold border cursor-pointer ${filter === k ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'}`} onClick={() => setFilter(k)}>{l} ({(list || []).filter((c) => k === 'all' || c.status === k || (k === 'leads' && c.lead_id)).length})</button>)}</div>
        <button className={secondary} disabled={busy} onClick={refresh}>{busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Check for new comments</button>
      </div>
      {msg && <Notice type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Notice>}
      {!list ? <div className="text-xs text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div> : shown.length === 0 ? (
        <div className={`${card} p-8 text-center`}><MessageSquare size={28} className="mx-auto text-slate-300" /><div className="text-sm font-semibold mt-2">No comments here</div><div className="text-xs text-slate-500 mt-1">Comments on your posts come in by themselves every few hours.</div></div>
      ) : shown.map((c) => <CommentCard key={c.id} c={c} onChanged={load} setMsg={setMsg} />)}
    </div>
  );
}
