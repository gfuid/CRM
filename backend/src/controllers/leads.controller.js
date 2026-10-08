const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');

/**
 * Get all leads with filtering & pagination
 */
/**
 * Get all leads with filtering & pagination
 */
const getLeads = async (req, res) => {
  const { stage, priority, search, assigned_to, product, country } = req.query;
  let list = [...dataStore.leads];

  // Role-Based Isolation & Data Scope
  if (req.user && req.user.role !== 'admin') {
    if (req.user.data_scope === 'all') {
      // Allowed to see company-wide leads
      list = list.filter(
        (l) =>
          l.company_id === req.user.company_id ||
          l.created_by_id === req.user.created_by ||
          l.created_by_id === req.user.id
      );
    } else {
      // Strictly own assigned leads only
      list = list.filter(
        (l) =>
          l.assigned_to === req.user.id ||
          l.assigned_to === req.user.email ||
          l.assigned_to === req.user.name ||
          l.created_by_id === req.user.id
      );
    }
  } else if (req.user && (req.user.persona === 'owner' || req.user.role === 'admin')) {
    // Owner sees all leads of their company
    if (req.user.company_id) {
      list = list.filter((l) => l.company_id === req.user.company_id || !l.company_id);
    }
    if (assigned_to) {
      list = list.filter((l) => l.assigned_to === assigned_to);
    }
  } else if (assigned_to) {
    list = list.filter((l) => l.assigned_to === assigned_to);
  }

  if (stage) {
    list = list.filter((l) => (l.stage || '').toLowerCase() === stage.toLowerCase());
  }
  if (priority) {
    list = list.filter((l) => (l.priority || '').toLowerCase() === priority.toLowerCase());
  }
  if (country) {
    list = list.filter((l) => (l.country || '').toLowerCase().includes(country.toLowerCase()));
  }
  if (product) {
    list = list.filter((l) => {
      if (Array.isArray(l.products)) {
        return l.products.some((p) => p.toLowerCase().includes(product.toLowerCase()));
      }
      return (l.product || '').toLowerCase().includes(product.toLowerCase());
    });
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (l) =>
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.company_name && l.company_name.toLowerCase().includes(q)) ||
        (l.contact_person && l.contact_person.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.country && l.country.toLowerCase().includes(q)) ||
        (l.source && l.source.toLowerCase().includes(q)) ||
        (Array.isArray(l.products) && l.products.some((p) => p.toLowerCase().includes(q)))
    );
  }

  // Populate assigned user info & creator user info
  const populated = list.map((l) => {
    const agent = dataStore.users.find((u) => u.id === l.assigned_to);
    const creator = dataStore.users.find((u) => u.id === l.created_by_id);
    return {
      ...l,
      agent_name: agent ? agent.name : (l.agent_name || (l.assigned_to === 'usr_athish' ? 'Athish' : 'Unassigned')),
      agent_avatar: agent ? agent.avatar_url : null,
      created_by_name: l.created_by_name || (creator ? creator.name : (l.agent_name || 'Deepak')),
      created_by_id: l.created_by_id || (creator ? creator.id : l.assigned_to),
      created_at: l.created_at || new Date().toISOString(),
    };
  });

  return ApiResponse.success(res, populated, 'Leads retrieved successfully', 200, {
    total: populated.length,
  });
};

/**
 * Get single lead by ID with its activities and tasks
 */
const getLeadById = async (req, res) => {
  const { id } = req.params;
  const lead = dataStore.leads.find((l) => l.id === id);

  if (!lead) {
    return ApiResponse.error(res, 'Lead not found', 404);
  }

  // Staff cannot inspect leads assigned to other employees
  if (req.user && req.user.role !== 'admin' && lead.assigned_to !== req.user.id) {
    return ApiResponse.error(res, 'Access denied: You can only view your own assigned leads.', 403);
  }

  const agent = dataStore.users.find((u) => u.id === lead.assigned_to);
  const leadActivities = dataStore.activities.filter((a) => a.lead_id === id);
  const leadTasks = dataStore.tasks.filter((t) => t.lead_id === id);

  return ApiResponse.success(res, {
    ...lead,
    agent_name: agent ? agent.name : (lead.assigned_to === 'usr_athish' ? 'Athish' : 'Unassigned'),
    agent_avatar: agent ? agent.avatar_url : null,
    activities: leadActivities,
    tasks: leadTasks,
  });
};

/**
 * Create a new lead
 */
const createLead = async (req, res) => {
  const {
    name,
    company_name,
    type,
    contacts,
    contact_person,
    email,
    phone,
    whatsapp,
    website,
    country,
    source,
    lead_source,
    address,
    credit_rating,
    turnover,
    sourcing_region,
    legacy_industry_type,
    products,
    product,
    quantity,
    quantity_unit,
    price,
    price_usd,
    value,
    stage,
    priority,
    export_requirements,
    assigned_to,
    follow_up_date,
    follow_up_time,
    today_remarks,
    next_follow_up_action,
    previous_remarks,
    notes,
  } = req.body;

  const leadName = name || company_name;
  if (!leadName) {
    return ApiResponse.error(res, 'Company name is required', 400);
  }

  if (!follow_up_date) {
    return ApiResponse.error(res, 'Follow-up date is mandatory', 400);
  }

  // Deduplication guard: prevent accidental double-click within 5 seconds
  const creatorId = req.body.created_by_id || (req.user ? req.user.id : null);
  const now = Date.now();
  const recentDuplicate = dataStore.leads.find((l) => {
    const isSameName = (l.name || l.company_name || '').toLowerCase().trim() === leadName.toLowerCase().trim();
    const isSameCreator = !creatorId || l.created_by_id === creatorId;
    const isRecent = l.created_at && (now - new Date(l.created_at).getTime() < 5000);
    return isSameName && isSameCreator && isRecent;
  });

  if (recentDuplicate) {
    return ApiResponse.success(res, recentDuplicate, 'Lead already registered (duplicate submission ignored)', 200);
  }

  const primaryContact = Array.isArray(contacts) && contacts[0] ? contacts[0] : null;

  const newLead = {
    id: generateId('lead'),
    name: leadName,
    company_name: leadName,
    type: type || 'Export',
    contacts: Array.isArray(contacts) ? contacts : [],
    contact_person: contact_person || (primaryContact ? primaryContact.name : ''),
    email: email || (primaryContact ? primaryContact.email : ''),
    phone: phone || (primaryContact ? primaryContact.phone : ''),
    whatsapp: whatsapp || '',
    website: website || '',
    country: country || 'India 🇮🇳',
    source: source || lead_source || 'Direct Inbound',
    address: address || '',
    credit_rating: credit_rating || 'Not Rated',
    turnover: turnover || '',
    sourcing_region: sourcing_region || '',
    legacy_industry_type: legacy_industry_type || '',
    products: Array.isArray(products) ? products : (product ? [product] : ['Turmeric']),
    product: Array.isArray(products) && products.length > 0 ? products.join(', ') : (product || 'Turmeric'),
    quantity: Number(quantity) || 0,
    quantity_unit: quantity_unit || req.body.unit || (Number(quantity) >= 1000 ? 'kg' : 'MT'),
    price: Number(price || price_usd) || 0,
    value: Number(value) || (Number(quantity || 0) * Number(price || price_usd || 0)) || 0,
    stage: stage || 'Requirement Understood',
    priority: priority || 'Medium',
    export_requirements: export_requirements || {},
    assigned_to: (req.user && req.user.role !== 'admin') ? req.user.id : (assigned_to || 'usr_athish'),
    created_by_id: req.body.created_by_id || (req.user ? req.user.id : 'usr_owner_1'),
    created_by_name: req.body.created_by_name || (req.user ? (req.user.name || req.user.full_name) : 'Deepak'),
    follow_up_date: follow_up_date,
    follow_up_time: follow_up_time || req.body.follow_up_time || '10:00 AM',
    today_remarks: today_remarks || '',
    next_follow_up_action: next_follow_up_action || '',
    previous_remarks: (Array.isArray(previous_remarks) && previous_remarks.length > 0)
      ? previous_remarks
      : (today_remarks || next_follow_up_action)
        ? [{
            today_remark: today_remarks || '',
            planned_action: next_follow_up_action || '',
            remark: [
              today_remarks ? `Interaction: ${today_remarks}` : null,
              next_follow_up_action ? `Planned for ${follow_up_date}: ${next_follow_up_action}` : null,
            ].filter(Boolean).join(' | '),
            follow_up_date: follow_up_date,
            date: new Date().toISOString(),
            author: req.user ? (req.user.name || req.user.full_name) : 'User',
          }]
        : [],
    notes: notes || today_remarks || '',
    created_at: req.body.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  dataStore.leads.unshift(newLead);
  dbSync.saveLead(newLead);

  // Log activity
  const act = {
    id: generateId('act'),
    type: 'note',
    title: 'Export Lead Created',
    description: `Created lead for ${leadName} (Products: ${newLead.product}, Value: $${newLead.value.toLocaleString()}) by ${newLead.created_by_name}`,
    lead_id: newLead.id,
    user_id: req.user ? req.user.id : 'usr_athish',
    duration_minutes: null,
    timestamp: new Date().toISOString(),
  };
  dataStore.activities.unshift(act);
  dbSync.saveActivity(act);

  return ApiResponse.created(res, newLead, 'Export lead created successfully');
};

/**
 * Update lead
 */
const updateLead = async (req, res) => {
  const { id } = req.params;
  const leadIndex = dataStore.leads.findIndex((l) => l.id === id);

  if (leadIndex === -1) {
    return ApiResponse.error(res, 'Lead not found', 404);
  }

  const current = dataStore.leads[leadIndex];

  // Staff members can only update their own leads, and cannot reassign
  if (req.user && req.user.role !== 'admin') {
    if (current.assigned_to !== req.user.id) {
      return ApiResponse.error(res, 'Access denied: You cannot edit leads belonging to other staff members.', 403);
    }
    delete req.body.assigned_to;
  }

  const oldStage = current.stage;

  // Requirement #6: Never overwrite original creator or creation timestamp upon reassignment or updates!
  const updated = {
    ...current,
    ...req.body,
    created_by_id: current.created_by_id || req.body.created_by_id || (req.user ? req.user.id : 'usr_creator'),
    created_by_name: current.created_by_name || req.body.created_by_name || current.agent_name || 'Deepak',
    created_at: current.created_at || req.body.created_at || new Date().toISOString(),
    value: req.body.value !== undefined ? Number(req.body.value) : current.value,
    updated_at: new Date().toISOString(),
  };

  dataStore.leads[leadIndex] = updated;
  dbSync.saveLead(updated);

  // If stage changed, record activity
  if (req.body.stage && req.body.stage !== oldStage) {
    const act = {
      id: generateId('act'),
      type: 'status_change',
      title: `Stage Changed to ${req.body.stage}`,
      description: `Transitioned deal from ${oldStage} to ${req.body.stage}`,
      lead_id: id,
      user_id: req.user ? req.user.id : 'usr_admin_1',
      duration_minutes: null,
      timestamp: new Date().toISOString(),
    };
    dataStore.activities.unshift(act);
    dbSync.saveActivity(act);
  }

  return ApiResponse.success(res, updated, 'Lead updated successfully');
};

/**
 * Delete lead
 */
const deleteLead = async (req, res) => {
  const { id } = req.params;

  // Only admin / owner can delete leads
  if (req.user && req.user.role !== 'admin') {
    return ApiResponse.error(res, 'Access denied: Only Company Owner can delete leads.', 403);
  }

  const index = dataStore.leads.findIndex((l) => l.id === id);
  if (index === -1) {
    return ApiResponse.error(res, 'Lead not found', 404);
  }

  const deleted = dataStore.leads.splice(index, 1)[0];
  dbSync.deleteLead(id);

  return ApiResponse.success(res, deleted, 'Lead deleted successfully');
};

module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
};
