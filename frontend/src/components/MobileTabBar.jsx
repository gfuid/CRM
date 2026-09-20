import React from 'react';
import {
  BarChart2,
  Users,
  ListTodo,
  LayoutGrid,
  Table,
  Calendar,
  CalendarClock,
  LogOut,
  Sun,
  Moon,
  UserPlus
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { useAuth } from '../context/AuthContext';

const mobileNavItems = [
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'tasks', label: 'Tasks', icon: ListTodo, badge: true },
  { id: 'activity', label: 'Activity', icon: LayoutGrid },
  { id: 'outreach', label: 'Outreach', icon: Table },
  { id: 'mydays', label: 'My Days', icon: Calendar },
  { id: 'followup', label: 'Follow up', icon: CalendarClock },
];

export default function MobileTabBar({
  activeTab,
  setActiveTab,
  companyName,
  taskBadgeCount,
  onOpenStaffModal,
}) {
  const { signOut, profile, isOwner, isStaff } = useAuth();
  const [isDark, setIsDark] = React.useState(() => localStorage.getItem('travel_trade_theme') === 'dark');

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('travel_trade_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('travel_trade_theme', 'light');
    }
  };

  return (
    <div className="md:hidden sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Mobile Top Brand Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <BrandLogo size={28} />
          <div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
              {companyName || 'Travel-Trade'}
            </div>
            <div className="text-[10px] font-semibold text-emerald-600">Export & Trade CRM</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle theme"
          >
            {isDark ? <Sun size={15} className="text-amber-500" /> : <Moon size={15} className="text-slate-500" />}
          </button>

          <button
            onClick={signOut}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Sign Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Tabs */}
      <nav className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar scroll-smooth">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const showBadge = item.badge && (taskBadgeCount > 0 || taskBadgeCount === undefined);

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{item.label}</span>
              {showBadge && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-white text-emerald-700' : 'bg-[#F88F61] text-white'
                  }`}
                >
                  {taskBadgeCount || 1}
                </span>
              )}
            </button>
          );
        })}

        {isOwner && (
          <button
            onClick={onOpenStaffModal}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 shrink-0 cursor-pointer"
          >
            <UserPlus size={14} className="text-emerald-700" />
            <span>+ Staff</span>
          </button>
        )}
      </nav>
    </div>
  );
}
