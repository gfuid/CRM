import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-strong shadow-sm disabled:hover:bg-primary',
  secondary: 'bg-surface text-ink ring-1 ring-inset ring-line hover:bg-subtle',
  ghost: 'text-muted hover:bg-subtle hover:text-ink',
  danger: 'bg-danger text-white hover:opacity-90 shadow-sm',
  'danger-ghost': 'text-danger hover:bg-danger-soft',
};

const SIZES = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
};

export function Button({ variant = 'secondary', size = 'md', loading = false, icon: Icon, children, className = '', disabled, type = 'button', ...props }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center rounded-lg font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {children}
    </button>
  );
}

/** Square icon-only button; `label` is required for screen readers and the tooltip. */
export function IconButton({ icon: Icon, label, variant = 'ghost', size = 'md', className = '', ...props }) {
  const dims = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${dims} ${className}`}
      {...props}
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden />
    </button>
  );
}
