const mongoose = require('mongoose');

const outreachSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    campaign_name: { type: String, required: true },
    channel: { type: String, default: 'Email' },
    target_audience: { type: String, default: '' },
    sent_count: { type: Number, default: 0 },
    open_rate: { type: String, default: '0%' },
    reply_rate: { type: String, default: '0%' },
    status: { type: String, enum: ['Active', 'Draft', 'Completed', 'Paused'], default: 'Active' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Outreach', outreachSchema);
