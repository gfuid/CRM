import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { Button, Card, CardHeader, Field, Input, Select } from '../ui';

const CURRENCIES = [
  { value: 'INR', label: 'INR · Indian rupee (₹)' },
  { value: 'USD', label: 'USD · US dollar ($)' },
  { value: 'EUR', label: 'EUR · Euro (€)' },
  { value: 'AED', label: 'AED · UAE dirham' },
  { value: 'GBP', label: 'GBP · British pound (£)' },
];

const MAX_TARGET = 1e13;

const sameForm = (a, b) => a.name === b.name && a.currency === b.currency && a.target === b.target;

const fromCompany = (company) => ({
  name: company?.name || '',
  currency: company?.settings?.currency || 'INR',
  target: String(company?.settings?.revenue_target_monthly ?? 0),
});

/** Company name, currency and monthly sales target. */
export default function CompanyTab() {
  const { company, setCompany } = useAuth();
  const toast = useToast();
  // null = no unsaved edits, so the form follows the latest company data
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const saved = fromCompany(company);
  const form = draft ?? saved;
  const dirty = draft !== null && !sameForm(draft, saved);

  const currencies = CURRENCIES.some((c) => c.value === form.currency)
    ? CURRENCIES
    : [...CURRENCIES, { value: form.currency, label: form.currency }];

  const targetNumber = form.target.trim() === '' ? 0 : Number(form.target);

  const set = (key) => (e) => {
    const value = e.target.value;
    setDraft((d) => ({ ...(d ?? saved), [key]: value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Enter your company name';
    if (!Number.isFinite(targetNumber) || targetNumber < 0) errs.target = 'Enter a number of 0 or more';
    else if (targetNumber > MAX_TARGET) errs.target = 'This number is too large';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const sent = form;
    setSaving(true);
    try {
      const res = await api.updateCompany({
        name: form.name.trim(),
        settings: { currency: form.currency, revenue_target_monthly: targetNumber },
      });
      if (res?.company) setCompany(res.company);
      // Keep any edit made while saving instead of silently dropping it
      setDraft((d) => (d && !sameForm(d, sent) ? d : null));
      toast.success('Company details saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Company details" description="Shown to everyone in your company." />
      <form onSubmit={save} className="mt-5 max-w-xl space-y-4" noValidate>
        <Field label="Company name" error={errors.name} required>
          <Input value={form.name} onChange={set('name')} maxLength={120} autoComplete="organization" disabled={saving} />
        </Field>
        <Field label="Currency" hint="Used for deal values and reports. Changing it does not convert amounts already saved.">
          <Select value={form.currency} onChange={set('currency')} options={currencies} disabled={saving} />
        </Field>
        <Field
          label="Monthly sales target"
          error={errors.target}
          hint={
            Number.isFinite(targetNumber) && targetNumber > 0
              ? `${formatMoney(targetNumber, form.currency)} of won deals each month. Shown on reports.`
              : 'Total value of won deals you aim for each month. Use 0 for no target.'
          }
        >
          <Input type="number" inputMode="decimal" min={0} step="any" value={form.target} onChange={set('target')} disabled={saving} />
        </Field>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button variant="primary" type="submit" loading={saving} disabled={!dirty}>
            Save changes
          </Button>
          {dirty && (
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(null);
                setErrors({});
              }}
              disabled={saving}
            >
              Undo changes
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
