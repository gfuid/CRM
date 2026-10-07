import {
  ArrowRightLeft,
  BadgeIndianRupee,
  CalendarClock,
  FileText,
  FlaskConical,
  Handshake,
  Mail,
  MailOpen,
  MessageCircle,
  Package,
  Pencil,
  Phone,
  Reply,
  RotateCcw,
  StickyNote,
  Trash2,
  UserPlus,
  UserRoundCog,
  Users,
  Wallet,
  Activity,
} from 'lucide-react';
import { ACTIVITY_LABEL } from '../../lib/constants';
import { formatDateTime, timeAgo } from '../../lib/format';

const ICONS = {
  call_initiated: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  meeting: Users,
  response: Reply,
  email_reply: MailOpen,
  price_discussion: BadgeIndianRupee,
  payment_discussion: Wallet,
  sample_discussion: FlaskConical,
  sample_sent: Package,
  sent_quotations: FileText,
  negotiation: Handshake,
  note: StickyNote,
  new_lead: UserPlus,
  stage_change: ArrowRightLeft,
  reassign: UserRoundCog,
  follow_up: CalendarClock,
  lead_updated: Pencil,
  lead_deleted: Trash2,
  lead_restored: RotateCcw,
};

/** One entry in the recent activity feed. The lead name opens the lead in place. */
export default function ActivityItem({ item, currentUserId, onOpenLead }) {
  const Icon = ICONS[item.type] || Activity;
  const who = item.user_id === currentUserId ? 'You' : item.user_name;
  const canOpen = item.lead_id && item.lead_name && item.type !== 'lead_deleted';

  return (
    <li className="flex gap-3 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-subtle text-muted">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-ink">
          <span className="font-semibold">{item.title || ACTIVITY_LABEL[item.type] || 'Update'}</span>
          {item.lead_name && (
            <>
              {' · '}
              {canOpen ? (
                <button type="button" onClick={() => onOpenLead(item.lead_id)} className="font-semibold text-primary hover:underline">
                  {item.lead_name}
                </button>
              ) : (
                <span className="text-muted">{item.lead_name}</span>
              )}
            </>
          )}
        </p>
        {item.note && <p className="mt-0.5 line-clamp-2 break-words text-[13px] text-muted">{item.note}</p>}
        <p className="mt-0.5 text-xs text-muted">
          {who} · <time dateTime={item.timestamp} title={formatDateTime(item.timestamp)}>{timeAgo(item.timestamp)}</time>
        </p>
      </div>
    </li>
  );
}
