import { MessageCircle, NotebookPen, Phone } from 'lucide-react';
import { Avatar, Badge, StagePill } from '../ui';
import { formatDate, relativeDay } from '../../lib/format';
import { plural, telHref, whatsappHref } from './contact';

const actionClass =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold ring-1 ring-inset transition-colors';

function DueBadge({ lead, kind }) {
  if (kind === 'overdue') {
    const days = Math.max(1, lead.days_overdue || 0);
    return <Badge tone="red">{plural(days, 'day')} overdue</Badge>;
  }
  if (kind === 'today') return <Badge tone="amber">Due today</Badge>;
  return (
    <Badge tone="slate">
      {relativeDay(lead.follow_up_date)} · {formatDate(lead.follow_up_date, { year: false })}
    </Badge>
  );
}

/**
 * One lead in a follow-up list. The name area opens the lead; Call / WhatsApp / Log are
 * separate buttons so each is reachable by keyboard.
 */
export default function FollowUpRow({ lead, kind, showAssignee, onOpen, onLog }) {
  const tel = telHref(lead.phone);
  const wa = whatsappHref(lead);
  const urgent = lead.priority === 'High' || lead.priority === 'Urgent';

  return (
    <li className="flex flex-col gap-2.5 py-3 md:flex-row md:items-center md:gap-4">
      <button
        type="button"
        onClick={() => onOpen(lead.id)}
        className="group -mx-1.5 flex min-w-0 flex-1 items-start gap-3 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-subtle"
      >
        <Avatar name={lead.name} size={36} className="mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-semibold text-ink group-hover:text-primary">{lead.name}</span>
            <DueBadge lead={lead} kind={kind} />
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            {lead.contact_person && <span className="truncate">{lead.contact_person}</span>}
            {lead.phone && <span className="tabular">{lead.phone}</span>}
            {!lead.contact_person && !lead.phone && lead.email && <span className="truncate">{lead.email}</span>}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StagePill stage={lead.stage} short />
            {urgent && <Badge tone={lead.priority === 'Urgent' ? 'red' : 'amber'}>{lead.priority} priority</Badge>}
            {showAssignee && <span className="text-xs text-muted">Assigned to {lead.agent_name}</span>}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 flex-wrap items-center gap-2 pl-[54px] md:pl-0">
        {tel && (
          <a href={tel} className={`${actionClass} bg-surface text-ink ring-line hover:bg-subtle`} aria-label={`Call ${lead.name}`}>
            <Phone className="h-4 w-4" aria-hidden />
            Call
          </a>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className={`${actionClass} bg-surface text-ink ring-line hover:bg-subtle`}
            aria-label={`WhatsApp ${lead.name} (opens in a new tab)`}
          >
            <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
            WhatsApp
          </a>
        )}
        <button
          type="button"
          onClick={() => onLog(lead.id)}
          className={`${actionClass} bg-primary-soft text-primary-ink ring-primary/20 hover:bg-primary hover:text-white`}
          aria-label={`Log a call, message or note for ${lead.name}`}
        >
          <NotebookPen className="h-4 w-4" aria-hidden />
          Log
        </button>
      </div>
    </li>
  );
}
