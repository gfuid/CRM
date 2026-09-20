const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    lead_id: { type: String, index: true },
    client_name: { type: String, required: true },
    company: { type: String, default: '' },
    scheduled_date: { type: String, required: true },
    scheduled_time: { type: String, default: '10:00 AM' },
    type: { type: String, default: 'Call' }, // Phone Call, Video Call, Email
    agenda: { type: String, default: '' },
    status: { type: String, enum: ['Scheduled', 'Pending', 'Completed', 'Cancelled', 'Rescheduled'], default: 'Scheduled' },
    assigned_to: { type: String, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FollowUp', followUpSchema);
