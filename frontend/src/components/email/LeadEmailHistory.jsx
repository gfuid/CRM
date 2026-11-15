import React, { useEffect, useState } from 'react';
import { Mail, MailOpen, MousePointerClick, AlertCircle, UserX } from 'lucide-react';
import { api } from '../../services/api';

const fmt = (s) => (s ? new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

/** Campaign mails this lead received and whether they were opened or clicked. Shows nothing when there are none. */
export default function LeadEmailHistory({ leadId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    if (!leadId) return undefined;
    api.getLeadEmailHistory(leadId)
      .then((res) => alive && setData(res?.data || null))
      .catch(() => alive && setData(null)); // staff / feature off: nothing to show
    return () => { alive = false; };
  }, [leadId]);

  if (!data || (data.mails.length === 0 && !data.unsubscribed)) return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3" data-lead-email-history>
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
        <Mail size={13} className="text-emerald-600" /> Marketing emails
        {data.unsubscribed && (
          <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold"><UserX size={10} /> Unsubscribed</span>
        )}
      </div>
      <ul className="mt-2 space-y-1.5">
        {data.mails.map((m, i) => (
          <li key={`${m.campaign_id}-${m.email}-${i}`} className="text-[11px] flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[220px]">{m.campaign}</span>
            <span className="text-slate-400">{fmt(m.sent_at)}</span>
            {m.status === 'failed' ? (
              <span className="inline-flex items-center gap-0.5 text-rose-600" title={m.error}><AlertCircle size={11} /> Failed</span>
            ) : (
              <>
                <span className={`inline-flex items-center gap-0.5 ${m.opened_at ? 'text-blue-600' : 'text-slate-400'}`}>
                  <MailOpen size={11} /> {m.opened_at ? `Opened${m.opens > 1 ? ` ${m.opens}×` : ''}` : 'Not opened yet'}
                </span>
                {m.clicked_at && (
                  <span className="inline-flex items-center gap-0.5 text-violet-600"><MousePointerClick size={11} /> Clicked{m.clicks > 1 ? ` ${m.clicks}×` : ''}</span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
