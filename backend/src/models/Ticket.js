const mongoose = require('mongoose');

/** Support ticket raised by an owner or staff member, answered by the platform admin. */
const ticketSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    number: { type: Number, index: true },
    company_id: { type: String, default: '', index: true },
    owner_id: { type: String, default: '', index: true },
    created_by_id: { type: String, default: '', index: true },
    created_by_name: { type: String, default: '' },
    created_by_email: { type: String, default: '' },
    created_by_role: { type: String, default: '' },
    company_name: { type: String, default: '' },
    subject: { type: String, default: '' },
    category: { type: String, default: 'Question' },
    priority: { type: String, default: 'Normal' },
    status: { type: String, default: 'Open' },
    source: { type: String, default: 'manual' },
    messages: [{ type: mongoose.Schema.Types.Mixed }],
    unread_for_admin: { type: Boolean, default: true },
    unread_for_user: { type: Boolean, default: false },
    last_reply_by: { type: String, default: 'user' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    resolved_at: { type: Date, default: null },
  },
  { strict: false }
);

module.exports = mongoose.model('Ticket', ticketSchema);
