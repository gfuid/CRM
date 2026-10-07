import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRightLeft, Check } from 'lucide-react';
import { STAGES } from '../../lib/constants';
import { formatNumber, localToday } from '../../lib/format';
import { Avatar, MenuItem, PriorityBadge, StagePill } from '../ui';
import { FollowUpChip } from './LeadBits';
import { BOARD_COLUMN_LIMIT, hasValue, moneyOrDash, sumByCurrency } from './leadUtils';

const MENU_GAP = 6;
const VIEWPORT_MARGIN = 8;

/**
 * Stage picker for a board card. The board scrolls sideways (which also clips it vertically), so the menu is
 * rendered in a portal with fixed positioning, and opens upward when there is more room above the button.
 */
function StageMenu({ lead, onMove }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  const close = (refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  // Place the menu next to the button before the browser paints it
  useLayoutEffect(() => {
    if (!open) return;
    const t = triggerRef.current?.getBoundingClientRect();
    const m = menuRef.current;
    if (!t || !m) return;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const roomBelow = vh - t.bottom - MENU_GAP - VIEWPORT_MARGIN;
    const roomAbove = t.top - MENU_GAP - VIEWPORT_MARGIN;
    const height = m.scrollHeight;
    const below = height <= roomBelow || roomBelow >= roomAbove;
    const maxHeight = Math.max(120, below ? roomBelow : roomAbove);
    const shown = Math.min(height, maxHeight);
    const left = Math.min(Math.max(VIEWPORT_MARGIN, t.right - m.offsetWidth), vw - m.offsetWidth - VIEWPORT_MARGIN);
    m.style.maxHeight = `${maxHeight}px`;
    m.style.top = `${below ? t.bottom + MENU_GAP : Math.max(VIEWPORT_MARGIN, t.top - MENU_GAP - shown)}px`;
    m.style.left = `${Math.max(VIEWPORT_MARGIN, left)}px`;
    m.style.visibility = 'visible';
    (m.querySelector('[aria-current="true"]') || m.querySelector('[role="menuitem"]'))?.focus();
  }, [open]);

  // Close on outside press, scroll (the button would move away from the menu) and resize
  useEffect(() => {
    if (!open) return undefined;
    const inside = (target) => menuRef.current?.contains(target) || triggerRef.current?.contains(target);
    const onDown = (e) => !inside(e.target) && setOpen(false);
    const onScroll = (e) => !menuRef.current?.contains(e.target) && setOpen(false);
    const onResize = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const onMenuKeyDown = (e) => {
    const items = [...(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === 'Tab') {
      close();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      items[(i + step + items.length) % items.length]?.focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      items[e.key === 'Home' ? 0 : items.length - 1]?.focus();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Move ${lead.name} to another stage`}
        title="Move to stage"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-subtle hover:text-ink"
      >
        <ArrowRightLeft className="h-4 w-4" aria-hidden />
      </button>
      {open &&
        createPortal(
          // Clicks inside the portal still bubble through React to the card, so stop them here
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={`Move ${lead.name} to stage`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onMenuKeyDown}
            className="invisible fixed left-0 top-0 z-50 min-w-[200px] overflow-y-auto overscroll-contain rounded-xl bg-surface p-1.5 shadow-pop ring-1 ring-line animate-pop-in"
          >
            <div className="px-2.5 pb-1 pt-1.5 text-xs font-bold uppercase tracking-wide text-muted" aria-hidden>
              Move to stage
            </div>
            {STAGES.map((s) => (
              <MenuItem
                key={s.key}
                onClick={() => {
                  close();
                  if (s.key !== lead.stage) onMove(lead, s.key);
                }}
                aria-current={s.key === lead.stage ? 'true' : undefined}
              >
                <span className="flex-1">{s.key}</span>
                {s.key === lead.stage && <Check className="h-4 w-4 text-primary" aria-hidden />}
              </MenuItem>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

function BoardCard({ lead, canEdit, onMove, onOpen, currency, today, dragging, onDragStart, onDragEnd }) {
  return (
    <div
      draggable={canEdit}
      onDragStart={(e) => {
        if (!e.currentTarget.contains(e.target)) return;
        e.dataTransfer.setData('text/plain', lead.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(lead.id);
      }}
      onDragEnd={onDragEnd}
      // Only clicks on the card itself open the lead: not its buttons, and not the stage menu (a portal outside the card)
      onClick={(e) => e.currentTarget.contains(e.target) && !e.target.closest('button, a, [role="menu"]') && onOpen(lead)}
      className={`group cursor-pointer rounded-lg bg-surface p-3 shadow-card ring-1 ring-line transition hover:ring-primary/40 ${
        canEdit ? 'active:cursor-grabbing' : ''
      } ${dragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-1">
        <button type="button" onClick={() => onOpen(lead)} className="min-w-0 flex-1 text-left">
          <span className="line-clamp-2 text-[13px] font-bold leading-snug text-ink group-hover:text-primary">{lead.name}</span>
          {(lead.country || lead.contact_person) && (
            <span className="mt-0.5 block truncate text-xs text-muted">{[lead.contact_person, lead.country].filter(Boolean).join(' · ')}</span>
          )}
        </button>
        {canEdit && <StageMenu lead={lead} onMove={onMove} />}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={`text-[13px] font-bold tabular ${hasValue(lead.value) ? 'text-ink' : 'text-faint'}`}>{moneyOrDash(lead, currency)}</span>
        <span className="flex items-center gap-1.5">
          {(lead.priority === 'High' || lead.priority === 'Urgent') && <PriorityBadge priority={lead.priority} />}
          <FollowUpChip lead={lead} today={today} />
          <span title={`Assigned to ${lead.agent_name}`}>
            <Avatar name={lead.agent_name} size={22} />
          </span>
        </span>
      </div>
    </div>
  );
}

/** Kanban board: one column per stage, drag a card to move it (or use the card's stage menu). */
export default function LeadBoard({ leads, canEdit, onMove, onOpen, currency }) {
  const today = localToday();
  const [draggingId, setDraggingId] = useState(null);
  const [overStage, setOverStage] = useState(null);
  const [limits, setLimits] = useState({});

  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((s) => [s.key, []]));
    for (const l of leads) (map[l.stage] || map[STAGES[0].key]).push(l);
    return map;
  }, [leads]);

  const drop = (e, stage) => {
    e.preventDefault();
    setOverStage(null);
    const id = e.dataTransfer.getData('text/plain') || draggingId;
    setDraggingId(null);
    const lead = leads.find((l) => l.id === id);
    if (lead && lead.stage !== stage) onMove(lead, stage);
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
      {canEdit && <p className="mb-2 hidden text-xs text-muted md:block">Drag a card to another column to change its stage.</p>}
      <div className="flex min-w-max items-stretch gap-3">
        {STAGES.map((s) => {
          const items = byStage[s.key];
          const limit = limits[s.key] || BOARD_COLUMN_LIMIT;
          const total = sumByCurrency(items, currency);
          const isOver = overStage === s.key && draggingId && leads.find((l) => l.id === draggingId)?.stage !== s.key;
          return (
            <section
              key={s.key}
              aria-label={`${s.key}: ${items.length} leads`}
              onDragOver={(e) => {
                if (!draggingId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (overStage !== s.key) setOverStage(s.key);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setOverStage((o) => (o === s.key ? null : o));
              }}
              onDrop={(e) => drop(e, s.key)}
              className={`flex w-[17rem] shrink-0 flex-col rounded-xl bg-subtle/70 ring-1 ring-inset transition-colors ${
                isOver ? 'bg-primary-soft/60 ring-2 ring-primary/50' : 'ring-line'
              }`}
            >
              <header className="px-3 pb-2 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="min-w-0 truncate">
                    <StagePill stage={s.key} />
                  </h3>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-bold tabular text-muted ring-1 ring-inset ring-line">
                    {formatNumber(items.length)}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs tabular text-muted" title={total || undefined}>
                  {total || 'No value yet'}
                </div>
              </header>
              <div className="flex min-h-[120px] flex-1 flex-col gap-2 px-2 pb-2">
                {items.slice(0, limit).map((lead) => (
                  <BoardCard
                    key={lead.id}
                    lead={lead}
                    canEdit={canEdit}
                    onMove={onMove}
                    onOpen={onOpen}
                    currency={currency}
                    today={today}
                    dragging={draggingId === lead.id}
                    onDragStart={setDraggingId}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setOverStage(null);
                    }}
                  />
                ))}
                {items.length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-line px-3 py-6 text-center text-xs text-faint">
                    {canEdit ? 'Drop a lead here' : 'No leads'}
                  </div>
                )}
                {items.length > limit && (
                  <button
                    type="button"
                    onClick={() => setLimits((m) => ({ ...m, [s.key]: limit + BOARD_COLUMN_LIMIT }))}
                    className="rounded-lg px-3 py-2 text-[13px] font-semibold text-primary hover:bg-surface"
                  >
                    Show more ({formatNumber(items.length - limit)} hidden)
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
