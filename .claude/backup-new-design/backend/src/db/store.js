/**
 * Document store with two interchangeable drivers:
 *  - mongo:  MongoDB collections are the source of truth (production)
 *  - memory: plain arrays, used for local development and tests when MONGODB_URI is unset
 *
 * Filters support plain equality plus $in, $nin, $ne, $exists, $gte, $lte.
 * Documents are always returned as plain objects without Mongo's _id.
 */

const mongoose = require('mongoose');

const COLLECTIONS = {
  meta: 'crm_meta',
  companies: 'crm_companies',
  users: 'crm_users',
  leads: 'crm_leads',
  tasks: 'crm_tasks',
  activities: 'crm_activities',
  auditLogs: 'crm_audit_logs',
  notifications: 'crm_notifications',
  payments: 'crm_payments',
};

const INDEXES = {
  companies: [[{ id: 1 }, { unique: true }]],
  users: [[{ id: 1 }, { unique: true }], [{ email: 1 }, { unique: true }], [{ company_id: 1 }]],
  leads: [[{ id: 1 }, { unique: true }], [{ company_id: 1, assigned_to: 1 }], [{ company_id: 1, deleted_at: 1 }]],
  tasks: [[{ id: 1 }, { unique: true }], [{ company_id: 1, assigned_to: 1 }]],
  activities: [[{ id: 1 }, { unique: true }], [{ company_id: 1, timestamp: -1 }], [{ company_id: 1, lead_id: 1 }]],
  auditLogs: [[{ id: 1 }, { unique: true }], [{ company_id: 1, timestamp: -1 }]],
  notifications: [[{ id: 1 }, { unique: true }], [{ company_id: 1, created_at: -1 }]],
  payments: [[{ id: 1 }, { unique: true }], [{ company_id: 1, created_at: -1 }]],
};

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

const matchValue = (actual, cond) => {
  if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
    return Object.entries(cond).every(([op, expected]) => {
      switch (op) {
        case '$in':
          return expected.some((e) => (Array.isArray(actual) ? actual.includes(e) : actual === e));
        case '$nin':
          return !expected.some((e) => (Array.isArray(actual) ? actual.includes(e) : actual === e));
        case '$ne':
          // Mongo semantics: { $ne: null } excludes missing fields too
          if (expected === null) return actual !== null && actual !== undefined;
          return Array.isArray(actual) ? !actual.includes(expected) : actual !== expected;
        case '$exists':
          return expected ? actual !== undefined : actual === undefined;
        case '$gte':
          return actual !== undefined && actual !== null && actual >= expected;
        case '$lte':
          return actual !== undefined && actual !== null && actual <= expected;
        default:
          throw new Error(`Unsupported filter operator ${op}`);
      }
    });
  }
  // Mongo semantics: { field: null } matches missing fields too
  if (cond === null) return actual === undefined || actual === null;
  if (Array.isArray(actual)) return actual.includes(cond);
  return actual === cond;
};

/** Applies a $set-style object, supporting Mongo dotted paths like 'settings.commodities'. */
const applySet = (doc, set) => {
  for (const [path, value] of Object.entries(clone(set))) {
    const keys = path.split('.');
    let target = doc;
    keys.slice(0, -1).forEach((k) => {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {};
      target = target[k];
    });
    target[keys[keys.length - 1]] = value;
  }
};

const matches = (doc, filter) => Object.entries(filter).every(([k, cond]) => matchValue(doc[k], cond));

const sortDocs = (docs, sort) => {
  if (!sort) return docs;
  const keys = Object.entries(sort);
  return docs.sort((a, b) => {
    for (const [k, dir] of keys) {
      const av = a[k] ?? '';
      const bv = b[k] ?? '';
      if (av < bv) return -dir;
      if (av > bv) return dir;
    }
    return 0;
  });
};

const createMemoryDriver = () => {
  const data = Object.fromEntries(Object.keys(COLLECTIONS).map((k) => [k, []]));
  return {
    kind: 'memory',
    async init() {},
    async find(col, filter = {}, { sort, limit, skip } = {}) {
      let rows = sortDocs(data[col].filter((d) => matches(d, filter)), sort);
      if (skip) rows = rows.slice(skip);
      if (limit) rows = rows.slice(0, limit);
      return clone(rows);
    },
    async findOne(col, filter) {
      return clone(data[col].find((d) => matches(d, filter)) || null);
    },
    async count(col, filter = {}) {
      return data[col].filter((d) => matches(d, filter)).length;
    },
    async insertOne(col, doc) {
      if (data[col].some((d) => d.id === doc.id)) throw new Error(`Duplicate id ${doc.id} in ${col}`);
      if (col === 'users' && data.users.some((u) => u.email === doc.email)) {
        const err = new Error('Email already registered');
        err.code = 11000;
        throw err;
      }
      data[col].push(clone(doc));
      return clone(doc);
    },
    async insertMany(col, docs) {
      for (const doc of docs) await this.insertOne(col, doc);
      return docs.length;
    },
    async updateOne(col, filter, set, unset = []) {
      const doc = data[col].find((d) => matches(d, filter));
      if (!doc) return null;
      applySet(doc, set);
      for (const k of unset) delete doc[k];
      return clone(doc);
    },
    async updateMany(col, filter, set) {
      const rows = data[col].filter((d) => matches(d, filter));
      rows.forEach((d) => applySet(d, set));
      return rows.length;
    },
    async deleteOne(col, filter) {
      const idx = data[col].findIndex((d) => matches(d, filter));
      if (idx === -1) return null;
      return clone(data[col].splice(idx, 1)[0]);
    },
    async deleteMany(col, filter) {
      const before = data[col].length;
      data[col] = data[col].filter((d) => !matches(d, filter));
      return before - data[col].length;
    },
  };
};

const createMongoDriver = () => {
  const coll = (col) => mongoose.connection.db.collection(COLLECTIONS[col]);
  const noId = { projection: { _id: 0 } };
  return {
    kind: 'mongo',
    async init() {
      for (const [col, specs] of Object.entries(INDEXES)) {
        for (const [keys, opts] of specs) {
          await coll(col).createIndex(keys, opts || {});
        }
      }
    },
    async find(col, filter = {}, { sort, limit, skip } = {}) {
      let cursor = coll(col).find(filter, noId);
      if (sort) cursor = cursor.sort(sort);
      if (skip) cursor = cursor.skip(skip);
      if (limit) cursor = cursor.limit(limit);
      return cursor.toArray();
    },
    async findOne(col, filter) {
      return coll(col).findOne(filter, noId);
    },
    async count(col, filter = {}) {
      return coll(col).countDocuments(filter);
    },
    async insertOne(col, doc) {
      await coll(col).insertOne({ ...doc });
      return clone(doc);
    },
    async insertMany(col, docs) {
      if (!docs.length) return 0;
      const res = await coll(col).insertMany(docs.map((d) => ({ ...d })), { ordered: false });
      return res.insertedCount;
    },
    async updateOne(col, filter, set, unset = []) {
      const update = {};
      if (set && Object.keys(set).length) update.$set = set;
      if (unset.length) update.$unset = Object.fromEntries(unset.map((k) => [k, '']));
      if (!Object.keys(update).length) return this.findOne(col, filter);
      return coll(col).findOneAndUpdate(filter, update, { returnDocument: 'after', ...noId });
    },
    async updateMany(col, filter, set) {
      const res = await coll(col).updateMany(filter, { $set: set });
      return res.modifiedCount;
    },
    async deleteOne(col, filter) {
      return coll(col).findOneAndDelete(filter, noId);
    },
    async deleteMany(col, filter) {
      const res = await coll(col).deleteMany(filter);
      return res.deletedCount;
    },
  };
};

let driver = createMemoryDriver();

const useMongo = async () => {
  driver = createMongoDriver();
  await driver.init();
};

const useMemory = () => {
  driver = createMemoryDriver();
};

const store = new Proxy(
  {},
  {
    get(_, prop) {
      if (prop === 'useMongo') return useMongo;
      if (prop === 'useMemory') return useMemory;
      if (prop === 'kind') return driver.kind;
      const fn = driver[prop];
      return typeof fn === 'function' ? fn.bind(driver) : fn;
    },
  }
);

module.exports = { store, COLLECTIONS };
