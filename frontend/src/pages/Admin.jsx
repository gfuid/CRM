import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Activity,
  FileText,
  Settings,
  Plus,
  UserCheck,
  UserX,
  RefreshCw,
  Crown,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import Modal from '../components/Modal';

export default function Admin() {
  const [activeSubTab, setActiveSubTab] = useState('users'); // 'users' | 'plans' | 'health' | 'audit' | 'settings'
  const [users, setUsers] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [quotaError, setQuotaError] = useState('');

  // Add Member Form
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'agent',
    persona: 'staff',
    department: 'Sales Outreach',
    phone: '',
  });

  // Settings Form
  const [settings, setSettings] = useState({
    name: 'Travel-Trade',
    industry: 'Travel, Tourism & Trade Services',
    revenueTargetMonthly: 150000,
    timezone: 'UTC+05:30',
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Fetch all admin data
  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [usersRes, healthRes, auditRes, subRes] = await Promise.all([
        fetch('http://localhost:5000/api/v1/admin/users').then((r) => r.json()).catch(() => null),
        fetch('http://localhost:5000/api/v1/admin/health').then((r) => r.json()).catch(() => null),
        fetch('http://localhost:5000/api/v1/admin/audit-logs').then((r) => r.json()).catch(() => null),
        fetch('http://localhost:5000/api/v1/admin/subscription').then((r) => r.json()).catch(() => null),
      ]);

      if (usersRes && usersRes.success) setUsers(usersRes.data);
      if (healthRes && healthRes.success) setSystemHealth(healthRes.data);
      if (auditRes && auditRes.success) setAuditLogs(auditRes.data);
      if (subRes && subRes.success) {
        setSubscription(subRes.data);
        if (subRes.data.company) {
          setSettings({
            name: subRes.data.company.name || 'Travel-Trade',
            industry: subRes.data.company.industry || 'Travel, Tourism & Trade Services',
            revenueTargetMonthly: subRes.data.company.revenueTargetMonthly || 150000,
            timezone: subRes.data.company.timezone || 'UTC+05:30',
          });
        }
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setQuotaError('');
    try {
      const res = await fetch('http://localhost:5000/api/v1/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      }).then((r) => r.json());

      if (res && res.success) {
        setIsModalOpen(false);
        setNewUser({
          name: '',
          email: '',
          role: 'agent',
          persona: 'staff',
          department: 'Sales Outreach',
          phone: '',
        });
        fetchAdminData();
      } else {
        setQuotaError(res.message || 'Failed to create user');
      }
    } catch (err) {
      setQuotaError(err.message || 'Server error creating user');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await fetch(`http://localhost:5000/api/v1/admin/users/${user.id}/status`, {
        method: 'PATCH',
      });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await fetch(`http://localhost:5000/api/v1/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpgradePlan = async (planId) => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/admin/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      }).then((r) => r.json());

      if (res && res.success) {
        setIsPlanModalOpen(false);
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await fetch('http://localhost:5000/api/v1/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setSettingsSaved(true);
      fetchAdminData();
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Administration & Multi-Tenant Control
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck size={14} /> Production Enterprise
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage organization owner, staff headcount quotas, subscription plans, and live system latency.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Team Member</span>
          </button>
        </div>
      </div>

      {/* 2. SaaS Staff Headcount & Plan Quota Banner */}
      {subscription && (
        <div className="p-6 bg-slate-900 rounded-2xl text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-slate-900/10">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Crown size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  {subscription.currentPlan?.name || 'Growth Plan'}
                </h3>
                <span className="bg-white/10 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-slate-300">
                  ${subscription.currentPlan?.priceMonthly || 79}/month
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Allocated Staff Seats:{' '}
                <strong className="text-white">
                  {subscription.usage?.staffCount} of{' '}
                  {subscription.usage?.maxStaff > 1000 ? 'Unlimited' : subscription.usage?.maxStaff} members used
                </strong>
              </p>
            </div>
          </div>

          {/* Quota Progress Bar */}
          <div className="w-full md:w-80 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Staff Quota Usage</span>
              <span className="text-emerald-400 font-bold">{subscription.usage?.staffPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full bg-emerald-500 rounded-full transition-all duration-500 ${
                  (subscription.usage?.staffPercentage || 0) >= 95
                    ? 'w-full'
                    : (subscription.usage?.staffPercentage || 0) >= 80
                    ? 'w-[85%]'
                    : (subscription.usage?.staffPercentage || 0) >= 50
                    ? 'w-1/2'
                    : (subscription.usage?.staffPercentage || 0) >= 25
                    ? 'w-1/4'
                    : (subscription.usage?.staffPercentage || 0) > 0
                    ? 'w-[15%]'
                    : 'w-0'
                }`}
              />
            </div>
          </div>

          <button
            onClick={() => setIsPlanModalOpen(true)}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
          >
            <Sparkles size={15} />
            <span>Manage / Upgrade Plan</span>
          </button>
        </div>
      )}

      {/* 3. Sub Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'users', label: 'Team & Staff Headcount', icon: Users },
          { id: 'plans', label: 'Subscription Tiers & Quotas', icon: Crown },
          { id: 'health', label: 'System Health & Latency', icon: Activity },
          { id: 'audit', label: 'Audit Trail', icon: FileText },
          { id: 'settings', label: 'Company Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Team & Staff List */}
      {activeSubTab === 'users' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">All Personnel ({users.length})</h3>
              <p className="text-xs text-slate-500">
                Owner has ultimate authority; Staff members are scoped to their assigned permissions.
              </p>
            </div>
            <span className="self-start sm:self-auto px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {users.filter((u) => u.is_active).length} Active Members
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Identity / Persona</th>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {u.persona === 'owner' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Crown size={12} /> Company Owner
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Staff Agent
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full text-white font-bold flex items-center justify-center text-xs ${
                            u.persona === 'owner' ? 'bg-slate-900' : 'bg-emerald-600'
                          }`}
                        >
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-xs text-slate-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{u.department || 'Sales Outreach'}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="agent">Agent</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        {u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                        <span>{u.is_active ? 'Deactivate' : 'Activate'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Subscription Plans & Quotas */}
      {activeSubTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter Plan */}
          <div
            className={`p-6 bg-white rounded-2xl border transition-all ${
              subscription?.currentPlan?.id === 'starter'
                ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : 'border-slate-200/80 shadow-sm'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900">Starter Plan</h3>
              {subscription?.currentPlan?.id === 'starter' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active Plan
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Ideal for Solo Founders & Small Teams</p>
            <div className="text-3xl font-extrabold text-slate-900 my-4">
              $29<span className="text-xs font-normal text-slate-400">/month</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />{' '}
                <strong>Max 3 Staff Members</strong>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> 500 Leads Storage
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> Standard Analytics
              </li>
            </ul>
            <button
              onClick={() => handleUpgradePlan('starter')}
              disabled={subscription?.currentPlan?.id === 'starter'}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                subscription?.currentPlan?.id === 'starter'
                  ? 'bg-slate-100 text-slate-400 cursor-default'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {subscription?.currentPlan?.id === 'starter' ? 'Active Plan' : 'Downgrade to Starter'}
            </button>
          </div>

          {/* Growth Plan */}
          <div
            className={`p-6 bg-white rounded-2xl border transition-all ${
              subscription?.currentPlan?.id === 'growth'
                ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : 'border-slate-200/80 shadow-sm'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900">Growth Plan</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Best Value
              </span>
            </div>
            <p className="text-xs text-slate-500">For Scaling Companies & High Velocity Deals</p>
            <div className="text-3xl font-extrabold text-slate-900 my-4">
              $79<span className="text-xs font-normal text-slate-400">/month</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />{' '}
                <strong>Max 15 Staff Members</strong>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> 5,000 Leads Storage
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> Dot-Matrix Analytics
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> Outreach Activity Matrix
              </li>
            </ul>
            <button
              onClick={() => handleUpgradePlan('growth')}
              disabled={subscription?.currentPlan?.id === 'growth'}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                subscription?.currentPlan?.id === 'growth'
                  ? 'bg-slate-100 text-slate-400 cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {subscription?.currentPlan?.id === 'growth' ? 'Active Plan' : 'Switch to Growth'}
            </button>
          </div>

          {/* Enterprise Plan */}
          <div
            className={`p-6 bg-white rounded-2xl border transition-all ${
              subscription?.currentPlan?.id === 'enterprise'
                ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : 'border-slate-200/80 shadow-sm'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900">Enterprise Plan</h3>
              {subscription?.currentPlan?.id === 'enterprise' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active Plan
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Full Power for Global Sales Organizations</p>
            <div className="text-3xl font-extrabold text-slate-900 my-4">
              $199<span className="text-xs font-normal text-slate-400">/month</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />{' '}
                <strong>Unlimited Staff Members</strong>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> Unlimited Leads Storage
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> Dedicated Account Manager
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> Full Security Audit Logs
              </li>
            </ul>
            <button
              onClick={() => handleUpgradePlan('enterprise')}
              disabled={subscription?.currentPlan?.id === 'enterprise'}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                subscription?.currentPlan?.id === 'enterprise'
                  ? 'bg-slate-100 text-slate-400 cursor-default'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {subscription?.currentPlan?.id === 'enterprise' ? 'Active Plan' : 'Upgrade to Enterprise'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: System Health & Performance */}
      {activeSubTab === 'health' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Node.js Runtime Metrics</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Platform</span>
                <span className="font-semibold text-slate-900">
                  Node.js {systemHealth?.nodeVersion || 'v22'} (Express)
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Heap Memory Used</span>
                <span className="font-bold text-emerald-600">
                  {systemHealth?.memory?.heapUsedMb || '9.18'} MB
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Server Uptime</span>
                <span className="font-semibold text-slate-900">{systemHealth?.uptimeHuman || 'Active'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Database Engine</span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  MongoDB Atlas + Mongoose
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">API Throughput & Latency</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Average Response Latency</span>
                <span className="font-extrabold text-emerald-600">
                  {systemHealth?.metrics?.avgLatencyMs || '1.71'} ms
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Total API Requests Processed</span>
                <span className="font-semibold text-slate-900">{systemHealth?.metrics?.totalRequests || 42}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Security Rate Limiting</span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active (500 req/15min)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Audit Logs */}
      {activeSubTab === 'audit' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Audit Log Trail ({auditLogs.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{log.actor_name}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">{log.details}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">{log.ip_address}</td>
                    <td className="py-3 px-4 text-right text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Company Settings */}
      {activeSubTab === 'settings' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm max-w-xl space-y-4">
          <h3 className="text-base font-bold text-slate-900">Organization & Target Quotas</h3>

          {settingsSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold">
              Company settings updated successfully!
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Company / Organization Name
              </label>
              <input
                type="text"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Industry
              </label>
              <input
                type="text"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={settings.industry}
                onChange={(e) => setSettings({ ...settings, industry: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Monthly Revenue Quota Target ($ USD)
              </label>
              <input
                type="number"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={settings.revenueTargetMonthly}
                onChange={(e) => setSettings({ ...settings, revenueTargetMonthly: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              Save Organization Settings
            </button>
          </form>
        </div>
      )}

      {/* Modal: Add Team Member */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Team Member / Staff"
      >
        {quotaError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2 mb-3">
            <AlertCircle size={16} />
            <span>{quotaError}</span>
          </div>
        )}

        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Member Identity *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNewUser({ ...newUser, persona: 'staff', role: 'agent' })}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  newUser.persona === 'staff'
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs text-slate-900">Staff Member</div>
                <div className="text-[11px] text-slate-500">Sales Rep / Account Exec</div>
              </button>

              <button
                type="button"
                onClick={() => setNewUser({ ...newUser, persona: 'owner', role: 'admin' })}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  newUser.persona === 'owner'
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs text-slate-900">Co-Owner / Admin</div>
                <div className="text-[11px] text-slate-500">Full Admin Privileges</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              required
              type="text"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="e.g. David Williams"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <input
              required
              type="email"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="david@travel-trade.com"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Role
              </label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Department
              </label>
              <input
                type="text"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="Enterprise Sales"
                value={newUser.department}
                onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer"
            >
              Add Member
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Upgrade Plan */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title="Manage & Upgrade Subscription Plan"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Choose a tier to increase staff headcount limit and unlock advanced CRM features:
          </p>
          <div className="space-y-3">
            {[
              { id: 'starter', name: 'Starter Plan', price: '$29/mo', staff: 'Up to 3 Staff Members' },
              { id: 'growth', name: 'Growth Plan (Popular)', price: '$79/mo', staff: 'Up to 15 Staff Members' },
              { id: 'enterprise', name: 'Enterprise Plan', price: '$199/mo', staff: 'Unlimited Staff Members' },
            ].map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  subscription?.currentPlan?.id === p.id
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.staff}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-sm text-slate-900">{p.price}</span>
                  <button
                    onClick={() => handleUpgradePlan(p.id)}
                    disabled={subscription?.currentPlan?.id === p.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      subscription?.currentPlan?.id === p.id
                        ? 'bg-slate-100 text-slate-400 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {subscription?.currentPlan?.id === p.id ? 'Active' : 'Select Plan'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
