import { Check, CalendarClock, Link2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { formatDate, daysFromToday } from '../../lib/format';
import { Avatar, IconButton, Menu, MenuItem, PriorityBadge } from '../ui';
import { formatDue, isDone } from './taskUtils';

/** One task in a list: complete checkbox, title (opens the editor), lead, due, priority, assignee. */
export default function TaskRow({ task, busy, showAssignee, canDelete, onToggle, onEdit, onDelete, onOpenLead }) {
  const done = isDone(task);
  const daysLate = task.due_date ? -daysFromToday(task.due_date) : 0;
  const overdue = !done && daysLate > 0;

  return (
    <li className="flex items-start gap-3 px-3 py-3 sm:px-4">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
        disabled={busy}
        onClick={() => onToggle(task)}
        className="group -m-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:cursor-wait disabled:opacity-60"
      >
        <span
          className={`flex h-[22px] w-[22px] items-center justify-center rounded-full ring-2 ring-inset transition-colors ${
            done ? 'bg-primary text-surface ring-primary' : 'text-transparent ring-line group-hover:text-primary/60 group-hover:ring-primary/60'
          }`}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className={`block max-w-full text-left text-sm font-semibold hover:underline ${done ? 'text-muted line-through' : 'text-ink'}`}
        >
          {task.title}
        </button>
        {task.description && <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{task.description}</p>}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
          <span className={`inline-flex items-center gap-1 ${overdue ? 'font-semibold text-danger' : ''}`}>
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            {formatDue(task)}
            {overdue && <span>· {daysLate === 1 ? '1 day late' : `${daysLate} days late`}</span>}
          </span>
          {done && task.completed_at && <span>Done {formatDate(task.completed_at, { year: false })}</span>}
          <PriorityBadge priority={task.priority} />
          {task.lead_id && (
            <button
              type="button"
              onClick={() => onOpenLead(task.lead_id)}
              className="inline-flex max-w-full items-center gap-1 font-semibold text-primary-ink hover:underline"
            >
              <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{task.lead_name || 'Open lead'}</span>
            </button>
          )}
          {showAssignee && (
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={task.assigned_name || ''} size={20} />
              <span className="truncate">{task.assigned_name || 'Unassigned'}</span>
            </span>
          )}
        </div>
      </div>

      <Menu
        trigger={({ toggle, open }) => (
          <IconButton icon={MoreHorizontal} label={`More actions for “${task.title}”`} size="sm" onClick={toggle} aria-expanded={open} aria-haspopup="menu" />
        )}
      >
        <MenuItem icon={Pencil} onClick={() => onEdit(task)}>
          Edit task
        </MenuItem>
        {canDelete && (
          <MenuItem icon={Trash2} danger onClick={() => onDelete(task)}>
            Delete task
          </MenuItem>
        )}
      </Menu>
    </li>
  );
}
