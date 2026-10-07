import { useState } from 'react';
import { Save, Info } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { useToast } from '../context/ToastContext';
import { formatMoney, plural } from '../lib/format';
import { Button, Card, CardHeader, ErrorState, Field, Input, PageHeader, Skeleton } from '../components/ui';

const toForm = (s) => ({
  price_per_seat_monthly: String(s.price_per_seat_monthly ?? ''),
  free_seats: String(s.free_seats ?? ''),
  currency: String(s.currency ?? ''),
  reminder_days_before_expiry: String(s.reminder_days_before_expiry ?? ''),
});

function validate(f) {
  const errors = {};
  const price = Number(f.price_per_seat_monthly);
  if (f.price_per_seat_monthly === '' || !Number.isFinite(price) || price < 0) errors.price_per_seat_monthly = 'Enter a price of 0 or more.';
  const free = Number(f.free_seats);
  if (f.free_seats === '' || !Number.isInteger(free) || free < 0 || free > 1000) errors.free_seats = 'Enter a whole number from 0 to 1000.';
  const cur = f.currency.trim();
  if (!cur) errors.currency = 'Enter a currency code, for example INR.';
  else if (cur.length > 10) errors.currency = 'Use at most 10 characters.';
  const days = Number(f.reminder_days_before_expiry);
  if (f.reminder_days_before_expiry === '' || !Number.isInteger(days) || days < 1 || days > 60) {
    errors.reminder_days_before_expiry = 'Enter a whole number from 1 to 60.';
  }
  return errors;
}

function SettingsForm({ settings, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => toForm(settings));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const initial = toForm(settings);
  const dirty = Object.keys(initial).some((k) => initial[k] !== form[k]);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const preview = validate(form);
  const price = preview.price_per_seat_monthly ? settings.price_per_seat_monthly : Number(form.price_per_seat_monthly);
  const free = preview.free_seats ? settings.free_seats : Number(form.free_seats);
  const currency = preview.currency ? settings.currency : form.currency.trim().toUpperCase();
  const days = preview.reminder_days_before_expiry ? settings.reminder_days_before_expiry : Number(form.reminder_days_before_expiry);

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const saved = await api.updateSettings({
        price_per_seat_monthly: Number(form.price_per_seat_monthly),
        free_seats: Number(form.free_seats),
        currency: form.currency.trim().toUpperCase(),
        reminder_days_before_expiry: Number(form.reminder_days_before_expiry),
      });
      toast.success('Settings saved');
      onSaved(saved);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader title="Pricing and reminders" description="The price and reminder days apply to every company straight away. Free employees apply to companies that sign up from now on." />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Free employees per company" required error={errors.free_seats} hint="New companies start with this many free employees.">
            <Input type="number" inputMode="numeric" min={0} max={1000} step={1} value={form.free_seats} onChange={set('free_seats')} />
          </Field>
          <Field label="Price per extra employee, per month" required error={errors.price_per_seat_monthly} hint={`In ${currency || 'the currency below'}.`}>
            <Input type="number" inputMode="decimal" min={0} step="any" value={form.price_per_seat_monthly} onChange={set('price_per_seat_monthly')} />
          </Field>
          <Field label="Currency" required error={errors.currency} hint="Three-letter code, for example INR or USD.">
            <Input value={form.currency} onChange={set('currency')} maxLength={10} autoCapitalize="characters" spellCheck={false} />
          </Field>
          <Field label="Reminder days before expiry" required error={errors.reminder_days_before_expiry} hint="Owners are warned this many days before paid seats end.">
            <Input type="number" inputMode="numeric" min={1} max={60} step={1} value={form.reminder_days_before_expiry} onChange={set('reminder_days_before_expiry')} />
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Button type="submit" variant="primary" icon={Save} loading={busy} disabled={!dirty}>
            Save settings
          </Button>
          <Button
            onClick={() => {
              setForm(initial);
              setErrors({});
            }}
            disabled={!dirty || busy}
          >
            Undo changes
          </Button>
          {dirty && <span className="text-xs text-muted">You have unsaved changes.</span>}
        </div>
      </Card>

      <Card className="h-max">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info-ink">
            <Info className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 space-y-2 text-sm text-muted">
            <p className="font-semibold text-ink">How billing works</p>
            <p>
              Every company gets <span className="font-semibold text-ink">{plural(free, 'employee')}</span> free; each extra employee costs{' '}
              <span className="font-semibold text-ink">{formatMoney(price, currency)}</span> per month.
            </p>
            <p>The owner never uses a seat. Paid seats count only while the subscription is active.</p>
            <p>
              Owners see a renewal reminder <span className="font-semibold text-ink">{plural(days, 'day')}</span> before their subscription ends.
            </p>
            <p className="text-xs">
              Existing companies keep the free seats they already have; change those on the company’s page under Companies. Changing the price does not change
              payments you have already recorded.
            </p>
          </div>
        </div>
      </Card>
    </form>
  );
}

export default function SettingsPage() {
  const { data, error, loading, reload, setData } = useAsync(() => api.settings(), []);

  return (
    <div>
      <PageHeader title="Settings" description="Pricing for every company on the platform." />
      {error && !data ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading && !data ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : data ? (
        <SettingsForm key={JSON.stringify(data)} settings={data} onSaved={setData} />
      ) : null}
    </div>
  );
}
