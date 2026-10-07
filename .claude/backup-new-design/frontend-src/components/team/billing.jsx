import { TriangleAlert } from 'lucide-react';
import { Badge, Card } from '../ui';
import { plural, seatPrice, subscriptionText } from './helpers';

const STATUS = {
  free: { tone: 'slate', label: 'Free plan' },
  active: { tone: 'green', label: 'Active' },
  expiring: { tone: 'amber', label: 'Ending soon' },
  expired: { tone: 'red', label: 'Expired' },
};

export function SubscriptionBadge({ billing }) {
  const s = STATUS[billing?.subscription_status] || STATUS.free;
  const label =
    billing?.subscription_status === 'expiring' && billing.days_left != null
      ? `Ends in ${plural(Math.max(0, billing.days_left), 'day')}`
      : s.label;
  return (
    <Badge tone={s.tone} dot>
      {label}
    </Badge>
  );
}

export function SeatBar({ used, limit, over }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : used > 0 ? 100 : 0;
  const color = over ? 'bg-danger' : used >= limit ? 'bg-warning' : 'bg-primary';
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-subtle ring-1 ring-inset ring-line"
      role="progressbar"
      aria-label="Employee seats used"
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={Math.min(used, limit)}
      aria-valuetext={`${used} of ${limit} seats used`}
    >
      <div className={`h-full rounded-full transition-[width] ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Seat usage, plan status and price — read-only (seats are added by the account manager). */
export function SeatCard({ billing }) {
  const paidCounted = billing.subscription_status === 'active' || billing.subscription_status === 'expiring';
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-ink">Employee seats</h2>
          <p className="mt-1 text-2xl font-bold tabular text-ink">
            {billing.staff_used}{' '}
            <span className="text-base font-semibold text-muted">of {plural(billing.seat_limit, 'employee seat')} used</span>
          </p>
        </div>
        <SubscriptionBadge billing={billing} />
      </div>

      <div className="mt-3">
        <SeatBar used={billing.staff_used} limit={billing.seat_limit} over={billing.over_limit} />
        <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[13px] text-muted">
          <span>
            {plural(billing.seats_free, 'free seat')} · {plural(billing.seats_paid, 'paid seat')}
            {billing.seats_paid > 0 && !paidCounted ? ' (not active)' : ''}
          </span>
          <span className="font-semibold text-ink">{plural(billing.seats_available, 'seat')} available</span>
        </div>
      </div>

      {billing.over_limit && (
        <div className="mt-3 flex gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger-ink">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>You have more active employees than seats. Deactivate someone, or ask your account manager for more seats.</span>
        </div>
      )}

      <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-[13px] sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-ink">Subscription</dt>
          <dd className="mt-0.5 text-muted">{subscriptionText(billing)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">Extra employees</dt>
          <dd className="mt-0.5 text-muted">Each extra employee costs {seatPrice(billing)}.</dd>
        </div>
      </dl>
      <p className="mt-3 text-[13px] font-semibold text-ink">Need more seats? Contact your account manager.</p>
      <p className="mt-1 text-xs text-muted">You (the owner) and deactivated employees do not use a seat.</p>
    </Card>
  );
}
