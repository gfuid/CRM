import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ExternalLink, ListTodo, Mail, MessageCircle, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api, ApiError } from '../../lib/api';
import { ACTIVITY_LABEL, STAGES } from '../../lib/constants';
import { formatDate, formatDateTime, formatMoney, formatNumber, localToday, relativeDay, timeAgo } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import { Avatar, Badge, Button, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, IconButton, Input, PriorityBadge, Select, Skeleton, StagePill } from '../ui';
import ActivityComposer from './ActivityComposer';
import { Checkbox, FollowUpText } from './LeadBits';
import LeadFormModal from './LeadFormModal';
import { activityIcon, hasValue, listLead, moneyOrDash, SYSTEM_ACTIVITY_TYPES, telLink, useTeamMembers, waLink, whatsappNumber } from './leadUtils';

const safeUrl = (u) => (u ? (/^https?:\/\//i.test(u) ? u : `https://${u}`) : null);

const unitPrice = (amount, currency) => {
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toLocaleString()}`;
  }
};

function ContactButton({ href, icon: Icon, label, missing, external = false }) {
  const cls = 'inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold ring-1 ring-inset transition-colors';
  if (!href) {
    return (
      <button type="button" disabled title={missing} className={`${cls} cursor-not-allowed bg-surface text-faint ring-line`}>
        <Icon className="h-4 w-4" aria-hidden />
        {label}
      </button>
    );
  }
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`${cls} bg-surface text-ink ring-line hover:bg-primary-soft hover:text-primary-ink hover:ring-primary/30`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </a>
  );
}

function Timeline({ activities }) {
  if (!activities.length) {
    return <EmptyState title="No activity yet" message="Log your first call, email or WhatsApp above. It will show up here." className="py-8" />;
  }
  return (
    <ol className="space-y-4">
      {activities.map((a) => {
        const Icon = activityIcon(a.type);
        const label = ACTIVITY_LABEL[a.type] || a.title || 'Activity';
        const when = (
          <time dateTime={a.timestamp} title={formatDateTime(a.timestamp)} className="whitespace-nowrap text-xs text-muted">
            {timeAgo(a.timestamp)}
          </time>
        );
        if (SYSTEM_ACTIVITY_TYPES.has(a.type)) {
          return (
            <li key={a.id} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-subtle text-muted ring-1 ring-inset ring-line">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 pt-1 text-[13px] text-muted">
                <span className="font-semibold text-ink">{label}</span>
                {a.note ? <span className="break-words">: {a.note}</span> : null}
                <span> · {a.user_name}</span> · {when}
              </div>
            </li>
          );
        }
        return (
          <li key={a.id} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="text-sm font-semibold text-ink">{label}</span>
                {when}
              </div>
              {a.note && <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] text-ink">{a.note}</p>}
              <div className="mt-0.5 text-xs text-muted">by {a.user_name}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-xs font-semibold text-muted sm:text-[13px]">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-ink">{children}</dd>
    </div>
  );
}

function Details({ lead, fallbackCurrency }) {
  const currency = lead.currency || fallbackCurrency;
  const rows = [
    { label: 'Contact person', value: lead.contact_person },
    { label: 'Phone', value: lead.phone && <a href={telLink(lead.phone)} className="text-primary hover:underline">{lead.phone}</a> },
    { label: 'WhatsApp', value: lead.whatsapp && <a href={waLink(lead.whatsapp)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{lead.whatsapp}</a> },
    { label: 'Email', value: lead.email && <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a> },
    { label: 'Country', value: lead.country },
    { label: 'Source', value: lead.source },
    { label: 'Products', value: (lead.products || []).join(', ') },
    { label: 'Quantity', value: hasValue(lead.quantity) && `${formatNumber(lead.quantity)} ${lead.quantity_unit || ''}`.trim() },
    { label: 'Price per unit', value: hasValue(lead.price) && unitPrice(lead.price, currency) },
    { label: 'Deal value', value: hasValue(lead.value) && formatMoney(lead.value, currency) },
    { label: 'Priority', value: lead.priority && <PriorityBadge priority={lead.priority} /> },
    { label: 'Expected close date', value: lead.expected_close_date && `${formatDate(lead.expected_close_date)} (${relativeDay(lead.expected_close_date.slice(0, 10))})` },
    { label: 'Next follow-up', value: lead.follow_up_date && <FollowUpText lead={lead} /> },
    { label: 'Incoterm', value: lead.incoterm },
    { label: 'Payment terms', value: lead.payment_terms },
    { label: 'Port of delivery', value: lead.port_delivery },
    {
      label: 'Website',
      value: lead.website && (
        <a href={safeUrl(lead.website)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
          {lead.website}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      ),
    },
    { label: 'Address', value: lead.address && <span className="whitespace-pre-wrap">{lead.address}</span> },
    { label: 'Industry', value: lead.industry_type },
    { label: 'Type', value: lead.type },
    { label: 'Credit rating', value: lead.credit_rating },
    { label: 'Turnover', value: lead.turnover },
    { label: 'Tags', value: (lead.tags || []).join(', ') },
    { label: 'Notes', value: lead.notes && <span className="whitespace-pre-wrap">{lead.notes}</span> },
    { label: 'Created by', value: lead.created_by_name },
    { label: 'Created', value: lead.created_at && formatDateTime(lead.created_at) },
    { label: 'Last activity', value: lead.last_activity_at && formatDateTime(lead.last_activity_at) },
    { label: 'Closed on', value: lead.closed_at && formatDateTime(lead.closed_at) },
  ].filter((r) => r.value);

  const contacts = lead.contacts || [];
  const requirements = Object.entries(lead.export_requirements || {}).filter(([, v]) => v !== '' && v !== null && v !== undefined);

  return (
    <div className="space-y-6">
      <dl className="divide-y divide-line">
        {rows.map((r) => (
          <DetailRow key={r.label} label={r.label}>
            {r.value}
          </DetailRow>
        ))}
      </dl>

      {contacts.length > 0 && (
        <section>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Other contacts</h4>
          <ul className="grid gap-2 sm:grid-cols-2">
            {contacts.map((c, i) => (
              <li key={i} className="rounded-lg p-3 text-[13px] ring-1 ring-inset ring-line">
                <div className="font-semibold text-ink">{c.name || 'Unnamed contact'}</div>
                {c.designation && <div className="text-muted">{c.designation}</div>}
                <div className="mt-1 space-y-0.5">
                  {c.phone && (
                    <a href={telLink(c.phone)} className="block text-primary hover:underline">
                      {c.phone}
                    </a>
                  )}
                  {c.whatsapp && (
                    <a href={waLink(c.whatsapp)} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline">
                      WhatsApp {c.whatsapp}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="block break-all text-primary hover:underline">
                      {c.email}
                    </a>
                  )}
                  {c.linkedin && (
                    <a href={safeUrl(c.linkedin)} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline">
                      LinkedIn
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {requirements.length > 0 && (
        <section>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Requirements</h4>
          <dl className="divide-y divide-line">
            {requirements.map(([k, v]) => (
              <DetailRow key={k} label={k}>
                {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
              </DetailRow>
            ))}
          </dl>
        </section>
      )}

      {rows.length === 0 && contacts.length === 0 && requirements.length === 0 && (
        <EmptyState title="No details yet" message="Use Edit to add contact, deal and shipping details." className="py-8" />
      )}
    </div>
  );
}

function Tasks({ lead, onTasksChange }) {
  const { user, can } = useAuth();
  const toast = useToast();
  // Without tasks_assign the server only lets people update their own tasks
  const canManageAll = can('tasks_assign');
  const today = localToday();
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(today);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState('');

  const tasks = useMemo(
    () =>
      [...(lead.tasks || [])].sort((a, b) => {
        const da = a.status === 'Completed' ? 1 : 0;
        const db = b.status === 'Completed' ? 1 : 0;
        return da - db || String(a.due_date || '').localeCompare(String(b.due_date || ''));
      }),
    [lead.tasks]
  );

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    try {
      const task = await api.createTask({ title: title.trim(), due_date: due || undefined, lead_id: lead.id });
      onTasksChange((list) => [...list, task]);
      setTitle('');
      toast.success('Task added');
    } catch (err) {
      toast.error(`Couldn’t add the task. ${err.message}`);
    } finally {
      setAdding(false);
    }
  };

  const toggle = async (task, done) => {
    setBusyId(task.id);
    try {
      const updated = await api.updateTask(task.id, { status: done ? 'Completed' : 'Pending' });
      onTasksChange((list) => list.map((t) => (t.id === task.id ? { ...t, ...updated } : t)));
      toast.success(done ? 'Task completed' : 'Task reopened');
    } catch (err) {
      toast.error(`Couldn’t update the task. ${err.message}`);
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <Field label="New task">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Send revised quotation" />
        </Field>
        <Field label="Due date">
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <Button type="submit" icon={Plus} loading={adding} disabled={!title.trim()}>
          Add task
        </Button>
      </form>

      {tasks.length === 0 ? (
        <EmptyState icon={ListTodo} title="No tasks for this lead" message="Add a to-do, like sending a sample or a quotation." className="py-8" />
      ) : (
        <ul className="divide-y divide-line rounded-lg ring-1 ring-inset ring-line">
          {tasks.map((t) => {
            const done = t.status === 'Completed';
            const overdue = !done && t.due_date && t.due_date.slice(0, 10) < today;
            const mine = canManageAll || t.assigned_to === user?.id;
            const lockedHint = mine ? undefined : `Only ${t.assigned_name || 'the assigned person'} can update this task`;
            return (
              <li key={t.id} className="flex items-start gap-3 px-3 py-2.5">
                <Checkbox
                  className={`mt-0.5 ${mine ? '' : 'cursor-not-allowed opacity-50'}`}
                  checked={done}
                  disabled={!mine || busyId === t.id}
                  title={lockedHint}
                  onChange={(v) => toggle(t, v)}
                  label={done ? `Reopen task: ${t.title}` : `Mark task done: ${t.title}`}
                  aria-description={lockedHint}
                />
                <div className="min-w-0 flex-1">
                  <div className={`break-words text-sm font-medium ${done ? 'text-muted line-through' : 'text-ink'}`}>{t.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    {t.due_date && (
                      <span className={overdue ? 'font-semibold text-danger' : ''}>
                        {overdue ? 'Overdue · ' : ''}
                        {formatDate(t.due_date)}
                        {t.due_time ? `, ${t.due_time}` : ''}
                      </span>
                    )}
                    {t.assigned_name && <span>· {t.assigned_name}</span>}
                    {!mine && <span>· Only they can update it</span>}
                  </div>
                </div>
                {t.status === 'In Progress' && <Badge tone="info">In progress</Badge>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// The id comes from the ?lead= link, so only plain ids may reach the request path (never "export", "../company" etc.)
const LEAD_ID_RE = /^[A-Za-z0-9_-]{1,100}$/;
const RESERVED_IDS = new Set(['export', 'import', 'trash']);

const loadLead = async (leadId) => {
  const id = String(leadId || '');
  if (!LEAD_ID_RE.test(id) || RESERVED_IDS.has(id.toLowerCase())) {
    throw new ApiError('This link does not point to a lead. Check the link and try again.', 400);
  }
  const lead = await api.lead(encodeURIComponent(id));
  if (!lead || typeof lead !== 'object' || Array.isArray(lead) || lead.id !== id) {
    throw new ApiError('This lead was not found.', 404);
  }
  return lead;
};

const TABS = [
  { key: 'timeline', label: 'Timeline' },
  { key: 'details', label: 'Details' },
  { key: 'tasks', label: 'Tasks' },
];

function LeadDrawerInner({ leadId, onClose, onChanged, focusComposer }) {
  const { user, company, can, perms } = useAuth();
  const toast = useToast();
  const members = useTeamMembers();
  const tabsId = useId();
  const { data: lead, error, loading, reload, setData } = useAsync(() => loadLead(leadId), [leadId]);
  const [tab, setTab] = useState('timeline');
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState('');

  const currency = company?.settings?.currency || 'INR';
  const canEdit = can('leads_edit');
  // Reassigning goes through PATCH /leads/:id, which also needs the edit permission
  const canAssign = canEdit && can('leads_reassign');
  const canDelete = can('leads_delete');

  // The drawer must not close underneath an open edit form or confirm dialog when Escape is pressed
  const childOpen = useRef(false);
  const closeRef = useRef(onClose);
  useEffect(() => {
    childOpen.current = editOpen || confirmDelete;
    closeRef.current = onClose;
  });
  const guardedClose = () => {
    if (!childOpen.current) closeRef.current();
  };

  /** Applies a saved lead: keeps the timeline/tasks, tells the page, and handles leads that leave this user's view. */
  const applyUpdate = (updated, { refresh = true } = {}) => {
    if (perms.leads_scope !== 'all' && updated.assigned_to !== user?.id) {
      toast.info(`Assigned to ${updated.agent_name}. It no longer shows in your leads.`);
      onChanged?.(null);
      onClose();
      return;
    }
    setData((prev) => ({ ...prev, ...updated }));
    onChanged?.(listLead(updated));
    if (refresh) reload({ quiet: true });
  };

  const changeStage = async (stage) => {
    if (!lead || stage === lead.stage) return;
    setBusy('stage');
    try {
      const updated = await api.updateLead(lead.id, { stage });
      toast.success(`Moved to ${stage}`);
      applyUpdate(updated);
    } catch (err) {
      toast.error(`Couldn’t change the stage. ${err.message}`);
    } finally {
      setBusy('');
    }
  };

  const assign = async (userId) => {
    if (!lead || userId === lead.assigned_to) return;
    setBusy('assign');
    try {
      const updated = await api.updateLead(lead.id, { assigned_to: userId });
      if (perms.leads_scope === 'all' || updated.assigned_to === user?.id) toast.success(`Assigned to ${updated.agent_name}`);
      applyUpdate(updated);
    } catch (err) {
      toast.error(`Couldn’t reassign the lead. ${err.message}`);
    } finally {
      setBusy('');
    }
  };

  const remove = async () => {
    try {
      await api.deleteLead(lead.id);
      toast.success(`Moved “${lead.name}” to trash`);
      onChanged?.(null);
      onClose();
    } catch (err) {
      toast.error(`Couldn’t delete the lead. ${err.message}`);
    }
  };

  const onLogged = ({ activity, lead: updated }, { stageChanged }) => {
    setData((prev) => ({ ...prev, ...updated, activities: [activity, ...(prev?.activities || [])] }));
    onChanged?.(listLead(updated));
    setTab('timeline');
    if (stageChanged) reload({ quiet: true });
  };

  const assignOptions = useMemo(() => {
    const active = members.filter((m) => m.is_active !== false);
    const current = lead && members.find((m) => m.id === lead.assigned_to);
    const list = current && current.is_active === false ? [...active, current] : active;
    const opts = list.map((m) => ({ value: m.id, label: `${m.name}${m.id === user?.id ? ' (you)' : ''}${m.is_active === false ? ' (inactive)' : ''}` }));
    if (lead && !opts.some((o) => o.value === lead.assigned_to)) opts.unshift({ value: lead.assigned_to || '', label: lead.agent_name || 'Unassigned' });
    return opts;
  }, [members, lead, user?.id]);

  const notFound = error?.status === 404;

  const subtitle = lead ? (
    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
      <StagePill stage={lead.stage} />
      <span className="font-semibold tabular text-ink">{moneyOrDash(lead, currency)}</span>
      <span className="inline-flex items-center gap-1.5">
        <Avatar name={lead.agent_name} size={20} />
        {lead.agent_name}
      </span>
    </span>
  ) : null;

  const actions = lead ? (
    <>
      {canEdit && <IconButton icon={Pencil} label="Edit lead" onClick={() => setEditOpen(true)} />}
      {canDelete && <IconButton icon={Trash2} label="Move lead to trash" variant="danger-ghost" onClick={() => setConfirmDelete(true)} />}
    </>
  ) : null;

  return (
    <>
      <Drawer open onClose={guardedClose} title={lead?.name || (loading ? 'Loading lead…' : 'Lead')} subtitle={subtitle} actions={actions}>
        {loading && !lead ? (
          <div className="space-y-4 px-4 py-5 sm:px-5" aria-busy="true">
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
            <Skeleton className="h-10" />
            <Skeleton className="h-48" />
            <Skeleton className="h-24" />
          </div>
        ) : error && !lead ? (
          <div className="px-4 py-5 sm:px-5">
            <ErrorState
              message={notFound ? 'This lead was not found. It may have been moved to trash or assigned to someone else.' : error.message}
              onRetry={notFound || error.status === 400 ? undefined : () => reload()}
            />
          </div>
        ) : lead ? (
          <div className="space-y-5 px-4 py-4 sm:px-5">
            <div className="grid grid-cols-3 gap-2">
              <ContactButton href={telLink(lead.phone)} icon={Phone} label="Call" missing="No phone number saved" />
              <ContactButton href={waLink(whatsappNumber(lead))} icon={MessageCircle} label="WhatsApp" missing="No WhatsApp number saved" external />
              <ContactButton href={lead.email ? `mailto:${lead.email}` : null} icon={Mail} label="Email" missing="No email saved" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Stage">
                <Select value={lead.stage} onChange={(e) => changeStage(e.target.value)} disabled={!canEdit || busy === 'stage'} options={STAGES.map((s) => s.key)} />
              </Field>
              {canAssign ? (
                <Field label="Assigned to">
                  <Select value={lead.assigned_to || ''} onChange={(e) => assign(e.target.value)} disabled={busy === 'assign'} options={assignOptions} />
                </Field>
              ) : (
                <div>
                  <div className="mb-1.5 text-[13px] font-semibold text-ink">Assigned to</div>
                  <div className="flex h-10 items-center gap-2 text-sm text-ink">
                    <Avatar name={lead.agent_name} size={24} />
                    {lead.agent_name}
                  </div>
                </div>
              )}
            </div>

            <ActivityComposer lead={lead} onLogged={onLogged} autoFocus={focusComposer} canChangeStage={canEdit} />

            <div>
              <div role="tablist" aria-label="Lead sections" className="flex gap-1 border-b border-line">
                {TABS.map((t) => {
                  const count = t.key === 'timeline' ? lead.activities?.length : t.key === 'tasks' ? lead.tasks?.filter((x) => x.status !== 'Completed').length : null;
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      id={`${tabsId}-${t.key}`}
                      aria-selected={active}
                      aria-controls={`${tabsId}-${t.key}-panel`}
                      onClick={() => setTab(t.key)}
                      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                        active ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-ink'
                      }`}
                    >
                      {t.label}
                      {count ? <span className="rounded-full bg-subtle px-1.5 text-xs tabular text-muted">{count}</span> : null}
                    </button>
                  );
                })}
              </div>
              <div role="tabpanel" id={`${tabsId}-${tab}-panel`} aria-labelledby={`${tabsId}-${tab}`} className="pt-4">
                {tab === 'timeline' && <Timeline activities={lead.activities || []} />}
                {tab === 'details' && <Details lead={lead} fallbackCurrency={currency} />}
                {tab === 'tasks' && (
                  <Tasks
                    lead={lead}
                    onTasksChange={(fn) => setData((prev) => ({ ...prev, tasks: fn(prev?.tasks || []) }))}
                  />
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      {lead && (
        <LeadFormModal open={editOpen} lead={lead} onClose={() => setEditOpen(false)} onSaved={(updated) => applyUpdate(updated)} />
      )}
      {lead && (
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={remove}
          title="Move to trash?"
          message={`“${lead.name}” will be moved to trash. The owner can restore it.`}
          confirmLabel="Move to trash"
          danger
        />
      )}
    </>
  );
}

/**
 * Lead details panel. Props: leadId, open, onClose, onChanged(lead | null), focusComposer.
 * onChanged(null) means the lead was deleted or is no longer visible to this user.
 */
export default function LeadDrawer({ leadId, open, onClose, onChanged, focusComposer = false }) {
  if (!open || !leadId) return null;
  return <LeadDrawerInner key={leadId} leadId={leadId} onClose={onClose} onChanged={onChanged} focusComposer={focusComposer} />;
}
