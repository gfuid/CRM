import { useEffect } from 'react';
import { Building2, CreditCard, History, ListChecks, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Link, useRouter } from '../lib/router';
import { ErrorState, PageHeader } from '../components/ui';
import CompanyTab from '../components/settings/CompanyTab';
import ListsTab from '../components/settings/ListsTab';
import TrashTab from '../components/settings/TrashTab';
import ActivityTab from '../components/settings/ActivityTab';
import BillingTab from '../components/settings/BillingTab';

const TABS = [
  { key: 'company', label: 'Company', icon: Building2 },
  { key: 'lists', label: 'Lists', icon: ListChecks },
  { key: 'trash', label: 'Trash', icon: Trash2 },
  { key: 'activity', label: 'Activity log', icon: History },
  { key: 'billing', label: 'Billing', icon: CreditCard },
];

function TabNav({ active }) {
  return (
    <nav aria-label="Settings sections" className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {TABS.map((t) => {
          const current = t.key === active;
          return (
            <li key={t.key}>
              <Link
                to={`/app/settings/${t.key}`}
                aria-current={current ? 'page' : undefined}
                className={`-mb-px flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors ${
                  current ? 'border-primary text-primary-ink' : 'border-transparent text-muted hover:border-line hover:text-ink'
                }`}
              >
                <t.icon className="h-4 w-4" aria-hidden />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Owner-only settings: company, dropdown lists, trash, activity log and billing. */
export default function SettingsPage() {
  const { param } = useRouter();
  const { setCompany } = useAuth();
  const tab = TABS.some((t) => t.key === param) ? param : 'company';

  // Fresh company data (lists may have grown since sign-in) plus billing for the Billing tab
  const { data, error, loading, reload } = useAsync(() => api.company(), []);
  useEffect(() => {
    if (data?.company) setCompany(data.company);
  }, [data, setCompany]);

  return (
    <>
      <PageHeader title="Settings" description="Company details, dropdown lists, deleted leads, the activity log and your plan." />
      <TabNav active={tab} />
      {error && (tab === 'company' || tab === 'lists') && (
        <div className="mb-4">
          <ErrorState message={`We could not load the latest company details, so this may be out of date. ${error.message}`} onRetry={() => reload()} />
        </div>
      )}
      {tab === 'company' && <CompanyTab />}
      {tab === 'lists' && <ListsTab />}
      {tab === 'trash' && <TrashTab />}
      {tab === 'activity' && <ActivityTab />}
      {tab === 'billing' && <BillingTab billing={data?.billing} loading={loading} error={error} onRetry={() => reload()} />}
    </>
  );
}
