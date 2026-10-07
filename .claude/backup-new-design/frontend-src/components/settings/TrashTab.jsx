import { useState } from 'react';
import { ArchiveRestore, RotateCcw, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { useRouter } from '../../lib/router';
import { formatDateTime, formatMoney, timeAgo } from '../../lib/format';
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, Skeleton, StagePill } from '../ui';
import { plural } from '../team/helpers';

function LeadValue({ lead, currency }) {
  if (!lead.value) return <span className="text-faint">—</span>;
  return <span className="font-semibold tabular text-ink">{formatMoney(lead.value, lead.currency || currency)}</span>;
}

function RowActions({ lead, busy, onRestore, onPurge }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button size="sm" icon={ArchiveRestore} onClick={() => onRestore(lead)} loading={busy} aria-label={`Restore ${lead.name}`}>
        Restore
      </Button>
      <Button size="sm" variant="danger-ghost" icon={Trash2} onClick={() => onPurge(lead)} disabled={busy} aria-label={`Delete ${lead.name} forever`}>
        Delete forever
      </Button>
    </div>
  );
}

/** Deleted leads: restore them, or delete them forever. Owner only. */
export default function TrashTab() {
  const { company } = useAuth();
  const toast = useToast();
  const { navigate } = useRouter();
  const { data, error, loading, reload, setData } = useAsync(() => api.trash(), []);
  const [busyId, setBusyId] = useState(null);
  const [purging, setPurging] = useState(null);
  const currency = company?.settings?.currency || 'INR';
  const leads = data || [];

  const restore = async (lead) => {
    setBusyId(lead.id);
    try {
      await api.restoreLead(lead.id);
      setData((rows) => (rows || []).filter((l) => l.id !== lead.id));
      toast.success(`"${lead.name}" is back in your leads`, {
        action: { label: 'Open', onClick: () => navigate(`/app/leads?lead=${lead.id}`) },
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  // ConfirmDialog closes itself after this resolves; failures are reported with a toast
  const purge = async () => {
    const lead = purging;
    if (!lead) return;
    try {
      await api.purgeLead(lead.id);
      setData((rows) => (rows || []).filter((l) => l.id !== lead.id));
      toast.success(`"${lead.name}" was deleted forever`);
    } catch (err) {
      toast.error(err.message);
      if (err.status === 404) reload({ quiet: true });
    }
  };

  if (loading && !data) {
    return (
      <Card className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </Card>
    );
  }
  if (error && !data) return <ErrorState message={error.message} onRetry={() => reload()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-muted">
          Deleted leads stay here until you restore them or delete them forever.
          {leads.length > 0 && <span className="font-semibold text-ink"> {plural(leads.length, 'lead')} in the trash.</span>}
        </p>
        <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => reload()} loading={loading}>
          Refresh
        </Button>
      </div>

      {error && <ErrorState message={error.message} onRetry={() => reload()} />}

      {leads.length === 0 ? (
        <Card>
          <EmptyState icon={Trash2} title="The trash is empty" message="When someone deletes a lead, it comes here first so you can bring it back." />
        </Card>
      ) : (
        <>
          <Card padded={false} className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Deleted leads</caption>
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Lead
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    Value
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Deleted by
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Deleted
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td className="max-w-[280px] px-4 py-3">
                      <div className="truncate font-semibold text-ink" title={lead.name}>
                        {lead.name}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        {lead.stage && <StagePill stage={lead.stage} short />}
                        {lead.country && <span>{lead.country}</span>}
                        {lead.agent_name && <span>· {lead.agent_name}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <LeadValue lead={lead} currency={currency} />
                    </td>
                    <td className="px-3 py-3 text-[13px] text-ink">{lead.deleted_by_name}</td>
                    <td className="px-3 py-3 text-[13px] text-muted" title={formatDateTime(lead.deleted_at)}>
                      {timeAgo(lead.deleted_at)}
                    </td>
                    <td className="px-4 py-3">
                      <RowActions lead={lead} busy={busyId === lead.id} onRestore={restore} onPurge={setPurging} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <ul className="space-y-3 md:hidden" aria-label="Deleted leads">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-ink">{lead.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        {lead.stage && <StagePill stage={lead.stage} short />}
                        {lead.country && <span>{lead.country}</span>}
                      </div>
                    </div>
                    <LeadValue lead={lead} currency={currency} />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Deleted by <span className="font-semibold text-ink">{lead.deleted_by_name}</span> · {formatDateTime(lead.deleted_at)}
                  </p>
                  <div className="mt-3 border-t border-line pt-3">
                    <RowActions lead={lead} busy={busyId === lead.id} onRestore={restore} onPurge={setPurging} />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={Boolean(purging)}
        onClose={() => setPurging(null)}
        onConfirm={purge}
        title="Delete this lead forever?"
        message={purging ? `"${purging.name}" will be deleted for good. You cannot undo this.` : ''}
        confirmLabel="Delete forever"
        danger
      />
    </div>
  );
}
