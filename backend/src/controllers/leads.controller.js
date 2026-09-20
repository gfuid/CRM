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

  if (stage) {
    list = list.filter((l) => (l.stage || '').toLowerCase() === stage.toLowerCase());
  }
  if (priority) {
    list = list.filter((l) => (l.priority || '').toLowerCase() === priority.toLowerCase());
  }
  if (assigned_to) {
    list = list.filter((l) => l.assigned_to === assigned_to);
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

  // Populate assigned user info
  const populated = list.map((l) => {
    const agent = dataStore.users.find((u) => u.id === l.assigned_to);
    return {
      ...l,
      agent_name: agent ? agent.name : (l.assigned_to === 'usr_athish' ? 'Athish' : 'Unassigned'),
      agent_avatar: agent ? agent.avatar_url : null,
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
    price,
    price_usd,
    value,
    stage,
    priority,
    export_requirements,
    assigned_to,
    follow_up_date,
    notes,
  } = req.body;

  const leadName = name || company_name;
  if (!leadName) {
    return ApiResponse.error(res, 'Company name is required', 400);
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
    price: Number(price || price_usd) || 0,
    value: Number(value) || (Number(quantity || 0) * Number(price || price_usd || 0)) || 0,
    stage: stage || 'Requirement Understood',
    priority: priority || 'Medium',
    export_requirements: export_requirements || {},
    assigned_to: assigned_to || 'usr_athish',
    follow_up_date: follow_up_date || '',
    notes: notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  dataStore.leads.unshift(newLead);
  dbSync.saveLead(newLead);

  // Log activity
  const act = {
    id: generateId('act'),
    type: 'note',
    title: 'Export Lead Created',
    description: `Created lead for ${leadName} (Products: ${newLead.product}, Value: $${newLead.value.toLocaleString()})`,
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
  const oldStage = current.stage;

  const updated = {
    ...current,
    ...req.body,
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
