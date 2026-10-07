import { useState } from 'react';
import { LogIn, Moon, Sun, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Button, Field, IconButton, Input, PasswordInput } from '../components/ui';
import BrandLogo from '../components/BrandLogo';

const CRM_URL = import.meta.env.VITE_SALES_CRM_URL || '';

export default function LoginPage() {
  const { signIn, notice } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Enter the administrator username (or email) and password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await signIn(username.trim(), password);
      setPassword('');
      toast.success('Signed in');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <IconButton
        icon={theme === 'dark' ? Sun : Moon}
        label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={toggle}
        className="absolute right-3 top-3"
      />
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo size={48} />
          <h1 className="mt-3 text-xl font-bold text-ink">Platform admin</h1>
          <p className="mt-1 text-[13px] text-muted">Manage every company that uses Travel-Trade CRM.</p>
        </div>

        <form onSubmit={submit} noValidate className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-line sm:p-6">
          {notice && (
            <div role="status" className="mb-4 flex items-start gap-2 rounded-lg bg-info-soft px-3 py-2.5 text-[13px] text-info-ink">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{notice}</span>
            </div>
          )}
          <div className="space-y-4">
            <Field label="Username or email" required>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
              />
            </Field>
            <Field label="Password" required>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </Field>
            {error && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger-ink">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" size="lg" icon={LogIn} loading={busy} className="w-full">
              Sign in
            </Button>
          </div>
        </form>
        <p className="mt-4 text-center text-xs text-muted">
          The administrator account is set on the server (ADMIN_USERNAME and ADMIN_PASSWORD). Company owners and staff sign in on the{' '}
          {CRM_URL ? (
            <a href={CRM_URL} className="font-semibold text-primary hover:underline">
              main CRM site
            </a>
          ) : (
            'main CRM site'
          )}
          .
        </p>
      </div>
    </div>
  );
}
