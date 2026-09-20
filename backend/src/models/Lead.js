const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    name: { type: String, required: true },
    contact_person: { type: String, default: '' },
    email: { type: String, lowercase: true, trim: true, default: '' },
    phone: { type: String, default: '' },
    value: { type: Number, default: 0 },
    stage: {
      type: String,
      enum: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
      default: 'New',
    },
    source: { type: String, default: 'Direct' },
    assigned_to: { type: String, index: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    country: { type: String, default: '' },
    notes: { type: String, default: '' },
    tags: [{ type: String }],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Lead', leadSchema);
