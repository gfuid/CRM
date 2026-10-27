import React, { useEffect, useRef, useState } from 'react';
import { Send, Bot, LifeBuoy, Loader2, Ticket } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/** Go to Help & Support and open one ticket (works even while the page is still loading). */
export const openTicket = (id) => {
  try { if (id) sessionStorage.setItem('crm_open_ticket_id', id); } catch {}
  window.dispatchEvent(new CustomEvent('crm_navigate', { detail: { tab: 'support' } }));
  setTimeout(() => window.dispatchEvent(new CustomEvent('crm_open_ticket', { detail: { id } })), 300);
};

export const TICKET_CATEGORIES = ['Question', 'Bug / Something not working', 'Feature request', 'Staff or storage limit', 'Data correction', 'Billing / Plan', 'Other'];
export const TICKET_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];

export const STATUS_STYLE = {
  Open: 'bg-blue-50 text-blue-700 border-blue-200',
  'In Progress': 'bg-amber-50 text-amber-800 border-amber-200',
  'Waiting on you': 'bg-purple-50 text-purple-700 border-purple-200',
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Closed: 'bg-slate-100 text-slate-500 border-slate-200',
};

/** Very small, safe formatter for AI answers: **bold**, bullet / numbered lines, paragraphs. No HTML is ever injected. */
export function RichText({ text }) {
  const lines = String(text || '').split('\n');
  const inline = (line, key) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={`${key}-${i}`}>{p.slice(2, -2)}</strong>;
      if (p.startsWith('`') && p.endsWith('`')) return <code key={`${key}-${i}`} className="px-1 rounded bg-slate-100 dark:bg-slate-800 text-[0.9em]">{p.slice(1, -1)}</code>;
      return <React.Fragment key={`${key}-${i}`}>{p}</React.Fragment>;
    });
  };
  return (
    <div className="space-y-1">
      {lines.map((raw, i) => {
        const line = raw.replace(/^#{1,6}\s+/, '');
        if (!line.trim()) return <div key={i} className="h-1" />;
        const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
        const num = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
        if (bullet) return <div key={i} className="flex gap-1.5"><span>•</span><span>{inline(bullet[1], i)}</span></div>;
        if (num) return <div key={i} className="flex gap-1.5"><span className="font-bold">{num[1]}.</span><span>{inline(num[2], i)}</span></div>;
        return <div key={i}>{inline(line, i)}</div>;
      })}
    </div>
  );
}

const STORE_KEY = (uid) => `crm_ai_chat_${uid || 'guest'}`;

/**
 * The AI help chat. Conversation is kept for this browser tab session only.
 * `onRaiseTicket(transcript, lastQuestion)` opens the ticket form with the chat attached.
 */
export function AssistantChat({ onRaiseTicket, compact = false }) {
  const { profile } = useAuth();
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORE_KEY(profile?.id)) || '[]'); } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    api.assistantStatus().then((r) => setStatus(r?.data || null)).catch(() => setStatus({ enabled: false }));
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY(profile?.id), JSON.stringify(messages.slice(-30))); } catch {}
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, profile?.id]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const next = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setBusy(true);
    setError('');
    try {
      const res = await api.assistantChat(next.slice(-12));
      const reply = res?.data?.reply;
      if (!reply) throw new Error('No answer came back. Please try again.');
      setMessages([...next, { role: 'assistant', content: reply }]);
      setStatus((s) => (s ? { ...s, used_today: res.data.used_today, daily_limit: res.data.daily_limit } : s));
    } catch (err) {
      setError(err?.message || 'The assistant could not answer. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const lastQuestion = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const suggestions = [
    'How do I add a new lead?',
    'Staff limit kaise badhaye?',
    'Follow-up miss ho gaya to kya kare?',
    'What does the red "Last contact" mean?',
  ];

  if (status && !status.enabled) {
    return (
      <div className="p-4 text-xs text-slate-600 dark:text-slate-300 space-y-3">
        <div className="flex items-center gap-2 font-bold"><Bot size={16} /> The AI assistant is not switched on yet.</div>
        <p>You can still get help from the support team.</p>
        <button type="button" onClick={() => onRaiseTicket && onRaiseTicket([], '')} className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer flex items-center gap-1.5">
          <Ticket size={14} /> Raise a support ticket
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${compact ? 'h-full' : 'h-[60vh] min-h-[420px]'}`}>
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
        {messages.length === 0 && (
          <div className="space-y-2">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200">
              👋 Hi {profile?.name || ''}! Ask me anything about using this CRM — Hindi, Hinglish or English.
              {status?.reads_your_data ? ' I can also see a short summary of your own leads and tasks.' : ''}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl leading-relaxed ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-br-md whitespace-pre-wrap' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md'}`}>
              {m.role === 'user' ? m.content : <RichText text={m.content} />}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-1.5 text-slate-400"><Loader2 size={13} className="animate-spin" /> Thinking…</div>
        )}
        {error && <div className="text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 font-semibold">{error}</div>}
        <div ref={endRef} />
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 p-2.5 space-y-2">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 2000))}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            placeholder="Type your question…"
            aria-label="Question for the AI assistant"
            className="flex-1 min-w-0 resize-none max-h-28 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <button type="submit" disabled={busy || !input.trim()} className="p-2.5 rounded-xl bg-emerald-600 text-white disabled:opacity-40 cursor-pointer" title="Send" aria-label="Send">
            <Send size={14} />
          </button>
        </form>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <button type="button" onClick={() => onRaiseTicket && onRaiseTicket(messages, lastQuestion)} className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1">
            <LifeBuoy size={11} /> Not solved? Raise a ticket
          </button>
          <span className="flex items-center gap-2">
            {status ? `${status.used_today || 0}/${status.daily_limit} today` : ''}
            {messages.length > 0 && (
              <button type="button" onClick={() => { setMessages([]); setError(''); }} className="hover:underline cursor-pointer">New chat</button>
            )}
          </span>
        </div>
        <p className="text-[9px] text-slate-400 leading-snug">AI answers can be wrong. It cannot change anything in your account.</p>
      </div>
    </div>
  );
}

/** New ticket form. `transcript` (AI chat) is attached so support sees what was already tried. */
export function NewTicketForm({ initialSubject = '', initialDescription = '', transcript = [], onCreated, onCancel }) {
  const [subject, setSubject] = useState(initialSubject.slice(0, 150));
  const [description, setDescription] = useState(initialDescription);
  const [category, setCategory] = useState('Question');
  const [priority, setPriority] = useState('Normal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (subject.trim().length < 5) return setError('Please write a short subject (at least 5 characters).');
    if (description.trim().length < 10) return setError('Please describe the problem (at least 10 characters).');
    setBusy(true);
    try {
      const res = await api.createTicket({ subject, description, category, priority, chat_transcript: transcript && transcript.length ? transcript : undefined });
      onCreated && onCreated(res?.data);
    } catch (err) {
      setError(err?.message || 'Ticket could not be created.');
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30';
  return (
    <form onSubmit={submit} className="space-y-3 p-1">
      <div>
        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Subject *</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value.slice(0, 150))} placeholder="e.g. Need 3 more staff seats" className={field} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
            {TICKET_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={field}>
            {TICKET_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">What happened? *</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 5000))} rows={5} placeholder="What were you trying to do, what did you see, on which page / lead?" className={field} />
      </div>
      {transcript && transcript.length > 0 && (
        <p className="text-[10px] text-slate-500">Your AI chat ({transcript.length} messages) will be attached so support sees what was already tried.</p>
      )}
      {error && <div className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">
          {busy ? 'Sending…' : 'Send ticket'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>}
      </div>
    </form>
  );
}
