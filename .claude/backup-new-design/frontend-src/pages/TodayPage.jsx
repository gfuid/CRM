import { useState } from 'react';
import {
  AlarmClock,
  CalendarClock,
  CalendarDays,
  CircleCheckBig,
  History,
  ListChecks,
  RefreshCw,
  TriangleAlert,
  User,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { useRouter } from '../lib/router';
import { Button, ErrorState, PageHeader, Segmented, Skeleton, StatCard } from '../components/ui';
import LeadDrawer from '../components/leads/LeadDrawer';
import TodaySection, { SectionEmpty } from '../components/today/TodaySection';
import FollowUpRow from '../components/today/FollowUpRow';
import TaskRow from '../components/today/TaskRow';
import ActivityItem from '../components/today/ActivityItem';
import GettingStarted from '../components/today/GettingStarted';
import { plural } from '../components/today/contact';

const SCOPE_KEY = 'crm_today_scope';

// Users already known to have at least one lead this session. GET /leads has no limit,
// so once a lead exists we stop downloading the whole list just to check it is not empty.
const usersWithLeads = new Set();

const readScope = () => {
  try {
    return localStorage.getItem(SCOPE_KEY) === 'team' ? 'team' : 'mine';
  } catch {
    return 'mine'; // storage blocked: fall back to the default view
  }
};

const saveScope = (scope) => {
  try {
    localStorage.setItem(SCOPE_KEY, scope);
  } catch {
    /* storage blocked: the choice simply isn't remembered */
  }
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const SECTION = { overdue: 'today-overdue', due: 'today-due', tasks: 'today-tasks', upcoming: 'today-upcoming' };

const jumpTo = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  el.focus({ preventScroll: true });
};

function LoadingView() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading your day">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[92px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-4 rounded-xl bg-surface p-5 shadow-card ring-1 ring-line" aria-busy="true" aria-label="Loading recent activity">
      <Skeleton className="h-5 w-40" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TodayPage() {
  const { user, perms, can } = useAuth();
  const toast = useToast();
  const { navigate } = useRouter();

  const canTeam = perms.leads_scope === 'all';
  const [scopeChoice, setScopeChoice] = useState(readScope);
  const scope = canTeam ? scopeChoice : 'mine';
  const team = scope === 'team';

  const [drawer, setDrawer] = useState({ open: false, leadId: null, focusComposer: false });
  const [savingTasks, setSavingTasks] = useState(() => new Set());
  const [refreshing, setRefreshing] = useState(false);

  const today = useAsync(async () => {
    const data = await api.today({ scope });
    const f = data.follow_ups || {};
    const nothingDue = !f.overdue?.length && !f.due_today?.length && !f.upcoming?.length && !f.without_date;
    // Only check for an empty workspace when nothing is scheduled at all
    let noLeads = false;
    if (nothingDue && !usersWithLeads.has(user.id)) {
      const leads = await api.leads();
      noLeads = Array.isArray(leads) && leads.length === 0;
      if (!noLeads) usersWithLeads.add(user.id);
    }
    return { ...data, noLeads, scope };
  }, [scope, user.id]);

  // Activity follows the Mine / Team switch when the user may see team activity
  const activityView = perms.team_reports && team ? 'team' : 'mine';
  const activity = useAsync(async () => {
    const query = perms.team_reports && activityView === 'mine' ? { limit: 8, user_id: user.id } : { limit: 8 };
    const items = await api.activity(query);
    return { items: Array.isArray(items) ? items : [], view: activityView };
  }, [activityView, perms.team_reports, user.id]);
  // Ignore activity that belongs to the other view while the new one loads
  const activityItems = activity.data?.view === activityView ? activity.data.items : null;

  const changeScope = (next) => {
    setScopeChoice(next);
    saveScope(next);
  };

  const openLead = (leadId, focusComposer = false) => setDrawer({ open: true, leadId, focusComposer });

  const reloadAll = () => Promise.all([today.reload({ quiet: true }), activity.reload({ quiet: true })]);

  const refresh = async () => {
    setRefreshing(true);
    await reloadAll();
    setRefreshing(false);
  };

  const undoTask = async (task) => {
    try {
      await api.updateTask(task.id, { status: task.status && task.status !== 'Completed' ? task.status : 'Pending' });
      toast.info('Task moved back to your list.');
      today.reload({ quiet: true });
    } catch (e) {
      toast.error(e.message || 'Could not undo. Please try again.');
    }
  };

  const completeTask = async (task) => {
    setSavingTasks((s) => new Set(s).add(task.id));
    try {
      await api.updateTask(task.id, { status: 'Completed' });
      today.setData((d) =>
        d
          ? {
              ...d,
              tasks: {
                ...d.tasks,
                overdue: d.tasks.overdue.filter((t) => t.id !== task.id),
                due_today: d.tasks.due_today.filter((t) => t.id !== task.id),
              },
            }
          : d
      );
      toast.success('Task marked as done.', { action: { label: 'Undo', onClick: () => undoTask(task) } });
    } catch (e) {
      toast.error(e.message || 'Could not update the task. Please try again.');
    } finally {
      setSavingTasks((s) => {
        const next = new Set(s);
        next.delete(task.id);
        return next;
      });
    }
  };

  const firstName = (user?.name || '').trim().split(/\s+/)[0] || 'there';
  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Ignore data that belongs to the other Mine / Team view while the new one loads
  const data = today.data?.scope === scope ? today.data : null;
  const follow = data?.follow_ups || {};
  const overdue = follow.overdue || [];
  const dueToday = follow.due_today || [];
  const upcoming = follow.upcoming || [];
  const tasksDue = data ? [...(data.tasks?.overdue || []), ...(data.tasks?.due_today || [])] : [];
  const overdueTasks = data?.tasks?.overdue?.length || 0;
  const oldest = overdue.reduce((m, l) => Math.max(m, l.days_overdue || 0), 0);

  const rowProps = { showAssignee: team, onOpen: (id) => openLead(id), onLog: (id) => openLead(id, true) };

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={dateLabel}
        actions={
          <>
            {canTeam && (
              <div role="group" aria-label="Whose work to show">
                <Segmented
                  value={scope}
                  onChange={changeScope}
                  options={[
                    { value: 'mine', label: 'Mine', icon: User },
                    { value: 'team', label: 'Team', icon: UsersRound },
                  ]}
                />
              </div>
            )}
            <Button variant="secondary" icon={RefreshCw} loading={refreshing} onClick={refresh} aria-label="Refresh">
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </>
        }
      />

      {today.error && (
        <div className="mb-5">
          <ErrorState message={today.error.message} onRetry={() => today.reload()} />
        </div>
      )}

      {today.loading || (!data && !today.error) ? (
        <LoadingView />
      ) : data ? (
        <div className="space-y-5">
          {data.noLeads ? (
            <GettingStarted />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Overdue follow-ups"
                  value={overdue.length}
                  hint={overdue.length ? `Oldest is ${plural(oldest, 'day')} late` : 'All caught up'}
                  icon={TriangleAlert}
                  tone="danger"
                  onClick={() => jumpTo(SECTION.overdue)}
                />
                <StatCard
                  label="Due today"
                  value={dueToday.length}
                  hint="Follow-ups for today"
                  icon={AlarmClock}
                  tone="warning"
                  onClick={() => jumpTo(SECTION.due)}
                />
                <StatCard
                  label="Tasks due"
                  value={tasksDue.length}
                  hint={overdueTasks ? `${overdueTasks} overdue` : 'Today'}
                  icon={ListChecks}
                  tone="info"
                  onClick={() => jumpTo(SECTION.tasks)}
                />
                <StatCard
                  label="Next 7 days"
                  value={upcoming.length}
                  hint="Follow-ups coming up"
                  icon={CalendarDays}
                  tone="primary"
                  onClick={() => jumpTo(SECTION.upcoming)}
                />
              </div>

              {follow.without_date > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-info-soft px-4 py-3 text-[13px] text-info-ink ring-1 ring-inset ring-info/20">
                  <p className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      <span className="font-semibold">{plural(follow.without_date, 'open lead')}</span>{' '}
                      {follow.without_date === 1 ? 'has' : 'have'} no follow-up date, so {follow.without_date === 1 ? 'it' : 'they'} won’t show up here.
                    </span>
                  </p>
                  <button type="button" onClick={() => navigate('/app/leads')} className="font-semibold underline underline-offset-2">
                    Review leads
                  </button>
                </div>
              )}
            </>
          )}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-5">
              {!data.noLeads && (
                <>
                  <TodaySection
                    id={SECTION.overdue}
                    title="Overdue follow-ups"
                    description="Oldest first. Call, message or log an update to clear them."
                    icon={TriangleAlert}
                    tone="danger"
                    count={overdue.length}
                    items={overdue}
                    renderItem={(lead) => <FollowUpRow key={lead.id} lead={lead} kind="overdue" {...rowProps} />}
                    empty={<SectionEmpty icon={CircleCheckBig}>No overdue follow-ups. Nice work!</SectionEmpty>}
                  />
                  <TodaySection
                    id={SECTION.due}
                    title="Due today"
                    icon={AlarmClock}
                    tone="warning"
                    count={dueToday.length}
                    items={dueToday}
                    renderItem={(lead) => <FollowUpRow key={lead.id} lead={lead} kind="today" {...rowProps} />}
                    empty={<SectionEmpty icon={CircleCheckBig}>No follow-ups due. Nice work!</SectionEmpty>}
                  />
                </>
              )}

              <TodaySection
                id={SECTION.tasks}
                title="Tasks"
                description="Overdue and due today"
                icon={ListChecks}
                tone="info"
                count={tasksDue.length}
                items={tasksDue}
                limit={8}
                renderItem={(task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    today={data.today}
                    saving={savingTasks.has(task.id)}
                    canComplete={task.assigned_to === user.id || can('tasks_assign')}
                    showAssignee={team}
                    onComplete={completeTask}
                    onOpenLead={(id) => openLead(id)}
                  />
                )}
                empty={<SectionEmpty icon={CircleCheckBig}>No tasks due today.</SectionEmpty>}
                footer={
                  <button type="button" onClick={() => navigate('/app/tasks')} className="inline-flex h-8 items-center text-[13px] font-semibold text-primary hover:underline">
                    Open all tasks
                  </button>
                }
              />

              {!data.noLeads && (
                <TodaySection
                  id={SECTION.upcoming}
                  title="Next 7 days"
                  description="Follow-ups coming up this week"
                  icon={CalendarDays}
                  tone="primary"
                  count={upcoming.length}
                  items={upcoming}
                  renderItem={(lead) => <FollowUpRow key={lead.id} lead={lead} kind="upcoming" {...rowProps} />}
                  empty={<SectionEmpty>No follow-ups planned for the next 7 days.</SectionEmpty>}
                />
              )}
            </div>

            <div className="min-w-0">
              {activity.error ? (
                <div className="rounded-xl bg-surface p-4 shadow-card ring-1 ring-line">
                  <h2 className="mb-3 text-[15px] font-bold text-ink">Recent activity</h2>
                  <ErrorState message={activity.error.message} onRetry={() => activity.reload()} />
                </div>
              ) : !activityItems ? (
                <ActivitySkeleton />
              ) : (
                <TodaySection
                  title="Recent activity"
                  description={activityView === 'team' ? 'Latest updates from your team' : 'Your latest updates'}
                  icon={History}
                  items={activityItems}
                  limit={8}
                  renderItem={(item) => <ActivityItem key={item.id} item={item} currentUserId={user.id} onOpenLead={(id) => openLead(id)} />}
                  empty={<SectionEmpty>Nothing logged in the last 30 days. Calls, messages and notes you log will show up here.</SectionEmpty>}
                  footer={
                    <button
                      type="button"
                      onClick={() => navigate('/app/reports/activity')}
                      className="inline-flex h-8 items-center text-[13px] font-semibold text-primary hover:underline"
                    >
                      See all activity
                    </button>
                  }
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

      <LeadDrawer
        leadId={drawer.leadId}
        open={drawer.open}
        focusComposer={drawer.focusComposer}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        onChanged={() => reloadAll()}
      />
    </div>
  );
}
