import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Bell, ChevronDown, ExternalLink, LogOut, Menu, Settings } from 'lucide-react';

const SECTION_TITLES = {
  overview: { title: 'Overview', subtitle: 'Platform summary' },
  users: { title: 'Owners & Staff', subtitle: 'Accounts, seat quotas and premium features' },
  support: { title: 'Support Tickets', subtitle: 'Questions and problems raised by owners and staff' },
  ai: { title: 'AI Assistant', subtitle: 'Grok API key, model, limits and usage' },
  developer: { title: 'Developer & Servers', subtitle: 'Atlas storage, API performance, memory profiler & server health' },
  settings: { title: 'Settings', subtitle: 'Platform configuration' },
};

export default function AdminTopBar({
  activeSection,
  setActiveSection = () => {},
  onRefresh,
  refreshing,
  onOpenMobileMenu = () => {},
  onSignOut,
  onOpenNotificationModal = () => {},
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef(null);
  const section = SECTION_TITLES[activeSection] || SECTION_TITLES.overview;

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="h-16 px-4 sm:px-8 flex items-center justify-between gap-4">
        {/* Left: mobile menu + section title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden w-9 h-9 rounded-2xl flex items-center justify-center border border-slate-200 bg-slate-50 text-slate-700 shrink-0"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-slate-900 tracking-tight truncate">{section.title}</div>
            <div className="text-[11px] text-slate-400 font-medium truncate hidden sm:block">{section.subtitle}</div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            onClick={onOpenNotificationModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            title="Send a notice to owner dashboards"
          >
            <Bell size={13} className="text-slate-500" />
            <span className="hidden sm:inline">Send Notice</span>
          </button>

          <button
            onClick={onRefresh}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Refresh data"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-slate-900' : ''} />
          </button>

          <a
            href="https://crm-amber-nine.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
          >
            <span>Sales CRM</span>
            <ExternalLink size={12} className="text-slate-500" />
          </a>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 border border-transparent transition-all cursor-pointer"
            >
              <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center">SA</span>
              <span className="hidden md:inline text-xs font-bold text-slate-800">Super Admin</span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-float border border-slate-200 p-2 z-50 text-xs">
                <div className="p-2 border-b border-slate-100">
                  <div className="font-extrabold text-slate-900">Super Administrator</div>
                  <div className="text-[11px] text-slate-400">Travel-Trade Admin Console</div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setActiveSection('settings');
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Settings size={13} />
                    <span>Settings</span>
                  </button>
                </div>
                {onSignOut && (
                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut size={13} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
