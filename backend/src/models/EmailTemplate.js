const mongoose = require('mongoose');

/** Reusable email template (subject + HTML body) saved by a company owner. */
const emailTemplateSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    owner_id: { type: String, default: '', index: true },
    company_id: { type: String, default: '' },
    name: { type: String, default: '' },
    subject: { type: String, default: '' },
    body: { type: String, default: '' },
    created_by: { type: String, default: '' },
    created_at: { type: String, default: () => new Date().toISOString() },
    updated_at: { type: String, default: () => new Date().toISOString() },
  },
  { versionKey: false, strict: false }
);

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
