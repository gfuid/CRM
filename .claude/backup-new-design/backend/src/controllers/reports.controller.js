/**
 * Everything here is computed from leads, tasks and the activity log, so the numbers
 * always match what the team actually did.
 */
const ApiResponse = require('../utils/apiResponse');
const { HttpError, LEAD_STAGES } = require('../utils/validate');
const { leadVisibilityFilter } = require('../services/permissions');
const { OUTREACH_TYPES, ACTIVITY_LABELS } = require('../services/activityTypes');
const { usersMap } = require('../services/leads');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;

/** Minutes east of UTC sent by the browser (IST = 330), so "today" is the user's today. */
const tzOffset = (req) => {
  const n = Number(req.query.tz);
  return Number.isFinite(n) && Math.abs(n) <= 14 * 60 ? n : 330;
};

const localDate = (iso, offsetMin) => new Date(Date.parse(iso) + offsetMin * 60000).toISOString().slice(0, 10);

const todayLocal = (offsetMin) => localDate(new Date().toISOString(), offsetMin);

const shiftDate = (dateStr, days) => new Date(Date.parse(dateStr) + days * DAY_MS).toISOString().slice(0, 10);

/** Inclusive local-date range from ?from&to, defaulting to the last `defaultDays` days. */
const dateRange = (req, defaultDays = 30) => {
  const offset = tzOffset(req);
  const today = todayLocal(offset);
  const to = req.query.to || today;
  const from = req.query.from || shiftDate(to, -(defaultDays - 1));
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) throw new HttpError(400, 'Dates must be YYYY-MM-DD');
  if (from > to) throw new HttpError(400, '"from" must be on or before "to"');
  // UTC instants bounding the local days
  const startIso = new Date(Date.parse(from) - offset * 60000).toISOString();
  const endIso = new Date(Date.parse(to) + DAY_MS - offset * 60000 - 1).toISOString();
  return { from, to, startIso, endIso, offset, today };
};

/** Activity visibility: own activity, or the whole team's with team_reports. */
const activityScope = (req) => {
  if (req.perms.team_reports) {
    return req.query.user_id ? { user_id: String(req.query.user_id) } : {};
  }
  return { user_id: req.user.id };
};

const loadActivities = (req, range) =>
  req.db.find(
    'activities',
    { ...activityScope(req), timestamp: { $gte: range.startIso, $lte: range.endIso } },
    { sort: { timestamp: -1 } }
  );

/** GET /activity — feed of activities (?lead_id, ?type, ?from, ?to, ?limit). */
const getActivityFeed = async (req, res) => {
  const range = dateRange(req, 30);
  const filter = { ...activityScope(req), timestamp: { $gte: range.startIso, $lte: range.endIso } };
  if (req.query.type) filter.type = String(req.query.type);
  if (req.query.lead_id) filter.lead_id = String(req.query.lead_id);
  const limit = Math.min(Number(req.query.limit) || 300, 1000);
  const [rows, users] = await Promise.all([
    req.db.find('activities', filter, { sort: { timestamp: -1 }, limit }),
    usersMap(req.db),
  ]);
  return ApiResponse.success(
    res,
    rows.map((a) => ({
      ...a,
      title: a.title || ACTIVITY_LABELS[a.type] || a.type,
      user_name: users.get(a.user_id)?.name || 'Former member',
      user_avatar: users.get(a.user_id)?.avatar_url || null,
    })),
    'Activity retrieved',
    200,
    { from: range.from, to: range.to }
  );
};

/** GET /reports/daily — one row per person per day (replaces the hand-typed "My Days"). */
const getDailyReport = async (req, res) => {
  const range = dateRange(req, 14);
  const [rows, users] = await Promise.all([loadActivities(req, range), usersMap(req.db)]);
  const groups = new Map();
  for (const a of rows) {
    const date = localDate(a.timestamp, range.offset);
    const key = `${date}|${a.user_id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        date,
        user_id: a.user_id,
        user_name: users.get(a.user_id)?.name || 'Former member',
        leads: new Set(),
        status_changes: 0,
        reassigns: 0,
        remarks: 0,
        touches: 0,
        last_update: a.timestamp,
        entries: [],
      });
    }
    const g = groups.get(key);
    if (a.lead_id) g.leads.add(a.lead_id);
    if (a.type === 'stage_change') g.status_changes += 1;
    else if (a.type === 'reassign') g.reassigns += 1;
    else if (a.type === 'note') g.remarks += 1;
    if (OUTREACH_TYPES.includes(a.type)) g.touches += 1;
    if (a.timestamp > g.last_update) g.last_update = a.timestamp;
    g.entries.push({
      id: a.id,
      time: a.timestamp,
      type: a.type,
      title: a.title || ACTIVITY_LABELS[a.type] || a.type,
      lead_id: a.lead_id,
      lead_name: a.lead_name,
      note: a.note,
    });
  }
  const data = [...groups.values()]
    .map((g) => ({ ...g, leads: g.leads.size }))
    .sort((a, b) => (a.date === b.date ? b.last_update.localeCompare(a.last_update) : b.date.localeCompare(a.date)));
  return ApiResponse.success(res, data, 'Daily report', 200, { from: range.from, to: range.to });
};

/** GET /reports/outreach — counts per activity type, per person per day. */
const getOutreachReport = async (req, res) => {
  const range = dateRange(req, 14);
  const [rows, users] = await Promise.all([loadActivities(req, range), usersMap(req.db)]);
  const groups = new Map();
  const totals = Object.fromEntries(OUTREACH_TYPES.map((t) => [t, 0]));
  for (const a of rows) {
    if (!OUTREACH_TYPES.includes(a.type)) continue;
    const date = localDate(a.timestamp, range.offset);
    const key = `${date}|${a.user_id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        date,
        user_id: a.user_id,
        user_name: users.get(a.user_id)?.name || 'Former member',
        counts: Object.fromEntries(OUTREACH_TYPES.map((t) => [t, 0])),
        total: 0,
        entries: [],
      });
    }
    const g = groups.get(key);
    g.counts[a.type] += 1;
    g.total += 1;
    totals[a.type] += 1;
    g.entries.push({ id: a.id, time: a.timestamp, type: a.type, lead_id: a.lead_id, lead_name: a.lead_name, note: a.note });
  }
  const data = [...groups.values()].sort((a, b) => (a.date === b.date ? b.total - a.total : b.date.localeCompare(a.date)));
  return ApiResponse.success(res, { rows: data, totals, types: OUTREACH_TYPES.map((t) => ({ key: t, label: ACTIVITY_LABELS[t] })) }, 'Outreach report', 200, {
    from: range.from,
    to: range.to,
  });
};

const isClosed = (stage) => stage === 'Closed Won' || stage === 'Closed Lost';

/** GET /reports/today — my follow-ups and tasks for today (the home screen). */
const getToday = async (req, res) => {
  const offset = tzOffset(req);
  const today = todayLocal(offset);
  const mine = req.query.scope === 'team' && req.perms.leads_scope === 'all' ? {} : { assigned_to: req.user.id };
  const [leads, tasks, users] = await Promise.all([
    req.db.find('leads', { ...leadVisibilityFilter(req.user), ...mine }),
    req.db.find('tasks', { ...mine, status: { $ne: 'Completed' } }, { sort: { due_date: 1 } }),
    usersMap(req.db),
  ]);
  const open = leads.filter((l) => !isClosed(l.stage) && l.follow_up_date);
  const pick = (l) => ({
    id: l.id,
    name: l.name,
    contact_person: l.contact_person,
    phone: l.phone,
    whatsapp: l.whatsapp,
    email: l.email,
    stage: l.stage,
    priority: l.priority,
    follow_up_date: l.follow_up_date,
    days_overdue: Math.round((Date.parse(today) - Date.parse(l.follow_up_date)) / DAY_MS),
    agent_name: users.get(l.assigned_to)?.name || 'Unassigned',
  });
  const overdue = open.filter((l) => l.follow_up_date < today).map(pick).sort((a, b) => b.days_overdue - a.days_overdue);
  const dueToday = open.filter((l) => l.follow_up_date === today).map(pick);
  const upcoming = open
    .filter((l) => l.follow_up_date > today && l.follow_up_date <= shiftDate(today, 7))
    .map(pick)
    .sort((a, b) => a.follow_up_date.localeCompare(b.follow_up_date));
  const noFollowUp = leads.filter((l) => !isClosed(l.stage) && !l.follow_up_date).length;
  const decorateTask = (t) => ({ ...t, assigned_name: users.get(t.assigned_to)?.name || 'Unassigned' });

  return ApiResponse.success(res, {
    today,
    follow_ups: { overdue, due_today: dueToday, upcoming, without_date: noFollowUp },
    tasks: {
      overdue: tasks.filter((t) => t.due_date < today).map(decorateTask),
      due_today: tasks.filter((t) => t.due_date === today).map(decorateTask),
      upcoming: tasks.filter((t) => t.due_date > today).slice(0, 20).map(decorateTask),
    },
  });
};

/** GET /analytics — pipeline KPIs for the chosen period. Staff see their own unless granted company view. */
const getAnalytics = async (req, res) => {
  const range = dateRange(req, 30);
  const companyView = req.perms.analytics_scope === 'company' && req.perms.leads_scope === 'all';
  const leadFilter = { deleted_at: null, ...(companyView ? {} : { assigned_to: req.user.id }) };
  const actFilter = companyView ? {} : { user_id: req.user.id };

  const [leads, activities, tasks, users] = await Promise.all([
    req.db.find('leads', leadFilter),
    req.db.find('activities', { ...actFilter, timestamp: { $gte: range.startIso, $lte: range.endIso } }),
    req.db.find('tasks', companyView ? {} : { assigned_to: req.user.id }),
    usersMap(req.db),
  ]);

  const inRange = (iso) => iso && iso >= range.startIso && iso <= range.endIso;
  const sum = (arr) => arr.reduce((acc, l) => acc + (Number(l.value) || 0), 0);
  const openLeads = leads.filter((l) => !isClosed(l.stage));
  const wonInRange = leads.filter((l) => l.stage === 'Closed Won' && inRange(l.closed_at || l.updated_at));
  const lostInRange = leads.filter((l) => l.stage === 'Closed Lost' && inRange(l.closed_at || l.updated_at));
  const newInRange = leads.filter((l) => inRange(l.created_at));
  const overdueFollowUps = openLeads.filter((l) => l.follow_up_date && l.follow_up_date < range.today);
  const closedCount = wonInRange.length + lostInRange.length;

  const stages = LEAD_STAGES.map((stage) => {
    const s = leads.filter((l) => l.stage === stage);
    return { stage, count: s.length, value: sum(s) };
  });

  const bySource = new Map();
  for (const l of leads) {
    const key = l.source || 'Unknown';
    const row = bySource.get(key) || { source: key, count: 0, won: 0, won_value: 0 };
    row.count += 1;
    if (l.stage === 'Closed Won') {
      row.won += 1;
      row.won_value += Number(l.value) || 0;
    }
    bySource.set(key, row);
  }

  const byProduct = new Map();
  for (const l of openLeads) {
    for (const p of l.products || []) {
      const row = byProduct.get(p) || { product: p, count: 0, value: 0 };
      row.count += 1;
      row.value += Number(l.value) || 0;
      byProduct.set(p, row);
    }
  }

  // Daily trend of new leads and outreach touches
  const trend = [];
  for (let d = range.from; d <= range.to; d = shiftDate(d, 1)) {
    trend.push({ date: d, new_leads: 0, touches: 0, won: 0 });
    if (trend.length > 400) break;
  }
  const trendIdx = new Map(trend.map((t, i) => [t.date, i]));
  for (const l of newInRange) {
    const i = trendIdx.get(localDate(l.created_at, range.offset));
    if (i !== undefined) trend[i].new_leads += 1;
  }
  for (const a of activities) {
    if (!OUTREACH_TYPES.includes(a.type)) continue;
    const i = trendIdx.get(localDate(a.timestamp, range.offset));
    if (i !== undefined) trend[i].touches += 1;
  }
  for (const l of wonInRange) {
    const i = trendIdx.get(localDate(l.closed_at || l.updated_at, range.offset));
    if (i !== undefined) trend[i].won += 1;
  }

  // Per-person performance (company view only)
  let team = [];
  if (companyView) {
    team = [...users.values()]
      .filter((u) => u.is_active)
      .map((u) => {
        const theirs = leads.filter((l) => l.assigned_to === u.id);
        const theirOpen = theirs.filter((l) => !isClosed(l.stage));
        const theirWon = wonInRange.filter((l) => l.assigned_to === u.id);
        return {
          user_id: u.id,
          name: u.name,
          role: u.role,
          avatar_url: u.avatar_url,
          open_leads: theirOpen.length,
          pipeline_value: sum(theirOpen),
          touches: activities.filter((a) => a.user_id === u.id && OUTREACH_TYPES.includes(a.type)).length,
          won: theirWon.length,
          won_value: sum(theirWon),
          overdue_follow_ups: theirOpen.filter((l) => l.follow_up_date && l.follow_up_date < range.today).length,
          last_login: u.last_login,
        };
      })
      .sort((a, b) => b.won_value - a.won_value || b.touches - a.touches);
  }

  const target = Number(req.company.settings?.revenue_target_monthly) || 0;
  const monthStart = `${range.today.slice(0, 7)}-01`;
  const wonThisMonth = sum(leads.filter((l) => l.stage === 'Closed Won' && localDate(l.closed_at || l.updated_at, range.offset) >= monthStart));

  return ApiResponse.success(res, {
    scope: companyView ? 'company' : 'own',
    range: { from: range.from, to: range.to },
    currency: req.company.settings?.currency || 'INR',
    kpis: {
      total_leads: leads.length,
      open_leads: openLeads.length,
      pipeline_value: sum(openLeads),
      new_leads: newInRange.length,
      won_count: wonInRange.length,
      won_value: sum(wonInRange),
      lost_count: lostInRange.length,
      win_rate: closedCount ? Math.round((wonInRange.length / closedCount) * 100) : null,
      touches: activities.filter((a) => OUTREACH_TYPES.includes(a.type)).length,
      overdue_follow_ups: overdueFollowUps.length,
      overdue_tasks: tasks.filter((t) => t.status !== 'Completed' && t.due_date < range.today).length,
      monthly_target: target,
      won_this_month: wonThisMonth,
      target_percent: target > 0 ? Math.round((wonThisMonth / target) * 100) : null,
    },
    stages,
    sources: [...bySource.values()].sort((a, b) => b.count - a.count),
    products: [...byProduct.values()].sort((a, b) => b.count - a.count).slice(0, 12),
    trend,
    team,
  });
};

module.exports = {
  getActivityFeed,
  getDailyReport,
  getOutreachReport,
  getToday,
  getAnalytics,
};
