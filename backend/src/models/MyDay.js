const mongoose = require('mongoose');

const myDaySchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    task: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    completed: { type: Boolean, default: false },
    time_slot: { type: String, default: '' },
    category: { type: String, default: 'General' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MyDay', myDaySchema);
