/**
 * Calculators built by the platform admin in the Admin Console (rows of boxes and formulas, like a sheet).
 * Companies see the calculators meant for them next to the built-in price calculator.
 * The formulas run in the browser (frontend/src/data/formula.js); here they are only stored and cleaned.
 */
const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');
const { isOwnerUser, isSuperAdmin } = require('../utils/access');

const STORE_ID = 'calculators';
const MAX_CALCULATORS = 100;
const MAX_ROWS = 60;
const KINDS = ['number', 'select', 'formula', 'heading'];

const str = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

const readAll = () => {
  const row = (dataStore.appSettings || []).find((s) => s.id === STORE_ID);
  return row && Array.isArray(row.calculators) ? row.calculators : [];
};
const writeAll = (calculators) => {
  const list = dataStore.appSettings || (dataStore.appSettings = []);
  const next = { id: STORE_ID, kind: 'calculators', calculators, updated_at: new Date().toISOString() };
  const idx = list.findIndex((s) => s.id === STORE_ID);
  if (idx >= 0) list[idx] = next; else list.push(next);
  dbSync.saveAppSetting(next);
};

const cleanRow = (r) => {
  const kind = KINDS.includes(r && r.kind) ? r.kind : 'number';
  const key = str(r && r.key, 40).toLowerCase().replace(/[^a-z0-9_]/g, '');
  const row = {
    key,
    label: str(r && r.label, 140),
    kind,
    unit: str(r && r.unit, 30),
    hint: str(r && r.hint, 160),
  };
  if (kind === 'number') row.default = r.default === '' || r.default === undefined ? '' : num(r.default);
  if (kind === 'select') {
    row.options = (Array.isArray(r.options) ? r.options : []).slice(0, 30)
      .map((o) => ({ label: str(o && o.label, 60), value: num(o && o.value) }))
      .filter((o) => o.label);
    row.default = r.default === '' || r.default === undefined ? (row.options[0] ? row.options[0].value : 0) : num(r.default);
  }
  if (kind === 'formula') {
    row.formula = str(r && r.formula, 1000);
    row.highlight = Boolean(r && r.highlight);
    row.decimals = Math.max(0, Math.min(6, Math.round(num(r && r.decimals === undefined ? 2 : r.decimals))));
  }
  return row;
};

/** Validate one calculator from the admin form. Returns { error } or { calc }. */
const fromBody = (b = {}) => {
  const name = str(b.name, 100);
  if (!name) return { error: 'Give the calculator a name' };
  const rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, MAX_ROWS).map(cleanRow);
  if (!rows.length) return { error: 'Add at least one row' };
  const keys = new Set();
  for (const [i, r] of rows.entries()) {
    if (!r.label) return { error: `Row ${i + 1}: give it a name` };
    if (!r.key) return { error: `Row ${i + 1}: missing box name` };
    if (keys.has(r.key)) return { error: `Row ${i + 1}: the box name "${r.key}" is used twice` };
    keys.add(r.key);
    if (r.kind === 'formula' && !r.formula) return { error: `Row ${i + 1}: write the formula` };
    if (r.kind === 'select' && !r.options.length) return { error: `Row ${i + 1}: add at least one choice` };
  }
  const audience = b.audience === 'companies' ? 'companies' : 'all';
  const companyIds = audience === 'companies'
    ? [...new Set((Array.isArray(b.company_ids) ? b.company_ids : []).map((x) => str(String(x), 80)).filter(Boolean))].slice(0, 500)
    : [];
  if (audience === 'companies' && !companyIds.length) return { error: 'Pick at least one company, or show it to all companies' };
  return {
    calc: {
      name,
      description: str(b.description, 300),
      active: b.active !== false,
      audience,
      company_ids: companyIds,
      rows,
    },
  };
};

const ownerIdOf = (u) => (isOwnerUser(u) || isSuperAdmin(u) ? u.id : (u.created_by || u.company_id || u.id));

/** Signed-in users: the active calculators shown to their company. */
const listForUsers = async (req, res) => {
  const owner = ownerIdOf(req.user);
  const list = readAll()
    .filter((c) => c.active !== false && (c.audience !== 'companies' || (c.company_ids || []).includes(owner)))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map(({ company_ids, ...rest }) => rest);
  return ApiResponse.success(res, list, 'Calculators');
};

const listForAdmin = async (req, res) => ApiResponse.success(res, readAll(), 'Calculators');

const createCalculator = async (req, res) => {
  const all = readAll();
  if (all.length >= MAX_CALCULATORS) return ApiResponse.error(res, `You can keep at most ${MAX_CALCULATORS} calculators`, 400);
  const { error, calc } = fromBody(req.body || {});
  if (error) return ApiResponse.error(res, error, 400);
  const now = new Date().toISOString();
  const row = { id: generateId('calc'), ...calc, created_at: now, updated_at: now, created_by: req.user.name || 'Admin' };
  writeAll([...all, row]);
  return ApiResponse.success(res, row, 'Calculator created', 201);
};

const updateCalculator = async (req, res) => {
  const all = readAll();
  const idx = all.findIndex((c) => c.id === req.params.id);
  if (idx < 0) return ApiResponse.error(res, 'Calculator not found', 404);
  const { error, calc } = fromBody({ ...all[idx], ...(req.body || {}) });
  if (error) return ApiResponse.error(res, error, 400);
  const next = [...all];
  next[idx] = { ...all[idx], ...calc, updated_at: new Date().toISOString() };
  writeAll(next);
  return ApiResponse.success(res, next[idx], 'Calculator saved');
};

const deleteCalculator = async (req, res) => {
  const all = readAll();
  if (!all.some((c) => c.id === req.params.id)) return ApiResponse.error(res, 'Calculator not found', 404);
  writeAll(all.filter((c) => c.id !== req.params.id));
  return ApiResponse.success(res, { id: req.params.id }, 'Calculator deleted');
};

module.exports = { listForUsers, listForAdmin, createCalculator, updateCalculator, deleteCalculator, fromBody };
