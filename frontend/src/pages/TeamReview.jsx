import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, AlertTriangle, CheckCircle2, Clock, MessageSquare, RefreshCw, ChevronLeft } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DailyReport from '../components/DailyReport';

const RANGES = [
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
];

const isoDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - (Number(days) - 1));
  return d.toISOString().split('T')[0];
};

const pct = (v) => (v === null || v === undefined ? '—' : `${v}%`);

function Stat({ label, value, tone = 'slate', hint }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-800 border-slate-200',
    green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    red: 'bg-rose-50 text-rose-800 border-rose-200',
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tones[tone]}`} title={hint}>
      <div className="text-[10px] font-black uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-xl font-black mt-0.5">{value}</div>
    </div>
  );
}

function ResultBadge({ result }) {
  const map = {
    completed_on_time: ['On time', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
    completed_late: ['Done late', 'bg-amber-50 text-amber-700 border-amber-200'],
    completed_time_unknown: ['Done', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
    overdue: ['Overdue', 'bg-rose-50 text-rose-700 border-rose-200'],
    open: ['Open', 'bg-slate-50 text-slate-700 border-slate-200'],
    cancelled: ['Cancelled', 'bg-slate-100 text-slate-500 border-slate-200'],
    Completed: ['Done', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
    Missed: ['Missed', 'bg-rose-50 text-rose-700 border-rose-200'],
    Rescheduled: ['Rescheduled', 'bg-amber-50 text-amber-700 border-amber-200'],
    Scheduled: ['Upcoming', 'bg-slate-50 text-slate-700 border-slate-200'],
    Pending: ['Upcoming', 'bg-slate-50 text-slate-700 border-slate-200'],
    Cancelled: ['Cancelled', 'bg-slate-100 text-slate-500 border-slate-200'],
  };
  const [label, cls] = map[result] || [result, 'bg-slate-50 text-slate-700 border-slate-200'];
  return <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black whitespace-nowrap ${cls}`}>{label}</span>;
}

function Section({ title, icon: Icon, count, children, empty }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-slate-500" />
        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">{title}</h3>
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{count}</span>
      </div>
      {count === 0 ? <p className="text-xs text-slate-500">{empty}</p> : children}
    </div>
  );
}

function PersonReport({ report }) {
  const s = report.summary;
  const d = report.details;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        <Stat label="Tasks on time" value={s.tasks_completed_on_time} tone="green" />
        <Stat label="Tasks late" value={s.tasks_completed_late} tone={s.tasks_completed_late ? 'amber' : 'slate'} />
        <Stat label="Tasks overdue" value={s.tasks_overdue_open} tone={s.tasks_overdue_open ? 'red' : 'slate'} />
        <Stat label="Follow-ups done" value={s.followups_completed} tone="green" />
        <Stat label="Follow-ups missed" value={s.followups_missed} tone={s.followups_missed ? 'red' : 'slate'} />
        <Stat label="Times rescheduled" value={s.followups_rescheduled_times} tone={s.followups_rescheduled_times ? 'amber' : 'slate'} />
        <Stat label="Leads overdue" value={s.leads_overdue_followup} tone={s.leads_overdue_followup ? 'red' : 'slate'} />
        <Stat label="Leads created" value={s.leads_created} />
        <Stat label="Remarks written" value={s.remarks_written} />
        <Stat label="Remarks w/o discussion" value={s.remarks_without_discussion} tone={s.remarks_without_discussion ? 'amber' : 'slate'} hint="Entries that only moved a date, with nothing written about what was discussed" />
        <Stat label="Task completion" value={pct(s.task_completion_rate)} />
        <Stat label="Follow-up completion" value={pct(s.followup_completion_rate)} />
      </div>

      <Section title="Tasks" icon={ClipboardCheck} count={d.tasks.length} empty="No tasks in this period.">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase text-slate-500">
                <th className="py-1.5 pr-3">Task</th><th className="py-1.5 pr-3">Due</th><th className="py-1.5 pr-3">Result</th><th className="py-1.5 pr-3">Completed</th><th className="py-1.5">Notes</th>
              </tr>
            </thead>
            <tbody>
              {d.tasks.map((t) => (
                <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-3 font-bold text-slate-800 dark:text-slate-200">{t.title}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{t.due_date || '—'}</td>
                  <td className="py-1.5 pr-3"><ResultBadge result={t.result} /></td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{t.completed_at ? new Date(t.completed_at).toLocaleString() : '—'}</td>
                  <td className="py-1.5 text-slate-600">{t.completion_notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Follow-ups" icon={Clock} count={d.followups.length} empty="No follow-ups in this period.">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase text-slate-500">
                <th className="py-1.5 pr-3">Client</th><th className="py-1.5 pr-3">Date</th><th className="py-1.5 pr-3">Status</th><th className="py-1.5 pr-3">Rescheduled</th><th className="py-1.5 pr-3">What was discussed</th><th className="py-1.5">Next step</th>
              </tr>
            </thead>
            <tbody>
              {d.followups.map((f) => (
                <tr key={f.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-3 font-bold text-slate-800 dark:text-slate-200">{f.client_name}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{f.scheduled_date}</td>
                  <td className="py-1.5 pr-3"><ResultBadge result={f.status} /></td>
                  <td className="py-1.5 pr-3">{f.rescheduled_times ? `${f.rescheduled_times}×` : '—'}</td>
                  <td className="py-1.5 pr-3 text-slate-700">{f.outcome || <span className="text-rose-600 font-bold">Not written</span>}</td>
                  <td className="py-1.5 text-slate-600">{f.next_action || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Leads with an overdue follow-up" icon={AlertTriangle} count={d.overdue_leads.length} empty="No overdue leads.">
        <ul className="space-y-1.5">
          {d.overdue_leads.map((l) => (
            <li key={l.id} className="text-xs flex flex-wrap gap-2 items-center">
              <span className="font-bold text-slate-800 dark:text-slate-200">{l.name}</span>
              <span className="text-rose-600 font-bold">due {l.follow_up_date}</span>
              <span className="text-slate-500">{l.stage}</span>
              {l.next_action && <span className="text-slate-600">· {l.next_action}</span>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Remarks (what was discussed)" icon={MessageSquare} count={d.recent_remarks.length} empty="No remarks written in this period.">
        <ul className="space-y-2">
          {d.recent_remarks.map((r, i) => (
            <li key={`${r.lead_id}-${i}`} className="text-xs border-l-2 border-slate-200 pl-3">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="font-bold text-slate-800 dark:text-slate-200">{r.lead_name}</span>
                <span className="text-slate-500">{new Date(r.date).toLocaleString()}</span>
              </div>
              <div className="text-slate-700 dark:text-slate-300 mt-0.5">
                {r.discussed ? r.discussed : <span className="text-amber-600 font-bold">Nothing written about the discussion</span>}
              </div>
              {r.next_action && <div className="text-slate-500 mt-0.5">Next: {r.next_action}{r.next_date ? ` (${r.next_date})` : ''}</div>}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

export default function TeamReview() {
  const { isOwner, profile } = useAuth();
  const [range, setRange] = useState('30');
  const [team, setTeam] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('daily');

  const params = useMemo(() => ({ from: isoDaysAgo(range), to: new Date().toISOString().split('T')[0] }), [range]);

  const loadTeam = async () => {
    if (!isOwner) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getTeamPerformance(params);
      setTeam(res?.data?.members || []);
    } catch (err) {
      setError(err?.message || 'Team review could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const loadPerson = async (userId) => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getStaffPerformance(userId, params);
      setReport(res?.data || null);
    } catch (err) {
      setError(err?.message || 'Report could not be loaded.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      loadTeam();
      if (selectedId) loadPerson(selectedId);
    } else if (profile?.id) {
      loadPerson(profile.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, profile?.id, params]);

  const openPerson = (id) => {
    setSelectedId(id);
    loadPerson(id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {isOwner ? 'Team Review' : 'My Performance'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {isOwner
              ? 'Which tasks and follow-ups each person finished, missed or pushed, and what they wrote. Worked out by the server from saved records.'
              : 'Your tasks, follow-ups and remarks. Your company owner sees the same numbers.'}
          </p>
        </div>
        <div className={`flex items-center gap-2 ${isOwner && view === 'daily' ? 'hidden' : ''}`}>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
          >
            {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <button
            type="button"
            onClick={() => (isOwner ? (loadTeam(), selectedId && loadPerson(selectedId)) : loadPerson(profile?.id))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {isOwner && (
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
          {[['daily', 'Daily Report'], ['range', 'Performance']].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setView(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${view === k ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {isOwner && view === 'daily' && <DailyReport />}

      {error && view !== 'daily' && <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}

      {isOwner && view === 'range' && !selectedId && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase text-slate-500 bg-slate-50 dark:bg-slate-800/60">
                <th className="px-4 py-2.5">Person</th>
                <th className="px-3 py-2.5">Tasks on time</th>
                <th className="px-3 py-2.5">Late</th>
                <th className="px-3 py-2.5">Overdue</th>
                <th className="px-3 py-2.5">Follow-ups done</th>
                <th className="px-3 py-2.5">Missed</th>
                <th className="px-3 py-2.5">Rescheduled</th>
                <th className="px-3 py-2.5">Leads overdue</th>
                <th className="px-3 py-2.5">Remarks</th>
                <th className="px-3 py-2.5">Leads created</th>
              </tr>
            </thead>
            <tbody>
              {team.length === 0 && !loading && (
                <tr><td colSpan={10} className="px-4 py-6 text-center text-slate-500">No team members yet.</td></tr>
              )}
              {team.map((m) => {
                const s = m.summary;
                return (
                  <tr
                    key={m.user.id}
                    onClick={() => openPerson(m.user.id)}
                    className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-black text-slate-900 dark:text-slate-100">{m.user.name}{m.user.id === profile?.id ? ' (you)' : ''}</div>
                      <div className="text-[10px] text-slate-500">{m.user.email}{m.user.is_active ? '' : ' · inactive'}</div>
                    </td>
                    <td className="px-3 py-2.5 font-bold text-emerald-700">{s.tasks_completed_on_time}</td>
                    <td className={`px-3 py-2.5 font-bold ${s.tasks_completed_late ? 'text-amber-700' : 'text-slate-500'}`}>{s.tasks_completed_late}</td>
                    <td className={`px-3 py-2.5 font-bold ${s.tasks_overdue_open ? 'text-rose-700' : 'text-slate-500'}`}>{s.tasks_overdue_open}</td>
                    <td className="px-3 py-2.5 font-bold text-emerald-700">{s.followups_completed}</td>
                    <td className={`px-3 py-2.5 font-bold ${s.followups_missed ? 'text-rose-700' : 'text-slate-500'}`}>{s.followups_missed}</td>
                    <td className={`px-3 py-2.5 font-bold ${s.followups_rescheduled_times ? 'text-amber-700' : 'text-slate-500'}`}>{s.followups_rescheduled_times}</td>
                    <td className={`px-3 py-2.5 font-bold ${s.leads_overdue_followup ? 'text-rose-700' : 'text-slate-500'}`}>{s.leads_overdue_followup}</td>
                    <td className="px-3 py-2.5 font-bold">{s.remarks_written}</td>
                    <td className="px-3 py-2.5 font-bold">{s.leads_created}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isOwner && view === 'range' && selectedId && (
        <button
          type="button"
          onClick={() => { setSelectedId(null); setReport(null); }}
          className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ChevronLeft size={14} /> Back to team
        </button>
      )}

      {report && (isOwner ? view === 'range' && selectedId : true) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">{report.user.name}</h2>
            <span className="text-xs text-slate-500">{report.range.from} → {report.range.to}</span>
          </div>
          <PersonReport report={report} />
        </div>
      )}
    </div>
  );
}
