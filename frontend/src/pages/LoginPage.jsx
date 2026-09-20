import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Sparkles, Lock, Mail } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

export default function LoginPage({ onSwitchToRegister, onBackToLanding }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(() => localStorage.getItem('crm_remembered_email') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem('crm_remembered_email')));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn({ email, password });
      if (rememberMe) {
        localStorage.setItem('crm_remembered_email', email.trim());
      } else {
        localStorage.removeItem('crm_remembered_email');
      }
      window.history.pushState({}, '', '/');
    } catch (err) {
      const rawMsg = err.message || '';
      if (
        rawMsg.toLowerCase().includes("reading 'id'") ||
        rawMsg.toLowerCase().includes('cannot read') ||
        rawMsg.includes('500') ||
        rawMsg.toLowerCase().includes('internal server error')
      ) {
        setError('Invalid email or password. No account found with this email.');
      } else {
        setError(rawMsg || 'Invalid email or password');
      }
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
          Sign in to your Travel-Trade CRM workspace
        </p>

        {error && (
          <div className="p-3 mb-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>{error}</span>
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
                placeholder="owner@travel-trade.com"
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

          {/* Remember Me Checkbox & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-900 font-medium">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer accent-emerald-600"
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => setError('Please contact your administrator or register a new company account.')}
              className="text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Forgot password?
            </button>
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
