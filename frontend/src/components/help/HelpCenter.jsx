import React, { useMemo, useState } from 'react';
import { Search, PlayCircle, Compass, ChevronDown, ArrowRight, Wrench, ListChecks, Info, Bot, LifeBuoy } from 'lucide-react';
import { HELP_SECTIONS, HELP_VIDEO_URL, HELP_VIDEO_POSTER } from '../../data/helpGuide';
import { startTour } from './OnboardingTour';

const go = (tab) => window.dispatchEvent(new CustomEvent('crm_navigate', { detail: { tab } }));

const matches = (sec, q) => {
  if (!q) return true;
  const hay = [sec.title, sec.summary, ...sec.how, ...sec.steps, ...sec.issues.flatMap((x) => [x.q, x.a])].join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
};

/** Searchable product guide: video, tour replay, and for every section — what it is, how it works, steps, and fixes. */
export default function HelpCenter({ isOwner, canSee = () => true, onAskAI, onNewTicket }) {
  const role = isOwner ? 'owner' : 'staff';
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState('getting-started');
  const [showVideo, setShowVideo] = useState(false);

  const sections = useMemo(
    () => HELP_SECTIONS.filter((s) => s.roles.includes(role) && (!s.tab || canSee(s.tab)) && matches(s, q.trim())),
    [role, canSee, q]
  );
  const searching = q.trim().length > 0;

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Video + tour */}
      <div className="grid md:grid-cols-[1.4fr_1fr] gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {showVideo ? (
            <video src={HELP_VIDEO_URL} poster={HELP_VIDEO_POSTER} controls autoPlay playsInline className="w-full aspect-video bg-slate-900" />
          ) : (
            <button type="button" onClick={() => setShowVideo(true)} className="group relative block w-full aspect-video bg-slate-900 cursor-pointer" aria-label="Play the CRM walkthrough video">
              <img src={HELP_VIDEO_POSTER} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
                <PlayCircle size={56} strokeWidth={1.5} className="drop-shadow-lg group-hover:scale-105 transition-transform" />
                <span className="text-sm font-semibold drop-shadow">Watch: how the CRM works</span>
              </span>
            </button>
          )}
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">New here?</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">Watch the short video, or take the 1-minute guided tour — it points at each section in the menu and explains what it does.</p>
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={startTour} className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
              <Compass size={14} /> Replay tour
            </button>
            <button type="button" onClick={() => setShowVideo(true)} className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              <PlayCircle size={14} /> Play video
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the guide — e.g. “staff limit”, “follow-up overdue”, “import CSV”"
          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
      </div>

      {/* Sections */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        {sections.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-500">Nothing found for “{q}”. Try other words, or ask the AI assistant.</div>
        )}
        {sections.map((s) => {
          const open = searching || openId === s.id;
          return (
            <div key={s.id} data-help-section={s.id}>
              <button type="button" onClick={() => setOpenId(open && !searching ? null : s.id)} className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer" aria-expanded={open}>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{s.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.summary}</div>
                </div>
                <ChevronDown size={16} className={`shrink-0 mt-0.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="px-4 pb-5 grid gap-4 md:grid-cols-2 animate-fade-in">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2"><Info size={12} /> How it works</div>
                      <ul className="space-y-1.5">
                        {s.how.map((t) => <li key={t} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-3 relative before:absolute before:left-0 before:top-[7px] before:w-1 before:h-1 before:rounded-full before:bg-slate-300">{t}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2"><ListChecks size={12} /> Step by step</div>
                      <ol className="space-y-1.5">
                        {s.steps.map((t, n) => (
                          <li key={t} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex gap-2">
                            <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center mt-px">{n + 1}</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    {s.tab && (
                      <button type="button" onClick={() => go(s.tab)} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer">
                        Open {s.title.replace(/ \(.*\)$/, '').split(' & ')[0]} <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2"><Wrench size={12} /> If something looks wrong</div>
                    <div className="space-y-2">
                      {s.issues.map((x) => (
                        <div key={x.q} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-3">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{x.q}</div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{x.a}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Still stuck */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">Still stuck?</div>
          <div className="text-xs text-slate-500">Ask the AI assistant, or send a ticket to the support team — replies come to your bell.</div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={onAskAI} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer"><Bot size={14} /> Ask AI</button>
          <button type="button" onClick={onNewTicket} className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"><LifeBuoy size={14} /> Raise a ticket</button>
        </div>
      </div>
    </div>
  );
}
