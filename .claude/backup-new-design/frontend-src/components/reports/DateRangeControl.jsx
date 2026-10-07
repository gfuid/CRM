import { useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { localToday } from '../../lib/format';
import { Field, Input } from '../ui';
import { PRESETS, formatRange } from './range';

const chip = (active) =>
  `inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold ring-1 ring-inset transition-colors ${
    active ? 'bg-primary-soft text-primary-ink ring-primary/30' : 'bg-surface text-muted ring-line hover:bg-subtle hover:text-ink'
  }`;

function CustomDates({ value, onChange }) {
  const [draft, setDraft] = useState({ from: value.from, to: value.to });
  const [synced, setSynced] = useState(value);
  // The URL can change from outside (back button, a preset); follow it
  if (synced.from !== value.from || synced.to !== value.to) {
    setSynced(value);
    setDraft({ from: value.from, to: value.to });
  }
  const today = localToday();
  const invalid = draft.from && draft.to && draft.from > draft.to;

  const update = (key) => (e) => {
    const next = { ...draft, [key]: e.target.value };
    setDraft(next);
    if (next.from && next.to && next.from <= next.to) onChange({ from: next.from, to: next.to, period: 'custom' });
  };

  return (
    <div className="flex flex-wrap items-start gap-3">
      <Field label="From" className="w-[calc(50%-0.375rem)] sm:w-44" error={invalid ? 'Must be on or before the end date' : undefined}>
        <Input type="date" value={draft.from} max={draft.to || today} onChange={update('from')} required />
      </Field>
      <Field label="To" className="w-[calc(50%-0.375rem)] sm:w-44">
        <Input type="date" value={draft.to} min={draft.from || undefined} onChange={update('to')} required />
      </Field>
    </div>
  );
}

/** Preset periods plus a custom from/to. `value` = { from, to, period }. */
export default function DateRangeControl({ value, onChange }) {
  const isCustom = value.period === 'custom';
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Report period">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={value.period === p.key}
            onClick={() => onChange({ ...p.range(localToday()), period: p.key })}
            className={chip(value.period === p.key)}
          >
            {p.label}
          </button>
        ))}
        <button type="button" aria-pressed={isCustom} onClick={() => onChange({ from: value.from, to: value.to, period: 'custom' })} className={chip(isCustom)}>
          <CalendarRange className="h-4 w-4" aria-hidden />
          Custom
        </button>
        {!isCustom && <span className="ml-1 text-xs text-muted">{formatRange(value)}</span>}
      </div>
      {isCustom && <CustomDates value={value} onChange={onChange} />}
    </div>
  );
}
