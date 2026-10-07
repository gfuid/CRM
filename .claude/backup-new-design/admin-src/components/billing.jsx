import { Badge } from './ui';
import { SUBSCRIPTION_STATUS } from '../lib/constants';
import { formatDay, formatMoney, formatNumber } from '../lib/format';

/** Free / Active / Expiring soon / Expired badge from a billing summary. */
export function SubscriptionBadge({ billing }) {
  const s = SUBSCRIPTION_STATUS[billing?.subscription_status] || { label: billing?.subscription_status || 'Unknown', tone: 'slate' };
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

/** "12 days left", "Ended 3 days ago", "No end date". */
export function daysLeftText(billing) {
  if (!billing?.subscription_ends_at) return billing?.seats_paid > 0 ? 'No end date set' : 'No paid plan';
  const n = billing.days_left;
  if (n === null || n === undefined) return '';
  if (n > 1) return `${n} days left`;
  if (n === 1) return 'Ends within a day';
  if (n === 0) return 'Ended today';
  return `Ended ${-n} day${n === -1 ? '' : 's'} ago`;
}

export const paidSeatsActive = (billing) => ['active', 'expiring'].includes(billing?.subscription_status);

/** Seats summary: "2 free + 3 paid = 5". Paid seats only count while the subscription is active. */
export function SeatsSummary({ billing, compact = false }) {
  if (!billing) return null;
  const paused = billing.seats_paid > 0 && !paidSeatsActive(billing);
  return (
    <div className="min-w-0">
      <div className="tabular text-sm text-ink">
        {formatNumber(billing.seats_free)} free + {formatNumber(billing.seats_paid)} paid
        {paused && <span className="text-warning-ink"> (paused)</span>} = <span className="font-semibold">{formatNumber(billing.seat_limit)}</span>
      </div>
      {paused && (
        <div className="text-xs text-warning-ink">{compact ? 'Paid seats count again after renewal' : 'Paid seats are paused until the subscription is renewed'}</div>
      )}
      {billing.over_limit && (
        <Badge tone="amber" className="mt-1">
          Over limit: {formatNumber(billing.staff_used)} in use
        </Badge>
      )}
    </div>
  );
}

/** Status badge with end date and days left underneath. */
export function SubscriptionSummary({ billing }) {
  if (!billing) return null;
  return (
    <div className="min-w-0">
      <SubscriptionBadge billing={billing} />
      {billing.subscription_ends_at && <div className="mt-1 text-xs text-muted">Ends {formatDay(billing.subscription_ends_at)}</div>}
      <div className="text-xs text-faint">{daysLeftText(billing)}</div>
    </div>
  );
}

export const monthlyText = (billing) =>
  billing && billing.monthly_amount > 0 ? `${formatMoney(billing.monthly_amount, billing.currency)} / month` : 'Nothing to pay';
