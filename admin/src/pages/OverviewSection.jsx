import React from 'react';
import {
  Users2,
  Crown,
  UserCheck,
  Briefcase,
  CheckCircle2,
  ListTodo,
  Settings,
  ChevronRight,
  Mail,
  Activity,
  UserPlus,
} from 'lucide-react';
import OwnerStaffHierarchyView from '../components/OwnerStaffHierarchyView';

const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

function Stat({ icon: Icon, label, value, hint, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">{label}</div>
        <div className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{value}</div>
        {hint && <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">{hint}</div>}
      </div>
    </div>
  );
}

export default function OverviewSection({
  overviewSummary,
  users = [],
  company,
  onNavigate,
  onUpdateStaffLimit,
  onUpdateRole,
  onToggleStatus,
  onToggleFeature,
}) {
  const team = overviewSummary?.team || {};
  const crm = overviewSummary?.crm || {};
  const health = overviewSummary?.health || {};

  const isOwner = (u) => u.persona === 'owner' || u.is_owner || u.role === 'admin';
  const owners = users.filter(isOwner);
  const staff = users.filter((u) => !isOwner(u));
  const totalUsers = team.total ?? users.length;
  const activeUsers = team.active ?? users.filter((u) => u.is_active).length;
  const premiumOwners = owners.filter((o) => o.features?.email_marketing);

  const recentUsers = (Array.isArray(team.recentUsers) && team.recentUsers.length > 0 ? team.recentUsers : users.slice(-5).reverse()).slice(0, 5);

  const num = (v) => (v === undefined || v === null ? '—' : v);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight m-0">Overview</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Super Administrator &bull; {company?.name || 'Travel-Trade'} platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('users')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
          >
            <UserPlus size={13} />
            <span>Owners & Staff</span>
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 transition-all shadow-2xs cursor-pointer"
          >
            <Settings size={13} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Real platform numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat icon={Crown} label="Business owners" value={owners.length} hint={`${premiumOwners.length} with Email Marketing`} tone="amber" />
        <Stat icon={Users2} label="Staff accounts" value={staff.length} hint={`${totalUsers} total accounts`} />
        <Stat icon={UserCheck} label="Active accounts" value={activeUsers} hint={`${totalUsers - activeUsers} inactive`} tone="emerald" />
        <Stat icon={Briefcase} label="Total leads" value={num(crm.totalLeads)} hint="Across all companies" tone="blue" />
        <Stat icon={CheckCircle2} label="Deals won" value={num(crm.wonLeads)} hint={crm.totalLeads ? `${Math.round(((crm.wonLeads || 0) / crm.totalLeads) * 100)}% win rate` : ''} tone="emerald" />
        <Stat icon={ListTodo} label="Open tasks" value={num(crm.pendingTasks)} hint={crm.totalTasks !== undefined ? `of ${crm.totalTasks} tasks` : ''} tone="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Owners & staff (real hierarchy) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-card p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                <Crown size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 m-0 tracking-tight">Business owners & their staff</h3>
                <p className="text-xs text-slate-400 mt-0.5">Click an owner to see staff, adjust seat quota, or deactivate accounts</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('users')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <span>Full management</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <OwnerStaffHierarchyView
            users={users}
            onUpdateStaffLimit={onUpdateStaffLimit}
            onUpdateRole={onUpdateRole}
            onToggleStatus={onToggleStatus}
          />
        </div>

        <div className="lg:col-span-4 space-y-6">
          {/* Premium features per owner */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 m-0 tracking-tight">Premium: Email Marketing</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Switch campaigns on or off per owner</p>
              </div>
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Mail size={15} />
              </span>
            </div>

            {owners.length === 0 ? (
              <p className="text-xs text-slate-400">No business owners registered yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {owners.slice(0, 6).map((o) => {
                  const on = Boolean(o.features?.email_marketing);
                  return (
                    <div key={o.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{o.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{o.company_name || o.email}</div>
                      </div>
                      <button
                        onClick={() => onToggleFeature && onToggleFeature(o.id, 'email_marketing', !on)}
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-colors cursor-pointer ${
                          on ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                        title={on ? 'Disable Email Marketing for this owner' : 'Enable Email Marketing for this owner'}
                      >
                        {on ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {owners.length > 6 && (
              <button onClick={() => onNavigate('users')} className="w-full py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 transition-colors cursor-pointer">
                See all {owners.length} owners ›
              </button>
            )}
          </div>

          {/* Recent sign-ups */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-5 sm:p-6 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 m-0 tracking-tight">Recent sign-ups</h3>
            {recentUsers.length === 0 ? (
              <p className="text-xs text-slate-400">No accounts yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentUsers.map((u) => (
                  <div key={u.id || u.email} className="py-2.5 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 text-[11px] font-black flex items-center justify-center shrink-0 overflow-hidden">
                      {u.avatar_url ? <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" /> : (u.name || '?').slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 truncate">{u.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isOwner(u) ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {isOwner(u) ? 'Owner' : 'Staff'}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">{fmtDate(u.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 m-0 tracking-tight">Backend</h3>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                <Activity size={12} /> {health.status || 'ONLINE'}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
              <dt className="text-slate-400 font-semibold">Uptime</dt>
              <dd className="text-slate-800 font-bold text-right">{health.uptimeHuman || '—'}</dd>
              <dt className="text-slate-400 font-semibold">Node</dt>
              <dd className="text-slate-800 font-bold text-right">{health.nodeVersion || '—'}</dd>
              <dt className="text-slate-400 font-semibold">Plan</dt>
              <dd className="text-slate-800 font-bold text-right capitalize">{company?.plan || '—'}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
