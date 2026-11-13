import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal';
import { api } from '../services/api';
import { PIPELINE_STAGES, LEAD_SOURCES } from '../data/leadOptions';
import { buildColumns, parseCsv, templateCsv, fileProblem, reviewImport } from '../data/leadImport';
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

export default function BulkImportModal({ isOpen, onClose, isOwner, profile, teamList = [], commodities = [], existingNames = [], onImported }) {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [parsed, setParsed] = useState(null); // { headers, rows }
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null); // { imported, failed: [] }
  const fileInput = useRef(null);

  const allColumns = useMemo(
    () => buildColumns({ commodities, leadSources: LEAD_SOURCES, stages: PIPELINE_STAGES }),
    [commodities]
  );
  const columns = useMemo(() => allColumns.filter((c) => isOwner || !c.ownerOnly), [allColumns, isOwner]);
  const lockedColumns = useMemo(() => (isOwner ? [] : allColumns.filter((c) => c.ownerOnly)), [allColumns, isOwner]);

  // Start fresh every time the window opens
  useEffect(() => {
    if (isOpen) {
      setStep(1); setFileName(''); setFileError(''); setParsed(null); setImporting(false); setResult(null);
    }
  }, [isOpen]);

  const downloadTemplate = () => {
    // The leading BOM makes Excel open the file as UTF-8
    const url = URL.createObjectURL(new Blob([String.fromCharCode(0xFEFF) + templateCsv(columns)], { type: 'text/csv;charset=utf-8;' }));
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
      const problem = fileProblem(data);
      if (problem) {
        setFileError(problem);
        return;
      }
      setFileName(file.name);
      setParsed(data);
      setStep(3);
    };
    reader.onerror = () => setFileError('The file could not be read. Please try again.');
    reader.readAsText(file);
  };

  // Match the file's headings to our columns, then check every row (rules live in data/leadImport.js)
  const review = useMemo(() => {
    if (!parsed) return null;
    return reviewImport(parsed, { isOwner, profile, teamList, commodities, existingNames, leadSources: LEAD_SOURCES, stages: PIPELINE_STAGES });
  }, [parsed, commodities, existingNames, teamList, profile, isOwner]);

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
