import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Eye, Check, X, Layout, DollarSign, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function DashboardCustomizerModal({ isOpen, onClose, onPreferencesSaved }) {
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_widget_prefs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      showRevenueCard: true,
      showLeadsCount: true,
      showConversionRate: true,
      showDueTasks: true,
      defaultCategory: 'all', // 'all' | 'export' | 'import'
      rowDensity: 'comfortable', // 'comfortable' | 'compact'
      currency: 'USD',
    };
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleToggle = (key) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('crm_widget_prefs', JSON.stringify(prefs));
    } catch {}
    setSavedSuccess(true);
    if (onPreferencesSaved) onPreferencesSaved(prefs);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <SlidersHorizontal size={16} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Customize Dashboard Widgets
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Personalize metrics, density, and default filters
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>Dashboard preferences saved!</span>
            </div>
          )}

          {/* Toggle KPI Cards */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Metric Cards Visibility
            </h4>
            <div className="space-y-2">
              {[
                { key: 'showRevenueCard', label: 'Pipeline Deal Value ($ USD)', desc: 'Total expected contract turnover' },
                { key: 'showLeadsCount', label: 'Active Leads & Inquiries', desc: 'Total open trade discussions' },
                { key: 'showConversionRate', label: 'Deal Win & Conversion Rate', desc: 'Stage progression percentage' },
                { key: 'showDueTasks', label: 'Overdue Follow-ups & Tasks', desc: 'Urgent buyer actions' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{item.label}</span>
                    <span className="text-[11px] text-slate-400 block">{item.desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs[item.key]}
                    onChange={() => handleToggle(item.key)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Trade Focus & Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Default Trade Focus
              </label>
              <select
                value={prefs.defaultCategory}
                onChange={(e) => setPrefs({ ...prefs, defaultCategory: e.target.value })}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
              >
                <option value="all">All Trade Leads</option>
                <option value="export">Export Focus</option>
                <option value="import">Import Focus</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Display Currency
              </label>
              <select
                value={prefs.currency}
                onChange={(e) => setPrefs({ ...prefs, currency: e.target.value })}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="AED">AED (AED)</option>
              </select>
            </div>
          </div>

          {/* Row Density */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Table Row Spacing
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPrefs({ ...prefs, rowDensity: 'comfortable' })}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  prefs.rowDensity === 'comfortable'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-500'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                Comfortable
              </button>
              <button
                type="button"
                onClick={() => setPrefs({ ...prefs, rowDensity: 'compact' })}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  prefs.rowDensity === 'compact'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-500'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                Compact (High Density)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
