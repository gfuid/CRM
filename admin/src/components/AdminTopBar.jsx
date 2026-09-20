import React from 'react';
import { RefreshCw, Menu } from 'lucide-react';

export default function AdminTopBar({ activeSection, onRefresh, refreshing, onOpenMobileMenu = () => {} }) {
  const titles = {
    overview: 'CRM Business Overview & Platform KPIs',
    users: 'Users & Team Management Directory',
    settings: 'Global CRM Platform Settings',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Menu Button */}
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu size={18} />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 capitalize m-0 truncate max-w-[200px] sm:max-w-none">
            {titles[activeSection] || activeSection}
          </h2>
          <div className="text-[11px] text-slate-400">Environment: Production Master</div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-sm"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh Data</span>
        </button>

        <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>API Connected (Port 5000)</span>
        </div>

        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs ml-1 shadow-sm">
          SA
        </div>
      </div>
    </header>
  );
}
