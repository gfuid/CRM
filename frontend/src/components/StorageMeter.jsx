import React, { useEffect, useState } from 'react';
import { HardDrive } from 'lucide-react';
import { api } from '../services/api';

/**
 * "Storage: 12.4 / 50 MB" for the company owner, so they know before the limit is reached.
 * Turns amber at 80% and red at 95%.
 */
export default function StorageMeter({ compact = false }) {
  const [usage, setUsage] = useState(null);

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

  if (!usage) return null;
  const pct = Number(usage.percent) || 0;
  const tone = pct >= 95 ? 'rose' : pct >= 80 ? 'amber' : 'emerald';
  const bar = { rose: 'bg-rose-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500' }[tone];
  const text = { rose: 'text-rose-700 dark:text-rose-300', amber: 'text-amber-700 dark:text-amber-300', emerald: 'text-slate-700 dark:text-slate-300' }[tone];
  const used = usage.used_mb < 0.1 ? usage.used_mb.toFixed(2) : usage.used_mb.toFixed(1);

  return (
    <div
      className={`rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 ${compact ? 'p-2' : 'p-2.5'} space-y-1.5`}
      title="Storage used by your whole company (you + your staff)"
    >
      <div className={`flex items-center justify-between text-[11px] font-bold ${text}`}>
        <span className="flex items-center gap-1.5">
          <HardDrive size={13} />
          <span>Storage</span>
        </span>
        <span>{used} / {usage.limit_mb} MB</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
      </div>
      {pct >= 80 && (
        <p className={`text-[10px] font-semibold leading-snug ${text}`}>
          {pct >= 100
            ? 'Storage is full. New entries cannot be saved. Ask the platform admin to increase your limit.'
            : `${pct}% used. Ask the platform admin to increase your limit before it is full.`}
        </p>
      )}
    </div>
  );
}
