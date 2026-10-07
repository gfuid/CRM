import { useId, useMemo, useRef, useState } from 'react';
import { Link2 } from 'lucide-react';
import { api } from '../../lib/api';
import { PRIORITIES } from '../../lib/constants';
import { addDays, localToday } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';
import LeadPicker from './LeadPicker';
import useMemberList from './useMemberList';

const QUICK_DATES = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'Next week', days: 7 },
];

/**
 * Create or edit a task. Mount it only while open (so the form starts fresh each time).
 * `task` is the task being edited, or null for a new one.
 */
export default function TaskFormModal({ task, onClose, onSaved }) {
  const isNew = !task;
  const formId = useId();
  const toast = useToast();
  const { user, can } = useAuth();
  const canAssign = can('tasks_assign');
  const { members, loading: membersLoading, error: membersError } = useMemberList(canAssign);
  const today = localToday();

  const [form, setForm] = useState(() => ({
    title: task?.title || '',
    description: task?.description || '',
    due_date: task ? task.due_date || '' : today,
    due_time: task?.due_time || '',
    priority: task?.priority || 'Medium',
    assigned_to: task?.assigned_to || user?.id || '',
    lead: task?.lead_id ? { id: task.lead_id, name: task.lead_name || 'Linked lead' } : null,
  }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  // The dialog keeps the onClose it was opened with (Escape key), so the guard reads a ref at call time
  const savingRef = useRef(false);
  const requestClose = () => {
    if (!savingRef.current) onClose();
  };

  const set = (key) => (e) => {
    const value = e && e.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  // Active members can be chosen; keep the current assignee listed even if they were deactivated
  const assigneeOptions = useMemo(() => {
    const list = members.filter((m) => m.is_active || m.id === form.assigned_to);
    if (user && !list.some((m) => m.id === user.id)) list.unshift({ id: user.id, name: user.name, is_active: true });
    return list.map((m) => ({
      value: m.id,
      label: `${m.name}${m.id === user?.id ? ' (you)' : ''}${m.is_active ? '' : ' (inactive)'}`,
    }));
  }, [members, form.assigned_to, user]);

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = 'Enter a title for the task';
    else if (form.title.trim().length > 200) next.title = 'Keep the title under 200 characters';
    if (!form.due_date) next.due_date = 'Choose a due date';
    if (form.description.length > 3000) next.description = 'Keep the description under 3000 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (savingRef.current) return;
    setFormError('');
    if (!validate()) return;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      due_date: form.due_date,
      due_time: form.due_time,
      priority: form.priority,
    };
    if (canAssign && form.assigned_to && (isNew || form.assigned_to !== task.assigned_to)) payload.assigned_to = form.assigned_to;
    if (isNew && form.lead) payload.lead_id = form.lead.id;

    setSaving(true);
    savingRef.current = true;
    try {
      const saved = isNew ? await api.createTask(payload) : await api.updateTask(task.id, payload);
      toast.success(isNew ? 'Task added' : 'Task saved');
      onSaved(saved, isNew);
      onClose();
    } catch (err) {
      setFormError(err.message);
      toast.error(err.message || 'Could not save the task');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={requestClose}
      title={isNew ? 'New task' : 'Edit task'}
      size="md"
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={saving}>
            {isNew ? 'Add task' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        {formError && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger-ink">
            {formError}
          </p>
        )}

        <Field label="Title" required error={errors.title}>
          <Input value={form.title} onChange={set('title')} maxLength={200} placeholder="For example: Call back about the quotation" data-autofocus />
        </Field>

        <Field label="Description" error={errors.description} hint="Optional. Add any details that help get it done.">
          <Textarea value={form.description} onChange={set('description')} rows={3} maxLength={3000} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Field label="Due date" required error={errors.due_date}>
              <Input type="date" value={form.due_date} onChange={set('due_date')} />
            </Field>
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Quick due dates">
              {QUICK_DATES.map((q) => {
                const value = addDays(today, q.days);
                const active = form.due_date === value;
                return (
                  <button
                    key={q.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set('due_date')(value)}
                    className={`h-8 rounded-md px-2.5 text-xs font-semibold ring-1 ring-inset transition-colors ${
                      active ? 'bg-primary-soft text-primary-ink ring-primary/30' : 'bg-surface text-muted ring-line hover:bg-subtle hover:text-ink'
                    }`}
                  >
                    {q.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Time" hint="Optional">
            <Input type="time" value={form.due_time} onChange={set('due_time')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Priority">
            <Select value={form.priority} onChange={set('priority')} options={PRIORITIES} />
          </Field>
          {canAssign && (
            <Field
              label="Assign to"
              error={membersError ? `Couldn’t load the team list. ${membersError.message}` : undefined}
              hint={membersLoading ? 'Loading team…' : undefined}
            >
              <Select value={form.assigned_to} onChange={set('assigned_to')} options={assigneeOptions} disabled={membersLoading} />
            </Field>
          )}
        </div>

        {isNew ? (
          <LeadPicker value={form.lead} onChange={set('lead')} />
        ) : (
          form.lead && (
            <div>
              <span className="mb-1.5 block text-[13px] font-semibold text-ink">Linked lead</span>
              <div className="flex items-center gap-2 rounded-lg bg-subtle px-3 py-2 ring-1 ring-inset ring-line">
                <Link2 className="h-4 w-4 shrink-0 text-faint" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{form.lead.name}</span>
              </div>
              <p className="mt-1 text-xs text-muted">The linked lead is set when the task is created.</p>
            </div>
          )
        )}
      </form>
    </Modal>
  );
}
