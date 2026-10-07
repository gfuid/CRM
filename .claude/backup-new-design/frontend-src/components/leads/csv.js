/** CSV reading/writing for lead import. Handles quoted fields (with commas, quotes and newlines) and a UTF-8 BOM. */
import { PRIORITIES, STAGES } from '../../lib/constants';

const detectDelimiter = (text) => {
  let firstLine = '';
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    else if ((ch === '\n' || ch === '\r') && !inQuotes) break;
    firstLine += ch;
  }
  const counts = { ',': 0, ';': 0, '\t': 0 };
  inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch] += 1;
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : ',';
};

/** Returns an array of rows, each an array of cell strings. */
export function parseCsv(input) {
  let text = String(input || '');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"' && field === '') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
    i += 1;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const escapeCell = (v) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV text with a BOM so Excel opens UTF-8 correctly. */
export const toCsv = (rows) => `﻿${rows.map((r) => r.map(escapeCell).join(',')).join('\r\n')}`;

const norm = (h) => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Lead fields we can read from a spreadsheet, with the header names we recognise for each. */
export const IMPORT_FIELDS = [
  { key: 'name', label: 'Company name', aliases: ['companyname', 'company', 'name', 'buyer', 'buyername', 'customer', 'customername', 'organisation', 'organization', 'account'] },
  { key: 'contact_person', label: 'Contact person', aliases: ['contactperson', 'contact', 'contactname', 'person'] },
  { key: 'email', label: 'Email', aliases: ['email', 'emailaddress', 'emailid', 'mail'] },
  { key: 'phone', label: 'Phone', aliases: ['phone', 'mobile', 'phonenumber', 'mobilenumber', 'phoneno', 'mobileno', 'telephone', 'tel', 'contactnumber'] },
  { key: 'whatsapp', label: 'WhatsApp', aliases: ['whatsapp', 'whatsappnumber', 'whatsappno'] },
  { key: 'country', label: 'Country', aliases: ['country'] },
  { key: 'source', label: 'Source', aliases: ['source', 'leadsource'] },
  { key: 'products', label: 'Products', aliases: ['products', 'product', 'commodity', 'commodities'] },
  { key: 'quantity', label: 'Quantity', aliases: ['quantity', 'qty'] },
  { key: 'quantity_unit', label: 'Unit', aliases: ['unit', 'quantityunit', 'uom'] },
  { key: 'price', label: 'Price per unit', aliases: ['price', 'priceperunit', 'unitprice', 'rate'] },
  { key: 'value', label: 'Deal value', aliases: ['value', 'dealvalue', 'amount', 'dealamount'] },
  { key: 'currency', label: 'Currency', aliases: ['currency'] },
  { key: 'stage', label: 'Stage', aliases: ['stage', 'leadstage'] },
  { key: 'priority', label: 'Priority', aliases: ['priority'] },
  { key: 'follow_up_date', label: 'Follow-up date', aliases: ['followupdate', 'followup', 'nextfollowup', 'nextfollowupdate'] },
  { key: 'notes', label: 'Notes', aliases: ['notes', 'note', 'remarks', 'comments', 'comment'] },
  { key: 'website', label: 'Website', aliases: ['website', 'web', 'url'] },
  { key: 'address', label: 'Address', aliases: ['address'] },
  { key: 'industry_type', label: 'Industry', aliases: ['industry', 'industrytype'] },
  { key: 'incoterm', label: 'Incoterm', aliases: ['incoterm', 'incoterms'] },
  { key: 'payment_terms', label: 'Payment terms', aliases: ['paymentterms'] },
  { key: 'port_delivery', label: 'Port of delivery', aliases: ['portofdelivery', 'port', 'deliveryport'] },
];

export const TEMPLATE_HEADERS = [
  'Company name', 'Contact person', 'Email', 'Phone', 'WhatsApp', 'Country', 'Source', 'Products', 'Quantity', 'Unit',
  'Price', 'Deal value', 'Currency', 'Stage', 'Priority', 'Follow-up date', 'Notes',
];

/** For each column: the lead field it fills (or null). The first column wins when two match the same field. */
export function mapHeaders(headers) {
  const used = new Set();
  const mapping = headers.map((h) => {
    const n = norm(h);
    if (!n) return null;
    const field = IMPORT_FIELDS.find((f) => !used.has(f.key) && f.aliases.includes(n));
    if (!field) return null;
    used.add(field.key);
    return field.key;
  });
  const recognised = [];
  const ignored = [];
  headers.forEach((h, i) => {
    if (mapping[i]) recognised.push({ header: String(h).trim(), field: mapping[i], label: IMPORT_FIELDS.find((f) => f.key === mapping[i]).label });
    else if (String(h).trim()) ignored.push(String(h).trim());
  });
  return { mapping, recognised, ignored };
}

const parseNumber = (s) => {
  const cleaned = s.replace(/[\s,]/g, '').replace(/^[^\d.-]+/, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
};

const pad = (n) => String(n).padStart(2, '0');
const validDate = (y, m, d) => {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null;
};

/** Accepts YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY and DD-MM-YYYY. MM/DD/YYYY is used only when the second number can't be a month. */
export const parseDate = (s) => {
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return validDate(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    let [a, b, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (y < 100) y += 2000;
    if (b > 12 && a <= 12) [a, b] = [b, a];
    return validDate(y, b, a);
  }
  return null;
};

const STAGE_LOOKUP = new Map(
  STAGES.flatMap((s) => [
    [norm(s.key), s.key],
    [norm(s.short), s.key],
  ]).concat([
    ['won', 'Closed Won'],
    ['lost', 'Closed Lost'],
    ['new', 'Lead Generation'],
  ])
);

/**
 * Converts one spreadsheet row into a lead object for /leads/import.
 * Values we can't understand (stage, priority, date, number) are left out and counted in `warnings`.
 */
export function rowToLead(cells, mapping, warnings) {
  const lead = {};
  mapping.forEach((key, i) => {
    if (!key) return;
    const raw = String(cells[i] ?? '').trim();
    if (!raw) return;
    switch (key) {
      case 'products': {
        const list = raw.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
        if (list.length) lead.products = list;
        break;
      }
      case 'quantity':
      case 'price':
      case 'value': {
        const n = parseNumber(raw);
        if (n === null || n < 0) warnings.number += 1;
        else lead[key] = n;
        break;
      }
      case 'stage': {
        const s = STAGE_LOOKUP.get(norm(raw));
        if (s) lead.stage = s;
        else warnings.stage += 1;
        break;
      }
      case 'priority': {
        const p = PRIORITIES.find((x) => x.toLowerCase() === raw.toLowerCase());
        if (p) lead.priority = p;
        else warnings.priority += 1;
        break;
      }
      case 'follow_up_date': {
        const d = parseDate(raw);
        if (d) lead.follow_up_date = d;
        else warnings.date += 1;
        break;
      }
      case 'currency':
        lead.currency = raw.toUpperCase().slice(0, 10);
        break;
      default:
        lead[key] = raw;
    }
  });
  return lead;
}
