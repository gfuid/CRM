import { useRef, useState } from 'react';
import {
  AlarmClock,
  ArrowRight,
  CalendarDays,
  ChartColumn,
  CheckCircle2,
  FileSpreadsheet,
  History,
  ListChecks,
  ListTodo,
  MessageCircle,
  Phone,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  UsersRound,
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { Skeleton } from '../components/ui';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { ACTIVITY_TYPES, PERMISSION_INFO, STAGES, TONE_CLASSES } from '../lib/constants';

const plural = (n, word) => `${n} ${n === 1 ? word : `${word}s`}`;

// Public price: show paise / cents when the price has them, so 4.99 never shows as 5
const formatPrice = (amount, currency) => {
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Unknown currency code from the server: show the code and the exact number
    return `${currency} ${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
};

/* ── Product tour: every item below describes a real screen of the app ── */

function TourList({ items }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li key={it.title} className="flex items-start gap-3 rounded-xl bg-subtle px-3.5 py-3 ring-1 ring-inset ring-line">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${it.tone || 'bg-primary-soft text-primary-ink'}`}>
            <it.icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">{it.title}</span>
            <span className="mt-0.5 block text-[13px] text-muted">{it.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const TOUR = [
  {
    id: 'today',
    label: 'Today',
    title: 'Open the app and know exactly who to contact',
    text: 'The home screen gathers everything that needs you today, so nothing slips through.',
    points: ['Tap Call or WhatsApp straight from the list', 'Log what happened in a few seconds', 'Switch between your own work and the whole team'],
    visual: () => (
      <TourList
        items={[
          { icon: TriangleAlert, title: 'Overdue follow-ups', text: 'Oldest first, with how many days late.', tone: 'bg-danger-soft text-danger-ink' },
          { icon: AlarmClock, title: 'Due today', text: 'Buyers you promised to contact today.', tone: 'bg-warning-soft text-warning-ink' },
          { icon: ListChecks, title: 'Tasks', text: 'Tick them off as you finish them.', tone: 'bg-info-soft text-info-ink' },
          { icon: CalendarDays, title: 'Next 7 days', text: 'See what is coming up this week.' },
        ]}
      />
    ),
  },
  {
    id: 'leads',
    label: 'Leads',
    title: 'A pipeline made for export deals',
    text: 'Track every buyer from the first enquiry to a closed deal, with the stages trade teams actually use.',
    points: ['Products, country, value and priority on each lead', 'Set the next follow-up date on each lead', 'Warns you before you add the same buyer twice'],
    visual: () => (
      <ol className="grid gap-2 sm:grid-cols-2">
        {STAGES.map((s, i) => (
          <li key={s.key} className="flex items-center gap-3 rounded-xl bg-subtle px-3.5 py-2.5 ring-1 ring-inset ring-line">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-muted ring-1 ring-line">{i + 1}</span>
            <span className={`truncate rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONE_CLASSES[s.tone]}`}>{s.key}</span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    id: 'activity',
    label: 'Activity log',
    title: 'Every call, message and sample on record',
    text: 'Each lead keeps its full history. When someone is on leave, anyone can pick up where they left off.',
    points: ['One tap to log a call, WhatsApp or email', 'Notes and the next follow-up date in the same step', 'Stage changes and reassignments are recorded automatically'],
    visual: () => (
      <ul className="flex flex-wrap gap-2">
        {ACTIVITY_TYPES.map((a) => (
          <li key={a.key} className="rounded-full bg-subtle px-3 py-1.5 text-[13px] font-semibold text-ink ring-1 ring-inset ring-line">
            {a.label}
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: 'reports',
    label: 'Reports',
    title: 'Reports built from real work, not typed-up summaries',
    text: 'Numbers come straight from the leads, tasks and activities your team records.',
    points: ['Pick any date range', 'Staff can see only their own numbers if you prefer', 'Download your leads as a CSV file'],
    visual: () => (
      <TourList
        items={[
          { icon: ChartColumn, title: 'Pipeline overview', text: 'Leads and value by stage, source and product.' },
          { icon: History, title: 'Daily report', text: 'What each person did, day by day.', tone: 'bg-info-soft text-info-ink' },
          { icon: Phone, title: 'Outreach counts', text: 'Calls, emails, WhatsApps and meetings per person.', tone: 'bg-warning-soft text-warning-ink' },
        ]}
      />
    ),
  },
  {
    id: 'team',
    label: 'Team',
    title: 'You decide what each employee can do',
    text: 'Add sales staff in a minute and switch each permission on or off.',
    points: ['Deleted leads go to a trash you can restore from', 'An activity history of important changes for the owner', 'Turn off an employee’s access and hand their leads to someone else'],
    visual: () => (
      <ul className="divide-y divide-line rounded-xl bg-subtle ring-1 ring-inset ring-line">
        {PERMISSION_INFO.slice(0, 7).map((p) => (
          <li key={p.key} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px] text-ink">
            <span className="min-w-0">{p.label}</span>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          </li>
        ))}
      </ul>
    ),
  },
];

function ProductTour() {
  const [active, setActive] = useState(TOUR[0].id);
  const tabRefs = useRef({});
  const tab = TOUR.find((t) => t.id === active) || TOUR[0];

  const onKeyDown = (e) => {
    const i = TOUR.findIndex((t) => t.id === active);
    let next = null;
    if (e.key === 'ArrowRight') next = TOUR[(i + 1) % TOUR.length];
    else if (e.key === 'ArrowLeft') next = TOUR[(i - 1 + TOUR.length) % TOUR.length];
    else if (e.key === 'Home') next = TOUR[0];
    else if (e.key === 'End') next = TOUR[TOUR.length - 1];
    if (!next) return;
    e.preventDefault();
    setActive(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <div className="rounded-3xl bg-surface p-3 text-left shadow-pop ring-1 ring-line sm:p-5">
      <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="hidden items-center gap-1.5 px-1 sm:flex" aria-hidden>
          <span className="h-3 w-3 rounded-full bg-brand-red" />
          <span className="h-3 w-3 rounded-full bg-brand-gold" />
          <span className="h-3 w-3 rounded-full bg-brand-mint" />
        </div>
        <div role="tablist" aria-label="Product tour" className="flex flex-wrap gap-1 rounded-xl bg-subtle p-1 ring-1 ring-inset ring-line" onKeyDown={onKeyDown}>
          {TOUR.map((t) => {
            const selected = t.id === active;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                type="button"
                role="tab"
                id={`tour-tab-${t.id}`}
                aria-selected={selected}
                aria-controls="tour-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(t.id)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  selected ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id="tour-panel"
        role="tabpanel"
        aria-labelledby={`tour-tab-${tab.id}`}
        tabIndex={0}
        className="grid gap-6 px-1 pb-1 pt-5 sm:px-2 md:grid-cols-2 md:items-start"
      >
        <div>
          <h3 className="text-xl font-bold text-ink">{tab.title}</h3>
          <p className="mt-2 text-sm text-muted">{tab.text}</p>
          <ul className="mt-4 space-y-2">
            {tab.points.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-ink">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div>{tab.visual()}</div>
      </div>
    </div>
  );
}

/* ── Features ── */

const FEATURES = [
  {
    icon: AlarmClock,
    title: 'Follow-up reminders',
    text: 'Set a follow-up date on each lead. Overdue and due follow-ups are waiting for you every morning.',
    tone: 'bg-danger-soft text-danger-ink',
  },
  {
    icon: MessageCircle,
    title: 'Call and WhatsApp in one tap',
    text: 'Start a call or a WhatsApp chat from the lead, then log what was said.',
    tone: 'bg-primary-soft text-primary-ink',
  },
  {
    icon: ListTodo,
    title: 'Tasks with due times',
    text: 'Create tasks for yourself or give them to employees, linked to the right lead.',
    tone: 'bg-info-soft text-info-ink',
  },
  {
    icon: FileSpreadsheet,
    title: 'Import and export',
    text: 'Bring in your existing buyer list from a CSV file, and download it again whenever you need.',
    tone: 'bg-warning-soft text-warning-ink',
  },
  {
    icon: ShieldCheck,
    title: 'Permissions per employee',
    text: 'Decide who sees all leads, who can delete, who can export and who can assign work.',
    tone: 'bg-primary-soft text-primary-ink',
  },
  {
    icon: Smartphone,
    title: 'Works on your phone',
    text: 'The same app works on a phone, tablet or computer. Nothing to install.',
    tone: 'bg-info-soft text-info-ink',
  },
];

/* ── Pricing (live from the server) ── */

function PricingCard({ onRegisterClick }) {
  const pricing = useAsync(() => api.publicPricing(), []);
  const p = pricing.data;
  const free = Math.max(0, Number(p?.free_seats) || 0);
  const price = Number(p?.price_per_seat_monthly) || 0;

  let body;
  if (pricing.loading) {
    body = (
      <div className="space-y-3" aria-busy="true" aria-label="Loading pricing">
        <Skeleton className="mx-auto h-8 w-3/4" />
        <Skeleton className="mx-auto h-5 w-1/2" />
      </div>
    );
  } else if (pricing.error || !p) {
    body = (
      <div>
        <p className="text-2xl font-extrabold text-ink sm:text-3xl">Start free with a small team.</p>
        <p className="mt-2 text-sm text-muted">You pay a monthly fee only for extra employees. We couldn’t load the current price right now.</p>
        <button
          type="button"
          onClick={() => pricing.reload()}
          className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Try again
        </button>
      </div>
    );
  } else {
    body = (
      <div>
        <p className="text-2xl font-extrabold text-ink sm:text-3xl">
          {free > 0 ? `Start free with ${plural(free, 'employee')}.` : 'Simple pricing per employee.'}
        </p>
        <p className="mt-2 text-base text-muted">
          {price > 0 ? (
            <>
              Each {free > 0 ? 'extra ' : ''}employee costs <span className="font-bold text-ink">{formatPrice(price, p.currency || 'INR')}</span> per month.
            </>
          ) : (
            'Adding employees is free right now.'
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl bg-surface p-6 text-center shadow-pop ring-1 ring-line sm:p-10">
      {body}
      <ul className="mx-auto mt-6 grid max-w-md gap-2.5 text-left text-sm text-ink">
        {[
          'Your own owner account is always free',
          'Every feature is included. No plans to compare',
          'No credit card needed to start',
        ].map((t) => (
          <li key={t} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            {t}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onRegisterClick}
        className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-primary-strong sm:w-auto"
      >
        Create your free account
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/* ── Page ── */

const navLink = 'rounded-md px-1 text-[13px] font-semibold text-muted transition-colors hover:text-ink';

export default function LandingPage({ onLoginClick, onRegisterClick }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-canvas text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <a href="#top" className="flex min-w-0 items-center gap-2.5 rounded-lg">
            <BrandLogo size={30} />
            <span className="truncate text-[15px] font-extrabold tracking-tight text-ink sm:text-base">Travel-Trade CRM</span>
          </a>

          <nav aria-label="Page sections" className="hidden items-center gap-7 md:flex">
            <a href="#tour" className={navLink}>
              Product tour
            </a>
            <a href="#features" className={navLink}>
              Features
            </a>
            <a href="#pricing" className={navLink}>
              Pricing
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onLoginClick}
              className="inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-bold text-ink transition-colors hover:bg-subtle"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onRegisterClick}
              className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-primary-strong sm:px-4"
            >
              Get started<span className="hidden sm:inline">&nbsp;free</span>
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-primary-soft/70 to-transparent" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 text-center sm:px-6 sm:pt-16">
            <p className="inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-1 text-xs font-bold text-primary-ink ring-1 ring-inset ring-primary/25">
              <UsersRound className="h-3.5 w-3.5" aria-hidden />
              Built for export and trade sales teams
            </p>

            <h1 className="mx-auto mt-5 max-w-4xl text-[34px] font-black leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Never miss a follow-up with a{' '}
              <span className="bg-gradient-to-r from-primary to-teal-500 bg-clip-text text-transparent">buyer again</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base text-muted sm:text-lg">
              Keep every buyer enquiry, call, WhatsApp, sample and quotation in one place. See who to contact each day, and know what your sales team is doing.
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onRegisterClick}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-[15px] font-bold text-white shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:bg-primary-strong"
              >
                Create free account
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={onLoginClick}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-surface px-7 text-[15px] font-bold text-ink shadow-sm ring-1 ring-inset ring-line transition-colors hover:bg-subtle"
              >
                Sign in
              </button>
            </div>

            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-muted">
              {['No credit card needed', 'Free to start', 'Works on phone and computer'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>

            <div id="tour" className="mt-14 scroll-mt-20">
              <ProductTour />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-16 border-t border-line bg-surface py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Features</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Everything a trade sales team needs, nothing it doesn’t</h2>
              <p className="mt-2 text-sm text-muted">Simple enough for the whole team to use every day.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl bg-canvas p-6 ring-1 ring-line">
                  <span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${f.tone}`}>
                    <f.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="text-base font-bold text-ink">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-16 border-t border-line py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Pricing</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Pay only for the people you add</h2>
            </div>
            <PricingCard onRegisterClick={onRegisterClick} />
          </div>
        </section>

        {/* Closing call to action */}
        <section className="border-t border-line bg-surface py-14">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 text-center sm:px-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Set up your team in a few minutes</h2>
            <p className="max-w-xl text-sm text-muted">Create your company account, add your first leads, then invite your sales staff.</p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={onRegisterClick}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-primary-strong"
              >
                Create free account
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={onLoginClick}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-surface px-6 text-[15px] font-bold text-ink ring-1 ring-inset ring-line transition-colors hover:bg-subtle"
              >
                I already have an account
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-canvas px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={26} />
            <span className="text-sm font-bold text-ink">Travel-Trade CRM</span>
          </div>
          <p className="text-xs text-muted">© {new Date().getFullYear()} Travel-Trade CRM</p>
          <div className="flex items-center gap-4">
            <button type="button" onClick={onLoginClick} className="text-[13px] font-semibold text-muted hover:text-ink">
              Sign in
            </button>
            <button type="button" onClick={onRegisterClick} className="text-[13px] font-semibold text-muted hover:text-ink">
              Create account
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
