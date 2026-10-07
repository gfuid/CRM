import { PRIORITIES } from '../../lib/constants';
import { formatDate, formatTime, daysFromToday, localToday } from '../../lib/format';

export const isDone = (task) => task.status === 'Completed';

const PRIORITY_RANK = Object.fromEntries(PRIORITIES.map((p, i) => [p, PRIORITIES.length - i]));

/** Earliest due first; within the same moment, the more urgent task first. */
export const compareTasks = (a, b) =>
  (a.due_date || '9999-99-99').localeCompare(b.due_date || '9999-99-99') ||
  (a.due_time || '99:99').localeCompare(b.due_time || '99:99') ||
  (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0) ||
  (a.title || '').localeCompare(b.title || '');

/** "6:00 pm" from a 24-hour "18:00" (empty when there is no time). */
export const formatDueTime = (dueTime) => (dueTime ? formatTime(`2000-01-01T${dueTime}`) : '');

/** "Today, 6:00 pm", "Tomorrow", "12 Oct". */
export const formatDue = (task) => {
  if (!task.due_date) return 'No due date';
  const n = daysFromToday(task.due_date);
  const day = n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : formatDate(task.due_date, { year: n < -300 || n > 300 ? undefined : false });
  const time = formatDueTime(task.due_time);
  return time ? `${day}, ${time}` : day;
};

/** Splits open tasks into the sections shown on the page. */
export function groupOpenTasks(tasks) {
  const today = localToday();
  const groups = { overdue: [], today: [], upcoming: [], undated: [] };
  for (const t of tasks) {
    if (!t.due_date) groups.undated.push(t);
    else if (t.due_date < today) groups.overdue.push(t);
    else if (t.due_date === today) groups.today.push(t);
    else groups.upcoming.push(t);
  }
  for (const list of Object.values(groups)) list.sort(compareTasks);
  return groups;
}
