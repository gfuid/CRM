import { useMemo, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { formatDateTime, timeAgo } from '../../lib/format';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Field, Select, Skeleton } from '../ui';
import { plural } from '../team/helpers';

/** Clearer wording for a few actions; everything else is turned from LEAD_REASSIGNED into "Lead reassigned". */
const ACTION_LABEL = {
  STAFF_CREATED: 'Employee added',
  STAFF_UPDATED: 'Employee updated',
  STAFF_DEACTIVATED: 'Employee deactivated',
  STAFF_ACTIVATED: 'Employee reactivated',
  STAFF_PASSWORD_RESET: 'Employee password reset',
  SETTINGS_UPDATED: 'Settings changed',
  LEAD_DELETED: 'Lead moved to trash',
  LEAD_PURGED: 'Lead deleted forever',
  LEAD_RESTORED: 'Lead restored',
  LEADS_EXPORTED: 'Leads downloaded',
  LEADS_IMPORTED: 'Leads imported',
};

const humanize = (action) => {
  if (!action) return 'Unknown action';
  if (ACTION_LABEL[action]) return ACTION_LABEL[action];
  const words = String(action).toLowerCase().replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const actionTone = (action = '') => {
  if (/PURGED|DELETED|DEACTIVATED/.test(action)) return 'red';
  if (/EXPORTED|PASSWORD/.test(action)) return 'amber';
  if (/CREATED|RESTORED|ACTIVATED|IMPORTED/.test(action)) return 'green';
  if (/REASSIGNED|STAGE|VALUE/.test(action)) return 'info';
  return 'slate';
};

const ActionBadge = ({ action }) => <Badge tone={actionTone(action)}>{humanize(action)}</Badge>;

/** Owner-only record of important changes, newest first. */
export default function ActivityTab() {
  const { data, error, loading, reload } = useAsync(() => api.auditLog(), []);
  const [action, setAction] = useState('');
  const rows = useMemo(() => data || [], [data]);

  const actions = useMemo(() => {
    const counts = new Map();
    for (const r of rows) counts.set(r.action, (counts.get(r.action) || 0) + 1);
    return [...counts.entries()]
      .map(([value, count]) => ({ value, label: `${humanize(value)} (${count})` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const shown = action ? rows.filter((r) => r.action === action) : rows;

  if (loading && !data) {
    return (
      <Card className="space-y-3" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </Card>
    );
  }
  if (error && !data) return <ErrorState message={error.message} onRetry={() => reload()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-muted">
            Important changes in your company: employees, settings, deleted leads, reassignments and downloads.
          </p>
          {rows.length >= 200 && <p className="mt-0.5 text-xs text-muted">Showing the latest {rows.length} entries.</p>}
        </div>
        <div className="flex w-full items-end gap-2 sm:w-auto">
          <Field label="Filter by action" className="min-w-0 flex-1 sm:w-64 sm:flex-none">
            <Select value={action} onChange={(e) => setAction(e.target.value)} disabled={!rows.length}>
              <option value="">{`All actions (${rows.length})`}</option>
              {actions.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
          <Button icon={RotateCcw} onClick={() => reload()} loading={loading} className="h-10">
            Refresh
          </Button>
        </div>
      </div>

      {error && <ErrorState message={error.message} onRetry={() => reload()} />}

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={History}
            title="Nothing recorded yet"
            message="When you add employees, change settings, or someone deletes or reassigns a lead, it is recorded here."
          />
        </Card>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={History}
            title="Nothing matches this filter"
            action={
              <Button size="sm" onClick={() => setAction('')}>
                Show all actions
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <p className="sr-only" aria-live="polite">
            {plural(shown.length, 'entry', 'entries')} shown
          </p>
          <Card padded={false} className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Activity log</caption>
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th scope="col" className="w-40 px-4 py-3 font-semibold">
                    When
                  </th>
                  <th scope="col" className="w-44 px-3 py-3 font-semibold">
                    Who
                  </th>
                  <th scope="col" className="w-52 px-3 py-3 font-semibold">
                    Action
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3 text-[13px] text-muted">
                      <div className="text-ink">{timeAgo(r.timestamp)}</div>
                      <div className="text-xs">{formatDateTime(r.timestamp)}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar name={r.actor_name || '?'} size={24} />
                        <span className="truncate text-[13px] font-semibold text-ink">{r.actor_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <ActionBadge action={r.action} />
                    </td>
                    <td className="break-words px-4 py-3 text-[13px] text-ink">{r.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <ul className="space-y-2 md:hidden" aria-label="Activity log">
            {shown.map((r) => (
              <li key={r.id}>
                <Card className="!p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ActionBadge action={r.action} />
                    <span className="text-xs text-muted" title={formatDateTime(r.timestamp)}>
                      {formatDateTime(r.timestamp)}
                    </span>
                  </div>
                  {r.details && <p className="mt-2 break-words text-[13px] text-ink">{r.details}</p>}
                  <p className="mt-1.5 text-xs text-muted">By {r.actor_name || 'Unknown'}</p>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
