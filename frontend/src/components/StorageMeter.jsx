import React, { useEffect, useState } from 'react';
import { HardDrive, Users, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import Modal from './Modal';

const fmtSize = (bytes) => {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${Math.max(0.1, n / 1024).toFixed(1)} KB`;
};
const toneOf = (pct) => (pct >= 95 ? 'rose' : pct >= 80 ? 'amber' : 'emerald');
const BAR = { rose: 'bg-rose-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500' };

/**
 * "Storage: 12.4 / 50 MB" for the company owner, so they know before the limit is reached.
 * Turns amber at 80% and red at 95%. Click it to see how much each team member is using.
 */
export default function StorageMeter({ compact = false }) {
  const [usage, setUsage] = useState(null);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null); // usage + members
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await api.getMyUsage();
        if (alive && res?.data) setUsage(res.data);
      } catch {
        // not critical: the meter simply stays hidden
      }
    };
    load();
    const t = setInterval(load, 10 * 60 * 1000);
    window.addEventListener('crm_leads_updated', load);
    return () => { alive = false; clearInterval(t); window.removeEventListener('crm_leads_updated', load); };
  }, []);

  const openBreakdown = async () => {
    setOpen(true);
    setDetail(null);
    setDetailError('');
    try {
      const res = await api.getMyUsage(true);
      setDetail(res?.data || null);
      if (res?.data) setUsage(res.data);
    } catch (err) {
      setDetailError(err?.message || 'The storage details could not be loaded. Please try again.');
    }
  };

  if (!usage) return null;
  const pct = Number(usage.percent) || 0;
  const tone = toneOf(pct);
  const text = { rose: 'text-rose-700 dark:text-rose-300', amber: 'text-amber-700 dark:text-amber-300', emerald: 'text-slate-700 dark:text-slate-300' }[tone];
  const used = usage.used_mb < 0.1 ? usage.used_mb.toFixed(2) : usage.used_mb.toFixed(1);
  const members = detail?.members || [];
  const biggest = Math.max(1, ...members.map((m) => m.used_bytes));

  return (
    <>
      <button
        type="button"
        onClick={openBreakdown}
        className={`w-full text-left rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors cursor-pointer ${compact ? 'p-2' : 'p-2.5'} space-y-1.5`}
        title="Storage used by your whole company. Click to see each team member."
      >
        <div className={`flex items-center justify-between gap-2 text-[11px] font-bold ${text}`}>
          <span className="flex items-center gap-1.5 min-w-0">
            <HardDrive size={13} className="shrink-0" />
            <span className="truncate">Storage</span>
          </span>
          <span className="shrink-0">{used} / {usage.limit_mb} MB</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div className={`h-1.5 rounded-full ${BAR[tone]}`} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
        </div>
        {pct >= 80 && (
          <p className={`text-[10px] font-semibold leading-snug ${text}`}>
            {pct >= 100
              ? 'Storage is full. New entries cannot be saved. Ask the platform admin to increase your limit.'
              : `${pct}% used. Ask the platform admin to increase your limit before it is full.`}
          </p>
        )}
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1"><Users size={11} /> See usage by team member</span>
          <ChevronRight size={12} />
        </div>
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Storage by team member"
        subtitle="Who is using how much of your company storage"
        maxWidth="max-w-2xl"
      >
        {detailError && (
          <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{detailError}</div>
        )}
        {!detail && !detailError && <div className="text-xs text-slate-500 py-6 text-center">Loading…</div>}

        {detail && (
          <div className="space-y-4">
            {/* Company total */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Whole company</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {detail.used_mb} MB of {detail.limit_mb} MB <span className="text-slate-400 font-semibold">({detail.percent}%)</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className={`h-2 rounded-full ${BAR[toneOf(detail.percent)]}`} style={{ width: `${Math.max(2, Math.min(100, detail.percent))}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                {detail.percent >= 80
                  ? 'You are close to the limit. Ask the platform admin to increase it, or delete old records.'
                  : 'When the limit is reached, new leads, remarks and tasks cannot be saved for anyone in the company.'}
              </p>
            </div>

            {/* One row per member, biggest first */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {members.map((m) => (
                <div key={m.id} className="p-3 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{m.name || 'Team member'}</span>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${m.role === 'Owner' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {m.role === 'Owner' ? 'Owner' : 'Staff'}
                      </span>
                      {m.is_active === false && <span className="shrink-0 text-[9px] font-bold uppercase text-rose-600">Inactive</span>}
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 shrink-0">
                      {fmtSize(m.used_bytes)} <span className="text-slate-400 font-semibold">· {m.share_percent}% of used</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.max(1, (m.used_bytes / biggest) * 100)}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500 font-medium">
                    <span>{m.leads} leads</span>
                    <span>{m.remarks} remarks</span>
                    <span>{m.tasks} tasks</span>
                    <span>{m.follow_ups} follow-ups</span>
                    <span>{m.my_days} planner items</span>
                    <span>{m.limit_percent}% of the limit</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 leading-snug">
              Sizes are an estimate from each person's records (leads they added, remarks, tasks, follow-ups, planner items). Shared company records count under the owner.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
