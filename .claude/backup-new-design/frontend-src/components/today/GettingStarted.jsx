import { ChevronRight, FileSpreadsheet, Rocket, Settings, UserPlus, UserRoundPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../lib/router';

/** Shown when there are no leads yet: the few steps that make the CRM useful. */
export default function GettingStarted() {
  const { isOwner, can } = useAuth();
  const { navigate } = useRouter();

  const steps = [
    can('leads_create') && {
      key: 'lead',
      icon: UserPlus,
      title: 'Add your first lead',
      text: 'Save a buyer with their contact details and set a follow-up date.',
      to: '/app/leads?new=1',
    },
    can('leads_import') && {
      key: 'import',
      icon: FileSpreadsheet,
      title: 'Import leads from CSV',
      text: 'Already have a list in Excel or Google Sheets? Bring it in at once.',
      to: '/app/leads',
    },
    isOwner && {
      key: 'team',
      icon: UserRoundPlus,
      title: 'Add an employee',
      text: 'Give your sales staff their own sign-in and choose what they can see.',
      to: '/app/team',
    },
    isOwner && {
      key: 'settings',
      icon: Settings,
      title: 'Set your currency and lists',
      text: 'Choose your currency, products, lead sources and payment terms.',
      to: '/app/settings',
    },
  ].filter(Boolean);

  return (
    <section aria-labelledby="getting-started-title" className="rounded-xl bg-surface p-4 shadow-card ring-1 ring-line sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-ink">
          <Rocket className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="getting-started-title" className="text-[15px] font-bold text-ink">
            {isOwner ? 'Let’s set up your workspace' : 'You don’t have any leads yet'}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {isOwner
              ? 'Your follow-ups and tasks will show up here once you add leads. Start with these steps.'
              : steps.length
                ? 'Your follow-ups will show up here once you add leads.'
                : 'Leads assigned to you will show up here. Ask your company owner to assign some to you.'}
          </p>
        </div>
      </div>

      {steps.length > 0 && (
        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
          {steps.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => navigate(s.to)}
                className="group flex h-full w-full items-start gap-3 rounded-lg p-3 text-left ring-1 ring-inset ring-line transition-colors hover:bg-subtle hover:ring-primary/40"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-subtle text-xs font-bold text-muted group-hover:bg-primary group-hover:text-white">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <s.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {s.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted">{s.text}</span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-faint group-hover:text-primary" aria-hidden />
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
