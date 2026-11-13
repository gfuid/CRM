import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal';
import { api } from '../services/api';
import { PIPELINE_STAGES, LEAD_SOURCES } from '../data/leadOptions';
import {
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Lock,
} from 'lucide-react';

/**
 * Bulk import in three steps, so every lead enters the CRM in one fixed structure:
 *   1. Format  – the columns we accept, an example, and the template to download
 *   2. Upload  – the filled CSV file
 *   3. Review  – which columns were found, every row checked against the company rules,
 *                then Import (or Enter) saves only the rows that passed
 */

const UNITS = ['MT', 'kg', 'Quintal', 'lbs', 'Containers', 'Bags'];
// Local calendar date (toISOString would give yesterday's date early in the morning in India)
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// One row per column of the template. `ownerOnly` columns are skipped for staff.
const buildColumns = (commodities) => [
  { key: 'company', header: 'Company Name', aliases: ['company', 'name'], required: true, rule: 'Buyer company name. Must be unique.', example: ['Al-Zahra Trading LLC', 'Global Agri Impex BV'] },
  { key: 'country', header: 'Country', aliases: [], rule: 'Country of the buyer.', example: ['United Arab Emirates', 'Netherlands'] },
  { key: 'contact', header: 'Contact Person', aliases: ['contact', 'contactname'], rule: 'Name of the person you deal with.', example: ['Ahmed Al-Mansoor', 'Lars Janssen'] },
  { key: 'phone', header: 'Phone', aliases: ['mobile', 'phonenumber'], rule: 'With country code.', example: ['+971 50 111 2222', '+31 20 555 4321'] },
  { key: 'email', header: 'Email', aliases: ['emailid', 'workemail'], rule: 'A valid email address.', example: ['ahmed@alzahra.ae', 'lars@globalagri.nl'] },
  { key: 'whatsapp', header: 'WhatsApp', aliases: ['whatsappnumber', 'zalo'], rule: 'WhatsApp / Zalo number. Blank = same as Phone.', example: ['+971 50 111 2222', ''] },
  { key: 'website', header: 'Website', aliases: ['url'], rule: 'Company website.', example: ['https://alzahra.ae', 'https://globalagri.nl'] },
  { key: 'source', header: 'Lead Source', aliases: ['source'], rule: `One of: ${LEAD_SOURCES.join(', ')}. Blank = Direct Inquiry.`, example: ['Customs Data', 'Trade Fair'] },
  { key: 'products', header: 'Products', aliases: ['product', 'commodity', 'commodities'], rule: `From your product list, separated by commas: ${commodities.join(', ')}.`, example: [commodities[0] || 'Turmeric', commodities.slice(1, 3).join(', ') || 'Rice DDGS'] },
  { key: 'quantity', header: 'Quantity', aliases: ['qty', 'volume'], rule: 'A number only.', example: ['40', '80'] },
  { key: 'unit', header: 'Unit', aliases: ['quantityunit'], rule: `One of: ${UNITS.join(', ')}. Blank = MT.`, example: ['MT', 'MT'] },
  { key: 'value', header: 'Deal Value USD', aliases: ['dealvalue', 'price', 'value'], ownerOnly: true, rule: 'A number only, in US dollars.', example: ['68000', '95000'] },
  { key: 'stage', header: 'Stage', aliases: ['pipelinestage', 'status'], rule: `One of: ${PIPELINE_STAGES.join(', ')}. Blank = Lead Generation.`, example: ['Lead Generation', 'Sample Sent'] },
  { key: 'incoterm', header: 'Incoterm', aliases: [], ownerOnly: true, rule: 'e.g. FOB, CIF, CFR.', example: ['CIF', 'FOB'] },
  { key: 'port', header: 'Port Delivery', aliases: ['port', 'portofdelivery'], ownerOnly: true, rule: 'Destination port.', example: ['Jebel Ali Port', 'Rotterdam'] },
  { key: 'rep', header: 'Assigned Rep', aliases: ['assignedto', 'staff'], ownerOnly: true, rule: 'Exact name of a staff member. Blank = you.', example: ['', ''] },
  { key: 'followup', header: 'Follow-up Date', aliases: ['followup', 'nextfollowupdate'], rule: 'YYYY-MM-DD or DD-MM-YYYY. Blank = today.', example: [isoDate(new Date(Date.now() + 5 * 864e5)), isoDate(new Date(Date.now() + 3 * 864e5))] },
  { key: 'remarks', header: 'Remarks', aliases: ['todayremarks', 'remark'], rule: 'What was discussed so far.', example: ['Asked for price list', 'Feed grade analysis sent'] },
  { key: 'nextaction', header: 'Next Action', aliases: ['plannedaction'], rule: 'What to do on the follow-up date.', example: ['Send quotation', 'Call for sample feedback'] },
  { key: 'notes', header: 'Notes', aliases: ['note'], rule: 'Any extra note.', example: ['', ''] },
];

// CSV text -> { headers, rows }. Handles quoted cells, commas and line breaks inside quotes, and Excel's BOM.
const parseCsv = (text) => {
  const src = String(text || '').replace(/^﻿/, '');
  const table = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      table.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); table.push(row); }
  const clean = table.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ''));
  return { headers: clean[0] || [], rows: clean.slice(1) };
};

const toIsoDate = (value) => {
  const v = String(value || '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  let y; let mo; let d;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else {
    m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(v);
    if (!m) return null;
    d = +m[1]; mo = +m[2]; y = +m[3];
  }
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};
const toNumber = (value) => {
  const v = String(value || '').replace(/[,\s$]/g, '');
  if (v === '') return 0;
  return /^\d+(\.\d+)?$/.test(v) ? Number(v) : null;
};
const pickFrom = (list, value) => list.find((item) => same(item, value));

const escapeCsv = (val) => `"${String(val == null ? '' : val).replace(/"/g, '""')}"`;

export default function BulkImportModal({ isOpen, onClose, isOwner, profile, teamList = [], commodities = [], existingNames = [], onImported }) {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [parsed, setParsed] = useState(null); // { headers, rows }
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null); // { imported, failed: [] }
  const fileInput = useRef(null);

  const columns = useMemo(
    () => buildColumns(commodities).filter((c) => isOwner || !c.ownerOnly),
    [commodities, isOwner]
  );
  const lockedColumns = useMemo(
    () => (isOwner ? [] : buildColumns(commodities).filter((c) => c.ownerOnly)),
    [commodities, isOwner]
  );

  // Start fresh every time the window opens
  useEffect(() => {
    if (isOpen) {
      setStep(1); setFileName(''); setFileError(''); setParsed(null); setImporting(false); setResult(null);
    }
  }, [isOpen]);

  const downloadTemplate = () => {
    const lines = [
      columns.map((c) => escapeCsv(c.header)).join(','),
      columns.map((c) => escapeCsv(c.example[0])).join(','),
      columns.map((c) => escapeCsv(c.example[1])).join(','),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + lines], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'lead_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const readFile = (file) => {
    if (!file) return;
    setFileError('');
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      setFileError('Please choose a .csv file. In Excel use File → Save As → CSV (Comma delimited).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = parseCsv(e.target.result);
      if (!data.headers.length || !data.rows.length) {
        setFileError('This file has no data rows. Fill the template and upload it again.');
        return;
      }
      const hasCompany = data.headers.some((h) => {
        const col = buildColumns(commodities)[0];
        return [col.header, ...col.aliases].some((a) => norm(a) === norm(h));
      });
      if (!hasCompany) {
        setFileError('The "Company Name" column was not found. Please use the template from step 1 without renaming its headings.');
        return;
      }
      if (data.rows.length > 500) {
        setFileError(`This file has ${data.rows.length} rows. Please import at most 500 leads at a time.`);
        return;
      }
      setFileName(file.name);
      setParsed(data);
      setStep(3);
    };
    reader.onerror = () => setFileError('The file could not be read. Please try again.');
    reader.readAsText(file);
  };

  // Match the file's headings to our columns, then check every row
  const review = useMemo(() => {
    if (!parsed) return null;
    const all = buildColumns(commodities);
    const indexOf = {};
    const usedHeaderIdx = new Set();
    all.forEach((col) => {
      const names = [col.header, ...col.aliases].map(norm);
      const idx = parsed.headers.findIndex((h, i) => !usedHeaderIdx.has(i) && names.includes(norm(h)));
      if (idx >= 0) { indexOf[col.key] = idx; usedHeaderIdx.add(idx); }
    });
    const found = columns.filter((c) => indexOf[c.key] !== undefined);
    const missing = columns.filter((c) => indexOf[c.key] === undefined);
    const lockedFound = lockedColumns.filter((c) => indexOf[c.key] !== undefined);
    const unknown = parsed.headers.filter((h, i) => !usedHeaderIdx.has(i) && h);

    const today = isoDate(new Date());
    const existing = new Set(existingNames.map((n) => String(n || '').trim().toLowerCase()).filter(Boolean));
    const seen = new Map();

    const rows = parsed.rows.map((cells, rowIdx) => {
      const raw = (key) => (indexOf[key] !== undefined && columns.some((c) => c.key === key) ? String(cells[indexOf[key]] || '').trim() : '');
      const errors = {}; // column key -> message
      const company = raw('company');
      if (!company) errors.company = 'Company Name is empty';
      else {
        const k = company.toLowerCase().replace(/\s+/g, ' ');
        if (existing.has(k)) errors.company = 'Already in your CRM';
        else if (seen.has(k)) errors.company = `Same company as row ${seen.get(k)}`;
        else seen.set(k, rowIdx + 2);
      }
      const email = raw('email');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Not a valid email';

      let source = raw('source');
      if (source) {
        const hit = pickFrom(LEAD_SOURCES, source);
        if (hit) source = hit; else errors.source = 'Not in the lead source list';
      } else source = 'Direct Inquiry';

      let stage = raw('stage');
      if (stage) {
        const hit = pickFrom(PIPELINE_STAGES, stage);
        if (hit) stage = hit; else errors.stage = 'Not a pipeline stage';
      } else stage = 'Lead Generation';

      const productNames = raw('products').split(',').map((p) => p.trim()).filter(Boolean);
      const products = [];
      const badProducts = [];
      productNames.forEach((p) => {
        const hit = pickFrom(commodities, p);
        if (hit) { if (!products.includes(hit)) products.push(hit); } else badProducts.push(p);
      });
      if (badProducts.length) errors.products = `Not in your product list: ${badProducts.join(', ')}`;

      const quantity = toNumber(raw('quantity'));
      if (quantity === null) errors.quantity = 'Quantity must be a number';
      let unit = raw('unit');
      if (unit) {
        const hit = pickFrom(UNITS, unit);
        if (hit) unit = hit; else errors.unit = `Unit must be one of ${UNITS.join(', ')}`;
      } else unit = 'MT';
      const value = toNumber(raw('value'));
      if (value === null) errors.value = 'Deal value must be a number';

      let followUp = raw('followup');
      if (followUp) {
        const iso = toIsoDate(followUp);
        if (iso) followUp = iso; else errors.followup = 'Use YYYY-MM-DD or DD-MM-YYYY';
      } else followUp = today;

      let assignedTo = profile?.id || '';
      const rep = raw('rep');
      if (rep) {
        const member = teamList.find((t) => same(t.name, rep)) || (same(profile?.name, rep) ? profile : null);
        if (member) assignedTo = member.id; else errors.rep = 'No staff member with this name';
      }

      const phone = raw('phone');
      const payload = {
        company_name: company,
        name: company,
        country: raw('country'),
        contacts: [{ name: raw('contact'), phone, extra_phones: [], email, designation: '', linkedin: '' }],
        contact_person: raw('contact'),
        phone,
        email,
        whatsapp: raw('whatsapp') || phone,
        website: raw('website'),
        source,
        stage,
        follow_up_date: followUp,
        follow_up_time: '10:00',
        today_remarks: raw('remarks') || 'Imported from bulk upload',
        next_follow_up_action: raw('nextaction') || 'First contact with buyer',
        notes: raw('notes'),
        ...(products.length || quantity ? {
          products,
          product: products.join(', '),
          quantity: quantity || 0,
          quantity_unit: unit,
        } : {}),
        ...(isOwner ? {
          type: 'Export',
          price: value || 0,
          value: value || 0,
          export_requirements: { quantity_unit: unit, incoterm: raw('incoterm'), port_delivery: raw('port') },
          assigned_to: assignedTo,
        } : {}),
      };
      // What the review table shows for each column (after defaults are applied)
      const shown = {
        company, country: raw('country'), contact: raw('contact'), phone, email, whatsapp: raw('whatsapp'), website: raw('website'),
        source: errors.source ? raw('source') : source,
        products: errors.products ? raw('products') : products.join(', '),
        quantity: raw('quantity'), unit: errors.unit ? raw('unit') : (raw('quantity') ? unit : ''),
        value: raw('value'), stage: errors.stage ? raw('stage') : stage, incoterm: raw('incoterm'), port: raw('port'), rep,
        followup: errors.followup ? raw('followup') : followUp,
        remarks: raw('remarks'), nextaction: raw('nextaction'), notes: raw('notes'),
      };
      return { line: rowIdx + 2, payload, shown, errors, ok: Object.keys(errors).length === 0 };
    });

    return { found, missing, lockedFound, unknown, rows, ready: rows.filter((r) => r.ok), bad: rows.filter((r) => !r.ok) };
  }, [parsed, columns, lockedColumns, commodities, existingNames, teamList, profile, isOwner]);

  const runImport = async () => {
    if (!review || review.ready.length === 0 || importing) return;
    setImporting(true);
    const added = [];
    const failed = [];
    for (const row of review.ready) {
      try {
        const res = await api.createLead(row.payload);
        if (res?.data?.id) added.push(res.data);
        else failed.push({ line: row.line, name: row.payload.company_name, reason: res?.message || 'not saved' });
      } catch (err) {
        // A lead the server did not save is never shown as imported
        failed.push({ line: row.line, name: row.payload.company_name, reason: err?.message || 'not saved' });
      }
    }
    if (added.length && onImported) onImported(added);
    setResult({ imported: added.length, failed, skipped: review.bad.length });
    setImporting(false);
    setStep(4);
  };

  // Step 3: Enter imports the checked rows
  useEffect(() => {
    if (!isOpen || step !== 3) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      // Enter on Cancel / Back must do what that button says
      const btn = e.target?.closest?.('button');
      if (btn && btn.id !== 'bulk-import-run') return;
      e.preventDefault();
      runImport();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, step, review, importing]);

  const steps = ['Format', 'Upload', 'Review & Import'];
  const shownStep = Math.min(step, 3);
  const th = 'px-2.5 py-2 text-left text-[10px] uppercase tracking-wide font-bold text-slate-500 whitespace-nowrap';
  const td = 'px-2.5 py-1.5 text-[11px] text-slate-700 whitespace-nowrap';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Import Leads"
      subtitle="Three steps: check the format, upload your file, review and import"
      maxWidth="max-w-5xl"
      footer={(
        <ImportButtons
          step={step}
          setStep={setStep}
          setFileError={setFileError}
          importing={importing}
          onClose={onClose}
          review={review}
          runImport={runImport}
        />
      )}
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs font-bold">
        {steps.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = shownStep === n && step <= 3;
          return (
            <React.Fragment key={label}>
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${active ? 'bg-emerald-600 text-white border-emerald-600' : done ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                <span className={`min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] ${active ? 'bg-white text-emerald-700' : done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{done ? '✓' : n}</span>
                <span className="whitespace-nowrap">{label}</span>
              </div>
              {n < steps.length && <div className="flex-1 h-px bg-slate-200 min-w-[12px]" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* STEP 1: FORMAT */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-900">Every import must use this format</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Download the template, fill one lead per row in Excel or Google Sheets, and save it as CSV. Do not rename the headings.</div>
            </div>
            <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shrink-0 cursor-pointer">
              <Download size={14} />
              <span>Download template (.csv)</span>
            </button>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-800 mb-1.5">How the file looks (example)</div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="min-w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>{columns.map((c) => <th key={c.key} className={th}>{c.header}{c.required && <span className="text-rose-500"> *</span>}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[0, 1].map((r) => (
                    <tr key={r}>{columns.map((c) => <td key={c.key} className={td}>{c.example[r] || <span className="text-slate-300">—</span>}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-800 mb-1.5">Rules for each column</div>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {columns.map((c) => (
                <div key={c.key} className="px-3 py-2 flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 text-[11px]">
                  <span className="sm:w-40 shrink-0 font-bold text-slate-800">
                    {c.header} {c.required ? <span className="text-rose-600 font-extrabold">(required)</span> : <span className="text-slate-400 font-medium">(optional)</span>}
                  </span>
                  <span className="text-slate-600">{c.rule}</span>
                </div>
              ))}
            </div>
            {lockedColumns.length > 0 && (
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                <Lock size={11} className="text-slate-400" />
                Only your company owner can import: {lockedColumns.map((c) => c.header).join(', ')}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: UPLOAD */}
      {step === 2 && (
        <div className="space-y-3">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); readFile(e.dataTransfer.files?.[0]); }}
            onClick={() => fileInput.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-white"
          >
            <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ''; }} />
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <FileSpreadsheet size={24} />
            </div>
            <div className="text-sm font-bold text-slate-800">Click to choose your filled CSV file, or drop it here</div>
            <p className="text-xs text-slate-400 mt-1">Nothing is imported yet. You will see every row first.</p>
          </div>
          {fileError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{fileError}</span>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: REVIEW */}
      {step === 3 && review && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div className="text-[10px] uppercase font-bold text-slate-400">File</div>
              <div className="font-bold text-slate-800 truncate">{fileName}</div>
              <div className="text-slate-500">{review.rows.length} rows</div>
            </div>
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50">
              <div className="text-[10px] uppercase font-bold text-emerald-700">Ready to import</div>
              <div className="text-lg font-black text-emerald-800 leading-tight">{review.ready.length}</div>
            </div>
            <div className={`p-3 rounded-xl border ${review.bad.length ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className={`text-[10px] uppercase font-bold ${review.bad.length ? 'text-rose-700' : 'text-slate-400'}`}>Will not be imported</div>
              <div className={`text-lg font-black leading-tight ${review.bad.length ? 'text-rose-700' : 'text-slate-400'}`}>{review.bad.length}</div>
            </div>
          </div>

          {/* Which columns the file has */}
          <div className="p-3 rounded-xl border border-slate-200 space-y-1.5">
            <div className="text-xs font-bold text-slate-800">Columns in your file</div>
            <div className="flex flex-wrap gap-1.5">
              {review.found.map((c) => (
                <span key={c.key} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">✓ {c.header}</span>
              ))}
              {review.missing.map((c) => (
                <span key={c.key} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-50 text-slate-400 border border-slate-200">{c.header}: not in file</span>
              ))}
            </div>
            {review.unknown.length > 0 && (
              <p className="text-[11px] text-amber-700 font-medium">Ignored (not part of the format): {review.unknown.join(', ')}</p>
            )}
            {review.lockedFound.length > 0 && (
              <p className="text-[11px] text-amber-700 font-medium">Skipped (owner only): {review.lockedFound.map((c) => c.header).join(', ')}</p>
            )}
          </div>

          {/* Every row, with what is wrong */}
          <div className="overflow-auto border border-slate-200 rounded-xl max-h-72">
            <table className="min-w-full">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className={th}>Row</th>
                  <th className={th}>Status</th>
                  {review.found.map((c) => <th key={c.key} className={th}>{c.header}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {review.rows.map((row) => (
                  <tr key={row.line} className={row.ok ? '' : 'bg-rose-50/50'}>
                    <td className={`${td} text-slate-400`}>{row.line}</td>
                    <td className={td}>
                      {row.ok ? (
                        <span className="text-emerald-700 font-bold">Ready</span>
                      ) : (
                        <span className="text-rose-700 font-bold whitespace-normal block min-w-[160px]">{Object.values(row.errors).join('; ')}</span>
                      )}
                    </td>
                    {review.found.map((c) => (
                      <td key={c.key} className={`${td} ${row.errors[c.key] ? 'bg-rose-100 text-rose-800 font-bold' : ''}`} title={row.errors[c.key] || ''}>
                        {row.shown[c.key] || <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">
            {review.bad.length > 0
              ? 'Rows in red break a rule and will be left out. Fix them in your file and upload again, or import only the ready rows.'
              : 'All rows follow the format.'}
            {review.ready.length > 0 && ' Press Enter or the Import button to save.'}
          </p>
        </div>
      )}

      {/* STEP 4: RESULT */}
      {step === 4 && result && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center gap-2.5 text-sm font-bold text-emerald-900">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{result.imported} lead{result.imported === 1 ? '' : 's'} imported.</span>
          </div>
          {result.skipped > 0 && (
            <p className="text-xs text-slate-600">{result.skipped} row{result.skipped === 1 ? '' : 's'} left out because they broke a rule (shown in red in the review).</p>
          )}
          {result.failed.length > 0 && (
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 space-y-1 max-h-48 overflow-y-auto">
              <div className="font-bold">{result.failed.length} row{result.failed.length === 1 ? ' was' : 's were'} not saved by the server:</div>
              {result.failed.map((f) => (
                <div key={f.line}>Row {f.line} ({f.name}): {f.reason}</div>
              ))}
            </div>
          )}
        </div>
      )}

    </Modal>
  );
}

// Always visible under the scrolling content
function ImportButtons({ step, setStep, setFileError, importing, onClose, review, runImport }) {
  return (
      <div className="w-full flex items-center justify-between gap-3">
        <div>
          {(step === 2 || step === 3) && (
            <button type="button" disabled={importing} onClick={() => { setFileError(''); setStep(step - 1); }} className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer disabled:opacity-50">
              <ArrowLeft size={13} /> {step === 3 ? 'Upload another file' : 'Back to format'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={importing} onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer disabled:opacity-50">
            {step === 4 ? 'Close' : 'Cancel'}
          </button>
          {step === 1 && (
            <button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer">
              My file is ready <ArrowRight size={13} />
            </button>
          )}
          {step === 3 && review && (
            <button
              id="bulk-import-run"
              type="button"
              disabled={importing || review.ready.length === 0}
              onClick={runImport}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl cursor-pointer"
            >
              {importing ? (
                <><span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Importing…</>
              ) : (
                <><Upload size={14} /> Import {review.ready.length} lead{review.ready.length === 1 ? '' : 's'}</>
              )}
            </button>
          )}
        </div>
      </div>
  );
}
