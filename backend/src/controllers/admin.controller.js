const os = require('os');
const bcrypt = require('bcryptjs');
const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync, saveSnapshot } = require('../repositories/dataStore');
const { systemMetrics } = require('../middlewares/responseTime.middleware');
const { mongoose, isDbConnected } = require('../config/db');
const config = require('../config/env');

const GENERIC_COMPANY_IDS = ['comp_1', 'comp_traveltrade_1', 'comp_stellarsync_1', 'comp_default', ''];

/**
 * List all users / employees (Admin only)
 */
const getAllUsers = async (req, res) => {
  const { role, search, status } = req.query;
  let results = [...dataStore.users];

  // Strict Tenant Isolation: only return staff members belonging to the requester's own company/account
  if (req.user && req.user.id !== 'usr_super_admin') {
    const isOwner = req.user.persona === 'owner' || req.user.role === 'admin';
    const ownerId = isOwner ? req.user.id : (req.user.created_by || req.user.id);
    const ownerCompanyId = req.user.company_id || (isOwner ? ('comp_' + req.user.id) : null);
    const includeSelf = req.query.include_self === 'true';
    const isKeerthanaCompany =
      ownerCompanyId === 'comp_bioniversio_1' ||
      ownerId === 'usr_1791814468302_hoa08z' ||
      req.user.email === 'bioniversiobiologics@arggroups.com' ||
      (req.user.name && req.user.name.includes('Keerthana'));

    results = results.filter((u) => {
      // Never return super admin or test accounts
      if (u.id === 'usr_super_admin' || u.id === 'usr_athish' || u.name === 'Athish' || u.name === 'Athish Ravikanth' || u.email === 'athishravikanth@gmail.com') {
        return false;
      }

      // If user is requester themselves
      if (u.id === req.user.id) {
        return includeSelf;
      }

      // Never return another owner as staff
      if (u.persona === 'owner' || (u.role === 'admin' && u.persona !== 'staff')) {
        return false;
      }

      // For Keerthana's company, specifically allow Sagar Punia and Rahul
      if (isKeerthanaCompany && (
        u.email === 'sagarpunia163@gmail.com' ||
        u.id === 'usr_1789929063747_allpa4' ||
        u.name === 'Sagar Punia' ||
        u.email === 'rahul@gmail.com' ||
        u.name === 'Rahul'
      )) {
        return true;
      }

      // STRICT OWNERSHIP CHECK:
      // If staff has created_by, it MUST match this owner:
      if (u.created_by) {
        return u.created_by === ownerId || (req.user.email && u.created_by.toLowerCase() === req.user.email.toLowerCase());
      }

      // Or belong to this owner's company (and NOT a generic shared company)
      if (
        ownerCompanyId &&
        !GENERIC_COMPANY_IDS.includes(ownerCompanyId) &&
        u.company_id &&
        u.company_id === ownerCompanyId
      ) {
        return true;
      }

      return false;
    });
  }

  if (role) {
    results = results.filter((u) => u.role === role);
  }
  if (status !== undefined) {
    const isActive = status === 'active' || status === 'true';
    results = results.filter((u) => u.is_active === isActive);
  }
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department && u.department.toLowerCase().includes(q))
    );
  }

  // Enrich each user with staff quota and associated employee breakdown
  const enrichedResults = results.map((u) => {
    const isOwner = u.persona === 'owner' || u.role === 'admin';
    const cleanUser = { ...u };
    delete cleanUser.password;

    if (isOwner) {
      // Keerthana company check for this owner
      const isKeerthana =
        u.company_id === 'comp_bioniversio_1' ||
        u.id === 'usr_1791814468302_hoa08z' ||
        u.email === 'bioniversiobiologics@arggroups.com' ||
        (u.name && u.name.includes('Keerthana'));

      // Find all staff members strictly belonging to this owner
      const staffList = dataStore.users
        .filter((s) => {
          if (s.id === u.id || s.persona === 'owner' || s.role === 'admin') return false;
          if (s.id === 'usr_athish' || s.name === 'Athish' || s.name === 'Athish Ravikanth' || s.email === 'athishravikanth@gmail.com') return false;

          if (isKeerthana && (
            s.email === 'sagarpunia163@gmail.com' ||
            s.id === 'usr_1789929063747_allpa4' ||
            s.name === 'Sagar Punia' ||
            s.email === 'rahul@gmail.com' ||
            s.name === 'Rahul'
          )) {
            return true;
          }

          if (s.created_by) {
            return s.created_by === u.id || (u.email && s.created_by.toLowerCase() === u.email.toLowerCase());
          }

          if (u.company_id && !GENERIC_COMPANY_IDS.includes(u.company_id) && s.company_id === u.company_id) {
            return true;
          }

          return false;
        })
        .map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          role: s.role,
          department: s.department,
          phone: s.phone || '',
          is_active: s.is_active,
          avatar_url: s.avatar_url,
          created_at: s.created_at,
          data_scope: s.data_scope,
          staff_password: s.staff_password || s.plain_password || '123456',
        }));

      // Free Trial / Default limit is 2 staff seats per owner unless adjusted by Admin
      const staffLimit =
        u.staff_limit !== undefined
          ? Number(u.staff_limit)
          : 2;

      return {
        ...cleanUser,
        is_owner: true,
        company_name: u.company_name || dataStore.company.name || 'Travel-Trade',
        staff_limit: staffLimit,
        staff_count: staffList.length,
        staff_list: staffList,
        plan: dataStore.company.plan || 'growth',
      };
    } else {
      // For staff, identify their reporting owner
      const owner = dataStore.users.find(
        (o) =>
          (o.persona === 'owner' || o.role === 'admin') &&
          o.id !== 'usr_super_admin' &&
          ((u.created_by && (o.id === u.created_by || (o.email && o.email.toLowerCase() === u.created_by.toLowerCase()))) ||
            (!u.created_by && u.company_id && !GENERIC_COMPANY_IDS.includes(u.company_id) && o.company_id === u.company_id))
      );

      return {
        ...cleanUser,
        is_owner: false,
        owner_name: owner ? owner.name : 'Company Owner',
        owner_id: owner ? owner.id : null,
        company_name: owner ? (owner.company_name || dataStore.company.name) : dataStore.company.name,
        staff_limit: u.staff_limit !== undefined ? Number(u.staff_limit) : 2,
        staff_count: 0,
        staff_list: [],
        staff_password: u.staff_password || u.plain_password || '123456',
      };
    }
  });

  const ownersCount = dataStore.users.filter((u) => u.persona === 'owner' || u.role === 'admin').length;
  const staffCount = dataStore.users.filter((u) => u.persona !== 'owner').length;

  return ApiResponse.success(res, enrichedResults, 'Users fetched successfully', 200, {
    total: enrichedResults.length,
    activeCount: enrichedResults.filter((u) => u.is_active).length,
    adminsCount: enrichedResults.filter((u) => u.role === 'admin').length,
    ownersCount,
    staffCount,
    defaultStaffLimit: 2,
  });
};

/**
 * Create a new staff/employee under the Company Owner
 */
const createUser = async (req, res) => {
  const { name, email, role, department, phone, password, avatar_url, permissions, data_scope } = req.body;

  if (!name || !email) {
    return ApiResponse.error(res, 'Staff Name and Email are required', 400);
  }

  const existing = dataStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (existing) {
    return ApiResponse.error(res, 'A staff member with this email already exists', 409);
  }

  // Resolve creating business owner
  let owner = null;
  if (req.user && (req.user.persona === 'owner' || req.user.role === 'admin') && req.user.id !== 'usr_super_admin') {
    owner = req.user;
  } else if (req.body.owner_id || req.body.company_id) {
    const targetOwnerId = req.body.owner_id;
    const targetCompId = req.body.company_id;
    owner = dataStore.users.find(
      (u) =>
        (u.persona === 'owner' || u.role === 'admin') &&
        u.id !== 'usr_super_admin' &&
        ((targetOwnerId && (u.id === targetOwnerId || (u.email && u.email.toLowerCase() === String(targetOwnerId).toLowerCase()))) ||
          (targetCompId && (u.company_id === targetCompId || u.id === targetCompId)))
    );
  }
  if (!owner && req.user && req.user.id !== 'usr_super_admin') {
    owner = req.user;
  }
  if (!owner) {
    return ApiResponse.error(res, 'Please select the Business Owner account to which this staff member belongs.', 400);
  }

  const staffLimit =
    owner.staff_limit !== undefined
      ? Number(owner.staff_limit)
      : 2;

  const ownerCompanyIdRaw = owner.company_id || ('comp_' + owner.id);
  const currentStaffCount = dataStore.users.filter((u) => {
    if (u.persona === 'owner' || u.role === 'admin' || u.id === owner.id) return false;
    if (u.created_by) {
      return u.created_by === owner.id || (owner.email && u.created_by.toLowerCase() === owner.email.toLowerCase());
    }
    return (
      ownerCompanyIdRaw &&
      !GENERIC_COMPANY_IDS.includes(ownerCompanyIdRaw) &&
      u.company_id === ownerCompanyIdRaw
    );
  }).length;

  if (currentStaffCount >= staffLimit) {
    return ApiResponse.error(
      res,
      `Staff seat limit reached (${currentStaffCount}/${staffLimit} seats used). By default, business owners are allowed up to ${staffLimit} staff members. The Super Admin can increase your quota in the Admin Console.`,
      403
    );
  }

  // Staff is not an admin - default to 'agent' / 'staff'
  const userRole = role === 'admin' ? 'manager' : (role || 'agent');

  const rawPassword = password || 'staff123';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(rawPassword, salt);

  const defaultPermissions = {
    view_analytics: false, // Default hidden from staff as requested
    view_leads: true,
    view_tasks: true,
    view_followup: true,
    view_outreach: true,
    view_activity: true,
    view_mydays: true,
    can_read: true,
    can_create: true,
    can_update: true,
    can_delete: false, // Prevent deleting other staff's or company data
    admin_access: false, // Strict: staff NEVER has main admin access
  };

  const ownerId = owner.id;
  let ownerCompanyId = owner.company_id || req.user?.company_id;
  if (!ownerCompanyId || GENERIC_COMPANY_IDS.includes(ownerCompanyId)) {
    ownerCompanyId = 'comp_' + ownerId;
    owner.company_id = ownerCompanyId;
    dbSync.saveUser({ id: owner.id, company_id: ownerCompanyId });
    if (req.user && req.user.id === owner.id) req.user.company_id = ownerCompanyId;
  }
  const ownerCompanyName = owner.company_name || req.user?.company_name || (owner.name ? `${owner.name}'s Workspace` : 'My Organization');

    const newUser = {
      id: generateId('usr'),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      staff_password: rawPassword,
      role: userRole,
      persona: 'staff',
      department: department || 'Commodity Sales & Operations',
      phone: phone || '',
      is_active: true,
      avatar_url:
        avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      data_scope: data_scope || 'own_only', // 'own_only' | 'all'
      permissions: permissions
        ? { ...defaultPermissions, ...permissions, admin_access: false }
        : defaultPermissions,
      company_id: ownerCompanyId,
      company_name: ownerCompanyName,
      created_by: ownerId,
      last_login: null,
      created_at: new Date().toISOString(),
    };

  dataStore.users.push(newUser);
  dbSync.saveUser(newUser);

  // Record audit log
  const auditLog = {
    id: generateId('log'),
    actor_name: req.user ? req.user.name : 'Company Owner',
    actor_id: req.user ? req.user.id : 'usr_admin_1',
    action: 'STAFF_CREATED',
    details: `Owner added staff member ${name} (${email}) with role '${userRole}', scope: '${newUser.data_scope}'`,
    ip_address: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  };
  dataStore.auditLogs.unshift(auditLog);
  dbSync.saveAuditLog(auditLog);

  const cleanUser = { ...newUser, staff_password: rawPassword, company_name: ownerCompanyName };
  delete cleanUser.password;

  return ApiResponse.created(res, cleanUser, 'Staff member created successfully');
};

/**
 * Update user granular permissions, role, department, data scope, or details
 */
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, department, phone, permissions, data_scope, is_active } = req.body;

  const user = dataStore.users.find(
    (u) => u.id === id || String(u._id) === id || u.email?.toLowerCase() === id?.toLowerCase()
  );
  if (!user) {
    return ApiResponse.error(res, 'User not found', 404);
  }

  // Strict tenant authorization: owner can only modify their own staff
  if (req.user && req.user.id !== 'usr_super_admin') {
    const isOwner = req.user.persona === 'owner' || req.user.role === 'admin';
    const ownerId = isOwner ? req.user.id : (req.user.created_by || req.user.id);
    const ownerCompId = req.user.company_id;

    const belongsToMe =
      user.id === req.user.id ||
      (user.created_by
        ? (user.created_by === ownerId || (req.user.email && user.created_by.toLowerCase() === req.user.email.toLowerCase()))
        : (ownerCompId && !GENERIC_COMPANY_IDS.includes(ownerCompId) && user.company_id === ownerCompId));

    if (!belongsToMe) {
      return ApiResponse.error(res, 'Access denied: You can only modify personnel belonging to your organization.', 403);
    }
  }

  if (name) user.name = name.trim();
  if (email) user.email = email.toLowerCase().trim();
  if (role && ['admin', 'manager', 'agent'].includes(role)) {
    if (user.role !== 'admin' || req.user.id === user.id) {
      user.role = role;
    }
  }
  if (department !== undefined) user.department = department;
  if (phone !== undefined) user.phone = phone;
  if (is_active !== undefined) user.is_active = is_active;
  if (data_scope !== undefined) user.data_scope = data_scope;
  if (req.body.avatar_url !== undefined) user.avatar_url = req.body.avatar_url;
  if (req.body.password && req.body.password.length >= 6) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
    user.staff_password = req.body.password;
  } else if (req.body.staff_password) {
    user.staff_password = req.body.staff_password;
  }
  if (permissions !== undefined) {
    user.permissions = {
      ...(user.permissions || {}),
      ...permissions,
      admin_access: false, // Staff never get main admin access
    };
  }

  dbSync.saveUser(user);

  // Audit log
  const auditLog = {
    id: generateId('log'),
    actor_name: req.user ? req.user.name : 'Company Owner',
    actor_id: req.user ? req.user.id : 'usr_admin_1',
    action: 'STAFF_PERMISSIONS_UPDATED',
    details: `Updated permissions & data scope for ${user.name} (${user.email})`,
    ip_address: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  };
  dataStore.auditLogs.unshift(auditLog);
  dbSync.saveAuditLog(auditLog);

  const cleanUser = { ...user, staff_password: user.staff_password || '' };
  delete cleanUser.password;

  return ApiResponse.success(res, cleanUser, 'Staff member permissions updated successfully');
};

/**
 * Delete a staff user (Owner only)
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;
  const targetId = String(id).trim();

  // 1. Find user in memory by id, _id, or email
  let userIndex = dataStore.users.findIndex(
    (u) =>
      u.id === targetId ||
      String(u._id) === targetId ||
      (u.email && u.email.toLowerCase() === targetId.toLowerCase())
  );

  let user = userIndex !== -1 ? dataStore.users[userIndex] : null;

  // 2. Prevent deleting Company Owner account or Super Admin
  if (user && (user.id === 'usr_super_admin' || user.persona === 'owner' || (user.role === 'admin' && user.persona !== 'staff'))) {
    return ApiResponse.error(res, 'Cannot delete Company Owner account', 400);
  }

  // Strict tenant authorization: owner can only delete their own personnel
  if (req.user && req.user.id !== 'usr_super_admin' && user) {
    const isOwner = req.user.persona === 'owner' || req.user.role === 'admin';
    const ownerId = isOwner ? req.user.id : (req.user.created_by || req.user.id);
    const ownerCompId = req.user.company_id;

    const belongsToMe =
      user.created_by
        ? (user.created_by === ownerId || (req.user.email && user.created_by.toLowerCase() === req.user.email.toLowerCase()))
        : (ownerCompId && !GENERIC_COMPANY_IDS.includes(ownerCompId) && user.company_id === ownerCompId);

    if (!belongsToMe) {
      return ApiResponse.error(res, 'Access denied: You can only delete personnel belonging to your organization.', 403);
    }
  }

  // 3. Remove from in-memory dataStore.users
  if (userIndex !== -1) {
    dataStore.users.splice(userIndex, 1);
  } else {
    dataStore.users = dataStore.users.filter(
      (u) =>
        u.id !== targetId &&
        String(u._id) !== targetId &&
        (!u.email || u.email.toLowerCase() !== targetId.toLowerCase())
    );
  }

  // 4. Add to backend deleted tombstones so restarts or snapshots don't re-seed
  dataStore.deletedUserIds = dataStore.deletedUserIds || [];
  dataStore.deletedUserEmails = dataStore.deletedUserEmails || [];
  if (targetId && !dataStore.deletedUserIds.includes(targetId)) dataStore.deletedUserIds.push(targetId);
  if (user?.id && !dataStore.deletedUserIds.includes(user.id)) dataStore.deletedUserIds.push(user.id);
  if (user?._id && !dataStore.deletedUserIds.includes(String(user._id))) dataStore.deletedUserIds.push(String(user._id));
  if (user?.email && !dataStore.deletedUserEmails.includes(user.email.toLowerCase())) {
    dataStore.deletedUserEmails.push(user.email.toLowerCase());
  }

  // 5. Delete from DB via dbSync
  const identifierToDelete = user?.id || user?._id || user?.email || targetId;
  await dbSync.deleteUser(identifierToDelete);

  // 6. Audit log
  try {
    const auditEntry = {
      id: generateId('audit'),
      action: 'DELETE_STAFF',
      performed_by: req.user?.email || req.user?.name || 'Owner',
      target: user?.email || user?.name || targetId,
      details: `Owner removed staff member ${user?.name || ''} (${user?.email || targetId})`,
      timestamp: new Date().toISOString(),
    };
    dataStore.auditLogs.unshift(auditEntry);
    saveSnapshot();
  } catch (e) {}

  return ApiResponse.success(res, { id: targetId, deleted: true }, 'Staff member deleted successfully');
};

/**
 * Update user role or department (backward compatibility)
 */
const updateUserRole = async (req, res) => {
  return updateUser(req, res);
};

/**
 * Toggle user active/inactive status
 */
const toggleUserStatus = async (req, res) => {
  const { id } = req.params;
  const user = dataStore.users.find((u) => u.id === id);

  if (!user) {
    return ApiResponse.error(res, 'User not found', 404);
  }

  // Prevent self-deactivation if sole admin
  if (req.user && req.user.id === user.id && user.role === 'admin') {
    return ApiResponse.error(res, 'You cannot deactivate your own admin account', 400);
  }

  user.is_active = !user.is_active;
  user.status = user.is_active ? 'active' : 'suspended';
  dbSync.saveUser(user);

  // Audit log
  const auditLog = {
    id: generateId('log'),
    actor_name: req.user ? req.user.name : 'System Admin',
    actor_id: req.user ? req.user.id : 'usr_admin_1',
    action: user.is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    details: `${user.is_active ? 'Activated' : 'Deactivated'} account for ${user.name} (${user.email})`,
    ip_address: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  };
  dataStore.auditLogs.unshift(auditLog);
  dbSync.saveAuditLog(auditLog);

  return ApiResponse.success(res, user, `User ${user.is_active ? 'activated' : 'deactivated'} successfully`);
};

/**
 * Update staff seat limit for an owner / company (Super Admin only)
 */
const updateStaffLimit = async (req, res) => {
  const { id } = req.params;
  const { staff_limit } = req.body;

  if (staff_limit === undefined || isNaN(Number(staff_limit)) || Number(staff_limit) < 0) {
    return ApiResponse.error(res, 'Valid staff_limit number is required (0 or more)', 400);
  }

  const user = dataStore.users.find(
    (u) => u.id === id || String(u._id) === id || u.email?.toLowerCase() === id?.toLowerCase()
  );
  if (!user) {
    return ApiResponse.error(res, 'Owner / User not found', 404);
  }

  const newLimit = Number(staff_limit);
  user.staff_limit = newLimit;

  // Mark user as owner so they can manage staff up to their new quota
  if (user.persona !== 'owner' && user.role !== 'admin') {
    user.persona = 'owner';
  }

  // Sync with company quota if primary owner or admin
  if (user.persona === 'owner' || user.role === 'admin') {
    dataStore.company.maxStaff = newLimit;
    dbSync.saveCompany(dataStore.company);
  }

  dbSync.saveUser(user);

  // Record audit log
  const auditLog = {
    id: generateId('log'),
    actor_name: req.user ? req.user.name : 'Super Admin',
    actor_id: req.user ? req.user.id : 'usr_admin_1',
    action: 'STAFF_LIMIT_UPDATED',
    details: `Updated staff quota limit for ${user.name} (${user.email}) to ${newLimit} seats`,
    ip_address: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  };
  dataStore.auditLogs.unshift(auditLog);
  dbSync.saveAuditLog(auditLog);

  // Compute refreshed staff list
  const staffList = dataStore.users
    .filter(
      (s) =>
        s.id !== user.id &&
        s.persona !== 'owner' &&
        s.role !== 'admin' &&
        ((user.company_id && s.company_id === user.company_id) ||
          s.created_by === user.id ||
          s.created_by === user.email)
    )
    .map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role,
      department: s.department,
      phone: s.phone || '',
      is_active: s.is_active,
      avatar_url: s.avatar_url,
      created_at: s.created_at,
    }));

  const enrichedUser = {
    ...user,
    is_owner: true,
    staff_limit: newLimit,
    staff_count: staffList.length,
    staff_list: staffList,
    company_name: user.company_name || dataStore.company.name || 'Travel-Trade',
  };
  delete enrichedUser.password;

  return ApiResponse.success(
    res,
    enrichedUser,
    `Staff limit for ${user.name} successfully updated to ${newLimit} seats!`
  );
};

/**
 * Super Admin: switch premium features on/off for a company owner
 * PATCH /admin/users/:id/features  { email_marketing: true|false }
 */
const updateUserFeatures = async (req, res) => {
  const { id } = req.params;
  const allowed = ['email_marketing'];
  const updates = {};
  for (const key of allowed) {
    if (req.body && req.body[key] !== undefined) updates[key] = Boolean(req.body[key]);
  }
  if (Object.keys(updates).length === 0) {
    return ApiResponse.error(res, `Provide at least one feature flag: ${allowed.join(', ')}`, 400);
  }

  const user = dataStore.users.find(
    (u) => u.id === id || String(u._id) === id || u.email?.toLowerCase() === id?.toLowerCase()
  );
  if (!user) {
    return ApiResponse.error(res, 'Owner / User not found', 404);
  }
  if (user.persona !== 'owner' && user.role !== 'admin') {
    return ApiResponse.error(res, 'Premium features can only be enabled for company owners', 400);
  }

  user.features = { ...(user.features || {}), ...updates };
  dbSync.saveUser(user);

  const auditLog = {
    id: generateId('log'),
    actor_name: req.user ? req.user.name : 'Super Admin',
    actor_id: req.user ? req.user.id : 'usr_admin_1',
    action: 'FEATURES_UPDATED',
    details: `${Object.entries(updates).map(([k, v]) => `${k}=${v ? 'ON' : 'OFF'}`).join(', ')} for ${user.name} (${user.email})`,
    ip_address: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  };
  dataStore.auditLogs.unshift(auditLog);
  dbSync.saveAuditLog(auditLog);

  const cleanUser = { ...user };
  delete cleanUser.password;
  return ApiResponse.success(res, cleanUser, `Features updated for ${user.name}`);
};

/**
 * Real-time System Performance & Health Monitor
 */
const getSystemHealth = async (req, res) => {
  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  const healthData = {
    status: 'OPTIMAL',
    nodeVersion: process.version,
    platform: process.platform,
    uptimeSeconds,
    uptimeHuman: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
    memory: {
      heapUsedMb: (mem.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMb: (mem.heapTotal / 1024 / 1024).toFixed(2),
      rssMb: (mem.rss / 1024 / 1024).toFixed(2),
    },
    systemLoad: {
      freeMemoryMb: (os.freemem() / 1024 / 1024).toFixed(2),
      totalMemoryMb: (os.totalmem() / 1024 / 1024).toFixed(2),
      cpus: os.cpus().length,
    },
    metrics: {
      totalRequests: systemMetrics.totalRequests,
      avgLatencyMs: systemMetrics.averageResponseTimeMs,
      lastLatencyMs: systemMetrics.lastResponseTimeMs,
      peakLatencyMs: systemMetrics.peakResponseTimeMs,
    },
    recentTraffic: systemMetrics.history.slice(-10),
  };

  return ApiResponse.success(res, healthData, 'System performance health metrics');
};

/**
 * Get Audit Logs
 */
const getAuditLogs = async (req, res) => {
  return ApiResponse.success(res, dataStore.auditLogs, 'Audit logs retrieved');
};

/**
 * Update Company Settings
 */
const updateCompanySettings = async (req, res) => {
  const { name, industry, revenueTargetMonthly, timezone } = req.body;

  if (name) dataStore.company.name = name;
  if (industry) dataStore.company.industry = industry;
  if (revenueTargetMonthly) dataStore.company.revenueTargetMonthly = Number(revenueTargetMonthly);
  if (timezone) dataStore.company.timezone = timezone;

  dbSync.saveCompany(dataStore.company);

  const auditLog = {
    id: generateId('log'),
    actor_name: req.user ? req.user.name : 'System Admin',
    actor_id: req.user ? req.user.id : 'usr_admin_1',
    action: 'SETTINGS_UPDATED',
    details: 'Updated company profile settings',
    ip_address: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  };
  dataStore.auditLogs.unshift(auditLog);
  dbSync.saveAuditLog(auditLog);

  return ApiResponse.success(res, dataStore.company, 'Company settings updated successfully');
};

/**
 * Get SaaS Subscription Plan and Quota usage
 */
const getSubscriptionInfo = async (req, res) => {
  const currentPlan = dataStore.plans[dataStore.company.plan] || dataStore.plans.growth;
  const staffCount = dataStore.users.length;
  const leadsCount = dataStore.leads.length;

  return ApiResponse.success(
    res,
    {
      currentPlan,
      plan: dataStore.company.plan,
      usage: {
        staffCount,
        maxStaff: dataStore.company.maxStaff,
        staffPercentage: Math.min(100, Math.round((staffCount / dataStore.company.maxStaff) * 100)),
        leadsCount,
        maxLeads: currentPlan.maxLeads,
      },
      availablePlans: dataStore.plans,
      company: dataStore.company,
    },
    'Subscription and quota retrieved successfully'
  );
};

/**
 * Upgrade or modify company subscription plan
 */
const upgradePlan = async (req, res) => {
  const { planId, maxStaff, plan } = req.body;
  const targetPlan = planId || plan;

  if (!targetPlan || !dataStore.plans[targetPlan]) {
    return ApiResponse.error(res, 'Invalid planId. Options: starter, growth, enterprise', 400);
  }

  const selectedPlan = dataStore.plans[targetPlan];
  const oldPlan = dataStore.company.plan;

  dataStore.company.plan = targetPlan;
  dataStore.company.maxStaff = maxStaff !== undefined ? Number(maxStaff) : selectedPlan.maxStaff;

  // Keep primary tenant in sync
  const primaryTenant = dataStore.tenants.find((t) => t.id === 'comp_stellarsync_1');
  if (primaryTenant) {
    primaryTenant.plan = targetPlan;
    primaryTenant.maxStaff = dataStore.company.maxStaff;
    primaryTenant.monthlyRevenue = selectedPlan.priceMonthly;
  }

  dbSync.saveCompany(dataStore.company);

  // Audit log
  const auditLog = {
    id: generateId('log'),
    actor_name: req.user ? req.user.name : 'System Owner',
    actor_id: req.user ? req.user.id : 'usr_admin_1',
    action: 'SUBSCRIPTION_PLAN_UPGRADED',
    details: `Upgraded subscription from ${oldPlan.toUpperCase()} to ${targetPlan.toUpperCase()} (${selectedPlan.priceMonthly}/mo, ${dataStore.company.maxStaff} staff seats)`,
    ip_address: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  };
  dataStore.auditLogs.unshift(auditLog);
  dbSync.saveAuditLog(auditLog);

  return ApiResponse.success(
    res,
    { company: dataStore.company, plan: targetPlan, planDetails: selectedPlan },
    `Plan successfully upgraded to ${selectedPlan.name}!`
  );
};

/**
 * Get all SaaS Tenants / Organizations
 */
const getAllTenants = async (req, res) => {
  // Sync primary tenant with live users
  const primary = dataStore.tenants.find((t) => t.id === 'comp_stellarsync_1');
  if (primary) {
    primary.currentStaff = dataStore.users.length;
    primary.maxStaff = dataStore.company.maxStaff;
    primary.plan = dataStore.company.plan;
  }

  return ApiResponse.success(
    res,
    dataStore.tenants,
    'Tenants fetched successfully',
    200,
    {
      totalTenants: dataStore.tenants.length,
      totalMRR: dataStore.tenants.reduce((acc, t) => acc + (t.monthlyRevenue || 0), 0),
      totalSeatsUsed: dataStore.tenants.reduce((acc, t) => acc + (t.currentStaff || 0), 0),
    }
  );
};

/**
 * Create a new tenant organization
 */
const createTenant = async (req, res) => {
  const { name, domain, owner_name, owner_email, email, plan } = req.body;
  if (!name) {
    return ApiResponse.error(res, 'Organization name is required', 400);
  }

  const finalOwnerEmail = owner_email || email || `admin@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  const selectedPlanKey = (plan && dataStore.plans[plan]) ? plan : 'starter';
  const planDetails = dataStore.plans[selectedPlanKey];

  const newTenant = {
    id: generateId('comp'),
    name,
    domain: domain || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    owner_name: owner_name || 'Founder',
    owner_email: finalOwnerEmail,
    plan: selectedPlanKey,
    maxStaff: planDetails.maxStaff,
    currentStaff: 1,
    status: 'active',
    monthlyRevenue: planDetails.priceMonthly,
    created_at: new Date().toISOString(),
  };

  dataStore.tenants.push(newTenant);

  dataStore.auditLogs.unshift({
    id: generateId('log'),
    actor_name: req.user ? req.user.name : 'Super Admin',
    actor_id: req.user ? req.user.id : 'usr_admin_1',
    action: 'TENANT_PROVISIONED',
    details: `Created new organization ${name} under ${selectedPlanKey.toUpperCase()} plan`,
    ip_address: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  return ApiResponse.created(res, newTenant, 'Tenant organization created successfully');
};

/**
 * Update tenant quota or plan
 */
const updateTenant = async (req, res) => {
  const { id } = req.params;
  const { plan, maxStaff, status } = req.body;

  const tenant = dataStore.tenants.find((t) => t.id === id);
  if (!tenant) {
    return ApiResponse.error(res, 'Tenant not found', 404);
  }

  if (plan && dataStore.plans[plan]) {
    tenant.plan = plan;
    tenant.monthlyRevenue = dataStore.plans[plan].priceMonthly;
    if (maxStaff === undefined) {
      tenant.maxStaff = dataStore.plans[plan].maxStaff;
    }
  }

  if (maxStaff !== undefined) {
    tenant.maxStaff = Number(maxStaff);
  }

  if (status) {
    tenant.status = status;
  }

  // If primary tenant modified, keep company object in sync
  if (tenant.id === 'comp_stellarsync_1') {
    if (plan) dataStore.company.plan = plan;
    if (tenant.maxStaff) dataStore.company.maxStaff = tenant.maxStaff;
  }

  dataStore.auditLogs.unshift({
    id: generateId('log'),
    actor_name: req.user ? req.user.name : 'Super Admin',
    actor_id: req.user ? req.user.id : 'usr_admin_1',
    action: 'TENANT_UPDATED',
    details: `Updated ${tenant.name} quota: ${tenant.plan.toUpperCase()} (${tenant.maxStaff} seats)`,
    ip_address: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });

  return ApiResponse.success(res, tenant, 'Tenant updated successfully');
};

/**
 * Consolidated CRM and Platform Overview Summary
 */
const getOverviewSummary = async (req, res) => {
  const users = dataStore.users || [];
  const leads = dataStore.leads || [];
  const tasks = dataStore.tasks || [];

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const adminsCount = users.filter((u) => u.role === 'admin').length;
  const managersCount = users.filter((u) => u.role === 'manager').length;
  const agentsCount = users.filter((u) => u.role === 'agent').length;

  const totalLeads = leads.length;
  const pipelineValue = leads.reduce((sum, l) => sum + (Number(l.deal_value || l.value) || 0), 0);
  const wonLeads = leads.filter((l) => l.stage === 'Closed Won' || l.stage === 'Won').length;

  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter((t) => t.status !== 'Completed').length;

  const uptimeSeconds = Math.floor(process.uptime());

  const summary = {
    team: {
      total: totalUsers,
      active: activeUsers,
      admins: adminsCount,
      managers: managersCount,
      agents: agentsCount,
      recentUsers: users.slice(-5).reverse(),
    },
    crm: {
      totalLeads,
      pipelineValue,
      wonLeads,
      totalTasks,
      pendingTasks,
    },
    company: dataStore.company,
    health: {
      status: 'OPTIMAL',
      uptimeHuman: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
      nodeVersion: process.version,
    },
  };

  return ApiResponse.success(res, summary, 'Admin overview summary metrics');
};

/**
 * Send notification from Admin to Owner(s) / Users
 */
const sendNotification = async (req, res) => {
  const { target, target_user_id, target_name, title, message, type, priority } = req.body;

  if (!title || !message) {
    return ApiResponse.error(res, 'Title and Message are required for notification', 400);
  }

  const newNotification = {
    id: generateId('notif'),
    target: target || 'all_owners', // 'all_owners' | 'all' | 'specific_user'
    target_user_id: target_user_id || null,
    target_name: target_name || (target === 'all_owners' ? 'All Business Owners' : 'All Users'),
    title: title.trim(),
    message: message.trim(),
    type: type || 'subscription', // 'subscription' | 'warning' | 'info' | 'success'
    priority: priority || 'high',
    created_at: new Date().toISOString(),
    created_by: req.user ? req.user.name : 'Super Administrator',
    read_by: [],
  };

  dataStore.notifications.unshift(newNotification);
  dbSync.saveNotification(newNotification);

  // Record audit log
  const auditLog = {
    id: generateId('log'),
    actor_name: req.user ? req.user.name : 'Super Administrator',
    actor_id: req.user ? req.user.id : 'usr_super_admin',
    action: 'NOTIFICATION_SENT',
    details: `Sent [${newNotification.type.toUpperCase()}] notification "${title}" to ${newNotification.target_name}`,
    ip_address: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  };
  dataStore.auditLogs.unshift(auditLog);
  dbSync.saveAuditLog(auditLog);

  return ApiResponse.success(
    res,
    newNotification,
    `Notification "${title}" sent successfully to ${newNotification.target_name}!`,
    201
  );
};

/**
 * Get all sent notifications (Admin view)
 */
const getAdminNotifications = async (req, res) => {
  return ApiResponse.success(res, dataStore.notifications || [], 'Admin notifications retrieved');
};

/**
 * Delete a notification (Admin)
 */
const deleteAdminNotification = async (req, res) => {
  const { id } = req.params;
  const idx = dataStore.notifications.findIndex((n) => n.id === id);
  if (idx === -1) {
    return ApiResponse.error(res, 'Notification not found', 404);
  }
  const removed = dataStore.notifications.splice(idx, 1)[0];
  dbSync.deleteNotification(id);
  return ApiResponse.success(res, removed, 'Notification deleted successfully');
};

/**
 * Real-time Comprehensive Developer Metrics & System Observability
 * GET /api/v1/admin/developer-metrics
 */
const getDeveloperMetrics = async (req, res) => {
  try {
    const mem = process.memoryUsage();
    const uptimeSeconds = Math.floor(process.uptime());
    const dbConnected = isDbConnected();

    // 1. MongoDB Atlas Storage & Metrics
    let mongoStats = {
      connected: dbConnected,
      mode: dbConnected ? 'MongoDB Atlas (Cluster)' : 'In-Memory Fallback & Snapshot',
      databaseName: config.mongodbDbName || 'crm',
      atlasTier: 'M0 Sandbox (Free Tier)',
      storageLimitBytes: 536870912, // 512 MB Free Tier limit
      storageLimitMb: 512,
      dataSizeBytes: 0,
      dataSizeMb: '0.00',
      storageSizeBytes: 0,
      storageSizeMb: '0.00',
      indexSizeBytes: 0,
      indexSizeMb: '0.00',
      totalUsedBytes: 0,
      totalUsedMb: '0.00',
      freeMb: '512.00',
      percentUsed: '0.00',
      collectionsCount: 0,
      objectsCount: 0,
      collections: [],
      pingMs: null,
    };

    if (dbConnected && mongoose.connection.db) {
      const pingStart = Date.now();
      try {
        await mongoose.connection.db.admin().ping();
        mongoStats.pingMs = Date.now() - pingStart;
      } catch (e) {
        mongoStats.pingMs = null;
      }

      try {
        const stats = await mongoose.connection.db.stats();
        const totalUsed = (stats.storageSize || stats.dataSize || 0) + (stats.indexSize || 0);
        mongoStats.dataSizeBytes = stats.dataSize || 0;
        mongoStats.dataSizeMb = ((stats.dataSize || 0) / 1024 / 1024).toFixed(2);
        mongoStats.storageSizeBytes = stats.storageSize || 0;
        mongoStats.storageSizeMb = ((stats.storageSize || 0) / 1024 / 1024).toFixed(2);
        mongoStats.indexSizeBytes = stats.indexSize || 0;
        mongoStats.indexSizeMb = ((stats.indexSize || 0) / 1024 / 1024).toFixed(2);
        mongoStats.totalUsedBytes = totalUsed;
        mongoStats.totalUsedMb = (totalUsed / 1024 / 1024).toFixed(2);
        mongoStats.freeMb = Math.max(0, 512 - parseFloat(mongoStats.totalUsedMb)).toFixed(2);
        mongoStats.percentUsed = Math.min(100, ((totalUsed / 536870912) * 100)).toFixed(2);
        mongoStats.collectionsCount = stats.collections || 0;
        mongoStats.objectsCount = stats.objects || 0;
        mongoStats.avgObjSizeBytes = stats.avgObjSize || 0;
      } catch (statsErr) {
        console.warn('MongoDB stats query warning:', statsErr.message);
      }

      // Query collections stats
      try {
        const colList = await mongoose.connection.db.listCollections().toArray();
        const colBreakdowns = await Promise.all(
          colList.map(async (c) => {
            try {
              const cStats = await mongoose.connection.db.collection(c.name).stats();
              return {
                name: c.name,
                count: cStats.count || 0,
                sizeBytes: cStats.size || 0,
                sizeKb: ((cStats.size || 0) / 1024).toFixed(2),
                storageSizeKb: ((cStats.storageSize || 0) / 1024).toFixed(2),
                avgObjSize: cStats.avgObjSize || 0,
              };
            } catch {
              const count = await mongoose.connection.db.collection(c.name).countDocuments().catch(() => 0);
              return { name: c.name, count, sizeBytes: 0, sizeKb: '0.00', storageSizeKb: '0.00', avgObjSize: 0 };
            }
          })
        );
        mongoStats.collections = colBreakdowns.sort((a, b) => b.sizeBytes - a.sizeBytes);
      } catch (colErr) {
        console.warn('Collections list warning:', colErr.message);
      }
    }

    // In-memory collections fallback / local metrics calculation
    const inMemoryCollections = [
      { name: 'users', count: dataStore.users.length, sizeBytes: Buffer.byteLength(JSON.stringify(dataStore.users)) },
      { name: 'leads', count: dataStore.leads.length, sizeBytes: Buffer.byteLength(JSON.stringify(dataStore.leads)) },
      { name: 'tasks', count: dataStore.tasks.length, sizeBytes: Buffer.byteLength(JSON.stringify(dataStore.tasks)) },
      { name: 'audit_logs', count: dataStore.auditLogs.length, sizeBytes: Buffer.byteLength(JSON.stringify(dataStore.auditLogs)) },
      { name: 'activities', count: dataStore.activities.length, sizeBytes: Buffer.byteLength(JSON.stringify(dataStore.activities)) },
      { name: 'notifications', count: (dataStore.adminNotifications || []).length, sizeBytes: Buffer.byteLength(JSON.stringify(dataStore.adminNotifications || [])) },
    ].map((col) => ({
      ...col,
      sizeKb: (col.sizeBytes / 1024).toFixed(2),
      storageSizeKb: (col.sizeBytes / 1024).toFixed(2),
      avgObjSize: col.count > 0 ? Math.round(col.sizeBytes / col.count) : 0,
    }));

    if (!dbConnected || mongoStats.collections.length === 0) {
      mongoStats.collections = inMemoryCollections;
      const totalMemBytes = inMemoryCollections.reduce((acc, c) => acc + c.sizeBytes, 0);
      mongoStats.dataSizeBytes = totalMemBytes;
      mongoStats.dataSizeMb = (totalMemBytes / 1024 / 1024).toFixed(2);
      mongoStats.totalUsedBytes = totalMemBytes;
      mongoStats.totalUsedMb = (totalMemBytes / 1024 / 1024).toFixed(2);
      mongoStats.freeMb = (512 - parseFloat(mongoStats.totalUsedMb)).toFixed(2);
      mongoStats.percentUsed = ((totalMemBytes / 536870912) * 100).toFixed(2);
      mongoStats.collectionsCount = inMemoryCollections.length;
      mongoStats.objectsCount = inMemoryCollections.reduce((acc, c) => acc + c.count, 0);
    }

    // 2. Per-User / Per-Owner Memory & Resource Consumption (Who is consuming what)
    const owners = dataStore.users.filter((u) => u.persona === 'owner' || u.role === 'admin');

    const userFootprint = owners.map((owner) => {
      const staffList = dataStore.users.filter(
        (s) => (s.created_by && (s.created_by === owner.id || s.created_by === owner.email)) ||
               (owner.company_id && s.company_id === owner.company_id)
      );
      const ownerLeads = dataStore.leads.filter(
        (l) => l.company_id === owner.company_id || l.created_by_id === owner.id || staffList.some((s) => s.id === l.assigned_to)
      );

      const estimatedBytes =
        Buffer.byteLength(JSON.stringify(owner)) +
        Buffer.byteLength(JSON.stringify(staffList)) +
        Buffer.byteLength(JSON.stringify(ownerLeads));

      return {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        companyName: owner.company_name || 'Workspace',
        staffCount: staffList.length,
        leadsCount: ownerLeads.length,
        estimatedBytes,
        estimatedKb: (estimatedBytes / 1024).toFixed(2),
        sharePercent: ((estimatedBytes / (mongoStats.dataSizeBytes || 1024)) * 100).toFixed(1),
        lastLogin: owner.last_login || owner.created_at,
        isActive: owner.is_active,
      };
    }).sort((a, b) => b.estimatedBytes - a.estimatedBytes);

    // 3. API & Server Performance Metrics
    const topEndpoints = Object.entries(systemMetrics.endpoints || {})
      .map(([endpoint, data]) => ({
        endpoint,
        hits: data.hits,
        avgMs: data.avgMs,
        peakMs: data.peakMs,
        lastStatus: data.lastStatus,
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);

    const devMetrics = {
      server: {
        status: 'ONLINE',
        isOnline: true,
        uptimeSeconds,
        uptimeHuman: `${Math.floor(uptimeSeconds / 86400)}d ${Math.floor((uptimeSeconds % 86400) / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        environment: config.nodeEnv,
        serverTime: new Date().toISOString(),
        cpuCount: os.cpus().length,
        cpuModel: os.cpus()[0]?.model || 'Generic CPU',
        loadAverage: os.loadavg(),
      },
      processMemory: {
        rssMb: (mem.rss / 1024 / 1024).toFixed(2),
        heapTotalMb: (mem.heapTotal / 1024 / 1024).toFixed(2),
        heapUsedMb: (mem.heapUsed / 1024 / 1024).toFixed(2),
        externalMb: (mem.external / 1024 / 1024).toFixed(2),
        arrayBuffersMb: ((mem.arrayBuffers || 0) / 1024 / 1024).toFixed(2),
        heapUsagePercent: ((mem.heapUsed / mem.heapTotal) * 100).toFixed(1),
      },
      systemMemory: {
        totalMb: (os.totalmem() / 1024 / 1024).toFixed(2),
        freeMb: (os.freemem() / 1024 / 1024).toFixed(2),
        usedMb: ((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(2),
        usagePercent: (((os.totalmem() - os.freemem()) / os.totalmem()) * 100).toFixed(1),
      },
      database: mongoStats,
      apiPerformance: {
        totalRequests: systemMetrics.totalRequests,
        avgLatencyMs: systemMetrics.averageResponseTimeMs,
        lastLatencyMs: systemMetrics.lastResponseTimeMs,
        peakLatencyMs: systemMetrics.peakResponseTimeMs,
        statusCodes: systemMetrics.statusCodes || { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
        topEndpoints,
        recentRequests: (systemMetrics.history || []).slice(-20).reverse(),
      },
      userResourceConsumption: userFootprint,
    };

    return ApiResponse.success(res, devMetrics, 'Developer telemetry fetched successfully');
  } catch (err) {
    console.error('getDeveloperMetrics error:', err);
    return ApiResponse.error(res, 'Failed to fetch developer telemetry: ' + err.message, 500);
  }
};

/**
 * Trigger Database Synchronization / Snapshot Write
 * POST /api/v1/admin/developer/sync-db
 */
const triggerDbSync = async (req, res) => {
  try {
    saveSnapshot();
    let atlasSynced = false;
    if (isDbConnected()) {
      try {
        const { seedMongoDB } = require('../config/seed');
        await seedMongoDB();
        atlasSynced = true;
      } catch (e) {
        console.warn('Atlas sync warning:', e.message);
      }
    }
    return ApiResponse.success(
      res,
      {
        snapshotSaved: true,
        atlasSynced,
        timestamp: new Date().toISOString(),
      },
      atlasSynced
        ? 'Successfully synchronized in-memory database with MongoDB Atlas and updated snapshot!'
        : 'In-memory snapshot written successfully (MongoDB Atlas running in fallback mode).'
    );
  } catch (err) {
    return ApiResponse.error(res, 'Database sync failed: ' + err.message, 500);
  }
};

/**
 * Reset / Clear API Metrics Counters & Latency Peaks
 * POST /api/v1/admin/developer/clear-metrics
 */
const clearMetrics = async (req, res) => {
  try {
    if (systemMetrics && typeof systemMetrics.reset === 'function') {
      systemMetrics.reset();
    }
    return ApiResponse.success(res, { cleared: true, timestamp: new Date().toISOString() }, 'API metrics counter and latency statistics reset successfully');
  } catch (err) {
    return ApiResponse.error(res, 'Failed to clear metrics: ' + err.message, 500);
  }
};

module.exports = {
  getOverviewSummary,
  getAllUsers,
  createUser,
  updateUser,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  updateStaffLimit,
  updateUserFeatures,
  sendNotification,
  getAdminNotifications,
  deleteAdminNotification,
  getSystemHealth,
  getDeveloperMetrics,
  triggerDbSync,
  clearMetrics,
  getAuditLogs,
  updateCompanySettings,
  getSubscriptionInfo,
  upgradePlan,
  getAllTenants,
  createTenant,
  updateTenant,
};

