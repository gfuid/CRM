import { useState } from 'react';
import {
  Building,
  Wallet,
  Armchair,
  Users,
  RefreshCw,
  BellRing,
  CircleCheckBig,
  Hourglass,
  CalendarX,
  Ban,
  TriangleAlert,
  Gift,
  ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { useRouter, Link } from '../lib/router';
import { useToast } from '../context/ToastContext';
import { formatDay, formatDateTime, formatDuration, formatMoney, formatNumber, plural } from '../lib/format';
import { Badge, Button, IconButton, Card, CardHeader, ConfirmDialog, EmptyState, ErrorState, PageHeader, Skeleton, StatCard } from '../components/ui';
import { SubscriptionBadge, daysLeftText, monthlyText } from '../components/billing';

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-[88px] rounded-xl" />
      ))}
    </div>
  );
}

function HealthCard() {
  const { data, error, loading, reload } = useAsync(() => api.health(), []);
  const inMemory = data?.database && /memory/i.test(data.database);
  return (
    <Card>
      <CardHeader
        title="Server health"
        description="Live status of the API server."
        action={<IconButton icon={RefreshCw} size="sm" label="Refresh server health" onClick={() => reload()} disabled={loading} />}
      />
      <div className="mt-4">
        {error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : loading && !data ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : data ? (
          <dl className="space-y-2.5 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted">Database</dt>
              <dd className="text-right">
                {inMemory ? <Badge tone="red">{data.database}</Badge> : <Badge tone="green" dot>{data.database}</Badge>}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Running for</dt>
              <dd className="tabular font-semibold text-ink">{formatDuration(data.uptime_seconds)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Memory used</dt>
              <dd className="tabular font-semibold text-ink">{formatNumber(data.memory_mb)} MB</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Node.js</dt>
              <dd className="font-semibold text-ink">{data.node}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Server time</dt>
              <dd className="text-right font-semibold text-ink">{formatDateTime(data.server_time)}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </Card>
  );
}

function PricingCard({ settings }) {
  if (!settings) return null;
  return (
    <Card>
      <CardHeader
        title="Pricing"
        action={
          <Link to="/settings" className="text-[13px] font-semibold text-primary hover:underline">
            Change
          </Link>
        }
      />
      <p className="mt-3 text-sm text-muted">
        Every company gets <span className="font-semibold text-ink">{plural(settings.free_seats, 'employee')}</span> free. Each extra employee costs{' '}
        <span className="font-semibold text-ink">{formatMoney(settings.price_per_seat_monthly, settings.currency)}</span> per month.
      </p>
      <p className="mt-2 text-sm text-muted">
        Owners see a renewal reminder <span className="font-semibold text-ink">{plural(settings.reminder_days_before_expiry, 'day')}</span> before their subscription ends.
      </p>
    </Card>
  );
}

function ExpiringList({ data, onRemind }) {
  const { navigate } = useRouter();
  const total = (data.subscriptions?.expiring || 0) + (data.subscriptions?.expired || 0);
  const rows = data.expiring_soon || [];
  return (
    <Card padded={false}>
      <div className="p-4 sm:p-5">
        <CardHeader
          title="Expiring or expired"
          description={
            total
              ? `${plural(total, 'company', 'companies')} need${total === 1 ? 's' : ''} to renew.${total > rows.length ? ` Showing the first ${rows.length}.` : ''}`
              : 'Companies whose paid seats are ending soon or have ended.'
          }
          action={
            <Button variant="primary" size="sm" icon={BellRing} onClick={onRemind} disabled={!total}>
              Send reminders to all
            </Button>
          }
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={CircleCheckBig} title="Nothing to renew" message="No paid subscription is ending soon." className="py-8" />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {rows.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => navigate(`/companies?company=${encodeURIComponent(c.id)}`)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-subtle sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 truncate font-semibold text-ink">{c.name}</span>
                    <SubscriptionBadge billing={c.billing} />
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted">
                    {c.owner ? `${c.owner.name} · ${c.owner.email}` : 'No owner'}
                  </div>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <div className="text-[13px] font-semibold text-ink">{formatDay(c.billing.subscription_ends_at)}</div>
                  <div className="text-xs text-muted">{daysLeftText(c.billing)}</div>
                </div>
                <div className="hidden shrink-0 text-right text-[13px] text-muted md:block md:w-32">{monthlyText(c.billing)}</div>
                <ChevronRight className="h-4 w-4 shrink-0 text-faint" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function OverviewPage() {
  const toast = useToast();
  const { navigate } = useRouter();
  const { data, error, loading, reload } = useAsync(() => api.overview(), []);
  const [confirmRemind, setConfirmRemind] = useState(false);

  const currency = data?.settings?.currency || 'INR';
  const toCompanies = (status) => navigate(status ? `/companies?status=${status}` : '/companies');
  const toRenew = (data?.subscriptions?.expiring || 0) + (data?.subscriptions?.expired || 0);

  const sendReminders = async () => {
    try {
      const res = await api.remindExpiring();
      const sent = res?.sent ?? 0;
      toast.success(sent ? `Reminder sent to ${plural(sent, 'owner')}` : 'No owners needed a reminder');
      reload({ quiet: true });
    } catch (e) {
      toast.error(e.message);
      throw e;
    }
  };

  return (
    <div>
      <PageHeader
        title="Overview"
        description="All customer companies at a glance. Demo workspaces are not counted."
        actions={
          <Button icon={RefreshCw} onClick={() => reload()} loading={loading && !!data}>
            Refresh
          </Button>
        }
      />

      {error && !data ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data ? (
        <div className="space-y-5">
          <StatsSkeleton />
          <StatsSkeleton />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-5">
          {error && <ErrorState message={error.message} onRetry={reload} />}
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Companies"
              value={formatNumber(data.companies)}
              hint={`${formatNumber(data.new_this_month)} new this month`}
              icon={Building}
              onClick={() => toCompanies('')}
            />
            <StatCard
              label="Monthly revenue"
              value={formatMoney(data.monthly_revenue, currency, { compact: true })}
              hint="From active paid seats"
              icon={Wallet}
              tone="info"
            />
            <StatCard
              label="Paid seats"
              value={formatNumber(data.paid_seats)}
              hint={`${formatMoney(data.settings?.price_per_seat_monthly, currency)} per seat per month`}
              icon={Armchair}
              tone="info"
            />
            <StatCard
              label="Active employees"
              value={formatNumber(data.employees_active)}
              hint={`${formatNumber(data.employees_total)} in total · ${plural(data.owners, 'owner')}`}
              icon={Users}
            />
          </div>

          <div>
            <h2 className="mb-2 text-[13px] font-semibold text-muted">Subscriptions</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <StatCard label="Free plan" value={formatNumber(data.subscriptions?.free)} icon={Gift} tone="info" onClick={() => toCompanies('free')} />
              <StatCard label="Active" value={formatNumber(data.subscriptions?.active)} icon={CircleCheckBig} onClick={() => toCompanies('active')} />
              <StatCard
                label="Expiring soon"
                value={formatNumber(data.subscriptions?.expiring)}
                icon={Hourglass}
                tone="warning"
                onClick={() => toCompanies('expiring')}
              />
              <StatCard label="Expired" value={formatNumber(data.subscriptions?.expired)} icon={CalendarX} tone="danger" onClick={() => toCompanies('expired')} />
              <StatCard label="Suspended" value={formatNumber(data.suspended)} icon={Ban} tone="danger" onClick={() => toCompanies('suspended')} />
              <StatCard
                label="Over seat limit"
                value={formatNumber(data.over_seat_limit)}
                hint="More employees than seats"
                icon={TriangleAlert}
                tone="warning"
              />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <ExpiringList data={data} onRemind={() => setConfirmRemind(true)} />
            </div>
            <div className="space-y-5">
              <HealthCard />
              <PricingCard settings={data.settings} />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmRemind}
        onClose={() => setConfirmRemind(false)}
        onConfirm={sendReminders}
        title="Send renewal reminders?"
        message={`Every owner whose subscription is ending soon or has ended (${plural(toRenew, 'company', 'companies')}) gets a billing notification in their CRM.`}
        confirmLabel="Send reminders"
      />
    </div>
  );
}
