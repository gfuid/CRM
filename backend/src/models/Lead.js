const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    name: { type: String, required: true },
    company_name: { type: String, default: '' },
    contact_person: { type: String, default: '' },
    email: { type: String, lowercase: true, trim: true, default: '' },
    phone: { type: String, default: '' },
    value: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    stage: {
      type: String,
      default: 'Requirement Understood',
    },
    source: { type: String, default: 'Direct' },
    assigned_to: { type: String, index: true },
    priority: { type: String, default: 'Medium' },
    country: { type: String, default: '' },
    notes: { type: String, default: '' },
    today_remarks: { type: String, default: '' },
    next_follow_up_action: { type: String, default: '' },
    follow_up_date: { type: String, default: '' },
    previous_remarks: [{ type: mongoose.Schema.Types.Mixed }],
    tags: [{ type: String }],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, strict: false }
);

module.exports = mongoose.model('Lead', leadSchema);

