import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Sparkles, Lock, Mail, Eye, EyeOff, Building2, UserCheck, Users, ShieldCheck } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

export default function LoginPage({ onSwitchToRegister, onBackToLanding, initialPersona = 'owner' }) {
  const { signIn } = useAuth();
  const [loginPersona, setLoginPersona] = useState(initialPersona); // 'owner' | 'staff'
  const [email, setEmail] = useState(() => localStorage.getItem('crm_remembered_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
              {loginPersona === 'owner' ? 'Owner Sign In' : 'Staff & Employee Sign In'}
            </h1>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          {loginPersona === 'owner'
            ? 'Sign in to access your company dashboard, team pipeline, and trade leads.'
            : 'Enter the email & password assigned by your company owner to access your leads.'}
        </p>

        {/* Persona Segmented Switch: Company Owner vs Staff / Employee */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 border border-slate-200/80">
          <button
            type="button"
            onClick={() => {
              setLoginPersona('owner');
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              loginPersona === 'owner'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 size={14} className={loginPersona === 'owner' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>Company Owner</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginPersona('staff');
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              loginPersona === 'staff'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck size={14} className={loginPersona === 'staff' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>Staff / Employee</span>
          </button>
        </div>

        {/* Informative Guidance Banner */}
        {loginPersona === 'staff' ? (
          <div className="p-3 mb-4 bg-emerald-50/80 border border-emerald-200/70 text-emerald-900 rounded-xl text-xs flex items-start gap-2">
            <ShieldCheck size={15} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Staff Access Portal: </span>
              Use the login credentials assigned to you by your Company Owner. You do not need to register a company.
            </div>
          </div>
        ) : (
          <div className="p-2.5 mb-4 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs flex items-center gap-2">
            <Building2 size={14} className="text-emerald-600 shrink-0" />
            <span>Company Founder / Workspace Admin account</span>
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {loginPersona === 'owner' ? 'Owner Email Address' : 'Employee Work Email'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Mail size={16} />
              </span>
              <input
                type="email"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder={loginPersona === 'owner' ? 'owner@travel-trade.com' : 'employee@company.com'}
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
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
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
              onClick={() => setError(loginPersona === 'staff' ? 'Please ask your Company Owner to reset or remind your password.' : 'Please contact administrator or re-register your company.')}
              className="text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all duration-200 disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Authenticating...' : (loginPersona === 'owner' ? 'Sign In as Owner' : 'Sign In as Staff')}
          </button>
        </form>

        <div className="text-center mt-6 text-sm text-slate-500">
          {loginPersona === 'owner' ? (
            <>
              Don't have a company account?{' '}
              <button
                onClick={onSwitchToRegister}
                className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                Register Company
              </button>
            </>
          ) : (
            <>
              Don't have a staff login yet?{' '}
              <span className="font-semibold text-slate-700">
                Ask your Company Owner to add your account.
              </span>
            </>
          )}
      </div>
    </div>
  );
}
