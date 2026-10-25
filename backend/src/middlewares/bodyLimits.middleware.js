/**
 * Stops one request from storing huge text (a 9 MB "remark", a 5 MB picture string, 10,000 contacts...).
 * Normal CRM entries are far below these numbers.
 */
const MAX_STRING = 20000; // ~ 6-7 pages of text in one field
const MAX_ARRAY = 500;
const MAX_DEPTH = 8;
const EMAIL_MAX_STRING = 300000; // email campaign HTML may be long

const tooBig = (value, maxString, depth = 0) => {
  if (depth > MAX_DEPTH) return 'data is nested too deeply';
  if (typeof value === 'string') {
    if (value.length > maxString) return `a text field is longer than ${maxString} characters`;
    if (/^\s*(javascript|vbscript)\s*:/i.test(value) || /^\s*data:text\/html/i.test(value)) return 'SCRIPT_LINK';
    return null;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY) return `a list has more than ${MAX_ARRAY} items`;
    for (const v of value) { const r = tooBig(v, maxString, depth + 1); if (r) return r; }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) { const r = tooBig(value[k], maxString, depth + 1); if (r) return r; }
  }
  return null;
};

const limitBodySizes = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') return next();
  const max = req.originalUrl.startsWith('/api/v1/email') ? EMAIL_MAX_STRING : MAX_STRING;
  const problem = tooBig(req.body, max);
  if (problem === 'SCRIPT_LINK') {
    return res.status(400).json({ success: false, code: 'SCRIPT_LINK', message: 'A field contains a script link (javascript:), which is not allowed.' });
  }
  if (problem) {
    return res.status(413).json({ success: false, code: 'ENTRY_TOO_LARGE', message: `This entry is too large to save: ${problem}. Please shorten it.` });
  }
  return next();
};

module.exports = { limitBodySizes };
