const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    name: { type: String, required: true },
    domain: { type: String, default: '' },
    owner_name: { type: String, default: '' },
    owner_email: { type: String, default: '' },
    industry: { type: String, default: 'Software & Cloud Sales' },
    currency: { type: String, default: 'USD' },
    timezone: { type: String, default: 'UTC+05:30' },
    revenueTargetMonthly: { type: Number, default: 150000 },
    plan: { type: String, default: 'growth' },
    maxStaff: { type: Number, default: 15 },
    currentStaff: { type: Number, default: 4 },
    status: { type: String, default: 'active' },
    monthlyRevenue: { type: Number, default: 79 },
    subscriptionStatus: { type: String, default: 'active' },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
