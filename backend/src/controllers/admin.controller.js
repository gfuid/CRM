const os = require('os');
const bcrypt = require('bcryptjs');
const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');
const { systemMetrics } = require('../middlewares/responseTime.middleware');

/**
 * List all users / employees (Admin only)
 */
const getAllUsers = async (req, res) => {
  const { role, search, status } = req.query;
  let results = [...dataStore.users];

  // If called by a company owner, only return their own staff members
  if (req.user && req.user.persona === 'owner') {
    results = results.filter(
      (u) =>
        u.persona !== 'owner' &&
        (u.company_id === req.user.company_id ||
          u.created_by === req.user.id ||
          u.created_by === req.user.email)
    );
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
      // Find all staff members belonging to this owner/company
      const staffList = dataStore.users
        .filter(
          (s) =>
            s.id !== u.id &&
            s.persona !== 'owner' &&
            (s.company_id === u.company_id || s.created_by === u.id || s.created_by === u.email || (!s.company_id && !s.created_by))
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
          data_scope: s.data_scope,
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
      const owner =
        dataStore.users.find(
          (o) =>
            (o.persona === 'owner' || o.role === 'admin') &&
            (o.company_id === u.company_id || o.id === u.created_by)
        ) || dataStore.users.find((o) => o.persona === 'owner' || o.role === 'admin');

      return {
        ...cleanUser,
        is_owner: false,
        owner_name: owner ? owner.name : 'Company Owner',
        owner_id: owner ? owner.id : null,
        company_name: owner ? (owner.company_name || dataStore.company.name) : dataStore.company.name,
        staff_limit: u.staff_limit !== undefined ? Number(u.staff_limit) : 2,
        staff_count: 0,
        staff_list: [],
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

  // Enforce staff limit check against owner quota (Default 2 per owner)
  let owner = null;
  if (req.user && (req.user.persona === 'owner' || req.user.role === 'admin')) {
    owner = req.user;
  }
  if (!owner) {
    owner = dataStore.users.find((u) => u.persona === 'owner' || u.role === 'admin');
  }

  const staffLimit =
    owner?.staff_limit !== undefined
      ? Number(owner.staff_limit)
      : 2;

  const currentStaffCount = dataStore.users.filter((u) => {
    if (u.persona === 'owner') return false;
    if (owner && (u.company_id === owner.company_id || u.created_by === owner.id || u.created_by === owner.email)) {
      return true;
    }
    return true;
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

  const newUser = {
    id: generateId('usr'),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
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
    company_id: req.user?.company_id || 'comp_traveltrade_1',
    created_by: req.user?.id || 'usr_admin_1',
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

  const cleanUser = { ...newUser };
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

  const cleanUser = { ...user };
  delete cleanUser.password;

  return ApiResponse.success(res, cleanUser, 'Staff member permissions updated successfully');
};

/**
 * Delete a staff user (Owner only)
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;
  const userIndex = dataStore.users.findIndex((u) => u.id === id);
  if (userIndex === -1) {
    return ApiResponse.error(res, 'User not found', 404);
  }
  const user = dataStore.users[userIndex];
  if (user.role === 'admin') {
    return ApiResponse.error(res, 'Cannot delete Company Owner account', 400);
  }
  dataStore.users.splice(userIndex, 1);
  return ApiResponse.success(res, { id }, 'Staff member deleted successfully');
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
        (s.company_id === user.company_id || s.created_by === user.id || s.created_by === user.email || (!s.company_id && !s.created_by))
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

module.exports = {
  getOverviewSummary,
  getAllUsers,
  createUser,
  updateUser,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  updateStaffLimit,
  sendNotification,
  getAdminNotifications,
  deleteAdminNotification,
  getSystemHealth,
  getAuditLogs,
  updateCompanySettings,
  getSubscriptionInfo,
  upgradePlan,
  getAllTenants,
  createTenant,
  updateTenant,
};

