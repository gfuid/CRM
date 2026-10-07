/**
 * Billing model: every company gets FREE_SEATS employees at no cost; each extra employee
 * seat is billed monthly at the platform's per-seat price (editable in the admin console).
 *
 * Starting dropdown lists for a new company live in DEFAULT_SETTINGS. Owners can add and
 * remove items later (company.settings); these are configuration, not customer data.
 */

const PLATFORM_DEFAULTS = {
  free_seats: 2,
  price_per_seat_monthly: 500,
  currency: 'INR',
  reminder_days_before_expiry: 7,
};

const DEFAULT_SETTINGS = {
  currency: 'INR',
  revenue_target_monthly: 0,
  commodities: ['Turmeric', 'Tender Coconut', 'Red Chilli', 'Ginger', 'Maize', 'Rice DDGS', 'Corn DDGS', 'DORB', 'RSM', 'Soya seed', 'Jowar'],
  lead_sources: [
    'Direct Inquiry',
    'Trade Show',
    'LinkedIn Inbound',
    'B2B Trade Portal',
    'Referral',
    'Cold Outreach',
    'Website Form',
    'Embassy / Trade Council',
  ],
  incoterms: ['FOB', 'CIF', 'CFR', 'EXW', 'FCA', 'CIP', 'DDP', 'DAP', 'DPU'],
  payment_terms: [
    'LC at Sight (Letter of Credit)',
    'LC 30 Days',
    'LC 60 Days',
    'LC 90 Days',
    'CAD (Cash Against Documents)',
    'CAD on BL copy',
    'TT Advance (100% Wire Transfer)',
    'TT 30% Advance + 70% on BL',
    'TT 50% Advance + 50% on BL',
    'Open Account 30 Days',
    'Open Account 60 Days',
    'DP (Documents against Payment)',
    'DA (Documents against Acceptance)',
  ],
  designations: [
    'Sales Executive',
    'Export Sourcing Specialist',
    'International Trade Rep',
    'Logistics & Port Coordinator',
    'Quality Inspection Officer',
    'Documentation & LC Specialist',
  ],
};

module.exports = { PLATFORM_DEFAULTS, DEFAULT_SETTINGS };
