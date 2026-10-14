const { dataStore } = require('../repositories/dataStore');

/**
 * Returns tenant isolation context for an authenticated user.
 */
function getTenantContext(user) {
  if (!user) {
    return {
      isSuperAdmin: false,
      isOwner: false,
      ownerId: null,
      companyId: null,
      allowedUserIds: new Set(),
      allowedEmails: new Set(),
    };
  }

  if (user.id === 'usr_super_admin') {
    return { isSuperAdmin: true };
  }

  const isOwner = user.persona === 'owner' || user.role === 'admin';
  const ownerId = isOwner ? user.id : (user.created_by || user.company_id || user.id);
  const companyId = user.company_id || ownerId;

  // Staff members belonging to this owner
  const staffMembers = (dataStore.users || []).filter(
    (u) => u.created_by === ownerId || (companyId && u.company_id === companyId)
  );

  const allowedUserIds = new Set([ownerId, user.id, ...staffMembers.map((s) => s.id)]);
  const allowedEmails = new Set(
    [user.email, ...staffMembers.map((s) => s.email)]
      .filter(Boolean)
      .map((e) => e.toLowerCase())
  );

  return {
    isSuperAdmin: false,
    isOwner,
    ownerId,
    companyId,
    allowedUserIds,
    allowedEmails,
  };
}

/**
 * Determines whether a lead belongs to the user's organization and visibility scope.
 */
function isLeadInUserScope(lead, user) {
  if (!user || !lead) return false;
  if (user.id === 'usr_super_admin') return true;

  const ctx = getTenantContext(user);

  // 1. Organization / Tenant membership check
  let belongsToOrg = false;

  if (lead.company_id && (lead.company_id === ctx.companyId || lead.company_id === ctx.ownerId)) {
    belongsToOrg = true;
  } else if (lead.owner_id && lead.owner_id === ctx.ownerId) {
    belongsToOrg = true;
  } else if (lead.created_by_id && ctx.allowedUserIds.has(lead.created_by_id)) {
    belongsToOrg = true;
  } else if (
    lead.assigned_to &&
    (ctx.allowedUserIds.has(lead.assigned_to) || ctx.allowedEmails.has(lead.assigned_to.toLowerCase()))
  ) {
    belongsToOrg = true;
  }

  if (!belongsToOrg) {
    return false;
  }

  // 2. Role & Data Scope check
  if (ctx.isOwner) {
    return true;
  }

  // Staff member with all-company data scope
  if (user.data_scope === 'all') {
    return true;
  }

  // Staff member with own-only data scope
  return (
    lead.assigned_to === user.id ||
    lead.assigned_to === user.email ||
    lead.assigned_to === user.name ||
    lead.created_by_id === user.id
  );
}

module.exports = {
  getTenantContext,
  isLeadInUserScope,
};
