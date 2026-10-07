import { useId, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { STAGES } from '../../lib/constants';
import { downloadBlob, formatNumber } from '../../lib/format';
import { Badge, Button, Modal } from '../ui';
import { IMPORT_FIELDS, mapHeaders, parseCsv, rowToLead, TEMPLATE_HEADERS, toCsv } from './csv';

const MAX_ROWS = 2000;
const CHUNK = 500;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const PREVIEW_ROWS = 5;
const PREVIEW_FIELDS = ['name', 'contact_person', 'email', 'phone', 'country', 'products', 'stage', 'value'];

const fieldLabel = (key) => IMPORT_FIELDS.find((f) => f.key === key)?.label || key;

const downloadTemplate = () => {
  downloadBlob(new Blob([toCsv([TEMPLATE_HEADERS])], { type: 'text/csv;charset=utf-8' }), 'leads-import-template.csv');
};

/** Reads the file and works out which columns we can use. Throws with a user-facing message. */
async function readFile(file) {
  if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
    throw new Error('Choose a .csv file. In Excel or Google Sheets, use File › Download / Save as › CSV.');
  }
  if (file.size > MAX_FILE_BYTES) throw new Error('This file is larger than 5 MB. Split it into smaller files.');
  const text = await file.text();
  const table = parseCsv(text);
  if (table.length < 2) throw new Error('This file has no rows under the header row.');
  const headers = table[0];
  const { mapping, recognised, ignored } = mapHeaders(headers);
  if (!mapping.includes('name')) {
    throw new Error('We couldn’t find a company name column. Name the column “Company name” (or “Company” / “Name”) and try again.');
  }
  const warnings = { stage: 0, priority: 0, date: 0, number: 0 };
  const rows = [];
  table.slice(1).forEach((cells, i) => {
    if (!cells.some((c) => String(c).trim())) return; // skip empty lines
    rows.push({ line: i + 2, lead: rowToLead(cells, mapping, warnings) });
  });
  if (!rows.length) throw new Error('This file has no rows under the header row.');
  return { fileName: file.name, recognised, ignored, rows, warnings, mappedFields: mapping.filter(Boolean) };
}

function Stat({ label, value, tone }) {
  const tones = { primary: 'bg-primary-soft text-primary-ink', warning: 'bg-warning-soft text-warning-ink', danger: 'bg-danger-soft text-danger-ink' };
  return (
    <div className={`rounded-lg px-3 py-2.5 ${tones[tone]}`}>
      <div className="text-xl font-bold tabular">{formatNumber(value)}</div>
      <div className="text-xs font-semibold">{label}</div>
    </div>
  );
}

function IssueList({ title, items }) {
  if (!items.length) return null;
  return (
    <section>
      <h4 className="mb-1.5 text-[13px] font-semibold text-ink">{title}</h4>
      <ul className="max-h-48 divide-y divide-line overflow-y-auto rounded-lg text-[13px] ring-1 ring-inset ring-line">
        {items.map((it, i) => (
          <li key={i} className="flex gap-3 px-3 py-2">
            <span className="w-16 shrink-0 font-semibold tabular text-muted">{it.line ? `Row ${it.line}` : '—'}</span>
            <span className="min-w-0 break-words text-ink">
              {it.name ? <span className="font-semibold">{it.name}: </span> : null}
              {it.reason}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ImportInner({ onClose, onImported }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const inputId = useId();
  const [parsed, setParsed] = useState(null);
  const [readError, setReadError] = useState('');
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  const importing = Boolean(progress);
  const tooMany = parsed && parsed.rows.length > MAX_ROWS;

  const pick = async (file) => {
    if (!file) return;
    setReading(true);
    setReadError('');
    setParsed(null);
    setResult(null);
    try {
      setParsed(await readFile(file));
    } catch (err) {
      setReadError(err.message || 'We couldn’t read this file.');
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const runImport = async () => {
    const rows = parsed.rows;
    const total = rows.length;
    let created = 0;
    const skipped = [];
    const errors = [];
    setProgress({ done: 0, total });
    for (let start = 0; start < total; start += CHUNK) {
      const chunk = rows.slice(start, start + CHUNK);
      try {
        const res = await api.importLeads(chunk.map((r) => r.lead));
        created += res?.created || 0;
        for (const s of res?.skipped || []) skipped.push({ line: chunk[s.row - 1]?.line, name: s.name, reason: s.reason });
        for (const e of res?.errors || []) errors.push({ line: chunk[e.row - 1]?.line, reason: e.reason });
      } catch (err) {
        const rest = rows.slice(start);
        errors.push({
          line: null,
          reason: `Rows ${rest[0].line} to ${rest[rest.length - 1].line} were not imported: ${err.message}`,
        });
        break;
      }
      setProgress({ done: Math.min(start + CHUNK, total), total });
    }
    setProgress(null);
    setResult({ created, skipped, errors });
    if (created) onImported?.(created);
    if (errors.length) toast.error(`Imported ${formatNumber(created)} leads. Some rows could not be imported — see the details.`);
    else toast.success(`Imported ${formatNumber(created)} leads`);
  };

  const warningText = parsed
    ? [
        parsed.warnings.stage && `${formatNumber(parsed.warnings.stage)} rows have a stage we don’t recognise. They will start in Lead Generation.`,
        parsed.warnings.priority && `${formatNumber(parsed.warnings.priority)} rows have an unknown priority. They will be set to Medium.`,
        parsed.warnings.date && `${formatNumber(parsed.warnings.date)} follow-up dates couldn’t be read and will be left empty. Use YYYY-MM-DD or DD/MM/YYYY.`,
        parsed.warnings.number && `${formatNumber(parsed.warnings.number)} quantity, price or value cells aren’t numbers and will be left empty.`,
      ].filter(Boolean)
    : [];

  const previewFields = parsed ? PREVIEW_FIELDS.filter((k) => parsed.mappedFields.includes(k)) : [];

  const footer = result ? (
    <>
      <Button
        onClick={() => {
          setResult(null);
          setParsed(null);
        }}
      >
        Import another file
      </Button>
      <Button variant="primary" onClick={onClose}>
        Done
      </Button>
    </>
  ) : (
    <>
      <Button onClick={onClose} disabled={importing}>
        Cancel
      </Button>
      <Button variant="primary" icon={Upload} onClick={runImport} loading={importing} disabled={!parsed || tooMany || reading}>
        {parsed && !tooMany ? `Import ${formatNumber(parsed.rows.length)} leads` : 'Import'}
      </Button>
    </>
  );

  return (
    <Modal
      open
      onClose={importing ? () => {} : onClose}
      title="Import leads from CSV"
      description="Add many leads at once from a spreadsheet. Duplicates of leads you already have are skipped."
      size="lg"
      footer={footer}
    >
      {result ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
            Import finished
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Leads added" value={result.created} tone="primary" />
            <Stat label="Duplicates skipped" value={result.skipped.length} tone="warning" />
            <Stat label="Errors" value={result.errors.length} tone="danger" />
          </div>
          {result.created > 0 && <p className="text-[13px] text-muted">New leads are assigned to you. You can reassign them from the Leads page.</p>}
          <IssueList title="Skipped duplicates" items={result.skipped} />
          <IssueList title="Errors" items={result.errors} />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-lg bg-subtle/60 p-3 text-[13px] text-muted ring-1 ring-inset ring-line">
            <p>
              The first row must be the column names. Only <span className="font-semibold text-ink">Company name</span> is required. Put several
              products in one cell separated by a semicolon (;). Stage must be one of: {STAGES.map((s) => s.key).join(', ')}. Up to{' '}
              {formatNumber(MAX_ROWS)} rows per file.
            </p>
            <Button size="sm" variant="ghost" icon={Download} onClick={downloadTemplate} className="-ml-2 mt-2">
              Download template
            </Button>
          </div>

          <div>
            <label
              htmlFor={inputId}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary-soft/30 focus-within:border-primary"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!importing) pick(e.dataTransfer.files?.[0]);
              }}
            >
              <FileSpreadsheet className="h-8 w-8 text-faint" aria-hidden />
              <span className="text-sm font-semibold text-ink">{reading ? 'Reading file…' : parsed ? parsed.fileName : 'Choose a CSV file'}</span>
              <span className="text-xs text-muted">{parsed ? 'Click to choose a different file' : 'Click to browse, or drop the file here'}</span>
              <input
                ref={inputRef}
                id={inputId}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                disabled={importing}
                onChange={(e) => pick(e.target.files?.[0])}
              />
            </label>
            {readError && (
              <p role="alert" className="mt-2 flex items-start gap-2 text-[13px] font-medium text-danger">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {readError}
              </p>
            )}
          </div>

          {parsed && (
            <>
              {tooMany && (
                <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] font-medium text-danger-ink">
                  This file has {formatNumber(parsed.rows.length)} rows. You can import up to {formatNumber(MAX_ROWS)} rows at a time. Split the file
                  and import each part.
                </p>
              )}

              <section>
                <h4 className="mb-1.5 text-[13px] font-semibold text-ink">Columns we will use ({parsed.recognised.length})</h4>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.recognised.map((r) => (
                    <Badge key={r.header} tone="green">
                      {r.header.toLowerCase() === r.label.toLowerCase() ? r.label : `${r.header} → ${r.label}`}
                    </Badge>
                  ))}
                </div>
                {parsed.ignored.length > 0 && (
                  <p className="mt-2 text-xs text-muted">
                    Ignored columns: {parsed.ignored.join(', ')}
                  </p>
                )}
              </section>

              {warningText.length > 0 && (
                <ul className="space-y-1 rounded-lg bg-warning-soft px-3 py-2.5 text-[13px] text-warning-ink">
                  {warningText.map((w) => (
                    <li key={w} className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      {w}
                    </li>
                  ))}
                </ul>
              )}

              <section>
                <h4 className="mb-1.5 text-[13px] font-semibold text-ink">
                  Preview <span className="font-normal text-muted">(first {Math.min(PREVIEW_ROWS, parsed.rows.length)} of {formatNumber(parsed.rows.length)} rows)</span>
                </h4>
                <div className="overflow-x-auto rounded-lg ring-1 ring-inset ring-line">
                  <table className="w-full min-w-[560px] text-left text-[13px]">
                    <thead className="bg-subtle/60">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-xs font-bold text-muted">
                          Row
                        </th>
                        {previewFields.map((k) => (
                          <th key={k} scope="col" className="px-3 py-2 text-xs font-bold text-muted">
                            {fieldLabel(k)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {parsed.rows.slice(0, PREVIEW_ROWS).map((r) => (
                        <tr key={r.line}>
                          <td className="px-3 py-2 tabular text-muted">{r.line}</td>
                          {previewFields.map((k) => {
                            const v = r.lead[k];
                            const text = Array.isArray(v) ? v.join(', ') : v === undefined ? '' : String(v);
                            return (
                              <td key={k} className={`max-w-[180px] truncate px-3 py-2 ${text ? 'text-ink' : 'text-faint'}`} title={text || undefined}>
                                {text || (k === 'name' ? 'Missing' : '—')}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {progress && (
                <div aria-live="polite">
                  <div className="mb-1 flex justify-between text-xs font-semibold text-muted">
                    <span>Importing…</span>
                    <span className="tabular">
                      {formatNumber(progress.done)} of {formatNumber(progress.total)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(4, (progress.done / progress.total) * 100)}%` }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Props: open, onClose, onImported(createdCount). */
export default function ImportLeadsModal({ open, ...props }) {
  if (!open) return null;
  return <ImportInner {...props} />;
}
