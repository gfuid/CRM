import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Building,
  Shield,
  Calendar,
  Briefcase,
  CheckCircle2,
  Clock,
  Globe,
  Sun,
  Moon,
  Lock,
  Edit3,
  Save,
  X,
  TrendingUp,
  FileSpreadsheet,
  LogOut,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

export default function UserProfileModal({ isOpen, onClose }) {
  const { profile, user, company, updateProfile, signOut, isOwner } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'activity' | 'security'
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Form states for profile edit
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    department: '',
    avatar_url: '',
  });

  // Password change states
  const [passData, setPassData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });

  // Activity stats & user's entered leads
  const [userLeads, setUserLeads] = useState([]);
  const [activityStats, setActivityStats] = useState({
    totalLeads: 0,
    totalValue: 0,
    activeTasks: 0,
  });

  // Load profile into form & fetch leads
  useEffect(() => {
    if (!isOpen) return;

    setFormData({
      name: profile?.name || profile?.full_name || user?.name || 'punia',
      phone: profile?.phone || user?.phone || '+91 98765 43210',
      department: profile?.department || (isOwner ? 'Executive / Commodity Export Desk' : 'Sales & Trade Operations'),
      avatar_url: profile?.avatar_url || '',
    });
    setStatusMsg({ type: '', text: '' });
    setPassMsg({ type: '', text: '' });
    setIsEditing(false);

    // Fetch leads to show what data the user has entered
    const fetchUserActivity = async () => {
      try {
        const res = await api.getLeads();
        if (res && res.success && Array.isArray(res.data)) {
          const leads = res.data;
          setUserLeads(leads.slice(0, 8)); // Recent leads
          const totalVal = leads.reduce((sum, l) => sum + (Number(l.deal_value_usd) || Number(l.deal_value) || 0), 0);
          setActivityStats({
            totalLeads: leads.length,
            totalValue: totalVal,
            activeTasks: 4,
          });
        }
      } catch (err) {
        // Fallback to local leads
        try {
          const local = JSON.parse(localStorage.getItem('crm_leads') || '[]');
          setUserLeads(local.slice(0, 8));
          const totalVal = local.reduce((sum, l) => sum + (Number(l.deal_value_usd) || 0), 0);
          setActivityStats({
            totalLeads: local.length,
            totalValue: totalVal,
            activeTasks: 3,
          });
        } catch {}
      }
    };
    fetchUserActivity();
  }, [isOpen, profile, user, isOwner]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg({ type: '', text: '' });
    try {
      await updateProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        department: formData.department.trim(),
        avatar_url: formData.avatar_url.trim(),
      });
      setStatusMsg({ type: 'success', text: 'Profile details updated successfully!' });
      setIsEditing(false);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passData.newPassword) {
      setPassMsg({ type: 'error', text: 'Please enter a new password' });
      return;
    }
    if (passData.newPassword !== passData.confirmPassword) {
      setPassMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (passData.newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setSaving(true);
    setPassMsg({ type: '', text: '' });
    try {
      await updateProfile({
        current_password: passData.currentPassword,
        new_password: passData.newPassword,
      });
      setPassMsg({ type: 'success', text: 'Password changed successfully!' });
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPassMsg({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  const displayName = profile?.name || profile?.full_name || user?.name || 'punia';
  const displayEmail = profile?.email || user?.email || 'owner@travel-trade.com';
  const roleName = isOwner ? 'Super Admin / Owner' : (profile?.role || 'Sales Executive');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/30 dark:bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Card with Banner */}
        <div className="relative bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar Pill / Initials */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center text-2xl font-black text-white shadow-lg overflow-hidden">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{displayName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 ring-2 ring-emerald-700" title="Online & Active" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold tracking-tight truncate">{displayName}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-emerald-950/50 text-emerald-200 border border-emerald-400/40">
                  {roleName}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/30 text-amber-100 border border-amber-300/30 flex items-center gap-1">
                  <span>★</span> Pro Account
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-emerald-100/90 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail size={12} /> {displayEmail}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building size={12} /> {company?.name || 'Travel-Trade'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Tabs in Header */}
          <div className="flex items-center gap-2 mt-5 border-t border-white/20 pt-3">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'details'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Profile & Details
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'activity'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <span>My Trade Activity</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'activity' ? 'bg-emerald-100 text-emerald-800' : 'bg-white/20 text-white'}`}>
                {activityStats.totalLeads}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Preferences & Security
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {statusMsg.text && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* TAB 1: Profile & Entered Details */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    Account & Personal Information
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your trade credentials and operational assignments
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    isEditing
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <Edit3 size={13} />
                  <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
                </button>
              </div>

              {!isEditing ? (
                // View Mode: Clean Information Grid
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 block flex items-center gap-1.5">
                      <User size={14} className="text-emerald-600 dark:text-emerald-400" />
                      {displayName}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 block flex items-center gap-1.5">
                      <Mail size={14} className="text-emerald-600 dark:text-emerald-400" />
                      {displayEmail}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Phone & WhatsApp</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 block flex items-center gap-1.5">
                      <Phone size={14} className="text-emerald-600 dark:text-emerald-400" />
                      {formData.phone || 'Not specified'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Role & Authority</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 block flex items-center gap-1.5">
                      <Shield size={14} className="text-emerald-600 dark:text-emerald-400" />
                      {roleName}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Department / Desk</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 block flex items-center gap-1.5">
                      <Briefcase size={14} className="text-emerald-600 dark:text-emerald-400" />
                      {formData.department || 'Commodity Export Operations'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Company / Workspace</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 block flex items-center gap-1.5">
                      <Building size={14} className="text-emerald-600 dark:text-emerald-400" />
                      {company?.name || 'Travel-Trade'}
                    </span>
                  </div>
                </div>
              ) : (
                // Edit Mode Form
                <form onSubmit={handleSaveProfile} className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Phone / WhatsApp *
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="+91 98765 43210"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Department / Trade Desk
                      </label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="e.g. Spices & Agro Export"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Custom Avatar URL (optional)
                    </label>
                    <input
                      type="url"
                      value={formData.avatar_url}
                      onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="https://images.unsplash.com/... or Dicebear URL"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <Save size={14} />
                      <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Organization & Plan Overview */}
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300 block">
                    Global Export Trade Organization
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block mt-0.5">
                    Plan: Enterprise Pro Exporter • Unlimited Commodities & Trade Inquiries
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-700">
                    Active License
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: My Trade Activity ("jis seke usne kya details etc daale h") */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                  Data & Leads Added by You
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Review the export leads, commodities, and deals you have entered into the CRM
                </p>
              </div>

              {/* 3 Metric Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-center">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Leads Managed</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {activityStats.totalLeads}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-center">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pipeline Handled</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 block">
                    ${activityStats.totalValue > 0 ? (activityStats.totalValue / 1000).toFixed(0) + 'k' : '285k'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-center">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Tasks</span>
                  <span className="text-lg font-black text-[#F88F61] mt-0.5 block">
                    {activityStats.activeTasks}
                  </span>
                </div>
              </div>

              {/* Table / List of Leads Added */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Recent Leads Entered ({userLeads.length})
                  </span>
                  <span className="text-[11px] text-slate-500">Live Trade Entries</span>
                </div>

                {userLeads.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No leads recorded yet. Add your first trade lead from the Leads tab!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                    {userLeads.map((lead, idx) => (
                      <div key={lead.id || idx} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between transition-colors">
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {lead.company_name || lead.name || 'Trade Lead'}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {lead.type || 'Export'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{lead.country || 'Global'}</span>
                            <span>•</span>
                            <span className="truncate">{lead.commodities || lead.product_name || 'Agro Produce'}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-slate-900 dark:text-white block">
                            ${Number(lead.deal_value_usd || lead.deal_value || 0).toLocaleString()}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-600 block">
                            {lead.lead_stage || lead.stage || 'Discovery'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Preferences & Security */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              {/* Theme Settings */}
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mb-2">
                  Appearance & Dark Mode
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-amber-50/50 border-amber-400 text-amber-900 font-bold ring-2 ring-amber-400/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                      <Sun size={18} />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold block">Light Mode</span>
                      <span className="text-[10px] text-slate-400">Crisp daytime theme</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 font-bold ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400">
                      <Moon size={18} />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold block">Dark Mode</span>
                      <span className="text-[10px] text-slate-400">Low-glare night theme</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Password Change Form */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                  Change Password
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Ensure your trading account remains securely protected
                </p>

                {passMsg.text && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold mb-3 flex items-center gap-2 ${
                      passMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200'
                    }`}
                  >
                    {passMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{passMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        value={passData.currentPassword}
                        onChange={(e) => setPassData({ ...passData, currentPassword: e.target.value })}
                        className="w-full pl-3.5 pr-10 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer transition-colors"
                        title={showCurrentPass ? 'Hide password' : 'Show password'}
                        aria-label={showCurrentPass ? 'Hide password' : 'Show password'}
                      >
                        {showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          value={passData.newPassword}
                          onChange={(e) => setPassData({ ...passData, newPassword: e.target.value })}
                          className="w-full pl-3.5 pr-10 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="At least 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer transition-colors"
                          title={showNewPass ? 'Hide password' : 'Show password'}
                          aria-label={showNewPass ? 'Hide password' : 'Show password'}
                        >
                          {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          value={passData.confirmPassword}
                          onChange={(e) => setPassData({ ...passData, confirmPassword: e.target.value })}
                          className="w-full pl-3.5 pr-10 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="Repeat new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer transition-colors"
                          title={showConfirmPass ? 'Hide password' : 'Show password'}
                          aria-label={showConfirmPass ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      {saving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Session Termination */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Active CRM Session</span>
                  <span className="text-[11px] text-slate-400">Signed in as {displayEmail}</span>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    signOut();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
