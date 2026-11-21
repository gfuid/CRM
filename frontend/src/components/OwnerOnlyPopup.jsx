import React, { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';

/**
 * "Only the owner can do this" — one popup for the whole CRM, so staff are never left wondering why
 * something did not work. Open it from anywhere with ownerOnly({ title, message, hint }).
 * The API layer also opens it when the server refuses a change as owner-only.
 */
export const ownerOnly = (detail = {}) => {
  window.dispatchEvent(new CustomEvent('crm_owner_only', { detail: typeof detail === 'string' ? { message: detail } : detail }));
};

export const OWNER_ONLY_HINT = 'Ask your company owner to do it, or to switch on "Edit full lead details" for you (Team → your name → Permissions).';

export default function OwnerOnlyPopup() {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    const open = (e) => setInfo({ title: 'Only the company owner can do this', hint: OWNER_ONLY_HINT, ...(e.detail || {}) });
    window.addEventListener('crm_owner_only', open);
    return () => window.removeEventListener('crm_owner_only', open);
  }, []);
  useEffect(() => {
    if (!info) return undefined;
    const esc = (e) => { if (e.key === 'Escape') setInfo(null); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [info]);
  if (!info) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/40" onClick={() => setInfo(null)} data-owner-only-popup>
      <div role="alertdialog" aria-modal="true" aria-labelledby="owner-only-title" className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 shadow-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 flex items-center justify-center"><Lock size={18} /></span>
          <div className="min-w-0 flex-1">
            <h3 id="owner-only-title" className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{info.title}</h3>
            {info.message && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{info.message}</p>}
          </div>
          <button type="button" className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => setInfo(null)} aria-label="Close"><X size={16} /></button>
        </div>
        {info.canDo && <div className="text-[11px] rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 px-3 py-2"><b>You can:</b> {info.canDo}</div>}
        {info.hint && <div className="text-[11px] rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2">{info.hint}</div>}
        <div className="flex justify-end"><button type="button" autoFocus className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold cursor-pointer" onClick={() => setInfo(null)}>OK, understood</button></div>
      </div>
    </div>
  );
}
