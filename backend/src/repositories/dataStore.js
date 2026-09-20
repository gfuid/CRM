/**
 * Production-ready in-memory Data Store & Repository Adapter
 * Database-agnostic layer with full CRUD operations for CRM entities.
 * Can be replaced or mapped to PostgreSQL, MongoDB, or Supabase seamlessly.
 */

const crypto = require('crypto');

const generateId = (prefix = 'item') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

// Subscription Plans Configuration
const SUBSCRIPTION_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter Tier',
    priceMonthly: 29,
    maxStaff: 3,
    maxLeads: 500,
    features: ['Up to 3 Staff Seats', '500 Leads Storage', 'Standard Analytics', 'Task Management', 'Email Notifications'],
    badge: 'Popular for Solo & Small Teams',
  },
  growth: {
    id: 'growth',
    name: 'Growth Tier',
    priceMonthly: 79,
    maxStaff: 15,
    maxLeads: 5000,
    features: ['Up to 15 Staff Seats', '5,000 Leads Storage', 'Dot-Matrix Analytics', 'Outreach Matrix', 'Priority Support', 'Custom Pipelines'],
    badge: 'Best Value for Scaling Companies',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Tier',
    priceMonthly: 199,
    maxStaff: 999999, // unlimited
    maxLeads: 999999,
    features: ['Unlimited Staff Seats', 'Unlimited Leads', 'Dedicated Account Manager', 'Custom AI Support', 'Full Security Audit Logs', 'SLA 99.9% Uptime'],
    badge: 'For Global Sales Organizations',
  },
};

// Seed initial production-like CRM data
const dataStore = {
  plans: SUBSCRIPTION_PLANS,

  company: {
    id: 'comp_stellarsync_1',
    name: 'Travel-Trade',
    industry: 'Travel, Tourism & Trade Services',
    currency: 'USD',
    timezone: 'UTC+05:30',
    revenueTargetMonthly: 150000,
    plan: 'growth',
    maxStaff: 15,
    subscriptionStatus: 'active',
    created_at: new Date('2026-01-01').toISOString(),
  },

  tenants: [
    {
      id: 'comp_stellarsync_1',
      name: 'Travel-Trade',
      domain: 'travel-trade.com',
      owner_name: 'Sarah Connor',
      owner_email: 'owner@travel-trade.com',
      plan: 'growth',
      maxStaff: 15,
      currentStaff: 4,
      status: 'active',
      monthlyRevenue: 79,
      created_at: new Date('2026-01-01').toISOString(),
    },
    {
      id: 'comp_nexus_2',
      name: 'Nexus Global Tech',
      domain: 'nexusglobal.tech',
      owner_name: 'Marcus Vance',
      owner_email: 'marcus@nexusglobal.tech',
      plan: 'starter',
      maxStaff: 3,
      currentStaff: 2,
      status: 'active',
      monthlyRevenue: 29,
      created_at: new Date('2026-01-18').toISOString(),
    },
    {
      id: 'comp_hyperflow_3',
      name: 'HyperFlow AI Labs',
      domain: 'hyperflow.ai',
      owner_name: 'Elena Rostova',
      owner_email: 'elena@hyperflow.ai',
      plan: 'enterprise',
      maxStaff: 999,
      currentStaff: 28,
      status: 'active',
      monthlyRevenue: 199,
      created_at: new Date('2026-02-04').toISOString(),
    },
    {
      id: 'comp_vanguard_4',
      name: 'Vanguard Retail Partners',
      domain: 'vanguardretail.com',
      owner_name: 'David Sterling',
      owner_email: 'david@vanguardretail.com',
      plan: 'growth',
      maxStaff: 15,
      currentStaff: 9,
      status: 'active',
      monthlyRevenue: 79,
      created_at: new Date('2026-02-19').toISOString(),
    },
  ],

  users: [
    {
      id: 'usr_admin_1',
      name: 'Sarah Connor (Owner)',
      email: 'owner@travel-trade.com',
      role: 'admin', // admin, manager, agent
      persona: 'owner', // 'owner' | 'staff'
      department: 'Founder & CEO',
      phone: '+1 (555) 019-2834',
      is_active: true,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      last_login: new Date().toISOString(),
      created_at: new Date('2026-01-01').toISOString(),
    },
    {
      id: 'usr_agent_1',
      name: 'Sarah Jenkins',
      email: 'sarah@oneroot.com',
      role: 'agent',
      department: 'Enterprise Sales',
      phone: '+1 (555) 018-7744',
      is_active: true,
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      last_login: new Date(Date.now() - 3600000).toISOString(),
      created_at: new Date('2026-01-15').toISOString(),
    },
    {
      id: 'usr_agent_2',
      name: 'Michael Vance',
      email: 'michael@oneroot.com',
      role: 'manager',
      department: 'Inbound Sales',
      phone: '+1 (555) 014-9912',
      is_active: true,
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      last_login: new Date(Date.now() - 7200000).toISOString(),
      created_at: new Date('2026-01-20').toISOString(),
    },
    {
      id: 'usr_agent_3',
      name: 'Alex Morgan',
      email: 'alex@oneroot.com',
      role: 'agent',
      department: 'SDR Outreach',
      phone: '+1 (555) 012-3490',
      is_active: false,
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      last_login: new Date(Date.now() - 86400000 * 5).toISOString(),
      created_at: new Date('2026-02-01').toISOString(),
    },
  ],

  leads: [
    {
      id: 'lead_1',
      name: 'Apex Global Logistics',
      contact_person: 'David Miller',
      email: 'dmiller@apexlogistics.com',
      phone: '+1 (555) 892-1100',
      value: 48000,
      stage: 'Negotiation', // New, Contacted, Qualified, Proposal, Negotiation, Closed Won, Closed Lost
      source: 'LinkedIn Inbound',
      assigned_to: 'usr_agent_1',
      priority: 'High',
      country: 'United States',
      notes: 'Final contract SLA review under legal review. Expected close by Friday.',
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'lead_2',
      name: 'Nexis FinTech Systems',
      contact_person: 'Elena Rostova',
      email: 'erostova@nexis.io',
      phone: '+44 20 7946 0912',
      value: 72500,
      stage: 'Proposal',
      source: 'TechCrunch Referral',
      assigned_to: 'usr_agent_2',
      priority: 'High',
      country: 'United Kingdom',
      notes: 'Demo completed with VP of Engineering. Proposal sent for 150 enterprise seats.',
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'lead_3',
      name: 'Quantum Health Bio',
      contact_person: 'Dr. Robert Zhang',
      email: 'rzhang@quantumhealth.org',
      phone: '+1 (555) 431-8890',
      value: 31000,
      stage: 'Qualified',
      source: 'Webinar',
      assigned_to: 'usr_agent_1',
      priority: 'Medium',
      country: 'Canada',
      notes: 'Budget approved for Q3 rollout. Scheduling deep-dive architecture session.',
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'lead_4',
      name: 'Starlight Media Network',
      contact_person: 'Chloe Martin',
      email: 'cmartin@starlight.co',
      phone: '+1 (555) 902-3341',
      value: 95000,
      stage: 'Closed Won',
      source: 'Partner Referral',
      assigned_to: 'usr_admin_1',
      priority: 'High',
      country: 'United States',
      notes: 'Annual upfront payment received. Onboarding kickoff scheduled.',
      created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'lead_5',
      name: 'Vortex Retail Group',
      contact_person: 'Marcus Brody',
      email: 'mbrody@vortexretail.com',
      phone: '+61 2 9810 5500',
      value: 22000,
      stage: 'New',
      source: 'Cold Outreach',
      assigned_to: 'usr_agent_1',
      priority: 'Medium',
      country: 'Australia',
      notes: 'Responded positively to cold email sequence. Initial discovery call pending.',
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],

  tasks: [
    {
      id: 'tsk_1',
      title: 'Finalize Apex Logistics SLA Agreement',
      description: 'Review redlines with corporate legal counsel and send revised signature page.',
      priority: 'Urgent',
      status: 'In Progress', // Pending, In Progress, Completed, Overdue
      due_date: new Date(Date.now() + 86400000 * 1).toISOString(),
      assigned_to: 'usr_agent_1',
      lead_id: 'lead_1',
      created_at: new Date().toISOString(),
    },
    {
      id: 'tsk_2',
      title: 'Send Custom Security Whitepaper to Nexis FinTech',
      description: 'Elena requested SOC2 Type II report and GDPR compliance attestation.',
      priority: 'High',
      status: 'Pending',
      due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
      assigned_to: 'usr_agent_2',
      lead_id: 'lead_2',
      created_at: new Date().toISOString(),
    },
    {
      id: 'tsk_3',
      title: 'Weekly Sales Pipeline Review',
      description: 'Executive sync with leadership on monthly quota pacing and high-risk deals.',
      priority: 'Medium',
      status: 'Completed',
      due_date: new Date(Date.now() - 86400000 * 1).toISOString(),
      assigned_to: 'usr_admin_1',
      lead_id: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'tsk_4',
      title: 'Follow up with Dr. Robert Zhang (Quantum Health)',
      description: 'Confirm attendance for technical evaluation call tomorrow.',
      priority: 'High',
      status: 'Pending',
      due_date: new Date(Date.now() - 86400000 * 1).toISOString(), // Overdue example
      assigned_to: 'usr_agent_1',
      lead_id: 'lead_3',
      created_at: new Date().toISOString(),
    },
  ],

  activities: [
    {
      id: 'act_1',
      type: 'call', // call, email, meeting, note, status_change
      title: 'Negotiation Call with David Miller',
      description: 'Agreed on 5% multi-year discount. David confirmed budget sign-off.',
      lead_id: 'lead_1',
      user_id: 'usr_agent_1',
      duration_minutes: 35,
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'act_2',
      type: 'email',
      title: 'Contract Package Sent',
      description: 'Dispatched DocuSign bundle to David Miller and legal@apexlogistics.com.',
      lead_id: 'lead_1',
      user_id: 'usr_agent_1',
      duration_minutes: null,
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'act_3',
      type: 'meeting',
      title: 'Product Demonstration & Q&A',
      description: 'Presented technical capabilities to Nexis Engineering team.',
      lead_id: 'lead_2',
      user_id: 'usr_agent_2',
      duration_minutes: 60,
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'act_4',
      type: 'status_change',
      title: 'Stage moved to Closed Won',
      description: 'Starlight Media Network finalized annual SaaS contract ($95,000).',
      lead_id: 'lead_4',
      user_id: 'usr_admin_1',
      duration_minutes: null,
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ],

  outreach: [
    {
      id: 'out_1',
      employee_id: 'usr_agent_1',
      date: new Date().toISOString().split('T')[0],
      calls_made: 42,
      emails_sent: 85,
      linkedin_touches: 30,
      meetings_booked: 4,
      target_met: true,
    },
    {
      id: 'out_2',
      employee_id: 'usr_agent_2',
      date: new Date().toISOString().split('T')[0],
      calls_made: 38,
      emails_sent: 70,
      linkedin_touches: 25,
      meetings_booked: 3,
      target_met: true,
    },
    {
      id: 'out_3',
      employee_id: 'usr_agent_3',
      date: new Date().toISOString().split('T')[0],
      calls_made: 12,
      emails_sent: 20,
      linkedin_touches: 10,
      meetings_booked: 0,
      target_met: false,
    },
  ],

  myDays: [
    {
      id: 'day_1',
      user_id: 'usr_admin_1',
      task: 'Review Q3 Executive Pipeline Forecast',
      priority: 'high',
      completed: false,
      time_slot: '09:30 AM - 10:30 AM',
      category: 'Strategic',
    },
    {
      id: 'day_2',
      user_id: 'usr_admin_1',
      task: 'Interview Candidate for Enterprise SDR role',
      priority: 'medium',
      completed: true,
      time_slot: '11:00 AM - 11:45 AM',
      category: 'Recruiting',
    },
    {
      id: 'day_3',
      user_id: 'usr_admin_1',
      task: 'Sign off on new Lead Scoring Algorithm',
      priority: 'high',
      completed: false,
      time_slot: '02:00 PM - 03:00 PM',
      category: 'Operations',
    },
    {
      id: 'day_4',
      user_id: 'usr_admin_1',
      task: '1-on-1 Performance Sync with Sarah Jenkins',
      priority: 'low',
      completed: false,
      time_slot: '04:30 PM - 05:00 PM',
      category: 'Management',
    },
  ],

  followUps: [
    {
      id: 'flw_1',
      lead_id: 'lead_1',
      client_name: 'David Miller',
      company: 'Apex Global Logistics',
      scheduled_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      scheduled_time: '10:00 AM',
      type: 'Phone Call',
      agenda: 'Verify signed contract return & initial invoice receipt',
      status: 'Scheduled', // Scheduled, Completed, Rescheduled, Cancelled
      assigned_to: 'usr_agent_1',
    },
    {
      id: 'flw_2',
      lead_id: 'lead_2',
      client_name: 'Elena Rostova',
      company: 'Nexis FinTech Systems',
      scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      scheduled_time: '02:30 PM',
      type: 'Video Call',
      agenda: 'Security architecture walkthrough with CTO',
      status: 'Scheduled',
      assigned_to: 'usr_agent_2',
    },
    {
      id: 'flw_3',
      lead_id: 'lead_3',
      client_name: 'Dr. Robert Zhang',
      company: 'Quantum Health Bio',
      scheduled_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      scheduled_time: '04:00 PM',
      type: 'Email',
      agenda: 'Send revised seat tier pricing breakdown',
      status: 'Pending',
      assigned_to: 'usr_agent_1',
    },
  ],

  auditLogs: [
    {
      id: 'log_1',
      actor_name: 'Admin Chief',
      actor_id: 'usr_admin_1',
      action: 'USER_ROLE_UPDATED',
      details: 'Updated role of Michael Vance from Agent to Manager',
      ip_address: '192.168.1.10',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'log_2',
      actor_name: 'Sarah Jenkins',
      actor_id: 'usr_agent_1',
      action: 'LEAD_STAGE_CHANGED',
      details: 'Moved Apex Global Logistics to Negotiation ($48,000)',
      ip_address: '192.168.1.14',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'log_3',
      actor_name: 'Admin Chief',
      actor_id: 'usr_admin_1',
      action: 'SETTINGS_UPDATED',
      details: 'Updated Monthly Target from $120,000 to $150,000',
      ip_address: '192.168.1.10',
      timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ],
};

// Lazy reference to DB status & models
const getDb = () => {
  try {
    const { isDbConnected } = require('../config/db');
    const models = require('../models');
    return { isConnected: isDbConnected(), models };
  } catch (e) {
    return { isConnected: false, models: null };
  }
};

// Persistence helpers that sync updates directly to MongoDB Atlas
const dbSync = {
  saveUser: async (user) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.User) {
      try {
        await models.User.findOneAndUpdate({ id: user.id }, user, { upsert: true, new: true });
      } catch (e) {
        console.warn('[DB User Sync]:', e.message);
      }
    }
  },
  deleteUser: async (id) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.User) {
      try {
        await models.User.findOneAndDelete({ id });
      } catch (e) {}
    }
  },
  saveLead: async (lead) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.Lead) {
      try {
        await models.Lead.findOneAndUpdate({ id: lead.id }, lead, { upsert: true, new: true });
      } catch (e) {
        console.warn('[DB Lead Sync]:', e.message);
      }
    }
  },
  deleteLead: async (id) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.Lead) {
      try {
        await models.Lead.findOneAndDelete({ id });
      } catch (e) {}
    }
  },
  saveTask: async (task) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.Task) {
      try {
        await models.Task.findOneAndUpdate({ id: task.id }, task, { upsert: true, new: true });
      } catch (e) {
        console.warn('[DB Task Sync]:', e.message);
      }
    }
  },
  deleteTask: async (id) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.Task) {
      try {
        await models.Task.findOneAndDelete({ id });
      } catch (e) {}
    }
  },
  saveActivity: async (activity) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.Activity) {
      try {
        await models.Activity.findOneAndUpdate({ id: activity.id }, activity, { upsert: true, new: true });
      } catch (e) {}
    }
  },
  saveFollowUp: async (item) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.FollowUp) {
      try {
        await models.FollowUp.findOneAndUpdate({ id: item.id }, item, { upsert: true, new: true });
      } catch (e) {}
    }
  },
  deleteFollowUp: async (id) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.FollowUp) {
      try {
        await models.FollowUp.findOneAndDelete({ id });
      } catch (e) {}
    }
  },
  saveMyDay: async (item) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.MyDay) {
      try {
        await models.MyDay.findOneAndUpdate({ id: item.id }, item, { upsert: true, new: true });
      } catch (e) {}
    }
  },
  deleteMyDay: async (id) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.MyDay) {
      try {
        await models.MyDay.findOneAndDelete({ id });
      } catch (e) {}
    }
  },
  saveOutreach: async (item) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.Outreach) {
      try {
        await models.Outreach.findOneAndUpdate({ id: item.id }, item, { upsert: true, new: true });
      } catch (e) {}
    }
  },
  saveCompany: async (comp) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.Company) {
      try {
        await models.Company.findOneAndUpdate({}, comp, { upsert: true, new: true });
      } catch (e) {}
    }
  },
  saveAuditLog: async (log) => {
    const { isConnected, models } = getDb();
    if (isConnected && models && models.AuditLog) {
      try {
        await models.AuditLog.create(log);
      } catch (e) {}
    }
  },
};

module.exports = {
  dataStore,
  generateId,
  dbSync,
};
