import React from 'react';
import { RefreshCw, Menu, LayoutDashboard, Users2, Settings } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function AdminTopBar({
  activeSection,
  setActiveSection = () => {},
  onRefresh,
  refreshing,
  onOpenMobileMenu = () => {}
}) {
  const titles = {
    overview: 'CRM Business Overview & Platform KPIs',
    users: 'Users & Team Management Directory',
    settings: 'Global CRM Platform Settings',
  };

  const mobileTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users & Team', icon: Users2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="h-16 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="md:hidden flex items-center gap-2">
            <BrandLogo size={28} />
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 capitalize m-0 truncate max-w-[200px] sm:max-w-none">
              {titles[activeSection] || activeSection}
            </h2>
            <div className="text-[11px] font-semibold text-emerald-600">Travel-Trade Master Console</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-sm"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Render Cloud API</span>
          </div>

          <a
            href="https://crm-amber-nine.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
          >
            Open Sales App &rarr;
          </a>
        </div>
      </div>

      {/* Mobile Tab Navigation Bar */}
      <div className="md:hidden flex items-center gap-2 px-3 py-2 bg-slate-50 border-t border-slate-100 overflow-x-auto no-scrollbar">
        {mobileTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
