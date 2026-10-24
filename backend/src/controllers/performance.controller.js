/**
 * Staff performance review & reminders.
 *
 * Everything here is worked out by the server from saved records and timestamps
 * (tasks, follow-ups, lead remark history, activities, outreach, My Day) so staff
 * cannot inflate their own numbers.
 */
const ApiResponse = require('../utils/apiResponse');
const { dataStore } = require('../repositories/dataStore');
const { getTenantContext, isLeadInUserScope } = require('../utils/tenantScope');
const { isOwnerUser, isSuperAdmin, todayISO } = require('../utils/access');
const { taskDeadline } = require('./tasks.controller');

const FINAL_STAGES = ['closed won', 'closed lost', 'won', 'lost', 'closed'];
const OPEN_FU = ['Scheduled', 'Pending', 'Rescheduled'];
const dayOf = (v) => (v ? String(v).split('T')[0] : '');
const inRange = (v, from, to) => {
  const d = dayOf(v);
  return Boolean(d) && d >= from && d <= to;
};
const isWon = (stage) => ['closed won', 'won'].includes(String(stage || '').toLowerCase());
const isLost = (stage) => ['closed lost', 'lost'].includes(String(stage || '').toLowerCase());

/** Parse ?from=YYYY-MM-DD&to=YYYY-MM-DD (default: last 30 days up to today). */
const parseRange = (query) => {
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(query.to || '')) ? query.to : todayISO();
  const fallbackFrom = new Date(new Date(`${to}T00:00:00Z`).getTime() - 29 * 86400000).toISOString().split('T')[0];
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(query.from || '')) ? query.from : fallbackFrom;
  return from <= to ? { from, to } : { from: to, to: from };
};

/** Can `viewer` see the performance of user `targetId`? */
const canView = (viewer, targetId) => {
  if (isSuperAdmin(viewer)) return true;
  if (viewer.id === targetId) return true;
  if (!isOwnerUser(viewer)) return false;
  return getTenantContext(viewer).allowedUserIds.has(targetId);
};

/** Leads of the target's company (used for remark counting). */
const companyLeadsFor = (target) => {
  const viewer = target.persona === 'staff' ? dataStore.users.find((u) => u.id === target.created_by) || target : target;
  return dataStore.leads.filter((l) => isLeadInUserScope(l, viewer));
};

const buildReport = (target, from, to) => {
  const uid = target.id;
  const today = todayISO();
  const now = Date.now();

  // ---------------- Tasks ----------------
  const myTasks = dataStore.tasks.filter((t) => t.assigned_to === uid);
  const tasksInRange = myTasks.filter((t) => inRange(t.due_date, from, to) || inRange(t.completed_at, from, to));
  const taskRows = tasksInRange.map((t) => {
    const deadline = taskDeadline(t);
    const done = t.status === 'Completed';
    const late = done
      ? (typeof t.completed_late === 'boolean'
        ? t.completed_late
        : Boolean(deadline && t.completed_at && new Date(t.completed_at).getTime() > deadline.getTime()))
      : false;
    const overdue = !done && t.status !== 'Cancelled' && Boolean(deadline && deadline.getTime() < now);
    return {
      id: t.id,
      title: t.title,
      due_date: dayOf(t.due_date),
      status: t.status,
      completed_at: t.completed_at || null,
      result: done ? (late ? 'completed_late' : (t.completed_at ? 'completed_on_time' : 'completed_time_unknown')) : t.status === 'Cancelled' ? 'cancelled' : overdue ? 'overdue' : 'open',
      completion_notes: t.completion_notes || '',
    };
  });
  const countTask = (r) => taskRows.filter((t) => t.result === r).length;

  // ---------------- Follow-ups ----------------
  const myFollowUps = dataStore.followUps.filter((f) => f.assigned_to === uid);
  const fuInRange = myFollowUps.filter((f) => inRange(f.scheduled_date || f.date, from, to) || inRange(f.completed_at, from, to));
  const fuRows = fuInRange.map((f) => {
    const due = dayOf(f.scheduled_date || f.date);
    const missed = OPEN_FU.includes(f.status) && due && due < today;
    const reschedules = (Array.isArray(f.history) ? f.history : []).filter((h) => h.action === 'rescheduled');
    return {
      id: f.id,
      client_name: f.client_name || f.lead_name || '',
      lead_id: f.lead_id || null,
      scheduled_date: due,
      status: missed ? 'Missed' : f.status,
      completed_at: f.completed_at || null,
      completed_late: Boolean(f.completed_late),
      rescheduled_times: reschedules.length,
      outcome: f.today_remarks || f.remark || '',
      next_action: f.next_follow_up_action || '',
    };
  });

  // ---------------- Leads ----------------
  const assignedLeads = dataStore.leads.filter((l) => l.assigned_to === uid);
  const createdInRange = dataStore.leads.filter((l) => l.created_by_id === uid && inRange(l.created_at, from, to));
  const overdueLeads = assignedLeads
    .filter((l) => !FINAL_STAGES.includes(String(l.stage || '').toLowerCase()) && dayOf(l.follow_up_date) && dayOf(l.follow_up_date) < today)
    .map((l) => ({ id: l.id, name: l.name || l.company_name, follow_up_date: dayOf(l.follow_up_date), stage: l.stage, next_action: l.next_follow_up_action || '' }));
  const stageMoves = dataStore.activities.filter((a) => a.user_id === uid && a.type === 'status_change' && inRange(a.timestamp, from, to)).length;

  // ---------------- Remarks (what was discussed) ----------------
  const remarks = [];
  for (const l of companyLeadsFor(target)) {
    for (const r of Array.isArray(l.previous_remarks) ? l.previous_remarks : []) {
      const byMe = r.author_id ? r.author_id === uid : (r.author && r.author === target.name);
      if (byMe && inRange(r.date, from, to)) {
        remarks.push({
          lead_id: l.id,
          lead_name: l.name || l.company_name,
          date: r.date,
          discussed: r.today_remark || '',
          next_action: r.planned_action || '',
          next_date: r.follow_up_date || '',
        });
      }
    }
  }
  remarks.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const remarksWithoutDiscussion = remarks.filter((r) => !String(r.discussed || '').trim()).length;

  // ---------------- Outreach & My Day ----------------
  const outreach = dataStore.outreach.filter((o) => o.employee_id === uid && inRange(o.date, from, to));
  const sum = (k) => outreach.reduce((acc, o) => acc + (Number(o[k]) || 0), 0);
  const myDays = dataStore.myDays.filter((d) => d.user_id === uid && inRange(d.date || d.created_at, from, to));

  const tasksDone = countTask('completed_on_time') + countTask('completed_late') + countTask('completed_time_unknown');
  const tasksDue = taskRows.filter((t) => t.result !== 'cancelled').length;
  const fuDone = fuRows.filter((f) => f.status === 'Completed').length;
  const fuMissed = fuRows.filter((f) => f.status === 'Missed').length;

  return {
    user: { id: target.id, name: target.name, email: target.email, role: target.role, persona: target.persona, is_active: target.is_active !== false },
    range: { from, to },
    summary: {
      tasks_total: taskRows.length,
      tasks_completed_on_time: countTask('completed_on_time'),
      tasks_completed_late: countTask('completed_late'),
      tasks_completed_time_unknown: countTask('completed_time_unknown'),
      tasks_overdue_open: countTask('overdue'),
      tasks_open: countTask('open'),
      tasks_cancelled: countTask('cancelled'),
      task_completion_rate: tasksDue ? Math.round((tasksDone / tasksDue) * 100) : null,
      followups_total: fuRows.length,
      followups_completed: fuDone,
      followups_completed_late: fuRows.filter((f) => f.status === 'Completed' && f.completed_late).length,
      followups_missed: fuMissed,
      followups_upcoming: fuRows.filter((f) => OPEN_FU.includes(f.status)).length,
      followups_rescheduled_times: fuRows.reduce((acc, f) => acc + f.rescheduled_times, 0),
      followup_completion_rate: fuDone + fuMissed ? Math.round((fuDone / (fuDone + fuMissed)) * 100) : null,
      leads_assigned_now: assignedLeads.length,
      leads_created: createdInRange.length,
      leads_overdue_followup: overdueLeads.length,
      leads_won: assignedLeads.filter((l) => isWon(l.stage)).length,
      leads_lost: assignedLeads.filter((l) => isLost(l.stage)).length,
      stage_moves: stageMoves,
      remarks_written: remarks.length,
      remarks_without_discussion: remarksWithoutDiscussion,
      outreach_calls: sum('calls_made'),
      outreach_emails: sum('emails_sent'),
      outreach_meetings: sum('meetings_booked'),
      myday_items: myDays.length,
      myday_completed: myDays.filter((d) => d.completed).length,
    },
    details: {
      tasks: taskRows,
      followups: fuRows,
      overdue_leads: overdueLeads,
      recent_remarks: remarks.slice(0, 50),
    },
  };
};

/**
 * GET /analytics/staff/:id?from&to  — one person's performance review
 */
const getStaffPerformance = async (req, res) => {
  const target = dataStore.users.find((u) => u.id === req.params.id);
  if (!target || !canView(req.user, target.id)) {
    return ApiResponse.error(res, 'Staff member not found', 404);
  }
  const { from, to } = parseRange(req.query);
  return ApiResponse.success(res, buildReport(target, from, to), 'Staff performance report');
};

/**
 * GET /analytics/team?from&to  — owner: one summary row per team member
 */
const getTeamPerformance = async (req, res) => {
  if (!isOwnerUser(req.user) && !isSuperAdmin(req.user)) {
    return ApiResponse.error(res, 'Access denied: Only the company owner can view team performance.', 403);
  }
  const { from, to } = parseRange(req.query);
  const ctx = getTenantContext(req.user);
  const members = dataStore.users.filter((u) =>
    ctx.isSuperAdmin ? u.persona === 'staff' : ctx.allowedUserIds.has(u.id)
  );
  const rows = members.map((m) => {
    const r = buildReport(m, from, to);
    return { user: r.user, summary: r.summary };
  });
  return ApiResponse.success(res, { range: { from, to }, members: rows }, 'Team performance summary');
};

/**
 * GET /reminders — what needs attention today for the logged-in user.
 * Owners also get a count of what is overdue across their team.
 */
const getReminders = async (req, res) => {
  const uid = req.user.id;
  const today = todayISO();
  const now = Date.now();

  const myTasks = dataStore.tasks.filter((t) => t.assigned_to === uid && t.status !== 'Completed' && t.status !== 'Cancelled');
  const taskItem = (t) => ({ id: t.id, title: t.title, due_date: dayOf(t.due_date), deadline_time: t.deadline_time || '', priority: t.priority });
  const tasksOverdue = myTasks.filter((t) => {
    const d = taskDeadline(t);
    return d && d.getTime() < now;
  });
  const tasksToday = myTasks.filter((t) => dayOf(t.due_date) === today && !tasksOverdue.includes(t));

  const myFu = dataStore.followUps.filter((f) => f.assigned_to === uid && OPEN_FU.includes(f.status));
  const fuItem = (f) => ({ id: f.id, client_name: f.client_name || f.lead_name || '', lead_id: f.lead_id || null, scheduled_date: dayOf(f.scheduled_date || f.date), scheduled_time: f.scheduled_time || f.time || '', agenda: f.agenda || '' });
  const fuMissed = myFu.filter((f) => dayOf(f.scheduled_date || f.date) < today);
  const fuToday = myFu.filter((f) => dayOf(f.scheduled_date || f.date) === today);

  const myLeads = dataStore.leads.filter((l) => l.assigned_to === uid && !FINAL_STAGES.includes(String(l.stage || '').toLowerCase()));
  const leadItem = (l) => ({ id: l.id, name: l.name || l.company_name, follow_up_date: dayOf(l.follow_up_date), follow_up_time: l.follow_up_time || '', next_action: l.next_follow_up_action || '' });
  const leadsOverdue = myLeads.filter((l) => dayOf(l.follow_up_date) && dayOf(l.follow_up_date) < today);
  const leadsToday = myLeads.filter((l) => dayOf(l.follow_up_date) === today);

  const data = {
    date: today,
    counts: {
      tasks_overdue: tasksOverdue.length,
      tasks_today: tasksToday.length,
      followups_missed: fuMissed.length,
      followups_today: fuToday.length,
      leads_overdue: leadsOverdue.length,
      leads_today: leadsToday.length,
    },
    tasks_overdue: tasksOverdue.map(taskItem),
    tasks_today: tasksToday.map(taskItem),
    followups_missed: fuMissed.map(fuItem),
    followups_today: fuToday.map(fuItem),
    leads_overdue: leadsOverdue.map(leadItem),
    leads_today: leadsToday.map(leadItem),
  };

  if (isOwnerUser(req.user)) {
    const ctx = getTenantContext(req.user);
    const team = dataStore.users.filter((u) => u.id !== uid && ctx.allowedUserIds.has(u.id));
    data.team = team.map((m) => {
      const openTasks = dataStore.tasks.filter((t) => t.assigned_to === m.id && t.status !== 'Completed' && t.status !== 'Cancelled');
      return {
        user_id: m.id,
        name: m.name,
        tasks_overdue: openTasks.filter((t) => {
          const d = taskDeadline(t);
          return d && d.getTime() < now;
        }).length,
        followups_missed: dataStore.followUps.filter((f) => f.assigned_to === m.id && OPEN_FU.includes(f.status) && dayOf(f.scheduled_date || f.date) < today).length,
        leads_overdue: dataStore.leads.filter((l) => l.assigned_to === m.id && !FINAL_STAGES.includes(String(l.stage || '').toLowerCase()) && dayOf(l.follow_up_date) && dayOf(l.follow_up_date) < today).length,
      };
    });
  }

  data.total = Object.values(data.counts).reduce((a, b) => a + b, 0);
  return ApiResponse.success(res, data, 'Reminders');
};

module.exports = {
  getStaffPerformance,
  getTeamPerformance,
  getReminders,
  buildReport,
};
