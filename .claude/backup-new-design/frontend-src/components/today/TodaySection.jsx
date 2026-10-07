import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const ICON_TONES = {
  danger: 'bg-danger-soft text-danger-ink',
  warning: 'bg-warning-soft text-warning-ink',
  info: 'bg-info-soft text-info-ink',
  primary: 'bg-primary-soft text-primary-ink',
  slate: 'bg-subtle text-muted',
};

/**
 * Card used for every block on the Today page. `id` is the scroll target for the stat cards.
 * Long lists show the first `limit` items with a "Show all" button.
 */
export default function TodaySection({ id, title, description, icon: Icon, tone = 'slate', count, action, items, limit = 6, renderItem, empty, footer }) {
  const headingId = useId();
  const [expanded, setExpanded] = useState(false);
  const list = items || [];
  const visible = expanded ? list : list.slice(0, limit);
  const hidden = list.length - visible.length;

  return (
    <section
      id={id}
      tabIndex={-1}
      aria-labelledby={headingId}
      className="scroll-mt-20 rounded-xl bg-surface shadow-card ring-1 ring-line focus:outline-none"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ICON_TONES[tone]}`}>
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <h2 id={headingId} className="flex items-center gap-2 text-[15px] font-bold text-ink">
              {title}
              {count !== undefined && (
                <span className="rounded-full bg-subtle px-2 py-0.5 text-xs font-semibold tabular text-muted">{count}</span>
              )}
            </h2>
            {description && <p className="text-xs text-muted">{description}</p>}
          </div>
        </div>
        {action}
      </header>

      {list.length === 0 ? (
        <div className="px-4 py-6 sm:px-5">{empty}</div>
      ) : (
        <ul className="divide-y divide-line px-4 sm:px-5">{visible.map(renderItem)}</ul>
      )}

      {(hidden > 0 || (expanded && list.length > limit)) && (
        <div className="border-t border-line px-4 py-2 sm:px-5">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="inline-flex h-8 items-center gap-1.5 rounded-md text-[13px] font-semibold text-primary hover:underline"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
            {expanded ? 'Show less' : `Show all ${list.length}`}
          </button>
        </div>
      )}

      {footer && <div className="border-t border-line px-4 py-2 sm:px-5">{footer}</div>}
    </section>
  );
}

/** One-line friendly empty message inside a section. */
export function SectionEmpty({ icon: Icon, children }) {
  return (
    <p className="flex items-center gap-2 text-[13px] text-muted">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
      {children}
    </p>
  );
}
