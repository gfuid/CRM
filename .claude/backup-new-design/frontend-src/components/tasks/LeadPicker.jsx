import { useEffect, useId, useState } from 'react';
import { Link2, Loader2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useDebounced } from '../../lib/hooks';
import { SearchInput, StagePill } from '../ui';

const MAX_RESULTS = 8;

/**
 * Searchable lead picker. `value` is the linked lead ({ id, name } or null);
 * `onChange` receives the chosen lead or null.
 */
export default function LeadPicker({ value, onChange, label = 'Link to a lead' }) {
  const labelId = useId();
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim(), 250);
  // Results are kept with the search they belong to, so stale or empty searches never show
  const [result, setResult] = useState({ q: '', leads: [], error: null });

  useEffect(() => {
    if (!debounced) return undefined;
    let alive = true;
    api
      .leads({ search: debounced })
      .then((leads) => alive && setResult({ q: debounced, leads: (leads || []).slice(0, MAX_RESULTS), error: null }))
      .catch((error) => alive && setResult({ q: debounced, leads: [], error }));
    return () => {
      alive = false;
    };
  }, [debounced]);

  if (value) {
    return (
      <div>
        <span id={labelId} className="mb-1.5 block text-[13px] font-semibold text-ink">
          {label}
        </span>
        <div className="flex items-center gap-2 rounded-lg bg-subtle py-1.5 pl-3 pr-1.5 ring-1 ring-inset ring-line">
          <Link2 className="h-4 w-4 shrink-0 text-faint" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{value.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`Remove link to ${value.name}`}
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-muted hover:bg-surface hover:text-ink"
          >
            <X className="h-3.5 w-3.5" aria-hidden /> Remove
          </button>
        </div>
      </div>
    );
  }

  const searching = Boolean(query.trim());
  const resultsReady = searching && debounced === query.trim() && result.q === debounced && !result.error;

  const pick = (lead) => {
    onChange({ id: lead.id, name: lead.name });
    setQuery('');
  };

  // This box sits inside the task form: Enter here must not submit the whole form.
  // With exactly one match, Enter links that lead.
  const onSearchKeyDown = (e) => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
    e.preventDefault();
    if (resultsReady && result.leads.length === 1) pick(result.leads[0]);
  };

  return (
    <div>
      <span id={labelId} className="mb-1.5 block text-[13px] font-semibold text-ink">
        {label} <span className="font-normal text-muted">(optional)</span>
      </span>
      <div onKeyDown={onSearchKeyDown}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search leads by name, email or phone" />
      </div>
      {searching && (
        <div className="mt-1.5 rounded-lg ring-1 ring-inset ring-line" aria-live="polite">
          {debounced !== query.trim() || result.q !== debounced ? (
            <p className="flex items-center gap-2 px-3 py-2.5 text-[13px] text-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Searching…
            </p>
          ) : result.error ? (
            <p className="px-3 py-2.5 text-[13px] text-danger">Couldn’t search leads. {result.error.message}</p>
          ) : result.leads.length === 0 ? (
            <p className="px-3 py-2.5 text-[13px] text-muted">No leads match “{query.trim()}”.</p>
          ) : (
            <ul className="max-h-56 overflow-y-auto p-1" aria-labelledby={labelId}>
              {result.leads.map((lead) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => pick(lead)}
                    className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left hover:bg-subtle"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{lead.name}</span>
                      {(lead.contact_person || lead.country) && (
                        <span className="block truncate text-xs text-muted">
                          {[lead.contact_person, lead.country].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                    {lead.stage && <StagePill stage={lead.stage} short />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
