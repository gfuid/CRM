import React, { useEffect, useState } from 'react';
import { LifeBuoy, RefreshCw, ChevronLeft, Send } from 'lucide-react';

const STATUSES = ['Open', 'In Progress', 'Waiting on you', 'Resolved', 'Closed'];
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
const STATUS_STYLE = {
  Open: 'bg-blue-50 text-blue-700 border-blue-200',
  'In Progress': 'bg-amber-50 text-amber-800 border-amber-200',
  'Waiting on you': 'bg-purple-50 text-purple-700 border-purple-200',
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Closed: 'bg-slate-100 text-slate-500 border-slate-200',
};
const PRIORITY_STYLE = { Urgent: 'text-rose-700', High: 'text-amber-700', Normal: 'text-slate-500', Low: 'text-slate-400' };
const when = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

/** Platform admin inbox: every ticket from every company. Reply, change status / priority. */
export default function SupportTicketsSection({ apiBase, getHeaders, showToast }) {
  const [list, setList] = useState([]);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);
  const [t, setT] = useState(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const req = (path, opts = {}) => fetch(`${apiBase}/support/tickets${path}`, { ...opts, headers: { ...getHeaders(), 'Content-Type': 'application/json' } }).then((r) => r.json());

  const load = async () => {
    setLoading(true);
    try {
      const res = await req(`?status=${encodeURIComponent(filter)}`);
      if (res.success) { setList(res.data || []); setCounts(res.meta?.counts || {}); } else showToast(res.message || 'Could not load tickets', 'error');
    } catch (err) { showToast('Could not load tickets: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const open = async (id) => {
    setOpenId(id);
    setT(null);
    const res = await req(`/${id}`);
    if (res.success) setT(res.data); else showToast(res.message || 'Could not open ticket', 'error');
  };

  const send = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    const res = await req(`/${openId}/messages`, { method: 'POST', body: JSON.stringify({ body: reply.trim() }) });
    setBusy(false);
    if (res.success) { setT(res.data); setReply(''); showToast('Reply sent — the user gets a notification'); } else showToast(res.message || 'Could not send', 'error');
  };

  const update = async (patch) => {
    const res = await req(`/${openId}`, { method: 'PATCH', body: JSON.stringify(patch) });
    if (res.success) { setT(res.data); showToast('Ticket updated'); } else showToast(res.message || 'Could not update', 'error');
  };

  const shown = list.filter((x) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [x.code, x.subject, x.company_name, x.created_by_name, x.created_by_email].some((v) => String(v || '').toLowerCase().includes(q));
  });

  if (openId) {
    return (
      <div className="space-y-4 max-w-4xl">
        <button type="button" onClick={() => { setOpenId(null); load(); }} className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"><ChevronLeft size={14} /> All tickets</button>
        {!t ? <div className="text-xs text-slate-500">Loading…</div> : (
          <>
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-card space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-500">{t.code}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLE[t.status] || ''}`}>{t.status}</span>
                <span className="text-[10px] font-bold text-slate-500">{t.category}</span>
                {t.source === 'chatbot' && <span className="text-[10px] font-bold text-indigo-600">from AI chat</span>}
              </div>
              <h2 className="text-lg font-black text-slate-900">{t.subject}</h2>
              <p className="text-xs text-slate-500">{t.created_by_name} ({t.created_by_role}) · {t.created_by_email} · <b>{t.company_name}</b> · {when(t.created_at)}</p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-[11px] font-bold text-slate-600">Status
                  <select value={t.status} onChange={(e) => update({ status: e.target.value })} className="ml-1.5 px-2 py-1 rounded-lg border border-slate-200 text-xs">
                    {STATUSES.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </label>
                <label className="text-[11px] font-bold text-slate-600">Priority
                  <select value={t.priority} onChange={(e) => update({ priority: e.target.value })} className="ml-1.5 px-2 py-1 rounded-lg border border-slate-200 text-xs">
                    {PRIORITIES.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              {t.messages.map((m) => (
                <div key={m.id} className={`rounded-2xl border p-3.5 text-xs ${m.author_role === 'support' ? 'bg-emerald-50 border-emerald-200 ml-8' : m.is_chat_transcript ? 'bg-slate-50 border-dashed border-slate-300' : 'bg-white border-slate-200 mr-8'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-slate-800">{m.is_chat_transcript ? '🤖 AI chat history (what the user already tried)' : m.author_name}</span>
                    <span className="text-[10px] text-slate-400">{when(m.at)}</span>
                  </div>
                  <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">{m.body}</div>
                </div>
              ))}
            </div>
            <form onSubmit={send} className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-card space-y-2">
              <textarea value={reply} onChange={(e) => setReply(e.target.value.slice(0, 5000))} rows={4} placeholder="Write your reply to the user…" className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
              <div className="flex flex-wrap items-center gap-2">
                <button type="submit" disabled={busy || !reply.trim()} className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"><Send size={13} /> {busy ? 'Sending…' : 'Send reply'}</button>
                <button type="button" onClick={() => update({ status: 'Waiting on you' })} className="px-3 py-2 rounded-full bg-slate-100 text-xs font-bold cursor-pointer">Mark “Waiting on user”</button>
                <button type="button" onClick={() => update({ status: 'Resolved' })} className="px-3 py-2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold cursor-pointer">Mark resolved</button>
              </div>
            </form>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2"><LifeBuoy size={20} className="text-emerald-600" /> Support Tickets</h3>
            <p className="text-xs text-slate-500 mt-0.5">{counts.open || 0} open · {counts.unread || 0} unread · {counts.total || 0} total</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ticket, company, user…" className="px-3 py-2 text-xs rounded-2xl border border-slate-200 bg-slate-50 w-56" />
            {[['active', 'Open'], ['Resolved', 'Resolved'], ['Closed', 'Closed'], ['all', 'All']].map(([k, label]) => (
              <button key={k} type="button" onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer ${filter === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{label}</button>
            ))}
            <button type="button" onClick={load} className="p-2 rounded-full bg-slate-100 cursor-pointer" title="Refresh"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button>
          </div>
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Company / User</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4 text-right">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {shown.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">{loading ? 'Loading…' : 'No tickets.'}</td></tr>}
              {shown.map((x) => (
                <tr key={x.id} onClick={() => open(x.id)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {x.unread && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="New message from user" />}
                      <span className="font-mono text-[10px] text-slate-400">{x.code}</span>
                    </div>
                    <div className={`${x.unread ? 'font-black' : 'font-bold'} text-slate-900`}>{x.subject}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-md">{x.last_reply_by === 'support' ? 'You: ' : ''}{x.last_message}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-800">{x.company_name || '—'}</div>
                    <div className="text-[11px] text-slate-500">{x.created_by_name} · {x.created_by_role}</div>
                  </td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLE[x.status] || ''}`}>{x.status}</span></td>
                  <td className={`py-3 px-4 font-bold ${PRIORITY_STYLE[x.priority] || ''}`}>{x.priority}</td>
                  <td className="py-3 px-4 text-right text-[11px] text-slate-400">{when(x.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
