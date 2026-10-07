import { ACTIVITY_LABEL } from '../../lib/constants';
import { formatTime } from '../../lib/format';
import { useRouter } from '../../lib/router';

/** Time-ordered list of activity entries: time, what happened, which lead, and the note. */
export default function EntryList({ entries, labels, emptyText = 'Nothing to show.' }) {
  const { navigate } = useRouter();
  const list = [...(entries || [])].sort((a, b) => (b.time || '').localeCompare(a.time || ''));

  if (!list.length) return <p className="px-1 py-2 text-[13px] text-muted">{emptyText}</p>;

  return (
    <ol className="divide-y divide-line">
      {list.map((e) => (
        <li key={e.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 py-2.5 sm:grid-cols-[5rem_10rem_minmax(0,1fr)]">
          <span className="text-xs text-muted tabular">{formatTime(e.time)}</span>
          <span className="text-[13px] font-semibold text-ink">{labels?.[e.type] || ACTIVITY_LABEL[e.type] || e.title || e.type}</span>
          <div className="col-start-2 min-w-0 sm:col-start-3">
            {e.lead_id ? (
              <button
                type="button"
                onClick={() => navigate(`/app/leads?lead=${encodeURIComponent(e.lead_id)}`)}
                className="max-w-full truncate text-left text-[13px] font-semibold text-primary-ink hover:underline"
              >
                {e.lead_name || 'Open lead'}
              </button>
            ) : (
              e.lead_name && <span className="text-[13px] text-ink">{e.lead_name}</span>
            )}
            {e.note && <p className="mt-0.5 whitespace-pre-line break-words text-[13px] text-muted">{e.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
