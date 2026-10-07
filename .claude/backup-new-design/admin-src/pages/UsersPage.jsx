import { useId, useMemo, useState } from 'react';
import { Users, RefreshCw, ArrowRight, TriangleAlert } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync, useDebounced } from '../lib/hooks';
import { useToast } from '../context/ToastContext';
import { ROLE_LABEL } from '../lib/constants';
import { formatDateTime, plural, timeAgo } from '../lib/format';
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, ErrorState, PageHeader, SearchInput, Segmented, Select, Skeleton } from '../components/ui';

const roleTone = (role) => (role === 'owner' ? 'violet' : role === 'manager' ? 'info' : 'slate');

const freeSeats = (company) => Math.max(0, Number(company?.billing?.seats_available) || 0);

function targetLabel(t) {
  const who = t.owner ? `${t.name} (${t.owner.name})` : t.name;
  const suspended = t.status === 'suspended' ? ' · suspended' : '';
  return `${who} · ${plural(freeSeats(t), 'seat')} free${suspended}`;
}

function MoveControl({ user, targets, onMoved }) {
  const toast = useToast();
  const [companyId, setCompanyId] = useState('');
  const [activate, setActivate] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // The control renders in both the table and the card list, so ids must be unique per instance.
  const uid = useId();
  const selectId = `move-${uid}`;
  const checkId = `activate-${uid}`;

  const target = targets.find((t) => t.id === companyId) || null;
  const noSeat = !!target && freeSeats(target) === 0;
  const willActivate = activate && !noSeat;

  const pick = (id) => {
    setCompanyId(id);
    const next = targets.find((t) => t.id === id);
    if (next && freeSeats(next) === 0) setActivate(false);
  };

  // Called from the confirm dialog: it stays open and shows the error if this throws.
  const move = async () => {
    try {
      await api.updateUser(user.id, willActivate ? { company_id: target.id, is_active: true } : { company_id: target.id });
      toast.success(`${user.name} moved to ${target.name}${willActivate ? ' and turned on' : ''}`);
      onMoved();
    } catch (e) {
      toast.error(e.message);
      throw e;
    }
  };

  if (!targets.length) return <p className="text-xs text-muted">No customer company to move to yet.</p>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={selectId} className="sr-only">
          Move {user.name} to company
        </label>
        <Select
          id={selectId}
          value={companyId}
          onChange={(e) => pick(e.target.value)}
          placeholder="Move to company…"
          className="h-9 min-w-0 flex-1 sm:w-56 sm:flex-none"
          disabled={confirming}
          options={targets.map((t) => ({ value: t.id, label: targetLabel(t) }))}
        />
        <Button variant="primary" size="sm" icon={ArrowRight} onClick={() => setConfirming(true)} disabled={!target}>
          Move
        </Button>
      </div>
      <label
        htmlFor={checkId}
        className={`inline-flex items-center gap-2 text-xs ${noSeat ? 'cursor-not-allowed text-faint' : 'cursor-pointer text-muted'}`}
      >
        <input
          id={checkId}
          type="checkbox"
          checked={willActivate}
          onChange={(e) => setActivate(e.target.checked)}
          disabled={noSeat || confirming}
          aria-describedby={noSeat ? `${checkId}-msg` : undefined}
          className="h-4 w-4 accent-primary"
        />
        Also turn the account on (uses one employee seat)
      </label>
      {noSeat && (
        <p id={`${checkId}-msg`} className="text-xs text-warning-ink">
          {target.name} has no free seats, so the account can only be moved turned off. Add a seat on the Companies page to turn it on.
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={move}
        title={`Move ${user.name} to ${target?.name || 'this company'}?`}
        confirmLabel={willActivate ? 'Move and turn on' : 'Move'}
      >
        {target && (
          <div className="space-y-2 text-sm text-muted">
            <p>
              <span className="font-semibold text-ink">{user.name}</span> ({user.email}) will join{' '}
              <span className="font-semibold text-ink">{target.name}</span>
              {target.owner ? `, owned by ${target.owner.name}` : ''}.
            </p>
            {willActivate ? (
              <p>
                The account will be turned on, so they can sign in straight away and see this company’s leads. It uses 1 of the{' '}
                {plural(freeSeats(target), 'free seat')}.
              </p>
            ) : (
              <p>The account stays turned off, so they cannot sign in until it is turned on.</p>
            )}
            <p className="font-medium text-warning-ink">Check the company carefully. This page cannot move them back.</p>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

function StatusBadges({ user, old }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {user.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Turned off</Badge>}
      {old && <Badge tone="amber">Old account</Badge>}
    </span>
  );
}

function lastLogin(u) {
  return u.last_login ? timeAgo(u.last_login) : 'Never';
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState('all');
  const debounced = useDebounced(search.trim(), 300);
  const users = useAsync(() => api.users({ search: debounced }), [debounced]);
  const companies = useAsync(() => api.companies(), []);

  const demoIds = useMemo(() => new Set((companies.data || []).filter((c) => c.is_demo).map((c) => c.id)), [companies.data]);
  const targets = useMemo(() => (companies.data || []).filter((c) => !c.is_demo).sort((a, b) => a.name.localeCompare(b.name)), [companies.data]);
  const isOld = (u) => demoIds.has(u.company_id) && !u.is_active && u.role !== 'owner';

  const all = users.data || [];
  // Old accounts are only known once the company list (which marks the demo company) has loaded.
  const companiesKnown = !!companies.data;
  const oldCount = all.filter(isOld).length;
  const rows = view === 'old' ? all.filter(isOld) : all;
  const showMove = rows.some(isOld);
  const refresh = () => {
    users.reload();
    companies.reload();
  };

  const onMoved = () => {
    users.reload({ quiet: true });
    companies.reload({ quiet: true });
  };
  const moveCell = (u) => <MoveControl user={u} targets={targets} onMoved={onMoved} />;

  return (
    <div>
      <PageHeader
        title="Users"
        description="Every account across all companies. Customer leads are never shown here."
        actions={
          <Button icon={RefreshCw} onClick={refresh} loading={(users.loading && !!users.data) || (companies.loading && !!companies.data)}>
            Refresh
          </Button>
        }
      />

      {companies.error && (
        <div className="mb-4">
          <ErrorState
            message={`${companies.error.message} ${
              companiesKnown ? 'Company names, seats and old accounts may be out of date.' : 'Without the company list, old accounts cannot be found or moved.'
            }`}
            onRetry={companies.reload}
          />
        </div>
      )}

      {oldCount > 0 && (
        <div className="mb-4 flex gap-2 rounded-xl bg-warning-soft px-4 py-3 text-[13px] text-warning-ink ring-1 ring-inset ring-warning/20">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            <span className="font-semibold">{plural(oldCount, 'old account')} from before the upgrade.</span> They are parked in the demo company and turned off.
            Move each one to the company they work for.
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email or company" className="w-full sm:max-w-sm" />
        <Segmented
          value={view}
          onChange={setView}
          label="Which users to show"
          options={[
            { value: 'all', label: 'All users' },
            { value: 'old', label: companiesKnown ? `Old accounts (${oldCount})` : 'Old accounts' },
          ]}
        />
      </div>

      {users.error && !users.data ? (
        <ErrorState message={users.error.message} onRetry={users.reload} />
      ) : !users.data ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl bg-surface shadow-card ring-1 ring-line">
          <EmptyState
            icon={Users}
            title={
              view === 'old'
                ? companiesKnown
                  ? debounced
                    ? 'No old accounts match'
                    : 'No old accounts left'
                  : 'Old accounts are not known yet'
                : debounced
                  ? 'No users match'
                  : 'No users yet'
            }
            message={
              view === 'old'
                ? companiesKnown
                  ? debounced
                    ? 'No old account matches your search.'
                    : 'Every account from before the upgrade has been placed in a company.'
                  : companies.error
                    ? 'The company list did not load. Use “Try again” above.'
                    : 'Loading the company list…'
                : debounced
                  ? 'Try a different name, email or company.'
                  : 'Accounts appear here when owners sign up and add employees.'
            }
          />
        </div>
      ) : (
        <>
          {users.error && (
            <div className="mb-3">
              <ErrorState message={users.error.message} onRetry={users.reload} />
            </div>
          )}
          <p className="mb-2 text-[13px] text-muted" aria-live="polite">
            {plural(rows.length, 'user')}
            {users.loading ? ' · updating…' : ''}
          </p>

          <div className="hidden overflow-x-auto rounded-xl bg-surface shadow-card ring-1 ring-line xl:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-subtle text-xs font-semibold text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5">Name</th>
                  <th scope="col" className="px-3 py-2.5">Email</th>
                  <th scope="col" className="px-3 py-2.5">Company</th>
                  <th scope="col" className="px-3 py-2.5">Role</th>
                  <th scope="col" className="px-3 py-2.5">Status</th>
                  <th scope="col" className="px-3 py-2.5">Last sign-in</th>
                  {showMove && <th scope="col" className="px-4 py-2.5">Move</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((u) => {
                  const old = isOld(u);
                  return (
                    <tr key={u.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.name} size={28} />
                          <div className="min-w-0">
                            <div className="max-w-[200px] truncate font-semibold text-ink" title={u.name}>
                              {u.name}
                            </div>
                            {u.phone && <div className="truncate text-xs text-muted">{u.phone}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted">
                        <div className="max-w-[220px] truncate" title={u.email}>
                          {u.email}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-ink">
                        <div className="max-w-[200px] break-words">
                          {u.company_name}
                          {demoIds.has(u.company_id) && <Badge tone="violet" className="ml-1.5">Demo</Badge>}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={roleTone(u.role)}>{ROLE_LABEL[u.role] || u.role}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadges user={u} old={old} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-muted" title={u.last_login ? formatDateTime(u.last_login) : undefined}>
                        {lastLogin(u)}
                      </td>
                      {showMove && <td className="px-4 py-3">{old ? moveCell(u) : null}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="grid gap-3 md:grid-cols-2 xl:hidden">
            {rows.map((u) => {
              const old = isOld(u);
              return (
                <li key={u.id} className="rounded-xl bg-surface p-4 shadow-card ring-1 ring-line">
                  <div className="flex items-start gap-3">
                    <Avatar name={u.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-ink">{u.name}</div>
                      <div className="truncate text-[13px] text-muted">{u.email}</div>
                      {u.phone && <div className="truncate text-xs text-muted">{u.phone}</div>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge tone={roleTone(u.role)}>{ROLE_LABEL[u.role] || u.role}</Badge>
                    <StatusBadges user={u} old={old} />
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    {u.company_name}
                    {demoIds.has(u.company_id) ? ' (demo)' : ''} · {u.last_login ? `Last sign-in ${timeAgo(u.last_login)}` : 'Never signed in'}
                  </div>
                  {old && <div className="mt-3 border-t border-line pt-3">{moveCell(u)}</div>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
