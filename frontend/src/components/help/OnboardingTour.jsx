import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { tourSteps } from '../../data/helpGuide';

const doneKey = (uid) => `crm_tour_done_${uid || 'anon'}`;
const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked: tour just shows again next time */ } };

/** Start the tour from anywhere (Help page "Replay tour"). */
export const startTour = () => window.dispatchEvent(new CustomEvent('crm_start_tour'));

const visibleTarget = (name) => {
  if (!name) return null;
  const els = document.querySelectorAll(`[data-tour="${name}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
};

/**
 * First-login guided tour. Skippable (button, ✕ or Esc), remembered per user in this browser,
 * and replayable from Help & Support. Highlights the real menu item for each step when it is
 * on screen; on phones (no sidebar) it falls back to a centred card.
 */
export default function OnboardingTour({ userId, isOwner, canSee, activeTab, setActiveTab }) {
  const steps = useMemo(() => tourSteps({ isOwner, canSee }), [isOwner, canSee]);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const originTab = useRef(null); // page the user was on, restored when the tour ends
  const tabRef = useRef(activeTab);
  tabRef.current = activeTab;

  // Auto-open once per user (after the first page has painted)
  useEffect(() => {
    if (!userId || read(doneKey(userId)) || read('crm_tour_skip')) return undefined;
    const t = setTimeout(() => { originTab.current = tabRef.current; setI(0); setOpen(true); }, 900);
    return () => clearTimeout(t);
  }, [userId]);

  useEffect(() => {
    const start = () => { originTab.current = tabRef.current; setI(0); setOpen(true); };
    window.addEventListener('crm_start_tour', start);
    return () => window.removeEventListener('crm_start_tour', start);
  }, []);

  const finish = useCallback(() => {
    write(doneKey(userId), new Date().toISOString());
    setOpen(false);
    setRect(null);
    if (originTab.current) setActiveTab(originTab.current);
  }, [userId, setActiveTab]);

  const step = steps[i];

  // Open the step's page, then measure the highlighted element
  useLayoutEffect(() => {
    if (!open || !step) return undefined;
    if (step.tab) setActiveTab(step.tab);
    let raf;
    const measure = () => {
      const el = visibleTarget(step.target);
      if (!el) { setRect(null); return; }
      el.scrollIntoView({ block: 'nearest' });
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const t = setTimeout(() => { raf = requestAnimationFrame(measure); }, 120);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); window.removeEventListener('resize', measure); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, i]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, steps.length - 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, finish, steps.length]);

  if (!open || !step) return null;
  const last = i === steps.length - 1;

  // Card position: to the right of the highlighted item if there is room, otherwise above/below it
  const W = 340;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let cardStyle = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  if (rect) {
    const pad = 14;
    if (rect.left + rect.width + pad + W < vw - 8) {
      cardStyle = { left: rect.left + rect.width + pad, top: Math.min(Math.max(8, rect.top - 8), vh - 240) };
    } else if (rect.top > vh / 2) {
      cardStyle = { left: Math.min(Math.max(8, rect.left + rect.width - W), vw - W - 8), top: Math.max(8, rect.top - 230) };
    } else {
      cardStyle = { left: Math.min(Math.max(8, rect.left), vw - W - 8), top: rect.top + rect.height + pad };
    }
  }

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Product tour">
      {rect ? (
        <div
          className="absolute rounded-xl ring-2 ring-emerald-500 transition-all duration-300 pointer-events-none"
          style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8, boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)' }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/55" />
      )}

      <div
        key={i}
        className="absolute bg-white dark:bg-slate-900 rounded-2xl shadow-float border border-slate-200 dark:border-slate-700 p-5 animate-scale-in"
        style={{ width: `min(${W}px, calc(100vw - 16px))`, ...cardStyle }}
      >
        <button type="button" onClick={finish} className="absolute top-3 right-3 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Skip tour">
          <X size={16} />
        </button>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-1">Step {i + 1} of {steps.length}</div>
        <h3 className="text-[15px] font-bold text-slate-900 dark:text-white pr-6">{step.title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{step.body}</p>

        <div className="mt-4 flex items-center gap-1">
          {steps.map((_, n) => (
            <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-5 bg-emerald-500' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={finish} className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">Skip tour</button>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button type="button" onClick={() => setI(i - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer">
                <ArrowLeft size={13} /> Back
              </button>
            )}
            <button type="button" onClick={() => (last ? finish() : setI(i + 1))} className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer">
              {last ? 'Finish' : 'Next'} {!last && <ArrowRight size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
