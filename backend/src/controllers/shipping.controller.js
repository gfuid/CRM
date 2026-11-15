/**
 * Shipment cost sheets and quotations (one list per company).
 * Owner: everything. Staff: depends on the company setting
 *   'none'  - no access
 *   'basic' - see and edit shipment details, containers, selling price and tasks; costs, commissions and profit are hidden
 *   'full'  - same as the owner, except deleting sheets and changing this setting
 */
const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');
const { isOwnerUser, isSuperAdmin } = require('../utils/access');
const { upgradeSheet, quotePerTon } = require('../utils/shippingQuote');

// Costs, profit and commissions (plus the fields of sheets saved before 2026-11-16)
const MONEY_KEYS = ['price_per_kg', 'transport_per_kg', 'costs', 'profit_pct', 'commission', 'tax_pct',
  'purchase_per_ton', 'deduction_per_ton', 'target_margin_pct'];
const ACCESS = ['none', 'basic', 'full'];
const MAX_SHEETS = 500;
const MAX_SHEET_BYTES = 60 * 1024;

const isOwnerLike = (u) => isOwnerUser(u) || isSuperAdmin(u);
const ownerIdOf = (u) => (isOwnerLike(u) ? u.id : (u.created_by || u.company_id || u.id));
const storeId = (u) => `shipping:${ownerIdOf(u)}`;

const readStore = (u) => {
  const row = (dataStore.appSettings || []).find((s) => s.id === storeId(u));
  return {
    sheets: row && Array.isArray(row.sheets)
      ? row.sheets.map((sh) => { const up = upgradeSheet(sh); return up.quote ? up : { ...up, quote: quotePerTon(up) }; })
      : [],
    settings: { staff_access: 'basic', ...(row && row.settings ? row.settings : {}) },
  };
};
const writeStore = (u, store) => {
  const list = dataStore.appSettings || (dataStore.appSettings = []);
  const next = { id: storeId(u), kind: 'shipping', owner_id: ownerIdOf(u), sheets: store.sheets, settings: store.settings, updated_at: new Date().toISOString() };
  const idx = list.findIndex((s) => s.id === next.id);
  if (idx >= 0) list[idx] = next; else list.push(next);
  dbSync.saveAppSetting(next);
};

const accessOf = (u, settings) => (isOwnerLike(u) ? 'owner' : (ACCESS.includes(settings.staff_access) ? settings.staff_access : 'basic'));
const canSeeMoney = (access) => access === 'owner' || access === 'full';
const strip = (sheet) => {
  const out = { ...sheet };
  MONEY_KEYS.forEach((k) => { delete out[k]; });
  return out;
};

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const nonNeg = (v, max = 1e12) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0; };
const anyNum = (v, max = 1e12) => { const n = Number(v); return Number.isFinite(n) ? Math.max(-max, Math.min(n, max)) : 0; };

/** Keep only known fields, with sane types. */
const clean = (b) => ({
  name: str(b.name, 120) || 'Untitled cost sheet',
  mode: b.mode === 'quotation' ? 'quotation' : 'shipment',
  buyer: str(b.buyer, 160),
  lead_id: str(b.lead_id, 60),
  product: str(b.product, 80),
  term: ['FOB', 'CFR', 'CIF'].includes(b.term) ? b.term : 'CIF',
  quote_unit: b.quote_unit === 'kg' ? 'kg' : 'ton',
  container: {
    type: str(b.container?.type, 40) || '20 ft',
    tons_per: nonNeg(b.container?.tons_per, 1e6),
    count: Math.round(nonNeg(b.container?.count, 10000)),
    bags_per: Math.round(nonNeg(b.container?.bags_per, 1e7)),
  },
  currency: {
    local: str(b.currency?.local, 6).toUpperCase() || 'INR',
    foreign: str(b.currency?.foreign, 6).toUpperCase() || 'USD',
    rate: nonNeg(b.currency?.rate, 1e7) || 1,
  },
  price_per_kg: nonNeg(b.price_per_kg, 1e9),
  transport_per_kg: nonNeg(b.transport_per_kg, 1e9),
  costs: {
    customs_per_container: nonNeg(b.costs?.customs_per_container),
    freight_per_container: nonNeg(b.costs?.freight_per_container),
    insurance_per_container: nonNeg(b.costs?.insurance_per_container),
  },
  profit_pct: anyNum(b.profit_pct, 1000),
  commission: {
    agent_pct: nonNeg(b.commission?.agent_pct, 100),
    consultant_pct: nonNeg(b.commission?.consultant_pct, 100),
    sales_pct: nonNeg(b.commission?.sales_pct, 100),
  },
  tax_pct: nonNeg(b.tax_pct, 100),
  tasks: (Array.isArray(b.tasks) ? b.tasks : []).slice(0, 60).map((t) => ({
    id: str(t.id, 24) || generateId('t'),
    title: str(t.title, 160),
    person_id: str(t.person_id, 60),
    tat_days: Math.round(nonNeg(t.tat_days, 365)),
    due_date: /^\d{4}-\d{2}-\d{2}$/.test(String(t.due_date || '')) ? t.due_date : '',
    done: Boolean(t.done),
  })).filter((t) => t.title),
  notes: str(b.notes, 2000),
});

const listSheets = async (req, res) => {
  const store = readStore(req.user);
  const access = accessOf(req.user, store.settings);
  if (access === 'none') return ApiResponse.error(res, 'Your company owner has not given you access to Shipping.', 403);
  const sheets = [...store.sheets].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  return ApiResponse.success(res, canSeeMoney(access) ? sheets : sheets.map(strip), 'Cost sheets', 200, {
    access,
    can_see_money: canSeeMoney(access),
    settings: access === 'owner' ? store.settings : undefined,
  });
};

const saveSheet = async (req, res) => {
  const store = readStore(req.user);
  const access = accessOf(req.user, store.settings);
  if (access === 'none') return ApiResponse.error(res, 'Your company owner has not given you access to Shipping.', 403);
  if (Buffer.byteLength(JSON.stringify(req.body || {})) > MAX_SHEET_BYTES) return ApiResponse.error(res, 'This cost sheet is too large to save.', 413);
  const id = req.params.id && req.params.id !== 'new' ? req.params.id : null;
  const idx = id ? store.sheets.findIndex((s) => s.id === id) : -1;
  if (id && idx < 0) return ApiResponse.error(res, 'Cost sheet not found', 404);
  if (!id && store.sheets.length >= MAX_SHEETS) return ApiResponse.error(res, `You can keep at most ${MAX_SHEETS} cost sheets. Delete old ones first.`, 400);

  const current = idx >= 0 ? store.sheets[idx] : null;
  let next = clean(upgradeSheet(req.body || {}));
  // Staff without money access cannot see or change costs: keep what was saved before
  if (!canSeeMoney(access)) {
    const keep = current || clean({});
    MONEY_KEYS.forEach((k) => { if (keep[k] !== undefined) next[k] = keep[k]; else delete next[k]; });
  }
  // The quote is always worked out here, so staff who cannot see costs still get the right price
  next.quote = quotePerTon(next);
  const now = new Date().toISOString();
  next = {
    ...next,
    id: current ? current.id : generateId('ship'),
    created_at: current ? current.created_at : now,
    created_by_id: current ? current.created_by_id : req.user.id,
    created_by_name: current ? current.created_by_name : (req.user.name || 'User'),
    updated_at: now,
    updated_by_name: req.user.name || 'User',
  };
  if (current) store.sheets[idx] = next; else store.sheets.push(next);
  writeStore(req.user, store);
  return ApiResponse.success(res, canSeeMoney(access) ? next : strip(next), current ? 'Cost sheet saved' : 'Cost sheet created', current ? 200 : 201);
};

const deleteSheet = async (req, res) => {
  if (!isOwnerLike(req.user)) return ApiResponse.error(res, 'Only the company owner can delete cost sheets.', 403);
  const store = readStore(req.user);
  const target = store.sheets.find((s) => s.id === req.params.id);
  if (!target) return ApiResponse.error(res, 'Cost sheet not found', 404);
  store.sheets = store.sheets.filter((s) => s.id !== req.params.id);
  writeStore(req.user, store);
  return ApiResponse.success(res, { id: target.id }, 'Cost sheet deleted');
};

const saveSettings = async (req, res) => {
  if (!isOwnerLike(req.user)) return ApiResponse.error(res, 'Only the company owner can change who sees Shipping.', 403);
  const access = req.body && req.body.staff_access;
  if (!ACCESS.includes(access)) return ApiResponse.error(res, `staff_access must be one of: ${ACCESS.join(', ')}`, 400);
  const store = readStore(req.user);
  store.settings = { ...store.settings, staff_access: access };
  writeStore(req.user, store);
  return ApiResponse.success(res, store.settings, 'Shipping settings saved');
};

module.exports = { MONEY_KEYS, listSheets, saveSheet, deleteSheet, saveSettings };
