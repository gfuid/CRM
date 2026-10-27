import React, { useEffect, useState } from 'react';
import { Bot, LifeBuoy, Plus, RefreshCw, ChevronLeft, Send, Lock } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AssistantChat, NewTicketForm, STATUS_STYLE, RichText } from '../components/support/SupportParts';

const when = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

function TicketThread({ id, onBack, onChanged }) {
  const { profile } = useAuth();
  const [t, setT] = useState(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await api.getTicket(id);
      setT(res?.data || null);
      onChanged && onChanged();
    } catch (err) {
      setError(err?.message || 'Ticket could not be loaded.');
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const send = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true); setError('');
    try {
      const res = await api.replyTicket(id, reply.trim());
      setT(res?.data || t);
      setReply('');
      onChanged && onChanged();
    } catch (err) {
      setError(err?.message || 'Message could not be sent.');
    } finally { setBusy(false); }
  };

  const close = async () => {
    if (!window.confirm('Close this ticket? You will need to raise a new one if the problem comes back.')) return;
    try {
      const res = await api.updateTicket(id, { status: 'Closed' });
      setT(res?.data || t);
      onChanged && onChanged();
    } catch (err) { setError(err?.message || 'Ticket could not be closed.'); }
  };

  if (!t) return <div className="text-xs text-slate-500 p-4">{error || 'Loading…'}</div>;
  const mine = Boolean(t.is_mine);
  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"><ChevronLeft size={14} /> All tickets</button>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-slate-500">{t.code}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLE[t.status] || ''}`}>{t.status}</span>
          <span className="text-[10px] font-bold text-slate-500">{t.category} · {t.priority}</span>
        </div>
        <h2 className="text-base font-black text-slate-900 dark:text-white">{t.subject}</h2>
        <p className="text-[11px] text-slate-500">Raised by {t.created_by_name} ({t.created_by_role}) · {when(t.created_at)}</p>
      </div>

      <div className="space-y-2">
        {t.messages.map((m) => (
          <div key={m.id} className={`rounded-2xl border p-3 text-xs ${m.author_role === 'support' ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900' : m.is_chat_transcript ? 'bg-slate-50 border-dashed border-slate-300 dark:bg-slate-800/40 dark:border-slate-700' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-black text-slate-800 dark:text-slate-100">{m.is_chat_transcript ? '🤖 AI chat history' : m.author_name}</span>
              <span className="text-[10px] text-slate-400">{when(m.at)}</span>
            </div>
            <div className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{m.is_chat_transcript ? <RichText text={m.body} /> : m.body}</div>
          </div>
        ))}
      </div>

      {error && <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}

      {t.status === 'Closed' ? (
        <div className="flex items-center gap-1.5 text-xs text-slate-500"><Lock size={13} /> This ticket is closed.</div>
      ) : mine ? (
        <form onSubmit={send} className="space-y-2">
          <textarea value={reply} onChange={(e) => setReply(e.target.value.slice(0, 5000))} rows={3} placeholder="Write a reply…" className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
          <div className="flex items-center gap-2">
            <button type="submit" disabled={busy || !reply.trim()} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"><Send size={13} /> {busy ? 'Sending…' : 'Send reply'}</button>
            <button type="button" onClick={close} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">Close ticket</button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <p className="text-[11px] text-slate-500">Only {t.created_by_name} can reply on this ticket.</p>
          <button type="button" onClick={close} className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-600 border border-slate-200 dark:border-slate-700 cursor-pointer">Close ticket</button>
        </div>
      )}
    </div>
  );
}

export default function Support() {
  const { isOwner } = useAuth();
  const pending = (() => { try { const v = sessionStorage.getItem('crm_open_ticket_id'); sessionStorage.removeItem('crm_open_ticket_id'); return v; } catch { return null; } })();
  const [tab, setTab] = useState(pending ? 'tickets' : 'ai');
  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState('active');
  const [openId, setOpenId] = useState(pending || null);
  const [creating, setCreating] = useState(null); // { transcript, subject }
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.listTickets(filter);
      setTickets(res?.data || []);
      setCounts(res?.meta?.counts || res?.counts || {});
    } catch {
      setTickets([]);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  // Open a ticket from a notification click or the floating chat
  useEffect(() => {
    const open = (e) => { try { sessionStorage.removeItem('crm_open_ticket_id'); } catch {} setTab('tickets'); setCreating(null); if (e.detail?.id) setOpenId(e.detail.id); load(); };
    window.addEventListener('crm_open_ticket', open);
    return () => window.removeEventListener('crm_open_ticket', open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTicket = (transcript, lastQuestion) => {
    setCreating({ transcript: transcript || [], subject: lastQuestion || '' });
    setTab('tickets');
    setOpenId(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Help & Support</h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">Ask the AI assistant how to do something, or raise a ticket for the support team.{isOwner ? ' You also see tickets raised by your staff.' : ''}</p>
      </div>

      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        <button type="button" onClick={() => setTab('ai')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${tab === 'ai' ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}><Bot size={13} /> Ask AI</button>
        <button type="button" onClick={() => setTab('tickets')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${tab === 'tickets' ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>
          <LifeBuoy size={13} /> Tickets {counts.unread ? <span className="px-1.5 rounded-full bg-rose-500 text-white text-[9px]">{counts.unread}</span> : null}
        </button>
      </div>

      {notice && <div className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{notice}</div>}

      {tab === 'ai' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-w-3xl">
          <AssistantChat onRaiseTicket={startTicket} />
        </div>
      )}

      {tab === 'tickets' && creating && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 max-w-2xl">
          <h2 className="text-sm font-black text-slate-900 dark:text-white mb-2">New support ticket</h2>
          <NewTicketForm
            initialSubject={creating.subject}
            transcript={creating.transcript}
            onCancel={() => setCreating(null)}
            onCreated={(t) => { setCreating(null); setNotice(`Ticket ${t?.code || ''} sent. You will get a notification when support replies.`); setFilter('active'); load(); if (t?.id) setOpenId(t.id); }}
          />
        </div>
      )}

      {tab === 'tickets' && !creating && openId && (
        <div className="max-w-3xl"><TicketThread id={openId} onBack={() => { setOpenId(null); load(); }} onChanged={load} /></div>
      )}

      {tab === 'tickets' && !creating && !openId && (
        <div className="space-y-3 max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {[['active', 'Open'], ['all', 'All']].map(([k, label]) => (
                <button key={k} type="button" onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${filter === k ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600'}`}>{label}</button>
              ))}
              <button type="button" onClick={load} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer" title="Refresh"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button>
            </div>
            <button type="button" onClick={() => startTicket([], '')} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"><Plus size={14} /> New ticket</button>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {tickets.length === 0 && <div className="p-6 text-center text-xs text-slate-500">{loading ? 'Loading…' : 'No tickets yet.'}</div>}
            {tickets.map((t) => (
              <button key={t.id} type="button" onClick={() => setOpenId(t.id)} className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer flex items-start gap-3">
                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${t.unread ? 'bg-rose-500' : 'bg-transparent'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{t.code}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLE[t.status] || ''}`}>{t.status}</span>
                    {t.priority !== 'Normal' && <span className="text-[10px] font-bold text-slate-500">{t.priority}</span>}
                  </div>
                  <div className={`text-xs mt-0.5 truncate ${t.unread ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-800 dark:text-slate-200'}`}>{t.subject}</div>
                  <div className="text-[11px] text-slate-500 truncate">{t.last_reply_by === 'support' ? 'Support: ' : ''}{t.last_message}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-slate-400">{when(t.updated_at)}</div>
                  {isOwner && <div className="text-[10px] text-slate-500">{t.created_by_name}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
