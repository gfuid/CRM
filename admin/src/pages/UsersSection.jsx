import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Mail,
  Phone,
  Building2,
  AlertTriangle,
  Crown,
  Shield,
  CheckCircle2,
  Lock,
  UserCheck,
  Plus,
  Minus,
  ChevronRight,
  ArrowUpRight,
  Eye,
  SlidersHorizontal,
  Sparkles,
  Layers,
  List
} from 'lucide-react';
import Modal from '../components/Modal';
import OwnerStaffHierarchyView from '../components/OwnerStaffHierarchyView';

export default function UsersSection({
  users = [],
  onCreateUser,
  onUpdateRole,
  onToggleStatus,
  onUpdateStaffLimit,
}) {
  const [viewMode, setViewMode] = useState('hierarchy'); // 'hierarchy' | 'flat'
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingStaffLimitUser, setEditingStaffLimitUser] = useState(null);
  const [selectedOwnerForStaffList, setSelectedOwnerForStaffList] = useState(null);
  const [newStaffLimitValue, setNewStaffLimitValue] = useState(2);
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);

  // Form state
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent',
    department: 'Commodity Sales & Export Operations',
    phone: '',
  });
  const [errorMsg, setErrorMsg] = useState('');

  const currentCount = users.length;
  const activeCount = users.filter((u) => u.is_active).length;
  const ownersCount = users.filter((u) => u.persona === 'owner' || u.is_owner || u.role === 'admin').length;
  const adminsCount = users.filter((u) => u.role === 'admin').length;
  const managersCount = users.filter((u) => u.role === 'manager').length;
  const agentsCount = users.filter((u) => u.role === 'agent').length;

  const filteredUsers = users.filter((u) => {
    const isOwner = u.persona === 'owner' || u.is_owner || u.role === 'admin';
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(search.toLowerCase()));

    if (filterRole === 'all') return matchesSearch;
    if (filterRole === 'owner') return matchesSearch && isOwner;
    if (filterRole === 'staff') return matchesSearch && !isOwner;
    if (filterRole === 'inactive') return matchesSearch && !u.is_active;
    return matchesSearch && u.role === filterRole;
  });

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      await onCreateUser(newUser);
      setIsAddUserModalOpen(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'agent',
        department: 'Commodity Sales & Export Operations',
        phone: '',
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create user');
    }
  };

  const handleOpenStaffLimitModal = (user) => {
    setEditingStaffLimitUser(user);
    setNewStaffLimitValue(user.staff_limit !== undefined ? user.staff_limit : 2);
  };

  const handleSaveStaffLimit = async (e) => {
    e.preventDefault();
    if (!editingStaffLimitUser || !onUpdateStaffLimit) return;
    setIsUpdatingLimit(true);
    try {
      await onUpdateStaffLimit(editingStaffLimitUser.id, newStaffLimitValue);
      setEditingStaffLimitUser(null);
      if (selectedOwnerForStaffList && selectedOwnerForStaffList.id === editingStaffLimitUser.id) {
        setSelectedOwnerForStaffList((prev) => ({
          ...prev,
          staff_limit: newStaffLimitValue,
        }));
      }
    } catch (err) {
      console.error('Failed to update staff limit:', err);
    } finally {
      setIsUpdatingLimit(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'manager':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* 1. Header Banner & Quick Action (Zentra & Kristin Watson Style) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
            <Users size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight m-0">
                Personnel & Business Owners
              </h2>
              <span className="text-xs px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold">
                {activeCount} Active
              </span>
              <span className="text-xs text-slate-400 font-semibold">({currentCount} Total Accounts)</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              <span className="font-extrabold text-amber-700">{ownersCount} Business Owners</span> &bull;{' '}
              {adminsCount} Admins &bull; {managersCount} Managers &bull; {agentsCount} Staff Reps
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setIsAddUserModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <UserPlus size={15} />
          <span>Add Team Member</span>
        </button>
      </div>

      {/* 2. Main Search & Pill Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-5 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3.5">
          {/* Rounded-full Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, department..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-full border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all font-medium text-slate-800"
            />
          </div>

          {/* Zentra-style Black Pill Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar bg-slate-100/90 p-1 rounded-full text-xs font-semibold shrink-0">
            {[
              { id: 'all', label: 'All Users' },
              { id: 'owner', label: '👑 Business Owners' },
              { id: 'staff', label: 'Staff Reps' },
              { id: 'admin', label: 'Admins' },
              { id: 'manager', label: 'Managers' },
              { id: 'agent', label: 'Agents' },
              { id: 'inactive', label: 'Inactive' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterRole(tab.id)}
                className={`px-3.5 py-1.5 rounded-full capitalize whitespace-nowrap transition-all cursor-pointer ${
                  filterRole === tab.id
                    ? 'bg-slate-900 text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Switcher: Hierarchy (Default) vs Flat Directory */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-slate-50/90 rounded-2xl border border-slate-200/70">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl text-xs font-bold">
            <button
              onClick={() => setViewMode('hierarchy')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                viewMode === 'hierarchy'
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crown size={14} className={viewMode === 'hierarchy' ? 'text-amber-400' : 'text-slate-400'} />
              <span>👑 Owners & Staff Hierarchy (Underneath View)</span>
            </button>

            <button
              onClick={() => setViewMode('flat')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                viewMode === 'flat'
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List size={14} />
              <span>📋 All Personnel Table</span>
            </button>
          </div>

          <div className="text-[11px] font-semibold text-slate-500 px-2">
            {viewMode === 'hierarchy'
              ? 'Click any owner to view/hide their staff underneath & adjust quotas directly'
              : 'Flat search of all team accounts'}
          </div>
        </div>

        {/* Hierarchy View (Requested by User: Har Owner ke niche unke staff ke details!) */}
        {viewMode === 'hierarchy' ? (
          <OwnerStaffHierarchyView
            users={filteredUsers}
            onUpdateStaffLimit={onUpdateStaffLimit}
            onUpdateRole={onUpdateRole}
            onToggleStatus={onToggleStatus}
            onAddStaffForOwner={(owner) => {
              setNewUser((prev) => ({
                ...prev,
                company_id: owner?.company_id || '',
              }));
              setIsAddUserModalOpen(true);
            }}
          />
        ) : (
          <>
            {/* 3. MOBILE CARDS VIEW */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No team members matching your search criteria.
                </div>
              ) : (
            filteredUsers.map((u) => {
              const isOwner = u.persona === 'owner' || u.is_owner || u.role === 'admin';
              const staffCount = u.staff_count !== undefined ? u.staff_count : (u.staff_list ? u.staff_list.length : 0);
              const quota = u.staff_limit !== undefined ? u.staff_limit : 2;

              return (
                <div key={u.id} className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`}
                        alt={u.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isOwner && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Crown size={10} /> Owner
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">ID: {u.id}</div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        u.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>{u.is_active ? 'Active' : 'Inactive'}</span>
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-slate-400" />
                      <span className="font-semibold text-slate-800 truncate">{u.email}</span>
                    </div>
                    {u.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-slate-400" />
                        <span>{u.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Building2 size={13} className="text-slate-400" />
                      <span className="text-slate-500">{u.department || 'Commodity Sales'}</span>
                    </div>
                  </div>

                  {isOwner && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => setSelectedOwnerForStaffList(u)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        <Users size={13} />
                        <span>{staffCount} Staff (View)</span>
                      </button>
                      <button
                        onClick={() => handleOpenStaffLimitModal(u)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                      >
                        <Crown size={13} />
                        <span>Quota: {quota} Seats</span>
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500">Role:</span>
                      <select
                        value={u.role}
                        onChange={(e) => onUpdateRole(u.id, e.target.value)}
                        disabled={isOwner}
                        className={`text-[11px] font-bold uppercase rounded-full px-3 py-1 border focus:outline-none transition-all ${getRoleBadge(
                          u.role
                        )} ${isOwner ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="agent">Agent</option>
                      </select>
                    </div>

                    <button
                      onClick={() => onToggleStatus(u.id)}
                      disabled={isOwner}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                        isOwner
                          ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                          : u.is_active
                          ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                          : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. DESKTOP TABLE VIEW (Refined & Clean) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px] border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-extrabold text-[10px]">
                <th className="pb-3 pl-3">Member</th>
                <th className="pb-3">Contact Email</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Role Privilege</th>
                <th className="pb-3 text-center">Employees (Team)</th>
                <th className="pb-3 text-center">Staff Quota</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 text-xs">
                    No team members matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isOwner = u.persona === 'owner' || u.is_owner || u.role === 'admin';
                  const staffCount = u.staff_count !== undefined ? u.staff_count : (u.staff_list ? u.staff_list.length : 0);
                  const quota = u.staff_limit !== undefined ? u.staff_limit : 2;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 pl-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`}
                            alt={u.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isOwner && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <Crown size={10} />
                                  <span>Owner</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>ID: {u.id}</span>
                              {u.phone && <span>&bull; {u.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <Mail size={13} className="text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <span className="font-medium text-slate-600">{u.department || 'Commodity Sales'}</span>
                      </td>

                      <td className="py-3.5">
                        <select
                          value={u.role}
                          onChange={(e) => onUpdateRole(u.id, e.target.value)}
                          disabled={isOwner}
                          className={`text-[11px] font-bold uppercase tracking-wider rounded-full px-3 py-1 border focus:outline-none transition-all ${getRoleBadge(
                            u.role
                          )} ${isOwner ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:border-slate-400'}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="agent">Agent</option>
                        </select>
                      </td>

                      {/* Employees (Team) Column */}
                      <td className="py-3.5 text-center">
                        {isOwner ? (
                          <button
                            onClick={() => setSelectedOwnerForStaffList(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs transition-all cursor-pointer group"
                            title="Click to view employees registered under this owner"
                          >
                            <Users size={13} className="text-blue-500 group-hover:scale-110 transition-transform" />
                            <span>{staffCount} Staff</span>
                            <Eye size={12} className="text-blue-400 ml-0.5" />
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Team Rep</span>
                        )}
                      </td>

                      {/* Staff Quota Column */}
                      <td className="py-3.5 text-center">
                        {isOwner ? (
                          <button
                            onClick={() => handleOpenStaffLimitModal(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs transition-all cursor-pointer group"
                            title="Super Admin: Click to increase or adjust staff limit quota for this Owner"
                          >
                            <Crown size={13} className="text-amber-600 group-hover:rotate-12 transition-transform" />
                            <span>{quota} Seats</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-950 font-extrabold ml-0.5">Edit</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <span>{u.is_active ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 text-right pr-3">
                        {isOwner ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenStaffLimitModal(u)}
                              className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                              title="Increase or change staff quota"
                            >
                              <Plus size={11} />
                              <span>Quota</span>
                            </button>
                            <button
                              onClick={() => setSelectedOwnerForStaffList(u)}
                              className="px-3 py-1 rounded-full text-[11px] font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
                              title="View employees"
                            >
                              Team
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onToggleStatus(u.id)}
                            disabled={isOwner}
                            className={`px-3.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                              isOwner
                                ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                                : u.is_active
                                ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
          </>
        )}
      </div>

      {/* Modal: Add Team Member */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Add New Team Member"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Jessica Williams"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Work Email (Login ID) *</label>
            <input
              type="email"
              required
              placeholder="jessica@travel-trade.com"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Login Password *</label>
            <input
              type="text"
              required
              placeholder="Set login password for this staff"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Role Privilege</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-bold"
              >
                <option value="agent">Agent (Sales Rep)</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                placeholder="+1 (555) 000-0000"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
            <input
              type="text"
              placeholder="e.g. Commodity Sales & Export Operations"
              value={newUser.department}
              onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
              className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddUserModalOpen(false)}
              className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              Save Member
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Adjust Owner Staff Seat Limit (Super Admin Control) */}
      <Modal
        isOpen={!!editingStaffLimitUser}
        onClose={() => setEditingStaffLimitUser(null)}
        title={`Adjust Staff Seat Limit: ${editingStaffLimitUser?.name || 'Owner'}`}
      >
        <form onSubmit={handleSaveStaffLimit} className="space-y-4">
          <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
            <Crown size={18} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-amber-950">Super Admin Authority</div>
              <p className="mt-0.5 text-amber-800 leading-relaxed font-medium">
                By default, business owners can register up to <strong>2 staff members</strong>. As Super Admin, you have full authority to increase or customize the allowed staff quota for this company.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Allowed Staff Seats Count *
            </label>
            <input
              type="number"
              min="1"
              max="9999"
              required
              value={newStaffLimitValue}
              onChange={(e) => setNewStaffLimitValue(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2.5 text-sm font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>

          {/* Quick Presets (Zentra Style Pills) */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 mb-2">Quick Presets:</div>
            <div className="flex flex-wrap gap-2">
              {[2, 3, 5, 10, 15, 25, 50, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNewStaffLimitValue(preset)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                    newStaffLimitValue === preset
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset} Seats {preset === 2 && '(Default Limit)'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingStaffLimitUser(null)}
              className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingLimit}
              className="px-6 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              {isUpdatingLimit ? 'Saving...' : 'Update Staff Limit'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Owner's Employees / Staff Members (Team Directory) */}
      <Modal
        isOpen={!!selectedOwnerForStaffList}
        onClose={() => setSelectedOwnerForStaffList(null)}
        title={`Team Directory: ${selectedOwnerForStaffList?.name || 'Owner'}`}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Users size={20} />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-900">
                  {selectedOwnerForStaffList?.name} ({selectedOwnerForStaffList?.email})
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Staff Quota:{' '}
                  <span className="font-extrabold text-blue-700">
                    {selectedOwnerForStaffList?.staff_count !== undefined
                      ? selectedOwnerForStaffList.staff_count
                      : selectedOwnerForStaffList?.staff_list?.length || 0}
                  </span>{' '}
                  /{' '}
                  <span className="font-extrabold text-slate-800">
                    {selectedOwnerForStaffList?.staff_limit !== undefined
                      ? selectedOwnerForStaffList.staff_limit
                      : 2}
                  </span>{' '}
                  Seats Used
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                const owner = selectedOwnerForStaffList;
                handleOpenStaffLimitModal(owner);
              }}
              className="px-4 py-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <Crown size={13} className="text-amber-700" />
              <span>Increase Quota</span>
            </button>
          </div>

          <div>
            <div className="text-xs font-extrabold text-slate-700 mb-2.5">
              Registered Staff Members ({selectedOwnerForStaffList?.staff_list?.length || 0}):
            </div>

            {(!selectedOwnerForStaffList?.staff_list || selectedOwnerForStaffList.staff_list.length === 0) ? (
              <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                <p className="text-xs font-bold text-slate-600">No staff members added yet</p>
                <p className="text-[11px] text-slate-400">
                  This business owner currently has 0 registered employees out of {selectedOwnerForStaffList?.staff_limit !== undefined ? selectedOwnerForStaffList.staff_limit : 2} allowed seats.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                {selectedOwnerForStaffList.staff_list.map((emp) => (
                  <div key={emp.id} className="p-3.5 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xs shrink-0">
                        {emp.name ? emp.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 truncate">{emp.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{emp.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getRoleBadge(emp.role)}`}>
                        {emp.role || 'Agent'}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSelectedOwnerForStaffList(null)}
              className="px-5 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
