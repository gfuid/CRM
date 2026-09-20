import React from 'react';
import {
  BarChart2,
  Users,
  ListTodo,
  LayoutGrid,
  Table,
  Calendar,
  CalendarClock,
  UserPlus
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab, companyName, taskBadgeCount, onOpenStaffModal }) {
  const { isOwner, isStaff, profile } = useAuth();

  const userPerms = profile?.permissions || {};
  const canViewAnalytics = isOwner || userPerms.view_analytics === true;
  const canViewLeads = isOwner || userPerms.view_leads !== false;
  const canViewTasks = isOwner || userPerms.view_tasks !== false;
  const canViewActivity = isOwner || userPerms.view_activity !== false;
  const canViewOutreach = isOwner || userPerms.view_outreach !== false;
  const canViewMyDays = isOwner || userPerms.view_mydays !== false;
  const canViewFollowUp = isOwner || userPerms.view_followup !== false;

  const rawNavItems = [
    { id: 'analytics', label: isStaff ? 'My Analytics' : 'Analytics', icon: BarChart2, visible: canViewAnalytics },
    { id: 'leads', label: isStaff ? 'My Leads' : 'Leads', icon: Users, visible: canViewLeads },
    { id: 'tasks', label: isStaff ? 'My Tasks' : 'Task Management', icon: ListTodo, badge: true, visible: canViewTasks },
    { id: 'activity', label: 'Activity', icon: LayoutGrid, visible: canViewActivity },
    { id: 'outreach', label: 'Outreach', icon: Table, visible: canViewOutreach },
    { id: 'mydays', label: 'My Days', icon: Calendar, visible: canViewMyDays },
    { id: 'followup', label: 'Follow up', icon: CalendarClock, visible: canViewFollowUp },
  ];

  const navItems = rawNavItems.filter((item) => item.visible !== false);

  return (
    <aside className="hidden md:flex md:w-64 md:fixed md:inset-y-0 md:left-0 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 z-30 flex-col border-r border-slate-200 dark:border-slate-800 select-none shadow-sm">
      {/* Brand Header with Logo Colors */}
      <div className="p-5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
        <BrandLogo size={32} />
        <div className="min-w-0">
          <div className="text-base font-extrabold text-slate-900 dark:text-white truncate tracking-tight flex items-center gap-1.5">
            <span>{companyName || 'Travel-Trade'}</span>
          </div>
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span>Export & Trade CRM</span>
            {isStaff ? (
              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-600">
                STAFF
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                OWNER
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          {isStaff ? 'My Workspace' : 'Sales & Operations'}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const showBadge = item.badge && (taskBadgeCount > 0 || taskBadgeCount === undefined);

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold border-l-4 border-emerald-500 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  size={18}
                  className={isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-slate-600'}
                />
                <span>{item.label}</span>
              </div>

              {showBadge ? (
                <span className="px-2 py-0.5 text-xs font-bold text-white bg-[#F88F61] rounded-full shadow-sm">
                  {taskBadgeCount || 1}
                </span>
              ) : isActive ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              ) : null}
            </button>
          );
        })}

        {/* Owner Controls: Team & Staff Management */}
        {isOwner && (
          <div className="pt-4 mt-3 border-t border-slate-100 space-y-1.5">
            <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Organization</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Owner</span>
            </div>
            <button
              onClick={onOpenStaffModal}
              className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <UserPlus size={16} />
                <span>+ Create Staff Member</span>
              </div>
              <span className="text-[10px] bg-emerald-700/80 px-1.5 py-0.5 rounded text-white font-extrabold">Add</span>
            </button>
          </div>
        )}
      </nav>

      {/* Footer / Logged In Role Banner */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-600 dark:text-slate-400">
            {profile?.name || 'Online'}
          </span>
        </div>
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600">
          {isOwner ? 'Owner' : 'Staff'}
        </span>
      </div>
    </aside>
  );
}
