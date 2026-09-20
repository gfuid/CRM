const ApiResponse = require('../utils/apiResponse');
const { dataStore } = require('../repositories/dataStore');

/**
 * Get aggregated analytics, KPIs, pipeline metrics, and sales velocity
 */
const getAnalytics = async (req, res) => {
  const leads = dataStore.leads;
  const tasks = dataStore.tasks;

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
    leadSources: [
      { source: 'LinkedIn Inbound', count: 18, share: '38%' },
      { source: 'Cold Outreach', count: 14, share: '29%' },
      { source: 'Partner Referral', count: 10, share: '21%' },
      { source: 'Webinar', count: 6, share: '12%' },
    ],
  });
};

module.exports = {
  getAnalytics,
};
