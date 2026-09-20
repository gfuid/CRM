import React from 'react';
import {
  Users2,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  ChevronRight,
  UserPlus,
  Settings,
  ExternalLink,
  Crown,
  UserCheck,
  Briefcase
} from 'lucide-react';

export default function OverviewSection({
  overviewSummary,
  users = [],
  company,
  onNavigate,
}) {
  const team = overviewSummary?.team || {};
  const crm = overviewSummary?.crm || {};
  const health = overviewSummary?.health || {};

  const totalUsers = team.total ?? users.length;
  const activeUsers = team.active ?? users.filter((u) => u.is_active).length;
  const adminsCount = team.admins ?? users.filter((u) => u.role === 'admin').length;
  const managersCount = team.managers ?? users.filter((u) => u.role === 'manager').length;
  const agentsCount = team.agents ?? users.filter((u) => u.role === 'agent').length;

  const totalLeads = crm.totalLeads ?? 24;
  const pipelineValue = crm.pipelineValue ?? 184500;
  const wonLeads = crm.wonLeads ?? 8;
  const monthlyTarget = company?.revenueTargetMonthly || 150000;

  const recentUsers = team.recentUsers || users.slice(-5).reverse();

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'manager':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 Core CRM Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Team Members */}
        <div
          onClick={() => onNavigate('users')}
          className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold">
            <span>Total Team Members</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users2 size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{totalUsers} Members</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{activeUsers} active &bull; {totalUsers - activeUsers} inactive</span>
            <span className="text-blue-600 font-bold flex items-center gap-0.5">
              Manage <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* CRM Leads */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold">
            <span>Active Pipeline Leads</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{totalLeads} Leads</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{wonLeads} deals won closed</span>
            <span className="text-emerald-600 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full">
              Live Pipeline
            </span>
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold">
            <span>Pipeline Value</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            ${Number(pipelineValue).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Monthly Target: ${Number(monthlyTarget).toLocaleString()}
          </div>
        </div>

        {/* Platform Status */}
        <div
          onClick={() => onNavigate('settings')}
          className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <div className="flex justify-between items-center text-slate-500 text-xs font-semibold">
            <span>Platform Status</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2 flex items-center gap-2">
            <span>{health.status || 'OPTIMAL'}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Uptime: {health.uptimeHuman || 'Active'}</span>
            <span className="text-purple-600 font-bold flex items-center gap-0.5">
              Settings <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </div>

      {/* Organization Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 border-l-4 border-l-emerald-500 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Crown size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 m-0">
                {company?.name || 'Stellarsync Enterprise'}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Operational
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Industry: <strong>{company?.industry || 'Software & Cloud Sales'}</strong> &bull; Timezone: <strong>{company?.timezone || 'UTC+05:30'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('users')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <UserPlus size={14} />
            <span>Add Team Member</span>
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Settings size={14} />
            <span>Configure CRM</span>
          </button>
        </div>
      </div>

      {/* Team Role Distribution */}
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Team Role Breakdown
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => onNavigate('users')}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 cursor-pointer hover:border-purple-300 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Super Administrators</span>
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{adminsCount} Admins</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Full control over team, security policies & global settings
            </div>
          </div>

          <div
            onClick={() => onNavigate('users')}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 cursor-pointer hover:border-blue-300 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Sales Managers</span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{managersCount} Managers</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Supervises pipeline, assign tasks and monitor reps
            </div>
          </div>

          <div
            onClick={() => onNavigate('users')}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 cursor-pointer hover:border-emerald-300 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Sales Reps & Staff</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{agentsCount} Agents</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Engages leads, schedules follow-ups, and logs outreach
            </div>
          </div>
        </div>
      </div>

      {/* Recent Team Members Table Preview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="font-bold text-slate-900 text-sm m-0">Recent Personnel Directory</h4>
            <p className="text-xs text-slate-400 mt-0.5">Latest team members registered in the CRM</p>
          </div>
          <button
            onClick={() => onNavigate('users')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
          >
            <span>View All {totalUsers} Members</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="pb-3 pl-2">Team Member</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 pl-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`}
                        alt={u.name}
                        className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                      />
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{u.name}</div>
                        <div className="text-slate-400 text-[11px]">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="text-slate-600 font-medium">{u.department || 'Sales Outreach'}</span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getRoleBadge(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      u.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 text-right pr-2">
                    <button
                      onClick={() => onNavigate('users')}
                      className="text-xs font-semibold text-slate-600 hover:text-emerald-600 transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
