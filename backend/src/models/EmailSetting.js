const mongoose = require('mongoose');

/** Per-owner SMTP sender configuration for email marketing (password stored encrypted). */
const emailSettingSchema = new mongoose.Schema(
  {
    owner_id: { type: String, unique: true, index: true },
    company_id: { type: String, default: '' },
    host: { type: String, default: '' },
    port: { type: Number, default: 587 },
    secure: { type: Boolean, default: false },
    user: { type: String, default: '' },
    pass_enc: { type: String, default: '' },
    from_name: { type: String, default: '' },
    from_email: { type: String, default: '' },
    reply_to: { type: String, default: '' },
    rate_per_minute: { type: Number, default: 20 },
    verified_at: { type: Date, default: null },
    updated_at: { type: Date, default: Date.now },
  },
  { strict: false, timestamps: true }
);

module.exports = mongoose.model('EmailSetting', emailSettingSchema);
