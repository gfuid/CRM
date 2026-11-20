import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileText, Plus, Loader2, X, Trash2, Download, Copy, Send, Mail, CheckCircle2, AlertCircle, Building2, Search, ArrowRightLeft, Eye, Upload, Save, Link2,
} from 'lucide-react';
import { api } from '../services/api';

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card';
const input = 'w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none';
const label = 'block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1';
const btn = 'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const primary = `${btn} bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm`;
const secondary = `${btn} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700`;
const docs = (path = '', method = 'GET', data) => api.request(`/documents${path}`, { method, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
const money = (v, cur) => `${cur} ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const round2 = (n) => Math.round(n * 100) / 100;
const TYPE = { quotation: 'Quotation', proforma: 'Proforma Invoice' };
const STATUS = { draft: 'bg-slate-100 text-slate-600 border-slate-200', sent: 'bg-blue-50 text-blue-700 border-blue-200', accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200', rejected: 'bg-rose-50 text-rose-700 border-rose-200' };
const INCOTERMS = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'SAR', 'AUD', 'CAD', 'SGD', 'JPY', 'CNY', 'VND'];
const UNITS = ['MT', 'kg', 'quintal', 'bags', 'cartons', 'pcs', 'containers', 'litres'];

function Notice({ type = 'info', children, onClose }) {
  const cls = type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600';
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;
  return <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${cls}`}><Icon size={14} className="shrink-0 mt-px" /><div className="min-w-0 flex-1">{children}</div>{onClose && <button className="cursor-pointer" onClick={onClose} aria-label="Close message"><X size={13} /></button>}</div>;
}

const pdfBlob = async (id) => {
  const res = await fetch(`${api.baseUrl}/documents/${id}/pdf`, { headers: { Authorization: `Bearer ${localStorage.getItem('crm_token') || ''}` } });
  if (!res.ok) throw new Error('Could not make the PDF');
  return res.blob();
};
const readFile = (file) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(new Error('Could not read the file')); r.readAsDataURL(file); });

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

function Editor({ initial, onClose, onSaved, setBanner }) {
  const [d, setD] = useState(initial);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [preview, setPreview] = useState('');
  const [leads, setLeads] = useState([]);
  const [leadQ, setLeadQ] = useState('');
  const saved = Boolean(d.id);
  const set = (p) => setD((x) => ({ ...x, ...p }));
  const setBuyer = (p) => setD((x) => ({ ...x, buyer: { ...x.buyer, ...p } }));
  const setItem = (i, p) => setD((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, ...p } : it)) }));
  const setCharge = (i, p) => setD((x) => ({ ...x, charges: x.charges.map((c, j) => (j === i ? { ...c, ...p } : c)) }));
  const subtotal = round2((d.items || []).reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0));
  const total = round2(subtotal + (d.charges || []).reduce((s, c) => s + (Number(c.amount) || 0), 0));

  useEffect(() => { if (!saved) api.getLeads?.().then((r) => setLeads(Array.isArray(r) ? r : r?.data || [])).catch(() => {}); }, [saved]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const leadHits = useMemo(() => {
    const q = leadQ.trim().toLowerCase();
    if (!q) return [];
    return leads.filter((l) => `${l.company_name || l.name} ${l.country || ''} ${l.contact_person || ''}`.toLowerCase().includes(q)).slice(0, 6);
  }, [leadQ, leads]);
  const pickLead = async (l) => {
    setLeadQ('');
    try {
      const r = await docs(`/prefill?type=${d.type}&lead_id=${encodeURIComponent(l.id)}`);
      setD((x) => ({ ...r.data, items: x.items.some((it) => it.description) ? x.items : r.data.items, currency: x.currency || r.data.currency, incoterm: x.from_shipping ? x.incoterm : r.data.incoterm, from_shipping: x.from_shipping }));
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
  };

  const body = () => ({ ...d, items: d.items.map((it) => ({ ...it, qty: Number(it.qty) || 0, rate: Number(it.rate) || 0 })), charges: (d.charges || []).filter((c) => c.label && Number(c.amount)).map((c) => ({ ...c, amount: Number(c.amount) })) });
  const save = async () => {
    setBusy('save'); setMsg(null);
    try {
      const r = saved ? await docs(`/${d.id}`, 'PUT', body()) : await docs('', 'POST', body());
      setD(r.data);
      setMsg({ type: 'success', text: `${r.message}. Now download it or send it to the buyer.` });
      onSaved();
      return r.data;
    } catch (e) { setMsg({ type: 'error', text: e.message }); return null; } finally { setBusy(''); }
  };
  const ensureSaved = async () => (saved ? d : save());
  const markSent = async (doc, channel) => { try { const r = await docs(`/${doc.id}/sent`, 'POST', { channel }); setD(r.data); onSaved(); if (r.message) setBanner({ type: 'success', text: r.message }); } catch { /* the send itself worked */ } };
  const download = async () => {
    const doc = await ensureSaved(); if (!doc) return;
    setBusy('pdf');
    try {
      const blob = await pdfBlob(doc.id);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${TYPE[doc.type].replace(' ', '-')}-${doc.number}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      markSent(doc, 'download');
    } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const showPreview = async () => {
    const doc = await ensureSaved(); if (!doc) return;
    setBusy('preview');
    try { const blob = await pdfBlob(doc.id); if (preview) URL.revokeObjectURL(preview); setPreview(URL.createObjectURL(blob)); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const message = (doc) => `Dear ${doc.buyer.contact || 'Sir / Madam'},\n\nPlease find our ${TYPE[doc.type]} ${doc.number} for ${doc.items.map((it) => it.description).join(', ')}: ${money(doc.totals.total, doc.currency)}${doc.incoterm ? ` ${doc.incoterm}` : ''}.\n\n${doc.share_url}\n\nRegards`;
  const whatsapp = async () => {
    const doc = await ensureSaved(); if (!doc) return;
    const phone = String(doc.buyer.phone || '').replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message(doc))}`, '_blank', 'noopener');
    markSent(doc, 'whatsapp');
  };
  const email = async () => {
    const doc = await ensureSaved(); if (!doc) return;
    window.location.href = `mailto:${encodeURIComponent(doc.buyer.email || '')}?subject=${encodeURIComponent(`${TYPE[doc.type]} ${doc.number}`)}&body=${encodeURIComponent(message(doc))}`;
    markSent(doc, 'email');
  };
  const copyLink = async () => {
    const doc = await ensureSaved(); if (!doc) return;
    try { await navigator.clipboard.writeText(doc.share_url); setMsg({ type: 'success', text: 'Link copied. The buyer can open the PDF without logging in.' }); } catch { window.prompt('Copy this link', doc.share_url); }
    markSent(doc, 'link');
  };
  const convert = async () => {
    setBusy('convert');
    try { const r = await docs(`/${d.id}/convert`, 'POST'); setD(r.data); setPreview(''); setBanner({ type: 'success', text: r.message }); onSaved(); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(''); }
  };
  const setStatus = async (status) => { try { const r = await docs(`/${d.id}`, 'PUT', { status }); setD(r.data); onSaved(); } catch (e) { setMsg({ type: 'error', text: e.message }); } };

  return (
    <div className={`${card} p-4 sm:p-5 space-y-4`} data-doc-editor>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{saved ? `${TYPE[d.type]} ${d.number}` : `New ${TYPE[d.type].toLowerCase()}`}</h3>
          {saved && <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap"><span className={`px-2 py-0.5 rounded-full border font-bold capitalize ${STATUS[d.status]}`}>{d.status}</span>{d.views ? <span className="flex items-center gap-1"><Eye size={11} /> Buyer opened it {d.views}× (last {fmtDate(d.last_viewed_at)})</span> : d.sent_at ? <span>Not opened yet</span> : null}</div>}
        </div>
        <button className="p-1 text-slate-400 cursor-pointer" onClick={onClose} aria-label="Close"><X size={18} /></button>
      </div>

      {!saved && (
        <div className="relative" data-doc-lead-search>
          <label className={label}>Fill from a lead (optional)</label>
          <div className="relative"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input className={`${input} pl-8`} value={leadQ} onChange={(e) => setLeadQ(e.target.value)} placeholder="Type the buyer's company name…" aria-label="Search lead" /></div>
          {leadHits.length > 0 && <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">{leadHits.map((l) => <button key={l.id} type="button" onClick={() => pickLead(l)} className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 dark:hover:bg-slate-700 cursor-pointer"><b>{l.company_name || l.name}</b> <span className="text-slate-500">· {l.country || ''} · {(l.products || []).join(', ') || l.product || ''}</span></button>)}</div>}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
          <div className="text-[11px] font-bold text-emerald-700 uppercase">{d.type === 'proforma' ? 'Bill to / consignee' : 'Buyer'}</div>
          <div><label className={label}>Company *</label><input className={input} value={d.buyer.company} onChange={(e) => setBuyer({ company: e.target.value })} aria-label="Buyer company" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={label}>Contact person</label><input className={input} value={d.buyer.contact} onChange={(e) => setBuyer({ contact: e.target.value })} /></div>
            <div><label className={label}>Country</label><input className={input} value={d.buyer.country} onChange={(e) => setBuyer({ country: e.target.value })} /></div>
          </div>
          <div><label className={label}>Address</label><input className={input} value={d.buyer.address} onChange={(e) => setBuyer({ address: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={label}>City</label><input className={input} value={d.buyer.city} onChange={(e) => setBuyer({ city: e.target.value })} /></div>
            <div><label className={label}>Phone / WhatsApp</label><input className={input} value={d.buyer.phone} onChange={(e) => setBuyer({ phone: e.target.value })} /></div>
            <div><label className={label}>Email</label><input className={input} value={d.buyer.email} onChange={(e) => setBuyer({ email: e.target.value })} /></div>
          </div>
        </div>
        <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
          <div className="text-[11px] font-bold text-emerald-700 uppercase">Terms</div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={label}>Date</label><input type="date" className={input} value={d.date} onChange={(e) => set({ date: e.target.value })} /></div>
            <div><label className={label}>Valid until</label><input type="date" className={input} value={d.valid_until || ''} onChange={(e) => set({ valid_until: e.target.value })} /></div>
            <div><label className={label}>Buyer ref. / RFQ</label><input className={input} value={d.buyer_ref || ''} onChange={(e) => set({ buyer_ref: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={label}>Currency</label><select className={input} value={d.currency} onChange={(e) => set({ currency: e.target.value })} aria-label="Currency">{[...new Set([d.currency, ...CURRENCIES])].map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className={label}>Incoterm</label><select className={input} value={d.incoterm} onChange={(e) => set({ incoterm: e.target.value })} aria-label="Incoterm"><option value="">—</option>{INCOTERMS.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className={label}>Origin</label><input className={input} value={d.origin || ''} onChange={(e) => set({ origin: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={label}>Port of loading</label><input className={input} value={d.port_loading || ''} onChange={(e) => set({ port_loading: e.target.value })} /></div>
            <div><label className={label}>Port of discharge</label><input className={input} value={d.port_discharge || ''} onChange={(e) => set({ port_discharge: e.target.value })} /></div>
          </div>
          <div><label className={label}>Payment terms</label><input className={input} value={d.payment_terms || ''} onChange={(e) => set({ payment_terms: e.target.value })} placeholder="30% advance, 70% against copy of BL" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={label}>Delivery / shipment</label><input className={input} value={d.delivery || ''} onChange={(e) => set({ delivery: e.target.value })} placeholder="Within 3 weeks of advance" /></div>
            <div><label className={label}>Packing</label><input className={input} value={d.packing || ''} onChange={(e) => set({ packing: e.target.value })} placeholder="25 kg PP bags" /></div>
          </div>
        </div>
      </div>

      <div className="space-y-2" data-doc-items>
        <div className="text-[11px] font-bold text-emerald-700 uppercase">Products</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[760px]">
            <thead><tr className="text-left text-[10px] uppercase text-slate-500"><th className="py-1 pr-2 w-[34%]">Description *</th><th className="pr-2">Specs</th><th className="pr-2 w-24">HS code</th><th className="pr-2 w-20">Qty</th><th className="pr-2 w-24">Unit</th><th className="pr-2 w-28">Rate ({d.currency})</th><th className="text-right w-28">Amount</th><th className="w-8" /></tr></thead>
            <tbody>{d.items.map((it, i) => (
              <tr key={i} className="align-top">
                <td className="pr-2 py-1"><input className={input} value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} aria-label={`Product ${i + 1}`} /></td>
                <td className="pr-2 py-1"><input className={input} value={it.specs || ''} onChange={(e) => setItem(i, { specs: e.target.value })} placeholder="Grade, moisture…" /></td>
                <td className="pr-2 py-1"><input className={input} value={it.hs_code || ''} onChange={(e) => setItem(i, { hs_code: e.target.value })} /></td>
                <td className="pr-2 py-1"><input type="number" min="0" className={input} value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} aria-label={`Quantity ${i + 1}`} /></td>
                <td className="pr-2 py-1"><select className={input} value={it.unit} onChange={(e) => setItem(i, { unit: e.target.value })}>{[...new Set([it.unit, ...UNITS])].map((u) => <option key={u}>{u}</option>)}</select></td>
                <td className="pr-2 py-1"><input type="number" min="0" step="0.01" className={input} value={it.rate} onChange={(e) => setItem(i, { rate: e.target.value })} aria-label={`Rate ${i + 1}`} /></td>
                <td className="py-1 text-right font-semibold tabular-nums pt-3">{money((Number(it.qty) || 0) * (Number(it.rate) || 0), d.currency)}</td>
                <td className="py-1 pl-1"><button type="button" className="p-1.5 text-rose-500 cursor-pointer disabled:opacity-30" disabled={d.items.length === 1} onClick={() => set({ items: d.items.filter((_, j) => j !== i) })} aria-label={`Remove product ${i + 1}`}><Trash2 size={13} /></button></td>
              </tr>))}</tbody>
          </table>
        </div>
        <button type="button" className="text-[11px] font-bold text-emerald-700 cursor-pointer" onClick={() => set({ items: [...d.items, { description: '', specs: '', hs_code: '', qty: 0, unit: d.items[0]?.unit || 'MT', rate: 0 }] })}>+ Add product</button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className="space-y-2">
          <div><label className={label}>Notes (optional)</label><textarea className={`${input} min-h-[56px]`} value={d.notes || ''} onChange={(e) => set({ notes: e.target.value })} placeholder="e.g. Price includes ocean freight to Jebel Ali" /></div>
          <div><label className={label}>Terms & conditions</label><textarea className={`${input} min-h-[90px]`} value={d.terms || ''} onChange={(e) => set({ terms: e.target.value })} /></div>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 space-y-1.5 text-xs" data-doc-totals>
          <div className="flex justify-between"><span>Sub-total</span><b className="tabular-nums">{money(subtotal, d.currency)}</b></div>
          {(d.charges || []).map((c, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input className={`${input} !py-1`} value={c.label} onChange={(e) => setCharge(i, { label: e.target.value })} placeholder="Freight / Insurance / Discount" />
              <input type="number" step="0.01" className={`${input} !py-1 w-28 text-right`} value={c.amount} onChange={(e) => setCharge(i, { amount: e.target.value })} aria-label="Charge amount" />
              <button type="button" className="p-1 text-rose-500 cursor-pointer" onClick={() => set({ charges: d.charges.filter((_, j) => j !== i) })} aria-label="Remove charge"><X size={12} /></button>
            </div>
          ))}
          <button type="button" className="text-[11px] font-bold text-emerald-700 cursor-pointer" onClick={() => set({ charges: [...(d.charges || []), { label: '', amount: '' }] })}>+ Add charge or discount (use − for a discount)</button>
          <div className="flex justify-between border-t border-slate-300 dark:border-slate-600 pt-1.5 text-sm"><span className="font-bold">Total {d.incoterm ? `(${d.incoterm})` : ''}</span><b className="tabular-nums text-emerald-700">{money(total, d.currency)}</b></div>
        </div>
      </div>

      {msg && <Notice type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Notice>}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        <button className={primary} disabled={busy !== ''} onClick={save}>{busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {saved ? 'Save changes' : 'Save'}</button>
        <button className={secondary} disabled={busy !== ''} onClick={showPreview}>{busy === 'preview' ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} Preview PDF</button>
        <button className={secondary} disabled={busy !== ''} onClick={download}>{busy === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download PDF</button>
        <button className={`${btn} bg-[#25D366] hover:bg-[#1ebe5b] text-white`} disabled={busy !== ''} onClick={whatsapp}><Send size={14} /> WhatsApp</button>
        <button className={secondary} disabled={busy !== ''} onClick={email}><Mail size={14} /> Email</button>
        <button className={secondary} disabled={busy !== ''} onClick={copyLink}><Link2 size={14} /> Copy link</button>
        {saved && d.type === 'quotation' && <button className={secondary} disabled={busy !== ''} onClick={convert}>{busy === 'convert' ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />} Make proforma invoice</button>}
        {saved && <select className={`${input} !w-auto`} value={d.status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">{Object.keys(STATUS).map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select>}
      </div>
      {preview && <iframe title="PDF preview" src={preview} className="w-full h-[80vh] rounded-xl border border-slate-200" data-doc-preview />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Company details (letterhead)                                        */
/* ------------------------------------------------------------------ */

function CompanyDetails({ isOwner }) {
  const [p, setP] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [logo, setLogo] = useState(null);
  useEffect(() => { docs('/profile').then((r) => setP(r.data)).catch((e) => setMsg({ type: 'error', text: e.message })); }, []);
  if (!p) return <div className={`${card} p-5 text-xs text-slate-400 flex items-center gap-2`}><Loader2 size={14} className="animate-spin" /> Loading…</div>;
  const set = (x) => setP({ ...p, ...x });
  const setBank = (x) => setP({ ...p, bank: { ...(p.bank || {}), ...x } });
  const f = (k, l, ph, extra = {}) => <div {...extra}><label className={label}>{l}</label><input className={input} value={p[k] || ''} onChange={(e) => set({ [k]: e.target.value })} placeholder={ph} disabled={!isOwner} /></div>;
  const fb = (k, l, ph) => <div><label className={label}>{l}</label><input className={input} value={(p.bank || {})[k] || ''} onChange={(e) => setBank({ [k]: e.target.value })} placeholder={ph} disabled={!isOwner} /></div>;
  const save = async () => {
    setBusy(true); setMsg(null);
    try { const r = await docs('/profile', 'PUT', { ...p, logo: undefined, ...(logo ? { logo_data_url: logo } : {}) }); setP(r.data); setLogo(null); setMsg({ type: 'success', text: 'Saved. Every new PDF uses these details.' }); } catch (e) { setMsg({ type: 'error', text: e.message }); } finally { setBusy(false); }
  };
  const pickLogo = async (file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) { setMsg({ type: 'error', text: 'Use a JPG or PNG logo.' }); return; }
    if (file.size > 500 * 1024) { setMsg({ type: 'error', text: 'The logo is larger than 500 KB.' }); return; }
    setLogo(await readFile(file));
  };
  return (
    <div className="space-y-4 max-w-4xl" data-doc-company>
      {!isOwner && <Notice>Only the company owner can change these details.</Notice>}
      <div className={`${card} p-4 space-y-3`}>
        <h3 className="text-sm font-bold">Letterhead</h3>
        <div className="flex items-center gap-3">
          {(logo || p.logo?.url) ? <img src={logo || p.logo.url} alt="Logo" className="h-14 max-w-[140px] object-contain border rounded-lg p-1 bg-white" /> : <div className="h-14 w-24 rounded-lg border border-dashed flex items-center justify-center text-[10px] text-slate-400">No logo</div>}
          {isOwner && <label className={`${secondary} cursor-pointer`}><Upload size={13} /> Upload logo (JPG / PNG, max 500 KB)<input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => pickLogo(e.target.files[0])} aria-label="Upload logo" /></label>}
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {f('company_name', 'Company name (as on documents)', 'Nova Agro Exports Pvt Ltd')}
          {f('website', 'Website', 'www.yourcompany.com')}
          {f('address', 'Address', 'Street, city, state, PIN, country', { className: 'sm:col-span-2' })}
          {f('phone', 'Phone', '+91 …')}
          {f('email', 'Email', 'sales@…')}
          {f('gstin', 'GSTIN', '')}
          {f('iec', 'IEC (Import Export Code)', '')}
          {f('other_id', 'Other registration (optional)', 'APEDA / Spices Board / FSSAI no.')}
          {f('port_loading', 'Usual port of loading', 'Cochin, India')}
          {f('signatory', 'Signatory name', '')}
          {f('signatory_title', 'Signatory title', 'Director')}
        </div>
      </div>
      <div className={`${card} p-4 space-y-3`}>
        <h3 className="text-sm font-bold">Bank details <span className="font-normal text-[11px] text-slate-500">(printed on proforma invoices)</span></h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {fb('account_name', 'Beneficiary name', '')}{fb('bank_name', 'Bank name', '')}{fb('branch', 'Branch', '')}{fb('account_no', 'Account number', '')}
          {fb('swift', 'SWIFT code', '')}{fb('ifsc', 'IFSC', '')}{fb('ad_code', 'AD code', '')}{fb('intermediary', 'Intermediary / correspondent bank (optional)', '')}
        </div>
      </div>
      <div className={`${card} p-4 space-y-3`}>
        <h3 className="text-sm font-bold">Numbers and defaults</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {f('prefix_quotation', 'Quotation prefix', 'QT')}
          {f('prefix_proforma', 'Proforma prefix', 'PI')}
          <div><label className={label}>Default currency</label><select className={input} value={p.default_currency} onChange={(e) => set({ default_currency: e.target.value })} disabled={!isOwner}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className={label}>Valid for (days)</label><input type="number" min="1" className={input} value={p.valid_days} onChange={(e) => set({ valid_days: e.target.value })} disabled={!isOwner} /></div>
        </div>
        <div className="text-[11px] text-slate-500">Numbers look like {p.prefix_quotation || 'QT'}-{new Date().getFullYear()}-0001 and start again each year.</div>
        <div className="grid sm:grid-cols-2 gap-2">
          <div><label className={label}>Default terms – quotation</label><textarea className={`${input} min-h-[110px]`} value={p.terms_quotation || ''} onChange={(e) => set({ terms_quotation: e.target.value })} disabled={!isOwner} /></div>
          <div><label className={label}>Default terms – proforma invoice</label><textarea className={`${input} min-h-[110px]`} value={p.terms_proforma || ''} onChange={(e) => set({ terms_proforma: e.target.value })} disabled={!isOwner} /></div>
        </div>
      </div>
      {msg && <Notice type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Notice>}
      {isOwner && <button className={primary} disabled={busy} onClick={save}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save company details</button>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Quotations({ isOwner }) {
  const [tab, setTab] = useState('docs');
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [banner, setBanner] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => docs('').then((r) => { setList(r.data || []); setError(''); }).catch((e) => { setList([]); setError(e.message); }), []);
  useEffect(() => { load(); }, [load]);

  const startNew = useCallback(async (type, opts = {}) => {
    try {
      const r = await docs(`/prefill?type=${type}${opts.lead_id ? `&lead_id=${encodeURIComponent(opts.lead_id)}` : ''}`);
      let d = r.data;
      if (opts.shipping) {
        const s = opts.shipping;
        d = { ...d, currency: s.currency || d.currency, incoterm: s.incoterm || d.incoterm, from_shipping: true, items: [{ description: s.product || d.items[0]?.description || '', specs: d.items[0]?.specs || '', hs_code: '', qty: s.qty || d.items[0]?.qty || 0, unit: s.unit || 'MT', rate: s.rate || 0 }] };
      }
      setEditing(d);
      setTab('docs');
    } catch (e) { setBanner({ type: 'error', text: e.message }); }
  }, []);

  // Opened from a lead or from the Shipping calculator
  useEffect(() => {
    let p = null;
    try { p = JSON.parse(sessionStorage.getItem('crm_doc_prefill') || 'null'); sessionStorage.removeItem('crm_doc_prefill'); } catch { p = null; }
    if (p) startNew(p.type || 'quotation', p);
  }, [startNew]);
  useEffect(() => { if (!banner) return undefined; const t = setTimeout(() => setBanner(null), 8000); return () => clearTimeout(t); }, [banner]);

  const open = async (id) => { try { const r = await docs(`/${id}`); setEditing(r.data); } catch (e) { setBanner({ type: 'error', text: e.message }); } };
  const del = async (d) => {
    if (!window.confirm(`Delete ${d.number}? Its share link will stop working.`)) return;
    try { const r = await docs(`/${d.id}`, 'DELETE'); setBanner({ type: 'success', text: r.message }); load(); } catch (e) { setBanner({ type: 'error', text: e.message }); }
  };
  const shown = (list || []).filter((d) => (filter === 'all' || d.type === filter || d.status === filter) && (!q.trim() || `${d.number} ${d.buyer} ${d.country}`.toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <div className="w-full space-y-5 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Quotations</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Quotations and proforma invoices as PDF with your letterhead — send them on WhatsApp or email and see when the buyer opens them.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className={primary} onClick={() => startNew('quotation')}><Plus size={14} /> New quotation</button>
          <button className={secondary} onClick={() => startNew('proforma')}><Plus size={14} /> New proforma invoice</button>
        </div>
      </div>
      {banner && <Notice type={banner.type} onClose={() => setBanner(null)}>{banner.text}</Notice>}
      {error && <Notice type="error">{error}</Notice>}

      {editing ? (
        <Editor key={editing.id || 'new'} initial={editing} onClose={() => { setEditing(null); load(); }} onSaved={load} setBanner={setBanner} />
      ) : (
        <>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 w-fit" role="tablist">
            {[['docs', 'Documents', FileText], ['company', 'Company details', Building2]].map(([id, l, Icon]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${tab === id ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}><Icon size={14} /> {l}</button>
            ))}
          </div>
          {tab === 'company' ? <CompanyDetails isOwner={isOwner} /> : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input className={`${input} pl-8 w-56`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Number, buyer, country" aria-label="Search documents" /></div>
                {[['all', 'All'], ['quotation', 'Quotations'], ['proforma', 'Proforma invoices'], ['sent', 'Sent'], ['accepted', 'Accepted']].map(([k, l]) => <button key={k} className={`px-3 py-1 rounded-full text-[11px] font-semibold border cursor-pointer ${filter === k ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'}`} onClick={() => setFilter(k)}>{l}</button>)}
              </div>
              {!list ? <div className={`${card} p-5 text-xs text-slate-400 flex items-center gap-2`}><Loader2 size={14} className="animate-spin" /> Loading…</div> : shown.length === 0 ? (
                <div className={`${card} p-10 text-center`}><FileText size={28} className="mx-auto text-slate-300" /><div className="text-sm font-semibold mt-2">No documents yet</div><div className="text-xs text-slate-500 mt-1">Fill in Company details once, then make your first quotation — or open a lead and press "Quotation".</div></div>
              ) : (
                <div className={`${card} overflow-x-auto`}>
                  <table className="w-full text-xs min-w-[720px]" data-doc-list>
                    <thead><tr className="text-left text-[10px] uppercase text-slate-500 border-b border-slate-100 dark:border-slate-800"><th className="px-3 py-2">Number</th><th className="px-3">Buyer</th><th className="px-3">Date</th><th className="px-3 text-right">Total</th><th className="px-3">Status</th><th className="px-3">Made by</th><th /></tr></thead>
                    <tbody>{shown.map((d) => (
                      <tr key={d.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => open(d.id)} data-doc-row={d.number}>
                        <td className="px-3 py-2.5"><div className="font-bold">{d.number}</div><div className="text-[10px] text-slate-500">{TYPE[d.type]}</div></td>
                        <td className="px-3"><div className="font-semibold">{d.buyer}</div><div className="text-[10px] text-slate-500">{d.country}</div></td>
                        <td className="px-3">{fmtDate(d.date)}</td>
                        <td className="px-3 text-right font-semibold tabular-nums">{money(d.total, d.currency)} <span className="text-[10px] text-slate-500">{d.incoterm}</span></td>
                        <td className="px-3"><span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold capitalize ${STATUS[d.status]}`}>{d.status}</span></td>
                        <td className="px-3 text-slate-500">{d.created_by_name}</td>
                        <td className="px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button className="p-1.5 text-slate-500 hover:text-emerald-700 cursor-pointer" title="Copy the buyer link" aria-label={`Copy link of ${d.number}`} onClick={() => navigator.clipboard?.writeText(d.share_url).then(() => setBanner({ type: 'success', text: 'Link copied' }))}><Copy size={13} /></button>
                          <button className="p-1.5 text-rose-500 cursor-pointer" aria-label={`Delete ${d.number}`} onClick={() => del(d)}><Trash2 size={13} /></button>
                        </td>
                      </tr>))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Small block for a lead's detail window: its quotations / proformas + buttons to make one. */
export function LeadDocuments({ leadId }) {
  const [list, setList] = useState(null);
  useEffect(() => { let alive = true; docs(`?lead_id=${encodeURIComponent(leadId)}`).then((r) => alive && setList(r.data || [])).catch(() => alive && setList(null)); return () => { alive = false; }; }, [leadId]);
  if (list === null) return null;
  const go = (type) => { sessionStorage.setItem('crm_doc_prefill', JSON.stringify({ type, lead_id: leadId })); window.dispatchEvent(new CustomEvent('crm_navigate', { detail: { tab: 'quotes' } })); };
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2" data-lead-documents>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><FileText size={13} className="text-emerald-600" /> Quotations & proforma</div>
        <div className="flex gap-1.5"><button type="button" className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold cursor-pointer" onClick={() => go('quotation')}>+ Quotation</button><button type="button" className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold cursor-pointer" onClick={() => go('proforma')}>+ Proforma</button></div>
      </div>
      {list.length === 0 ? <div className="text-[11px] text-slate-500">None yet.</div> : list.map((d) => (
        <div key={d.id} className="flex items-center gap-2 text-[11px]">
          <span className={`px-1.5 py-0.5 rounded border font-bold capitalize ${STATUS[d.status]}`}>{d.status}</span>
          <span className="font-semibold">{d.number}</span>
          <span className="text-slate-500">{fmtDate(d.date)}</span>
          <span className="ml-auto font-semibold tabular-nums">{money(d.total, d.currency)} {d.incoterm}</span>
          <a href={d.share_url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold" aria-label={`Open ${d.number} PDF`}>PDF</a>
        </div>
      ))}
    </div>
  );
}
