/**
 * Owner's evening report: what each team member did today.
 *
 *   - calls / emails / meetings entered in Outreach, and activities logged on leads
 *   - remarks written (what was discussed with buyers)
 *   - follow-ups done and follow-ups MISSED (with buyer names)
 *   - tasks completed / still overdue
 *   - leads created, and buyers with no contact for 7+ days
 *
 * Built only from saved records and timestamps, so nobody can inflate their numbers.
 * Sent every evening at DAILY_REPORT_HOUR (default 19 = 7 PM business time) as an in-app
 * notification, and by email when the platform mail server (SMTP_*) is configured.
 */
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');
const { todayISO, businessDayOf, isOwnerUser } = require('../utils/access');
const { buildContactIndex, contactInfo, STALE_DAYS } = require('../utils/contact');
const { tenantFootprint } = require('../utils/usage');

const FINAL = ['closed won', 'closed lost', 'won', 'lost', 'closed'];
const OPEN_FU = ['Scheduled', 'Pending', 'Rescheduled'];
const dayOf = (v) => (v ? String(v).split('T')[0] : '');
const localDay = (v) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? businessDayOf(t) : '';
};
const CALL_RE = /call|phone|whatsapp|zalo|meeting|visit/i;

const isOwnerRecord = (u) => u && (u.persona === 'owner' || (u.role === 'admin' && u.persona !== 'staff'));

/** One member's day. */
const memberDay = (member, date, companyLeads, contactIndex, assigneeOf) => {
  const uid = member.id;

  const outreach = dataStore.outreach.filter((o) => o.employee_id === uid && o.date === date);
  const sum = (k) => outreach.reduce((a, o) => a + (Number(o[k]) || 0), 0);

  const acts = dataStore.activities.filter((a) => a.user_id === uid && localDay(a.timestamp || a.created_at) === date && a.type !== 'status_change' && !a.system && a.title !== 'Export Lead Created');
  const callActs = acts.filter((a) => CALL_RE.test(`${a.type || ''} ${a.title || ''}`)).length;

  const remarks = [];
  companyLeads.forEach((l) => {
    (Array.isArray(l.previous_remarks) ? l.previous_remarks : []).forEach((r) => {
      const mine = r && (r.author_id ? r.author_id === uid : r.author === member.name);
      if (mine && localDay(r.date) === date && (r.today_remark || r.planned_action || r.remark)) {
        remarks.push({ lead: l.company_name || l.name || '', discussed: r.today_remark || r.remark || '', next: r.planned_action || '' });
      }
    });
  });

  const myFollowUps = dataStore.followUps.filter((f) => f.assigned_to === uid);
  const fuDone = myFollowUps.filter((f) => f.status === 'Completed' && localDay(f.completed_at) === date).length;
  const fuMissed = myFollowUps
    .filter((f) => OPEN_FU.includes(f.status) && dayOf(f.scheduled_date || f.date) && dayOf(f.scheduled_date || f.date) <= date)
    .map((f) => ({ buyer: f.client_name || f.lead_name || 'Follow-up', due: dayOf(f.scheduled_date || f.date), source: 'Follow-up' }));

  // Lead follow-up dates that passed with no contact since that date
  const myLeads = companyLeads.filter((l) => assigneeOf(l) === uid && !FINAL.includes(String(l.stage || '').toLowerCase()));
  const leadMissed = myLeads
    .filter((l) => {
      const due = dayOf(l.follow_up_date);
      if (!due || due > date) return false;
      const c = contactInfo(l, contactIndex);
      const lastDay = c.last_contact_at ? localDay(c.last_contact_at) : '';
      return !lastDay || lastDay < due;
    })
    .map((l) => ({ buyer: l.company_name || l.name || 'Lead', due: dayOf(l.follow_up_date), source: 'Lead' }));
  const missed = [...fuMissed, ...leadMissed].sort((a, b) => a.due.localeCompare(b.due));

  const noContact = myLeads.filter((l) => contactInfo(l, contactIndex).no_contact_alert)
    .map((l) => ({ buyer: l.company_name || l.name || 'Lead', days: contactInfo(l, contactIndex).days_since_contact }))
    .sort((a, b) => b.days - a.days);

  const myTasks = dataStore.tasks.filter((t) => t.assigned_to === uid);
  const tasksDone = myTasks.filter((t) => t.status === 'Completed' && localDay(t.completed_at) === date).length;
  const tasksOverdue = myTasks.filter((t) => !['Completed', 'Cancelled'].includes(t.status) && dayOf(t.due_date) && dayOf(t.due_date) < date).length
    + myTasks.filter((t) => !['Completed', 'Cancelled'].includes(t.status) && dayOf(t.due_date) === date && date < todayISO()).length;

  const leadsCreated = companyLeads.filter((l) => l.created_by_id === uid && localDay(l.created_at) === date).length;

  return {
    id: member.id,
    name: member.name,
    role: isOwnerRecord(member) ? 'Owner' : (member.role || 'Staff'),
    is_active: member.is_active !== false,
    calls: sum('calls_made') + callActs,
    calls_outreach: sum('calls_made'),
    calls_logged_on_leads: callActs,
    emails: sum('emails_sent'),
    meetings: sum('meetings_booked'),
    activities_logged: acts.length,
    remarks_written: remarks.length,
    remarks: remarks.slice(0, 20),
    leads_created: leadsCreated,
    followups_done: fuDone,
    followups_missed: missed.length,
    missed_followups: missed.slice(0, 30),
    tasks_completed: tasksDone,
    tasks_overdue: tasksOverdue,
    no_contact_7d: noContact.length,
    no_contact_leads: noContact.slice(0, 15),
  };
};

/** The full report for one company owner and one day (YYYY-MM-DD, business time). */
const buildDailyReport = (owner, date = todayISO()) => {
  const fp = tenantFootprint(owner);
  const companyLeads = fp.groups.leads;
  const contactIndex = buildContactIndex();
  // Leads with no (or an old / deleted) assignee count as the owner's
  const memberIds = new Set([owner.id, ...fp.staffList.map((m) => m.id)]);
  const assigneeOf = (l) => (memberIds.has(l.assigned_to) ? l.assigned_to : owner.id);
  const members = [owner, ...fp.staffList].map((m) => memberDay(m, date, companyLeads, contactIndex, assigneeOf));
  const total = (k) => members.reduce((a, m) => a + (Number(m[k]) || 0), 0);
  return {
    date,
    company: owner.company_name || '',
    owner: { id: owner.id, name: owner.name, email: owner.email },
    no_contact_days: STALE_DAYS,
    totals: {
      calls: total('calls'),
      emails: total('emails'),
      meetings: total('meetings'),
      activities_logged: total('activities_logged'),
      remarks_written: total('remarks_written'),
      leads_created: total('leads_created'),
      followups_done: total('followups_done'),
      followups_missed: total('followups_missed'),
      tasks_completed: total('tasks_completed'),
      tasks_overdue: total('tasks_overdue'),
      no_contact_7d: total('no_contact_7d'),
    },
    members,
    // Staff who wrote nothing at all today (no remark, no call, no activity)
    silent_members: members.filter((m) => m.role !== 'Owner' && m.is_active && !m.remarks_written && !m.calls && !m.activities_logged).map((m) => m.name),
  };
};

const prettyDate = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const summaryLine = (r) =>
  `${r.totals.calls} calls, ${r.totals.remarks_written} remarks, ${r.totals.followups_done} follow-ups done, ${r.totals.followups_missed} missed`;

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Email body (simple table that works in every mail app). */
const reportEmail = (r, appUrl) => {
  const rows = r.members.map((m) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee"><b>${esc(m.name)}</b><br><span style="color:#888;font-size:11px">${esc(m.role)}</span></td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${m.calls}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${m.remarks_written}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${m.followups_done}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;color:${m.followups_missed ? '#c0262d' : '#333'};font-weight:${m.followups_missed ? 700 : 400}">${m.followups_missed}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${m.tasks_completed}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;color:${m.no_contact_7d ? '#c0262d' : '#333'}">${m.no_contact_7d}</td>
    </tr>`).join('');
  const missed = r.members.flatMap((m) => m.missed_followups.map((x) => `<li>${esc(m.name)}: <b>${esc(x.buyer)}</b> (due ${esc(x.due)})</li>`)).slice(0, 40).join('');
  const silent = r.silent_members.length ? `<p style="color:#c0262d"><b>No work recorded today:</b> ${esc(r.silent_members.join(', '))}</p>` : '';
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#222;max-width:680px;margin:auto">
    <h2 style="margin-bottom:4px">Team report – ${esc(prettyDate(r.date))}</h2>
    <p style="margin-top:0;color:#555">${esc(r.company)} · ${esc(summaryLine(r))}</p>
    ${silent}
    <table style="border-collapse:collapse;width:100%;font-size:13px">
      <tr style="background:#f4f6f8;text-align:left">
        <th style="padding:6px 8px">Member</th><th style="padding:6px 8px">Calls</th><th style="padding:6px 8px">Remarks</th>
        <th style="padding:6px 8px">F/U done</th><th style="padding:6px 8px">F/U missed</th><th style="padding:6px 8px">Tasks done</th><th style="padding:6px 8px">No contact ${r.no_contact_days}d+</th>
      </tr>${rows}
    </table>
    ${missed ? `<h3 style="margin-bottom:4px">Missed follow-ups</h3><ul style="margin-top:0">${missed}</ul>` : '<p>No missed follow-ups. 👍</p>'}
    <p><a href="${esc(appUrl)}" style="color:#0a7d55">Open the CRM → Team Review → Daily Report</a></p>
  </body></html>`;
  const text = `Team report ${prettyDate(r.date)} (${r.company})\n${summaryLine(r)}\n\n` +
    r.members.map((m) => `${m.name}: ${m.calls} calls, ${m.remarks_written} remarks, ${m.followups_done} follow-ups done, ${m.followups_missed} missed, ${m.tasks_completed} tasks done`).join('\n');
  return { subject: `Team report ${prettyDate(r.date)}: ${summaryLine(r)}`, html, text };
};

/** Create the in-app notification (and email) for one owner. Returns the report. */
const deliverDailyReport = async (owner, date = todayISO(), { sendMail } = {}) => {
  const r = buildDailyReport(owner, date);
  const notif = {
    id: generateId('notif'),
    target: 'specific_user',
    target_user_id: owner.id,
    target_name: owner.name,
    title: `Team report – ${prettyDate(date)}`,
    message: `${summaryLine(r)}.${r.silent_members.length ? ` No work recorded: ${r.silent_members.join(', ')}.` : ''} Open Team Review → Daily Report for details.`,
    type: r.totals.followups_missed || r.silent_members.length ? 'warning' : 'info',
    priority: r.totals.followups_missed ? 'high' : 'normal',
    kind: 'daily_report',
    report_date: date,
    created_at: new Date().toISOString(),
    created_by: 'CRM',
    read_by: [],
  };
  dataStore.notifications.unshift(notif);
  dbSync.saveNotification(notif);
  let mail = { ok: false, skipped: true };
  if (sendMail && owner.email && owner.daily_report_email !== false) {
    try {
      const config = require('../config/env');
      mail = await sendMail({ to: owner.email, ...reportEmail(r, config.appUrl) });
    } catch (err) {
      mail = { ok: false, error: err.message };
    }
  }
  return { report: r, notification: notif, mail };
};

/** Every few minutes: after the report hour, send today's report once to each active owner. */
const startDailyReportScheduler = ({ hour = Number(process.env.DAILY_REPORT_HOUR) || 19, everyMs = 5 * 60 * 1000 } = {}) => {
  const { sendPlatformMail } = require('./mailer.service');
  const { businessHourNow } = require('../utils/access');
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      if (businessHourNow() < hour) return;
      const today = todayISO();
      const owners = dataStore.users.filter((u) => isOwnerUser(u) && isOwnerRecord(u) && u.is_active !== false && u.id !== 'usr_super_admin');
      for (const owner of owners) {
        if (owner.last_daily_report_on === today || owner.daily_report_enabled === false) continue;
        owner.last_daily_report_on = today; // mark first, so a slow mail never sends twice
        dbSync.saveUser(owner);
        const { mail } = await deliverDailyReport(owner, today, { sendMail: sendPlatformMail });
        console.log(`[DailyReport] ${owner.email} ${today} -> in-app${mail.ok ? ' + email' : ''}`);
      }
    } catch (err) {
      console.warn('[DailyReport] failed:', err.message);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, everyMs);
  timer.unref();
  setTimeout(tick, 30 * 1000).unref();
  return { tick, stop: () => clearInterval(timer) };
};

module.exports = { buildDailyReport, deliverDailyReport, reportEmail, startDailyReportScheduler };
