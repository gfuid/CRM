import React, { useState } from 'react';
import {
  Users,
  Crown,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Mail,
  Phone,
  Building2,
  UserCheck,
  Shield,
  Eye,
  CheckCircle2,
  AlertTriangle,
  UserPlus
} from 'lucide-react';

export default function OwnerStaffHierarchyView({
  users = [],
  onUpdateStaffLimit,
  onUpdateRole = () => {},
  onToggleStatus = () => {},
  onAddStaffForOwner = () => {},
}) {
  // Store expanded owner IDs. Default to having all owners expanded so staff are immediately visible!
  const [expandedOwners, setExpandedOwners] = useState({});
  const [updatingQuotaId, setUpdatingQuotaId] = useState(null);

  // Separate owners and staff
  // An owner is anyone with persona 'owner', role 'admin', is_owner flag, or having a staff quota
  const owners = users.filter((u) => u.persona === 'owner' || u.role === 'admin' || u.is_owner);

  // If no explicit owners are found, treat all users as potential business accounts
  const displayOwners = owners.length > 0 ? owners : users;

  const toggleExpand = (ownerId) => {
    setExpandedOwners((prev) => ({
      ...prev,
      [ownerId]: prev[ownerId] === undefined ? false : !prev[ownerId],
    }));
  };

  const isOwnerExpanded = (ownerId) => {
    // Default to true (expanded) so the user immediately sees staff underneath!
    return expandedOwners[ownerId] !== false;
  };

  // Get staff for a specific owner
  const getStaffForOwner = (owner) => {
    if (owner.staff_list && Array.isArray(owner.staff_list) && owner.staff_list.length > 0) {
      return owner.staff_list;
    }

    // Otherwise, match by created_by or company_id from users list
    return users.filter(
      (s) =>
        s.id !== owner.id &&
        s.persona !== 'owner' &&
        s.role !== 'admin' &&
        (s.created_by === owner.id ||
          s.created_by === owner.email ||
          (owner.company_id && s.company_id === owner.company_id) ||
          // Fallback: if there's only one owner, all non-admin staff belong to this owner
          displayOwners.length === 1)
    );
  };

  // Directly increase staff quota counting
  const handleIncreaseQuota = async (owner, e) => {
    if (e) e.stopPropagation();
    const currentLimit = owner.staff_limit !== undefined ? Number(owner.staff_limit) : 2;
    const newLimit = currentLimit + 1;
    setUpdatingQuotaId(owner.id);
    try {
      if (onUpdateStaffLimit) {
        await onUpdateStaffLimit(owner.id, newLimit);
      }
    } finally {
      setUpdatingQuotaId(null);
    }
  };

  // Directly decrease staff quota counting
  const handleDecreaseQuota = async (owner, e) => {
    if (e) e.stopPropagation();
    const currentLimit = owner.staff_limit !== undefined ? Number(owner.staff_limit) : 2;
    if (currentLimit <= 1) return;
    const newLimit = currentLimit - 1;
    setUpdatingQuotaId(owner.id);
    try {
      if (onUpdateStaffLimit) {
        await onUpdateStaffLimit(owner.id, newLimit);
      }
    } finally {
      setUpdatingQuotaId(null);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  if (displayOwners.length === 0) {
    return (
      <div className="py-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
        No business owners registered yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayOwners.map((owner) => {
        const staff = getStaffForOwner(owner);
        const staffLimit = owner.staff_limit !== undefined ? Number(owner.staff_limit) : 2;
        const expanded = isOwnerExpanded(owner.id);
        const isQuotaFull = staff.length >= staffLimit;

        return (
          <div
            key={owner.id}
            className="bg-white rounded-3xl border border-slate-200/90 shadow-card hover:border-slate-300 transition-all overflow-hidden"
          >
            {/* 1. PRIMARY OWNER ROW (Always Visible) */}
            <div
              onClick={() => toggleExpand(owner.id)}
              className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors bg-gradient-to-r from-amber-50/20 via-white to-white"
            >
              {/* Owner Identity */}
              <div className="flex items-center gap-3.5 min-w-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(owner.id);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition-transform shadow-2xs"
                  title={expanded ? 'Collapse Staff' : 'Expand Staff'}
                >
                  {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                <div className="relative shrink-0">
                  <img
                    src={
                      owner.avatar_url ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(owner.name)}`
                    }
                    alt={owner.name}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-300 shadow-sm"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Crown size={11} />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight truncate m-0">
                      {owner.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                      <Crown size={10} /> Business Owner
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        owner.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${owner.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}
                      />
                      <span>{owner.is_active ? 'Active' : 'Inactive'}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 font-medium mt-1">
                    <span className="flex items-center gap-1 truncate text-slate-700 font-semibold">
                      <Mail size={12} className="text-slate-400" />
                      {owner.email}
                    </span>
                    {owner.phone && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Phone size={12} />
                        {owner.phone}
                      </span>
                    )}
                    <span className="text-slate-400 truncate">
                      {owner.department || 'Executive Management'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Owner Staff Counting & Quota Badhane Ka Control (Direct Buttons) */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100"
              >
                {/* Staff Count Badge */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExpand(owner.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors shadow-2xs"
                  >
                    <Users size={13} className="text-blue-500" />
                    <span>{staff.length} Staff</span>
                    <span className="text-[10px] text-blue-500 font-normal">
                      ({expanded ? 'Hide ▲' : 'View ▼'})
                    </span>
                  </button>
                </div>

                {/* Quota Counter with Direct [+] and [-] buttons! */}
                <div className="flex items-center gap-1 bg-amber-50/80 border border-amber-300/80 rounded-2xl p-1 shadow-2xs">
                  <span className="text-[11px] font-black text-amber-900 px-2 flex items-center gap-1">
                    <Crown size={12} className="text-amber-700" />
                    <span>Quota:</span>
                  </span>

                  {/* Decrease Button */}
                  <button
                    type="button"
                    disabled={updatingQuotaId === owner.id || staffLimit <= 1}
                    onClick={(e) => handleDecreaseQuota(owner, e)}
                    className="w-7 h-7 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center font-black transition-all disabled:opacity-40 cursor-pointer shadow-xs active:scale-95"
                    title="Staff Quota Ghatao (-1)"
                  >
                    <Minus size={12} />
                  </button>

                  {/* Quota Number Display */}
                  <div className="px-2.5 py-1 font-black text-sm text-slate-900 min-w-[36px] text-center">
                    {staffLimit}
                  </div>

                  {/* Increase Button (STAFF COUNTING BADHAO) */}
                  <button
                    type="button"
                    disabled={updatingQuotaId === owner.id}
                    onClick={(e) => handleIncreaseQuota(owner, e)}
                    className="w-7 h-7 rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center font-black transition-all cursor-pointer shadow-xs active:scale-95 hover:scale-105"
                    title="Staff Quota Badhao (+1 Seat)"
                  >
                    <Plus size={14} />
                  </button>

                  <span className="text-[10px] font-extrabold text-amber-800 pr-2">Seats</span>
                </div>

                {/* Quota Usage Pill */}
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                    isQuotaFull
                      ? 'bg-rose-50 text-rose-700 border-rose-200 font-extrabold'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {staff.length} / {staffLimit} Used {isQuotaFull ? '(Full)' : ''}
                </span>
              </div>
            </div>

            {/* 2. EXPANDED SECTION NICHE (Underneath this Owner: Staff Details) */}
            {expanded && (
              <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      Staff Members under {owner.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200/80 text-slate-700">
                      {staff.length} of {staffLimit} seats assigned
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleIncreaseQuota(owner)}
                      className="px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={11} />
                      <span>Increase Quota (+1)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onAddStaffForOwner(owner)}
                      className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus size={12} />
                      <span>Add Staff</span>
                    </button>
                  </div>
                </div>

                {/* If Owner has 0 Staff */}
                {staff.length === 0 ? (
                  <div className="py-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-4 space-y-1">
                    <p className="text-xs font-bold text-slate-600">
                      No staff members registered under this owner yet.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Owner is allowed up to <strong>{staffLimit} staff members</strong>. Use the "Add Staff" button to register an employee.
                    </p>
                  </div>
                ) : (
                  /* Staff Members Sub-Table */
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-extrabold text-[10px] bg-slate-50/50">
                          <th className="py-2.5 pl-3">Employee Name</th>
                          <th className="py-2.5">Email</th>
                          <th className="py-2.5">Role</th>
                          <th className="py-2.5">Department</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5 text-right pr-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {staff.map((emp) => (
                          <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 pl-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xs shrink-0 border border-emerald-200">
                                  {emp.name ? emp.name.charAt(0).toUpperCase() : 'S'}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{emp.name}</div>
                                  <div className="text-[10px] text-slate-400">ID: {emp.id}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 font-medium text-slate-700">
                              <div className="flex items-center gap-1">
                                <Mail size={12} className="text-slate-400" />
                                <span>{emp.email}</span>
                              </div>
                            </td>

                            <td className="py-2.5">
                              <select
                                value={emp.role || 'agent'}
                                onChange={(e) => onUpdateRole(emp.id, e.target.value)}
                                className={`text-[10px] font-bold uppercase rounded-lg px-2 py-0.5 border focus:outline-none cursor-pointer ${getRoleBadge(
                                  emp.role
                                )}`}
                              >
                                <option value="agent">Agent</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>

                            <td className="py-2.5 text-slate-500 font-medium">
                              {emp.department || 'Commodity Sales'}
                            </td>

                            <td className="py-2.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  emp.is_active
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    emp.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                                  }`}
                                />
                                <span>{emp.is_active ? 'Active' : 'Inactive'}</span>
                              </span>
                            </td>

                            <td className="py-2.5 text-right pr-3">
                              <button
                                type="button"
                                onClick={() => onToggleStatus(emp.id)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                  emp.is_active
                                    ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                    : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                }`}
                              >
                                {emp.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
