import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  Users,
  ListTodo,
  LayoutGrid,
  Table,
  Calendar,
  CalendarClock,
  UserPlus,
  LogOut,
  ChevronRight,
  Shield,
  Mail,
  ClipboardCheck,
  LifeBuoy,
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import StorageMeter from './StorageMeter';
import { useAuth, isStaffDeleted } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab, companyName, taskBadgeCount, onOpenStaffModal }) {
  const { isOwner, isStaff, profile, signOut, getTeamMembers } = useAuth();
  const [staffList, setStaffList] = useState(() => {
    try {
      const ownerKey = profile?.id ? `crm_local_staff_${profile.id}` : null;
      if (ownerKey) {
        const cached = JSON.parse(localStorage.getItem(ownerKey) || '[]');
        if (Array.isArray(cached) && cached.length > 0) {
          return cached.filter((m) => m.persona !== 'owner' && !isStaffDeleted(m));
        }
      }
    } catch {}
    return [];
  });

  const reloadStaff = () => {
    if (isOwner && getTeamMembers) {
      getTeamMembers()
        .then((members) => {
          if (Array.isArray(members)) {
            const staff = members.filter((m) => m.persona !== 'owner' && !isStaffDeleted(m));
            setStaffList(staff);
          }
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    reloadStaff();
    window.addEventListener('crm_staff_updated', reloadStaff);
    return () => window.removeEventListener('crm_staff_updated', reloadStaff);
  }, [isOwner, profile?.id, getTeamMembers]);

  const userPerms = profile?.permissions || {};
  // Strict permission enforcement: staff only sees sections owner explicitly granted
  const canViewAnalytics = isOwner ? true : Boolean(userPerms.view_analytics);
  const canViewLeads = isOwner ? true : (userPerms.view_leads !== false);
  const canViewTasks = isOwner ? true : Boolean(userPerms.view_tasks);
  const canViewActivity = isOwner ? true : Boolean(userPerms.view_activity);
  const canViewOutreach = isOwner ? true : Boolean(userPerms.view_outreach);
  const canViewMyDays = isOwner ? true : Boolean(userPerms.view_mydays);
  const canViewFollowUp = isOwner ? true : Boolean(userPerms.view_followup);

  const rawNavItems = [
    { id: 'analytics', label: isStaff ? 'My Analytics' : 'Analytics', icon: BarChart2, visible: canViewAnalytics },
    { id: 'leads', label: isStaff ? 'My Leads' : 'Leads', icon: Users, visible: canViewLeads },
    { id: 'tasks', label: isStaff ? 'My Tasks' : 'Task Management', icon: ListTodo, badge: true, visible: canViewTasks },
    { id: 'activity', label: 'Activity', icon: LayoutGrid, visible: canViewActivity },
    { id: 'outreach', label: 'Outreach', icon: Table, visible: canViewOutreach },
    { id: 'mydays', label: 'My Days', icon: Calendar, visible: canViewMyDays },
    { id: 'followup', label: 'Follow up', icon: CalendarClock, visible: canViewFollowUp },
    { id: 'review', label: isStaff ? 'My Performance' : 'Team Review', icon: ClipboardCheck },
    { id: 'email', label: 'Email Marketing', icon: Mail, visible: isOwner, pro: true },
    { id: 'support', label: 'Help & Support', icon: LifeBuoy },
  ];

  const navItems = rawNavItems.filter((item) => item.visible !== false);

  return (
    <aside className="hidden md:flex md:w-64 md:fixed md:inset-y-0 md:left-0 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 z-30 flex-col border-r border-slate-200/80 dark:border-slate-800 select-none">
      {/* Brand Header with Logo Colors */}
      <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
        <BrandLogo size={28} />
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 dark:text-white truncate tracking-tight flex items-center gap-1.5">
            <span>{companyName || 'My Organization'}</span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>Export & Trade CRM</span>
            {isStaff ? (
              <span className="px-1.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-semibold tracking-wide text-slate-600">
                STAFF
              </span>
            ) : (
              <span className="px-1.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-semibold tracking-wide">
                OWNER
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <div className="px-2.5 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {isStaff ? 'My Workspace' : 'Sales & Operations'}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const showBadge = item.badge && taskBadgeCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-[13px] transition-colors duration-150 cursor-pointer ${isActive
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
            >
              {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-emerald-500" />}
              <div className="flex items-center gap-2.5">
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2.25 : 2}
                  className={isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-slate-600'}
                />
                <span>{item.label}</span>
              </div>

              {showBadge ? (
                <span className="min-w-[20px] px-1.5 py-0.5 text-[10px] font-semibold text-center text-white bg-rose-500 rounded-full">
                  {taskBadgeCount}
                </span>
              ) : item.pro ? (
                <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                  Pro
                </span>
              ) : null}
            </button>
          );
        })}

        {/* Owner Controls: Team & Staff Management */}
        {isOwner && (
          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="px-2.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>Organization</span>
            </div>

            <button
              onClick={() => onOpenStaffModal && onOpenStaffModal()}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
            >
              <UserPlus size={15} className="text-emerald-600" />
              <span>+ Create Staff</span>
            </button>

            {/* Owner Employee Roster & Count */}
            <div className="rounded-lg p-2 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Users size={13} className="text-slate-400" />
                  <span>Employees ({staffList.length})</span>
                </span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {staffList.filter((s) => s.is_active !== false).length} Active
                </span>
              </div>

              {staffList.length === 0 ? (
                <div className="px-2 py-2 text-[10px] text-slate-400 text-center italic">
                  No staff accounts yet. Click above to add staff.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                  {staffList.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-[11px] hover:border-emerald-400 dark:hover:border-emerald-600 transition-all shadow-2xs group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={st.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80'}
                          alt={st.name}
                          className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white truncate leading-tight flex items-center gap-1">
                            <span className="truncate">{st.name}</span>
                            {st.is_active === false && (
                              <span className="text-[8px] text-rose-500 font-bold">Paused</span>
                            )}
                          </div>
                          <div className="text-[9px] text-slate-400 truncate leading-tight">
                            {st.department || st.email}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenStaffModal && onOpenStaffModal(st)}
                        className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-md border border-emerald-200 dark:border-emerald-800 shrink-0 cursor-pointer transition-all shadow-2xs"
                        title="Edit Permissions & Scope"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <StorageMeter />
          </div>
        )}
      </nav>

      {/* Footer / Logged In Role Banner & Prominent Logout */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
              {(profile?.name || 'U').trim().slice(0, 1).toUpperCase()}
            </span>
            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
              {profile?.name || 'Online'}
            </span>
          </div>
          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">
            {isOwner ? 'Owner' : 'Staff'}
          </span>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-200 transition-colors cursor-pointer"
        >
          <LogOut size={13} />
          <span>Sign Out / Logout</span>
        </button>
      </div>
    </aside>
  );
}
