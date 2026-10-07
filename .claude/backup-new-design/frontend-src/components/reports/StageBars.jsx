import { useState } from 'react';
import { stageInfo } from '../../lib/constants';
import { formatMoney, formatNumber } from '../../lib/format';
import { Segmented } from '../ui';

/** Horizontal bars, one per stage, with count and value written next to each bar. */
export default function StageBars({ stages, currency }) {
  const [measure, setMeasure] = useState('count');
  const rows = stages || [];
  const max = Math.max(0, ...rows.map((r) => Number(r[measure]) || 0));
  const total = rows.reduce((a, r) => a + (Number(r.count) || 0), 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">Bar length shows {measure === 'count' ? 'the number of leads' : 'the deal value'}.</p>
        <Segmented
          size="sm"
          value={measure}
          onChange={setMeasure}
          options={[
            { value: 'count', label: 'Leads' },
            { value: 'value', label: 'Value' },
          ]}
        />
      </div>
      {total === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted">No leads yet. Stages fill in as leads are added and moved forward.</p>
      ) : (
        // From sm up the list is one grid and each row is a subgrid, so every bar starts and ends at the
        // same x (bar lengths stay comparable) while the label and number columns only take the room they need.
        <ul className="flex flex-col gap-2.5 sm:grid sm:grid-cols-[minmax(5rem,7rem)_minmax(0,1fr)_auto] sm:items-center sm:gap-x-3">
          {rows.map((r) => {
            const v = Number(r[measure]) || 0;
            const pct = max > 0 ? (v / max) * 100 : 0;
            const lost = r.stage === 'Closed Lost';
            return (
              <li key={r.stage} className="sm:col-span-3 sm:grid sm:grid-cols-subgrid sm:items-center">
                <div className="flex items-baseline justify-between gap-3 sm:contents">
                  <span className="truncate text-[13px] font-medium text-ink sm:order-1" title={r.stage}>
                    {stageInfo(r.stage).short}
                  </span>
                  <span className="shrink-0 text-xs text-muted tabular sm:order-3 sm:whitespace-nowrap sm:text-right">
                    <span className="font-semibold text-ink">{formatNumber(r.count)}</span> {r.count === 1 ? 'lead' : 'leads'}
                    {' · '}
                    {formatMoney(r.value, currency, { compact: true })}
                  </span>
                </div>
                <div className="mt-1 h-3 rounded-r bg-subtle sm:order-2 sm:mt-0 sm:h-5" aria-hidden>
                  {v > 0 && <div className={`h-full rounded-r ${lost ? 'bg-faint/60' : 'bg-primary'}`} style={{ width: `${Math.max(pct, 1.5)}%` }} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
