import React, { useMemo } from 'react';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { HELP_GUIDES_PDF } from '../../data/helpGuidesPdf';

/** Step-by-step PDF guides (open in a new tab or download). Filtered by the Help search box. */
export default function HelpGuidesPdf({ query = '', isOwner = false }) {
  const list = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return HELP_GUIDES_PDF
      .filter((g) => isOwner || g.audience !== 'owners')
      .filter((g) => {
        if (!words.length) return true;
        const hay = [g.title, g.description, ...g.keywords].join(' ').toLowerCase();
        return words.every((w) => hay.includes(w));
      });
  }, [query, isOwner]);
  if (!list.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3" data-help-guides>
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileText size={17} className="text-rose-600" /> Step-by-step setup guides (PDF)</h2>
        <p className="text-xs text-slate-500 mt-0.5">Every click on Meta, ElevenLabs, Vobiz and your email provider, with pictures of the CRM screens. Print them or keep them open while you set up.</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {list.map((g) => (
          <div key={g.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex flex-col gap-2" data-help-guide={g.id}>
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-9 h-11 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 text-[9px] font-bold flex items-end justify-center pb-1">PDF</span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug">{g.title}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{g.pages} pages</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed flex-1">{g.description}</p>
            <div className="flex gap-2">
              <a href={g.url} target="_blank" rel="noopener noreferrer" className="flex-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1"><ExternalLink size={12} /> Open</a>
              <a href={g.url} download={g.file} className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1" aria-label={`Download ${g.title}`}><Download size={12} /> Download</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
