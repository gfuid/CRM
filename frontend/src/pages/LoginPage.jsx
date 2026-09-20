import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Sparkles, Lock, Mail } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

export default function LoginPage({ onSwitchToRegister, onBackToLanding }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('owner@stellarsync.io');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn({ email, password });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md p-6 sm:p-8 bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 transition-all">
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-4 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to Home</span>
          </button>
        )}

        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-2">
          <BrandLogo size={36} />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Welcome back
            </h1>
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Sign in to your Stellarsync CRM workspace
        </p>

        {/* Quick Demo Credentials Pill */}
        <div className="flex items-center justify-between p-3 mb-5 bg-emerald-50/80 border border-emerald-200/60 rounded-xl text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-emerald-600" />
            <span>Pre-filled with Demo Owner account</span>
          </div>
          <span className="font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
            Ready
          </span>
        </div>

        {error && (
          <div className="p-3 mb-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Work Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Mail size={16} />
              </span>
              <input
                type="email"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="owner@stellarsync.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Lock size={16} />
              </span>
              <input
                type="password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all duration-200 disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In to Workspace'}
          </button>
        </form>

        <div className="text-center mt-6 text-sm text-slate-500">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            Register Company
          </button>
        </div>
      </div>
    </div>
  );
}
