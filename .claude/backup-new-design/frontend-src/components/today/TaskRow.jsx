import { Link2, Loader2 } from 'lucide-react';
import { Badge } from '../ui';
import { formatDate } from '../../lib/format';
import { taskTime } from './contact';

/** A task with a "mark as done" checkbox. `canComplete` is false for other people's tasks the user cannot manage. */
export default function TaskRow({ task, today, saving, canComplete, showAssignee, onComplete, onOpenLead }) {
  const overdue = task.due_date && task.due_date < today;
  const time = taskTime(task.due_date, task.due_time);
  const urgent = task.priority === 'High' || task.priority === 'Urgent';

  return (
    <li className="flex items-start gap-3 py-3">
      <span className="-my-1.5 flex h-8 w-8 shrink-0 items-center justify-center">
        {saving ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Saving" />
        ) : (
          <input
            type="checkbox"
            checked={false}
            disabled={!canComplete}
            onChange={() => onComplete(task)}
            className="h-5 w-5 cursor-pointer rounded [accent-color:rgb(var(--primary))] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Mark “${task.title}” as done`}
            title={canComplete ? 'Mark as done' : 'Only the assignee or someone who can assign tasks can complete this'}
          />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold text-ink">
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className={overdue ? 'font-semibold text-danger' : ''}>
            {overdue ? `Overdue · ${formatDate(task.due_date, { year: false })}` : 'Today'}
            {time && ` · ${time}`}
          </span>
          {urgent && <Badge tone={task.priority === 'Urgent' ? 'red' : 'amber'}>{task.priority}</Badge>}
          {showAssignee && <span>For {task.assigned_name}</span>}
          {task.lead_id && task.lead_name && (
            <button
              type="button"
              onClick={() => onOpenLead(task.lead_id)}
              className="inline-flex min-w-0 items-center gap-1 font-semibold text-primary hover:underline"
            >
              <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{task.lead_name}</span>
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
