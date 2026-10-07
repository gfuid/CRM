import { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { Button, Card, CardHeader, Input } from '../ui';
import { plural } from '../team/helpers';

const MAX_ITEMS = 300;
const MAX_LEN = 120;

const LISTS = [
  { key: 'commodities', title: 'Products', description: 'What you trade. People pick from this when they add or edit a lead.', noun: 'product' },
  { key: 'lead_sources', title: 'Lead sources', description: 'Where a lead came from, for example a trade show or a referral.', noun: 'source' },
  { key: 'incoterms', title: 'Incoterms', description: 'Delivery terms used on leads and quotations.', noun: 'incoterm' },
  { key: 'payment_terms', title: 'Payment terms', description: 'How buyers pay, for example LC at sight or TT advance.', noun: 'payment term' },
  { key: 'designations', title: 'Job titles', description: 'Designations you can give employees on the Team page.', noun: 'job title' },
];

const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/** Chip editor for one dropdown list. Changes are kept locally until Save. */
function ListEditor({ list, saved }) {
  const { setCompany } = useAuth();
  const toast = useToast();
  const inputId = useId();
  const errorId = useId();
  // null = no unsaved edits, so the chips follow the latest saved list
  const [draft, setDraft] = useState(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const items = draft ?? saved;
  const dirty = draft !== null && !sameList(draft, saved);
  const savedSet = new Set(saved.map((v) => v.toLowerCase()));

  const add = () => {
    if (saving) return;
    const value = input.trim().replace(/\s+/g, ' ');
    if (!value) return;
    if (value.length > MAX_LEN) return setError(`Keep it under ${MAX_LEN} characters`);
    if (items.some((v) => v.toLowerCase() === value.toLowerCase())) return setError(`"${value}" is already in the list`);
    if (items.length >= MAX_ITEMS) return setError(`A list can have at most ${MAX_ITEMS} items`);
    setDraft([...items, value]);
    setInput('');
    setError('');
  };

  const remove = (value) => {
    if (saving) return;
    setDraft(items.filter((v) => v !== value));
    setError('');
  };

  const save = async () => {
    const sent = items;
    setSaving(true);
    try {
      const res = await api.updateCompany({ settings: { [list.key]: sent } });
      if (res?.company) setCompany(res.company);
      // Keep any edit made while saving instead of silently dropping it
      setDraft((d) => (d && !sameList(d, sent) ? d : null));
      toast.success(`${list.title} saved`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={list.title}
        description={list.description}
        action={<span className="text-xs font-semibold text-muted">{plural(items.length, 'item')}</span>}
      />

      {items.length ? (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label={`${list.title} list`}>
          {items.map((v) => {
            const isNew = !savedSet.has(v.toLowerCase());
            return (
              <li
                key={v}
                className={`inline-flex max-w-full items-center gap-1 rounded-full py-1 pl-3 pr-1 text-[13px] font-medium ring-1 ring-inset ${
                  isNew ? 'bg-primary-soft text-primary-ink ring-primary/30' : 'bg-subtle text-ink ring-line'
                }`}
              >
                <span className="truncate">{v}</span>
                <button
                  type="button"
                  onClick={() => remove(v)}
                  disabled={saving}
                  aria-label={`Remove ${v}`}
                  title={`Remove ${v}`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg bg-subtle px-3 py-3 text-[13px] text-muted">This list is empty. Add the first {list.noun} below.</p>
      )}

      <div className="mt-4">
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-semibold text-ink">
          Add a {list.noun}
        </label>
        <div className="flex gap-2">
          <Input
            id={inputId}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            maxLength={MAX_LEN}
            disabled={saving}
            placeholder="Type and press Enter"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="min-w-0 flex-1"
          />
          <Button icon={Plus} onClick={add} disabled={saving || !input.trim()} className="h-10">
            Add
          </Button>
        </div>
        {error && (
          <p id={errorId} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <p className="text-xs text-muted">
          {dirty ? 'You have unsaved changes.' : 'Removing an item does not change leads that already use it.'}
        </p>
        <div className="flex gap-2">
          {dirty && (
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)} disabled={saving}>
              Undo changes
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={save} loading={saving} disabled={!dirty}>
            Save {list.title.toLowerCase()}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Dropdown lists the whole company picks from. */
export default function ListsTab() {
  const { company } = useAuth();
  const settings = company?.settings || {};
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">
        These lists fill the dropdowns across the CRM. Your team can add products, sources and terms while working on a lead. Only you can remove items.
      </p>
      <div className="grid gap-4 xl:grid-cols-2">
        {LISTS.map((list) => (
          <ListEditor key={list.key} list={list} saved={Array.isArray(settings[list.key]) ? settings[list.key] : []} />
        ))}
      </div>
    </div>
  );
}
