import { AlarmClock, MessagesSquare, Percent, Target, Trophy, UserPlus, Wallet } from 'lucide-react';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { ROLE_LABEL } from '../../lib/constants';
import { formatMoney, formatNumber, timeAgo } from '../../lib/format';
import { Avatar, Badge, Card, CardHeader, ErrorState, Skeleton, StatCard } from '../ui';
import StageBars from './StageBars';
import TrendChart from './TrendChart';
import { formatRange } from './range';

const TH = 'whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted';
const TD = 'whitespace-nowrap px-3 py-2.5 text-[13px] text-ink tabular';

function OverviewSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-5 w-64" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-[92px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

function TargetCard({ kpis, currency }) {
  const target = Number(kpis.monthly_target) || 0;
  const won = Number(kpis.won_this_month) || 0;
  const pct = kpis.target_percent ?? Math.round((won / target) * 100);
  const reached = won >= target;
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
          <Target className="h-4 w-4 text-primary" aria-hidden /> Monthly target
        </h3>
        <p className="text-[13px] text-muted">
          <span className="font-semibold text-ink tabular">{formatMoney(won, currency)}</span> won of {formatMoney(target, currency)} this month
        </p>
      </div>
      <div
        className="mt-3 h-3 overflow-hidden rounded-full bg-subtle"
        role="progressbar"
        aria-label="Monthly target progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, pct)}
        aria-valuetext={`${pct}% of the monthly target`}
      >
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.min(100, Math.max(pct, won > 0 ? 2 : 0))}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {reached ? `Target reached: ${pct}% of the goal.` : `${pct}% of the goal. ${formatMoney(target - won, currency)} still to go.`}
      </p>
    </Card>
  );
}

function SourcesTable({ sources }) {
  if (!sources.length) return <p className="py-6 text-center text-[13px] text-muted">No leads yet. Sources appear once leads are added.</p>;
  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-5">
      <table className="w-full min-w-[22rem]">
        <thead className="border-b border-line">
          <tr>
            <th scope="col" className={`${TH} pl-4 sm:pl-5`}>
              Source
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Leads
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Won
            </th>
            <th scope="col" className={`${TH} pr-4 text-right sm:pr-5`}>
              Win %
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sources.map((s) => (
            <tr key={s.source}>
              <th scope="row" className={`${TD} pl-4 text-left font-medium sm:pl-5`}>
                <span className="block max-w-[14rem] truncate" title={s.source}>
                  {s.source}
                </span>
              </th>
              <td className={`${TD} text-right`}>{formatNumber(s.count)}</td>
              <td className={`${TD} text-right`}>{formatNumber(s.won)}</td>
              <td className={`${TD} pr-4 text-right sm:pr-5`}>{s.count ? `${Math.round((s.won / s.count) * 100)}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductsList({ products, currency }) {
  if (!products.length) {
    return <p className="py-6 text-center text-[13px] text-muted">No products on open leads yet. Add products to a lead to see what buyers ask for most.</p>;
  }
  const max = Math.max(...products.map((p) => p.count));
  return (
    <ul className="space-y-2.5">
      {products.map((p) => (
        <li key={p.product}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate font-medium text-ink" title={p.product}>
              {p.product}
            </span>
            <span className="shrink-0 text-xs text-muted tabular">
              <span className="font-semibold text-ink">{formatNumber(p.count)}</span> {p.count === 1 ? 'lead' : 'leads'} · {formatMoney(p.value, currency, { compact: true })}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-r bg-subtle" aria-hidden>
            <div className="h-full rounded-r bg-info" style={{ width: `${(p.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TeamTable({ team, currency }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-5">
      <table className="w-full min-w-[46rem]">
        <thead className="border-b border-line">
          <tr>
            <th scope="col" className={`${TH} sticky left-0 z-10 bg-surface pl-4 sm:pl-5`}>
              Person
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Open leads
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Pipeline value
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Touches
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Won
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Overdue follow-ups
            </th>
            <th scope="col" className={`${TH} pr-4 sm:pr-5`}>
              Last login
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {team.map((m) => (
            <tr key={m.user_id}>
              <th scope="row" className={`${TD} sticky left-0 z-10 bg-surface pl-4 text-left font-normal sm:pl-5`}>
                <span className="flex items-center gap-2.5">
                  <Avatar name={m.name} size={28} />
                  <span className="min-w-0">
                    <span className="block max-w-[10rem] truncate font-semibold text-ink">{m.name}</span>
                    <span className="block text-xs text-muted">{ROLE_LABEL[m.role] || 'Sales staff'}</span>
                  </span>
                </span>
              </th>
              <td className={`${TD} text-right`}>{formatNumber(m.open_leads)}</td>
              <td className={`${TD} text-right`}>{formatMoney(m.pipeline_value, currency, { compact: true })}</td>
              <td className={`${TD} text-right`}>{formatNumber(m.touches)}</td>
              <td className={`${TD} text-right`}>
                {formatNumber(m.won)}
                {m.won > 0 && <span className="text-muted"> · {formatMoney(m.won_value, currency, { compact: true })}</span>}
              </td>
              <td className={`${TD} text-right ${m.overdue_follow_ups > 0 ? 'font-semibold text-danger' : ''}`}>{formatNumber(m.overdue_follow_ups)}</td>
              <td className={`${TD} pr-4 text-muted sm:pr-5`}>{m.last_login ? timeAgo(m.last_login) : 'Never'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OverviewTab({ range }) {
  const { from, to } = range;
  const { data, error, loading, reload } = useAsync(() => api.analytics({ from, to }), [from, to]);

  if (error && !data) return <ErrorState message={error.message} onRetry={() => reload()} />;
  if (!data) return <OverviewSkeleton />;

  const { kpis = {}, currency = 'INR' } = data;
  const company = data.scope === 'company';
  const money = (v) => formatMoney(v, currency, { compact: true });

  return (
    <div className={`space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading ? 'true' : undefined}>
      {error && <ErrorState message={error.message} onRetry={() => reload()} />}

      <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
        <Badge tone={company ? 'info' : 'slate'}>{company ? 'Whole company' : 'Your numbers'}</Badge>
        <span>{company ? 'All leads and everyone’s activity' : 'Leads assigned to you and activity you logged'}, {formatRange(data.range || range)}.</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Open pipeline value" value={money(kpis.pipeline_value)} hint={`${formatNumber(kpis.open_leads)} open leads`} icon={Wallet} />
        <StatCard label="New leads" value={formatNumber(kpis.new_leads)} hint="Added in this period" icon={UserPlus} tone="info" />
        <StatCard label="Won" value={formatNumber(kpis.won_count)} hint={`Worth ${money(kpis.won_value)}`} icon={Trophy} />
        <StatCard
          label="Win rate"
          value={kpis.win_rate === null || kpis.win_rate === undefined ? '—' : `${kpis.win_rate}%`}
          hint={kpis.won_count || kpis.lost_count ? `${formatNumber(kpis.won_count)} won, ${formatNumber(kpis.lost_count)} lost` : 'No deals closed yet'}
          icon={Percent}
          tone="info"
        />
        <StatCard label="Touches" value={formatNumber(kpis.touches)} hint="Calls, emails, messages" icon={MessagesSquare} tone="info" />
        <StatCard
          label="Overdue follow-ups"
          value={formatNumber(kpis.overdue_follow_ups)}
          hint="As of today"
          icon={AlarmClock}
          tone={kpis.overdue_follow_ups > 0 ? 'danger' : 'primary'}
        />
      </div>

      {Number(kpis.monthly_target) > 0 && <TargetCard kpis={kpis} currency={currency} />}

      {/* grid-cols-1 (minmax(0,1fr)) lets cards shrink below their content width; side by side only from xl so the stage bars keep room */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Daily trend" description="New leads added and customer touches logged each day." className="mb-4" />
          <TrendChart trend={data.trend} />
        </Card>
        <Card>
          <CardHeader title="Pipeline by stage" description="All current leads, by the stage they are in now." className="mb-4" />
          <StageBars stages={data.stages} currency={currency} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Lead sources" description="All leads by where they came from, and how many were won." className="mb-3" />
          <SourcesTable sources={data.sources || []} />
        </Card>
        <Card>
          <CardHeader title="Top products" description="Products most asked for on open leads." className="mb-4" />
          <ProductsList products={data.products || []} currency={currency} />
        </Card>
      </div>

      {data.team?.length > 0 && (
        <Card>
          <CardHeader
            title="Team performance"
            description="Open leads and pipeline as of today; touches and wins in the chosen period."
            className="mb-3"
          />
          <TeamTable team={data.team} currency={currency} />
        </Card>
      )}
    </div>
  );
}
