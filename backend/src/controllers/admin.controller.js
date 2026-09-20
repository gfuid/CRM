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

  return ApiResponse.success(res, results, 'Users fetched successfully', 200, {
    total: results.length,
    activeCount: results.filter((u) => u.is_active).length,
    adminsCount: results.filter((u) => u.role === 'admin').length,
  });
};

/**
 * Create or invite a new employee
 */
const createUser = async (req, res) => {
  const { name, email, role, department, phone } = req.body;

  if (!name || !email) {
    return ApiResponse.error(res, 'Name and Email are required', 400);
  }

  const existing = dataStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return ApiResponse.error(res, 'A user with this email already exists', 409);
  }

  const validRoles = ['admin', 'manager', 'agent'];
  const userRole = validRoles.includes(role) ? role : 'agent';

  const salt = await bcrypt.genSalt(10);
  const defaultPassword = await bcrypt.hash('agent123', salt);

  const newUser = {
    id: generateId('usr'),
    name,
    email,
    password: defaultPassword,
    role: userRole,
    department: department || 'Sales Outreach',
    phone: phone || '',
    is_active: true,
    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    last_login: null,
    created_at: new Date().toISOString(),
  };

  dataStore.users.push(newUser);
  dbSync.saveUser(newUser);

  // Record audit log
  const auditLog = {
    id: generateId('log'),
    actor_name: req.user ? req.user.name : 'System Admin',
    actor_id: req.user ? req.user.id : 'usr_admin_1',
    action: 'USER_CREATED',
    details: `Added new user ${name} (${email}) with role '${userRole}'`,
    ip_address: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  };
  dataStore.auditLogs.unshift(auditLog);
  dbSync.saveAuditLog(auditLog);

  const cleanUser = { ...newUser };
  delete cleanUser.password;

  return ApiResponse.created(res, cleanUser, 'User created successfully');
};

/**
 * Update user role or department
 */
const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role, department } = req.body;

  const user = dataStore.users.find((u) => u.id === id);
  if (!user) {
    return ApiResponse.error(res, 'User not found', 404);
  }

  const oldRole = user.role;
  if (role) {
    const validRoles = ['admin', 'manager', 'agent'];
    if (!validRoles.includes(role)) {
      return ApiResponse.error(res, 'Invalid role. Valid options: admin, manager, agent', 400);
    }
    user.role = role;
  }

  if (department !== undefined) {
    user.department = department;
  }

  dbSync.saveUser(user);

  // Audit log
  const auditLog = {
    id: generateId('log'),
    actor_name: req.user ? req.user.name : 'System Admin',
    actor_id: req.user ? req.user.id : 'usr_admin_1',
    action: 'USER_ROLE_UPDATED',
    details: `Changed role of ${user.name} from '${oldRole}' to '${user.role}'`,
    ip_address: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  };
  dataStore.auditLogs.unshift(auditLog);
  dbSync.saveAuditLog(auditLog);

  return ApiResponse.success(res, user, 'User updated successfully');
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
  const { planId, maxStaff } = req.body;

  if (!planId || !dataStore.plans[planId]) {
    return ApiResponse.error(res, 'Invalid planId. Options: starter, growth, enterprise', 400);
  }

  const selectedPlan = dataStore.plans[planId];
  const oldPlan = dataStore.company.plan;

  dataStore.company.plan = planId;
  dataStore.company.maxStaff = maxStaff !== undefined ? Number(maxStaff) : selectedPlan.maxStaff;

  // Keep primary tenant in sync
  const primaryTenant = dataStore.tenants.find((t) => t.id === 'comp_stellarsync_1');
  if (primaryTenant) {
    primaryTenant.plan = planId;
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
    details: `Upgraded subscription from ${oldPlan.toUpperCase()} to ${planId.toUpperCase()} (${selectedPlan.priceMonthly}/mo, ${dataStore.company.maxStaff} staff seats)`,
    ip_address: req.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  };
  dataStore.auditLogs.unshift(auditLog);
  dbSync.saveAuditLog(auditLog);

  return ApiResponse.success(
    res,
    { company: dataStore.company, plan: selectedPlan },
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
  const { name, domain, owner_name, owner_email, plan } = req.body;
  if (!name || !owner_email) {
    return ApiResponse.error(res, 'Organization name and Owner email are required', 400);
  }

  const selectedPlanKey = (plan && dataStore.plans[plan]) ? plan : 'starter';
  const planDetails = dataStore.plans[selectedPlanKey];

  const newTenant = {
    id: generateId('comp'),
    name,
    domain: domain || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    owner_name: owner_name || 'Founder',
    owner_email,
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

module.exports = {
  getOverviewSummary,
  getAllUsers,
  createUser,
  updateUserRole,
  toggleUserStatus,
  getSystemHealth,
  getAuditLogs,
  updateCompanySettings,
  getSubscriptionInfo,
  upgradePlan,
  getAllTenants,
  createTenant,
  updateTenant,
};

