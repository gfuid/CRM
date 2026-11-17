import React, { useEffect, useMemo, useState } from 'react';
import { Ship, Plus, Calculator, Copy, Trash2, ArrowLeft, Save, Search, FileText, Lock, ListChecks, Info, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { useLeadOptions } from '../data/leadOptions';
import { CONTAINER_TYPES, PRICE_TERMS, QUOTE_UNITS, CURRENCIES, OTHER_CURRENCIES, currencyLabel, newSheet, calcSheet, copySheet, upgradeSheet, money } from '../data/shippingCalc';

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

function Row({ label, value, strong, tone }) {
  const color = tone === 'good' ? 'text-emerald-700 dark:text-emerald-400' : tone === 'bad' ? 'text-rose-600' : 'text-slate-800 dark:text-slate-100';
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 ${strong ? 'border-t border-slate-200 dark:border-slate-700 mt-1 pt-2' : ''}`}>
      <span className={`text-[11px] ${strong ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-500'}`}>{label}</span>
      <span className={`text-xs text-right ${strong ? 'font-extrabold' : 'font-semibold'} ${color}`}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The quotation calculator, laid out like the company's own sheet      */
/* ------------------------------------------------------------------ */

const cellInput = 'w-full min-w-0 px-3 py-2.5 text-base text-right font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none';

function SheetRow({ n, label, hint, children }) {
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)_minmax(170px,44%)] items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
      <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500 flex items-center justify-center">{n}</span>
      <div className="min-w-0">
        <div className="text-sm sm:text-[15px] font-semibold text-slate-800 dark:text-slate-100 leading-tight">{label}</div>
        {hint && <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{hint}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function SheetInput({ value, onChange, unit, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="number" inputMode="decimal" step="any" value={value ?? ''} aria-label={label}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} className={cellInput} />
      {unit && <span className="w-11 shrink-0 text-[11px] font-bold text-slate-400">{unit}</span>}
    </div>
  );
}

/** Any country's currency: the usual export currencies first, then all the others A–Z. */
function CurrencySelect({ value, onChange, label, className }) {
  const known = CURRENCIES.includes(value) || OTHER_CURRENCIES.includes(value);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} title={currencyLabel(value)} className={className}>
      {!known && value && <option value={value}>{value}</option>}
      <optgroup label="Common">{CURRENCIES.map((c) => <option key={c} value={c}>{currencyLabel(c)}</option>)}</optgroup>
      <optgroup label="All currencies">{OTHER_CURRENCIES.map((c) => <option key={c} value={c}>{currencyLabel(c)}</option>)}</optgroup>
    </select>
  );
}

/** A result line (FOB / CFR / CIF): the price in the quote currency, and the same in the local currency. */
function PriceRow({ term, r, cur, loc, active, onPick, how }) {
  const key = term.toLowerCase();
  const digits = r.unit === 'kg' ? 4 : 2;
  const localValue = r.hidden ? null : (r.unit === 'kg' ? r.perKg[key] : r.perTon[key]) * r.rate;
  return (
    <button type="button" onClick={onPick} data-price-row={term}
      className={`w-full text-left grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 border-b border-emerald-200/70 dark:border-emerald-900 cursor-pointer transition-colors ${active ? 'bg-emerald-100/80 dark:bg-emerald-900/40' : 'bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-100/50'}`}>
      <span className={`w-3.5 h-3.5 rounded-full border-2 justify-self-center ${active ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'}`} />
      <div className="min-w-0">
        <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{term} <span className="text-xs font-semibold text-slate-500">{r.unit === 'kg' ? 'price per kg' : 'price per ton'}</span></div>
        {how && <div className="text-[11px] text-slate-500 leading-tight">{how}</div>}
      </div>
      <div className="text-right">
        <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">{money(r.quote[key], cur, digits)}</div>
        {localValue !== null && Number.isFinite(localValue) && <div className="text-[11px] font-semibold text-slate-500 tabular-nums">= {money(localValue, loc, r.unit === 'kg' ? 2 : 0)}</div>}
      </div>
    </button>
  );
}

function QuoteTable({ sheet, setSheet, r, canMoney }) {
  const set = (patch) => setSheet((s) => ({ ...s, ...patch }));
  const setIn = (key, patch) => setSheet((s) => ({ ...s, [key]: { ...(s[key] || {}), ...patch } }));
  const cur = sheet.currency?.foreign || 'USD';
  const loc = sheet.currency?.local || 'INR';
  const pick = (term) => set({ term });
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden" data-quote-table>
      <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 shrink-0 rounded-xl bg-emerald-600 text-white flex items-center justify-center"><Calculator size={20} /></span>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">Export price calculator</h2>
            <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
              Works out the price to quote your buyer. Fill the white boxes from top to bottom; the green lines show the price.
            </p>
          </div>
        </div>
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
          <li className="rounded-lg bg-white/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5"><b className="text-slate-900 dark:text-white">FOB</b>: goods loaded on the ship at your port</li>
          <li className="rounded-lg bg-white/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5"><b className="text-slate-900 dark:text-white">CFR</b>: FOB + sea freight to the buyer’s port</li>
          <li className="rounded-lg bg-white/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5"><b className="text-slate-900 dark:text-white">CIF</b>: CFR + insurance of the goods</li>
        </ul>
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
        <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Show the price</div>
        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-[11px] font-bold" role="radiogroup" aria-label="Quote per ton or per kg">
          {QUOTE_UNITS.map((u) => (
            <button key={u.id} type="button" role="radio" aria-checked={(sheet.quote_unit || 'ton') === u.id} onClick={() => set({ quote_unit: u.id })}
              className={`px-3 py-1.5 rounded-md cursor-pointer ${(sheet.quote_unit || 'ton') === u.id ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>
              {u.label}
            </button>
          ))}
        </div>
      </div>

      <SheetRow n={1} label="Total tons in a container">
        <SheetInput label="Total tons in a container" value={sheet.container?.tons_per} onChange={(v) => setIn('container', { tons_per: v })} unit="MT" />
      </SheetRow>
      <SheetRow n={2} label="Quote in currency">
        <CurrencySelect value={cur} onChange={(v) => setIn('currency', { foreign: v })} label="Quote currency" className={`${cellInput} text-left`} />
      </SheetRow>
      <SheetRow n={3} label="Exchange rate" hint={`1 ${cur} = how many ${loc}. Pick your own currency on the right.`}>
        <div className="flex items-center gap-1.5">
          <input
            type="number" inputMode="decimal" step="any" aria-label="Exchange rate"
            value={sheet.currency?.rate ?? ''}
            onChange={(e) => setIn('currency', { rate: e.target.value === '' ? '' : Number(e.target.value) })}
            className={cellInput}
          />
          <CurrencySelect
            value={loc} onChange={(v) => setIn('currency', { local: v })} label="Your local currency"
            className="w-[88px] shrink-0 px-1.5 py-2.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
          />
        </div>
      </SheetRow>

      {canMoney ? (
        <>
          <SheetRow n={4} label="Ex-plant price per kg" hint="Including packaging and loading">
            <SheetInput label="Ex-plant price per kg" value={sheet.price_per_kg} onChange={(v) => set({ price_per_kg: v })} unit={`${loc}/kg`} />
          </SheetRow>
          <SheetRow n={5} label="Local transportation up to port" hint="Per kg">
            <SheetInput label="Local transportation per kg" value={sheet.transport_per_kg} onChange={(v) => set({ transport_per_kg: v })} unit={`${loc}/kg`} />
          </SheetRow>
          <SheetRow n={6} label="Customs clearance incl. local charges" hint="Per container">
            <SheetInput label="Customs clearance per container" value={sheet.costs?.customs_per_container} onChange={(v) => setIn('costs', { customs_per_container: v })} unit={loc} />
          </SheetRow>
          <SheetRow n={7} label="Profit">
            <SheetInput label="Profit percent" value={sheet.profit_pct} onChange={(v) => set({ profit_pct: v })} unit="%" />
          </SheetRow>
          <PriceRow term="FOB" r={r} cur={cur} loc={loc} active={r.term === 'FOB'} onPick={() => pick('FOB')} how="Rows 4 to 7, divided by the rate" />
          <SheetRow n={8} label="Ocean freight" hint="Per container">
            <SheetInput label="Ocean freight per container" value={sheet.costs?.freight_per_container} onChange={(v) => setIn('costs', { freight_per_container: v })} unit={cur} />
          </SheetRow>
          <PriceRow term="CFR" r={r} cur={cur} loc={loc} active={r.term === 'CFR'} onPick={() => pick('CFR')} how="FOB + freight (no profit on freight)" />
          <SheetRow n={9} label="Insurance" hint="Per container">
            <SheetInput label="Insurance per container" value={sheet.costs?.insurance_per_container} onChange={(v) => setIn('costs', { insurance_per_container: v })} unit={loc} />
          </SheetRow>
          <PriceRow term="CIF" r={r} cur={cur} loc={loc} active={r.term === 'CIF'} onPick={() => pick('CIF')} how="Like FOB with insurance added, + freight" />
        </>
      ) : (
        <>
          {PRICE_TERMS.map((t) => <PriceRow key={t} term={t} r={r} cur={cur} loc={loc} active={r.term === t} onPick={() => pick(t)} />)}
          <div className="px-3 py-2 text-[11px] text-slate-500 flex items-start gap-1.5"><Lock size={12} className="shrink-0 mt-0.5" /> Costs and profit are set by the company owner. These prices are worked out from them.</div>
        </>
      )}
      <div className="px-4 py-2.5 text-[11px] text-slate-500 flex items-start gap-1.5"><Info size={12} className="shrink-0 mt-px" /> Same formula as your company’s Quotation Calculator sheet. Tap FOB, CFR or CIF to use that price for this shipment.</div>
    </div>
  );
}

/** The summary on the right: the shipment and the profit. */
function Results({ sheet, r }) {
  const cur = sheet.currency?.foreign || 'USD';
  const loc = sheet.currency?.local || 'INR';
  return (
    <div className="space-y-3" data-ship-results>
      <div className={cardCls}>
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">This shipment ({r.term})</h3>
        <Row label="Containers" value={`${r.containers} × ${sheet.container?.type || ''}`} />
        <Row label="Total quantity" value={`${r.tons.toLocaleString()} MT`} />
        <Row label={`Price per ton (${r.term})`} value={money(r.quotePerTon, cur)} />
        <Row label="Shipment value" value={money(r.saleValue, cur)} strong />
        {!r.hidden && <Row label={`In ${loc}`} value={money(r.saleLocal, loc, 0)} />}
      </div>
      {!r.hidden && (
        <div className={cardCls}>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Your profit</h3>
          <Row label={`${sheet.profit_pct || 0}% profit in the price`} value={money(r.profit, cur)} tone={r.profit >= 0 ? 'good' : 'bad'} />
          {r.commissions.total > 0 && <Row label="Commissions" value={money(-r.commissions.total, cur)} />}
          {r.tax > 0 && <Row label="Tax" value={money(-r.tax, cur)} />}
          <Row label="Net profit" value={money(r.net, cur)} strong tone={r.net >= 0 ? 'good' : 'bad'} />
          <Row label={`In ${loc}`} value={money(r.netLocal, loc, 0)} />
        </div>
      )}
    </div>
  );
}

/** Everything that is not needed for the price: shown under "More details". */
function SheetForm({ sheet, setSheet, canMoney, team, leadNames, r, quick = false }) {
  const set = (patch) => setSheet((s) => ({ ...s, ...patch }));
  const setIn = (key, patch) => setSheet((s) => ({ ...s, [key]: { ...(s[key] || {}), ...patch } }));
  const loc = sheet.currency?.local || 'INR';
  return (
    <div className="space-y-3">
      <QuoteTable sheet={sheet} setSheet={setSheet} r={r} canMoney={canMoney} />
      {!quick && (
        <details className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" data-more-details>
          <summary className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none flex items-center justify-between">
            More details: buyer, containers, commission, tasks, notes
            <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <div className="px-4 pb-4 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className={grid}>
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
              <div className="min-w-0">
                <label className={labelCls}>Local currency</label>
                <CurrencySelect value={loc} onChange={(v) => setIn('currency', { local: v })} label="Local currency" className={inputCls} />
              </div>
            </div>
            <div className={grid}>
              <div className="min-w-0">
                <label className={labelCls}>Type of container</label>
                <select value={sheet.container?.type} onChange={(e) => setIn('container', { type: e.target.value })} className={inputCls}>
                  {CONTAINER_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <Num label="Total containers" value={sheet.container?.count} onChange={(v) => setIn('container', { count: v })} step="1" />
              <Num label="Bags in each container" value={sheet.container?.bags_per} onChange={(v) => setIn('container', { bags_per: v })} step="1" />
            </div>
            {canMoney && (
              <div>
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Commission & tax (optional)</div>
                <p className="text-[10px] text-slate-500 mb-2">Taken out of your profit; they do not change the quote.</p>
                <div className={grid}>
                  <Num label="Commission to agent" value={sheet.commission?.agent_pct} onChange={(v) => setIn('commission', { agent_pct: v })} suffix="%" />
                  <Num label="Commission to consultant" value={sheet.commission?.consultant_pct} onChange={(v) => setIn('commission', { consultant_pct: v })} suffix="%" />
                  <Num label="Incentive to sales person" value={sheet.commission?.sales_pct} onChange={(v) => setIn('commission', { sales_pct: v })} suffix="%" />
                  <Num label="Tax on profit" value={sheet.tax_pct} onChange={(v) => set({ tax_pct: v })} suffix="%" />
                </div>
              </div>
            )}
            <div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Shipment tasks</div>
              <p className="text-[10px] text-slate-500 mb-2">Each step with the responsible person and the TAT (days allowed).</p>
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
              <div className="flex flex-wrap gap-2 mt-2">
                <button type="button" onClick={() => setSheet((s) => ({ ...s, tasks: [...(s.tasks || []), { id: `t${Date.now()}`, title: '', person_id: '', tat_days: 2, due_date: addDays(today(), 2), done: false }] }))} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 cursor-pointer flex items-center gap-1"><Plus size={12} /> Add task</button>
                {(sheet.tasks || []).length === 0 && (
                  <button type="button" onClick={() => setSheet((s) => ({ ...s, tasks: ['Container booking', 'Stuffing & loading', 'Customs clearance', 'Shipping documents & BL', 'Payment follow-up'].map((title, i) => ({ id: `t${Date.now()}${i}`, title, person_id: '', tat_days: [2, 3, 2, 5, 7][i], due_date: addDays(today(), [2, 3, 2, 5, 7][i]), done: false })) }))} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 cursor-pointer flex items-center gap-1"><ListChecks size={12} /> Add the usual export steps</button>
                )}
              </div>
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea rows={2} value={sheet.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Packing, payment terms, validity of the quotation…" className={inputCls} />
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

/** One input box of the big calculator: number, label on top, unit inside. */
function BigField({ n, label, hint, unit, value, onChange, children }) {
  return (
    <label className="block rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 flex items-center justify-center shrink-0">{n}</span>
        <span className="truncate">{label}</span>
      </span>
      {hint && <span className="block text-[10px] text-slate-400 ml-6.5 mt-0.5 truncate">{hint}</span>}
      <span className="mt-2 flex items-center gap-2">
        {children || (
          <input
            type="number" inputMode="decimal" step="any" aria-label={label}
            value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full min-w-0 bg-transparent text-2xl font-black text-slate-900 dark:text-white focus:outline-none tabular-nums"
          />
        )}
        {unit && <span className="shrink-0 text-xs font-bold text-slate-400">{unit}</span>}
      </span>
    </label>
  );
}

/** The calculator as one full screen: every box on the left, the three prices big on the right. */
function BigCalculator({ sheet, setSheet, r }) {
  const set = (patch) => setSheet((s) => ({ ...s, ...patch }));
  const setIn = (key, patch) => setSheet((s) => ({ ...s, [key]: { ...(s[key] || {}), ...patch } }));
  const cur = sheet.currency?.foreign || 'USD';
  const loc = sheet.currency?.local || 'INR';
  const unit = sheet.quote_unit === 'kg' ? 'kg' : 'ton';
  const digits = unit === 'kg' ? 4 : 2;
  const selectCls = 'w-full min-w-0 bg-transparent text-lg font-black text-slate-900 dark:text-white focus:outline-none cursor-pointer';
  const prices = [
    { term: 'FOB', what: 'Loaded on the ship at your port', how: 'Boxes 4–7 + profit' },
    { term: 'CFR', what: 'FOB + sea freight to the buyer’s port', how: 'FOB + freight' },
    { term: 'CIF', what: 'CFR + insurance of the goods', how: 'FOB + insurance + freight' },
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)] gap-4" data-big-calculator>
      <div className="space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600 dark:text-slate-300">Fill the boxes; the prices on the right change as you type.</p>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-xs font-bold" role="radiogroup" aria-label="Quote per ton or per kg">
            {QUOTE_UNITS.map((u) => (
              <button key={u.id} type="button" role="radio" aria-checked={unit === u.id} onClick={() => set({ quote_unit: u.id })}
                className={`px-4 py-1.5 rounded-lg cursor-pointer ${unit === u.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'}`}>
                Price {u.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <BigField n={1} label="Tons in a container" unit="MT" value={sheet.container?.tons_per} onChange={(v) => setIn('container', { tons_per: v })} />
          <BigField n={2} label="Quote in currency">
            <CurrencySelect value={cur} onChange={(v) => setIn('currency', { foreign: v })} label="Quote currency" className={selectCls} />
          </BigField>
          <BigField n={3} label="Exchange rate" hint={`1 ${cur} = how many ${loc}`}>
            <input type="number" inputMode="decimal" step="any" aria-label="Exchange rate" value={sheet.currency?.rate ?? ''}
              onChange={(e) => setIn('currency', { rate: e.target.value === '' ? '' : Number(e.target.value) })}
              className="w-full min-w-0 bg-transparent text-2xl font-black text-slate-900 dark:text-white focus:outline-none tabular-nums" />
            <CurrencySelect value={loc} onChange={(v) => setIn('currency', { local: v })} label="Your local currency"
              className="w-[76px] shrink-0 px-1 py-1 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer" />
          </BigField>
          <BigField n={4} label="Ex-plant price per kg" hint="Incl. packaging & loading" unit={`${loc}/kg`} value={sheet.price_per_kg} onChange={(v) => set({ price_per_kg: v })} />
          <BigField n={5} label="Transport up to port" hint="Per kg" unit={`${loc}/kg`} value={sheet.transport_per_kg} onChange={(v) => set({ transport_per_kg: v })} />
          <BigField n={6} label="Customs + local charges" hint="Per container" unit={loc} value={sheet.costs?.customs_per_container} onChange={(v) => setIn('costs', { customs_per_container: v })} />
          <BigField n={7} label="Profit" unit="%" value={sheet.profit_pct} onChange={(v) => set({ profit_pct: v })} />
          <BigField n={8} label="Ocean freight" hint="Per container" unit={cur} value={sheet.costs?.freight_per_container} onChange={(v) => setIn('costs', { freight_per_container: v })} />
          <BigField n={9} label="Insurance" hint="Per container" unit={loc} value={sheet.costs?.insurance_per_container} onChange={(v) => setIn('costs', { insurance_per_container: v })} />
        </div>
      </div>

      <div className="space-y-2.5" data-ship-results>
        {prices.map(({ term, what, how }) => {
          const key = term.toLowerCase();
          const local = (unit === 'kg' ? r.perKg[key] : r.perTon[key]) * r.rate;
          return (
            <div key={term} data-price-row={term} className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xl font-black text-slate-900 dark:text-white">{term}</span>
                <span className="text-[11px] font-semibold text-slate-500 text-right">{what}</span>
              </div>
              <div className="mt-1 text-3xl sm:text-4xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums leading-tight">{money(r.quote[key], cur, digits)}</div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 mt-0.5">
                <span>per {unit} · {how}</span>
                {Number.isFinite(local) && <span className="font-semibold tabular-nums shrink-0">= {money(local, loc, unit === 'kg' ? 2 : 0)}</span>}
              </div>
            </div>
          );
        })}
        <p className="text-[10px] text-slate-400 flex items-start gap-1"><Info size={11} className="shrink-0 mt-px" /> Same formula as your company’s Quotation Calculator sheet.</p>
      </div>
    </div>
  );
}

/** The price calculator over any page; nothing is saved unless you save it as a cost sheet. */
export function QuickCalculator({ isOpen, onClose, onOpenAsSheet }) {
  const [sheet, setSheet] = useState(() => newSheet({ name: 'Quick calculation', mode: 'quotation' }));
  const r = useMemo(() => calcSheet(sheet), [sheet]);
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export price calculator"
      subtitle="FOB, CFR and CIF price for your buyer, per ton or per kg"
      maxWidth="max-w-6xl"
      bodyClassName="p-4 sm:p-5 overflow-y-auto"
      footer={onOpenAsSheet ? (
        <button type="button" onClick={() => onOpenAsSheet(sheet)} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"><FileText size={14} /> Save as a cost sheet</button>
      ) : null}
    >
      <BigCalculator sheet={sheet} setSheet={setSheet} r={r} />
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
        <input value={editing.name} onChange={(e) => setEditing((x) => ({ ...x, name: e.target.value }))} placeholder="Name this quotation, e.g. Saigon Feed Mill · Corn DDGS · Nov" aria-label="Name / reference" className="w-full px-3 py-2.5 text-base font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:outline-none" />
        <datalist id="ship-products">{commodities.map((c) => <option key={c} value={c} />)}</datalist>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] gap-4 items-start">
          <SheetForm sheet={editing} setSheet={(fn) => setEditing((s) => (typeof fn === 'function' ? fn(s) : fn))} canMoney={canMoney} team={people} leadNames={leadNames} r={r} />
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

      {/* What this section is for, with the calculator one tap away */}
      <button type="button" onClick={() => setQuickOpen(true)} data-open-calculator
        className="w-full text-left rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer hover:border-emerald-400 transition-colors">
        <span className="w-12 h-12 shrink-0 rounded-2xl bg-emerald-600 text-white flex items-center justify-center"><Calculator size={24} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-base sm:text-lg font-black text-slate-900 dark:text-white">Export price calculator</span>
          <span className="block text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">Enter your product cost, customs, freight and profit; get the FOB, CFR and CIF price to quote your buyer, per ton or per kg.</span>
        </span>
        <span className="shrink-0 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold text-center">Open calculator</span>
      </button>

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
