const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');
const { normalizeTags } = require('./email.controller');
const { getTenantContext, isLeadInUserScope } = require('../utils/tenantScope');

const OWNER_ONLY_LEAD_FIELDS = [
  'type',
  'industry_type',
  'legacy_industry_type',
  'credit_rating',
  'turnover',
  'sourcing_region',
  'products',
  'product',
  'quantity',
  'quantity_unit',
  'price',
  'price_usd',
  'value',
  'export_requirements',
  'product_notes',
  'incoterm',
  'port_delivery',
  'payment_days',
];
const LEAD_OWNERSHIP_FIELDS = [
  'owner_id',
  'company_id',
  'created_by_id',
  'created_by_name',
  'created_at',
];
const { isOwnerUser, isSuperAdmin, sameValue, viewBlocked } = require('../utils/access');

// Fields the server manages itself. Clients may send them back (e.g. a whole lead object) and they are ignored.
const SERVER_MANAGED_FIELDS = [
  'id', '_id', '__v', 'owner_id', 'company_id', 'created_by_id', 'created_by_name', 'created_at', 'updated_at',
  'createdAt', 'updatedAt', 'previous_remarks', 'agent_name', 'agent_avatar', 'activities', 'tasks',
  'follow_up_status', 'follow_up_badge', 'email_unsubscribed', 'last_edited_by', 'last_edited_at',
  'allow_duplicate',
];
// What a staff member may change on their own lead: only add today's discussion and plan the next step.
const STAFF_APPEND_FIELDS = ['today_remarks', 'next_follow_up_action', 'follow_up_date', 'follow_up_time', 'notes', 'stage'];
const FINAL_STAGES = ['closed won', 'closed lost', 'won', 'lost', 'closed'];
const isFinalStage = (stage) => FINAL_STAGES.includes(String(stage || '').trim().toLowerCase());
const canManageAll = (user) => isOwnerUser(user) || isSuperAdmin(user);

/**
 * Get all leads with filtering & pagination
 */
const getLeads = async (req, res) => {
  if (viewBlocked(req.user, 'view_leads')) {
    return ApiResponse.error(res, 'Access denied: Your company owner has not given you access to Leads.', 403);
  }
  const { stage, priority, search, assigned_to, product, country } = req.query;

  // Strict Tenant & Data Scope Isolation
  let list = (dataStore.leads || []).filter((l) => isLeadInUserScope(l, req.user));

  if (assigned_to) {
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
    const storedName = l.agent_name && !String(l.agent_name).startsWith('usr_') ? l.agent_name : '';
    const resolvedAgentName = agent ? agent.name : (storedName || 'Unassigned');

    return {
      ...l,
      agent_name: resolvedAgentName,
      agent_avatar: agent ? agent.avatar_url : null,
      created_by_name: l.created_by_name || (creator ? creator.name : resolvedAgentName),
      created_by_id: l.created_by_id || (creator ? creator.id : l.assigned_to),
      created_at: l.created_at || null,
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
  if (viewBlocked(req.user, 'view_leads')) {
    return ApiResponse.error(res, 'Access denied: Your company owner has not given you access to Leads.', 403);
  }
  const { id } = req.params;
  const lead = dataStore.leads.find((l) => l.id === id);

  if (!lead || !isLeadInUserScope(lead, req.user)) {
    return ApiResponse.error(res, 'Lead not found', 404);
  }

  // isLeadInUserScope already applies the staff data scope (own leads vs. whole company)

  const agent = dataStore.users.find((u) => u.id === lead.assigned_to);
  const leadActivities = dataStore.activities.filter((a) => a.lead_id === id);
  const leadTasks = dataStore.tasks.filter((t) => t.lead_id === id);

  return ApiResponse.success(res, {
    ...lead,
    agent_name: agent ? agent.name : (lead.agent_name && !String(lead.agent_name).startsWith('usr_') ? lead.agent_name : 'Unassigned'),
    agent_avatar: agent ? agent.avatar_url : null,
    activities: leadActivities,
    tasks: leadTasks,
  });
};

/**
 * Create a new lead
 */
const createLead = async (req, res) => {
  const isOwner = canManageAll(req.user);
  if (!isOwner && req.user?.permissions?.can_create === false) {
    return ApiResponse.error(res, 'Access denied: You do not have permission to create leads.', 403);
  }
  const protectedFields = [
    ...(!isOwner ? OWNER_ONLY_LEAD_FIELDS : []),
    ...LEAD_OWNERSHIP_FIELDS,
  ].filter((field) => {
    if (!Object.prototype.hasOwnProperty.call(req.body, field)) return false;
    const v = req.body[field];
    const isEmpty = v === undefined || v === null || v === '' || v === 0 ||
      (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
    return !isEmpty;
  });
  if (protectedFields.length) {
    return ApiResponse.error(
      res,
      `You are not allowed to set these lead fields: ${protectedFields.join(', ')}`,
      403
    );
  }

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
    tags,
  } = req.body;

  const leadName = name || company_name;
  if (!leadName) {
    return ApiResponse.error(res, 'Company name is required', 400);
  }

  if (!follow_up_date) {
    return ApiResponse.error(res, 'Follow-up date is mandatory', 400);
  }
  if (!String(today_remarks || '').trim()) {
    return ApiResponse.error(res, "Today's interaction / discussion remarks are mandatory", 400);
  }
  if (!String(next_follow_up_action || '').trim()) {
    return ApiResponse.error(res, 'Planned action for the next follow-up date is mandatory', 400);
  }

  // Deduplication guard: prevent accidental double-click within 5 seconds
  const creatorId = req.user?.id || null;
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

  const ownerId = isOwner ? req.user.id : (req.user.created_by || req.user.company_id || req.user.id);
  const companyId = req.user?.company_id || ownerId;
  const ctx = getTenantContext(req.user);
  if (isOwner && assigned_to && !ctx.isSuperAdmin && !ctx.allowedUserIds.has(assigned_to)) {
    return ApiResponse.error(res, 'Assigned staff member does not belong to your organization', 400);
  }

  // Same company already in this organization? Stop silent duplicates.
  if (!ctx.isSuperAdmin && req.body.allow_duplicate !== true) {
    const wanted = leadName.toLowerCase().replace(/\s+/g, ' ').trim();
    const existing = dataStore.leads.find((l) => {
      const n = String(l.name || l.company_name || '').toLowerCase().replace(/\s+/g, ' ').trim();
      if (n !== wanted) return false;
      return (
        (l.company_id && l.company_id === companyId) ||
        (l.owner_id && l.owner_id === ownerId) ||
        (l.created_by_id && ctx.allowedUserIds.has(l.created_by_id)) ||
        (l.assigned_to && ctx.allowedUserIds.has(l.assigned_to))
      );
    });
    if (existing) {
      const who = existing.created_by_name || 'a team member';
      return ApiResponse.error(
        res,
        `"${leadName}" already exists in your company (added by ${who}). Open that lead and add your remark there instead of creating a new one.`,
        409
      );
    }
  }

  const newLead = {
    id: generateId('lead'),
    company_id: companyId,
    owner_id: ownerId,
    name: leadName,
    company_name: leadName,
    type: isOwner ? (type || 'Export') : 'Export',
    contacts: Array.isArray(contacts) ? contacts : [],
    contact_person: contact_person || (primaryContact ? primaryContact.name : ''),
    email: email || (primaryContact ? primaryContact.email : ''),
    phone: phone || (primaryContact ? primaryContact.phone : ''),
    whatsapp: whatsapp || '',
    website: website || '',
    country: country || '',
    source: source || lead_source || 'Direct Inbound',
    address: address || '',
    credit_rating: isOwner ? (credit_rating || 'Not Rated') : 'Not Rated',
    turnover: isOwner ? (turnover || '') : '',
    sourcing_region: isOwner ? (sourcing_region || '') : '',
    legacy_industry_type: isOwner ? (legacy_industry_type || '') : '',
    products: isOwner ? (Array.isArray(products) ? products : (product ? [product] : [])) : [],
    product: isOwner ? (Array.isArray(products) && products.length > 0 ? products.join(', ') : (product || '')) : '',
    quantity: isOwner ? (Number(quantity) || 0) : 0,
    quantity_unit: isOwner ? (quantity_unit || req.body.unit || (Number(quantity) >= 1000 ? 'kg' : 'MT')) : 'MT',
    price: isOwner ? (Number(price || price_usd) || 0) : 0,
    value: isOwner ? ((Number(value) || (Number(quantity || 0) * Number(price || price_usd || 0))) || 0) : 0,
    stage: stage || 'Requirement Understood',
    priority: priority || 'Medium',
    export_requirements: isOwner ? (export_requirements || {}) : {},
    assigned_to: isOwner ? (assigned_to || req.user.id) : req.user.id,
    created_by_id: req.user.id,
    created_by_name: req.user.name || req.user.full_name || 'User',
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
    tags: normalizeTags(tags),
    email_unsubscribed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const assigneeUser = dataStore.users.find((u) => u.id === newLead.assigned_to);
  newLead.agent_name = assigneeUser ? assigneeUser.name : (req.user.name || '');

  dataStore.leads.unshift(newLead);
  dbSync.saveLead(newLead);

  // Log activity
  const act = {
    id: generateId('act'),
    type: 'note',
    title: 'Export Lead Created',
    description: `Created lead for ${leadName}${newLead.product ? ` (Products: ${newLead.product}, Value: $${newLead.value.toLocaleString()})` : ''} by ${newLead.created_by_name}`,
    lead_id: newLead.id,
    user_id: req.user ? req.user.id : 'system',
    duration_minutes: null,
    timestamp: new Date().toISOString(),
  };
  dataStore.activities.unshift(act);
  dbSync.saveActivity(act);

  return ApiResponse.created(res, newLead, 'Export lead created successfully');
};

/**
 * Update lead
 *  - Owner: may correct any field of a lead in their company (history stays intact).
 *  - Staff: may only ADD today's remark / next action / next follow-up date on their own lead,
 *           and move the stage forward (not to Won/Lost). Everything else is corrected by the owner.
 */
const updateLead = async (req, res) => {
  const { id } = req.params;
  const leadIndex = dataStore.leads.findIndex((l) => l.id === id);

  if (leadIndex === -1) {
    return ApiResponse.error(res, 'Lead not found', 404);
  }

  const current = dataStore.leads[leadIndex];

  if (!isLeadInUserScope(current, req.user)) {
    return ApiResponse.error(res, 'Lead not found', 404);
  }

  const isOwner = canManageAll(req.user);
  if (!isOwner && req.user?.permissions?.can_update === false) {
    return ApiResponse.error(res, 'Access denied: You do not have permission to update leads.', 403);
  }
  if (!isOwner && current.assigned_to !== req.user.id) {
    return ApiResponse.error(res, 'Access denied: You can only add updates to leads assigned to you.', 403);
  }

  // Normalise the incoming body: drop server-managed fields, fold stage aliases into `stage`
  const body = { ...req.body };
  if (body.stage === undefined && (body.status !== undefined || body.lead_stage !== undefined)) {
    body.stage = body.status !== undefined ? body.status : body.lead_stage;
  }
  delete body.status;
  delete body.lead_stage;
  SERVER_MANAGED_FIELDS.forEach((f) => delete body[f]);
  if (body.tags !== undefined) body.tags = normalizeTags(body.tags);

  // Only keep fields whose value actually changes
  const changed = Object.keys(body).filter((field) => !sameValue(body[field], current[field]));

  if (!isOwner) {
    const notAllowed = changed.filter((field) => !STAFF_APPEND_FIELDS.includes(field));
    if (notAllowed.length) {
      return ApiResponse.error(
        res,
        `Only your company owner can correct these fields: ${notAllowed.join(', ')}. Add a remark instead, or ask the owner to fix it.`,
        403
      );
    }
    if (changed.includes('stage') && isFinalStage(body.stage)) {
      return ApiResponse.error(res, 'Only the company owner can mark a deal as Won or Lost.', 403);
    }
  }

  const safeUpdates = Object.fromEntries(changed.map((field) => [field, body[field]]));
  const ctx = getTenantContext(req.user);
  if (isOwner && safeUpdates.assigned_to && !ctx.isSuperAdmin && !ctx.allowedUserIds.has(safeUpdates.assigned_to)) {
    return ApiResponse.error(res, 'Assigned staff member does not belong to your organization', 400);
  }
  if (safeUpdates.value !== undefined) safeUpdates.value = Number(safeUpdates.value) || 0;
  if (safeUpdates.price !== undefined) safeUpdates.price = Number(safeUpdates.price) || 0;
  if (safeUpdates.quantity !== undefined) safeUpdates.quantity = Number(safeUpdates.quantity) || 0;
  if (safeUpdates.stage !== undefined) {
    safeUpdates.status = safeUpdates.stage;
    safeUpdates.lead_stage = safeUpdates.stage;
  }

  if (changed.length === 0) {
    return ApiResponse.success(res, current, 'No changes to save');
  }

  const oldStage = current.stage;
  const now = new Date().toISOString();

  // Never overwrite original creator or creation timestamp
  const updated = {
    ...current,
    ...safeUpdates,
    created_by_id: current.created_by_id || req.user.id,
    created_by_name: current.created_by_name || req.user.name || 'User',
    created_at: current.created_at || now,
    updated_at: now,
    last_edited_by: req.user.id,
    last_edited_at: now,
  };
  if (safeUpdates.assigned_to) {
    const assignee = dataStore.users.find((u) => u.id === safeUpdates.assigned_to);
    if (assignee) updated.agent_name = assignee.name;
  }

  // Remark history is append-only: a new entry when a remark, planned action or follow-up date is given
  const remarkChanged =
    (safeUpdates.today_remarks !== undefined && String(safeUpdates.today_remarks || '').trim() !== '') ||
    (safeUpdates.next_follow_up_action !== undefined && String(safeUpdates.next_follow_up_action || '').trim() !== '') ||
    safeUpdates.follow_up_date !== undefined;
  if (remarkChanged) {
    const todayRemark = safeUpdates.today_remarks !== undefined ? safeUpdates.today_remarks || '' : '';
    const plannedAction = safeUpdates.next_follow_up_action !== undefined ? safeUpdates.next_follow_up_action || '' : '';
    const followUpDate = safeUpdates.follow_up_date || current.follow_up_date;
    updated.previous_remarks = [
      {
        today_remark: todayRemark,
        planned_action: plannedAction,
        remark: [
          todayRemark ? `Interaction: ${todayRemark}` : null,
          plannedAction ? `Planned for ${followUpDate}: ${plannedAction}` : null,
          !todayRemark && !plannedAction && safeUpdates.follow_up_date ? `Follow-up moved from ${current.follow_up_date || '-'} to ${safeUpdates.follow_up_date}` : null,
        ].filter(Boolean).join(' | '),
        follow_up_date: followUpDate,
        previous_follow_up_date: safeUpdates.follow_up_date !== undefined ? current.follow_up_date || '' : undefined,
        date: now,
        author: req.user.name || req.user.full_name || 'User',
        author_id: req.user.id,
      },
      ...(current.previous_remarks || []),
    ];
  }

  // Owner corrections are recorded so the owner can see what changed later
  const correctedFields = changed.filter((f) => !STAFF_APPEND_FIELDS.includes(f));
  if (correctedFields.length) {
    updated.edit_history = [
      { date: now, by: req.user.name || 'User', by_id: req.user.id, fields: correctedFields },
      ...(current.edit_history || []),
    ].slice(0, 100);
  }

  dataStore.leads[leadIndex] = updated;
  dbSync.saveLead(updated);

  // If stage changed, record activity
  if (safeUpdates.stage && safeUpdates.stage !== oldStage) {
    const act = {
      id: generateId('act'),
      type: 'status_change',
      title: `Stage Changed to ${safeUpdates.stage}`,
      description: `Transitioned deal from ${oldStage} to ${safeUpdates.stage}`,
      lead_id: id,
      user_id: req.user.id,
      duration_minutes: null,
      timestamp: now,
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

  // Only the company owner can delete leads
  if (!canManageAll(req.user)) {
    return ApiResponse.error(res, 'Access denied: Only Company Owner can delete leads.', 403);
  }

  const index = dataStore.leads.findIndex((l) => l.id === id);
  if (index === -1) {
    return ApiResponse.error(res, 'Lead not found', 404);
  }

  const targetLead = dataStore.leads[index];
  if (!isLeadInUserScope(targetLead, req.user)) {
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
