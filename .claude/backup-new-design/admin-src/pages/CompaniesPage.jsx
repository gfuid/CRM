import { useState } from 'react';
import { Building, RefreshCw, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync, useDebounced } from '../lib/hooks';
import { useRouter } from '../lib/router';
import { COMPANY_FILTERS } from '../lib/constants';
import { formatDate, formatDateTime, formatMoney, formatNumber, plural, timeAgo } from '../lib/format';
import { Badge, Button, EmptyState, ErrorState, PageHeader, SearchInput, Skeleton } from '../components/ui';
import { SeatsSummary, SubscriptionSummary } from '../components/billing';
import CompanyDrawer from '../components/companies/CompanyDrawer';

const VALID_STATUS = new Set(COMPANY_FILTERS.map((f) => f.value));

function CompanyName({ c }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="min-w-0 break-words font-semibold text-ink">{c.name}</span>
      {c.is_demo && <Badge tone="violet">Demo</Badge>}
      {c.status === 'suspended' && <Badge tone="red">Suspended</Badge>}
    </span>
  );
}

function Owner({ owner }) {
  if (!owner) return <span className="text-sm text-faint">No owner</span>;
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium text-ink">{owner.name}</div>
      <div className="truncate text-xs text-muted">{owner.email}</div>
      {owner.phone && <div className="truncate text-xs text-muted">{owner.phone}</div>}
    </div>
  );
}

const monthly = (b) => (b.monthly_amount > 0 ? formatMoney(b.monthly_amount, b.currency) : '—');

function CompaniesTable({ rows, onOpen }) {
  return (
    <div className="hidden overflow-x-auto rounded-xl bg-surface shadow-card ring-1 ring-line xl:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line bg-subtle text-xs font-semibold text-muted">
          <tr>
            <th scope="col" className="px-4 py-2.5">Company</th>
            <th scope="col" className="px-3 py-2.5">Owner</th>
            <th scope="col" className="px-3 py-2.5">Employees</th>
            <th scope="col" className="px-3 py-2.5">Seats</th>
            <th scope="col" className="px-3 py-2.5">Subscription</th>
            <th scope="col" className="px-3 py-2.5 text-right">Monthly</th>
            <th scope="col" className="px-3 py-2.5 text-right">Leads</th>
            <th scope="col" className="px-3 py-2.5">Created</th>
            <th scope="col" className="px-4 py-2.5">Last active</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((c) => (
            <tr key={c.id} onClick={() => onOpen(c.id)} className="cursor-pointer align-top transition-colors hover:bg-subtle">
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(c.id);
                  }}
                  className="max-w-[220px] rounded text-left hover:underline"
                  aria-label={`Open ${c.name}`}
                >
                  <CompanyName c={c} />
                </button>
              </td>
              <td className="px-3 py-3">
                <div className="max-w-[220px]">
                  <Owner owner={c.owner} />
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular text-ink">
                {formatNumber(c.employees_active)} <span className="text-muted">/ {formatNumber(c.employees_total)}</span>
                <div className="text-xs text-faint">active / total</div>
              </td>
              <td className="px-3 py-3">
                <SeatsSummary billing={c.billing} compact />
              </td>
              <td className="px-3 py-3">
                <SubscriptionSummary billing={c.billing} />
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-right tabular text-ink">{monthly(c.billing)}</td>
              <td className="px-3 py-3 text-right tabular text-ink">{formatNumber(c.leads)}</td>
              <td className="whitespace-nowrap px-3 py-3 text-muted">{formatDate(c.created_at)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted" title={c.last_active ? formatDateTime(c.last_active) : undefined}>
                {c.last_active ? timeAgo(c.last_active) : 'Never'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompanyCards({ rows, onOpen }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:hidden">
      {rows.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onOpen(c.id)}
            className="flex h-full w-full flex-col gap-3 rounded-xl bg-surface p-4 text-left shadow-card ring-1 ring-line transition hover:ring-primary/40"
          >
            <div className="flex w-full items-start justify-between gap-2">
              <CompanyName c={c} />
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-faint" aria-hidden />
            </div>
            <Owner owner={c.owner} />
            <div className="grid w-full grid-cols-2 gap-3 border-t border-line pt-3">
              <div>
                <div className="text-xs font-medium text-muted">Subscription</div>
                <div className="mt-1">
                  <SubscriptionSummary billing={c.billing} />
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted">Seats</div>
                <div className="mt-1">
                  <SeatsSummary billing={c.billing} compact />
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted">Employees</div>
                <div className="tabular text-sm text-ink">
                  {formatNumber(c.employees_active)} active of {formatNumber(c.employees_total)}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted">Monthly</div>
                <div className="tabular text-sm text-ink">{monthly(c.billing)}</div>
              </div>
            </div>
            <div className="flex w-full flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span>{plural(c.leads, 'lead')}</span>
              <span>Created {formatDate(c.created_at)}</span>
              <span>{c.last_active ? `Active ${timeAgo(c.last_active)}` : 'Never active'}</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function CompaniesPage() {
  const { query, navigate } = useRouter();
  const rawStatus = query.get('status') || '';
  const status = VALID_STATUS.has(rawStatus) ? rawStatus : '';
  const openId = query.get('company');
  // Demo workspaces are hidden unless asked for, so the list matches the Overview counts.
  const showDemo = query.get('demo') === '1';
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search.trim(), 300);

  const { data, error, loading, reload } = useAsync(() => api.companies({ search: debounced, status }), [debounced, status]);
  const all = data || [];
  const demoCount = all.filter((c) => c.is_demo).length;
  const rows = showDemo ? all : all.filter((c) => !c.is_demo);
  const hiddenDemo = showDemo ? 0 : demoCount;

  const setParam = (key, value) => {
    const q = new URLSearchParams(window.location.search);
    if (value) q.set(key, value);
    else q.delete(key);
    const s = q.toString();
    navigate(`/companies${s ? `?${s}` : ''}`, { replace: true, scroll: false });
  };

  const filtered = !!(debounced || status);

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Every customer workspace with its owner, team, seats and subscription."
        actions={
          <Button icon={RefreshCw} onClick={() => reload()} loading={loading && !!data}>
            Refresh
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by company, owner, email or phone" className="w-full lg:max-w-sm" />
        <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0" role="group" aria-label="Filter by subscription">
          <div className="flex w-max gap-1.5">
            {COMPANY_FILTERS.map((f) => {
              const active = f.value === status;
              return (
                <button
                  key={f.value || 'all'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setParam('status', f.value)}
                  className={`h-8 rounded-full px-3 text-[13px] font-semibold ring-1 ring-inset transition-colors ${
                    active ? 'bg-primary text-white ring-primary' : 'bg-surface text-muted ring-line hover:text-ink'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && !data ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-3">
              <ErrorState message={error.message} onRetry={reload} />
            </div>
          )}
          {rows.length === 0 ? (
            <div className="rounded-xl bg-surface shadow-card ring-1 ring-line">
              <EmptyState
                icon={Building}
                title={filtered ? 'No companies match' : 'No customer companies yet'}
                message={
                  hiddenDemo
                    ? `${plural(hiddenDemo, 'demo workspace')} hidden. Demo workspaces are not customer companies, so they are left out unless you show them.`
                    : filtered
                      ? 'Try a different search or filter.'
                      : 'Companies appear here when an owner signs up on the CRM.'
                }
                action={
                  hiddenDemo || filtered ? (
                    <div className="flex flex-wrap justify-center gap-2">
                      {hiddenDemo > 0 && <Button onClick={() => setParam('demo', '1')}>Show demo workspaces</Button>}
                      {filtered && (
                        <Button
                          onClick={() => {
                            setSearch('');
                            setParam('status', '');
                          }}
                        >
                          Clear search and filter
                        </Button>
                      )}
                    </div>
                  ) : null
                }
              />
            </div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
                <p aria-live="polite">
                  {plural(rows.length, 'company', 'companies')}
                  {showDemo && demoCount ? ` (including ${plural(demoCount, 'demo workspace')})` : ''}
                  {loading ? ' · updating…' : ''}
                </p>
                {(hiddenDemo > 0 || (showDemo && demoCount > 0)) && (
                  <button
                    type="button"
                    onClick={() => setParam('demo', showDemo ? '' : '1')}
                    className="rounded font-semibold text-primary hover:underline"
                  >
                    {showDemo ? 'Hide demo workspaces' : `Show ${plural(hiddenDemo, 'hidden demo workspace')}`}
                  </button>
                )}
              </div>
              <CompaniesTable rows={rows} onOpen={(id) => setParam('company', id)} />
              <CompanyCards rows={rows} onOpen={(id) => setParam('company', id)} />
            </>
          )}
        </>
      )}

      <CompanyDrawer companyId={openId} open={!!openId} onClose={() => setParam('company', '')} onChanged={() => reload({ quiet: true })} />
    </div>
  );
}
