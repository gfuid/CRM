const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    lead_id: { type: String, index: true },
    type: { type: String, default: 'Note' }, // Call, Email, Meeting, Note, Status Change
    title: { type: String, required: true },
    description: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    user_id: { type: String, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activity', activitySchema);
