import { useState } from 'react';
import { formatDate, formatNumber } from '../../lib/format';
import useElementWidth from './useElementWidth';

/** Colours are theme-token classes (fill-primary, fill-info…) so they switch with dark mode. */
const SERIES = [
  { key: 'new_leads', label: 'New leads', fill: 'fill-primary', swatch: 'bg-primary' },
  { key: 'touches', label: 'Touches', fill: 'fill-info', swatch: 'bg-info' },
];

const PANEL_H = 120;
const PAD = { left: 36, right: 8, top: 10 };
const AXIS_H = 24;

/** Whole-number ticks from 0 to a "nice" top value. */
function niceTicks(max) {
  if (max <= 4) {
    const top = Math.max(max, 1);
    return Array.from({ length: top + 1 }, (_, i) => i);
  }
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return ticks;
}

/** Column with 4px rounded top corners, anchored to the baseline. */
function columnPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}L${x},${y + r}Q${x},${y} ${x + r},${y}L${x + w - r},${y}Q${x + w},${y} ${x + w},${y + r}L${x + w},${y + h}Z`;
}

function Panel({ series, data, width, geometry, hover, onHover, showAxis }) {
  const { step, barW, plotW } = geometry;
  const values = data.map((d) => Number(d[series.key]) || 0);
  const ticks = niceTicks(Math.max(0, ...values));
  const top = ticks[ticks.length - 1];
  const plotH = PANEL_H - PAD.top;
  const y = (v) => PAD.top + plotH - (v / top) * plotH;
  const height = PANEL_H + (showAxis ? AXIS_H : 6);

  // Label roughly every 64px, always including the latest day
  const every = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotW / 64))));
  const total = values.reduce((a, b) => a + b, 0);

  return (
    <svg width={width} height={height} className="block overflow-visible" aria-hidden onMouseLeave={() => onHover(null)}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} shapeRendering="crispEdges" />
          <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={12} className="fill-muted tabular">
            {formatNumber(t)}
          </text>
        </g>
      ))}

      {hover !== null && (
        <rect x={PAD.left + hover * step} y={PAD.top} width={step} height={plotH} className="fill-subtle" />
      )}

      {values.map((v, i) => {
        if (!v) return null;
        const x = PAD.left + i * step + (step - barW) / 2;
        return <path key={data[i].date} d={columnPath(x, y(v), barW, PAD.top + plotH - y(v))} className={series.fill} />;
      })}

      {total === 0 && (
        <text x={PAD.left + plotW / 2} y={PAD.top + plotH / 2} textAnchor="middle" fontSize={12} className="fill-muted">
          None in this period
        </text>
      )}

      {showAxis &&
        data.map((d, i) => {
          if ((data.length - 1 - i) % every !== 0) return null;
          const cx = Math.min(Math.max(PAD.left + i * step + step / 2, PAD.left + 18), width - PAD.right - 18);
          return (
            <text key={d.date} x={cx} y={PANEL_H + 17} textAnchor="middle" fontSize={12} className="fill-muted">
              {formatDate(d.date, { year: false })}
            </text>
          );
        })}

      {/* Hover targets: the whole column, wider than the bar */}
      {data.map((d, i) => (
        <rect
          key={d.date}
          x={PAD.left + i * step}
          y={0}
          width={step}
          height={height}
          fill="transparent"
          onMouseEnter={() => onHover(i)}
          onMouseMove={() => onHover(i)}
        />
      ))}
    </svg>
  );
}

/** Daily new leads and touches as two small column charts sharing one date axis. */
export default function TrendChart({ trend }) {
  const [ref, width] = useElementWidth();
  const [hover, setHover] = useState(null);
  const data = trend || [];

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const step = data.length ? plotW / data.length : 0;
  const barW = Math.max(1, Math.min(28, step - 2));
  const geometry = { step, barW, plotW };
  const totals = Object.fromEntries(SERIES.map((s) => [s.key, data.reduce((a, d) => a + (Number(d[s.key]) || 0), 0)]));
  const hovered = hover !== null ? data[hover] : null;
  const tipLeft = hovered ? Math.min(Math.max(PAD.left + hover * step + step / 2, 70), width - 70) : 0;

  return (
    <div>
      <div ref={ref} className="relative">
        {width > 0 &&
          SERIES.map((s, idx) => (
            <div key={s.key} className={idx > 0 ? 'mt-3' : ''}>
              <div className="mb-1 flex items-center gap-2 text-[13px]">
                <span className={`h-2.5 w-2.5 rounded-sm ${s.swatch}`} aria-hidden />
                <span className="font-semibold text-ink">{s.label}</span>
                <span className="text-muted tabular">{formatNumber(totals[s.key])} in this period</span>
              </div>
              <Panel series={s} data={data} width={width} geometry={geometry} hover={hover} onHover={setHover} showAxis={idx === SERIES.length - 1} />
            </div>
          ))}

        {hovered && (
          <div
            className="pointer-events-none absolute top-6 z-10 -translate-x-1/2 rounded-lg bg-surface px-3 py-2 text-xs shadow-pop ring-1 ring-line"
            style={{ left: tipLeft }}
            aria-hidden
          >
            <div className="mb-1 font-bold text-ink">{formatDate(hovered.date)}</div>
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center gap-2 whitespace-nowrap text-muted">
                <span className={`h-2 w-2 rounded-sm ${s.swatch}`} aria-hidden />
                {s.label}
                <span className="ml-auto pl-3 font-semibold text-ink tabular">{formatNumber(hovered[s.key])}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>New leads and touches per day</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            {SERIES.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{formatDate(d.date)}</th>
              {SERIES.map((s) => (
                <td key={s.key}>{formatNumber(d[s.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
