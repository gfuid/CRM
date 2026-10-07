import { useMemo } from 'react';
import { ChartColumn, ClipboardList, MessagesSquare } from 'lucide-react';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { Field, PageHeader, Select } from '../components/ui';
import DateRangeControl from '../components/reports/DateRangeControl';
import OverviewTab from '../components/reports/OverviewTab';
import ActivityTab from '../components/reports/ActivityTab';
import OutreachTab from '../components/reports/OutreachTab';
import { readRange } from '../components/reports/range';
import useMemberList from '../components/tasks/useMemberList';

function PersonFilter({ value, onChange }) {
  const { members, loading, error } = useMemberList(true);
  const options = useMemo(() => {
    const active = members.filter((m) => m.is_active);
    const former = members.filter((m) => !m.is_active);
    return [
      { value: '', label: 'Everyone' },
      ...active.map((m) => ({ value: m.id, label: m.name })),
      ...former.map((m) => ({ value: m.id, label: `${m.name} (inactive)` })),
    ];
  }, [members]);
  // Keep a person picked from the URL selectable while the list loads
  const known = !value || options.some((o) => o.value === value);
  return (
    <Field
      label="Person"
      className="w-full sm:w-56"
      error={error ? `Couldn’t load the team list. ${error.message}` : undefined}
      hint={loading ? 'Loading team…' : undefined}
    >
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {!known && <option value={value}>Selected person</option>}
      </Select>
    </Field>
  );
}

export default function ReportsPage() {
  const { param, query, navigate } = useRouter();
  const { can } = useAuth();
  const canTeam = can('team_reports');

  const tabs = [
    { key: 'overview', label: 'Overview', icon: ChartColumn },
    { key: 'activity', label: canTeam ? 'Team activity' : 'My activity', icon: ClipboardList },
    { key: 'outreach', label: 'Outreach', icon: MessagesSquare },
  ];
  const tab = tabs.some((t) => t.key === param) ? param : 'overview';
  const range = useMemo(() => readRange(query), [query]);
  const userId = canTeam ? query.get('user_id') || '' : '';
  const qs = query.toString();

  /** Updates the URL query (period, person) without adding a history entry for every tweak. */
  const setQuery = (changes) => {
    const q = new URLSearchParams(query);
    for (const [k, v] of Object.entries(changes)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    const next = q.toString();
    navigate(`/app/reports/${tab}${next ? `?${next}` : ''}`, { replace: true });
  };

  return (
    <div>
      <PageHeader title="Reports" description="How leads, deals and daily outreach are going, worked out from what your team logs." />

      <nav aria-label="Report sections" className="-mx-4 mb-5 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-1">
          {tabs.map((t) => {
            const active = t.key === tab;
            return (
              <Link
                key={t.key}
                to={`/app/reports/${t.key}${qs ? `?${qs}` : ''}`}
                aria-current={active ? 'page' : undefined}
                className={`-mb-px inline-flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors ${
                  active ? 'border-primary text-primary-ink' : 'border-transparent text-muted hover:border-line hover:text-ink'
                }`}
              >
                <t.icon className="h-4 w-4" aria-hidden />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <DateRangeControl value={range} onChange={(r) => setQuery({ from: r.from, to: r.to, period: r.period })} />
        {tab !== 'overview' && canTeam && <PersonFilter value={userId} onChange={(id) => setQuery({ user_id: id })} />}
      </div>

      {tab === 'overview' && <OverviewTab range={range} />}
      {tab === 'activity' && <ActivityTab range={range} userId={userId} canTeam={canTeam} />}
      {tab === 'outreach' && <OutreachTab range={range} userId={userId} canTeam={canTeam} />}
    </div>
  );
}
