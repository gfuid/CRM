import { useId, useState, cloneElement, isValidElement } from 'react';
import { Eye, EyeOff, Search, X } from 'lucide-react';

const control =
  'block w-full rounded-lg bg-surface text-ink ring-1 ring-inset ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/60 disabled:bg-subtle disabled:text-muted transition-shadow';

/** Label + control + hint/error, with the label linked to the control. */
export function Field({ label, hint, error, required, children, className = '' }) {
  const id = useId();
  const child = isValidElement(children)
    ? cloneElement(children, { id: children.props.id || id, 'aria-invalid': error ? true : undefined })
    : children;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={children?.props?.id || id} className="mb-1.5 block text-[13px] font-semibold text-ink">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      {child}
      {error ? (
        <p className="mt-1 text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = ({ className = '', ...props }) => <input className={`${control} h-10 px-3 ${className}`} {...props} />;

export const Textarea = ({ className = '', rows = 3, ...props }) => (
  <textarea rows={rows} className={`${control} px-3 py-2 ${className}`} {...props} />
);

export function Select({ className = '', options, placeholder, children, ...props }) {
  return (
    <select className={`${control} h-10 pl-3 pr-8 ${className}`} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options
        ? options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            );
          })
        : children}
    </select>
  );
}

export function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} className="pr-10" {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-faint hover:text-ink"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${control} h-10 pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-faint hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** Accessible on/off switch. */
export function Switch({ checked, onChange, label, description, disabled }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-line'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

/** Segmented control for 2–5 mutually exclusive options. */
export function Segmented({ value, onChange, options, size = 'md', className = '' }) {
  return (
    <div role="radiogroup" className={`inline-flex rounded-lg bg-subtle p-0.5 ring-1 ring-inset ring-line ${className}`}>
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-md font-semibold transition-colors ${size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]'} ${
              active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {opt.icon && <opt.icon className="h-3.5 w-3.5" aria-hidden />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
