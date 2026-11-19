const mongoose = require('mongoose');

/**
 * WhatsApp marketing records of a company, one document each:
 *   kind = settings | template | media | campaign | message | contact | rule
 * Kept in one collection so a company's WhatsApp data is easy to back up and delete together.
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
