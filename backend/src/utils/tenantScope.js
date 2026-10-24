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

  const { isOwnerUser } = require('./access');
  const isOwner = isOwnerUser(user);
  const ownerId = isOwner ? user.id : (user.created_by || user.company_id || user.id);
  const companyId = user.company_id || (isOwner ? ('comp_' + user.id) : null);

  const { dataStore } = require('../repositories/dataStore');
  const users = (dataStore && dataStore.users) ? dataStore.users : [];

  // Staff members strictly belonging to this owner
  const staffMembers = users.filter(
    (u) =>
      u.persona !== 'owner' &&
      !(u.role === 'admin' && u.persona !== 'staff') &&
      (u.created_by === ownerId ||
        (user.email && u.created_by && u.created_by.toLowerCase() === user.email.toLowerCase()) ||
        (companyId && companyId !== 'comp_1' && companyId !== 'comp_traveltrade_1' && u.company_id === companyId))
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

/**
 * Enforces strict tenant separation on a list of users, ensuring
 * every owner has their own company and every staff member is
 * linked only to their owner.
 */
function enforceTenantIsolation(users) {
  if (!Array.isArray(users) || users.length === 0) return users;

  const ownerCompanyMap = {
    'usr_1789924957033_xthwzi': { company_id: 'comp_punia_1789924957033', company_name: "punia's Workspace" },
    'usr_1790485912422_52s5fh': { company_id: 'comp_sagar_1790485912422', company_name: "sagar's Workspace" },
    'usr_1790497494307_dcds9e': { company_id: 'comp_testowner_1790497494307', company_name: "Travel-Trade" },
    'usr_1791306043083_9p353t': { company_id: 'comp_sagarpunia_1791306043083', company_name: "sagarpunia's Workspace" },
    'usr_1791308692781_zo9rj5': { company_id: 'comp_ambani_1791308692781', company_name: "ambani's Workspace" },
    'usr_1791460149959_h6fqui': { company_id: 'comp_athish_1791460149959', company_name: "Athish Ravikanth's Workspace" },
    'usr_1791814360788_t8vbux': { company_id: 'comp_sunil_1791814360788', company_name: "Ambavi International" },
    'usr_1791814468302_hoa08z': { company_id: 'comp_bioniversio_1', company_name: "Bioniversio Biologics" },
    'usr_1791906296111_uweyz8': { company_id: 'comp_binti_1791906296111', company_name: "binti's Workspace" },
    'usr_1791988353309_kln9hb': { company_id: 'comp_1791988353309_h1djru', company_name: "soch's Workspace" },
  };

  const staffOwnerMap = {
    'usr_1791306183682_rh51dw': { created_by: 'usr_1791306043083_9p353t', company_id: 'comp_sagarpunia_1791306043083', company_name: "sagarpunia's Workspace" },
    'papu@gmail.com': { created_by: 'usr_1791306043083_9p353t', company_id: 'comp_sagarpunia_1791306043083', company_name: "sagarpunia's Workspace" },
    'usr_1791309008897_voir4i': { created_by: 'usr_1791308692781_zo9rj5', company_id: 'comp_ambani_1791308692781', company_name: "ambani's Workspace" },
    'sahil@gmail.com': { created_by: 'usr_1791308692781_zo9rj5', company_id: 'comp_ambani_1791308692781', company_name: "ambani's Workspace" },
    'usr_1791372966148_kt8sua': { created_by: 'usr_1791308692781_zo9rj5', company_id: 'comp_ambani_1791308692781', company_name: "ambani's Workspace" },
    'sa@gmail.com': { created_by: 'usr_1791308692781_zo9rj5', company_id: 'comp_ambani_1791308692781', company_name: "ambani's Workspace" },
    'usr_1791459430052_bmpz72': { created_by: 'usr_1790485912422_52s5fh', company_id: 'comp_sagar_1790485912422', company_name: "sagar's Workspace" },
    'sagarpunia@gmail.com': { created_by: 'usr_1790485912422_52s5fh', company_id: 'comp_sagar_1790485912422', company_name: "sagar's Workspace" },
    'usr_1791460244556_5226eo': { created_by: 'usr_1791460149959_h6fqui', company_id: 'comp_athish_1791460149959', company_name: "Athish Ravikanth's Workspace" },
    'sagarpunia789@gmail.com': { created_by: 'usr_1791460149959_h6fqui', company_id: 'comp_athish_1791460149959', company_name: "Athish Ravikanth's Workspace" },
    'usr_1791993470575_8mv3oh': { created_by: 'usr_1791988353309_kln9hb', company_id: 'comp_1791988353309_h1djru', company_name: "soch's Workspace" },
    'deepak@gmail.com': { created_by: 'usr_1791988353309_kln9hb', company_id: 'comp_1791988353309_h1djru', company_name: "soch's Workspace" },
    'usr_1791995214954_dldsfy': { created_by: 'usr_1791988353309_kln9hb', company_id: 'comp_1791988353309_h1djru', company_name: "soch's Workspace" },
    'vasu@gmail.com': { created_by: 'usr_1791988353309_kln9hb', company_id: 'comp_1791988353309_h1djru', company_name: "soch's Workspace" },
  };

  // 1. Process owners
  for (const u of users) {
    const isOwner = u.persona === 'owner' || (u.role === 'admin' && u.persona !== 'staff');
    if (isOwner) {
      u.persona = 'owner';
      u.role = 'admin';
      if (ownerCompanyMap[u.id]) {
        u.company_id = ownerCompanyMap[u.id].company_id;
        u.company_name = ownerCompanyMap[u.id].company_name;
      } else if (!u.company_id || u.company_id === 'comp_1' || u.company_id === 'comp_traveltrade_1') {
        u.company_id = 'comp_' + u.id;
        u.company_name = u.company_name || `${u.name}'s Workspace`;
      }
    }
  }

  // 2. Process staff
  for (const u of users) {
    if (u.persona === 'staff' || (u.role !== 'admin' && u.id !== 'usr_super_admin')) {
      u.persona = 'staff';
      // Staff can never carry the owner/admin role (older data could have it)
      if (u.role === 'admin') u.role = 'manager';
      const mapping = staffOwnerMap[u.id] || (u.email && staffOwnerMap[u.email.toLowerCase()]);
      if (mapping) {
        u.created_by = mapping.created_by;
        u.company_id = mapping.company_id;
        u.company_name = mapping.company_name;
      } else if (u.created_by) {
        const owner = users.find(
          (o) =>
            (o.persona === 'owner' || o.role === 'admin') &&
            (o.id === u.created_by || (o.email && o.email.toLowerCase() === u.created_by.toLowerCase()))
        );
        if (owner) {
          u.company_id = owner.company_id;
          u.company_name = owner.company_name;
        }
      }
    }
  }

  return users;
}

module.exports = {
  getTenantContext,
  isLeadInUserScope,
  enforceTenantIsolation,
};
