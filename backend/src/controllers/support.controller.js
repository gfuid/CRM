/**
 * Support tickets + AI assistant endpoints.
 *
 * Who sees which ticket:
 *   - Staff: only tickets they raised.
 *   - Owner: every ticket raised by anyone in their own company.
 *   - Super Admin (platform team): all tickets; only they can reply as "Support".
 */
const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');
const { isOwnerUser, isSuperAdmin } = require('../utils/access');
const { getTenantContext } = require('../utils/tenantScope');
const { ownerOf } = require('../utils/usage');
const assistant = require('../services/assistant.service');

const CATEGORIES = ['Question', 'Bug / Something not working', 'Feature request', 'Staff or storage limit', 'Data correction', 'Billing / Plan', 'Other'];
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
const STATUSES = ['Open', 'In Progress', 'Waiting on you', 'Resolved', 'Closed'];
const MAX_OPEN_PER_USER = 10;
const MAX_NEW_PER_DAY = 15;

const nowIso = () => new Date().toISOString();
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const canSee = (ticket, user) => {
  if (isSuperAdmin(user)) return true;
  if (ticket.created_by_id === user.id) return true;
  if (isOwnerUser(user)) {
    const owner = ownerOf(user);
    return Boolean(owner && ticket.owner_id === owner.id);
  }
  return false;
};

/** List view: no full message bodies, just the latest line. */
const summary = (t, viewer) => {
  const last = (t.messages || [])[t.messages.length - 1] || {};
  return {
    id: t.id,
    number: t.number,
    code: `TKT-${t.number}`,
    subject: t.subject,
    category: t.category,
    priority: t.priority,
    status: t.status,
    source: t.source,
    created_by_name: t.created_by_name,
    created_by_role: t.created_by_role,
    company_name: t.company_name,
    ...(isSuperAdmin(viewer) ? { created_by_email: t.created_by_email } : {}),
    messages_count: (t.messages || []).length,
    last_message: String(last.body || '').slice(0, 140),
    last_reply_by: t.last_reply_by,
    unread: isSuperAdmin(viewer) ? Boolean(t.unread_for_admin) : Boolean(t.unread_for_user && t.created_by_id === viewer.id),
    is_mine: t.created_by_id === viewer.id,
    created_at: t.created_at,
    updated_at: t.updated_at,
  };
};

const full = (t, viewer) => ({
  ...summary(t, viewer),
  messages: (t.messages || []).map((m) => ({
    id: m.id,
    author_name: m.author_role === 'support' ? (isSuperAdmin(viewer) ? `${m.author_name} (Support)` : 'Support Team') : m.author_name,
    author_role: m.author_role,
    body: m.body,
    at: m.at,
    is_chat_transcript: Boolean(m.is_chat_transcript),
  })),
});

const notifyUser = (ticket, title, message) => {
  const notif = {
    id: generateId('notif'),
    target: 'specific_user',
    target_user_id: ticket.created_by_id,
    target_name: ticket.created_by_name,
    owner_id: ticket.owner_id,
    title,
    message,
    type: 'info',
    priority: 'normal',
    kind: 'support_ticket',
    ticket_id: ticket.id,
    created_at: nowIso(),
    created_by: 'Support Team',
    read_by: [],
  };
  dataStore.notifications.unshift(notif);
  dbSync.saveNotification(notif);
};

const mailSafely = async (to, subject, text) => {
  try {
    const { sendPlatformMail, textToHtml } = require('../services/mailer.service');
    if (!to) return;
    await sendPlatformMail({ to, subject, text, html: textToHtml ? textToHtml(text) : undefined });
  } catch {}
};

const nextNumber = () => (dataStore.tickets || []).reduce((max, t) => Math.max(max, Number(t.number) || 0), 1000) + 1;

/* ------------------------------ Tickets ------------------------------ */

const listTickets = async (req, res) => {
  const { status } = req.query;
  let list = (dataStore.tickets || []).filter((t) => canSee(t, req.user));
  if (status && status !== 'all') {
    list = status === 'active' ? list.filter((t) => !['Resolved', 'Closed'].includes(t.status)) : list.filter((t) => t.status === status);
  }
  list = [...list].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  const all = (dataStore.tickets || []).filter((t) => canSee(t, req.user));
  return ApiResponse.success(res, list.map((t) => summary(t, req.user)), 'Tickets', 200, {
    counts: {
      open: all.filter((t) => !['Resolved', 'Closed'].includes(t.status)).length,
      unread: all.filter((t) => summary(t, req.user).unread).length,
      total: all.length,
    },
    categories: CATEGORIES,
    priorities: PRIORITIES,
    statuses: STATUSES,
  });
};

const getTicket = async (req, res) => {
  const t = (dataStore.tickets || []).find((x) => x.id === req.params.id);
  if (!t || !canSee(t, req.user)) return ApiResponse.error(res, 'Ticket not found', 404);
  // Opening it marks it read for that side
  if (isSuperAdmin(req.user) && t.unread_for_admin) { t.unread_for_admin = false; dbSync.saveTicket(t); }
  if (!isSuperAdmin(req.user) && t.created_by_id === req.user.id && t.unread_for_user) { t.unread_for_user = false; dbSync.saveTicket(t); }
  return ApiResponse.success(res, full(t, req.user), 'Ticket');
};

const createTicket = async (req, res) => {
  if (isSuperAdmin(req.user)) return ApiResponse.error(res, 'The platform admin answers tickets; tickets are raised by company users.', 400);
  const subject = str(req.body.subject, 150);
  const description = str(req.body.description, 5000);
  const category = CATEGORIES.includes(req.body.category) ? req.body.category : 'Question';
  const priority = PRIORITIES.includes(req.body.priority) ? req.body.priority : 'Normal';
  if (subject.length < 5) return ApiResponse.error(res, 'Please write a short subject (at least 5 characters).', 400);
  if (description.length < 10) return ApiResponse.error(res, 'Please describe the problem (at least 10 characters).', 400);

  const mine = (dataStore.tickets || []).filter((t) => t.created_by_id === req.user.id);
  if (mine.filter((t) => !['Resolved', 'Closed'].includes(t.status)).length >= MAX_OPEN_PER_USER) {
    return ApiResponse.error(res, `You already have ${MAX_OPEN_PER_USER} open tickets. Please wait for a reply or close old ones.`, 429);
  }
  const dayAgo = Date.now() - 86400000;
  if (mine.filter((t) => new Date(t.created_at).getTime() > dayAgo).length >= MAX_NEW_PER_DAY) {
    return ApiResponse.error(res, 'Too many tickets today. Please add to an existing ticket instead.', 429);
  }

  const owner = ownerOf(req.user) || req.user;
  const ctx = getTenantContext(req.user);
  const now = nowIso();
  const messages = [{ id: generateId('msg'), author_id: req.user.id, author_name: req.user.name || 'User', author_role: 'user', body: description, at: now }];

  // Optional: the AI chat that led to this ticket, so support sees what was already tried
  const transcript = Array.isArray(req.body.chat_transcript) ? req.body.chat_transcript : null;
  if (transcript && transcript.length) {
    const text = transcript
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-12)
      .map((m) => `${m.role === 'user' ? (req.user.name || 'User') : 'AI assistant'}: ${m.content.slice(0, 1500)}`)
      .join('\n\n');
    if (text) messages.push({ id: generateId('msg'), author_id: req.user.id, author_name: 'AI chat history', author_role: 'user', body: text.slice(0, 15000), at: now, is_chat_transcript: true });
  }

  const ticket = {
    id: generateId('tkt'),
    number: nextNumber(),
    company_id: ctx.companyId || owner.company_id || '',
    owner_id: owner.id,
    company_name: owner.company_name || '',
    created_by_id: req.user.id,
    created_by_name: req.user.name || '',
    created_by_email: req.user.email || '',
    created_by_role: isOwnerUser(req.user) ? 'Owner' : 'Staff',
    subject,
    category,
    priority,
    status: 'Open',
    source: transcript && transcript.length ? 'chatbot' : 'manual',
    messages,
    unread_for_admin: true,
    unread_for_user: false,
    last_reply_by: 'user',
    created_at: now,
    updated_at: now,
    resolved_at: null,
  };
  dataStore.tickets = dataStore.tickets || [];
  dataStore.tickets.unshift(ticket);
  dbSync.saveTicket(ticket);

  const config = require('../config/env');
  const adminEmail = process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL || '';
  mailSafely(adminEmail, `New support ticket TKT-${ticket.number}: ${subject}`,
    `${ticket.created_by_name} (${ticket.created_by_role}, ${ticket.company_name}) raised a ${priority} ticket.\n\nCategory: ${category}\n\n${description}\n\nOpen the Admin Console → Support Tickets to reply.\n${config.appUrl || ''}`);

  return ApiResponse.created(res, full(ticket, req.user), `Ticket TKT-${ticket.number} created. The support team will reply here.`);
};

const addMessage = async (req, res) => {
  const t = (dataStore.tickets || []).find((x) => x.id === req.params.id);
  if (!t || !canSee(t, req.user)) return ApiResponse.error(res, 'Ticket not found', 404);
  const body = str(req.body.body, 5000);
  if (!body) return ApiResponse.error(res, 'Please write a message.', 400);
  const support = isSuperAdmin(req.user);
  if (!support && t.created_by_id !== req.user.id) {
    return ApiResponse.error(res, 'Only the person who raised this ticket can reply to it.', 403);
  }
  if (!support && t.status === 'Closed') {
    return ApiResponse.error(res, 'This ticket is closed. Please raise a new ticket.', 400);
  }
  const now = nowIso();
  t.messages = [...(t.messages || []), { id: generateId('msg'), author_id: req.user.id, author_name: req.user.name || (support ? 'Support' : 'User'), author_role: support ? 'support' : 'user', body, at: now }].slice(-200);
  t.updated_at = now;
  t.last_reply_by = support ? 'support' : 'user';
  if (support) {
    t.unread_for_user = true;
    if (t.status === 'Open') t.status = 'In Progress';
    notifyUser(t, `Support replied to TKT-${t.number}`, `${t.subject}: ${body.slice(0, 160)}`);
    mailSafely(t.created_by_email, `Reply on your ticket TKT-${t.number}: ${t.subject}`, `${body}\n\nOpen the CRM → Support to reply.`);
  } else {
    t.unread_for_admin = true;
    if (['Resolved', 'Waiting on you'].includes(t.status)) t.status = 'Open';
  }
  dbSync.saveTicket(t);
  return ApiResponse.success(res, full(t, req.user), 'Message sent');
};

const updateTicket = async (req, res) => {
  const t = (dataStore.tickets || []).find((x) => x.id === req.params.id);
  if (!t || !canSee(t, req.user)) return ApiResponse.error(res, 'Ticket not found', 404);
  const support = isSuperAdmin(req.user);
  const { status, priority } = req.body || {};
  if (status !== undefined && !STATUSES.includes(status)) return ApiResponse.error(res, 'Status is not valid', 400);
  if (priority !== undefined && !PRIORITIES.includes(priority)) return ApiResponse.error(res, 'Priority is not valid', 400);
  if (!support) {
    // Users may only close their own ticket (or the owner a ticket of his company), nothing else
    if (priority !== undefined || (status !== undefined && status !== 'Closed')) {
      return ApiResponse.error(res, 'Only the support team can change the status or priority. You can close the ticket.', 403);
    }
  }
  const before = t.status;
  if (status !== undefined) t.status = status;
  if (priority !== undefined) t.priority = priority;
  if (status && ['Resolved', 'Closed'].includes(status) && !t.resolved_at) t.resolved_at = nowIso();
  if (status && !['Resolved', 'Closed'].includes(status)) t.resolved_at = null;
  t.updated_at = nowIso();
  if (support && status && status !== before) {
    t.unread_for_user = true;
    notifyUser(t, `TKT-${t.number} is now "${status}"`, t.subject);
  }
  dbSync.saveTicket(t);
  return ApiResponse.success(res, full(t, req.user), 'Ticket updated');
};

/* ------------------------------ AI assistant ------------------------------ */

const assistantStatus = async (req, res) => ApiResponse.success(res, assistant.status(req.user), 'Assistant status');

const assistantChat = async (req, res) => {
  if (isSuperAdmin(req.user)) return ApiResponse.error(res, 'The assistant is for company users.', 400);
  const r = await assistant.chat(req.user, req.body && req.body.messages);
  if (!r.ok) return ApiResponse.error(res, r.message, r.status || 500);
  return ApiResponse.success(res, { reply: r.reply, used_today: r.used_today, daily_limit: r.daily_limit }, 'Answer');
};

const getAiSettings = async (req, res) => ApiResponse.success(res, assistant.publicSettings(), 'AI settings');

const saveAiSettings = async (req, res) => {
  try {
    const out = assistant.updateSettings(req.body || {});
    const log = {
      id: generateId('log'),
      actor_name: req.user.name || 'Super Admin',
      actor_id: req.user.id,
      action: 'AI_SETTINGS_UPDATED',
      details: `AI assistant ${out.enabled ? 'ON' : 'OFF'}, model ${out.model}, ${out.daily_limit_per_user}/user/day, user data ${out.include_user_data ? 'shared' : 'not shared'}${req.body && req.body.api_key !== undefined ? ', API key changed' : ''}`,
      timestamp: nowIso(),
    };
    dataStore.auditLogs.unshift(log);
    dbSync.saveAuditLog(log);
    return ApiResponse.success(res, out, 'AI settings saved');
  } catch (err) {
    return ApiResponse.error(res, err.message, err.status || 400);
  }
};

const testAi = async (req, res) => {
  const r = await assistant.testConnection();
  return ApiResponse.success(res, r, r.message);
};

module.exports = {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  listTickets,
  getTicket,
  createTicket,
  addMessage,
  updateTicket,
  assistantStatus,
  assistantChat,
  getAiSettings,
  saveAiSettings,
  testAi,
};
