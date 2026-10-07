import { useState } from 'react';
import { Minus, Plus, Receipt, CalendarClock, Ban, ShieldCheck, Send, Mail, Phone, TriangleAlert, Users, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { useToast } from '../../context/ToastContext';
import { ROLE_LABEL, PAYMENT_MONTHS } from '../../lib/constants';
import { formatDate, formatDateTime, formatDay, formatMoney, formatNumber, plural, timeAgo } from '../../lib/format';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  Modal,
  Segmented,
  Skeleton,
  Textarea,
} from '../ui';
import { SubscriptionBadge, daysLeftText, paidSeatsActive } from '../billing';
import NotificationFields, { emptyNotification, validateNotification } from '../NotificationFields';

function Section({ title, description, action, children }) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold text-ink">{title}</h3>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, children }) {
  return (
    <div className="min-w-0 rounded-lg bg-subtle px-3 py-2.5">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-0.5 truncate text-[15px] font-bold tabular text-ink">{children}</div>
    </div>
  );
}

/* ── Seats ─────────────────────────────────────────────────────────────── */

function SeatsCard({ company, onPatch }) {
  const toast = useToast();
  const b = company.billing;
  const [busy, setBusy] = useState(null);
  const [free, setFree] = useState(String(b.seats_free ?? 0));

  const freeNum = Number(free);
  const freeValid = free !== '' && Number.isInteger(freeNum) && freeNum >= 0 && freeNum <= 1000;
  const freeChanged = freeValid && freeNum !== b.seats_free;

  const changePaid = async (delta) => {
    setBusy(delta > 0 ? 'plus' : 'minus');
    try {
      const s = await onPatch({ seats_delta: delta });
      toast.success(`Paid seats set to ${formatNumber(s.billing.seats_paid)}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const saveFree = async (e) => {
    e.preventDefault();
    if (!freeChanged) return;
    setBusy('free');
    try {
      const s = await onPatch({ seats_free: freeNum });
      toast.success(`Free seats set to ${formatNumber(s.billing.seats_free)}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const paused = b.seats_paid > 0 && !paidSeatsActive(b);

  return (
    <Card>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="In use">{formatNumber(b.staff_used)}</Stat>
        <Stat label="Seat limit">{formatNumber(b.seat_limit)}</Stat>
        <Stat label="Available">{formatNumber(b.seats_available)}</Stat>
      </div>
      <p className="mt-2 text-xs text-muted">
        Seats are for employees; the owner does not use one. Free seats always count. Paid seats count only while the subscription is active.
      </p>
      {paused && (
        <p className="mt-2 rounded-lg bg-warning-soft px-3 py-2 text-[13px] text-warning-ink">
          The subscription is not active, so the {plural(b.seats_paid, 'paid seat')} do not count right now. Record a payment to turn them back on.
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">Paid seats</span>
          <div className="flex items-center gap-2">
            <IconButton
              icon={Minus}
              label="Remove one paid seat"
              variant="secondary"
              onClick={() => changePaid(-1)}
              disabled={!!busy || b.seats_paid <= 0}
            />
            <span className="min-w-[3ch] text-center text-xl font-bold tabular text-ink" aria-live="polite">
              {formatNumber(b.seats_paid)}
            </span>
            <IconButton icon={Plus} label="Add one paid seat" variant="secondary" onClick={() => changePaid(1)} disabled={!!busy} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {formatMoney(b.price_per_seat_monthly, b.currency)} per seat per month · {formatMoney(b.monthly_amount, b.currency)} per month in total
          </p>
        </div>
        <form onSubmit={saveFree} noValidate>
          <div className="flex items-end gap-2">
            <Field label="Free seats" className="w-24">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={1000}
                step={1}
                value={free}
                onChange={(e) => setFree(e.target.value)}
                aria-invalid={!freeValid || undefined}
              />
            </Field>
            <Button type="submit" variant="primary" className="h-10" loading={busy === 'free'} disabled={!freeChanged || (!!busy && busy !== 'free')}>
              Save
            </Button>
          </div>
          {freeValid ? (
            <p className="mt-1 text-xs text-muted">Employees this company can add at no cost.</p>
          ) : (
            <p role="alert" className="mt-1 text-xs font-medium text-danger">
              Enter a whole number from 0 to 1000.
            </p>
          )}
        </form>
      </div>
    </Card>
  );
}

/* ── Subscription modals ───────────────────────────────────────────────── */

const addMonthsUtc = (date, months) => {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
};

function PaymentModal({ company, onClose, onSaved }) {
  const toast = useToast();
  const b = company.billing;
  const [months, setMonths] = useState(1);
  const suggested = (m) => (b.seats_paid || 0) * (b.price_per_seat_monthly || 0) * m;
  const [amount, setAmount] = useState(String(suggested(1)));
  const [touched, setTouched] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pickMonths = (m) => {
    setMonths(m);
    if (!touched) setAmount(String(suggested(m)));
  };

  const base = Math.max(Date.now(), b.subscription_ends_at ? Date.parse(b.subscription_ends_at) : 0);
  const newEnd = addMonthsUtc(base, months).toISOString();
  const amountNum = Number(amount);
  const amountValid = amount !== '' && Number.isFinite(amountNum) && amountNum >= 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!amountValid) {
      setError('Enter the amount received (0 or more).');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payment = await api.recordPayment(company.id, { months, amount: amountNum, note: note.trim() });
      toast.success(`Subscription extended to ${formatDay(payment?.period_end || newEnd)}`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      title="Record payment"
      description={company.name}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="payment-form" variant="primary" icon={Receipt} loading={busy}>
            Record payment
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={submit} noValidate className="space-y-4">
        {b.seats_paid <= 0 && (
          <p className="flex gap-2 rounded-lg bg-warning-soft px-3 py-2 text-[13px] text-warning-ink">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            This company has no paid seats. Add paid seats first so the payment gives them more employees.
          </p>
        )}
        <div>
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">How many months</span>
          <Segmented
            value={months}
            onChange={pickMonths}
            label="How many months"
            options={PAYMENT_MONTHS.map((m) => ({ value: m, label: m === 1 ? '1 month' : `${m} months` }))}
          />
        </div>
        <Field
          label={`Amount received (${b.currency})`}
          required
          error={amount !== '' && !amountValid ? 'Enter a number of 0 or more.' : undefined}
          hint={`Suggested: ${formatNumber(b.seats_paid)} paid seats × ${formatMoney(b.price_per_seat_monthly, b.currency)} × ${months} = ${formatMoney(
            suggested(months),
            b.currency
          )}`}
        >
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setTouched(true);
            }}
          />
        </Field>
        <Field label="Note" hint="Optional, for example the bank reference.">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} />
        </Field>
        <div className="rounded-lg bg-primary-soft px-3 py-2.5 text-[13px] text-primary-ink">
          The subscription will run until <span className="font-bold">{formatDay(newEnd)}</span>
          {b.subscription_ends_at && Date.parse(b.subscription_ends_at) > Date.now() ? ' (added to the current end date).' : ' (counted from today).'}
          {' '}The owner gets a “Subscription renewed” notification.
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger-ink">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

function EndDateModal({ company, onClose, onPatch }) {
  const toast = useToast();
  const current = company.billing.subscription_ends_at;
  const [date, setDate] = useState(current ? String(current).slice(0, 10) : '');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const save = async (value) => {
    setBusy(value ? 'save' : 'clear');
    setError('');
    try {
      await onPatch({ subscription_ends_at: value });
      toast.success(value ? `Subscription end date set to ${formatDate(value)}` : 'Subscription end date removed');
      onClose();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Pick a date.');
      return;
    }
    save(date);
  };

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      title="Set subscription end date"
      description={company.name}
      footer={
        <>
          {current && (
            <Button variant="danger-ghost" onClick={() => save(null)} loading={busy === 'clear'} disabled={!!busy} className="mr-auto">
              Remove end date
            </Button>
          )}
          <Button onClick={onClose} disabled={!!busy}>
            Cancel
          </Button>
          <Button type="submit" form="end-date-form" variant="primary" loading={busy === 'save'} disabled={!!busy}>
            Save date
          </Button>
        </>
      }
    >
      <form id="end-date-form" onSubmit={submit} noValidate className="space-y-3">
        <Field label="Paid seats are active until" required hint="Use this to correct a date or give extra time without recording a payment.">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <p className="text-xs text-muted">Without an end date, paid seats do not count and the subscription shows as expired.</p>
        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger-ink">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

function NotifyModal({ company, onClose }) {
  const toast = useToast();
  const [value, setValue] = useState(emptyNotification);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateNotification(value);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api.sendNotification({
        company_id: company.id,
        audience: value.audience,
        type: value.type,
        title: value.title.trim(),
        message: value.message.trim(),
      });
      toast.success(`Notification sent to ${company.name}`);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      title="Send notification"
      description={`To ${company.name}. It appears in the bell menu of their CRM.`}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="notify-form" variant="primary" icon={Send} loading={busy}>
            Send
          </Button>
        </>
      }
    >
      <form id="notify-form" onSubmit={submit} noValidate>
        <NotificationFields value={value} onChange={setValue} errors={errors} />
      </form>
    </Modal>
  );
}

/* ── Lists ─────────────────────────────────────────────────────────────── */

function Members({ members }) {
  if (!members.length) return <EmptyState icon={Users} title="No accounts" message="This company has no users." className="py-6" />;
  const sorted = [...members].sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0));
  return (
    <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
      {sorted.map((m) => (
        <li key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
          <Avatar name={m.name} size={32} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink">
              {m.name}
              {m.designation ? <span className="font-normal text-muted"> · {m.designation}</span> : null}
            </div>
            <div className="truncate text-xs text-muted">{m.email}</div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            <Badge tone={m.role === 'owner' ? 'violet' : m.role === 'manager' ? 'info' : 'slate'}>{ROLE_LABEL[m.role] || m.role}</Badge>
            {m.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Turned off</Badge>}
          </div>
          <div className="w-full text-xs text-faint sm:w-36 sm:text-right" title={m.last_login ? formatDateTime(m.last_login) : undefined}>
            {m.last_login ? `Last sign-in ${timeAgo(m.last_login)}` : 'Never signed in'}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Payments({ payments, currency }) {
  if (!payments.length) {
    return <EmptyState icon={Receipt} title="No payments yet" message="Payments you record appear here." className="py-6" />;
  }
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl ring-1 ring-line sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-subtle text-xs font-semibold text-muted">
            <tr>
              <th scope="col" className="px-3 py-2">Recorded</th>
              <th scope="col" className="px-3 py-2">Months</th>
              <th scope="col" className="px-3 py-2">Seats</th>
              <th scope="col" className="px-3 py-2 text-right">Amount</th>
              <th scope="col" className="px-3 py-2">Paid until</th>
              <th scope="col" className="px-3 py-2">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink">{formatDateTime(p.created_at)}</td>
                <td className="px-3 py-2.5 tabular text-ink">{p.months}</td>
                <td className="px-3 py-2.5 tabular text-ink">{p.seats}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular text-ink">{formatMoney(p.amount, p.currency || currency)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink">{formatDay(p.period_end)}</td>
                <td className="max-w-[200px] px-3 py-2.5 text-muted">{p.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-line rounded-xl ring-1 ring-line sm:hidden">
        {payments.map((p) => (
          <li key={p.id} className="px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold tabular text-ink">{formatMoney(p.amount, p.currency || currency)}</span>
              <span className="text-xs text-muted">{formatDate(p.created_at)}</span>
            </div>
            <div className="mt-0.5 text-xs text-muted">
              {plural(p.months, 'month')} · {plural(p.seats, 'seat')} · paid until {formatDay(p.period_end)}
            </div>
            {p.note && <div className="mt-1 text-xs text-ink">{p.note}</div>}
          </li>
        ))}
      </ul>
    </>
  );
}

/* ── Drawer ────────────────────────────────────────────────────────────── */

export default function CompanyDrawer({ companyId, open, onClose, onChanged }) {
  const toast = useToast();
  const { data: loaded, error, loading, reload, setData } = useAsync(() => (companyId ? api.company(companyId) : Promise.resolve(null)), [companyId]);
  const [modal, setModal] = useState(null);
  // Ignore the previous company's data while the next one loads
  const data = loaded && loaded.id === companyId ? loaded : null;

  const patch = async (body) => {
    const summary = await api.updateCompany(companyId, body);
    // Only merge into the same company: the drawer may have moved on to another one meanwhile.
    setData((d) => (d && summary && d.id === summary.id ? { ...d, ...summary } : d));
    onChanged?.();
    return summary;
  };

  const changeStatus = async () => {
    const next = data.status === 'suspended' ? 'active' : 'suspended';
    try {
      await patch({ status: next });
      toast.success(next === 'suspended' ? `${data.name} is suspended` : `${data.name} is active again`);
    } catch (e) {
      toast.error(e.message);
      throw e;
    }
  };

  const suspended = data?.status === 'suspended';
  const b = data?.billing;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={data?.name || (loading ? 'Loading…' : 'Company')}
      subtitle={
        data
          ? `Joined ${formatDate(data.created_at)} · ${data.last_active ? `Last active ${timeAgo(data.last_active)}` : 'Nobody has signed in yet'}`
          : undefined
      }
      actions={<IconButton icon={RefreshCw} label="Refresh" onClick={() => reload()} disabled={loading} />}
    >
      {error && !data ? (
        <div className="p-5">
          <ErrorState message={error.message} onRetry={reload} />
        </div>
      ) : !data ? (
        <div className="space-y-4 p-5">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-7 px-4 py-5 sm:px-5">
          {error && <ErrorState message={error.message} onRetry={reload} />}
          <div className="flex flex-wrap items-center gap-2">
            <SubscriptionBadge billing={b} />
            {suspended ? <Badge tone="red">Suspended</Badge> : <Badge tone="green">Company active</Badge>}
            {data.is_demo && <Badge tone="violet">Demo</Badge>}
            <Badge tone="slate">{plural(data.leads, 'lead')}</Badge>
          </div>

          {suspended && (
            <p className="flex gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] text-danger-ink">
              <Ban className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              This company is suspended. The owner and every employee are blocked from signing in until you activate it again.
            </p>
          )}
          {b.over_limit && (
            <p className="flex gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-[13px] text-warning-ink">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {plural(b.staff_used, 'active employee')} but only {plural(b.seat_limit, 'seat')}. Add paid seats or ask the owner to turn some employees off.
            </p>
          )}

          <Section title="Owner">
            {data.owner ? (
              <Card className="flex flex-wrap items-center gap-3">
                <Avatar name={data.owner.name} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">{data.owner.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                    {data.owner.email && (
                      <a href={`mailto:${data.owner.email}`} className="inline-flex min-w-0 items-center gap-1.5 text-primary hover:underline">
                        <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{data.owner.email}</span>
                      </a>
                    )}
                    {data.owner.phone && (
                      <a href={`tel:${data.owner.phone}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                        <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {data.owner.phone}
                      </a>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-faint">
                    {data.owner.last_login ? `Last sign-in ${formatDateTime(data.owner.last_login)}` : 'Has not signed in yet'}
                  </div>
                </div>
              </Card>
            ) : (
              <p className="text-sm text-muted">This company has no owner account.</p>
            )}
          </Section>

          <Section title="Seats" description={`${formatNumber(data.employees_active)} of ${formatNumber(data.employees_total)} employees are active.`}>
            <SeatsCard key={`${data.id}-${b.seats_free}`} company={data} onPatch={patch} />
          </Section>

          <Section title="Subscription">
            <Card>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat label="Status">
                  <SubscriptionBadge billing={b} />
                </Stat>
                <Stat label="Paid until">{formatDay(b.subscription_ends_at)}</Stat>
                <Stat label="Monthly amount">{formatMoney(b.monthly_amount, b.currency)}</Stat>
              </div>
              <p className="mt-2 text-xs text-muted">{daysLeftText(b)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="primary" icon={Receipt} onClick={() => setModal('payment')}>
                  Record payment
                </Button>
                <Button icon={CalendarClock} onClick={() => setModal('end')}>
                  Set end date
                </Button>
              </div>
            </Card>
          </Section>

          <Section title="Actions">
            <div className="flex flex-wrap gap-2">
              <Button icon={Send} onClick={() => setModal('notify')}>
                Send notification
              </Button>
              {suspended ? (
                <Button icon={ShieldCheck} onClick={() => setModal('status')}>
                  Activate company
                </Button>
              ) : (
                <Button variant="danger-ghost" icon={Ban} onClick={() => setModal('status')}>
                  Suspend company
                </Button>
              )}
            </div>
          </Section>

          <Section title="People" description="The owner and every employee account.">
            <Members members={data.members || []} />
          </Section>

          <Section title="Payments">
            <Payments payments={data.payments || []} currency={b.currency} />
          </Section>
        </div>
      )}

      {data && modal === 'payment' && (
        <PaymentModal
          company={data}
          onClose={() => setModal(null)}
          onSaved={() => {
            reload({ quiet: true });
            onChanged?.();
          }}
        />
      )}
      {data && modal === 'end' && <EndDateModal company={data} onClose={() => setModal(null)} onPatch={patch} />}
      {data && modal === 'notify' && <NotifyModal company={data} onClose={() => setModal(null)} />}
      {data && (
        <ConfirmDialog
          open={modal === 'status'}
          onClose={() => setModal(null)}
          onConfirm={changeStatus}
          danger={!suspended}
          title={suspended ? `Activate ${data.name}?` : `Suspend ${data.name}?`}
          message={
            suspended
              ? 'The owner and all employees can sign in and use the CRM again.'
              : 'The owner and all employees will be blocked straight away: they cannot sign in or use the CRM until you activate the company again. Their leads and data are kept.'
          }
          confirmLabel={suspended ? 'Activate company' : 'Suspend company'}
        />
      )}
    </Drawer>
  );
}
