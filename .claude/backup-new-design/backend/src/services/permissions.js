/**
 * Role-based permissions for company users.
 *
 * Roles: owner (one per company, full control), manager, agent (sales staff).
 * Owners can override the toggleable permissions per staff member; everything else
 * (staff management, settings, audit log, trash) is owner-only and cannot be granted.
 */

const ROLES = ['owner', 'manager', 'agent'];

const ROLE_DEFAULTS = {
  owner: {
    leads_scope: 'all',
    leads_create: true,
    leads_edit: true,
    leads_delete: true,
    leads_reassign: true,
    leads_export: true,
    leads_import: true,
    tasks_assign: true,
    analytics_scope: 'company',
    team_reports: true,
  },
  manager: {
    leads_scope: 'all',
    leads_create: true,
    leads_edit: true,
    leads_delete: false,
    leads_reassign: true,
    leads_export: false,
    leads_import: true,
    tasks_assign: true,
    analytics_scope: 'company',
    team_reports: true,
  },
  agent: {
    leads_scope: 'own',
    leads_create: true,
    leads_edit: true,
    leads_delete: false,
    leads_reassign: false,
    leads_export: false,
    leads_import: false,
    tasks_assign: false,
    analytics_scope: 'own',
    team_reports: false,
  },
};

// Allowed values for each toggleable permission
const PERMISSION_SPEC = {
  leads_scope: ['own', 'all'],
  leads_create: [true, false],
  leads_edit: [true, false],
  leads_delete: [true, false],
  leads_reassign: [true, false],
  leads_export: [true, false],
  leads_import: [true, false],
  tasks_assign: [true, false],
  analytics_scope: ['own', 'company'],
  team_reports: [true, false],
};

const normalizeRole = (role) => {
  if (role === 'admin' || role === 'owner') return 'owner';
  if (role === 'manager') return 'manager';
  return 'agent';
};

/** Keeps only known permission keys with valid values. */
const sanitizePermissionOverrides = (input) => {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const [key, allowed] of Object.entries(PERMISSION_SPEC)) {
    if (input[key] !== undefined && allowed.includes(input[key])) out[key] = input[key];
  }
  return out;
};

/** Effective permissions = role defaults + owner's overrides (owners always get everything). */
const resolvePermissions = (user) => {
  const role = normalizeRole(user.role);
  const base = ROLE_DEFAULTS[role];
  if (role === 'owner') {
    return { ...base, manage_staff: true, manage_settings: true, view_audit_log: true, manage_trash: true };
  }
  return {
    ...base,
    ...sanitizePermissionOverrides(user.permissions),
    manage_staff: false,
    manage_settings: false,
    view_audit_log: false,
    manage_trash: false,
  };
};

const isOwner = (user) => normalizeRole(user.role) === 'owner';

/** Mongo-style filter limiting which leads this user may see. */
const leadVisibilityFilter = (user) => {
  const perms = resolvePermissions(user);
  const base = { deleted_at: null };
  return perms.leads_scope === 'all' ? base : { ...base, assigned_to: user.id };
};

const canSeeLead = (user, lead) => {
  if (!lead || lead.deleted_at) return false;
  return resolvePermissions(user).leads_scope === 'all' || lead.assigned_to === user.id;
};

module.exports = {
  ROLES,
  ROLE_DEFAULTS,
  PERMISSION_SPEC,
  normalizeRole,
  sanitizePermissionOverrides,
  resolvePermissions,
  isOwner,
  leadVisibilityFilter,
  canSeeLead,
};
