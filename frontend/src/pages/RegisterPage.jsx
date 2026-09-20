import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle2, Building2, User, Mail, Phone, Lock, Sparkles } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

export default function RegisterPage({ onSwitchToLogin, onBackToLanding }) {
  const { signUpOwner } = useAuth();
  const [form, setForm] = useState({
    companyName: '',
    doesExportTrade: 'yes', // 'yes' | 'no'
    fullName: '',
    phone: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.companyName.trim()) {
      setError('Company / Organization name is required');
      return;
    }
    if (!form.fullName.trim()) {
      setError('Your full name is required');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signUpOwner({
        companyName: form.companyName.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        persona: 'owner',
        plan: 'enterprise', // Unlimited free
      });
      window.history.pushState({}, '', '/');
    } catch (err) {
      setError(err.message || 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, val) => setForm({ ...form, [field]: val });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-lg p-6 sm:p-8 bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 transition-all">
        {/* Top Navigation: Back to Home Arrow & Switch to Login */}
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={onBackToLanding || onSwitchToLogin}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer group shadow-xs"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Home</span>
          </button>

          {onSwitchToLogin && (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              Already registered? <span className="font-bold underline">Sign In</span>
            </button>
          )}
        </div>

        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-2">
          <BrandLogo size={36} />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Join Travel-Trade
            </h1>
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          Setup your company account and start closing commodity trade deals with precision.
        </p>

        {/* Free Forever Banner */}
        <div className="p-3 mb-5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-semibold">
            <Sparkles size={16} className="text-emerald-600 shrink-0" />
            <span>100% Free Lifetime Access &bull; No Credit Card Required</span>
          </div>
          <span className="font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-xs">
            Free
          </span>
        </div>

        {error && (
          <div className="p-3 mb-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company / Organization Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Company / Organization Name *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Building2 size={16} />
              </span>
              <input
                required
                type="text"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="e.g. Al-Barakah Agro Traders LLC"
                value={form.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
              />
            </div>
          </div>

          {/* Do you trade or export products? */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Do you trade or export commodities / goods? *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateField('doesExportTrade', 'yes')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  form.doesExportTrade === 'yes'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 size={14} className={form.doesExportTrade === 'yes' ? 'text-white' : 'text-slate-300'} />
                <span>Yes, Active Exporter / Trader</span>
              </button>

              <button
                type="button"
                onClick={() => updateField('doesExportTrade', 'no')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  form.doesExportTrade === 'no'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 size={14} className={form.doesExportTrade === 'no' ? 'text-white' : 'text-slate-300'} />
                <span>No, Starting Up</span>
              </button>
            </div>
          </div>

          {/* Your Full Name (Owner) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Your Full Name (Owner / Founder) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <User size={16} />
              </span>
              <input
                required
                type="text"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="e.g. Tariq Mansoor"
                value={form.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
              />
            </div>
          </div>

          {/* Work Email & Phone Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email Address *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  required
                  type="email"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="name@company.com"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Phone size={16} />
                </span>
                <input
                  type="tel"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Create Password (Min 6 chars) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Lock size={16} />
              </span>
              <input
                required
                type="password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all duration-200 disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Creating Organization...' : 'Create Account & Launch'}
          </button>
        </form>

        <p className="text-[11px] text-slate-400 text-center mt-3">
          As Company Owner, you will be able to create and assign staff accounts with passwords inside your workspace.
        </p>

        <div className="text-center mt-5 text-sm text-slate-500 border-t border-slate-100 pt-4">
          Already registered?{' '}
          <button
            onClick={onSwitchToLogin}
            className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            Sign In Here
          </button>
        </div>
      </div>
    </div>
  );
}
