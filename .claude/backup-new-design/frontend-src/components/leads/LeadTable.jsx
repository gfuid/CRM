import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, MessageSquarePlus } from 'lucide-react';
import { Avatar, Button, StagePill } from '../ui';
import { formatNumber, localToday } from '../../lib/format';
import { Checkbox, FollowUpText, PhoneLinks } from './LeadBits';
import { moneyOrDash, PAGE_SIZE } from './leadUtils';

const isInteractive = (target) => Boolean(target.closest('a, button, input, select, label, textarea'));

function SortHeader({ label, sortKey, sort, onSort, align = 'left', className = '' }) {
  const active = sort.key === sortKey;
  const Icon = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-3 py-2.5 ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 rounded text-xs font-bold uppercase tracking-wide hover:text-ink ${active ? 'text-ink' : 'text-muted'}`}
      >
        {label}
        <Icon className={`h-3.5 w-3.5 ${active ? '' : 'opacity-50'}`} aria-hidden />
      </button>
    </th>
  );
}

const Th = ({ children, className = '' }) => (
  <th scope="col" className={`px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-muted ${className}`}>
    {children}
  </th>
);

function Subline({ lead }) {
  const bits = [lead.country, (lead.products || []).join(', ')].filter(Boolean);
  if (!bits.length) return null;
  return <div className="mt-0.5 truncate text-xs text-muted">{bits.join(' · ')}</div>;
}

function Pager({ page, pageCount, total, onPageChange }) {
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-[13px] text-muted">
      <span className="tabular">
        Showing {formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          <Button size="sm" icon={ChevronLeft} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <span className="tabular">
            Page {page} of {pageCount}
          </span>
          <Button size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} aria-label="Next page">
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Leads as a sortable, paginated table (md and up) or compact cards (phones).
 * `leads` is the full filtered + sorted list; this component slices the current page.
 */
export default function LeadTable({
  leads,
  page,
  onPageChange,
  sort,
  onSort,
  selectable,
  selected,
  onSelect,
  onSelectPage,
  onOpen,
  onLog,
  currency,
}) {
  const today = localToday();
  const pageCount = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pageCount);
  const rows = leads.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const pageIds = rows.map((l) => l.id);
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const allOnPage = rows.length > 0 && selectedOnPage === rows.length;

  return (
    <div className="overflow-hidden rounded-xl bg-surface shadow-card ring-1 ring-line">
      {/* Phones and small tablets: compact cards */}
      <div className="md:hidden">
        {selectable && rows.length > 0 && (
          <label className="flex items-center gap-2.5 border-b border-line px-4 py-2.5 text-[13px] font-semibold text-muted">
            <Checkbox checked={allOnPage} indeterminate={selectedOnPage > 0} onChange={(v) => onSelectPage(pageIds, v)} label="Select all on this page" />
            Select all on this page
          </label>
        )}
        <ul className="divide-y divide-line">
          {rows.map((lead) => (
            <li key={lead.id} className={`px-4 py-3 ${selected.has(lead.id) ? 'bg-primary-soft/40' : ''}`}>
              <div className="flex items-start gap-3">
                {selectable && (
                  <Checkbox
                    className="mt-1"
                    checked={selected.has(lead.id)}
                    onChange={(v) => onSelect(lead.id, v)}
                    label={`Select ${lead.name}`}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => onOpen(lead)} className="min-w-0 text-left">
                      <span className="block truncate text-sm font-bold text-ink">{lead.name}</span>
                      <Subline lead={lead} />
                    </button>
                    <span className="shrink-0 text-sm font-bold tabular text-ink">{moneyOrDash(lead, currency)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <StagePill stage={lead.stage} short />
                    {lead.follow_up_date && <FollowUpText lead={lead} today={today} inline />}
                  </div>
                  {(lead.contact_person || lead.phone) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
                      {lead.contact_person && <span className="truncate">{lead.contact_person}</span>}
                      {(lead.phone || lead.whatsapp) && <PhoneLinks lead={lead} />}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                      <Avatar name={lead.agent_name} size={20} />
                      <span className="truncate">{lead.agent_name}</span>
                    </span>
                    <Button size="sm" variant="ghost" icon={MessageSquarePlus} onClick={() => onLog(lead)}>
                      Log activity
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* md and up: table (scrolls sideways inside the card when narrow) */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead className="border-b border-line bg-subtle/60">
            <tr>
              {selectable && (
                <th scope="col" className="w-10 py-2.5 pl-4 pr-1">
                  <Checkbox checked={allOnPage} indeterminate={selectedOnPage > 0} onChange={(v) => onSelectPage(pageIds, v)} label="Select all leads on this page" />
                </th>
              )}
              <SortHeader label="Company" sortKey="name" sort={sort} onSort={onSort} className={selectable ? '' : 'pl-4'} />
              <Th>Contact</Th>
              <Th>Stage</Th>
              <SortHeader label="Deal value" sortKey="value" sort={sort} onSort={onSort} align="right" />
              <SortHeader label="Next follow-up" sortKey="follow_up" sort={sort} onSort={onSort} />
              <Th>Assigned to</Th>
              <th scope="col" className="w-px px-3 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((lead) => {
              const isSel = selected.has(lead.id);
              return (
                <tr
                  key={lead.id}
                  onClick={(e) => !isInteractive(e.target) && onOpen(lead)}
                  className={`cursor-pointer align-top transition-colors hover:bg-subtle/70 ${isSel ? 'bg-primary-soft/40' : ''}`}
                >
                  {selectable && (
                    <td className="py-3 pl-4 pr-1" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={isSel} onChange={(v) => onSelect(lead.id, v)} label={`Select ${lead.name}`} />
                    </td>
                  )}
                  <td className={`max-w-[280px] px-3 py-3 ${selectable ? '' : 'pl-4'}`}>
                    <button type="button" onClick={() => onOpen(lead)} className="block max-w-full truncate text-left font-bold text-ink hover:text-primary">
                      {lead.name}
                    </button>
                    <Subline lead={lead} />
                  </td>
                  <td className="max-w-[220px] px-3 py-3">
                    <div className="truncate text-[13px] font-medium text-ink">{lead.contact_person || <span className="text-faint">—</span>}</div>
                    {(lead.phone || lead.whatsapp) && (
                      <div className="mt-0.5">
                        <PhoneLinks lead={lead} />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <StagePill stage={lead.stage} short />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular text-ink">{moneyOrDash(lead, currency)}</td>
                  <td className="px-3 py-3">
                    <FollowUpText lead={lead} today={today} />
                  </td>
                  <td className="max-w-[180px] px-3 py-3">
                    <span className="flex items-center gap-2">
                      <Avatar name={lead.agent_name} size={24} />
                      <span className="truncate text-[13px] text-ink">{lead.agent_name}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button size="sm" variant="ghost" icon={MessageSquarePlus} onClick={() => onLog(lead)}>
                      Log activity
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pager page={current} pageCount={pageCount} total={leads.length} onPageChange={onPageChange} />
    </div>
  );
}
