import { useId, useState } from 'react';
import { Field, Input, Select } from '../ui';
import { ROLE_CHOICES } from './helpers';

/** Sales staff / Manager as two radio cards, each with a one-line explanation. */
export function RoleChoice({ value, onChange, hint }) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-semibold text-ink">Role</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {ROLE_CHOICES.map((o) => {
          const active = value === o.value;
          return (
            <label
              key={o.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg p-3 ring-inset transition-colors ${
                active ? 'bg-primary-soft/60 ring-2 ring-primary' : 'ring-1 ring-line hover:bg-subtle'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={active}
                onChange={() => onChange(o.value)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{o.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{o.text}</span>
              </span>
            </label>
          );
        })}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}

const OTHER = '__other__';

/**
 * Designation: pick one of the company's job titles, or choose "Something else" and type it.
 * Mount it fresh for each form (it remembers whether free text is being typed).
 */
export function DesignationField({ value, onChange, options = [], error }) {
  const [custom, setCustom] = useState(() => Boolean(value) && !options.includes(value));

  const onSelect = (e) => {
    const v = e.target.value;
    if (v === OTHER) {
      setCustom(true);
      onChange(options.includes(value) ? '' : value);
    } else {
      setCustom(false);
      onChange(v);
    }
  };

  return (
    <div className="space-y-3">
      <Field label="Designation" hint={custom ? undefined : 'Job title. You can edit this list in Settings → Lists.'}>
        <Select value={custom ? OTHER : value} onChange={onSelect}>
          <option value="">No designation</option>
          {options.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
          <option value={OTHER}>Something else (type it)</option>
        </Select>
      </Field>
      {custom && (
        <Field label="Type the designation" error={error}>
          <Input value={value} onChange={(e) => onChange(e.target.value)} maxLength={80} placeholder="For example: Export Manager" />
        </Field>
      )}
    </div>
  );
}
