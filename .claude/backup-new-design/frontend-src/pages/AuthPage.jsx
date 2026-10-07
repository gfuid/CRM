import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarClock, ChevronDown, Info, MessageCircle, ShieldCheck, TriangleAlert, X } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { Button, Field, Input, PasswordInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Link, useRouter } from '../lib/router';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Phone-like characters only (digits, spaces, + ( ) . / -) with an optional "x 12" or "ext 12" at the end
const PHONE_RE = /^\+?[\d\s()./-]+(?:\s*(?:x|ext\.?)\s*\d+)?$/i;
const isPhone = (p) => PHONE_RE.test(p) && p.replace(/\D/g, '').length >= 5;

const BENEFITS = [
  {
    icon: CalendarClock,
    title: 'Know who to follow up today',
    text: 'Your home screen lists overdue and due follow-ups, so no buyer is forgotten.',
  },
  {
    icon: MessageCircle,
    title: 'Log calls and WhatsApp in seconds',
    text: 'Every lead keeps its full history: calls, emails, samples and quotations.',
  },
  {
    icon: ShieldCheck,
    title: 'You decide who sees what',
    text: 'Choose for each employee which leads they see and what they can change.',
  },
];

/** Moves focus to the first field with an error so keyboard and screen-reader users land on it. */
const focusFirstError = (errors, order) => {
  const first = order.find((k) => errors[k]);
  if (first) document.getElementById(first)?.focus();
};

function ErrorBox({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-lg bg-danger-soft px-3.5 py-3 text-[13px] text-danger-ink ring-1 ring-inset ring-danger/20">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Shows a message from the previous session (e.g. "Your session has ended") once, then clears it. */
function useSessionNotice() {
  const { notice, clearNotice } = useAuth();
  const [message, setMessage] = useState(notice);
  // A new notice while this page is open replaces the shown one (adjusting state during render)
  if (notice && notice !== message) setMessage(notice);
  useEffect(() => {
    if (notice) clearNotice();
  }, [notice, clearNotice]);
  return [message, () => setMessage('')];
}

function NoticeBanner() {
  const [message, dismiss] = useSessionNotice();
  if (!message) return null;
  return (
    <div role="status" className="mb-5 flex items-start gap-2.5 rounded-lg bg-info-soft px-3.5 py-3 text-[13px] text-info-ink ring-1 ring-inset ring-info/20">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">{message}</p>
      <button type="button" onClick={dismiss} aria-label="Dismiss message" className="-m-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-info/10">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const email = form.email.trim();
    const next = {};
    if (!email) next['login-email'] = 'Enter your email address.';
    else if (!EMAIL_RE.test(email)) next['login-email'] = 'This email address doesn’t look right.';
    if (!form.password) next['login-password'] = 'Enter your password.';
    setErrors(next);
    setServerError('');
    if (Object.keys(next).length) {
      focusFirstError(next, ['login-email', 'login-password']);
      return;
    }
    setSaving(true);
    try {
      await login(email, form.password);
      toast.success('Signed in. Welcome back!');
      navigate('/app/today');
    } catch (err) {
      setServerError(err.message || 'Could not sign in. Please try again.');
      setSaving(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-ink">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Welcome back. Sign in to see today’s follow-ups.</p>

      <div className="mt-6">
        <NoticeBanner />
      </div>

      <form onSubmit={submit} noValidate className="space-y-4">
        <ErrorBox>{serverError}</ErrorBox>

        <Field label="Email" error={errors['login-email']} required>
          <Input
            id="login-email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            value={form.email}
            onChange={set('email')}
            placeholder="you@company.com"
          />
        </Field>

        <Field label="Password" error={errors['login-password']} required>
          <PasswordInput id="login-password" name="password" autoComplete="current-password" value={form.password} onChange={set('password')} />
        </Field>

        <div>
          <button
            type="button"
            onClick={() => setShowHelp((s) => !s)}
            aria-expanded={showHelp}
            aria-controls="forgot-help"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline"
          >
            Forgot password?
            <ChevronDown className={`h-4 w-4 transition-transform ${showHelp ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {showHelp && (
            <div id="forgot-help" className="mt-2 space-y-1.5 rounded-lg bg-subtle px-3.5 py-3 text-[13px] text-muted">
              <p>
                <span className="font-semibold text-ink">Employees:</span> ask your company owner to set a new password for you from the Team page.
              </p>
              <p>
                <span className="font-semibold text-ink">Company owners:</span> contact our support team and we will help you get back in.
              </p>
            </div>
          )}
        </div>

        <Button type="submit" variant="primary" size="lg" loading={saving} className="w-full">
          {saving ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New to Travel-Trade CRM?{' '}
        <Link to="/signup" className="font-semibold text-primary hover:underline">
          Create a company account
        </Link>
      </p>
    </>
  );
}

/** Rough strength guide; the server only requires 6+ characters. */
const passwordStrength = (pw) => {
  if (!pw) return null;
  if (pw.length < 6) return { level: 0, label: 'Too short. Use at least 6 characters.', tone: 'bg-danger', text: 'text-danger' };
  let score = 0;
  if (pw.length >= 10) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (score <= 1) return { level: 1, label: 'Weak. Add numbers, symbols or more letters.', tone: 'bg-danger', text: 'text-danger' };
  if (score === 2) return { level: 2, label: 'Fair. A longer password is safer.', tone: 'bg-warning', text: 'text-warning-ink' };
  return { level: 3, label: 'Strong password.', tone: 'bg-primary', text: 'text-primary-ink' };
};

function StrengthMeter({ password }) {
  const s = passwordStrength(password);
  if (!s) return <p className="mt-1 text-xs text-muted">At least 6 characters.</p>;
  return (
    <div className="mt-1.5">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${s.level >= i ? s.tone : 'bg-line'}`} />
        ))}
      </div>
      <p className={`mt-1 text-xs font-medium ${s.text}`} aria-live="polite">
        {s.label}
      </p>
    </div>
  );
}

const SIGNUP_ORDER = ['signup-company', 'signup-name', 'signup-email', 'signup-phone', 'signup-password'];

function SignupForm() {
  const { register } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ company_name: '', name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const fieldId = { company_name: 'signup-company', name: 'signup-name', email: 'signup-email', phone: 'signup-phone', password: 'signup-password' };

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[fieldId[key]]) setErrors((er) => ({ ...er, [fieldId[key]]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const data = {
      company_name: form.company_name.trim(),
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
    };
    const next = {};
    if (!data.company_name) next['signup-company'] = 'Enter your company name.';
    else if (data.company_name.length > 120) next['signup-company'] = 'Company name must be 120 characters or fewer.';
    if (!data.name) next['signup-name'] = 'Enter your name.';
    else if (data.name.length > 80) next['signup-name'] = 'Name must be 80 characters or fewer.';
    if (!data.email) next['signup-email'] = 'Enter your email address.';
    else if (!EMAIL_RE.test(data.email)) next['signup-email'] = 'This email address doesn’t look right.';
    if (data.phone.length > 30) next['signup-phone'] = 'Phone number must be 30 characters or fewer.';
    else if (data.phone && !isPhone(data.phone)) next['signup-phone'] = 'Enter a valid phone number, or leave it empty.';
    if (!data.password) next['signup-password'] = 'Choose a password.';
    else if (data.password.length < 6) next['signup-password'] = 'Password must be at least 6 characters.';
    else if (data.password.length > 128) next['signup-password'] = 'Password must be 128 characters or fewer.';

    setErrors(next);
    setServerError(null);
    if (Object.keys(next).length) {
      focusFirstError(next, SIGNUP_ORDER);
      return;
    }

    setSaving(true);
    try {
      await register(data);
      toast.success('Your workspace is ready.');
      navigate('/app/today');
    } catch (err) {
      setServerError({ message: err.message || 'Could not create your account. Please try again.', exists: err.status === 409 });
      setSaving(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-ink">Create your company account</h1>
      <p className="mt-1 text-sm text-muted">For company owners. It takes about a minute.</p>

      <div className="mt-6">
        <NoticeBanner />
      </div>

      <form onSubmit={submit} noValidate className="space-y-4">
        <ErrorBox>
          {serverError && (
            <>
              {serverError.message}
              {serverError.exists && (
                <>
                  {' '}
                  <Link to="/login" className="font-semibold underline underline-offset-2">
                    Go to sign in
                  </Link>
                </>
              )}
            </>
          )}
        </ErrorBox>

        <Field label="Company name" error={errors['signup-company']} required>
          <Input id="signup-company" name="organization" autoComplete="organization" value={form.company_name} onChange={set('company_name')} maxLength={120} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" error={errors['signup-name']} required>
            <Input id="signup-name" name="name" autoComplete="name" value={form.name} onChange={set('name')} maxLength={80} />
          </Field>
          <Field label="Phone" error={errors['signup-phone']} hint="Optional">
            <Input id="signup-phone" type="tel" name="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={set('phone')} maxLength={30} />
          </Field>
        </div>

        <Field label="Email" error={errors['signup-email']} hint="You will use this to sign in." required>
          <Input
            id="signup-email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            value={form.email}
            onChange={set('email')}
            placeholder="you@company.com"
          />
        </Field>

        <div>
          <Field label="Password" error={errors['signup-password']} required>
            <PasswordInput id="signup-password" name="new-password" autoComplete="new-password" value={form.password} onChange={set('password')} maxLength={128} />
          </Field>
          {!errors['signup-password'] && <StrengthMeter password={form.password} />}
        </div>

        <div className="flex items-start gap-2.5 rounded-lg bg-subtle px-3.5 py-3 text-[13px] text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
          <p>
            <span className="font-semibold text-ink">Are you an employee?</span> Your company owner adds you from the Team page, then you sign in here.
          </p>
        </div>

        <Button type="submit" variant="primary" size="lg" loading={saving} className="w-full">
          {saving ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden border-r border-line bg-surface lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-brand-gold/15 blur-3xl" aria-hidden />

      <Link to="/" className="relative flex w-fit items-center gap-2.5 rounded-lg">
        <BrandLogo size={34} />
        <span className="text-lg font-extrabold tracking-tight text-ink">Travel-Trade CRM</span>
      </Link>

      <div className="relative max-w-md">
        <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-ink">
          Every buyer, <span className="text-primary">followed up on time.</span>
        </h2>
        <p className="mt-3 text-[15px] text-muted">A simple CRM for export and trade sales teams.</p>
        <ul className="mt-8 space-y-5">
          {BENEFITS.map((b) => (
            <li key={b.title} className="flex gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-ink">
                <b.icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">{b.title}</span>
                <span className="mt-0.5 block text-[13px] text-muted">{b.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-muted">© {new Date().getFullYear()} Travel-Trade CRM</p>
    </aside>
  );
}

export default function AuthPage({ mode = 'login' }) {
  const signup = mode === 'signup';

  useEffect(() => {
    document.title = `${signup ? 'Create account' : 'Sign in'} · Travel-Trade CRM`;
    return () => {
      document.title = 'Travel-Trade CRM';
    };
  }, [signup]);

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <BrandPanel />

      <main className="flex min-h-screen flex-col px-4 py-6 sm:px-8 lg:min-h-0 lg:py-10">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 rounded-lg lg:hidden">
            <BrandLogo size={28} />
            <span className="text-[15px] font-extrabold tracking-tight text-ink">Travel-Trade CRM</span>
          </Link>
          <Link to="/" className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-muted hover:bg-subtle hover:text-ink">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Home
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md">
            <div className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-line sm:p-8">{signup ? <SignupForm /> : <LoginForm />}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
