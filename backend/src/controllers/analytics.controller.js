const ApiResponse = require('../utils/apiResponse');
const { dataStore } = require('../repositories/dataStore');
const { isLeadInUserScope, getTenantContext } = require('../utils/tenantScope');
const { isOwnerUser, isSuperAdmin } = require('../utils/access');

/**
 * Get aggregated analytics, KPIs, pipeline metrics, and sales velocity
 */
const getAnalytics = async (req, res) => {
  if (!isOwnerUser(req.user) && !isSuperAdmin(req.user) && !req.user?.permissions?.view_analytics) {
    return ApiResponse.error(res, 'Access denied: Analytics access is not enabled for this account.', 403);
  }
  const leads = (dataStore.leads || []).filter((l) => isLeadInUserScope(l, req.user));
  const ctx = getTenantContext(req.user);

  let tasks = (dataStore.tasks || []).filter((t) => {
    if (ctx.isSuperAdmin) return true;
    if (t.company_id && (t.company_id === ctx.companyId || t.company_id === ctx.ownerId)) return true;
    if (t.assigned_to && ctx.allowedUserIds.has(t.assigned_to)) return true;
    if (t.created_by_id && ctx.allowedUserIds.has(t.created_by_id)) return true;
    return false;
  });

  if (!isOwnerUser(req.user) && !isSuperAdmin(req.user)) {
    tasks = tasks.filter((t) => t.assigned_to === req.user.id);
  }

  const totalLeads = leads.length;
  const totalPipelineValue = leads.reduce((acc, curr) => acc + (curr.value || 0), 0);

  const wonDeals = leads.filter((l) => l.stage === 'Closed Won');
  const totalWonRevenue = wonDeals.reduce((acc, curr) => acc + (curr.value || 0), 0);

  const activeDeals = leads.filter((l) => l.stage !== 'Closed Won' && l.stage !== 'Closed Lost');
  const activePipelineValue = activeDeals.reduce((acc, curr) => acc + (curr.value || 0), 0);

  // Conversion rate
  const conversionRate = totalLeads > 0 ? ((wonDeals.length / totalLeads) * 100).toFixed(1) : 0;

  // Pipeline by stage
  const stages = [
    'Lead Generation',
    'Contact Established',
    'Requirement Understood',
    'Sample Sent',
    'Quotation Sent',
    'Negotiation',
    'Closed Won',
    'Closed Lost',
  ];
  const stageBreakdown = stages.map((stage) => {
    const stageLeads = leads.filter((l) => (l.stage || l.status) === stage);
    return {
      stage,
      count: stageLeads.length,
      value: stageLeads.reduce((acc, curr) => acc + (curr.value || 0), 0),
    };
  });

  // Monthly target pacing
  const monthlyTarget = dataStore.company.revenueTargetMonthly || 150000;
  const targetAchievedPercent = Math.min(100, Math.round((totalWonRevenue / monthlyTarget) * 100));

  // Overdue tasks count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueTasksCount = tasks.filter((t) => {
    if (t.status === 'Completed') return false;
    return new Date(t.due_date) < today;
  }).length;

  // Dynamic sources breakdown from actual leads
  const sourceMap = {};
  leads.forEach((l) => {
    const s = l.source || l.lead_source || 'Direct Inquiry';
    sourceMap[s] = (sourceMap[s] || 0) + 1;
  });
  const leadSources = Object.entries(sourceMap).map(([source, count]) => ({
    source,
    count,
    share: totalLeads > 0 ? `${Math.round((count / totalLeads) * 100)}%` : '0%',
  }));

  return ApiResponse.success(res, {
    kpis: {
      totalLeads,
      totalPipelineValue,
      activePipelineValue,
      totalWonRevenue,
      conversionRate: `${conversionRate}%`,
      monthlyTarget,
      targetAchievedPercent,
      overdueTasksCount,
      activeTeamMembers: ctx.isSuperAdmin
        ? dataStore.users.filter((u) => u.is_active).length
        : dataStore.users.filter((u) => u.is_active !== false && ctx.allowedUserIds.has(u.id)).length,
    },
    stageBreakdown,
    leadSources,
  });
};

module.exports = {
  getAnalytics,
};
