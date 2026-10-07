/**
 * Company-scoped data access. Every read and write goes through forCompany(), which
 * pins company_id into the filter, so one company can never touch another's records.
 */

const crypto = require('crypto');
const { store } = require('./store');

const PROTECTED_FIELDS = ['_id', 'id', 'company_id'];

const newId = (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;

const nowIso = () => new Date().toISOString();

const forCompany = (companyId) => {
  if (!companyId) throw new Error('company_id is required for tenant data access');
  const scope = (filter = {}) => ({ ...filter, company_id: companyId });
  const stripProtected = (set) => {
    const clean = { ...set };
    PROTECTED_FIELDS.forEach((k) => delete clean[k]);
    return clean;
  };

  return {
    companyId,
    find: (col, filter, opts) => store.find(col, scope(filter), opts),
    findOne: (col, filter) => store.findOne(col, scope(filter)),
    count: (col, filter) => store.count(col, scope(filter)),
    insert: (col, doc) => store.insertOne(col, { ...doc, company_id: companyId }),
    insertMany: (col, docs) => store.insertMany(col, docs.map((d) => ({ ...d, company_id: companyId }))),
    update: (col, filter, set, unset) => store.updateOne(col, scope(filter), stripProtected(set), unset),
    updateMany: (col, filter, set) => store.updateMany(col, scope(filter), stripProtected(set)),
    remove: (col, filter) => store.deleteOne(col, scope(filter)),
  };
};

module.exports = { forCompany, newId, nowIso };
