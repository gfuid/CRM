import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Plus, Pencil, Trash2, Save, X, ArrowUp, ArrowDown, Copy, Eye, EyeOff, Search, Info } from 'lucide-react';
import { evaluateCalculator, checkCalculator, makeKey, EXAMPLE_ROWS, FUNCTION_NAMES } from '../data/formula';

const KIND_LABELS = { number: 'Input box (number)', select: 'Dropdown (choices)', formula: 'Formula (result)', heading: 'Heading (title only)' };
const EMPTY = { name: '', description: '', active: true, audience: 'all', company_ids: [], rows: [] };
const inputCls = 'w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500';
const fmt = (v, d = 2) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: d }));

/** The calculator as the CRM shows it (sheet style), with test values typed here. */
function Preview({ calc }) {
  const [test, setTest] = useState({});
  const { values, errors } = useMemo(() => evaluateCalculator(calc.rows, test), [calc.rows, test]);
  const cell = 'border border-slate-400 px-2 py-1';
  return (
    <div className="space-y-2" data-calc-preview>
      <div className="text-xs font-bold text-slate-700">Preview (as companies will see it)</div>
      <div className="text-base font-black text-slate-900">{calc.name || 'Untitled calculator'}</div>
      {calc.description && <p className="text-[11px] text-slate-500 -mt-1">{calc.description}</p>}
      <table className="w-full border-collapse text-xs">
        <thead><tr><th className={`${cell} text-left`}>Particulars</th><th className={`${cell} text-left w-[42%]`}>Input field</th></tr></thead>
        <tbody>
          {calc.rows.map((r) => {
            if (r.kind === 'heading') return <tr key={r.key}><td colSpan={2} className={`${cell} bg-slate-100 font-black`}>{r.label}</td></tr>;
            const unit = r.unit ? <span className="text-[10px] text-slate-500"> ({r.unit})</span> : null;
            if (r.kind === 'formula') {
              return (
                <tr key={r.key} data-preview-row={r.key}>
                  <td className={`${cell} ${r.highlight ? 'font-bold' : ''}`}>{r.label}{unit}</td>
                  <td className={`${cell} text-right font-bold ${errors[r.key] ? 'bg-rose-100 text-rose-700' : 'bg-[#a2c4c9]'}`} title={errors[r.key] || ''}>
                    {errors[r.key] ? <span className="text-[10px] font-semibold">{errors[r.key]}</span> : fmt(values[r.key], r.decimals ?? 2)}
                  </td>
                </tr>
              );
            }
            const val = Object.prototype.hasOwnProperty.call(test, r.key) ? test[r.key] : r.default;
            return (
              <tr key={r.key}>
                <td className={cell}>{r.label}{unit}</td>
                <td className={`${cell} bg-[#a4c2f4] p-0`}>
                  {r.kind === 'select' ? (
                    <select value={val} onChange={(e) => setTest({ ...test, [r.key]: Number(e.target.value) })} className="w-full bg-transparent px-2 py-1 text-right font-semibold focus:outline-none">
                      {(r.options || []).map((o, i) => <option key={i} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input type="number" step="any" value={val ?? ''} onChange={(e) => setTest({ ...test, [r.key]: e.target.value })} className="w-full bg-transparent px-2 py-1 text-right font-semibold focus:outline-none" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {Object.keys(test).length > 0 && <button type="button" onClick={() => setTest({})} className="text-[11px] font-bold text-indigo-600 cursor-pointer">Reset test values</button>}
    </div>
  );
}

function RowEditor({ row, index, total, rows, onChange, onMove, onRemove }) {
  const set = (patch) => onChange({ ...row, ...patch });
  const others = rows.filter((r) => r.key !== row.key && r.kind !== 'heading');
  const [focused, setFocused] = useState(false);
  const insert = (text) => set({ formula: `${row.formula || ''}${row.formula && !/[\s(+\-*/^,]$/.test(row.formula) ? ' ' : ''}${text}` });
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2" data-row-editor={row.key}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-slate-100 text-xs font-black text-slate-600 flex items-center justify-center" title={`Use R${index + 1} in formulas`}>R{index + 1}</span>
        <input aria-label={`Row ${index + 1} name`} value={row.label} placeholder="Name, e.g. Total ton in a container" className={`${inputCls} flex-1 min-w-[180px] text-sm font-semibold`}
          onChange={(e) => {
            const label = e.target.value;
            const autoKey = row._autoKey !== false;
            set({ label, ...(autoKey ? { key: makeKey(label, rows.filter((r) => r !== row).map((r) => r.key)) } : {}) });
          }} />
        <select aria-label={`Row ${index + 1} type`} value={row.kind} onChange={(e) => set({ kind: e.target.value, ...(e.target.value === 'select' && !(row.options || []).length ? { options: [{ label: 'Option 1', value: 1 }] } : {}) })} className={`${inputCls} w-auto`}>
          {Object.entries(KIND_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <div className="flex items-center gap-1 ml-auto">
          <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer" aria-label="Move up"><ArrowUp size={14} /></button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer" aria-label="Move down"><ArrowDown size={14} /></button>
          <button type="button" onClick={onRemove} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer" aria-label="Remove row"><Trash2 size={14} /></button>
        </div>
      </div>

      {row.kind !== 'heading' && (
        <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr_110px] gap-2">
          <label className="text-[10px] font-bold text-slate-500">Box name (used in formulas)
            <input value={row.key} onChange={(e) => set({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''), _autoKey: false })} className={`${inputCls} font-mono`} />
          </label>
          {row.kind === 'number' && (
            <label className="text-[10px] font-bold text-slate-500">Starting value (optional)
              <input type="number" step="any" value={row.default ?? ''} onChange={(e) => set({ default: e.target.value === '' ? '' : Number(e.target.value) })} className={inputCls} />
            </label>
          )}
          {row.kind === 'select' && (
            <div className="text-[10px] font-bold text-slate-500 space-y-1">
              Choices (name = number used in formulas)
              {(row.options || []).map((o, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input value={o.label} placeholder="Name" onChange={(e) => set({ options: row.options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} className={inputCls} />
                  <span>=</span>
                  <input type="number" step="any" value={o.value} onChange={(e) => set({ options: row.options.map((x, j) => (j === i ? { ...x, value: Number(e.target.value) } : x)) })} className={`${inputCls} w-24`} />
                  <button type="button" onClick={() => set({ options: row.options.filter((_, j) => j !== i) })} className="p-1 text-rose-500 cursor-pointer" aria-label="Remove choice"><X size={12} /></button>
                </div>
              ))}
              <button type="button" onClick={() => set({ options: [...(row.options || []), { label: `Option ${(row.options || []).length + 1}`, value: (row.options || []).length + 1 }] })} className="text-indigo-600 cursor-pointer">+ Add choice</button>
            </div>
          )}
          {row.kind === 'formula' && (
            <label className="text-[10px] font-bold text-slate-500">Formula (like Excel, without cell letters)
              <input value={row.formula || ''} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 200)}
                onChange={(e) => set({ formula: e.target.value })} placeholder="e.g. (price_kg + transport_kg) * 1000 / rate" className={`${inputCls} font-mono`} aria-label={`Row ${index + 1} formula`} />
            </label>
          )}
          <label className="text-[10px] font-bold text-slate-500">Unit (optional)
            <input value={row.unit || ''} onChange={(e) => set({ unit: e.target.value })} placeholder="e.g. INR/kg" className={inputCls} />
          </label>
        </div>
      )}
      {row.kind === 'formula' && (
        <div className="space-y-1.5">
          {(focused || !row.formula) && others.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-[10px] text-slate-500">Click to add:</span>
              {others.map((o) => (
                <button key={o.key} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(o.key)} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-mono cursor-pointer" title={o.label}>{o.key}</button>
              ))}
              {['+', '-', '*', '/', '(', ')', '%'].map((op) => (
                <button key={op} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(op)} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono cursor-pointer">{op}</button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={Boolean(row.highlight)} onChange={(e) => set({ highlight: e.target.checked })} /> Show big (main result)</label>
            <label className="flex items-center gap-1.5">Decimals <input type="number" min={0} max={6} value={row.decimals ?? 2} onChange={(e) => set({ decimals: Number(e.target.value) })} className={`${inputCls} w-14`} /></label>
          </div>
        </div>
      )}
      <label className="block text-[10px] font-bold text-slate-500">Small note under the name (optional)
        <input value={row.hint || ''} onChange={(e) => set({ hint: e.target.value })} placeholder="e.g. per container" className={inputCls} />
      </label>
    </div>
  );
}

export default function CalculatorsSection({ apiBase, getHeaders, showToast, users = [] }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(null); // calculator being edited
  const [busy, setBusy] = useState(false);
  const [companyQ, setCompanyQ] = useState('');

  const owners = useMemo(() => users.filter((u) => u.persona === 'owner' || u.is_owner || u.role === 'admin'), [users]);

  const load = async () => {
    try {
      const res = await fetch(`${apiBase}/calculators`, { headers: getHeaders() }).then((r) => r.json());
      setList(res.success ? res.data || [] : []);
      if (!res.success) showToast(res.message || 'Could not load calculators', 'error');
    } catch (err) {
      setList([]);
      showToast('Could not load calculators: ' + err.message, 'error');
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const problems = useMemo(() => (form ? checkCalculator(form.rows) : []), [form]);

  const save = async () => {
    if (!form.name.trim()) return showToast('Give the calculator a name', 'error');
    if (problems.length) return showToast(problems[0], 'error');
    setBusy(true);
    try {
      const rows = form.rows.map(({ _autoKey, ...r }) => r);
      const res = await fetch(`${apiBase}/calculators${form.id ? `/${form.id}` : ''}`, {
        method: form.id ? 'PATCH' : 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ...form, rows }),
      }).then((r) => r.json());
      if (!res.success) return showToast(res.message || 'Could not save', 'error');
      showToast(form.id ? 'Calculator saved' : 'Calculator created — companies can use it now');
      setForm(null);
      load();
    } catch (err) {
      showToast('Could not save: ' + err.message, 'error');
    } finally { setBusy(false); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete the calculator "${c.name}"? Companies will not see it any more.`)) return;
    const res = await fetch(`${apiBase}/calculators/${c.id}`, { method: 'DELETE', headers: getHeaders() }).then((r) => r.json()).catch(() => ({}));
    if (res.success) { showToast('Calculator deleted'); load(); } else showToast(res.message || 'Could not delete', 'error');
  };
  const toggleActive = async (c) => {
    const res = await fetch(`${apiBase}/calculators/${c.id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ active: c.active === false }) }).then((r) => r.json()).catch(() => ({}));
    if (res.success) load(); else showToast(res.message || 'Could not change it', 'error');
  };

  const addRow = (kind) => setForm((f) => {
    const label = kind === 'formula' ? `Result ${f.rows.filter((r) => r.kind === 'formula').length + 1}` : kind === 'heading' ? 'Section title' : `Box ${f.rows.length + 1}`;
    const key = makeKey(label, f.rows.map((r) => r.key));
    const row = { key, label, kind, unit: '', hint: '', ...(kind === 'number' ? { default: '' } : {}), ...(kind === 'formula' ? { formula: '', highlight: true, decimals: 2 } : {}), ...(kind === 'select' ? { options: [{ label: 'Option 1', value: 1 }], default: 1 } : {}) };
    return { ...f, rows: [...f.rows, row] };
  });

  // ---------- editor ----------
  if (form) {
    const shownOwners = owners.filter((o) => `${o.company_name || ''} ${o.name || ''} ${o.email || ''}`.toLowerCase().includes(companyQ.toLowerCase()));
    return (
      <div className="space-y-4" data-calc-editor>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => setForm(null)} className="text-xs font-bold text-slate-600 cursor-pointer flex items-center gap-1"><X size={14} /> Close without saving</button>
          <button type="button" onClick={save} disabled={busy} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"><Save size={14} /> {busy ? 'Saving…' : 'Save calculator'}</button>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-4 items-start">
          <div className="space-y-3 min-w-0 xl:max-h-[calc(100vh-170px)] xl:overflow-y-auto xl:pr-1" data-rows-pane>
            <div className="rounded-xl border border-slate-200 bg-white p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="text-[10px] font-bold text-slate-500 sm:col-span-2">Calculator name
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Export price (FOB / CFR / CIF)" className={`${inputCls} text-sm font-bold`} aria-label="Calculator name" />
              </label>
              <label className="text-[10px] font-bold text-slate-500 sm:col-span-2">What it is for (shown to users)
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Price to quote the buyer per ton" className={inputCls} />
              </label>
              <label className="text-[10px] font-bold text-slate-500">Who can use it
                <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className={inputCls} aria-label="Who can use it">
                  <option value="all">All companies</option>
                  <option value="companies">Only the companies I pick</option>
                </select>
              </label>
              <label className="flex items-end gap-2 text-xs font-semibold text-slate-700 pb-1.5 cursor-pointer">
                <input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Show it in the CRM
              </label>
              {form.audience === 'companies' && (
                <div className="sm:col-span-2 space-y-1">
                  <div className="relative"><Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" /><input value={companyQ} onChange={(e) => setCompanyQ(e.target.value)} placeholder="Search companies" className={`${inputCls} pl-7`} /></div>
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                    {shownOwners.map((o) => (
                      <label key={o.id} className="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer">
                        <input type="checkbox" checked={form.company_ids.includes(o.id)} onChange={(e) => setForm({ ...form, company_ids: e.target.checked ? [...form.company_ids, o.id] : form.company_ids.filter((x) => x !== o.id) })} />
                        <span className="font-semibold">{o.company_name || o.name}</span><span className="text-slate-400">{o.email}</span>
                      </label>
                    ))}
                    {!shownOwners.length && <div className="px-2 py-2 text-[11px] text-slate-400">No company found</div>}
                  </div>
                  <div className="text-[10px] text-slate-500">{form.company_ids.length} selected</div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1"><Info size={12} /> How formulas work</div>
              <div>Use the <b>box names</b> (or row numbers like <b>R5</b>) with <b>+ − * / ^</b> and brackets. <b>2%</b> means 0.02.</div>
              <div>Example: <code className="bg-white px-1 rounded">((price_kg + transport_kg) * 1000 + customs / tons) * (1 + profit%) / rate</code></div>
              <div>Functions: {FUNCTION_NAMES.join(', ')} — e.g. <code className="bg-white px-1 rounded">IF(qty &gt; 100, 5, 2)</code>, <code className="bg-white px-1 rounded">ROUND(fob, 2)</code></div>
            </div>

            {form.rows.map((row, i) => (
              <RowEditor key={i} row={row} index={i} total={form.rows.length} rows={form.rows}
                onChange={(next) => setForm((f) => ({ ...f, rows: f.rows.map((r, j) => (j === i ? next : r)) }))}
                onMove={(d) => setForm((f) => { const rows = [...f.rows]; [rows[i], rows[i + d]] = [rows[i + d], rows[i]]; return { ...f, rows }; })}
                onRemove={() => setForm((f) => ({ ...f, rows: f.rows.filter((_, j) => j !== i) }))} />
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => addRow('number')} className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold cursor-pointer flex items-center gap-1"><Plus size={13} /> Input box</button>
              <button type="button" onClick={() => addRow('select')} className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer flex items-center gap-1"><Plus size={13} /> Dropdown</button>
              <button type="button" onClick={() => addRow('formula')} className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold cursor-pointer flex items-center gap-1"><Plus size={13} /> Formula</button>
              <button type="button" onClick={() => addRow('heading')} className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer flex items-center gap-1"><Plus size={13} /> Heading</button>
            </div>
            {problems.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 space-y-0.5" data-calc-problems>
                {problems.slice(0, 8).map((p) => <div key={p}>• {p}</div>)}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 xl:max-h-[calc(100vh-170px)] xl:overflow-y-auto"><Preview calc={form} /></div>
        </div>
      </div>
    );
  }

  // ---------- list ----------
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Calculator size={20} className="text-indigo-600" /> Calculators</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">Build a calculator like a sheet: add input boxes and formulas. Companies see it in the CRM under the Price calculator, with no code.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setForm({ ...EMPTY, name: 'Export price (FOB / CFR / CIF)', description: 'Price to quote the buyer, like the company sheet', rows: EXAMPLE_ROWS.map((r) => ({ ...r, _autoKey: false })) })} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5"><Copy size={14} /> Start from the export example</button>
          <button type="button" onClick={() => setForm({ ...EMPTY, rows: [] })} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"><Plus size={14} /> New calculator</button>
        </div>
      </div>
      {list === null ? (
        <div className="text-xs text-slate-500 p-6 text-center">Loading…</div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No calculators yet. Press “New calculator”, or start from the export example.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2" data-calc-card={c.name}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-black text-slate-900 truncate">{c.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{c.description || '—'}</div>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{c.active !== false ? 'Live' : 'Hidden'}</span>
              </div>
              <div className="text-[11px] text-slate-600">{c.rows.length} rows · {c.rows.filter((r) => r.kind === 'formula').length} formulas · {c.audience === 'companies' ? `${(c.company_ids || []).length} companies` : 'All companies'}</div>
              <div className="flex items-center gap-1 pt-1">
                <button type="button" onClick={() => setForm({ ...EMPTY, ...JSON.parse(JSON.stringify(c)), rows: c.rows.map((r) => ({ ...r, _autoKey: false })) })} className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold cursor-pointer flex items-center gap-1"><Pencil size={12} /> Edit</button>
                <button type="button" onClick={() => toggleActive(c)} className="px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-700 text-[11px] font-bold cursor-pointer flex items-center gap-1">{c.active !== false ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}</button>
                <button type="button" onClick={() => remove(c)} className="ml-auto p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer" aria-label="Delete calculator"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
