import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ListTodo, Plus, SearchX } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, PageHeader, SearchInput, Segmented, Skeleton } from '../components/ui';
import TaskRow from '../components/tasks/TaskRow';
import TaskFormModal from '../components/tasks/TaskFormModal';
import { groupOpenTasks, isDone } from '../components/tasks/taskUtils';

const SECTIONS = [
  { key: 'overdue', title: 'Overdue', tone: 'bg-danger-soft text-danger-ink' },
  { key: 'today', title: 'Today', tone: 'bg-primary-soft text-primary-ink' },
  { key: 'upcoming', title: 'Upcoming', tone: 'bg-subtle text-muted' },
  { key: 'undated', title: 'No due date', tone: 'bg-subtle text-muted' },
];

const matches = (task, q) =>
  [task.title, task.description, task.lead_name, task.assigned_name].some((v) => v && String(v).toLowerCase().includes(q));

function ListSkeleton() {
  return (
    <Card padded={false} aria-busy="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start gap-3 border-b border-line px-4 py-3.5 last:border-0">
          <Skeleton className="h-[22px] w-[22px] rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </Card>
  );
}

export default function TasksPage() {
  const { user, can } = useAuth();
  const toast = useToast();
  const { query, navigate } = useRouter();
  const canAssign = can('tasks_assign');

  const [scope, setScope] = useState('mine');
  const [status, setStatus] = useState('open');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | task
  const [deleting, setDeleting] = useState(null);
  // Read at call time, so Escape cannot close the confirm dialog while the delete is still running
  const deleteBusy = useRef(false);
  const [busyIds, setBusyIds] = useState(() => new Set());
  // Tasks ticked or unticked in this view stay visible (struck through) so a mis-click is easy to undo
  const [kept, setKept] = useState(() => new Set());

  const viewScope = canAssign ? scope : 'mine';
  const userId = user?.id;

  const { data, error, loading, reload, setData } = useAsync(async () => {
    const base = viewScope === 'mine' && canAssign ? { assigned_to: userId } : {};
    if (status === 'done') return api.tasks({ ...base, status: 'Completed' });
    const [pending, inProgress] = await Promise.all([
      api.tasks({ ...base, status: 'Pending' }),
      api.tasks({ ...base, status: 'In Progress' }),
    ]);
    return [...(pending || []), ...(inProgress || [])];
  }, [viewScope, status, userId, canAssign]);

  // Other pages open the new-task form with /app/tasks?new=1
  const wantsNew = query.get('new') === '1';
  const [handledNew, setHandledNew] = useState(false);
  if (wantsNew !== handledNew) {
    setHandledNew(wantsNew);
    if (wantsNew) setEditing('new');
  }
  useEffect(() => {
    if (wantsNew) navigate('/app/tasks', { replace: true });
  }, [wantsNew, navigate]);

  const changeView = (setter) => (value) => {
    setKept(new Set());
    setter(value);
  };

  const replaceTask = (id, next) => setData((list) => (list || []).map((t) => (t.id === id ? next : t)));

  const setBusy = (id, on) =>
    setBusyIds((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const setTaskStatus = async (task, nextStatus) => {
    setKept((k) => new Set(k).add(task.id));
    setBusy(task.id, true);
    replaceTask(task.id, { ...task, status: nextStatus, completed_at: nextStatus === 'Completed' ? new Date().toISOString() : task.completed_at });
    try {
      const saved = await api.updateTask(task.id, { status: nextStatus });
      replaceTask(task.id, saved);
      // Undo puts back the exact status the task had before (e.g. In Progress, not always Pending)
      toast.success(nextStatus === 'Completed' ? 'Task completed' : 'Task reopened', {
        action: { label: 'Undo', onClick: () => setTaskStatus(saved, task.status) },
      });
    } catch (e) {
      replaceTask(task.id, task);
      toast.error(e.message || 'Could not update the task');
    } finally {
      setBusy(task.id, false);
    }
  };

  const toggle = (task) => setTaskStatus(task, isDone(task) ? 'Pending' : 'Completed');

  const onSaved = (saved, isNew) => {
    if (!isNew) {
      replaceTask(saved.id, saved);
      return;
    }
    if (status === 'done') {
      changeView(setStatus)('open');
      return;
    }
    if (viewScope === 'all' || saved.assigned_to === userId) setData((list) => [saved, ...(list || [])]);
  };

  const confirmDelete = async () => {
    const task = deleting;
    deleteBusy.current = true;
    try {
      await api.deleteTask(task.id);
      setData((list) => (list || []).filter((t) => t.id !== task.id));
      toast.success('Task deleted');
    } catch (e) {
      toast.error(e.message || 'Could not delete the task');
    } finally {
      deleteBusy.current = false;
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data || []).filter((t) => (status === 'done' ? isDone(t) : !isDone(t)) || kept.has(t.id)).filter((t) => !q || matches(t, q));
  }, [data, status, kept, search]);

  const groups = useMemo(() => (status === 'open' ? groupOpenTasks(visible) : null), [status, visible]);
  const doneList = useMemo(
    () => (status === 'done' ? [...visible].sort((a, b) => (b.completed_at || b.updated_at || '').localeCompare(a.completed_at || a.updated_at || '')) : []),
    [status, visible]
  );

  const showAssignee = viewScope === 'all';
  const rowProps = (task) => ({
    task,
    busy: busyIds.has(task.id),
    showAssignee: showAssignee || task.assigned_to !== userId,
    canDelete: canAssign || task.created_by === userId,
    onToggle: toggle,
    onEdit: (t) => setEditing(t),
    onDelete: (t) => setDeleting(t),
    onOpenLead: (leadId) => navigate(`/app/leads?lead=${encodeURIComponent(leadId)}`),
  });

  const hasAny = (data || []).length > 0;
  const searching = Boolean(search.trim());

  let body;
  // Switching view reloads; show the skeleton rather than the previous view's tasks
  if (loading) body = <ListSkeleton />;
  else if (error) body = <ErrorState message={error.message} onRetry={() => reload()} />;
  else if (!visible.length) {
    if (searching && hasAny) {
      body = (
        <Card>
          <EmptyState icon={SearchX} title="No matching tasks" message={`No tasks match “${search.trim()}”. Try a different word.`} />
        </Card>
      );
    } else if (status === 'done') {
      body = (
        <Card>
          <EmptyState
            icon={CheckCircle2}
            title="No completed tasks yet"
            message="Tasks you tick off appear here, so you can look back at what was done."
          />
        </Card>
      );
    } else {
      body = (
        <Card>
          <EmptyState
            icon={ListTodo}
            title={viewScope === 'all' ? 'Your team has no open tasks' : 'You’re all caught up'}
            message="Add a task to plan a call, a follow-up or anything else that needs doing. Tasks can be linked to a lead."
            action={
              <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
                New task
              </Button>
            }
          />
        </Card>
      );
    }
  } else if (status === 'open') {
    body = (
      <div className="space-y-5">
        {SECTIONS.filter((s) => groups[s.key].length > 0).map((s) => (
          <section key={s.key} aria-labelledby={`tasks-${s.key}`}>
            <h2 id={`tasks-${s.key}`} className="mb-2 flex items-center gap-2 text-[13px] font-bold text-ink">
              {s.title}
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular ${s.tone}`}>{groups[s.key].length}</span>
            </h2>
            <Card padded={false}>
              <ul className="divide-y divide-line">
                {groups[s.key].map((t) => (
                  <TaskRow key={t.id} {...rowProps(t)} />
                ))}
              </ul>
            </Card>
          </section>
        ))}
      </div>
    );
  } else {
    body = (
      <Card padded={false}>
        <ul className="divide-y divide-line">
          {doneList.map((t) => (
            <TaskRow key={t.id} {...rowProps(t)} />
          ))}
        </ul>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Plan calls, follow-ups and to-dos, and tick them off when they’re done."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
            New task
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {canAssign && (
            <Segmented
              value={scope}
              onChange={changeView(setScope)}
              options={[
                { value: 'mine', label: 'My tasks' },
                { value: 'all', label: 'Everyone' },
              ]}
            />
          )}
          <Segmented
            value={status}
            onChange={changeView(setStatus)}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'done', label: 'Completed' },
            ]}
          />
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search tasks" className="w-full sm:ml-auto sm:w-64" />
      </div>

      <div aria-busy={loading ? 'true' : undefined}>{body}</div>

      {editing && (
        <TaskFormModal key={editing === 'new' ? 'new' : editing.id} task={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={onSaved} />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => {
          if (!deleteBusy.current) setDeleting(null);
        }}
        onConfirm={confirmDelete}
        title="Delete this task?"
        message={deleting ? `“${deleting.title}” will be removed for everyone. This can’t be undone.` : ''}
        confirmLabel="Delete task"
        danger
      />
    </div>
  );
}
