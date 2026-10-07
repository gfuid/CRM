/** Small presentational pieces shared across the leads module. */
import { useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { addDays, formatDate, localToday, relativeDay } from '../../lib/format';
import { followUpBucket, QUICK_DATES, telLink, waLink, whatsappNumber } from './leadUtils';

/** Native checkbox with support for the "some selected" state. */
export function Checkbox({ checked, indeterminate = false, onChange, label, className = '', ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
      className={`h-4 w-4 shrink-0 cursor-pointer rounded border-line accent-primary ${className}`}
      {...props}
    />
  );
}

const BUCKET_CLASS = {
  overdue: 'text-danger',
  today: 'text-warning-ink',
  upcoming: 'text-ink',
  closed: 'text-muted',
  none: 'text-faint',
};

/** Next follow-up: date plus "In 3 days" / "2 days ago", coloured when overdue or due today. */
export function FollowUpText({ lead, today = localToday(), inline = false }) {
  const date = (lead.follow_up_date || '').slice(0, 10);
  if (!date) return <span className="text-faint">—</span>;
  const bucket = followUpBucket(lead, today);
  const cls = BUCKET_CLASS[bucket];
  const rel = relativeDay(date);
  if (inline) {
    return (
      <span className={`whitespace-nowrap text-xs font-semibold ${cls}`} title={formatDate(date)}>
        {bucket === 'overdue' ? `Overdue · ${formatDate(date, { year: false })}` : `${rel} · ${formatDate(date, { year: false })}`}
      </span>
    );
  }
  return (
    <div className="min-w-0">
      <div className={`whitespace-nowrap text-[13px] font-semibold ${cls}`}>{formatDate(date)}</div>
      <div className={`whitespace-nowrap text-xs ${bucket === 'overdue' ? 'text-danger' : 'text-muted'}`}>
        {bucket === 'overdue' ? `Overdue · ${rel}` : rel}
      </div>
    </div>
  );
}

/** Compact follow-up chip for board cards. */
export function FollowUpChip({ lead, today = localToday() }) {
  const date = (lead.follow_up_date || '').slice(0, 10);
  if (!date) return null;
  const bucket = followUpBucket(lead, today);
  const tone = {
    overdue: 'bg-danger-soft text-danger-ink',
    today: 'bg-warning-soft text-warning-ink',
    upcoming: 'bg-subtle text-muted',
    closed: 'bg-subtle text-faint',
  }[bucket];
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-semibold ${tone}`} title={`Next follow-up: ${formatDate(date)}`}>
      {bucket === 'overdue' ? 'Overdue' : relativeDay(date)}
    </span>
  );
}

/** Tomorrow / In 3 days / Next week (and optionally Clear) for a date field. */
export function QuickDateButtons({ onPick, onClear, value, className = '' }) {
  const today = localToday();
  return (
    <div className={`mt-1.5 flex flex-wrap gap-1.5 ${className}`}>
      {QUICK_DATES.map((q) => {
        const d = addDays(today, q.days);
        const active = value === d;
        return (
          <button
            key={q.label}
            type="button"
            onClick={() => onPick(d)}
            aria-pressed={active}
            className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset transition-colors ${
              active ? 'bg-primary-soft text-primary-ink ring-primary/30' : 'bg-surface text-muted ring-line hover:bg-subtle hover:text-ink'
            }`}
          >
            {q.label}
          </button>
        );
      })}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          disabled={!value}
          className="rounded-md px-2 py-1 text-xs font-semibold text-muted ring-1 ring-inset ring-line transition-colors hover:bg-subtle hover:text-ink disabled:opacity-40"
        >
          Clear
        </button>
      )}
    </div>
  );
}

/** Phone as a tel: link plus a WhatsApp icon link. Clicks don't bubble to the row. */
export function PhoneLinks({ lead }) {
  const tel = telLink(lead.phone);
  const wa = waLink(whatsappNumber(lead));
  if (!tel && !wa) return <span className="text-faint">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {tel && (
        <a href={tel} onClick={(e) => e.stopPropagation()} className="whitespace-nowrap text-[13px] text-muted hover:text-primary hover:underline">
          {lead.phone}
        </a>
      )}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label={`WhatsApp ${lead.contact_person || lead.name}`}
          title="Open WhatsApp chat"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary hover:bg-primary-soft"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
        </a>
      )}
    </span>
  );
}
