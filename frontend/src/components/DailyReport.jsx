import React, { useEffect, useState } from 'react';
import { RefreshCw, PhoneCall, MessageSquare, CheckCircle2, AlertTriangle, UserX, ClipboardList } from 'lucide-react';
import { api } from '../services/api';

const localDay = (offset = 0) => {
  const d = new Date(Date.now() + offset * 86400000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const Stat = ({ icon: Icon, label, value, tone = 'slate' }) => {
  const tones = {
    slate: 'text-slate-900 dark:text-slate-100',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    rose: 'text-rose-700 dark:text-rose-400',
    amber: 'text-amber-700 dark:text-amber-400',
  };
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
        <Icon size={12} /> {label}
      </div>
      <div className={`text-2xl font-black mt-1 ${tones[tone]}`}>{value}</div>
    </div>
  );
};

/**
 * Owner's daily team report: who called, who wrote remarks, which follow-ups were missed.
 * The same report arrives every evening as a notification (and email when the mail server is set up).
 */
export default function DailyReport() {
  const [date, setDate] = useState(localDay(0));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);

  const load = async (d = date) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getDailyReport(d);
      setReport(res?.data || null);
    } catch (err) {
      setError(err?.message || 'Report could not be loaded.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(date); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [date]);

  const t = report?.totals;
  const pretty = new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">Daily Report · {pretty}</h2>
          <p className="text-[11px] text-slate-500 font-medium">Sent to you every evening at 7 PM. Numbers come from saved remarks, calls, follow-ups and tasks.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setDate(localDay(-1))} className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer ${date === localDay(-1) ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>Yesterday</button>
          <button type="button" onClick={() => setDate(localDay(0))} className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer ${date === localDay(0) ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>Today</button>
          <input
            type="date"
            value={date}
            max={localDay(0)}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold"
          />
          <button type="button" onClick={() => load(date)} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}

      {t && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <Stat icon={PhoneCall} label="Calls" value={t.calls} />
            <Stat icon={MessageSquare} label="Remarks" value={t.remarks_written} />
            <Stat icon={CheckCircle2} label="Follow-ups done" value={t.followups_done} tone="emerald" />
            <Stat icon={AlertTriangle} label="Follow-ups missed" value={t.followups_missed} tone={t.followups_missed ? 'rose' : 'slate'} />
            <Stat icon={ClipboardList} label="Tasks done" value={t.tasks_completed} tone="emerald" />
            <Stat icon={UserX} label={`No contact ${report.no_contact_days}d+`} value={t.no_contact_7d} tone={t.no_contact_7d ? 'rose' : 'slate'} />
          </div>

          {report.silent_members.length > 0 && (
            <div className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              ⚠️ No work recorded on this day (no call, remark or activity): {report.silent_members.join(', ')}
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase text-slate-500 bg-slate-50 dark:bg-slate-800/60">
                  <th className="px-4 py-2.5">Person</th>
                  <th className="px-3 py-2.5">Calls</th>
                  <th className="px-3 py-2.5">Emails</th>
                  <th className="px-3 py-2.5">Remarks</th>
                  <th className="px-3 py-2.5">Leads added</th>
                  <th className="px-3 py-2.5">F/U done</th>
                  <th className="px-3 py-2.5">F/U missed</th>
                  <th className="px-3 py-2.5">Tasks done</th>
                  <th className="px-3 py-2.5">Tasks overdue</th>
                  <th className="px-3 py-2.5">No contact {report.no_contact_days}d+</th>
                </tr>
              </thead>
              <tbody>
                {report.members.map((m) => (
                  <React.Fragment key={m.id}>
                    <tr
                      onClick={() => setOpen(open === m.id ? null : m.id)}
                      className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-black text-slate-900 dark:text-slate-100">{m.name}</div>
                        <div className="text-[10px] text-slate-500">{m.role}{m.is_active ? '' : ' · inactive'} · tap for details</div>
                      </td>
                      <td className="px-3 py-2.5 font-bold" title={`${m.calls_outreach} entered in Outreach + ${m.calls_logged_on_leads} logged on leads`}>{m.calls}</td>
                      <td className="px-3 py-2.5 font-bold">{m.emails}</td>
                      <td className="px-3 py-2.5 font-bold">{m.remarks_written}</td>
                      <td className="px-3 py-2.5 font-bold">{m.leads_created}</td>
                      <td className="px-3 py-2.5 font-bold text-emerald-700">{m.followups_done}</td>
                      <td className={`px-3 py-2.5 font-bold ${m.followups_missed ? 'text-rose-700' : 'text-slate-500'}`}>{m.followups_missed}</td>
                      <td className="px-3 py-2.5 font-bold text-emerald-700">{m.tasks_completed}</td>
                      <td className={`px-3 py-2.5 font-bold ${m.tasks_overdue ? 'text-rose-700' : 'text-slate-500'}`}>{m.tasks_overdue}</td>
                      <td className={`px-3 py-2.5 font-bold ${m.no_contact_7d ? 'text-rose-700' : 'text-slate-500'}`}>{m.no_contact_7d}</td>
                    </tr>
                    {open === m.id && (
                      <tr className="bg-slate-50/70 dark:bg-slate-800/30">
                        <td colSpan={10} className="px-4 py-3">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-[11px]">
                            <div>
                              <div className="font-black text-slate-700 dark:text-slate-200 mb-1">What was discussed ({m.remarks_written})</div>
                              {m.remarks.length === 0 ? <div className="text-slate-400">No remark written.</div> : (
                                <ul className="space-y-1">
                                  {m.remarks.map((r, i) => (
                                    <li key={i}><b>{r.lead}:</b> {r.discussed || '—'}{r.next ? <span className="text-emerald-700"> → {r.next}</span> : null}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div>
                              <div className="font-black text-rose-700 mb-1">Missed follow-ups ({m.followups_missed})</div>
                              {m.missed_followups.length === 0 ? <div className="text-slate-400">None. 👍</div> : (
                                <ul className="space-y-1">
                                  {m.missed_followups.map((x, i) => <li key={i}><b>{x.buyer}</b> · due {x.due}</li>)}
                                </ul>
                              )}
                            </div>
                            <div>
                              <div className="font-black text-rose-700 mb-1">No contact for {report.no_contact_days}+ days ({m.no_contact_7d})</div>
                              {m.no_contact_leads.length === 0 ? <div className="text-slate-400">None. 👍</div> : (
                                <ul className="space-y-1">
                                  {m.no_contact_leads.map((x, i) => <li key={i}><b>{x.buyer}</b> · {x.days} days</li>)}
                                </ul>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
