import { TONE_CLASSES } from '../../lib/constants';
import { initials } from '../../lib/format';

export function Badge({ tone = 'slate', children, className = '', dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONE_CLASSES[tone] || TONE_CLASSES.slate} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const AVATAR_COLORS = ['bg-emerald-600', 'bg-sky-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600', 'bg-teal-600', 'bg-indigo-600', 'bg-orange-600'];

export function Avatar({ name = '', size = 32, className = '' }) {
  const safe = String(name || '');
  const color = AVATAR_COLORS[[...safe].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${color} ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.38) }}
      aria-hidden
    >
      {initials(safe)}
    </span>
  );
}

export function Card({ children, className = '', padded = true, ...props }) {
  return (
    <div className={`rounded-xl bg-surface shadow-card ring-1 ring-line ${padded ? 'p-4 sm:p-5' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className = '' }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'primary', onClick }) {
  const tones = {
    primary: 'bg-primary-soft text-primary-ink',
    danger: 'bg-danger-soft text-danger-ink',
    warning: 'bg-warning-soft text-warning-ink',
    info: 'bg-info-soft text-info-ink',
  };
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex w-full items-start justify-between gap-3 rounded-xl bg-surface p-4 text-left shadow-card ring-1 ring-line ${onClick ? 'transition hover:ring-primary/40' : ''}`}
    >
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-muted">{label}</div>
        <div className="mt-1 truncate text-2xl font-bold tabular text-ink">{value}</div>
        {hint && <div className="mt-0.5 truncate text-xs text-muted">{hint}</div>}
      </div>
      {Icon && (
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
      )}
    </Tag>
  );
}

export function EmptyState({ icon: Icon, title, message, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      {Icon && (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-subtle text-faint">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      )}
      <h3 className="text-[15px] font-bold text-ink">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-[13px] text-muted">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const Skeleton = ({ className = '' }) => <div className={`animate-pulse rounded-md bg-subtle ${className}`} aria-hidden />;

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-muted sm:text-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger-ink ring-1 ring-inset ring-danger/20">
      <span className="font-semibold">Couldn’t load this.</span> {message}{' '}
      {onRetry && (
        <button type="button" onClick={() => onRetry()} className="font-semibold underline underline-offset-2">
          Try again
        </button>
      )}
    </div>
  );
}
