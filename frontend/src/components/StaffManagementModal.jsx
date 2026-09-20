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
  Sparkles
} from 'lucide-react';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
];

export default function StaffManagementModal({ isOpen, onClose }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent',
    department: 'Commodity Sales & Export Outreach',
    phone: '',
    avatar_url: PRESET_AVATARS[0],
  });

  useEffect(() => {
    if (isOpen) {
      loadStaff();
      setShowAddForm(false);
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      if (res && res.success && Array.isArray(res.data)) {
        setStaffList(res.data);
      }
    } catch (err) {
      console.warn('Failed to load staff list:', err.message);
    } finally {
      setLoading(false);
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
      });

      if (res && res.success) {
        setSuccessMsg(`Staff member ${form.name} created successfully! They can now log in with their email and password.`);
        setForm({
          name: '',
          email: '',
          password: '',
          role: 'agent',
          department: 'Commodity Sales & Export Outreach',
          phone: '',
          avatar_url: PRESET_AVATARS[0],
        });
        setShowAddForm(false);
        loadStaff();
      }
    } catch (err) {
      setError(err.message || 'Failed to create staff member');
    }
  };

  const toggleStatus = async (userId) => {
    try {
      await api.toggleUserStatus(userId);
      loadStaff();
    } catch {}
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Team & Staff Management"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1 text-xs">
        {/* Top Info Banner */}
        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div>
            <div className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
              <Shield size={14} className="text-emerald-700" />
              Role-Based Staff Permissions
            </div>
            <div className="text-[11px] text-emerald-800 mt-0.5">
              Staff members can only see and edit their own assigned leads and tasks. They cannot access other employees' work or admin controls.
            </div>
          </div>
          {!showAddForm && (
            <button
              onClick={() => {
                setShowAddForm(true);
                setError('');
                setSuccessMsg('');
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus size={14} /> Add New Staff
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600" /> {successMsg}
          </div>
        )}

        {/* Add Staff Form Accordion */}
        {showAddForm && (
          <form
            onSubmit={handleCreateStaff}
            className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-900 text-xs">Create Staff Account & Credentials</span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Staff Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Login Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="ramesh@travel-trade.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Set Login Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full pl-3 pr-8 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Role / Designation *
                </label>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium text-slate-700"
                >
                  <option value="Commodity Sales Executive">Commodity Sales Executive</option>
                  <option value="Export Sourcing Agent">Export Sourcing Agent</option>
                  <option value="International Trade Rep">International Trade Rep</option>
                  <option value="Logistics & Port Coordinator">Logistics & Port Coordinator</option>
                  <option value="Quality & Inspection Specialist">Quality & Inspection Specialist</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98451 12345"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Profile Picture (Optional)
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_AVATARS.map((av, idx) => (
                    <img
                      key={idx}
                      src={av}
                      alt="Preset"
                      onClick={() => setForm({ ...form, avatar_url: av })}
                      className={`w-7 h-7 rounded-full object-cover cursor-pointer ring-2 transition-all ${
                        form.avatar_url === av ? 'ring-emerald-500 scale-110' : 'ring-transparent opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm cursor-pointer"
              >
                Create Staff Account
              </button>
            </div>
          </form>
        )}

        {/* Staff Members List */}
        <div className="space-y-2">
          <div className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1 flex items-center justify-between">
            <span>Current Staff & Team Members ({staffList.length})</span>
            <span className="text-[10px] text-slate-400 font-normal">Active within Organization</span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
            {staffList.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No staff members created yet. Click "+ Add New Staff" to create an employee account.
              </div>
            ) : (
              staffList.map((staff) => (
                <div key={staff.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={staff.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'}
                      alt={staff.name}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span>{staff.name}</span>
                        {staff.role === 'admin' ? (
                          <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-extrabold">
                            OWNER
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                            STAFF
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>{staff.email}</span>
                        <span>•</span>
                        <span>{staff.department || 'Commodity Sales'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {staff.role !== 'admin' && (
                      <button
                        onClick={() => toggleStatus(staff.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                          staff.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {staff.is_active ? 'Active' : 'Disabled'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
