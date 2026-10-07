import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Columns3, Download, FilterX, LayoutList, Plus, Trash2, Upload, UserRound, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { isClosed, STAGES } from '../lib/constants';
import { downloadBlob, formatNumber, localToday } from '../lib/format';
import { useAsync, useDebounced } from '../lib/hooks';
import { useRouter } from '../lib/router';
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Menu, MenuItem, PageHeader, SearchInput, Segmented, Select, Skeleton } from '../components/ui';
import LeadTable from '../components/leads/LeadTable';
import LeadBoard from '../components/leads/LeadBoard';
import LeadDrawer from '../components/leads/LeadDrawer';
import LeadFormModal from '../components/leads/LeadFormModal';
import ImportLeadsModal from '../components/leads/ImportLeadsModal';
import { followUpBucket, listLead, matchesSearch, sortLeads, useTeamMembers } from '../components/leads/leadUtils';

const FU_CHIPS = [
  { value: '', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'none', label: 'No follow-up date', title: 'Open leads without a next follow-up date' },
];
const DEFAULT_SORT = { key: 'created_at', dir: 'desc' };
const FIRST_DIR = { name: 'asc', value: 'desc', follow_up: 'asc' };
const VIEW_OPTIONS = [
  { value: 'table', label: 'Table', icon: LayoutList },
  { value: 'board', label: 'Board', icon: Columns3 },
];

function LeadsSkeleton({ view }) {
  if (view === 'board') {
    return (
      <div className="flex gap-3 overflow-hidden" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-80 w-[17rem] shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-xl bg-surface p-4 shadow-card ring-1 ring-line" aria-busy="true">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  );
}

function BulkBar({ count, bulk, stageAllowed, assignAllowed, deleteAllowed, members, onStage, onAssign, onDelete, onClear }) {
  return (
    <div className="sticky top-16 z-10 mb-3 rounded-xl bg-surface px-3 py-2 shadow-pop ring-1 ring-primary/30" role="region" aria-label="Bulk actions">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-ink">{formatNumber(count)} selected</span>
        <Button size="sm" variant="ghost" icon={X} onClick={onClear} disabled={Boolean(bulk)}>
          Clear
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {stageAllowed && (
            <Menu
              trigger={({ toggle, open }) => (
                <Button size="sm" icon={ArrowRightLeft} onClick={toggle} aria-haspopup="menu" aria-expanded={open} disabled={Boolean(bulk)}>
                  Change stage
                </Button>
              )}
            >
              {STAGES.map((s) => (
                <MenuItem key={s.key} onClick={() => onStage(s.key)}>
                  {s.key}
                </MenuItem>
              ))}
            </Menu>
          )}
          {assignAllowed && (
            <Menu
              trigger={({ toggle, open }) => (
                <Button size="sm" icon={UserRound} onClick={toggle} aria-haspopup="menu" aria-expanded={open} disabled={Boolean(bulk) || members.length === 0}>
                  Assign to
                </Button>
              )}
            >
              <div className="max-h-64 overflow-y-auto">
                {members.map((m) => (
                  <MenuItem key={m.id} onClick={() => onAssign(m)}>
                    {m.name}
                  </MenuItem>
                ))}
              </div>
            </Menu>
          )}
          {deleteAllowed && (
            <Button size="sm" variant="danger-ghost" icon={Trash2} onClick={onDelete} disabled={Boolean(bulk)}>
              Delete
            </Button>
          )}
        </div>
      </div>
      {bulk && (
        <div className="mt-2" aria-live="polite">
          <div className="mb-1 flex justify-between text-xs font-semibold text-muted">
            <span>{bulk.label}…</span>
            <span className="tabular">
              {formatNumber(bulk.done)} of {formatNumber(bulk.total)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-valuemin={0} aria-valuemax={bulk.total} aria-valuenow={bulk.done}>
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(bulk.done / Math.max(1, bulk.total)) * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeadsPage() {
  const { user, company, can, perms } = useAuth();
  const toast = useToast();
  const { query, navigate } = useRouter();
  const members = useTeamMembers();
  const { data: leads, error, loading, reload, setData } = useAsync(() => api.leads(), []);

  const currency = company?.settings?.currency || 'INR';
  const commodities = company?.settings?.commodities || [];
  const scopeAll = perms.leads_scope === 'all';
  const canCreate = can('leads_create');
  const canEdit = can('leads_edit');
  // Reassigning goes through PATCH /leads/:id, which also needs the edit permission
  const canAssign = canEdit && can('leads_reassign');
  const canDelete = can('leads_delete');

  // ── URL state ─────────────────────────────────────────────
  const q = query.get('q') || '';
  const stage = query.get('stage') || '';
  const owner = scopeAll ? query.get('owner') || '' : '';
  const product = query.get('product') || '';
  const fu = FU_CHIPS.some((c) => c.value === query.get('fu')) ? query.get('fu') : '';
  const view = query.get('view') === 'board' ? 'board' : 'table';
  const showNew = query.get('new') === '1';
  const openLeadId = query.get('lead') || '';

  const setQuery = useCallback(
    (updates) => {
      const params = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === undefined || v === '') params.delete(k);
        else params.set(k, v);
      }
      const s = params.toString();
      const y = window.scrollY;
      navigate(`${window.location.pathname}${s ? `?${s}` : ''}`, { replace: true });
      // The router scrolls to the top on every navigation; changing a filter or opening a lead shouldn't.
      window.scrollTo(0, y);
    },
    [navigate]
  );

  const [search, setSearch] = useState(q);
  // The page stays mounted when a link (sidebar "Leads", "New lead") changes the URL, so follow ?q from outside
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    if (q !== search.trim()) setSearch(q);
  }
  const debouncedSearch = useDebounced(search, 250);
  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next !== (new URLSearchParams(window.location.search).get('q') || '')) setQuery({ q: next });
  }, [debouncedSearch, setQuery]);

  useEffect(() => {
    if (showNew && !canCreate && user) {
      toast.error('You don’t have permission to add leads.');
      setQuery({ new: null });
    }
  }, [showNew, canCreate, user, toast, setQuery]);

  const hasFilters = Boolean(q || stage || owner || product || fu);
  const clearFilters = () => {
    setSearch('');
    setQuery({ q: null, stage: null, owner: null, product: null, fu: null });
  };

  // ── Filtering & sorting (all client-side) ─────────────────
  const today = localToday();
  const [sort, setSort] = useState(DEFAULT_SORT);
  const onSort = (key) =>
    setSort((s) => {
      if (s.key !== key) return { key, dir: FIRST_DIR[key] };
      if (s.dir === FIRST_DIR[key]) return { key, dir: s.dir === 'asc' ? 'desc' : 'asc' };
      return DEFAULT_SORT;
    });

  const base = useMemo(() => {
    if (!leads) return [];
    const needle = q.toLowerCase();
    const prod = product.toLowerCase();
    return leads.filter((l) => {
      if (stage === 'open' ? isClosed(l.stage) : stage && l.stage !== stage) return false;
      if (owner && l.assigned_to !== owner) return false;
      if (prod && !(l.products || []).some((p) => p.toLowerCase() === prod)) return false;
      if (needle && !matchesSearch(l, needle)) return false;
      return true;
    });
  }, [leads, q, stage, owner, product]);

  const fuCounts = useMemo(() => {
    const c = { '': base.length, overdue: 0, today: 0, none: 0 };
    for (const l of base) {
      const b = followUpBucket(l, today);
      if (b in c) c[b] += 1;
    }
    return c;
  }, [base, today]);

  const filtered = useMemo(() => (fu ? base.filter((l) => followUpBucket(l, today) === fu) : base), [base, fu, today]);
  const sorted = useMemo(() => sortLeads(filtered, sort), [filtered, sort]);

  // ── Pagination & selection (reset whenever the filters change) ─
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const filterKey = [q, stage, owner, product, fu, sort.key, sort.dir, view].join('|');
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
    setSelected(new Set());
  }
  const selectedIds = useMemo(() => sorted.filter((l) => selected.has(l.id)).map((l) => l.id), [sorted, selected]);
  const selectable = view === 'table' && (canEdit || canDelete);

  const onSelect = (id, on) =>
    setSelected((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  const onSelectPage = (ids, on) =>
    setSelected((s) => {
      const n = new Set(s);
      for (const id of ids) {
        if (on) n.add(id);
        else n.delete(id);
      }
      return n;
    });

  // ── Local list updates (no full reload) ────────────────────
  const isVisibleToMe = (lead) => scopeAll || lead.assigned_to === user?.id;
  const patchLocal = (lead) => setData((list) => list && list.map((l) => (l.id === lead.id ? { ...l, ...listLead(lead) } : l)));
  const removeLocal = (id) => setData((list) => list && list.filter((l) => l.id !== id));

  const onCreated = (lead) => {
    if (isVisibleToMe(lead)) setData((list) => list && [listLead(lead), ...list.filter((l) => l.id !== lead.id)]);
  };

  const onDrawerChanged = (lead) => {
    if (!lead) removeLocal(openLeadId);
    else if (!isVisibleToMe(lead)) removeLocal(lead.id);
    else patchLocal(lead);
  };

  // ── Drawer / form / import ─────────────────────────────────
  const [focusComposer, setFocusComposer] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const openLead = (lead) => {
    setFocusComposer(false);
    setQuery({ lead: lead.id });
  };
  const logActivity = (lead) => {
    setFocusComposer(true);
    setQuery({ lead: lead.id });
  };
  const closeDrawer = () => {
    setFocusComposer(false);
    setQuery({ lead: null });
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await api.exportLeads();
      downloadBlob(blob, `leads-${localToday()}.csv`);
      toast.success('Your leads were downloaded as a CSV file');
    } catch (err) {
      toast.error(`Couldn’t export leads. ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // ── Board moves (optimistic) ───────────────────────────────
  const moveStage = async (lead, nextStage) => {
    const prevStage = lead.stage;
    setData((list) => list && list.map((l) => (l.id === lead.id ? { ...l, stage: nextStage } : l)));
    try {
      const updated = await api.updateLead(lead.id, { stage: nextStage });
      patchLocal(updated);
      toast.success(`Moved “${lead.name}” to ${nextStage}`);
    } catch (err) {
      setData((list) => list && list.map((l) => (l.id === lead.id ? { ...l, stage: prevStage } : l)));
      toast.error(`Couldn’t move “${lead.name}”. ${err.message}`);
    }
  };

  // ── Bulk actions (one request at a time, with progress) ────
  const [bulk, setBulk] = useState(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const activeMembers = useMemo(() => members.filter((m) => m.is_active !== false), [members]);

  const runBulk = async (label, summary, ids, action) => {
    if (!ids.length) return;
    const byId = new Map((leads || []).map((l) => [l.id, l]));
    setBulk({ label, done: 0, total: ids.length });
    let ok = 0;
    let failed = 0;
    let firstError = '';
    for (const id of ids) {
      try {
        await action(id, byId.get(id));
        ok += 1;
      } catch (err) {
        failed += 1;
        if (!firstError) firstError = err.message;
      }
      setBulk((b) => (b ? { ...b, done: b.done + 1 } : b));
    }
    setBulk(null);
    setSelected(new Set());
    if (failed) toast.error(`${summary(ok, failed)}. ${firstError}`);
    else toast.success(summary(ok, failed));
  };

  const updated = (ok, failed) => `Updated ${formatNumber(ok)}, failed ${formatNumber(failed)}`;

  const bulkStage = (stageKey) =>
    runBulk(`Moving to ${stageKey}`, updated, selectedIds, async (id, lead) => {
      if (lead?.stage === stageKey) return;
      patchLocal(await api.updateLead(id, { stage: stageKey }));
    });

  const bulkAssign = (member) =>
    runBulk(`Assigning to ${member.name}`, updated, selectedIds, async (id, lead) => {
      if (lead?.assigned_to === member.id) return;
      const res = await api.updateLead(id, { assigned_to: member.id });
      if (isVisibleToMe(res)) patchLocal(res);
      else removeLocal(id);
    });

  const bulkDelete = () =>
    runBulk('Moving to trash', (ok, failed) => `Moved ${formatNumber(ok)} to trash, failed ${formatNumber(failed)}`, selectedIds, async (id) => {
      await api.deleteLead(id);
      removeLocal(id);
    });

  // ── Render ─────────────────────────────────────────────────
  const noLeadsAtAll = leads && leads.length === 0;
  const memberOptions = useMemo(() => {
    const others = members.filter((m) => m.id !== user?.id);
    const opts = others.map((m) => ({ value: m.id, label: `${m.name}${m.is_active === false ? ' (inactive)' : ''}` }));
    if (owner && owner !== user?.id && !others.some((m) => m.id === owner)) opts.push({ value: owner, label: 'Selected member' });
    return opts;
  }, [members, user?.id, owner]);
  const productOptions = product && !commodities.some((c) => c.toLowerCase() === product.toLowerCase()) ? [...commodities, product] : commodities;

  return (
    <div>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2.5">
            Leads
            {leads && (
              <span className="rounded-full bg-subtle px-2.5 py-0.5 text-sm font-bold tabular text-muted ring-1 ring-inset ring-line">
                {formatNumber(leads.length)}
              </span>
            )}
          </span>
        }
        description={scopeAll ? 'Every buyer your company is talking to, from first contact to closed deal.' : 'You see the leads assigned to you.'}
        actions={
          <>
            {can('leads_import') && (
              <Button icon={Upload} onClick={() => setImportOpen(true)}>
                Import
              </Button>
            )}
            {can('leads_export') && (
              <Button icon={Download} onClick={exportCsv} loading={exporting} disabled={!leads?.length} title="Download all your leads as a CSV file">
                Export
              </Button>
            )}
            {canCreate && (
              <Button variant="primary" icon={Plus} onClick={() => setQuery({ new: '1' })}>
                New lead
              </Button>
            )}
          </>
        }
      />

      {!noLeadsAtAll && (
        <div className="mb-4 space-y-3">
          <div className="grid grid-cols-2 items-end gap-3 lg:flex lg:flex-wrap">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search name, contact, phone, email, country, product"
              className="col-span-2 lg:min-w-[280px] lg:flex-1"
            />
            <Field label="Stage" className="lg:w-52">
              <Select value={stage} onChange={(e) => setQuery({ stage: e.target.value })}>
                <option value="">All stages</option>
                <option value="open">All open (not closed)</option>
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.key}
                  </option>
                ))}
              </Select>
            </Field>
            {scopeAll && (
              <Field label="Assigned to" className="lg:w-48">
                <Select value={owner} onChange={(e) => setQuery({ owner: e.target.value })}>
                  <option value="">Everyone</option>
                  {user && <option value={user.id}>Me</option>}
                  {memberOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {productOptions.length > 0 && (
              <Field label="Product" className="lg:w-48">
                <Select value={product} onChange={(e) => setQuery({ product: e.target.value })}>
                  <option value="">All products</option>
                  {productOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label="Filter by follow-up" className="flex flex-wrap items-center gap-1.5">
              {FU_CHIPS.map((c) => {
                const active = fu === c.value;
                const urgent = c.value === 'overdue' && fuCounts.overdue > 0;
                return (
                  <button
                    key={c.value || 'all'}
                    type="button"
                    aria-pressed={active}
                    title={c.title}
                    onClick={() => setQuery({ fu: c.value })}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ring-1 ring-inset transition-colors ${
                      active ? 'bg-primary text-white ring-primary' : 'bg-surface text-muted ring-line hover:bg-subtle hover:text-ink'
                    }`}
                  >
                    {c.label}
                    {leads && (
                      <span
                        className={`rounded-full px-1.5 text-xs tabular ${
                          active ? 'bg-white/20 text-white' : urgent ? 'bg-danger-soft text-danger-ink' : 'bg-subtle text-muted'
                        }`}
                      >
                        {formatNumber(fuCounts[c.value])}
                      </span>
                    )}
                  </button>
                );
              })}
              {hasFilters && (
                <Button size="sm" variant="ghost" icon={FilterX} onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
            <Segmented value={view} onChange={(v) => setQuery({ view: v === 'board' ? 'board' : null })} options={VIEW_OPTIONS} />
          </div>
          {hasFilters && leads && (
            <p className="text-[13px] text-muted" aria-live="polite">
              {formatNumber(sorted.length)} of {formatNumber(leads.length)} leads match
            </p>
          )}
        </div>
      )}

      {error && leads && (
        <div className="mb-3">
          <ErrorState message={error.message} onRetry={() => reload()} />
        </div>
      )}

      {selectable && selectedIds.length > 0 && (
        <BulkBar
          count={selectedIds.length}
          bulk={bulk}
          stageAllowed={canEdit}
          assignAllowed={canAssign}
          deleteAllowed={canDelete}
          members={activeMembers}
          onStage={bulkStage}
          onAssign={bulkAssign}
          onDelete={() => setConfirmBulkDelete(true)}
          onClear={() => setSelected(new Set())}
        />
      )}

      {loading && !leads ? (
        <LeadsSkeleton view={view} />
      ) : error && !leads ? (
        <ErrorState message={error.message} onRetry={() => reload()} />
      ) : noLeadsAtAll ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No leads yet"
            message={
              canCreate || can('leads_import')
                ? 'Add the buyers you are talking to, or bring them in from a spreadsheet.'
                : 'Leads assigned to you will show up here.'
            }
            action={
              (canCreate || can('leads_import')) && (
                <div className="flex flex-wrap justify-center gap-2">
                  {canCreate && (
                    <Button variant="primary" icon={Plus} onClick={() => setQuery({ new: '1' })}>
                      Add your first lead
                    </Button>
                  )}
                  {can('leads_import') && (
                    <Button icon={Upload} onClick={() => setImportOpen(true)}>
                      Import from CSV
                    </Button>
                  )}
                </div>
              )
            }
          />
        </Card>
      ) : sorted.length === 0 ? (
        <Card>
          <EmptyState
            icon={FilterX}
            title="No leads match these filters"
            message="Try a different search, or clear the filters to see all your leads."
            action={
              <Button icon={FilterX} onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : view === 'board' ? (
        <LeadBoard leads={sorted} canEdit={canEdit} onMove={moveStage} onOpen={openLead} currency={currency} />
      ) : (
        <LeadTable
          leads={sorted}
          page={page}
          onPageChange={(p) => {
            setPage(p);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          sort={sort}
          onSort={onSort}
          selectable={selectable}
          selected={selected}
          onSelect={onSelect}
          onSelectPage={onSelectPage}
          onOpen={openLead}
          onLog={logActivity}
          currency={currency}
        />
      )}

      <LeadFormModal
        open={showNew && canCreate}
        onClose={() => setQuery({ new: null })}
        onSaved={onCreated}
        onOpenLead={(id) => {
          setFocusComposer(false);
          setQuery({ new: null, lead: id });
        }}
      />
      <LeadDrawer leadId={openLeadId} open={Boolean(openLeadId)} onClose={closeDrawer} onChanged={onDrawerChanged} focusComposer={focusComposer} />
      <ImportLeadsModal open={importOpen} onClose={() => setImportOpen(false)} onImported={() => reload({ quiet: true })} />
      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={() => {
          bulkDelete();
        }}
        title={`Move ${formatNumber(selectedIds.length)} ${selectedIds.length === 1 ? 'lead' : 'leads'} to trash?`}
        message="The owner can restore them from the trash."
        confirmLabel="Move to trash"
        danger
      />
    </div>
  );
}
