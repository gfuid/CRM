import { EllipsisVertical, KeyRound, Loader2, Mail, Pencil, Phone, UserCheck, UserX } from 'lucide-react';
import { ROLE_LABEL } from '../../lib/constants';
import { formatNumber, timeAgo } from '../../lib/format';
import { Avatar, Badge, Card, IconButton, Menu, MenuItem } from '../ui';

const lastLogin = (m) => (m.last_login ? timeAgo(m.last_login) : 'Never');

function StatusBadge({ member }) {
  return member.is_active ? (
    <Badge tone="green" dot>
      Active
    </Badge>
  ) : (
    <Badge tone="slate" dot>
      Deactivated
    </Badge>
  );
}

function RoleBadge({ role }) {
  const tone = role === 'owner' ? 'violet' : role === 'manager' ? 'info' : 'slate';
  return <Badge tone={tone}>{ROLE_LABEL[role] || 'Employee'}</Badge>;
}

/** Row actions. The owner account has none (it is managed from the profile menu). */
function MemberActions({ member, busy, onAction }) {
  if (member.role === 'owner') return <span className="sr-only">The owner account cannot be changed here</span>;
  if (busy) {
    return (
      <span className="inline-flex h-10 w-10 items-center justify-center text-muted" role="status" aria-label={`Updating ${member.name}`}>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      </span>
    );
  }
  return (
    <Menu
      trigger={({ toggle, open }) => (
        <IconButton icon={EllipsisVertical} label={`Actions for ${member.name}`} onClick={toggle} aria-haspopup="menu" aria-expanded={open} />
      )}
    >
      <MenuItem icon={Pencil} onClick={() => onAction('edit', member)}>
        Edit details and permissions
      </MenuItem>
      <MenuItem icon={KeyRound} onClick={() => onAction('password', member)}>
        Reset password
      </MenuItem>
      {member.is_active ? (
        <MenuItem icon={UserX} danger onClick={() => onAction('deactivate', member)}>
          Deactivate
        </MenuItem>
      ) : (
        <MenuItem icon={UserCheck} onClick={() => onAction('activate', member)}>
          Reactivate
        </MenuItem>
      )}
    </Menu>
  );
}

/** Name: a button that opens Edit for employees, plain text for the owner. */
function MemberName({ member, isYou, onAction }) {
  const label = (
    <>
      {member.name}
      {isYou && <span className="font-normal text-muted"> (you)</span>}
    </>
  );
  if (member.role === 'owner') return <span className="block truncate font-semibold text-ink">{label}</span>;
  return (
    <button
      type="button"
      onClick={() => onAction('edit', member)}
      aria-label={`Edit ${member.name}`}
      title={`Edit ${member.name}`}
      className="block max-w-full truncate text-left font-semibold text-ink hover:text-primary hover:underline focus-visible:rounded"
    >
      {label}
    </button>
  );
}

/** Desktop: table. Phones and tablets: cards. */
export default function MemberList({ members, currentUserId, busyId, onAction }) {
  return (
    <>
      <Card padded={false} className="hidden lg:block">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">Team members</caption>
          <thead>
            <tr className="border-b border-line text-xs font-semibold text-muted">
              <th scope="col" className="w-[34%] px-4 py-3 font-semibold">
                Employee
              </th>
              <th scope="col" className="w-[20%] px-3 py-3 font-semibold">
                Role
              </th>
              <th scope="col" className="w-[14%] px-3 py-3 font-semibold">
                Status
              </th>
              <th scope="col" className="w-[11%] px-3 py-3 text-right font-semibold">
                Open leads
              </th>
              <th scope="col" className="w-[14%] px-3 py-3 font-semibold">
                Last sign-in
              </th>
              <th scope="col" className="w-[7%] px-2 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {members.map((m) => (
              <tr key={m.id} className={m.is_active ? '' : 'bg-subtle/50'}>
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={m.name} size={36} className={m.is_active ? '' : 'opacity-60'} />
                    <div className="min-w-0">
                      <MemberName member={m} isYou={m.id === currentUserId} onAction={onAction} />
                      <div className="truncate text-[13px] text-muted" title={m.email}>
                        {m.email}
                      </div>
                      {m.phone && <div className="truncate text-xs text-muted">{m.phone}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <RoleBadge role={m.role} />
                  {m.designation && (
                    <div className="mt-1 truncate text-xs text-muted" title={m.designation}>
                      {m.designation}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge member={m} />
                </td>
                <td className="px-3 py-3 text-right font-semibold tabular text-ink">{formatNumber(m.open_leads)}</td>
                <td className="px-3 py-3 text-[13px] text-muted">{lastLogin(m)}</td>
                <td className="px-2 py-2 text-right">
                  <MemberActions member={m} busy={busyId === m.id} onAction={onAction} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ul className="grid gap-3 sm:grid-cols-2 lg:hidden" aria-label="Team members">
        {members.map((m) => (
          <li key={m.id}>
            <Card className="h-full">
              <div className="flex items-start gap-3">
                <Avatar name={m.name} size={40} className={m.is_active ? '' : 'opacity-60'} />
                <div className="min-w-0 flex-1">
                  <MemberName member={m} isYou={m.id === currentUserId} onAction={onAction} />
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <RoleBadge role={m.role} />
                    <StatusBadge member={m} />
                  </div>
                  {m.designation && <div className="mt-1 truncate text-xs text-muted">{m.designation}</div>}
                </div>
                <div className="-mr-2 -mt-2 shrink-0">
                  <MemberActions member={m} busy={busyId === m.id} onAction={onAction} />
                </div>
              </div>
              <div className="mt-3 space-y-1 text-[13px] text-muted">
                <div className="flex min-w-0 items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
                  <span className="sr-only">Email:</span>
                  <span className="truncate">{m.email}</span>
                </div>
                {m.phone && (
                  <div className="flex min-w-0 items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
                    <span className="sr-only">Phone:</span>
                    <span className="truncate">{m.phone}</span>
                  </div>
                )}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs">
                <div>
                  <dt className="text-muted">Open leads</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular text-ink">{formatNumber(m.open_leads)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Last sign-in</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-ink">{lastLogin(m)}</dd>
                </div>
              </dl>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
