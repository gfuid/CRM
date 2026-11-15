import React, { useEffect, useMemo, useState } from 'react';
import { Ship, Plus, Calculator, Copy, Trash2, ArrowLeft, Save, Search, FileText, Lock, ListChecks, Info, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { useLeadOptions } from '../data/leadOptions';
import { CONTAINER_TYPES, PRICE_TERMS, QUOTE_UNITS, CURRENCIES, newSheet, calcSheet, copySheet, upgradeSheet, money } from '../data/shippingCalc';

const inputCls = 'w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none';
const labelCls = 'block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1';
const cardCls = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3';
const grid = 'grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3';
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(`${iso || today()}T00:00:00`); d.setDate(d.getDate() + Number(n || 0)); return d.toISOString().slice(0, 10); };

function Num({ label, value, onChange, suffix, step = 'any', min = 0, hint }) {
  return (
    <div className="min-w-0">
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input type="number" inputMode="decimal" step={step} min={min} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} className={`${inputCls} ${suffix ? 'pr-12' : ''}`} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">{suffix}</span>}
      </div>
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function Section({ title, children, locked }) {
  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{title}</h3>
        {locked && <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1"><Lock size={10} /> Owner only</span>}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, strong, tone }) {
  const color = tone === 'good' ? 'text-emerald-700 dark:text-emerald-400' : tone === 'bad' ? 'text-rose-600' : 'text-slate-800 dark:text-slate-100';
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 ${strong ? 'border-t border-slate-200 dark:border-slate-700 mt-1 pt-2' : ''}`}>
      <span className={`text-[11px] ${strong ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-500'}`}>{label}</span>
      <span className={`text-xs text-right ${strong ? 'font-extrabold' : 'font-semibold'} ${color}`}>{value}</span>
    </div>
  );
}

/** The numbers panel shared by the cost sheet and the quick calculator. */
function Results({ sheet, r }) {
  const cur = sheet.currency?.foreign || 'USD';
  const loc = sheet.currency?.local || 'INR';
  const unitLabel = r.unit === 'kg' ? 'per kg' : 'per ton';
  const digits = r.unit === 'kg' ? 4 : 2;
  return (
    <div className="space-y-3" data-ship-results>
      <div className={`${cardCls} bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900`}>
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Quotation {unitLabel} ({cur})</h3>
        {PRICE_TERMS.map((t) => (
          <Row key={t} label={t === r.term ? `${t} (this quote)` : t} value={money(r.quote[t.toLowerCase()], cur, digits)} strong={t === r.term} tone={t === r.term ? 'good' : undefined} />
        ))}
        {r.unit === 'kg' && !r.hidden && <p className="text-[10px] text-slate-500">Per ton: FOB {money(r.perTon.fob, cur)} · CFR {money(r.perTon.cfr, cur)} · CIF {money(r.perTon.cif, cur)}</p>}
        {r.unit === 'ton' && !r.hidden && <p className="text-[10px] text-slate-500">Per kg: FOB {money(r.perKg.fob, cur, 4)} · CFR {money(r.perKg.cfr, cur, 4)} · CIF {money(r.perKg.cif, cur, 4)}</p>}
      </div>
      <div className={cardCls}>
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Shipment</h3>
        <Row label="Containers" value={`${r.containers} × ${sheet.container?.type || ''}`} />
        <Row label="Total quantity" value={`${r.tons.toLocaleString()} MT`} />
        <Row label="Total bags" value={r.bags.toLocaleString()} />
        <Row label={`Shipment value (${r.term})`} value={money(r.saleValue, cur)} strong />
        {!r.hidden && <Row label={`Shipment value in ${loc}`} value={money(r.saleLocal, loc, 0)} />}
      </div>
      {r.hidden ? (
        <div className={`${cardCls} text-[11px] text-slate-500 flex items-start gap-2`}>
          <Lock size={14} className="shrink-0 mt-0.5" />
          <span>Costs and profit are visible to the company owner only. The quote above is worked out from them.</span>
        </div>
      ) : (
        <>
          <div className={cardCls}>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">How the price is built (per ton)</h3>
            <Row label={`Ex-plant + transport (${loc})`} value={money(r.build.goods, loc)} />
            <Row label={`Customs & local charges (${loc})`} value={money(r.build.customs, loc)} />
            <Row label={`Cost up to port (${loc})`} value={money(r.build.costFobLocal, loc)} strong />
            <Row label={`+ ${sheet.profit_pct || 0}% profit, divided by rate ${r.rate} = FOB`} value={money(r.perTon.fob, cur)} />
            <Row label={`Ocean freight (${cur})`} value={money(r.build.freight, cur)} />
            <Row label="FOB + freight = CFR" value={money(r.perTon.cfr, cur)} />
            <Row label={`Insurance (${loc})`} value={money(r.build.insurance, loc)} />
            <Row label="With insurance and profit, + freight = CIF" value={money(r.perTon.cif, cur)} />
            <p className="text-[10px] text-slate-400">Profit is added to the goods, customs and insurance, not to the ocean freight.</p>
          </div>
          <div className={cardCls}>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Profit on this shipment ({r.term})</h3>
            <Row label="Profit in the price" value={money(r.profit, cur)} tone={r.profit >= 0 ? 'good' : 'bad'} />
            {r.commissions.total > 0 && (
              <>
                <Row label="Commission to agent" value={money(-r.commissions.agent, cur)} />
                <Row label="Commission to consultant" value={money(-r.commissions.consultant, cur)} />
                <Row label="Incentive to sales person" value={money(-r.commissions.sales, cur)} />
              </>
            )}
            <Row label="Profit before tax" value={money(r.pbt, cur)} strong tone={r.pbt >= 0 ? 'good' : 'bad'} />
            {r.tax > 0 && <Row label="Tax" value={money(-r.tax, cur)} />}
            <Row label="Net profit" value={money(r.net, cur)} strong tone={r.net >= 0 ? 'good' : 'bad'} />
            <Row label={`Net profit in ${loc}`} value={money(r.netLocal, loc, 0)} />
          </div>
        </>
      )}
      <p className="text-[10px] text-slate-400 flex items-start gap-1"><Info size={11} className="shrink-0 mt-px" /> Formula from your company’s Quotation Calculator sheet.</p>
    </div>
  );
}

/** All input sections of a sheet. `canMoney` hides cost fields for staff without access. */
function SheetForm({ sheet, setSheet, canMoney, team, leadNames, quick = false }) {
  const set = (patch) => setSheet((s) => ({ ...s, ...patch }));
  const setIn = (key, patch) => setSheet((s) => ({ ...s, [key]: { ...(s[key] || {}), ...patch } }));
  const cur = sheet.currency?.foreign || 'USD';
  const loc = sheet.currency?.local || 'INR';
  return (
    <div className="space-y-3">
      {!quick && (
        <Section title="Shipment">
          <div className={grid}>
            <div className="min-w-0">
              <label className={labelCls}>Name / reference</label>
              <input value={sheet.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Saigon Feed Mill · Corn DDGS · Nov" className={inputCls} />
            </div>
            <div className="min-w-0">
              <label className={labelCls}>Buyer</label>
              <input list="ship-buyers" value={sheet.buyer} onChange={(e) => set({ buyer: e.target.value })} placeholder="Company name" className={inputCls} />
              <datalist id="ship-buyers">{leadNames.map((n) => <option key={n} value={n} />)}</datalist>
            </div>
            <div className="min-w-0">
              <label className={labelCls}>Product</label>
              <input list="ship-products" value={sheet.product} onChange={(e) => set({ product: e.target.value })} placeholder="e.g. Corn DDGS" className={inputCls} />
            </div>
            <div className="min-w-0">
              <label className={labelCls}>Type</label>
              <select value={sheet.mode} onChange={(e) => set({ mode: e.target.value })} className={inputCls}>
                <option value="shipment">Shipment cost sheet</option>
                <option value="quotation">Quotation</option>
              </select>
            </div>
          </div>
        </Section>
      )}

      <Section title="Containers">
        <div className={grid}>
          <div className="min-w-0">
            <label className={labelCls}>Type of container</label>
            <select value={sheet.container?.type} onChange={(e) => setIn('container', { type: e.target.value })} className={inputCls}>
              {CONTAINER_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <Num label="Tons in each container" value={sheet.container?.tons_per} onChange={(v) => setIn('container', { tons_per: v })} suffix="MT" />
          <Num label="Total containers" value={sheet.container?.count} onChange={(v) => setIn('container', { count: v })} step="1" />
          <Num label="Bags in each container" value={sheet.container?.bags_per} onChange={(v) => setIn('container', { bags_per: v })} step="1" />
        </div>
      </Section>

      <Section title="Currency & quote">
        <div className={grid}>
          <div className="min-w-0">
            <label className={labelCls}>Local currency</label>
            <select value={loc} onChange={(e) => setIn('currency', { local: e.target.value })} className={inputCls}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div className="min-w-0">
            <label className={labelCls}>Quote in currency</label>
            <select value={cur} onChange={(e) => setIn('currency', { foreign: e.target.value })} className={inputCls}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <Num label={`Rate: ${loc} for 1 ${cur}`} value={sheet.currency?.rate} onChange={(v) => setIn('currency', { rate: v })} />
          <div className="min-w-0">
            <label className={labelCls}>Quote</label>
            <select value={sheet.quote_unit || 'ton'} onChange={(e) => set({ quote_unit: e.target.value })} className={inputCls} aria-label="Quote per ton or per kg">
              {QUOTE_UNITS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </div>
          <div className="min-w-0">
            <label className={labelCls}>Price term</label>
            <select value={sheet.term} onChange={(e) => set({ term: e.target.value })} className={inputCls}>{PRICE_TERMS.map((t) => <option key={t}>{t}</option>)}</select>
          </div>
        </div>
      </Section>

      {canMoney && (
        <>
          <Section title="Product cost" locked>
            <div className={grid}>
              <Num label={`Ex-plant price per kg (${loc})`} value={sheet.price_per_kg} onChange={(v) => set({ price_per_kg: v })} hint="Including packaging and loading" />
              <Num label={`Transport to port per kg (${loc})`} value={sheet.transport_per_kg} onChange={(v) => set({ transport_per_kg: v })} />
              <Num label="Profit" value={sheet.profit_pct} onChange={(v) => set({ profit_pct: v })} suffix="%" min={undefined} />
            </div>
          </Section>
          <Section title="Charges per container" locked>
            <div className={grid}>
              <Num label={`Customs clearance + local charges (${loc})`} value={sheet.costs?.customs_per_container} onChange={(v) => setIn('costs', { customs_per_container: v })} />
              <Num label={`Ocean freight (${cur})`} value={sheet.costs?.freight_per_container} onChange={(v) => setIn('costs', { freight_per_container: v })} />
              <Num label={`Insurance (${loc})`} value={sheet.costs?.insurance_per_container} onChange={(v) => setIn('costs', { insurance_per_container: v })} hint="Only in the CIF price" />
            </div>
          </Section>
          <Section title="Commission & tax (optional)" locked>
            <p className="text-[10px] text-slate-500 -mt-1">Taken out of your profit; they do not change the quote.</p>
            <div className={grid}>
              <Num label="Commission to agent" value={sheet.commission?.agent_pct} onChange={(v) => setIn('commission', { agent_pct: v })} suffix="%" />
              <Num label="Commission to consultant" value={sheet.commission?.consultant_pct} onChange={(v) => setIn('commission', { consultant_pct: v })} suffix="%" />
              <Num label="Incentive to sales person" value={sheet.commission?.sales_pct} onChange={(v) => setIn('commission', { sales_pct: v })} suffix="%" />
              <Num label="Tax on profit" value={sheet.tax_pct} onChange={(v) => set({ tax_pct: v })} suffix="%" />
            </div>
          </Section>
        </>
      )}

      {!quick && (
        <Section title="Shipment tasks">
          <p className="text-[11px] text-slate-500 -mt-1">Each step with the responsible person and the TAT (days allowed).</p>
          <div className="space-y-2">
            {(sheet.tasks || []).map((t, i) => {
              const patch = (p) => setSheet((s) => ({ ...s, tasks: s.tasks.map((x, j) => (j === i ? { ...x, ...p } : x)) }));
              const overdue = !t.done && t.due_date && t.due_date < today();
              return (
                <div key={t.id} className={`grid grid-cols-1 sm:grid-cols-[auto_minmax(0,2fr)_minmax(0,1.3fr)_90px_130px_auto] gap-2 items-center p-2 rounded-xl border ${overdue ? 'border-rose-200 bg-rose-50/50 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-800'}`}>
                  <input type="checkbox" checked={t.done} onChange={(e) => patch({ done: e.target.checked })} className="w-4 h-4 accent-emerald-600" aria-label="Done" />
                  <input value={t.title} onChange={(e) => patch({ title: e.target.value })} placeholder="e.g. Container booking" className={inputCls} />
                  <select value={t.person_id} onChange={(e) => patch({ person_id: e.target.value })} className={inputCls}>
                    <option value="">Responsible person</option>
                    {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <input type="number" min={0} value={t.tat_days} onChange={(e) => patch({ tat_days: Number(e.target.value) || 0, due_date: addDays(today(), e.target.value) })} className={inputCls} aria-label="TAT days" title="TAT in days" />
                  <input type="date" value={t.due_date} onChange={(e) => patch({ due_date: e.target.value })} className={inputCls} aria-label="Due date" />
                  <button type="button" onClick={() => setSheet((s) => ({ ...s, tasks: s.tasks.filter((_, j) => j !== i) }))} className="p-2 text-slate-400 hover:text-rose-600 cursor-pointer justify-self-end" aria-label="Remove task"><X size={14} /></button>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSheet((s) => ({ ...s, tasks: [...(s.tasks || []), { id: `t${Date.now()}`, title: '', person_id: '', tat_days: 2, due_date: addDays(today(), 2), done: false }] }))} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 cursor-pointer flex items-center gap-1"><Plus size={12} /> Add task</button>
            {(sheet.tasks || []).length === 0 && (
              <button type="button" onClick={() => setSheet((s) => ({ ...s, tasks: ['Container booking', 'Stuffing & loading', 'Customs clearance', 'Shipping documents & BL', 'Payment follow-up'].map((title, i) => ({ id: `t${Date.now()}${i}`, title, person_id: '', tat_days: [2, 3, 2, 5, 7][i], due_date: addDays(today(), [2, 3, 2, 5, 7][i]), done: false })) }))} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 cursor-pointer flex items-center gap-1"><ListChecks size={12} /> Add the usual export steps</button>
            )}
          </div>
        </Section>
      )}

      {!quick && (
        <Section title="Notes">
          <textarea rows={2} value={sheet.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Packing, payment terms, validity of the quotation…" className={inputCls} />
        </Section>
      )}
    </div>
  );
}

/** A small window for a fast price check; nothing is saved unless you open it as a full sheet. */
export function QuickCalculator({ isOpen, onClose, onOpenAsSheet }) {
  const [sheet, setSheet] = useState(() => newSheet({ name: 'Quick calculation', mode: 'quotation' }));
  const r = useMemo(() => calcSheet(sheet), [sheet]);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick calculator" subtitle="Check a price or a quotation in seconds" maxWidth="max-w-4xl">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
        <SheetForm sheet={sheet} setSheet={setSheet} canMoney team={[]} leadNames={[]} quick />
        <Results sheet={sheet} r={r} />
      </div>
      {onOpenAsSheet && (
        <div className="flex justify-end pt-2">
          <button type="button" onClick={() => onOpenAsSheet(sheet)} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"><FileText size={14} /> Save as a cost sheet</button>
        </div>
      )}
    </Modal>
  );
}

export default function Shipping() {
  const { isOwner, getTeamMembers, profile } = useAuth();
  const { commodities } = useLeadOptions(isOwner);
  const [sheets, setSheets] = useState(null);
  const [meta, setMeta] = useState({ access: 'basic', can_see_money: false, settings: null });
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // a sheet object
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [q, setQ] = useState('');
  const [quickOpen, setQuickOpen] = useState(false);
  const [team, setTeam] = useState([]);
  const [leadNames, setLeadNames] = useState([]);

  const load = async () => {
    try {
      const res = await api.getShippingSheets();
      setSheets((res?.data || []).map(upgradeSheet));
      setMeta(res?.meta || {});
      setError('');
    } catch (err) {
      setSheets([]);
      setError(err?.message || 'Shipping could not be loaded.');
    }
  };
  useEffect(() => {
    load();
    if (getTeamMembers) getTeamMembers().then((m) => Array.isArray(m) && setTeam(m.filter((x) => x?.id).map((x) => ({ id: x.id, name: x.name })))).catch(() => {});
    api.getLeads().then((res) => setLeadNames([...new Set((res?.data || []).map((l) => l.company_name || l.name).filter(Boolean))])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const people = useMemo(() => {
    const list = profile?.id ? [{ id: profile.id, name: profile.name || 'You' }] : [];
    team.forEach((t) => { if (!list.some((p) => p.id === t.id)) list.push(t); });
    return list;
  }, [team, profile]);

  const canMoney = Boolean(meta.can_see_money);
  const shown = useMemo(() => {
    const w = q.toLowerCase().split(/\s+/).filter(Boolean);
    return (sheets || []).filter((s) => w.every((x) => [s.name, s.buyer, s.product, s.mode].join(' ').toLowerCase().includes(x)));
  }, [sheets, q]);

  const save = async () => {
    if (!editing || saving) return;
    setSaving(true);
    try {
      const res = await api.saveShippingSheet(editing.id, editing);
      setEditing(res?.data ? { ...editing, ...res.data } : editing);
      setNotice('Saved.');
      setTimeout(() => setNotice(''), 2500);
      await load();
    } catch (err) {
      setNotice(err?.message || 'Could not save. Please try again.');
    } finally { setSaving(false); }
  };
  const remove = async (s) => {
    if (!window.confirm(`Delete “${s.name}”? This cannot be undone.`)) return;
    try { await api.deleteShippingSheet(s.id); if (editing?.id === s.id) setEditing(null); await load(); }
    catch (err) { alert(err?.message || 'Could not delete.'); }
  };
  const setAccess = async (value) => {
    try { await api.saveShippingSettings({ staff_access: value }); await load(); }
    catch (err) { alert(err?.message || 'Could not save the setting.'); }
  };

  if (error && !sheets?.length) {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center space-y-2">
        <Lock size={22} className="mx-auto text-slate-400" />
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{error}</p>
      </div>
    );
  }

  // ---------- one sheet ----------
  if (editing) {
    const r = calcSheet(editing, { hidden: !canMoney });
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => setEditing(null)} className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"><ArrowLeft size={14} /> All cost sheets</button>
          <div className="flex flex-wrap items-center gap-2">
            {notice && <span className="text-[11px] font-bold text-emerald-700">{notice}</span>}
            {editing.id && <button type="button" onClick={() => setEditing(copySheet(editing))} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"><Copy size={13} /> Copy to new</button>}
            {isOwner && editing.id && <button type="button" onClick={() => remove(editing)} className="px-3 py-2 rounded-xl border border-rose-200 text-xs font-bold text-rose-600 flex items-center gap-1.5 cursor-pointer"><Trash2 size={13} /> Delete</button>}
            <button type="button" onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"><Save size={13} /> {saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
        <datalist id="ship-products">{commodities.map((c) => <option key={c} value={c} />)}</datalist>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4 items-start">
          <SheetForm sheet={editing} setSheet={(fn) => setEditing((s) => (typeof fn === 'function' ? fn(s) : fn))} canMoney={canMoney} team={people} leadNames={leadNames} />
          <div className="lg:sticky lg:top-4"><Results sheet={editing} r={r} /></div>
        </div>
      </div>
    );
  }

  // ---------- list ----------
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2"><Ship size={22} className="text-emerald-600" /> Shipping & Costing</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">FOB, CFR and CIF quotes per ton or per kg, and cost sheets for every shipment: containers, charges, profit and tasks.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setQuickOpen(true)} className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"><Calculator size={14} /> Quick calculator</button>
          <button type="button" onClick={() => setEditing(newSheet({ mode: 'quotation', name: 'New quotation' }))} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"><FileText size={14} /> New quotation</button>
          <button type="button" onClick={() => setEditing(newSheet({ name: 'New shipment' }))} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"><Plus size={14} /> New cost sheet</button>
        </div>
      </div>

      {isOwner && meta.settings && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2">
          <Lock size={12} className="text-slate-400" />
          <span className="font-bold text-slate-700 dark:text-slate-200">Staff can</span>
          <select value={meta.settings.staff_access || 'basic'} onChange={(e) => setAccess(e.target.value)} className="px-2 py-1 text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg">
            <option value="none">not open Shipping</option>
            <option value="basic">see shipments, prices and tasks (no costs or profit)</option>
            <option value="full">see everything, including costs and profit</option>
          </select>
        </div>
      )}

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, buyer or product" className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
      </div>

      {sheets === null ? (
        <div className="text-xs text-slate-500 p-6 text-center">Loading…</div>
      ) : shown.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center space-y-2">
          <Ship size={28} className="mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{sheets.length ? 'No cost sheet matches your search.' : 'No cost sheets yet'}</p>
          {!sheets.length && <p className="text-xs text-slate-500">Press “New cost sheet” for a shipment, or “New quotation” to price an enquiry.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {shown.map((s) => {
            const r = calcSheet(s, { hidden: !canMoney });
            const openTasks = (s.tasks || []).filter((t) => !t.done).length;
            const late = (s.tasks || []).filter((t) => !t.done && t.due_date && t.due_date < today()).length;
            return (
              <div key={s.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 hover:border-emerald-300 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => setEditing(JSON.parse(JSON.stringify(s)))} className="text-left min-w-0 cursor-pointer">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{s.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{[s.buyer, s.product].filter(Boolean).join(' · ') || '—'}</div>
                  </button>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.mode === 'quotation' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{s.mode === 'quotation' ? 'Quotation' : 'Shipment'}</span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">{r.containers} × {s.container?.type} · {r.tons.toLocaleString()} MT · {r.term} {money(r.quote[r.term.toLowerCase()], s.currency?.foreign, r.unit === 'kg' ? 4 : 2)}/{r.unit === 'kg' ? 'kg' : 'MT'}</div>
                {!r.hidden && <div className={`text-xs font-extrabold ${r.net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>Net profit {money(r.net, s.currency?.foreign)} <span className="font-semibold text-slate-400">({r.marginPct}%)</span></div>}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className={`text-[10px] font-bold ${late ? 'text-rose-600' : 'text-slate-400'}`}>{openTasks ? `${openTasks} open task${openTasks === 1 ? '' : 's'}${late ? `, ${late} late` : ''}` : 'No open tasks'}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setEditing(copySheet(s))} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" title="Copy to a new sheet" aria-label="Copy"><Copy size={13} /></button>
                    {isOwner && <button type="button" onClick={() => remove(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" title="Delete" aria-label="Delete"><Trash2 size={13} /></button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <QuickCalculator isOpen={quickOpen} onClose={() => setQuickOpen(false)} onOpenAsSheet={(s) => { setQuickOpen(false); setEditing({ ...s, name: 'New quotation' }); }} />
    </div>
  );
}
