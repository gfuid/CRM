/**
 * Bulk lead import: the format and the rules, with no screen code in it,
 * so the same logic runs in the import window and in the test script (frontend/scripts/lead-import-test.mjs).
 */

export const UNITS = ['MT', 'kg', 'Quintal', 'lbs', 'Containers', 'Bags'];

// Local calendar date (toISOString would give yesterday's date early in the morning in India)
export const localIsoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
const pickFrom = (list, value) => list.find((item) => same(item, value));

/** One entry per column of the template. `ownerOnly` columns are left out for staff. */
export const buildColumns = ({ commodities = [], leadSources = [], stages = [], now = new Date() } = {}) => [
  { key: 'company', header: 'Company Name', aliases: ['company', 'name'], required: true, rule: 'Buyer company name. Must be unique.', example: ['Al-Zahra Trading LLC', 'Global Agri Impex BV'] },
  { key: 'country', header: 'Country', aliases: [], rule: 'Country of the buyer.', example: ['United Arab Emirates', 'Netherlands'] },
  { key: 'contact', header: 'Contact Person', aliases: ['contact', 'contactname'], rule: 'Name of the person you deal with.', example: ['Ahmed Al-Mansoor', 'Lars Janssen'] },
  { key: 'phone', header: 'Phone', aliases: ['mobile', 'phonenumber'], rule: 'With country code.', example: ['+971 50 111 2222', '+31 20 555 4321'] },
  { key: 'email', header: 'Email', aliases: ['emailid', 'workemail'], rule: 'A valid email address.', example: ['ahmed@alzahra.ae', 'lars@globalagri.nl'] },
  { key: 'whatsapp', header: 'WhatsApp', aliases: ['whatsappnumber', 'zalo'], rule: 'WhatsApp / Zalo number. Blank = same as Phone.', example: ['+971 50 111 2222', ''] },
  { key: 'website', header: 'Website', aliases: ['url'], rule: 'Company website.', example: ['https://alzahra.ae', 'https://globalagri.nl'] },
  { key: 'source', header: 'Lead Source', aliases: ['source'], rule: `One of: ${leadSources.join(', ')}. Blank = Direct Inquiry.`, example: ['Customs Data', 'Trade Fair'] },
  { key: 'products', header: 'Products', aliases: ['product', 'commodity', 'commodities'], rule: `From your product list, separated by commas: ${commodities.join(', ')}.`, example: [commodities[0] || 'Turmeric', commodities.slice(1, 3).join(', ') || 'Rice DDGS'] },
  { key: 'quantity', header: 'Quantity', aliases: ['qty', 'volume'], rule: 'A number only.', example: ['40', '80'] },
  { key: 'unit', header: 'Unit', aliases: ['quantityunit'], rule: `One of: ${UNITS.join(', ')}. Blank = MT.`, example: ['MT', 'MT'] },
  { key: 'value', header: 'Deal Value USD', aliases: ['dealvalue', 'price', 'value'], ownerOnly: true, rule: 'A number only, in US dollars.', example: ['68000', '95000'] },
  { key: 'stage', header: 'Stage', aliases: ['pipelinestage', 'status'], rule: `One of: ${stages.join(', ')}. Blank = Lead Generation.`, example: ['Lead Generation', 'Sample Sent'] },
  { key: 'incoterm', header: 'Incoterm', aliases: [], ownerOnly: true, rule: 'e.g. FOB, CIF, CFR.', example: ['CIF', 'FOB'] },
  { key: 'port', header: 'Port Delivery', aliases: ['port', 'portofdelivery'], ownerOnly: true, rule: 'Destination port.', example: ['Jebel Ali Port', 'Rotterdam'] },
  { key: 'rep', header: 'Assigned Rep', aliases: ['assignedto', 'staff'], ownerOnly: true, rule: 'Exact name of a staff member. Blank = you.', example: ['', ''] },
  { key: 'followup', header: 'Follow-up Date', aliases: ['followup', 'nextfollowupdate'], rule: 'YYYY-MM-DD or DD-MM-YYYY. Blank = today.', example: [localIsoDate(new Date(now.getTime() + 5 * 864e5)), localIsoDate(new Date(now.getTime() + 3 * 864e5))] },
  { key: 'remarks', header: 'Remarks', aliases: ['todayremarks', 'remark'], rule: 'What was discussed so far.', example: ['Asked for price list', 'Feed grade analysis sent'] },
  { key: 'nextaction', header: 'Next Action', aliases: ['plannedaction'], rule: 'What to do on the follow-up date.', example: ['Send quotation', 'Call for sample feedback'] },
  { key: 'notes', header: 'Notes', aliases: ['note'], rule: 'Any extra note.', example: ['', ''] },
];

/** CSV text -> { headers, rows }. Handles quoted cells, commas and line breaks inside quotes, and Excel's BOM. */
export const parseCsv = (text) => {
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

export const toIsoDate = (value) => {
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

export const toNumber = (value) => {
  const v = String(value || '').replace(/[,\s$]/g, '');
  if (v === '') return 0;
  return /^\d+(\.\d+)?$/.test(v) ? Number(v) : null;
};

const escapeCsv = (val) => `"${String(val == null ? '' : val).replace(/"/g, '""')}"`;

/** The downloadable template: the headings plus two example rows. */
export const templateCsv = (columns) => [
  columns.map((c) => escapeCsv(c.header)).join(','),
  columns.map((c) => escapeCsv(c.example[0])).join(','),
  columns.map((c) => escapeCsv(c.example[1])).join(','),
].join('\r\n');

/** Does the file have the one column we cannot work without? */
export const hasCompanyColumn = (headers) => {
  const names = ['Company Name', 'company', 'name'].map(norm);
  return (headers || []).some((h) => names.includes(norm(h)));
};

/** Why a file cannot be reviewed at all (null when it can). */
export const fileProblem = (parsed, maxRows = 500) => {
  if (!parsed || !parsed.headers.length || !parsed.rows.length) return 'This file has no data rows. Fill the template and upload it again.';
  if (!hasCompanyColumn(parsed.headers)) return 'The "Company Name" column was not found. Please use the template from step 1 without renaming its headings.';
  if (parsed.rows.length > maxRows) return `This file has ${parsed.rows.length} rows. Please import at most ${maxRows} leads at a time.`;
  return null;
};

/**
 * Match the file's headings to our columns, then check every row against the rules.
 * Returns which columns were found / missing / ignored, and for every row: the payload to save,
 * what to show, and the errors (a row with any error is not imported).
 */
export const reviewImport = (parsed, {
  isOwner = false,
  profile = null,
  teamList = [],
  commodities = [],
  existingNames = [],
  leadSources = [],
  stages = [],
  today = localIsoDate(new Date()),
} = {}) => {
  const all = buildColumns({ commodities, leadSources, stages });
  const columns = all.filter((c) => isOwner || !c.ownerOnly);
  const lockedColumns = isOwner ? [] : all.filter((c) => c.ownerOnly);

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

  const existing = new Set(existingNames.map((n) => String(n || '').trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean));
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
      const hit = pickFrom(leadSources, source);
      if (hit) source = hit; else errors.source = 'Not in the lead source list';
    } else source = 'Direct Inquiry';

    let stage = raw('stage');
    if (stage) {
      const hit = pickFrom(stages, stage);
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

  return { columns, lockedColumns, found, missing, lockedFound, unknown, rows, ready: rows.filter((r) => r.ok), bad: rows.filter((r) => !r.ok) };
};
