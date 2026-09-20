import React from 'react';
import {
  LayoutDashboard,
  Users2,
  Settings,
  ExternalLink,
  X
} from 'lucide-react';
import BrandLogo from './BrandLogo';

const adminNavItems = [
  { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users & Team Management', icon: Users2 },
  { id: 'settings', label: 'CRM Platform Settings', icon: Settings },
];

export default function AdminSidebar({ activeSection, setActiveSection, isOpen = false, onClose = () => {} }) {
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
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      <aside
        className={`w-64 min-w-[256px] bg-white border-r border-slate-200 h-screen fixed md:sticky top-0 left-0 flex flex-col select-none z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size={32} />
            <div>
              <div className="font-extrabold text-slate-900 text-base tracking-tight flex items-center gap-1.5">
                <span>Travel-Trade CRM</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white uppercase tracking-wider">
                  Admin
                </span>
              </div>
              <div className="text-[11px] font-medium text-slate-400">Master Console</div>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-3 pt-3 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            CRM Administration
          </div>

          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-bold border-l-4 border-emerald-500 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer Switcher */}
        <div className="p-3 border-t border-slate-100">
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Open Sales CRM App</span>
            </div>
            <ExternalLink size={14} className="text-slate-400" />
          </a>
        </div>
      </aside>
    </>
  );
}
