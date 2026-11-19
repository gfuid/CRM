const mongoose = require('mongoose');

/**
 * WhatsApp marketing records of a company, one document each:
 *   kind = settings | template | media | campaign | message | contact | rule (WhatsApp)
 *        | ai_settings | ai_campaign | ai_call (AI Calling)
 * Kept in one collection so a company's WhatsApp and AI-call data is easy to back up and delete together.
 */
const waRecordSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    kind: { type: String, index: true },
    owner_id: { type: String, index: true },
    created_at: { type: Date, default: Date.now },
  },
  { strict: false, timestamps: true }
);

module.exports = mongoose.model('WaRecord', waRecordSchema);
