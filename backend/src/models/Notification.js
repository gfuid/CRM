const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    target: { type: String, default: 'all_owners' },
    target_user_id: { type: String, default: null },
    target_name: { type: String, default: 'All Business Owners' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['subscription', 'warning', 'info', 'success', 'urgent'],
      default: 'subscription',
    },
    priority: { type: String, default: 'high' },
    created_by: { type: String, default: 'Super Administrator' },
    read_by: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
