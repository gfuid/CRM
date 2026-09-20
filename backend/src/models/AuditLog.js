const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    actor_name: { type: String, required: true },
    actor_id: { type: String, required: true, index: true },
    action: { type: String, required: true },
    details: { type: String, default: '' },
    ip_address: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
