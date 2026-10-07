/**
 * Small input-validation helpers. Controllers throw HttpError; the error middleware
 * turns it into a clean JSON response.
 */

class HttpError extends Error {
  constructor(statusCode, message, errors) {
    super(message);
    this.statusCode = statusCode;
    if (errors) this.errors = errors;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const LEAD_STAGES = [
  'Lead Generation',
  'Contact Established',
  'Requirement Understood',
  'Sample Sent',
  'Quotation Sent',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

const text = (value, { field, max = 500, required = false } = {}) => {
  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, `${field} is required`);
    return undefined;
  }
  if (typeof value === 'object') throw new HttpError(400, `${field} must be text`);
  const s = String(value).trim();
  if (required && !s) throw new HttpError(400, `${field} is required`);
  if (s.length > max) throw new HttpError(400, `${field} must be at most ${max} characters`);
  return s;
};

const email = (value, { field = 'Email', required = false } = {}) => {
  const s = text(value, { field, max: 254, required });
  if (s === undefined || s === '') return s;
  const lower = s.toLowerCase();
  if (!EMAIL_RE.test(lower)) throw new HttpError(400, `${field} is not a valid email address`);
  return lower;
};

const number = (value, { field, min = 0, max = 1e13 } = {}) => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new HttpError(400, `${field} must be a number`);
  if (n < min || n > max) throw new HttpError(400, `${field} must be between ${min} and ${max}`);
  return n;
};

const oneOf = (value, allowed, { field } = {}) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (!allowed.includes(value)) throw new HttpError(400, `${field} must be one of: ${allowed.join(', ')}`);
  return value;
};

const dateOnly = (value, { field } = {}) => {
  if (value === undefined || value === null) return undefined;
  if (value === '') return '';
  const s = String(value).slice(0, 10);
  if (!DATE_RE.test(s) || Number.isNaN(Date.parse(s))) throw new HttpError(400, `${field} must be a date (YYYY-MM-DD)`);
  return s;
};

const password = (value, { field = 'Password' } = {}) => {
  if (typeof value !== 'string' || value.length < 6) {
    throw new HttpError(400, `${field} must be at least 6 characters`);
  }
  if (value.length > 128) throw new HttpError(400, `${field} must be at most 128 characters`);
  return value;
};

const stringList = (value, { field, maxItems = 200, maxLen = 120 } = {}) => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new HttpError(400, `${field} must be a list`);
  if (value.length > maxItems) throw new HttpError(400, `${field} can have at most ${maxItems} items`);
  return [...new Set(value.map((v) => String(v).trim()).filter(Boolean).map((v) => v.slice(0, maxLen)))];
};

/** Drops undefined keys so partial updates only touch what was sent. */
const compact = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

const MAX_DOC_BYTES = 256 * 1024;

const ensureSize = (obj, label) => {
  if (Buffer.byteLength(JSON.stringify(obj)) > MAX_DOC_BYTES) {
    throw new HttpError(413, `${label} is too large`);
  }
};

module.exports = {
  HttpError,
  LEAD_STAGES,
  PRIORITIES,
  text,
  email,
  number,
  oneOf,
  dateOnly,
  password,
  stringList,
  compact,
  ensureSize,
};
