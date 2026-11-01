const mongoose = require('mongoose');

/** Picture used inside an email template/campaign (kept in the database so it survives redeploys). */
const emailImageSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    owner_id: { type: String, default: '', index: true },
    name: { type: String, default: '' },
    mime: { type: String, default: 'image/jpeg' },
    data: { type: String, default: '' }, // base64
    bytes: { type: Number, default: 0 },
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  { versionKey: false }
);

module.exports = mongoose.model('EmailImage', emailImageSchema);
