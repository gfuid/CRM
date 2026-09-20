import React from 'react';
import {
  BarChart2,
  Users,
  ListTodo,
  LayoutGrid,
  Table,
  Calendar,
  CalendarClock,
} from 'lucide-react';
import BrandLogo from './BrandLogo';

const navItems = [
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'tasks', label: 'Task Management', icon: ListTodo, badge: true },
  { id: 'activity', label: 'Activity', icon: LayoutGrid },
  { id: 'outreach', label: 'Outreach', icon: Table },
  { id: 'mydays', label: 'My Days', icon: Calendar },
  { id: 'followup', label: 'Follow up', icon: CalendarClock },
];

export default function Sidebar({ activeTab, setActiveTab, companyName, taskBadgeCount }) {
  return (
    <aside className="w-full md:w-64 md:fixed md:inset-y-0 md:left-0 bg-slate-900 text-slate-300 z-30 flex flex-col border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3 border-b border-slate-800/80">
        <BrandLogo size={28} />
        <div className="text-base font-bold text-white truncate tracking-tight">
          {companyName || 'Stellarsync'}
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const showBadge = item.badge && (taskBadgeCount > 0 || taskBadgeCount === undefined);

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  size={18}
                  className={isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'}
                />
                <span>{item.label}</span>
              </div>

              {showBadge ? (
                <span className="px-2 py-0.5 text-xs font-bold text-white bg-rose-500 rounded-full shadow-sm">
                  {taskBadgeCount || 1}
                </span>
              ) : isActive ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Footer / System Status */}
      <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>MongoDB Atlas Connected</span>
        </div>
        <span className="font-mono text-slate-400">v1.0</span>
      </div>
    </aside>
  );
}
