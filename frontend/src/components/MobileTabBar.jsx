import React, { useState } from 'react';
import {
  BarChart2,
  Users,
  ListTodo,
  CalendarClock,
  Menu,
  X,
  LayoutGrid,
  Table,
  Calendar,
  UserPlus,
  LogOut,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MobileTabBar({
  activeTab,
  setActiveTab,
  taskBadgeCount,
  onOpenStaffModal,
}) {
  const { signOut, isOwner, profile } = useAuth();
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

  const userPerms = profile?.permissions || {};
  const canViewAnalytics = isOwner || userPerms.view_analytics === true;
  const canViewLeads = isOwner || userPerms.view_leads !== false;
  const canViewTasks = isOwner || userPerms.view_tasks !== false;
  const canViewFollowUp = isOwner || userPerms.view_followup !== false;

  const rawPrimaryTabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart2, visible: canViewAnalytics },
    { id: 'leads', label: 'Leads', icon: Users, visible: canViewLeads },
    { id: 'tasks', label: 'Tasks', icon: ListTodo, badge: true, visible: canViewTasks },
    { id: 'followup', label: 'Follow up', icon: CalendarClock, visible: canViewFollowUp },
  ];
  const primaryTabs = rawPrimaryTabs.filter((t) => t.visible !== false);

  const secondaryTabs = [
    { id: 'activity', label: 'Activity Logs', icon: LayoutGrid, desc: 'Audit trail of trade updates' },
    { id: 'outreach', label: 'Outreach Matrix', icon: Table, desc: 'Touchpoint conversions' },
    { id: 'mydays', label: 'My Days Worklog', icon: Calendar, desc: 'Daily work timeline' },
  ];

  const isMoreActive = ['activity', 'outreach', 'mydays'].includes(activeTab);

  return (
    <>
      {/* More Options Drawer Backdrop */}
      {moreDrawerOpen && (
        <div
          onClick={() => setMoreDrawerOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 md:hidden transition-opacity"
        />
      )}

      {/* More Options Bottom Sheet */}
      {moreDrawerOpen && (
        <div className="fixed bottom-16 left-3 right-3 bg-white rounded-3xl p-4 shadow-2xl border border-slate-200 z-50 md:hidden animate-slideUp">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
            <div className="font-extrabold text-sm text-slate-900">More Workspaces</div>
            <button
              onClick={() => setMoreDrawerOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-1.5">
            {secondaryTabs.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMoreDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                      : 'hover:bg-slate-50 text-slate-700 font-semibold'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <div className="text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{item.desc}</div>
                  </div>
                </button>
              );
            })}

            {isOwner && (
              <button
                onClick={() => {
                  setMoreDrawerOpen(false);
                  onOpenStaffModal();
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-2xl text-left bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-900 font-bold hover:bg-emerald-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <UserPlus size={16} />
                </div>
                <div>
                  <div className="text-xs">Manage Team & Add Staff</div>
                  <div className="text-[10px] text-emerald-700 font-normal">
                    Create staff logins with passwords
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl px-2 py-1.5 flex items-center justify-around safe-area-bottom">
        {primaryTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const showBadge = item.badge && (taskBadgeCount > 0 || taskBadgeCount === undefined);

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMoreDrawerOpen(false);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
                isActive
                  ? 'text-emerald-600 font-black'
                  : 'text-slate-500 hover:text-slate-900 font-semibold'
              }`}
            >
              <div className="relative">
                <Icon size={20} className={isActive ? 'text-emerald-600 scale-110 transition-transform' : 'text-slate-500'} />
                {showBadge && (
                  <span className="absolute -top-1 -right-2 px-1 py-0.2 min-w-[14px] text-center rounded-full text-[9px] font-black bg-rose-500 text-white shadow-xs">
                    {taskBadgeCount || 1}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 leading-tight">{item.label}</span>
              {isActive && (
                <span className="w-4 h-0.5 bg-emerald-600 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}

        {/* More Button */}
        <button
          onClick={() => setMoreDrawerOpen(!moreDrawerOpen)}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
            isMoreActive || moreDrawerOpen
              ? 'text-emerald-600 font-black'
              : 'text-slate-500 hover:text-slate-900 font-semibold'
          }`}
        >
          <Menu size={20} className={isMoreActive || moreDrawerOpen ? 'text-emerald-600 scale-110' : 'text-slate-500'} />
          <span className="text-[10px] mt-0.5 leading-tight">More</span>
          {(isMoreActive || moreDrawerOpen) && (
            <span className="w-4 h-0.5 bg-emerald-600 rounded-full mt-0.5" />
          )}
        </button>
      </nav>
    </>
  );
}
