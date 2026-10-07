const ApiResponse = require('../utils/apiResponse');
const { dataStore } = require('../repositories/dataStore');

/**
 * Get aggregated analytics, KPIs, pipeline metrics, and sales velocity
 */
const getAnalytics = async (req, res) => {
  let leads = [...dataStore.leads];
  let tasks = [...dataStore.tasks];

  // Role-Based Isolation & Multi-tenant scoping
  if (req.user && req.user.role !== 'admin') {
    leads = leads.filter(
      (l) =>
        l.assigned_to === req.user.id ||
        l.assigned_to === req.user.email ||
        l.assigned_to === req.user.name ||
        l.created_by_id === req.user.id
    );
    tasks = tasks.filter((t) => t.assigned_to === req.user.id);
  } else if (req.user && req.user.company_id) {
    leads = leads.filter((l) => l.company_id === req.user.company_id || !l.company_id);
    const companyUserIds = dataStore.users
      .filter((u) => u.company_id === req.user.company_id || u.created_by === req.user.id)
      .map((u) => u.id);
    companyUserIds.push(req.user.id);
    tasks = tasks.filter((t) => companyUserIds.includes(t.assigned_to) || !t.assigned_to);
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
      activeTeamMembers: dataStore.users.filter((u) => u.is_active).length,
    },
    stageBreakdown,
    leadSources,
  });
};

module.exports = {
  getAnalytics,
};
