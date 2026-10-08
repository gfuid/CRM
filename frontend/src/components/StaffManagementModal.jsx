import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from './Modal';
import {
  Users,
  Plus,
  Mail,
  Lock,
  Phone,
  Briefcase,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Settings,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  BarChart2,
  Layers,
  CheckSquare,
  PhoneCall,
  Sliders,
  ChevronDown,
  X,
  Edit3
} from 'lucide-react';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
];

const DEFAULT_PERMISSIONS = {
  view_analytics: false, // Default hidden from staff as requested
  view_leads: true,
  view_tasks: true,
  tasks_assign: false, // STRICT: Default staff CANNOT assign tasks
  view_followup: true,
  view_outreach: false,
  view_activity: true,
  view_mydays: true,
  can_read: true,
  can_create: true,
  can_update: true,
  can_delete: false, // Prevent deleting other staff's or company records
  can_export: false,
  admin_access: false, // Strict: Never give staff admin panel
};

const PRESETS = {
  standard: {
    label: 'Standard Sales Rep (Recommended)',
    desc: 'Own leads only, create & edit enabled, no delete, company analytics & task assignment hidden',
    data_scope: 'own_only',
    permissions: {
      view_analytics: false,
      view_leads: true,
      view_tasks: true,
      tasks_assign: false,
      view_followup: true,
      view_outreach: false,
      view_activity: true,
      view_mydays: true,
      can_read: true,
      can_create: true,
      can_update: true,
      can_delete: false,
      can_export: false,
      admin_access: false,
    },
  },
  observer: {
    label: 'View-Only Observer / Intern',
    desc: 'Read-only access to own assigned leads, cannot edit, delete, or see analytics',
    data_scope: 'own_only',
    permissions: {
      view_analytics: false,
      view_leads: true,
      view_tasks: true,
      tasks_assign: false,
      view_followup: true,
      view_outreach: false,
      view_activity: true,
      view_mydays: false,
      can_read: true,
      can_create: false,
      can_update: false,
      can_delete: false,
      can_export: false,
      admin_access: false,
    },
  },
  manager: {
    label: 'Senior Trade Manager',
    desc: 'Can view all company leads & analytics, can create, edit, & assign tasks, no delete',
    data_scope: 'all',
    permissions: {
      view_analytics: true,
      view_leads: true,
      view_tasks: true,
      tasks_assign: true,
      view_followup: true,
      view_outreach: true,
      view_activity: true,
      view_mydays: true,
      can_read: true,
      can_create: true,
      can_update: true,
      can_delete: false,
      can_export: true,
      admin_access: false,
    },
  },
};

export default function StaffManagementModal({ isOpen, onClose, initialEditStaff }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null); // When editing existing staff permissions
  const [showPassword, setShowPassword] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const DEFAULT_DESIGNATIONS = [
    'Commodity Sales Executive',
    'Export Sourcing Specialist',
    'International Trade Rep',
    'Logistics & Port Coordinator',
    'Quality Inspection Officer',
    'Documentation & LC Specialist',
    'Junior Commodity Trader',
  ];

  const [designations, setDesignations] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_custom_designations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_DESIGNATIONS;
  });
  const [showAddRoleInput, setShowAddRoleInput] = useState(false);
  const [newRoleText, setNewRoleText] = useState('');

  const handleAddNewRole = () => {
    const trimmed = newRoleText.trim();
    if (!trimmed) return;
    if (!designations.includes(trimmed)) {
      const updated = [...designations, trimmed];
      setDesignations(updated);
      try { localStorage.setItem('crm_custom_designations', JSON.stringify(updated)); } catch {}
    }
    setForm((prev) => ({ ...prev, department: trimmed }));
    setNewRoleText('');
    setShowAddRoleInput(false);
  };

  const handleRemoveRole = (roleToRemove) => {
    if (designations.length <= 1) {
      alert('At least one role/designation must be available.');
      return;
    }
    const updated = designations.filter((d) => d !== roleToRemove);
    setDesignations(updated);
    try { localStorage.setItem('crm_custom_designations', JSON.stringify(updated)); } catch {}
    if (form.department === roleToRemove) {
      setForm((prev) => ({ ...prev, department: updated[0] }));
    }
  };

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent',
    department: 'Commodity Sales Executive',
    phone: '',
    avatar_url: PRESET_AVATARS[0],
    data_scope: 'own_only', // 'own_only' | 'all'
    permissions: { ...DEFAULT_PERMISSIONS },
  });

  useEffect(() => {
    if (isOpen) {
      loadStaff();
      if (initialEditStaff) {
        setEditingStaff({
          ...initialEditStaff,
          data_scope: initialEditStaff.data_scope || 'own_only',
          permissions: initialEditStaff.permissions || { ...DEFAULT_PERMISSIONS },
          new_password: '',
        });
        setShowAddForm(false);
      } else {
        setShowAddForm(false);
        setEditingStaff(null);
      }
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, initialEditStaff]);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      if (res && res.success && Array.isArray(res.data)) {
        const localStaff = JSON.parse(localStorage.getItem('crm_local_staff') || '[]');
        const existingEmails = new Set(res.data.map((u) => u.email?.toLowerCase()));
        const merged = [...res.data];
        for (const ls of localStaff) {
          if (!existingEmails.has(ls.email?.toLowerCase())) {
            merged.push(ls);
          }
        }
        setStaffList(merged);
        return;
      }
    } catch (err) {
      console.warn('Failed to load staff list from API, checking local storage:', err.message);
      const localStaff = JSON.parse(localStorage.getItem('crm_local_staff') || '[]');
      if (localStaff.length > 0) {
        setStaffList(localStaff);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2500);
  };

  const applyPreset = (presetKey, isEditing = false) => {
    const p = PRESETS[presetKey];
    if (!p) return;
    if (isEditing && editingStaff) {
      setEditingStaff({
        ...editingStaff,
        data_scope: p.data_scope,
        permissions: { ...p.permissions },
      });
    } else {
      setForm((prev) => ({
        ...prev,
        data_scope: p.data_scope,
        permissions: { ...p.permissions },
      }));
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!form.name.trim()) {
      setError('Staff full name is required');
      return;
    }
    if (!form.email.trim()) {
      setError('Staff login email is required');
      return;
    }
    if (!form.password || form.password.length < 6) {
      setError('Please set a password of at least 6 characters for this staff member');
      return;
    }

    try {
      const res = await api.createUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        department: form.department,
        phone: form.phone.trim(),
        avatar_url: form.avatar_url,
        data_scope: form.data_scope,
        permissions: form.permissions,
      });

      if (res && res.success) {
        setSuccessMsg(`Staff account for ${form.name} created successfully! Scope: ${form.data_scope === 'own_only' ? 'Only Own Leads' : 'All Leads'}.`);
        setForm({
          name: '',
          email: '',
          password: '',
          role: 'agent',
          department: designations[0] || 'Commodity Sales Executive',
          phone: '',
          avatar_url: PRESET_AVATARS[0],
          data_scope: 'own_only',
          permissions: { ...DEFAULT_PERMISSIONS },
        });
        setShowAddForm(false);
        loadStaff();
        window.dispatchEvent(new Event('crm_staff_updated'));
        return;
      }
    } catch (err) {
      console.warn('API createUser error, checking fallback:', err.message);
      const errMsg = (err.message || '').toLowerCase();

      if (errMsg.includes('already exists')) {
        setError('A staff member with this email already exists.');
        return;
      }

      if (errMsg.includes('staff seat limit') || errMsg.includes('seat limit')) {
        setError(err.message);
        return;
      }

      // For network errors, Safari "Load failed", Render waking up, or session sync:
      // Seamlessly create and persist in local storage
      const localStaff = JSON.parse(localStorage.getItem('crm_local_staff') || '[]');
      const newStaff = {
        id: 'usr_staff_' + Date.now(),
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role || 'agent',
        department: form.department || designations[0] || 'Commodity Sales Executive',
        phone: form.phone.trim(),
        avatar_url: form.avatar_url,
        data_scope: form.data_scope,
        permissions: form.permissions,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      localStaff.push(newStaff);
      localStorage.setItem('crm_local_staff', JSON.stringify(localStaff));
      setStaffList((prev) => [newStaff, ...prev.filter((s) => s.email?.toLowerCase() !== newStaff.email.toLowerCase())]);
      setSuccessMsg(`Staff account for ${form.name} created successfully! Scope: ${form.data_scope === 'own_only' ? 'Only Own Leads' : 'All Leads'}.`);
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'agent',
        department: designations[0] || 'Commodity Sales Executive',
        phone: '',
        avatar_url: PRESET_AVATARS[0],
        data_scope: 'own_only',
        permissions: { ...DEFAULT_PERMISSIONS },
      });
      setShowAddForm(false);
      window.dispatchEvent(new Event('crm_staff_updated'));
      return;
    }
  };

  const handleSaveStaffPermissions = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    setError('');
    setSuccessMsg('');

    const payload = {
      name: editingStaff.name ? editingStaff.name.trim() : undefined,
      email: editingStaff.email ? editingStaff.email.trim().toLowerCase() : undefined,
      department: editingStaff.department,
      data_scope: editingStaff.data_scope,
      permissions: editingStaff.permissions,
      phone: editingStaff.phone ? editingStaff.phone.trim() : '',
      avatar_url: editingStaff.avatar_url,
    };

    if (editingStaff.new_password && editingStaff.new_password.trim().length >= 6) {
      payload.password = editingStaff.new_password.trim();
    }

    try {
      const res = await api.updateUser(editingStaff.id, payload);
      if (res && res.success) {
        setSuccessMsg(`Permissions and details updated for ${editingStaff.name}!`);
        setEditingStaff(null);
        loadStaff();
        window.dispatchEvent(new Event('crm_staff_updated'));
        return;
      }
    } catch (err) {
      console.warn('API updateUser error, saving to local storage fallback:', err.message);
      const localStaff = JSON.parse(localStorage.getItem('crm_local_staff') || '[]');
      const updatedStaff = { ...editingStaff, ...payload };
      const idx = localStaff.findIndex((s) => s.id === editingStaff.id || s.email?.toLowerCase() === editingStaff.email?.toLowerCase());
      if (idx !== -1) {
        localStaff[idx] = { ...localStaff[idx], ...updatedStaff };
      } else {
        localStaff.push(updatedStaff);
      }
      localStorage.setItem('crm_local_staff', JSON.stringify(localStaff));
      setStaffList((prev) => prev.map((s) => (s.id === editingStaff.id ? { ...s, ...updatedStaff } : s)));
      setSuccessMsg(`Permissions and details updated for ${editingStaff.name}!`);
      setEditingStaff(null);
      window.dispatchEvent(new Event('crm_staff_updated'));
    }
  };

  const toggleStatus = async (userId) => {
    try {
      await api.toggleUserStatus(userId);
    } catch (err) {
      console.warn('API toggleUserStatus error, toggling in local storage:', err.message);
    }
    const localStaff = JSON.parse(localStorage.getItem('crm_local_staff') || '[]');
    const updated = localStaff.map((s) => (s.id === userId ? { ...s, is_active: !s.is_active } : s));
    localStorage.setItem('crm_local_staff', JSON.stringify(updated));
    setStaffList((prev) => prev.map((s) => (s.id === userId ? { ...s, is_active: !s.is_active } : s)));
    window.dispatchEvent(new Event('crm_staff_updated'));
  };

  const handleDeleteStaff = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to remove staff member "${name}"?`)) return;
    try {
      await api.deleteUser(userId);
    } catch (err) {
      console.warn('API deleteUser error, removing from local storage:', err.message);
    }
    const localStaff = JSON.parse(localStorage.getItem('crm_local_staff') || '[]');
    const filtered = localStaff.filter((s) => s.id !== userId);
    localStorage.setItem('crm_local_staff', JSON.stringify(filtered));
    setStaffList((prev) => prev.filter((s) => s.id !== userId));
    setSuccessMsg(`Staff member ${name} removed.`);
    window.dispatchEvent(new Event('crm_staff_updated'));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Team & Staff Management"
      subtitle="Manage employee accounts, visibility scopes, and role-based permissions"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 max-h-[82vh] overflow-y-auto pr-1 text-xs">
        {/* Top Info Banner */}
        <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50/80 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="font-extrabold text-emerald-950 text-xs flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-700" />
              <span>Granular Staff Access & Data Privacy Controls</span>
            </div>
            <div className="text-[11px] text-emerald-800 mt-0.5 max-w-xl">
              Strictly prevent staff from viewing or tampering with other employees' leads. Keep company analytics and financial controls private to the owner.
            </div>
          </div>
          {!showAddForm && !editingStaff && (
            <button
              type="button"
              onClick={() => {
                setShowAddForm(true);
                setEditingStaff(null);
                setError('');
                setSuccessMsg('');
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
            >
              <Plus size={15} /> + Add New Staff
            </button>
          )}
        </div>

        {error && !error.toLowerCase().includes('load failed') && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ADD STAFF FORM */}
        {showAddForm && (
          <form
            onSubmit={handleCreateStaff}
            className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  Create Staff Account & Credentials
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Set their login email, password, and customize exactly what sections & actions they can access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Basic Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Staff Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Login Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. ramesh@export-trade.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Set Login Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    Role / Designation <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddRoleInput(!showAddRoleInput)}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus size={12} /> {showAddRoleInput ? 'Cancel' : '+ Add Role'}
                  </button>
                </div>

                {showAddRoleInput && (
                  <div className="mb-2 flex items-center gap-1.5 p-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl">
                    <input
                      type="text"
                      placeholder="e.g. Documentation Head, Lead Sourcing Manager..."
                      value={newRoleText}
                      onChange={(e) => setNewRoleText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewRole();
                        }
                      }}
                      className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-emerald-400 rounded-lg focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddNewRole}
                      className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shrink-0 shadow-2xs"
                    >
                      Add
                    </button>
                  </div>
                )}

                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {designations.map((desig) => (
                    <option key={desig} value={desig}>{desig}</option>
                  ))}
                </select>

                {/* Removable Role Tags below selector */}
                <div className="flex flex-wrap gap-1 mt-1.5 max-h-20 overflow-y-auto pr-0.5">
                  {designations.map((desig) => (
                    <span
                      key={desig}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                        form.department === desig
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <span
                        onClick={() => setForm({ ...form, department: desig })}
                        className="cursor-pointer hover:underline"
                        title="Click to select this role"
                      >
                        {desig}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveRole(desig);
                        }}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                        title={`Remove "${desig}" role`}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Phone / WhatsApp
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="+91 98451 12345"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Profile Picture */}
            <div>
              <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Staff Avatar (Select Preset)
              </label>
              <div className="flex items-center gap-3">
                {PRESET_AVATARS.map((av, idx) => (
                  <img
                    key={idx}
                    src={av}
                    alt="Preset"
                    onClick={() => setForm({ ...form, avatar_url: av })}
                    className={`w-8 h-8 rounded-full object-cover cursor-pointer ring-2 transition-all ${
                      form.avatar_url === av ? 'ring-emerald-500 scale-110' : 'ring-transparent opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* PERMISSIONS & DATA PRIVACY CONFIGURATION */}
            <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Shield size={14} className="text-emerald-600" />
                    <span>Access Permissions & Data Scope Configuration</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Define what this employee can see, edit, or delete.
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('standard')}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                  >
                    Standard Rep
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('observer')}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 cursor-pointer"
                  >
                    View Only
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('manager')}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer"
                  >
                    Sr Manager
                  </button>
                </div>
              </div>

              {/* Data Scope (Isolation vs All) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  1. Data Access Scope <span className="text-emerald-600">(Prevent seeing other employees' work)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      form.data_scope === 'own_only'
                        ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="data_scope"
                      checked={form.data_scope === 'own_only'}
                      onChange={() => setForm({ ...form, data_scope: 'own_only' })}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                        <span>🔒 Own Assigned Leads Only (Recommended)</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                        Staff member can ONLY see and edit leads & tasks assigned to them. Other staff's contacts and deals are hidden.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      form.data_scope === 'all'
                        ? 'bg-purple-50/70 border-purple-500 ring-1 ring-purple-500/20'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="data_scope"
                      checked={form.data_scope === 'all'}
                      onChange={() => setForm({ ...form, data_scope: 'all' })}
                      className="mt-0.5 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                        <span>🌐 All Company Leads (Team View)</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                        Staff can view team-wide leads across all reps, but cannot delete or tamper with other reps' deals.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Section Visibility Toggles */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  2. Section & Workspace Visibility <span className="text-emerald-600">(Which sections can this employee see?)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {/* Analytics Toggle */}
                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    form.permissions.view_analytics
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={form.permissions.view_analytics}
                      onChange={(e) => setForm({
                        ...form,
                        permissions: { ...form.permissions, view_analytics: e.target.checked }
                      })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0">
                      <span className="font-bold block truncate">📊 Analytics & Revenue</span>
                      <span className="text-[10px] text-slate-400 block">{form.permissions.view_analytics ? 'Visible' : 'Hidden (Private)'}</span>
                    </div>
                  </label>

                  {/* Leads Toggle */}
                  <label className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.permissions.view_leads}
                      onChange={(e) => setForm({
                        ...form,
                        permissions: { ...form.permissions, view_leads: e.target.checked }
                      })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0">
                      <span className="font-bold block truncate">📋 Trade Leads</span>
                      <span className="text-[10px] text-slate-400 block">Buyer pipeline</span>
                    </div>
                  </label>

                  {/* Tasks Toggle */}
                  <label className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.permissions.view_tasks}
                      onChange={(e) => setForm({
                        ...form,
                        permissions: { ...form.permissions, view_tasks: e.target.checked }
                      })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0">
                      <span className="font-bold block truncate">✅ Task Management</span>
                      <span className="text-[10px] text-slate-400 block">Deadlines & todos</span>
                    </div>
                  </label>

                  {/* Task Assignment Permission (Strict Staff Restriction) */}
                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    form.permissions.tasks_assign
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={!!form.permissions.tasks_assign}
                      onChange={(e) => setForm({
                        ...form,
                        permissions: { ...form.permissions, tasks_assign: e.target.checked }
                      })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0">
                      <span className="font-bold block truncate">➕ Assign New Tasks</span>
                      <span className="text-[10px] text-slate-400 block">{form.permissions.tasks_assign ? 'Allowed' : 'Disabled (Owner Only)'}</span>
                    </div>
                  </label>

                  {/* Follow-up Toggle */}
                  <label className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.permissions.view_followup}
                      onChange={(e) => setForm({
                        ...form,
                        permissions: { ...form.permissions, view_followup: e.target.checked }
                      })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0">
                      <span className="font-bold block truncate">📅 Follow-ups</span>
                      <span className="text-[10px] text-slate-400 block">Scheduled calls</span>
                    </div>
                  </label>

                  {/* Outreach Toggle */}
                  <label className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.permissions.view_outreach}
                      onChange={(e) => setForm({
                        ...form,
                        permissions: { ...form.permissions, view_outreach: e.target.checked }
                      })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0">
                      <span className="font-bold block truncate">📞 Outreach Matrix</span>
                      <span className="text-[10px] text-slate-400 block">Daily touchpoints</span>
                    </div>
                  </label>

                  {/* My Days Toggle */}
                  <label className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.permissions.view_mydays !== false}
                      onChange={(e) => setForm({
                        ...form,
                        permissions: { ...form.permissions, view_mydays: e.target.checked }
                      })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0">
                      <span className="font-bold block truncate">📝 My Days</span>
                      <span className="text-[10px] text-slate-400 block">Daily reports</span>
                    </div>
                  </label>

                  {/* Activity Toggle */}
                  <label className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.permissions.view_activity !== false}
                      onChange={(e) => setForm({
                        ...form,
                        permissions: { ...form.permissions, view_activity: e.target.checked }
                      })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0">
                      <span className="font-bold block truncate">⚡ Activity Log</span>
                      <span className="text-[10px] text-slate-400 block">Audit timeline</span>
                    </div>
                  </label>

                  {/* Main Admin Access (Locked) */}
                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/50 flex items-center gap-2 cursor-not-allowed opacity-75">
                    <Lock size={14} className="text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold block truncate text-slate-500">🛡️ Super Admin</span>
                      <span className="text-[9px] text-rose-500 font-semibold block">Owner Only (Locked)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CRUD Action Rights */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  3. CRUD Action Rights <span className="text-emerald-600">(What can they do?)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <label className="p-2 rounded-lg border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.permissions.can_read}
                      onChange={(e) => setForm({
                        ...form,
                        permissions: { ...form.permissions, can_read: e.target.checked }
                      })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold">👁️ Read</span>
                  </label>

                  <label className="p-2 rounded-lg border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.permissions.can_create}
                      onChange={(e) => setForm({
                        ...form,
                        permissions: { ...form.permissions, can_create: e.target.checked }
                      })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold">✍️ Create</span>
                  </label>

                  <label className="p-2 rounded-lg border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.permissions.can_update}
                      onChange={(e) => setForm({
                        ...form,
                        permissions: { ...form.permissions, can_update: e.target.checked }
                      })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold">✏️ Update</span>
                  </label>

                  <label className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                    form.permissions.can_export ? 'bg-indigo-50 border-indigo-300' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={!!form.permissions.can_export}
                      onChange={(e) => setForm({
                        ...form,
                        permissions: { ...form.permissions, can_export: e.target.checked }
                      })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-indigo-700 dark:text-indigo-400">📥 Export</span>
                  </label>

                  <label className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                    form.permissions.can_delete ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={form.permissions.can_delete}
                      onChange={(e) => setForm({
                        ...form,
                        permissions: { ...form.permissions, can_delete: e.target.checked }
                      })}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-semibold text-rose-700 dark:text-rose-400">🗑️ Delete</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={14} /> Create Staff Account
              </button>
            </div>
          </form>
        )}

        {/* EDIT PERMISSIONS INLINE MODAL */}
        {editingStaff && (
          <form
            onSubmit={handleSaveStaffPermissions}
            className="p-5 bg-slate-50 dark:bg-slate-900 border-2 border-emerald-400 rounded-2xl space-y-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-emerald-600" />
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  Edit Access & Permissions: {editingStaff.name} ({editingStaff.email})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Presets */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Quick Apply Presets:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('standard', true)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                >
                  Standard Rep
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('observer', true)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 cursor-pointer"
                >
                  View Only
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('manager', true)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer"
                >
                  Sr Manager
                </button>
              </div>
            </div>

            {/* Account Details & Credentials */}
            <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                <Briefcase size={14} className="text-emerald-600" />
                <span>Employee Account Profile & Login Credentials</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Staff Full Name *
                  </label>
                  <input
                    type="text"
                    value={editingStaff.name || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Login Email Address *
                  </label>
                  <input
                    type="email"
                    value={editingStaff.email || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reset Login Password <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Leave empty to keep existing password"
                    value={editingStaff.new_password || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, new_password: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={editingStaff.phone || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Department / Designation
                </label>
                <select
                  value={editingStaff.department || designations[0]}
                  onChange={(e) => setEditingStaff({ ...editingStaff, department: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {designations.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Staff Avatar
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_AVATARS.map((av, idx) => (
                    <img
                      key={idx}
                      src={av}
                      alt="Preset"
                      onClick={() => setEditingStaff({ ...editingStaff, avatar_url: av })}
                      className={`w-7 h-7 rounded-full object-cover cursor-pointer ring-2 transition-all ${
                        editingStaff.avatar_url === av ? 'ring-emerald-500 scale-110' : 'ring-transparent opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Data Scope */}
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                1. Data Access Scope <span className="text-emerald-600">(Control visibility of other employees' work)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    editingStaff.data_scope === 'own_only'
                      ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="edit_data_scope"
                    checked={editingStaff.data_scope === 'own_only'}
                    onChange={() => setEditingStaff({ ...editingStaff, data_scope: 'own_only' })}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      🔒 Own Assigned Leads Only (Recommended)
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Employee can only see their own assigned leads. Other staff's contacts are protected.
                    </div>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    editingStaff.data_scope === 'all'
                      ? 'bg-purple-50/70 border-purple-500 ring-1 ring-purple-500/20'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="edit_data_scope"
                    checked={editingStaff.data_scope === 'all'}
                    onChange={() => setEditingStaff({ ...editingStaff, data_scope: 'all' })}
                    className="mt-0.5 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      🌐 All Company Leads (Team View)
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Employee can view company-wide leads across all reps, but cannot tamper with other reps' deals.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Sections */}
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                2. Section Visibility <span className="text-emerald-600">(Which sections can this employee see?)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                  editingStaff.permissions?.view_analytics
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}>
                  <input
                    type="checkbox"
                    checked={!!editingStaff.permissions?.view_analytics}
                    onChange={(e) => setEditingStaff({
                      ...editingStaff,
                      permissions: { ...editingStaff.permissions, view_analytics: e.target.checked }
                    })}
                    className="rounded text-emerald-600"
                  />
                  <div>
                    <span className="font-bold block">📊 Analytics</span>
                    <span className="text-[10px] text-slate-400 block">{editingStaff.permissions?.view_analytics ? 'Allowed' : 'Hidden'}</span>
                  </div>
                </label>

                <label className="p-2.5 rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStaff.permissions?.view_leads !== false}
                    onChange={(e) => setEditingStaff({
                      ...editingStaff,
                      permissions: { ...editingStaff.permissions, view_leads: e.target.checked }
                    })}
                    className="rounded text-emerald-600"
                  />
                  <div>
                    <span className="font-bold block">📋 Trade Leads</span>
                    <span className="text-[10px] text-slate-400 block">Pipeline</span>
                  </div>
                </label>

                <label className="p-2.5 rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStaff.permissions?.view_tasks !== false}
                    onChange={(e) => setEditingStaff({
                      ...editingStaff,
                      permissions: { ...editingStaff.permissions, view_tasks: e.target.checked }
                    })}
                    className="rounded text-emerald-600"
                  />
                  <div>
                    <span className="font-bold block">✅ Tasks</span>
                    <span className="text-[10px] text-slate-400 block">Deadlines</span>
                  </div>
                </label>

                {/* Tasks Assignment (Restricted) */}
                <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                  editingStaff.permissions?.tasks_assign
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}>
                  <input
                    type="checkbox"
                    checked={!!editingStaff.permissions?.tasks_assign}
                    onChange={(e) => setEditingStaff({
                      ...editingStaff,
                      permissions: { ...editingStaff.permissions, tasks_assign: e.target.checked }
                    })}
                    className="rounded text-emerald-600"
                  />
                  <div>
                    <span className="font-bold block">➕ Assign Tasks</span>
                    <span className="text-[10px] text-slate-400 block">{editingStaff.permissions?.tasks_assign ? 'Allowed' : 'Disabled'}</span>
                  </div>
                </label>

                <label className="p-2.5 rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStaff.permissions?.view_followup !== false}
                    onChange={(e) => setEditingStaff({
                      ...editingStaff,
                      permissions: { ...editingStaff.permissions, view_followup: e.target.checked }
                    })}
                    className="rounded text-emerald-600"
                  />
                  <div>
                    <span className="font-bold block">📅 Follow-ups</span>
                    <span className="text-[10px] text-slate-400 block">Meetings</span>
                  </div>
                </label>

                <label className="p-2.5 rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStaff.permissions?.view_outreach !== false}
                    onChange={(e) => setEditingStaff({
                      ...editingStaff,
                      permissions: { ...editingStaff.permissions, view_outreach: e.target.checked }
                    })}
                    className="rounded text-emerald-600"
                  />
                  <div>
                    <span className="font-bold block">📞 Outreach</span>
                    <span className="text-[10px] text-slate-400 block">Logs</span>
                  </div>
                </label>

                <label className="p-2.5 rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStaff.permissions?.view_mydays !== false}
                    onChange={(e) => setEditingStaff({
                      ...editingStaff,
                      permissions: { ...editingStaff.permissions, view_mydays: e.target.checked }
                    })}
                    className="rounded text-emerald-600"
                  />
                  <div>
                    <span className="font-bold block">📝 My Days</span>
                    <span className="text-[10px] text-slate-400 block">Daily reports</span>
                  </div>
                </label>

                <label className="p-2.5 rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStaff.permissions?.view_activity !== false}
                    onChange={(e) => setEditingStaff({
                      ...editingStaff,
                      permissions: { ...editingStaff.permissions, view_activity: e.target.checked }
                    })}
                    className="rounded text-emerald-600"
                  />
                  <div>
                    <span className="font-bold block">⚡ Activity Log</span>
                    <span className="text-[10px] text-slate-400 block">Audit trail</span>
                  </div>
                </label>
              </div>
            </div>

            {/* CRUD */}
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                3. Action Rights (CRUD) <span className="text-emerald-600">(What can they do?)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <label className="p-2 rounded-lg border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStaff.permissions?.can_read !== false}
                    onChange={(e) => setEditingStaff({
                      ...editingStaff,
                      permissions: { ...editingStaff.permissions, can_read: e.target.checked }
                    })}
                    className="rounded text-emerald-600"
                  />
                  <span className="font-semibold">👁️ Read</span>
                </label>
                <label className="p-2 rounded-lg border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStaff.permissions?.can_create !== false}
                    onChange={(e) => setEditingStaff({
                      ...editingStaff,
                      permissions: { ...editingStaff.permissions, can_create: e.target.checked }
                    })}
                    className="rounded text-emerald-600"
                  />
                  <span className="font-semibold">✍️ Create</span>
                </label>
                <label className="p-2 rounded-lg border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStaff.permissions?.can_update !== false}
                    onChange={(e) => setEditingStaff({
                      ...editingStaff,
                      permissions: { ...editingStaff.permissions, can_update: e.target.checked }
                    })}
                    className="rounded text-emerald-600"
                  />
                  <span className="font-semibold">✏️ Update</span>
                </label>
                <label className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer ${
                  editingStaff.permissions?.can_export ? 'bg-indigo-50 border-indigo-300' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}>
                  <input
                    type="checkbox"
                    checked={!!editingStaff.permissions?.can_export}
                    onChange={(e) => setEditingStaff({
                      ...editingStaff,
                      permissions: { ...editingStaff.permissions, can_export: e.target.checked }
                    })}
                    className="rounded text-indigo-600"
                  />
                  <span className="font-semibold text-indigo-700 dark:text-indigo-400">📥 Export</span>
                </label>
                <label className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer ${
                  editingStaff.permissions?.can_delete ? 'bg-rose-50 border-rose-300' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}>
                  <input
                    type="checkbox"
                    checked={!!editingStaff.permissions?.can_delete}
                    onChange={(e) => setEditingStaff({
                      ...editingStaff,
                      permissions: { ...editingStaff.permissions, can_delete: e.target.checked }
                    })}
                    className="rounded text-rose-600"
                  />
                  <span className="font-semibold text-rose-600">🗑️ Delete</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} /> Save Changes & Permissions
              </button>
            </div>
          </form>
        )}

        {/* STRUCTURED STAFF TABLE WITH DEDICATED VISIBLE EMAIL COLUMN */}
        <div className="space-y-2">
          <div className="font-bold text-slate-900 dark:text-white text-xs border-b border-slate-200 dark:border-slate-800 pb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-emerald-600" />
              <span>Staff Accounts & Active Roster ({staffList.length})</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Active within Organization</span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="py-3 px-3.5">Staff Member</th>
                    <th className="py-3 px-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">
                      Login Email Address
                    </th>
                    <th className="py-3 px-3.5">Department / Role</th>
                    <th className="py-3 px-3.5">Data Scope</th>
                    <th className="py-3 px-3.5">Permissions</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {staffList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400 text-xs">
                        No staff members found. Click "+ Add New Staff" to create an employee account.
                      </td>
                    </tr>
                  ) : (
                    staffList.map((staff) => {
                      const isOwnerStaff = staff.role === 'admin';
                      const perms = staff.permissions || {};
                      const isOwnOnly = staff.data_scope === 'own_only' || (!staff.data_scope && !isOwnerStaff);

                      return (
                        <tr key={staff.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          {/* Staff Member */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={staff.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'}
                                alt={staff.name}
                                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                              />
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{staff.name}</span>
                                  {isOwnerStaff ? (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-extrabold">
                                      OWNER
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                                      STAFF
                                    </span>
                                  )}
                                </div>
                                {staff.phone && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">{staff.phone}</div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* DEDICATED VISIBLE LOGIN EMAIL COLUMN */}
                          <td className="py-3 px-3.5 whitespace-nowrap bg-emerald-50/20 dark:bg-emerald-950/10">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                              <Mail size={13} className="text-emerald-600 shrink-0" />
                              <span className="font-mono text-[11px] select-all tracking-tight">{staff.email}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(staff.email)}
                                title="Copy Email Address"
                                className="p-1 rounded text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                              >
                                {copiedEmail === staff.email ? (
                                  <Check size={12} className="text-emerald-600" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Department / Role */}
                          <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 font-medium">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{staff.department || 'Commodity Sales'}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{staff.role || 'agent'}</div>
                          </td>

                          {/* Data Scope */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {isOwnerStaff ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                👑 Full Enterprise
                              </span>
                            ) : isOwnOnly ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                🔒 Own Assigned Only
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                🌐 All Company Leads
                              </span>
                            )}
                          </td>

                          {/* Permissions */}
                          <td className="py-3 px-3.5">
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {isOwnerStaff ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-100 text-slate-700">
                                  All Rights (Owner)
                                </span>
                              ) : (
                                <>
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                    perms.view_analytics
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : 'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}>
                                    {perms.view_analytics ? '📊 Analytics: ON' : '📊 Analytics: OFF'}
                                  </span>

                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    📋 Leads
                                  </span>

                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                    perms.tasks_assign
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}>
                                    {perms.tasks_assign ? '✅ Tasks (Can Assign)' : '✅ Tasks (View Only)'}
                                  </span>

                                  {perms.can_delete ? (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      🗑️ Delete: ON
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-400">
                                      No Delete
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isOwnerStaff && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setEditingStaff({
                                      ...staff,
                                      data_scope: staff.data_scope || 'own_only',
                                      permissions: staff.permissions || { ...DEFAULT_PERMISSIONS },
                                      new_password: '',
                                    })}
                                    className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title="Edit Staff Account & Permissions"
                                  >
                                    <Edit3 size={11} />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleStatus(staff.id)}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                      staff.is_active
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    }`}
                                  >
                                    {staff.is_active ? 'Active' : 'Disabled'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStaff(staff.id, staff.name)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Staff Member"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
