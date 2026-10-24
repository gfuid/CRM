const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    company_id: { type: String, index: true },
    owner_id: { type: String, index: true },
    created_by_id: { type: String, index: true },
    lead_id: { type: String, default: null, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'], default: 'Pending' },
    due_date: { type: Date, default: () => new Date(Date.now() + 86400000) },
    deadline_time: { type: String, default: '18:00' },
    due_time: { type: String, default: '18:00' },
    assigned_to: { type: String, index: true },
    completion_notes: { type: String, default: '' },
    remarks: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, strict: false }
);

module.exports = mongoose.model('Task', taskSchema);
