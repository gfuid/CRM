import React from 'react';

const COLORS = [
  '#3b82f6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
  '#84cc16', '#d946ef', '#0ea5e9', '#a855f7', '#22c55e',
];

const COLOR_CLASSES = [
  'bg-blue-500', 'bg-cyan-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500',
  'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500', 'bg-indigo-500',
  'bg-lime-500', 'bg-fuchsia-500', 'bg-sky-500', 'bg-violet-600', 'bg-green-500',
];

export default function PieChart({ data, size = 160 }) {
  if (!data || data.length === 0) {
    return <div className="text-slate-400 text-sm">No data available</div>;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return <div className="text-slate-400 text-sm">No data available</div>;
  }

  const radius = size / 2;
  const cx = radius;
  const cy = radius;
  const r = radius - 4;

  let cumulativeAngle = -90; // Start from top
  const slices = data.map((item, i) => {
    const angle = (item.value / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = startAngle + angle;
    cumulativeAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;
    const color = item.color || COLORS[i % COLORS.length];

    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return { d, color, label: item.label, value: item.value };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} stroke="#fff" strokeWidth="1.5" />
        ))}
      </svg>

      <div className="flex-1 w-full space-y-1.5 text-xs">
        {data.map((item, i) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={i} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${COLOR_CLASSES[i % COLOR_CLASSES.length]}`} />
                <span className="font-medium text-slate-700 truncate max-w-[130px]">{item.label}</span>
              </div>
              <span className="font-semibold text-slate-900">
                {item.value} <span className="text-slate-400 font-normal">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
