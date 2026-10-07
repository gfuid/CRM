import { UsersRound } from 'lucide-react';
import { useRouter } from '../../lib/router';
import { formatDate, formatMoney } from '../../lib/format';
import { Button, Card, CardHeader, ErrorState, Skeleton } from '../ui';
import { SeatBar, SubscriptionBadge } from '../team/billing';
import { plural, seatPrice, subscriptionText } from '../team/helpers';

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-lg bg-subtle px-3 py-2.5 ring-1 ring-inset ring-line">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 text-lg font-bold tabular text-ink">{value}</dd>
      {hint && <dd className="text-xs text-muted">{hint}</dd>}
    </div>
  );
}

/** Read-only plan and seat information. Seats are added by the account manager, not paid in the app. */
export default function BillingTab({ billing, loading, error, onRetry }) {
  const { navigate } = useRouter();

  if (loading && !billing) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-40" />
        <Skeleton className="h-32" />
      </div>
    );
  }
  if (!billing) return <ErrorState message={error?.message || 'Billing details are not available.'} onRetry={onRetry} />;

  const paidActive = billing.subscription_status === 'active' || billing.subscription_status === 'expiring';
  const currency = billing.currency || 'INR';

  return (
    <div className="space-y-4">
      {error && <ErrorState message={error.message} onRetry={onRetry} />}

      <Card>
        <CardHeader title="Your plan" action={<SubscriptionBadge billing={billing} />} />
        <p className="mt-3 text-sm text-ink">
          First {plural(billing.seats_free, 'employee')} {billing.seats_free === 1 ? 'is' : 'are'} free. Each extra employee costs{' '}
          <span className="font-semibold">{seatPrice(billing)}</span>.
        </p>
        <p className="mt-1 text-[13px] text-muted">{subscriptionText(billing)}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Free seats" value={billing.seats_free} />
          <Stat label="Paid seats" value={billing.seats_paid} hint={billing.seats_paid > 0 && !paidActive ? 'Not active' : undefined} />
          <Stat
            label="Paid seats end on"
            value={billing.subscription_ends_at ? formatDate(billing.subscription_ends_at) : '—'}
            hint={billing.subscription_status === 'expiring' && billing.days_left != null ? `${plural(Math.max(0, billing.days_left), 'day')} left` : undefined}
          />
          <Stat
            label="Monthly cost"
            value={formatMoney(billing.monthly_amount || 0, currency)}
            hint={billing.seats_paid > 0 ? `${plural(billing.seats_paid, 'paid seat')} × ${formatMoney(billing.price_per_seat_monthly, currency)}` : 'No paid seats'}
          />
        </dl>
      </Card>

      <Card>
        <CardHeader
          title="Seats in use"
          description="You (the owner) and deactivated employees do not use a seat."
          action={
            <Button size="sm" icon={UsersRound} onClick={() => navigate('/app/team')}>
              Manage team
            </Button>
          }
        />
        <p className="mt-3 text-sm text-ink">
          <span className="text-lg font-bold tabular">{billing.staff_used}</span>{' '}
          <span className="text-muted">of {plural(billing.seat_limit, 'employee seat')} used</span>
          <span className="text-muted"> · {plural(billing.seats_available, 'seat')} available</span>
        </p>
        <div className="mt-2">
          <SeatBar used={billing.staff_used} limit={billing.seat_limit} over={billing.over_limit} />
        </div>
        {billing.over_limit && (
          <p className="mt-2 text-[13px] font-medium text-danger">
            You have more active employees than seats. Deactivate someone, or ask your account manager for more seats.
          </p>
        )}
      </Card>

      <Card>
        <p className="text-sm font-semibold text-ink">Need more seats or want to renew? Contact your account manager.</p>
        <p className="mt-1 text-[13px] text-muted">Seats are added by your account manager. There is nothing to pay inside the CRM.</p>
      </Card>
    </div>
  );
}
