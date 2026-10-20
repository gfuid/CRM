import React from 'react';
import {
  LayoutDashboard,
  Users2,
  Settings,
  Terminal,
  ExternalLink,
  X,
  LogOut,
} from 'lucide-react';
import BrandLogo from './BrandLogo';

const adminNavItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Owners & Staff', icon: Users2 },
  { id: 'developer', label: 'Developer & Servers', icon: Terminal, badge: 'Live' },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar({
  activeSection,
  setActiveSection,
  isOpen = false,
  onClose = () => {},
  onSignOut,
}) {
  const handleSelect = (id) => {
    setActiveSection(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        className={`w-64 min-w-[256px] bg-white/95 backdrop-blur-md border-r border-slate-200/80 h-screen fixed md:sticky top-0 left-0 flex flex-col select-none z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-float' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size={34} />
            <div>
              <div className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                <span>Travel-Trade</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-900 text-white uppercase tracking-wider">
                  Admin
                </span>
              </div>
              <div className="text-[11px] font-medium text-slate-400">Master Console</div>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Sections (Zentra & Pill Style) */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5">
          <div className="px-3 pt-2 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
            Menu
          </div>

          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

        </div>

        {/* Footer Links & Sign Out */}
        <div className="p-3.5 border-t border-slate-100 space-y-2">
          <a
            href="https://crm-amber-nine.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200/80 transition-colors shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Open Sales CRM App</span>
            </div>
            <ExternalLink size={13} className="text-slate-400" />
          </a>

          {onSignOut && (
            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200/70 transition-colors cursor-pointer"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
