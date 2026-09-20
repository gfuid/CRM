import React from 'react';
import { Crown, CheckCircle2, ShieldCheck, Zap, Download, X, Globe, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PremiumPlanModal({ isOpen, onClose }) {
  const { company } = useAuth();

  if (!isOpen) return null;

  const features = [
    { title: 'Unlimited Trade Leads', desc: 'No monthly cap on export, import, or domestic trade inquiries' },
    { title: 'High-Speed Bulk Import & Export', desc: 'Instant batch processing with CSV templates and error detection' },
    { title: 'Global Incoterms Calculator', desc: 'Built-in FOB, CIF, CFR, EXW freight logistics mapping' },
    { title: 'Automated WhatsApp Outreach', desc: 'Direct buyer follow-up templates and one-click chat triggers' },
    { title: 'Unlimited Staff Member Seats', desc: 'Assign leads, track individual pipelines, and monitor daily tasks' },
    { title: 'AI Buyer Matching & Trade Signals', desc: 'Automated commodity market demand insights & alerts' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/30 dark:bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner */}
        <div className="relative bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-md">
              <Crown size={26} className="text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold tracking-tight">Enterprise Exporter Pro</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-white text-amber-800">
                  Active
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                Global Trade & Commodity Operations License
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/20 text-xs">
            <div>
              <span className="text-amber-100/80 text-[10px] uppercase font-bold block">Organization</span>
              <span className="font-bold truncate block">{company?.name || 'Travel-Trade'}</span>
            </div>
            <div>
              <span className="text-amber-100/80 text-[10px] uppercase font-bold block">Valid Through</span>
              <span className="font-bold block">December 31, 2026</span>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Unlocked Capabilities
            </h4>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck size={14} /> Full Access Verified
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={13} />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">{f.title}</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 flex items-center gap-3">
            <Sparkles size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-xs text-amber-900 dark:text-amber-300">
              <span className="font-bold block">High Priority Trade Routing Active</span>
              <span className="text-[11px] text-amber-700 dark:text-amber-400">
                Your workspace runs on dedicated enterprise infrastructure with 99.99% uptime guarantee.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Got it, Continue Trading
          </button>
        </div>
      </div>
    </div>
  );
}
