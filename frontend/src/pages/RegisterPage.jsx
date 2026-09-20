import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Crown, Users, ArrowLeft } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

export default function RegisterPage({ onSwitchToLogin }) {
  const { signUpOwner } = useAuth();
  const [persona, setPersona] = useState('owner'); // 'owner' | 'staff'
  const [selectedPlan, setSelectedPlan] = useState('growth'); // 'starter' | 'growth' | 'enterprise'
  const [form, setForm] = useState({
    companyName: '',
    fullName: '',
    phone: '',
    email: '',
    password: '',
    industry: 'Software & Technology',
    teamSize: '5-15 members',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await signUpOwner({
        ...form,
        persona,
        plan: selectedPlan,
      });
    } catch (err) {
      setError(err.message || 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, val) => setForm({ ...form, [field]: val });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-xl p-6 sm:p-8 bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 transition-all">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-2">
          <BrandLogo size={36} />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Join Stellarsync
            </h1>
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Setup your account identity and start closing deals with precision.
        </p>

        {error && (
          <div className="p-3 mb-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Persona Identity Questionnaire */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Your Role / Identity *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPersona('owner')}
                className={`p-3.5 rounded-xl border text-left cursor-pointer flex items-start gap-3 transition-all ${
                  persona === 'owner'
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <Crown size={20} className={persona === 'owner' ? 'text-emerald-600' : 'text-slate-400'} />
                <div>
                  <div className="font-bold text-sm text-slate-900">Company Owner</div>
                  <div className="text-xs text-slate-500">Founder / Decision Maker</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPersona('staff')}
                className={`p-3.5 rounded-xl border text-left cursor-pointer flex items-start gap-3 transition-all ${
                  persona === 'staff'
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <Users size={20} className={persona === 'staff' ? 'text-emerald-600' : 'text-slate-400'} />
                <div>
                  <div className="font-bold text-sm text-slate-900">Sales Staff</div>
                  <div className="text-xs text-slate-500">Representative / SDR</div>
                </div>
              </button>
            </div>
          </div>

          {/* Subscription Tier Selection if Owner */}
          {persona === 'owner' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Plan & Staff Quota
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'starter', name: 'Starter', price: '$29/mo', seats: 'Up to 3 seats' },
                  { id: 'growth', name: 'Growth', price: '$79/mo', seats: 'Up to 15 seats' },
                  { id: 'enterprise', name: 'Enterprise', price: '$199/mo', seats: 'Unlimited' },
                ].map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                      selectedPlan === plan.id
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900">{plan.name}</div>
                    <div className="font-extrabold text-base text-emerald-600 my-0.5">{plan.price}</div>
                    <div className="text-[11px] text-slate-500">{plan.seats}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Company / Organization Name *
            </label>
            <input
              required
              type="text"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="e.g. Acme Cloud Corp"
              value={form.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Your Full Name *
            </label>
            <input
              required
              type="text"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="e.g. Sarah Connor"
              value={form.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email *
              </label>
              <input
                required
                type="email"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="name@company.com"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="+1 (555) 000-0000"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password (min 6 chars) *
            </label>
            <input
              required
              type="password"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all duration-200 disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Setting up Workspace...' : 'Create Account & Launch'}
          </button>
        </form>

        <div className="text-center mt-6 text-sm text-slate-500">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            Sign In here
          </button>
        </div>
      </div>
    </div>
  );
}
