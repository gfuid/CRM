import { useMemo, useState } from 'react';
import { Send, Megaphone, RefreshCw, Eye, Building } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { useToast } from '../context/ToastContext';
import { AUDIENCE_LABEL, NOTIFICATION_TYPE } from '../lib/constants';
import { formatDateTime, formatNumber, plural, timeAgo } from '../lib/format';
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, ErrorState, PageHeader, SearchInput, Segmented, Skeleton } from '../components/ui';
import NotificationFields, { emptyNotification, validateNotification } from '../components/NotificationFields';

function CompanyPicker({ companies, loading, error, onRetry, value, onChange, invalid }) {
  const [search, setSearch] = useState('');
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = companies || [];
    if (!q) return all;
    return all.filter((c) => [c.name, c.owner?.name, c.owner?.email].some((v) => v && String(v).toLowerCase().includes(q)));
  }, [companies, search]);

  if (error) return <ErrorState message={error.message} onRetry={onRetry} />;

  return (
    <fieldset>
      <legend className="mb-1.5 block text-[13px] font-semibold text-ink">
        Company <span className="text-danger">*</span>
      </legend>
      <SearchInput value={search} onChange={setSearch} placeholder="Search companies or owners" />
      <div
        className={`mt-2 max-h-60 overflow-y-auto rounded-lg ring-1 ring-inset ${invalid ? 'ring-danger' : 'ring-line'}`}
        aria-busy={loading || undefined}
      >
        {loading && !companies ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : list.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-muted">{companies?.length ? 'No company matches your search.' : 'There are no companies yet.'}</p>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((c) => (
              <li key={c.id}>
                <label className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-subtle ${value === c.id ? 'bg-primary-soft/60' : ''}`}>
                  <input
                    type="radio"
                    name="notification-company"
                    value={c.id}
                    checked={value === c.id}
                    onChange={() => onChange(c.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="min-w-0 truncate text-sm font-semibold text-ink">{c.name}</span>
                      {c.is_demo && <Badge tone="violet">Demo</Badge>}
                      {c.status === 'suspended' && <Badge tone="red">Suspended</Badge>}
                    </span>
                    <span className="block truncate text-xs text-muted">{c.owner ? `${c.owner.name} · ${c.owner.email}` : 'No owner'}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      {invalid && <p className="mt-1 text-xs font-medium text-danger">Choose a company.</p>}
    </fieldset>
  );
}

function SentList({ state }) {
  const { data, error, loading, reload } = state;
  return (
    <Card padded={false}>
      <div className="p-4 sm:p-5">
        <CardHeader
          title="Sent notifications"
          description="The latest 200 announcements sent from this console, newest first."
          action={
            <Button size="sm" icon={RefreshCw} onClick={() => reload()} loading={loading && !!data}>
              Refresh
            </Button>
          }
        />
      </div>
      {error && !data ? (
        <div className="px-4 pb-5 sm:px-5">
          <ErrorState message={error.message} onRetry={reload} />
        </div>
      ) : !data ? (
        <div className="space-y-3 px-4 pb-5 sm:px-5">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon={Megaphone} title="Nothing sent yet" message="Notifications you send to companies appear here." className="border-t border-line" />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {data.map((n) => {
            const type = NOTIFICATION_TYPE[n.type] || { label: n.type, tone: 'slate' };
            return (
              <li key={n.id} className="px-4 py-3.5 sm:px-5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={type.tone}>{type.label}</Badge>
                  <Badge tone="slate" className="min-w-0 max-w-full">
                    <Building className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate" title={n.company_name}>
                      {n.company_name}
                    </span>
                  </Badge>
                  <Badge tone="slate">{AUDIENCE_LABEL[n.audience] || n.audience}</Badge>
                  <span className="ml-auto text-xs text-faint" title={formatDateTime(n.created_at)}>
                    {timeAgo(n.created_at)}
                  </span>
                </div>
                <div className="mt-1.5 break-words text-sm font-semibold text-ink">{n.title}</div>
                <p className="mt-0.5 whitespace-pre-line break-words text-[13px] text-muted">{n.message}</p>
                <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-faint">
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  Read by {plural(n.read_count || 0, 'person', 'people')}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default function NotificationsPage() {
  const toast = useToast();
  const sent = useAsync(() => api.notifications(), []);
  const companies = useAsync(() => api.companies(), []);

  const [target, setTarget] = useState('all');
  const [companyId, setCompanyId] = useState('');
  const [value, setValue] = useState(emptyNotification);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);

  const chosen = (companies.data || []).find((c) => c.id === companyId);

  /** Sends the draft; throws on failure so callers decide how to report it. */
  const deliver = async () => {
    await api.sendNotification({
      company_id: target === 'one' ? companyId : null,
      audience: value.audience,
      type: value.type,
      title: value.title.trim(),
      message: value.message.trim(),
    });
    toast.success(target === 'one' ? `Notification sent to ${chosen?.name || 'the company'}` : 'Notification sent to all companies');
    setValue((v) => ({ ...v, title: '', message: '' }));
    setErrors({});
    sent.reload({ quiet: true });
  };

  // Used by the "all companies" confirm dialog, which keeps itself open and shows the error.
  const confirmSend = async () => {
    try {
      await deliver();
    } catch (e) {
      toast.error(e.message);
      throw e;
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateNotification(value);
    if (target === 'one' && !companyId) errs.company = true;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (target === 'all') {
      setConfirmAll(true);
      return;
    }
    setBusy(true);
    try {
      await deliver();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Notifications" description="Send announcements that appear in the bell menu of the CRM." />

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-2">
          <Card>
            <CardHeader title="New notification" />
            <form onSubmit={submit} noValidate className="mt-4 space-y-4">
              <div>
                <span className="mb-1.5 block text-[13px] font-semibold text-ink">Send to</span>
                <Segmented
                  value={target}
                  onChange={(t) => {
                    setTarget(t);
                    setErrors((er) => ({ ...er, company: undefined }));
                  }}
                  label="Send to"
                  options={[
                    { value: 'all', label: 'All companies' },
                    { value: 'one', label: 'One company' },
                  ]}
                />
              </div>
              {target === 'one' && (
                <CompanyPicker
                  companies={companies.data}
                  loading={companies.loading}
                  error={companies.error}
                  onRetry={companies.reload}
                  value={companyId}
                  onChange={(id) => {
                    setCompanyId(id);
                    setErrors((er) => ({ ...er, company: undefined }));
                  }}
                  invalid={!!errors.company}
                />
              )}
              <NotificationFields value={value} onChange={setValue} errors={errors} />
              <Button type="submit" variant="primary" icon={Send} loading={busy} className="w-full sm:w-auto">
                {target === 'one' ? 'Send to this company' : 'Send to all companies'}
              </Button>
            </form>
          </Card>
        </div>
        <div className="min-w-0 lg:col-span-3">
          <SentList state={sent} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        onConfirm={confirmSend}
        title="Send to all companies?"
        message={`“${value.title.trim()}” will appear in the CRM of ${
          companies.data ? `every company (${formatNumber(companies.data.length)})` : 'every company'
        } (${value.audience === 'owners' ? 'owners only' : 'owners and employees'}). This cannot be unsent.`}
        confirmLabel="Send to all"
      />
    </div>
  );
}
