import { useState } from 'react';
import { ChevronDown, ClipboardList } from 'lucide-react';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { formatDate, formatNumber, formatTime } from '../../lib/format';
import { Avatar, Card, EmptyState, ErrorState, Skeleton } from '../ui';
import EntryList from './EntryList';

const STATS = [
  { key: 'leads', one: 'lead touched', many: 'leads touched', head: 'Leads touched' },
  { key: 'status_changes', one: 'stage change', many: 'stage changes', head: 'Stage changes' },
  { key: 'reassigns', one: 'reassigned', many: 'reassigned', head: 'Reassigned' },
  { key: 'remarks', one: 'note', many: 'notes', head: 'Notes' },
  { key: 'touches', one: 'touch', many: 'touches', head: 'Touches' },
];

const GRID = 'xl:grid xl:grid-cols-[7rem_minmax(8rem,1fr)_repeat(5,minmax(4rem,5.5rem))_5.5rem_1.25rem] xl:items-center xl:gap-3';

function RowSkeleton() {
  return (
    <div className="space-y-2 px-4 py-3.5">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

function DayRow({ row, open, onToggle }) {
  const panelId = `day-${row.date}-${row.user_id}`;
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-subtle ${GRID} ${open ? 'bg-subtle' : ''}`}
      >
        <span className="text-[13px] font-semibold text-ink xl:font-medium">{formatDate(row.date)}</span>
        <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-ink">
          <Avatar name={row.user_name} size={24} />
          <span className="truncate">{row.user_name}</span>
        </span>
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 text-faint transition-transform xl:order-last xl:ml-0 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
        <span className="flex w-full flex-wrap gap-x-3 gap-y-0.5 text-xs xl:contents">
          {STATS.map((s) => {
            const n = Number(row[s.key]) || 0;
            return (
              <span key={s.key} className={`tabular xl:text-right xl:text-[13px] ${n === 0 ? 'hidden xl:inline xl:text-faint' : ''}`}>
                <span className="font-semibold text-ink xl:font-normal xl:[color:inherit]">{formatNumber(n)}</span>
                <span className="text-muted xl:sr-only"> {n === 1 ? s.one : s.many}</span>
              </span>
            );
          })}
          <span className="text-muted xl:text-right xl:text-[13px]">
            <span className="xl:sr-only">Last update </span>
            {formatTime(row.last_update)}
          </span>
        </span>
      </button>
      {open && (
        <div id={panelId} className="border-t border-line bg-canvas/60 px-4 py-1 xl:pl-[8.75rem]">
          <EntryList entries={row.entries} emptyText="No entries for this day." />
        </div>
      )}
    </li>
  );
}

export default function ActivityTab({ range, userId, canTeam }) {
  const { from, to } = range;
  const { data, error, loading, reload } = useAsync(() => api.dailyReport({ from, to, user_id: userId || undefined }), [from, to, userId]);
  const [openRows, setOpenRows] = useState(() => new Set());

  const toggle = (key) =>
    setOpenRows((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (error && !data) return <ErrorState message={error.message} onRetry={() => reload()} />;

  const rows = data || [];
  const touches = rows.reduce((a, r) => a + (Number(r.touches) || 0), 0);

  return (
    <Card padded={false} aria-busy={loading ? 'true' : undefined}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-[15px] font-bold text-ink">Daily activity</h2>
          <p className="mt-0.5 text-[13px] text-muted">One row per person per day, built from what was logged on leads. Select a row to see each entry.</p>
        </div>
        {data && rows.length > 0 && (
          <p className="text-xs text-muted tabular">
            {formatNumber(rows.length)} {rows.length === 1 ? 'day' : 'days'} · {formatNumber(touches)} {touches === 1 ? 'touch' : 'touches'}
          </p>
        )}
      </div>

      {error && (
        <div className="p-4">
          <ErrorState message={error.message} onRetry={() => reload()} />
        </div>
      )}

      {!data ? (
        <div className="divide-y divide-line">
          {[0, 1, 2, 3].map((i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No activity logged in this period"
          message={
            canTeam
              ? 'Activities appear here when your team logs calls, emails or WhatsApp messages on a lead.'
              : 'Activities appear here when you log calls, emails or WhatsApp messages on a lead.'
          }
        />
      ) : (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div
            className={`hidden border-b border-line px-4 py-2 text-xs font-semibold text-muted ${GRID}`}
            aria-hidden
          >
            <span>Date</span>
            <span>Person</span>
            {STATS.map((s) => (
              <span key={s.key} className="text-right">
                {s.head}
              </span>
            ))}
            <span className="text-right">Last update</span>
            <span />
          </div>
          <ul className="divide-y divide-line">
            {rows.map((r) => {
              const key = `${r.date}|${r.user_id}`;
              return <DayRow key={key} row={r} open={openRows.has(key)} onToggle={() => toggle(key)} />;
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
