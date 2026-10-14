const mongoose = require('mongoose');

/** Email marketing campaign with per-recipient delivery log. */
const emailCampaignSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    owner_id: { type: String, index: true },
    company_id: { type: String, default: '' },
    name: { type: String, default: '' },
    subject: { type: String, default: '' },
    body: { type: String, default: '' },
    audience: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, default: 'draft' }, // draft | sending | sent | failed
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    recipients: [{ type: mongoose.Schema.Types.Mixed }],
    error: { type: String, default: '' },
    created_by: { type: String, default: '' },
    created_at: { type: Date, default: Date.now },
    started_at: { type: Date, default: null },
    finished_at: { type: Date, default: null },
  },
  { strict: false, timestamps: true }
);

module.exports = mongoose.model('EmailCampaign', emailCampaignSchema);
