import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Mail,
  AlertTriangle,
  Crown
} from 'lucide-react';
import Modal from '../components/Modal';

export default function UsersSection({ users = [], onCreateUser, onUpdateRole, onToggleStatus }) {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // Form state
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'agent',
    department: 'Sales Outreach',
    phone: '',
  });
  const [errorMsg, setErrorMsg] = useState('');

  const currentCount = users.length;
  const activeCount = users.filter((u) => u.is_active).length;
  const adminsCount = users.filter((u) => u.role === 'admin').length;
  const managersCount = users.filter((u) => u.role === 'manager').length;
  const agentsCount = users.filter((u) => u.role === 'agent').length;

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(search.toLowerCase()));

    if (filterRole === 'all') return matchesSearch;
    if (filterRole === 'owner') return matchesSearch && u.persona === 'owner';
    if (filterRole === 'staff') return matchesSearch && u.persona !== 'owner';
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
        role: 'agent',
        department: 'Sales Outreach',
        phone: '',
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create user');
    }
  };

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
      {/* Team Summary Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 border-l-4 border-l-emerald-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Users size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">Team & Staff Directory:</span>
                <span className="font-extrabold text-sm text-slate-800">
                  {currentCount} Registered Personnel
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  {activeCount} Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {adminsCount} Admins &bull; {managersCount} Managers &bull; {agentsCount} Sales Reps
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setErrorMsg('');
              setIsAddUserModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all shrink-0"
          >
            <UserPlus size={15} />
            <span>Add Team Member</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, department..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'all', label: 'All Users' },
              { id: 'admin', label: 'Admins' },
              { id: 'manager', label: 'Managers' },
              { id: 'agent', label: 'Agents' },
              { id: 'inactive', label: 'Inactive' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterRole(tab.id)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  filterRole === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="pb-3 pl-2">Member</th>
                <th className="pb-3">Contact Email</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Role Privilege</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    No team members matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isOwner = u.persona === 'owner';
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 pl-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`}
                            alt={u.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isOwner && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
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
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Mail size={13} className="text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <div className="font-medium text-slate-700">{u.department || 'Sales Outreach'}</div>
                      </td>

                      <td className="py-3.5">
                        <select
                          value={u.role}
                          onChange={(e) => onUpdateRole(u.id, e.target.value)}
                          disabled={isOwner}
                          className={`text-[11px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1 border focus:outline-none transition-all ${getRoleBadge(
                            u.role
                          )} ${isOwner ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:border-slate-400'}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="agent">Agent</option>
                        </select>
                      </td>

                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
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

                      <td className="py-3.5 text-right pr-2">
                        <button
                          onClick={() => onToggleStatus(u.id)}
                          disabled={isOwner}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                            isOwner
                              ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                              : u.is_active
                              ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                              : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Team Member */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Add New Team Member"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Jessica Williams"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Work Email</label>
            <input
              type="email"
              required
              placeholder="jessica@company.com"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">System Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="agent">Agent (Sales Rep)</option>
                <option value="manager">Manager (Team Lead)</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                placeholder="Enterprise Outreach"
                value={newUser.department}
                onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone (Optional)</label>
            <input
              type="text"
              placeholder="+1 (555) 012-3456"
              value={newUser.phone}
              onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500">
            <strong>Access Level:</strong> The user will receive account credentials and immediate access according to their designated system role.
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddUserModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
