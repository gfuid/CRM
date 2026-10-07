import { Fragment, useState } from 'react';
import { MessagesSquare } from 'lucide-react';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { formatDate, formatNumber } from '../../lib/format';
import { Card, EmptyState, ErrorState, Skeleton } from '../ui';
import EntryList from './EntryList';
import useElementWidth from './useElementWidth';

const ALL = '__all__';
const STICKY = 'sticky left-0 z-10';
const ZERO_CELL = 'border-b border-line px-1 py-2 text-right text-[13px] tabular text-faint';
const BUTTON_CELL = 'border-b border-line p-1 text-right text-[13px] tabular';

/** A non-zero count that expands the row's matching entries. */
function CountButton({ count, label, active, onClick, strong = false }) {
  return (
    <button
      type="button"
      aria-expanded={active}
      aria-label={`${count} ${label}. ${active ? 'Hide' : 'Show'} entries`}
      onClick={onClick}
      className={`inline-flex h-8 min-w-[2.25rem] items-center justify-end rounded-md px-2 transition-colors ${strong ? 'font-bold' : 'font-semibold'} ${
        active ? 'bg-primary-soft text-primary-ink ring-1 ring-inset ring-primary/40' : 'text-ink hover:bg-primary-soft hover:text-primary-ink'
      }`}
    >
      {formatNumber(count)}
    </button>
  );
}

function CountCell({ count, label, active, onClick, strong, className = '' }) {
  if (!count) {
    return (
      <td className={`${ZERO_CELL} ${className}`}>
        <span className="inline-block px-2">0</span>
      </td>
    );
  }
  return (
    <td className={`${BUTTON_CELL} ${className}`}>
      <CountButton count={count} label={label} active={active} onClick={onClick} strong={strong} />
    </td>
  );
}

function Matrix({ data }) {
  const [scrollRef, width] = useElementWidth();
  const [open, setOpen] = useState({}); // rowKey -> type key (or ALL)
  const types = data.types || [];
  const totals = data.totals || {};
  const labels = Object.fromEntries(types.map((t) => [t.key, t.label]));
  const grand = types.reduce((a, t) => a + (Number(totals[t.key]) || 0), 0);
  const colCount = types.length + 2;

  const toggle = (rowKey, type) => setOpen((o) => ({ ...o, [rowKey]: o[rowKey] === type ? undefined : type }));

  return (
    <div ref={scrollRef} className="overflow-x-auto">
      <table className="w-full min-w-max border-separate border-spacing-0">
        <caption className="sr-only">Customer touches per person per day, by type</caption>
        <thead>
          <tr>
            <th scope="col" className={`${STICKY} min-w-[9.5rem] bg-surface border-b border-line px-4 py-2.5 text-left align-bottom text-xs font-semibold text-muted sm:px-5`}>
              Date and person
            </th>
            {types.map((t) => (
              <th key={t.key} scope="col" className="w-[5rem] min-w-[4.75rem] border-b border-line px-3 py-2.5 text-right align-bottom text-xs font-semibold leading-tight text-muted">
                {t.label}
              </th>
            ))}
            <th scope="col" className="min-w-[4.5rem] border-b border-line py-2.5 pl-3 pr-4 text-right align-bottom text-xs font-bold text-ink sm:pr-5">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => {
            const rowKey = `${r.date}|${r.user_id}`;
            const openType = open[rowKey];
            const who = `${r.user_name} on ${formatDate(r.date)}`;
            const entries = openType && openType !== ALL ? r.entries.filter((e) => e.type === openType) : r.entries;
            return (
              <Fragment key={rowKey}>
                <tr className={openType ? 'bg-subtle/60' : ''}>
                  <th scope="row" className={`${STICKY} border-b border-line px-4 py-2 text-left font-normal sm:px-5 ${openType ? 'bg-subtle' : 'bg-surface'}`}>
                    <span className="block text-[13px] font-semibold text-ink">{formatDate(r.date)}</span>
                    <span className="block max-w-[11rem] truncate text-xs text-muted">{r.user_name}</span>
                  </th>
                  {types.map((t) => (
                    <CountCell
                      key={t.key}
                      count={Number(r.counts?.[t.key]) || 0}
                      label={`${t.label}, ${who}`}
                      active={openType === t.key}
                      onClick={() => toggle(rowKey, t.key)}
                    />
                  ))}
                  <CountCell
                    count={Number(r.total) || 0}
                    label={`touches in total, ${who}`}
                    active={openType === ALL}
                    onClick={() => toggle(rowKey, ALL)}
                    strong
                    className="pr-2 sm:pr-3"
                  />
                </tr>
                {openType && (
                  <tr>
                    <td colSpan={colCount} className="border-b border-line bg-canvas/60 p-0">
                      <div className="sticky left-0 px-4 py-2 sm:px-5" style={width ? { width } : undefined}>
                        <p className="pt-1 text-xs font-semibold text-muted">
                          {openType === ALL ? 'All touches' : labels[openType]} · {who}
                        </p>
                        <EntryList entries={entries} labels={labels} emptyText="No entries." />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-subtle">
            <th scope="row" className={`${STICKY} bg-subtle px-4 py-2.5 text-left text-[13px] font-bold text-ink sm:px-5`}>
              Total
            </th>
            {types.map((t) => {
              const n = Number(totals[t.key]) || 0;
              return (
                <td key={t.key} className={`px-3 py-2.5 text-right text-[13px] font-bold tabular ${n ? 'text-ink' : 'text-faint'}`}>
                  {formatNumber(n)}
                </td>
              );
            })}
            <td className="py-2.5 pl-3 pr-4 text-right text-[13px] font-bold text-ink tabular sm:pr-5">{formatNumber(grand)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function OutreachTab({ range, userId, canTeam }) {
  const { from, to } = range;
  const { data, error, loading, reload } = useAsync(() => api.outreachReport({ from, to, user_id: userId || undefined }), [from, to, userId]);

  if (error && !data) return <ErrorState message={error.message} onRetry={() => reload()} />;

  const rows = data?.rows || [];

  return (
    <Card padded={false} aria-busy={loading ? 'true' : undefined}>
      <div className="border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-[15px] font-bold text-ink">Outreach by type</h2>
        <p className="mt-0.5 text-[13px] text-muted">Customer touches per person per day. Select a number to see those entries.</p>
      </div>

      {error && (
        <div className="p-4">
          <ErrorState message={error.message} onRetry={() => reload()} />
        </div>
      )}

      {!data ? (
        <div className="space-y-3 p-4 sm:p-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No activity logged in this period"
          message={
            canTeam
              ? 'Activities appear here when your team logs calls, emails or WhatsApp messages on a lead.'
              : 'Activities appear here when you log calls, emails or WhatsApp messages on a lead.'
          }
        />
      ) : (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <Matrix data={data} />
        </div>
      )}
    </Card>
  );
}
