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
    {
      id: 'usr_athish',
      name: 'Athish',
      email: 'athish@travel-trade.com',
      role: 'agent',
      department: 'Commodity Export & International Trade',
      phone: '+91 98451 22345',
      is_active: true,
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      last_login: new Date().toISOString(),
      created_at: new Date('2026-01-10').toISOString(),
    },
  ],

  leads: [
    {
      id: 'lead_1',
      name: 'Al-Barakah Global Agro Foods LLC',
      type: 'Export',
      contacts: [
        {
          name: 'Tariq Mansoor',
          phone: '+971 50 892 4110',
          extra_phones: ['+971 4 332 8900'],
          email: 'tmansoor@albarakahagro.ae',
          designation: 'VP Procurement & Sourcing',
          linkedin: 'https://linkedin.com/in/tariq-mansoor-agro',
        },
      ],
      contact_person: 'Tariq Mansoor',
      email: 'tmansoor@albarakahagro.ae',
      phone: '+971 50 892 4110',
      whatsapp: '+971 50 892 4110',
      website: 'https://albarakahagro.ae',
      country: 'United Arab Emirates 🇦🇪',
      source: 'Gulfood Trade Show Dubai',
      address: 'Warehouse #14, Al Quoz Industrial Area 3, Dubai, UAE',
      credit_rating: 'AAA',
      turnover: '120 cr',
      sourcing_region: 'Nizamabad & Salem, India',
      legacy_industry_type: 'Spice Milling & Wholesale Distribution',
      products: ['Turmeric', 'Ginger'],
      quantity: 50000, // 50 MT
      price: 84000,
      value: 84000,
      stage: 'Quotation Sent',
      priority: 'High',
      export_requirements: {
        industry_type: 'Food & Spice Processing',
        material_type: 'Whole Raw',
        polish_level: 'Double Polish',
        min_curcumin: '3.5%',
        cultivation_method: 'Conventional Cleaned',
        preferred_origin: 'Nizamabad / Salem',
        quantity_needed_kg: 50000,
        max_price_inr: 145,
        incoterm: 'CIF',
        port_delivery: 'Jebel Ali Port, Dubai',
        payment_days: 'CAD (Cash Against Documents via Bank)',
      },
      assigned_to: 'usr_athish',
      follow_up_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      notes: 'Requested certificate of analysis for curcumin content min 3.5%. Samples dispatched via DHL.',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'lead_2',
      name: 'VietSpices Import & Distribution Co.',
      type: 'Export',
      contacts: [
        {
          name: 'Nguyen Van Minh',
          phone: '+84 90 345 6789',
          extra_phones: [],
          email: 'minh.nguyen@vietspices.vn',
          designation: 'General Manager',
          linkedin: 'https://linkedin.com/in/nguyen-minh-spices',
        },
      ],
      contact_person: 'Nguyen Van Minh',
      email: 'minh.nguyen@vietspices.vn',
      phone: '+84 90 345 6789',
      whatsapp: '+84 90 345 6789',
      website: 'https://vietspices.vn',
      country: 'Vietnam 🇻🇳',
      source: 'Direct Inbound',
      address: 'District 7, Ho Chi Minh City, Vietnam',
      credit_rating: 'AA+',
      turnover: '65 cr',
      sourcing_region: 'Guntur, Andhra Pradesh',
      legacy_industry_type: 'Agro Commodity Trading',
      products: ['Red Chilli', 'Turmeric'],
      quantity: 36000,
      price: 68500,
      value: 68500,
      stage: 'Requirement Understood',
      priority: 'High',
      export_requirements: {
        industry_type: 'Food Processing',
        material_type: 'Whole Raw Stemless',
        polish_level: 'Sortex Cleaned',
        min_curcumin: '3.0%',
        cultivation_method: 'Conventional',
        preferred_origin: 'Guntur Sannam S4 / Teja',
        quantity_needed_kg: 36000,
        max_price_inr: 160,
        incoterm: 'FOB',
        port_delivery: 'Chennai Port / Nhava Sheva',
        payment_days: '100% LC at Sight',
      },
      assigned_to: 'usr_athish',
      follow_up_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      notes: 'Looking for 2x40ft containers of Teja Red Chilli stemless. Awaiting lab moisture test report.',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'lead_3',
      name: 'Continental Feeds & Bio-Nutrition BV',
      type: 'Export',
      contacts: [
        {
          name: 'Hendrik Van Dijk',
          phone: '+31 10 789 2200',
          extra_phones: ['+31 6 5432 1980'],
          email: 'h.vandijk@continentalfeeds.nl',
          designation: 'Head of Feed Ingredients',
          linkedin: 'https://linkedin.com/in/hendrik-vandijk',
        },
      ],
      contact_person: 'Hendrik Van Dijk',
      email: 'h.vandijk@continentalfeeds.nl',
      phone: '+31 10 789 2200',
      whatsapp: '+31 6 5432 1980',
      website: 'https://continentalfeeds.nl',
      country: 'Netherlands 🇳🇱',
      source: 'B2B Trade Portal',
      address: 'Haven 420, Port of Rotterdam, Netherlands',
      credit_rating: 'AAA',
      turnover: '350 cr',
      sourcing_region: 'Punjab & Haryana, India',
      legacy_industry_type: 'Animal Feed & Biofuel Ingredients',
      products: ['Rice DDGS', 'DORB', 'Corn DDGS'],
      quantity: 120000, // 120 MT
      price: 142000,
      value: 142000,
      stage: 'Negotiation',
      priority: 'Urgent',
      export_requirements: {
        industry_type: 'Animal Feed & Poultry Nutrition',
        material_type: 'Pellets & Mash',
        polish_level: 'Machine Cleaned',
        min_curcumin: 'N/A',
        cultivation_method: 'Non-GMO',
        preferred_origin: 'North India Grain Distilleries',
        quantity_needed_kg: 120000,
        max_price_inr: 28,
        incoterm: 'CIF',
        port_delivery: 'Port of Rotterdam',
        payment_days: 'CAD on arrival of vessel',
      },
      assigned_to: 'usr_athish',
      follow_up_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
      notes: 'High protein content (min 45% profat) required. Ocean freight rates confirmed from Mundra Port.',
      created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'lead_4',
      name: 'Dhaka Agro Feeds & Poultry Ltd',
      type: 'Export',
      contacts: [
        {
          name: 'Kamal Hossain',
          phone: '+880 17 1234 5678',
          extra_phones: [],
          email: 'kamal@dhakafeed.com.bd',
          designation: 'Managing Director',
          linkedin: '',
        },
      ],
      contact_person: 'Kamal Hossain',
      email: 'kamal@dhakafeed.com.bd',
      phone: '+880 17 1234 5678',
      whatsapp: '+880 17 1234 5678',
      website: 'https://dhakafeed.com.bd',
      country: 'Bangladesh 🇧🇩',
      source: 'Direct Inquiry',
      address: 'Tejgaon Industrial Area, Dhaka, Bangladesh',
      credit_rating: 'AA',
      turnover: '80 cr',
      sourcing_region: 'West Bengal & Bihar border',
      legacy_industry_type: 'Feed Milling & Agro Processing',
      products: ['Maize', 'RSM', 'Soya seed'],
      quantity: 85000,
      price: 76000,
      value: 76000,
      stage: 'Closed Won',
      priority: 'High',
      export_requirements: {
        industry_type: 'Poultry Feed Production',
        material_type: 'Whole Grain / De-oiled Cake',
        polish_level: 'Machine Cleaned',
        min_curcumin: 'N/A',
        cultivation_method: 'Conventional',
        preferred_origin: 'Bihar / MP',
        quantity_needed_kg: 85000,
        max_price_inr: 24,
        incoterm: 'CFR',
        port_delivery: 'Chittagong Port / Petrapole Border',
        payment_days: 'Irrevocable LC at Sight',
      },
      assigned_to: 'usr_athish',
      follow_up_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      notes: 'Initial 3 rake consignment completed. Repeat order contract for Q3 under preparation.',
      created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'lead_5',
      name: 'Ceylon Tropical Goods PLC',
      type: 'Export',
      contacts: [
        {
          name: 'Rohan Jayasuriya',
          phone: '+94 11 234 5678',
          extra_phones: [],
          email: 'rohan@ceylontropical.lk',
          designation: 'Director of Imports',
          linkedin: '',
        },
      ],
      contact_person: 'Rohan Jayasuriya',
      email: 'rohan@ceylontropical.lk',
      phone: '+94 11 234 5678',
      whatsapp: '+94 77 123 4567',
      website: 'https://ceylontropical.lk',
      country: 'Sri Lanka 🇱🇰',
      source: 'Referral',
      address: 'Colombo Harbour Area, Sri Lanka',
      credit_rating: 'A',
      turnover: '30 cr',
      sourcing_region: 'Pollachi & Karnataka, India',
      legacy_industry_type: 'Fresh Produce & Beverage Bottling',
      products: ['Tender Coconut', 'Ginger'],
      quantity: 25000,
      price: 32000,
      value: 32000,
      stage: 'Contact Established',
      priority: 'Medium',
      export_requirements: {
        industry_type: 'Fresh Fruits & Beverage Packing',
        material_type: 'Fresh Whole Diamonds Cut',
        polish_level: 'Cleaned & Wrapped',
        min_curcumin: 'N/A',
        cultivation_method: 'Natural Plantation',
        preferred_origin: 'Pollachi, Tamil Nadu',
        quantity_needed_kg: 25000,
        max_price_inr: 45,
        incoterm: 'CIF',
        port_delivery: 'Colombo Port',
        payment_days: '30% Advance, 70% on BL',
      },
      assigned_to: 'usr_athish',
      follow_up_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
      notes: 'Reefer container logistics quote obtained from Tuticorin Port. Schedule call tomorrow.',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],

  tasks: [
    {
      id: 'tsk_1',
      title: 'Send Pre-Shipment Sample of Curcumin 3.5% Turmeric to Al-Barakah',
      description: 'Prepare 500g double-polished turmeric finger samples with lab certificate and dispatch via DHL.',
      priority: 'Urgent',
      status: 'In Progress',
      due_date: new Date(Date.now() + 86400000 * 1).toISOString(),
      assigned_to: 'usr_athish',
      lead_id: 'lead_1',
      created_at: new Date().toISOString(),
    },
    {
      id: 'tsk_2',
      title: 'Confirm Phytosanitary Certificate for VietSpices Red Chilli',
      description: 'Coordinate with Plant Quarantine department at Chennai Port for Teja Red Chilli container.',
      priority: 'High',
      status: 'Pending',
      due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
      assigned_to: 'usr_athish',
      lead_id: 'lead_2',
      created_at: new Date().toISOString(),
    },
    {
      id: 'tsk_3',
      title: 'Review Mundra Port Ocean Freight Rates for Rice DDGS to Rotterdam',
      description: 'Compare Maersk and MSC 40ft container freight quotes for 120 MT consignment.',
      priority: 'High',
      status: 'Completed',
      due_date: new Date(Date.now() - 86400000 * 1).toISOString(),
      assigned_to: 'usr_athish',
      lead_id: 'lead_3',
      created_at: new Date().toISOString(),
    },
  ],

  activities: [
    {
      id: 'act_1',
      type: 'call',
      title: 'Pricing & Incoterm Negotiation with Tariq Mansoor',
      description: 'Discussed CIF Jebel Ali rates ($1,680/MT) for 50 MT double-polish turmeric.',
      lead_id: 'lead_1',
      user_id: 'usr_athish',
      duration_minutes: 25,
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'act_2',
      type: 'email',
      title: 'Proforma Invoice & Lab Certificate Dispatched',
      description: 'Sent PI and SGS moisture analysis certificate to minh.nguyen@vietspices.vn.',
      lead_id: 'lead_2',
      user_id: 'usr_athish',
      duration_minutes: null,
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
  ],

  outreach: [
    {
      id: 'out_1',
      employee_id: 'usr_athish',
      date: new Date().toISOString().split('T')[0],
      calls_made: 34,
      emails_sent: 58,
      linkedin_touches: 22,
      meetings_booked: 3,
      target_met: true,
    },
  ],

  myDays: [
    {
      id: 'day_1',
      user_id: 'usr_athish',
      task: 'Finalize SGS Inspection booking for JNPT container',
      priority: 'high',
      completed: false,
      time_slot: '10:00 AM - 11:00 AM',
      category: 'Export Compliance',
    },
    {
      id: 'day_2',
      user_id: 'usr_athish',
      task: 'Call Al-Barakah VP Procurement regarding LC opening',
      priority: 'high',
      completed: true,
      time_slot: '02:30 PM - 03:00 PM',
      category: 'Client Sync',
    },
    {
      id: 'day_3',
      user_id: 'usr_athish',
      task: 'Check Guntur Red Chilli mandi spot prices',
      priority: 'medium',
      completed: false,
      time_slot: '04:00 PM - 04:30 PM',
      category: 'Market Sourcing',
    },
  ],

  followUps: [
    {
      id: 'flw_1',
      lead_id: 'lead_1',
      client_name: 'Tariq Mansoor',
      company: 'Al-Barakah Global Agro Foods LLC',
      scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      scheduled_time: '11:00 AM',
      type: 'WhatsApp Call',
      agenda: 'Verify DHL tracking for sample turmeric and confirm LC draft',
      status: 'Scheduled',
      assigned_to: 'usr_athish',
    },
    {
      id: 'flw_2',
      lead_id: 'lead_2',
      client_name: 'Nguyen Van Minh',
      company: 'VietSpices Import & Distribution Co.',
      scheduled_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      scheduled_time: '02:00 PM',
      type: 'Video Call',
      agenda: 'Confirm 2x40ft Teja stemless red chilli booking',
      status: 'Scheduled',
      assigned_to: 'usr_athish',
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
