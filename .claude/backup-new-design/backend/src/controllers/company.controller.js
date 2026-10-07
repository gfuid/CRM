const ApiResponse = require('../utils/apiResponse');
const { store } = require('../db/store');
const { nowIso } = require('../db/tenant');
const { HttpError, text, number, stringList, compact } = require('../utils/validate');
const { publicCompany } = require('../services/auth');
const { companyBilling } = require('../services/billing');
const { normalizeRole } = require('../services/permissions');
const { audit } = require('../services/audit');

const LISTS = ['commodities', 'lead_sources', 'incoterms', 'payment_terms', 'designations'];
// Lists any lead editor may add to (removing items stays owner-only)
const APPENDABLE_BY_STAFF = ['commodities', 'lead_sources', 'incoterms', 'payment_terms'];

/** GET /company */
const getCompany = async (req, res) => {
  return ApiResponse.success(res, { company: publicCompany(req.company), billing: await companyBilling(req.company) });
};

/** GET /company/members — minimal list for assignee pickers and filters (any signed-in user). */
const getMembers = async (req, res) => {
  const users = await req.db.find('users', {}, { sort: { name: 1 } });
  return ApiResponse.success(
    res,
    users.map((u) => ({
      id: u.id,
      name: u.name,
      role: normalizeRole(u.role),
      designation: u.designation || '',
      avatar_url: u.avatar_url,
      is_active: u.is_active,
    }))
  );
};

/** PATCH /company — owner: name and settings (replaces whole lists, so it can remove items). */
const updateCompany = async (req, res) => {
  const input = req.body.settings || {};
  const settings = { ...(req.company.settings || {}) };
  for (const list of LISTS) {
    const v = stringList(input[list], { field: list.replace('_', ' '), maxItems: 300 });
    if (v !== undefined) settings[list] = v;
  }
  const currency = text(input.currency, { field: 'Currency', max: 10 });
  if (currency) settings.currency = currency.toUpperCase();
  const target = number(input.revenue_target_monthly, { field: 'Monthly target' });
  if (target !== undefined) settings.revenue_target_monthly = target;

  const set = compact({ name: text(req.body.name, { field: 'Company name', max: 120 }) });
  if (set.name === '') throw new HttpError(400, 'Company name cannot be empty');
  set.settings = settings;
  set.updated_at = nowIso();

  const updated = await store.updateOne('companies', { id: req.company.id }, set);
  await audit(req, 'SETTINGS_UPDATED', 'Updated company settings');
  return ApiResponse.success(res, { company: publicCompany(updated) }, 'Settings saved');
};

/** POST /company/lists/:list — add one item to a dropdown list. */
const addListItem = async (req, res) => {
  const { list } = req.params;
  if (!LISTS.includes(list)) throw new HttpError(404, 'Unknown list');
  const isOwner = normalizeRole(req.user.role) === 'owner';
  if (!isOwner && !(APPENDABLE_BY_STAFF.includes(list) && req.perms.leads_create)) {
    throw new HttpError(403, 'Only the owner can change this list');
  }
  const value = text(req.body.value, { field: 'Value', max: 120, required: true });
  const current = req.company.settings?.[list] || [];
  if (current.some((v) => v.toLowerCase() === value.toLowerCase())) {
    return ApiResponse.success(res, { list, items: current }, 'Already in the list');
  }
  if (current.length >= 300) throw new HttpError(400, 'This list is full');
  const items = [...current, value];
  // Dotted path updates only this list, so a concurrent edit to other settings is not lost
  await store.updateOne('companies', { id: req.company.id }, { [`settings.${list}`]: items, updated_at: nowIso() });
  return ApiResponse.created(res, { list, items }, 'Added');
};

module.exports = { getCompany, getMembers, updateCompany, addListItem };
