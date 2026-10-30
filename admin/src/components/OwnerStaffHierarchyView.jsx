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
  UserPlus,
  Lock,
  Trash2,
  HardDrive,
  ArrowRightLeft,
  AtSign,
} from 'lucide-react';

export default function OwnerStaffHierarchyView({
  users = [],
  onUpdateStaffLimit,
  onUpdateRole = () => {},
  onToggleStatus = () => {},
  onAddStaffForOwner = () => {},
  onResetPassword = null,
  onToggleFeature = null,
  onDeleteOwner = null,
  onSetStorageLimit = null,
  onDeleteStaff = null,
  onChangeEmail = null,
  onMoveOwner = null,
  allOwners = [],
}) {
  const [moving, setMoving] = useState(null); // owner being moved
  const [moveTarget, setMoveTarget] = useState('');
  const [freeEmail, setFreeEmail] = useState(true);
  const [busy, setBusy] = useState(false);

  const STORAGE_STEPS = [10, 25, 50, 100, 200, 300, 500, 1000, 2000];
  const changeStorage = async (owner, dir) => {
    const cur = Number(owner.storage?.limit_mb || owner.storage_limit_mb || 50);
    const next = dir > 0 ? (STORAGE_STEPS.find((v) => v > cur) || cur + 500) : ([...STORAGE_STEPS].reverse().find((v) => v < cur) || cur);
    if (next === cur || !onSetStorageLimit) return;
    setBusy(true);
    try { await onSetStorageLimit(owner.id, next); } finally { setBusy(false); }
  };
  const typeStorage = async (owner) => {
    const cur = Number(owner.storage?.limit_mb || owner.storage_limit_mb || 50);
    const v = window.prompt(`Storage limit for ${owner.company_name || owner.name} in MB (1 – 10240):`, String(cur));
    if (v === null) return;
    const mb = Number(v);
    if (!Number.isFinite(mb) || mb < 1 || mb > 10240) { window.alert('Enter a number between 1 and 10240'); return; }
    setBusy(true);
    try { await onSetStorageLimit(owner.id, mb); } finally { setBusy(false); }
  };
  const changeEmail = async (u) => {
    if (!onChangeEmail) return;
    const v = window.prompt(`New login email for ${u.name} (current: ${u.email}):`, u.email);
    if (v === null || !v.trim() || v.trim().toLowerCase() === String(u.email).toLowerCase()) return;
    setBusy(true);
    try { await onChangeEmail(u.id, v.trim()); } finally { setBusy(false); }
  };
  const deleteStaff = async (emp, owner) => {
    if (!onDeleteStaff) return;
    if (!window.confirm(`Delete staff ${emp.name} (${emp.email}) from ${owner.company_name || owner.name}?\n\nTheir leads stay with the owner. This cannot be undone.`)) return;
    setBusy(true);
    try { await onDeleteStaff(emp.id); } finally { setBusy(false); }
  };
  const doMove = async () => {
    if (!moving || !moveTarget || !onMoveOwner) return;
    setBusy(true);
    try {
      const r = await onMoveOwner(moving.id, moveTarget, freeEmail);
      if (r) { setMoving(null); setMoveTarget(''); }
    } finally { setBusy(false); }
  };

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
    let staff = (owner.staff_list && Array.isArray(owner.staff_list)) ? [...owner.staff_list] : [];

    if (staff.length === 0) {
      const genericCompanyIds = ['comp_1', 'comp_traveltrade_1', 'comp_stellarsync_1', 'comp_default', ''];
      staff = users.filter((s) => {
        if (s.id === owner.id || s.persona === 'owner' || s.role === 'admin') return false;

        // Primary check: explicitly created by this owner
        if (s.created_by) {
          return (
            s.created_by === owner.id ||
            (owner.email && s.created_by.toLowerCase() === owner.email.toLowerCase())
          );
        }

        // Secondary check: specific company_id match (only non-generic)
        if (
          owner.company_id &&
          !genericCompanyIds.includes(owner.company_id) &&
          s.company_id === owner.company_id
        ) {
          return true;
        }

        return false;
      });
    }

    return staff;
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
              className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
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
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                  <span className="text-[11px] font-semibold text-slate-700 px-2 flex items-center gap-1">
                    <Crown size={12} className="text-slate-400" />
                    <span>Quota:</span>
                  </span>

                  {/* Decrease Button */}
                  <button
                    type="button"
                    disabled={updatingQuotaId === owner.id || staffLimit <= 1}
                    onClick={(e) => handleDecreaseQuota(owner, e)}
                    className="w-7 h-7 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-black transition-all disabled:opacity-40 cursor-pointer shadow-xs active:scale-95"
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
                    className="w-7 h-7 rounded-md bg-slate-900 hover:bg-slate-700 text-white flex items-center justify-center font-black transition-all cursor-pointer shadow-xs active:scale-95 hover:scale-105"
                    title="Staff Quota Badhao (+1 Seat)"
                  >
                    <Plus size={14} />
                  </button>

                  <span className="text-[10px] font-semibold text-slate-500 pr-2">Seats</span>
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

                {/* Storage limit: [-] used / limit [+] (click the number to type any value) */}
                {onSetStorageLimit && (
                  <div className={`flex items-center gap-1 rounded-lg p-1 border ${Number(owner.storage?.percent) >= 90 ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'}`}>
                    <span className="text-[11px] font-semibold text-slate-700 px-1.5 flex items-center gap-1">
                      <HardDrive size={12} /> Storage
                    </span>
                    <button type="button" disabled={busy} onClick={() => changeStorage(owner, -1)} className="w-7 h-7 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center cursor-pointer disabled:opacity-40" title="Lower storage limit">
                      <Minus size={12} />
                    </button>
                    <button type="button" disabled={busy} onClick={() => typeStorage(owner)} className="px-2 py-1 text-[11px] font-black text-slate-900 cursor-pointer hover:underline" title="Click to type a limit">
                      {owner.storage ? `${owner.storage.used_mb} / ${owner.storage.limit_mb} MB` : `${owner.storage_limit_mb || 50} MB`}
                    </button>
                    <button type="button" disabled={busy} onClick={() => changeStorage(owner, 1)} className="w-7 h-7 rounded-md bg-slate-900 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer disabled:opacity-40" title="Raise storage limit">
                      <Plus size={13} />
                    </button>
                  </div>
                )}
                {onDeleteOwner && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteOwner(owner);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                    title="Permanently delete this owner and all associated tenant data"
                  >
                    <Trash2 size={13} />
                    Delete workspace
                  </button>
                )}
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

                    {onToggleFeature && (
                      <button
                        type="button"
                        onClick={() => onToggleFeature(owner.id, 'email_marketing', !owner.features?.email_marketing)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                          owner.features?.email_marketing
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                        title="Premium: Email Marketing on/off for this owner"
                      >
                        <Mail size={12} />
                        <span>Email {owner.features?.email_marketing ? 'ON' : 'OFF'}</span>
                      </button>
                    )}
                    {onResetPassword && (
                      <button
                        type="button"
                        onClick={() => onResetPassword(owner)}
                        className="px-3 py-1 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Set a new password for this owner"
                      >
                        <Lock size={12} />
                        <span>Password</span>
                      </button>
                    )}
                    {onChangeEmail && (
                      <button
                        type="button"
                        onClick={() => changeEmail(owner)}
                        className="px-3 py-1 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Change this owner's login email"
                      >
                        <AtSign size={12} />
                        <span>Email</span>
                      </button>
                    )}
                    {onMoveOwner && (
                      <button
                        type="button"
                        onClick={() => { setMoving(owner); setMoveTarget(''); setFreeEmail(true); }}
                        className="px-3 py-1 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Move this whole account (leads, staff, tasks) under another owner"
                      >
                        <ArrowRightLeft size={12} />
                        <span>Move under…</span>
                      </button>
                    )}
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
                              {onResetPassword && (
                                <button
                                  type="button"
                                  onClick={() => onResetPassword(emp)}
                                  className="ml-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer inline-flex items-center gap-1"
                                  title="Set a new password for this staff member"
                                >
                                  <Lock size={10} />
                                  <span>Password</span>
                                </button>
                              )}
                              {onChangeEmail && (
                                <button
                                  type="button"
                                  onClick={() => changeEmail(emp)}
                                  className="ml-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer inline-flex items-center gap-1"
                                  title="Change this staff member's login email"
                                >
                                  <AtSign size={10} />
                                  <span>Email</span>
                                </button>
                              )}
                              {onDeleteStaff && (
                                <button
                                  type="button"
                                  onClick={() => deleteStaff(emp, owner)}
                                  className="ml-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer inline-flex items-center gap-1"
                                  title="Delete this staff member"
                                >
                                  <Trash2 size={10} />
                                  <span>Delete</span>
                                </button>
                              )}
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

      {moving && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={() => !busy && setMoving(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2"><ArrowRightLeft size={18} /> Move {moving.company_name || moving.name} under another owner</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Use this when one customer has two accounts (for example an old login <b>{moving.email}</b> and a new one).
              All leads, tasks, follow-ups, remarks, tickets and staff of <b>{moving.name}</b> move into the owner you choose.
              The old owner login is switched off.
            </p>
            <label className="block text-[11px] font-bold text-slate-700">
              Move under
              <select value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)} className="mt-1 w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50">
                <option value="">Choose the owner…</option>
                {allOwners.filter((o) => o.id !== moving.id && o.is_active !== false && !o.merged_into).map((o) => (
                  <option key={o.id} value={o.id}>{o.name} · {o.email}{o.company_name ? ` · ${o.company_name}` : ''}</option>
                ))}
              </select>
            </label>
            <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
              <input type="checkbox" checked={freeEmail} onChange={(e) => setFreeEmail(e.target.checked)} className="mt-0.5" />
              <span>Release the email <b>{moving.email}</b> so it can be used again (e.g. for a new staff member)</span>
            </label>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={() => setMoving(null)} disabled={busy} className="px-4 py-2 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancel</button>
              <button type="button" onClick={doMove} disabled={busy || !moveTarget} className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold cursor-pointer disabled:opacity-40">
                {busy ? 'Moving…' : 'Move account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
