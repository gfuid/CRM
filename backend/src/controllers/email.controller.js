/**
 * Email Marketing (premium, per-company feature)
 * - Owner configures their own SMTP sender (Gmail app password, Zoho, Maileroo, etc.)
 * - Leads get optional tags; campaigns target "all leads", selected tags, or a custom list
 * - Sending is throttled, logged per recipient, and every mail carries an unsubscribe link
 */

const ApiResponse = require('../utils/apiResponse');
const config = require('../config/env');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');
const mailer = require('../services/mailer.service');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Access helpers                                                      */
/* ------------------------------------------------------------------ */

const { isSuperAdmin, isOwnerUser } = require('../utils/access');
const { isLeadInUserScope } = require('../utils/tenantScope');

const featureEnabledFor = (user) => {
  if (isSuperAdmin(user)) return true;
  const rec = dataStore.users.find((u) => u.id === user.id) || user;
  return Boolean(rec.features && rec.features.email_marketing);
};

/** Gate: owner-only + feature flag switched on by the platform admin. */
const requireFeature = (req, res, next) => {
  if (!isOwnerUser(req.user)) {
    return res.status(403).json({
      success: false,
      code: 'OWNER_ONLY',
      message: 'Only the company owner can use Email Marketing.',
    });
  }
  if (!featureEnabledFor(req.user)) {
    return res.status(403).json({
      success: false,
      code: 'FEATURE_DISABLED',
      message: 'Email Marketing is a premium feature. Ask the platform admin to enable it for your company.',
    });
  }
  return next();
};

/** Leads visible to this owner (same scoping rule as the leads list). */
const ownerLeads = (user) => {
  if (isSuperAdmin(user)) return [];
  return dataStore.leads.filter((l) => isLeadInUserScope(l, user));
};

const getSettingsRecord = (ownerId) => dataStore.emailSettings.find((s) => s.owner_id === ownerId) || null;

const maskSettings = (s) =>
  s
    ? {
        host: s.host || '',
        port: s.port || 587,
        secure: Boolean(s.secure),
        user: s.user || '',
        from_name: s.from_name || '',
        from_email: s.from_email || '',
        reply_to: s.reply_to || '',
        rate_per_minute: s.rate_per_minute || 20,
        has_password: Boolean(s.pass_enc),
        verified_at: s.verified_at || null,
        unsubscribed_count: Array.isArray(s.unsubscribed) ? s.unsubscribed.length : 0,
        updated_at: s.updated_at || null,
      }
    : null;

const normalizeTags = (tags) => {
  const list = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',') : [];
  const seen = new Set();
  const out = [];
  for (const t of list) {
    const clean = String(t || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
};

/* ------------------------------------------------------------------ */
/* Audience                                                            */
/* ------------------------------------------------------------------ */

const buildRecipients = (user, audience = {}) => {
  const mode = audience.mode === 'tags' || audience.mode === 'custom' ? audience.mode : 'all';
  const settings = getSettingsRecord(user.id);
  const unsubscribed = new Set((settings && settings.unsubscribed ? settings.unsubscribed : []).map((e) => String(e).toLowerCase()));

  let picked = [];
  if (mode === 'custom') {
    const raw = Array.isArray(audience.emails) ? audience.emails : String(audience.emails || '').split(/[\s,;]+/);
    picked = raw.map((e) => ({ email: String(e || '').trim().toLowerCase(), name: '', company: '', country: '', product: '', lead_id: null }));
  } else {
    const wanted = normalizeTags(audience.tags).map((t) => t.toLowerCase());
    picked = ownerLeads(user)
      .filter((l) => {
        if (l.email_unsubscribed) return false;
        if (mode === 'all') return true;
        return (Array.isArray(l.tags) ? l.tags : []).some((t) => wanted.includes(String(t).toLowerCase()));
      })
      .flatMap((l) => {
        const emails = new Set();
        if (l.email) emails.add(String(l.email).trim().toLowerCase());
        (Array.isArray(l.contacts) ? l.contacts : []).forEach((c) => c && c.email && emails.add(String(c.email).trim().toLowerCase()));
        const contactFor = (email) => (Array.isArray(l.contacts) ? l.contacts : []).find((c) => c && String(c.email || '').toLowerCase() === email);
        return [...emails].map((email) => {
          const c = contactFor(email);
          return {
            email,
            name: (c && c.name) || l.contact_person || '',
            company: l.company_name || l.name || '',
            country: String(l.country || '').replace(/[\uD83C-􏰀-\uDFFF]+/g, '').trim(),
            product: l.product || (Array.isArray(l.products) ? l.products.join(', ') : ''),
            lead_id: l.id,
          };
        });
      });
  }

  const seen = new Set();
  const out = [];
  for (const r of picked) {
    if (!EMAIL_RE.test(r.email) || seen.has(r.email) || unsubscribed.has(r.email)) continue;
    seen.add(r.email);
    out.push({ ...r, status: 'pending', error: '' });
  }
  return { mode, tags: normalizeTags(audience.tags), recipients: out };
};

/* ------------------------------------------------------------------ */
/* Status & settings                                                   */
/* ------------------------------------------------------------------ */

const getStatus = async (req, res) => {
  const owner = isOwnerUser(req.user);
  const enabled = owner && featureEnabledFor(req.user);
  const settings = owner ? getSettingsRecord(req.user.id) : null;
  return ApiResponse.success(res, {
    is_owner: owner,
    enabled,
    configured: Boolean(settings && settings.host && settings.user && settings.pass_enc),
    from_email: settings ? settings.from_email || settings.user : '',
    platform_mail_configured: mailer.isPlatformMailConfigured(),
  });
};

const getSettings = async (req, res) => ApiResponse.success(res, maskSettings(getSettingsRecord(req.user.id)));

const saveSettings = async (req, res) => {
  const { host, port, secure, user, pass, from_name, from_email, reply_to, rate_per_minute } = req.body || {};
  if (!host || !user) return ApiResponse.error(res, 'SMTP host and username are required', 400);
  if (from_email && !EMAIL_RE.test(from_email)) return ApiResponse.error(res, 'From email is not valid', 400);
  if (reply_to && !EMAIL_RE.test(reply_to)) return ApiResponse.error(res, 'Reply-to email is not valid', 400);

  const existing = getSettingsRecord(req.user.id);
  if (!existing && !pass) return ApiResponse.error(res, 'SMTP password is required', 400);

  const record = {
    ...(existing || { owner_id: req.user.id, unsubscribed: [], verified_at: null }),
    company_id: req.user.company_id || '',
    host: String(host).trim(),
    port: Number(port) || 587,
    secure: secure !== undefined ? Boolean(secure) : Number(port) === 465,
    user: String(user).trim(),
    pass_enc: pass ? mailer.encryptSecret(pass) : existing.pass_enc,
    from_name: String(from_name || '').trim().slice(0, 80),
    from_email: String(from_email || '').trim().toLowerCase(),
    reply_to: String(reply_to || '').trim().toLowerCase(),
    rate_per_minute: Math.min(120, Math.max(1, Number(rate_per_minute) || 20)),
    updated_at: new Date().toISOString(),
  };
  if (pass || !existing || existing.host !== record.host || existing.user !== record.user) record.verified_at = null;

  const idx = dataStore.emailSettings.findIndex((s) => s.owner_id === req.user.id);
  if (idx === -1) dataStore.emailSettings.push(record);
  else dataStore.emailSettings[idx] = record;
  dbSync.saveEmailSetting(record);

  return ApiResponse.success(res, maskSettings(record), 'Sender settings saved');
};

const testSettings = async (req, res) => {
  const settings = getSettingsRecord(req.user.id);
  if (!settings || !settings.pass_enc) return ApiResponse.error(res, 'Save your SMTP sender settings first', 400);
  const to = (req.body && req.body.to) || req.user.email;
  if (!EMAIL_RE.test(to || '')) return ApiResponse.error(res, 'A valid recipient email is required', 400);

  const transport = mailer.createOwnerTransport(settings);
  if (!transport) return ApiResponse.error(res, 'Stored SMTP password could not be read. Please re-enter it.', 400);

  try {
    await transport.sendMail({
      from: mailer.formatFrom(settings),
      to,
      replyTo: settings.reply_to || undefined,
      subject: 'Travel-Trade CRM: test email',
      text: 'Your SMTP sender is working. Campaign emails will be sent from this address.',
      html: mailer.wrapHtml({
        title: 'Test email',
        bodyHtml: '<h2 style="margin:0 0 12px 0;color:#065f46">Your sender works 🎉</h2><p style="margin:0;line-height:1.6">Campaign emails will be sent from this address.</p>',
      }),
    });
    settings.verified_at = new Date().toISOString();
    dbSync.saveEmailSetting(settings);
    return ApiResponse.success(res, { to, verified_at: settings.verified_at }, `Test email sent to ${to}`);
  } catch (err) {
    return ApiResponse.error(res, `SMTP test failed: ${err.message}`, 400);
  }
};

/* ------------------------------------------------------------------ */
/* Tags & audience preview                                             */
/* ------------------------------------------------------------------ */

const getTags = async (req, res) => {
  const counts = new Map();
  for (const l of ownerLeads(req.user)) {
    const hasEmail = Boolean(l.email) || (Array.isArray(l.contacts) && l.contacts.some((c) => c && c.email));
    for (const t of normalizeTags(l.tags)) {
      const key = t.toLowerCase();
      const cur = counts.get(key) || { tag: t, leads: 0, with_email: 0 };
      cur.leads += 1;
      if (hasEmail && !l.email_unsubscribed) cur.with_email += 1;
      counts.set(key, cur);
    }
  }
  const list = [...counts.values()].sort((a, b) => b.leads - a.leads || a.tag.localeCompare(b.tag));
  return ApiResponse.success(res, list);
};

const previewAudience = async (req, res) => {
  const audience = {
    mode: req.query.mode,
    tags: req.query.tags ? String(req.query.tags).split(',') : [],
    emails: req.query.emails ? String(req.query.emails).split(',') : [],
  };
  const built = buildRecipients(req.user, audience);
  return ApiResponse.success(res, {
    mode: built.mode,
    tags: built.tags,
    count: built.recipients.length,
    sample: built.recipients.slice(0, 8).map((r) => ({ email: r.email, company: r.company })),
  });
};

/* ------------------------------------------------------------------ */
/* Campaigns                                                           */
/* ------------------------------------------------------------------ */

const ownerCampaigns = (user) => dataStore.emailCampaigns.filter((c) => c.owner_id === user.id);

const summarize = (c) => {
  const { recipients, ...rest } = c;
  return { ...rest, recipient_count: Array.isArray(recipients) ? recipients.length : 0 };
};

const listCampaigns = async (req, res) => {
  const list = ownerCampaigns(req.user)
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(summarize);
  return ApiResponse.success(res, list);
};

const getCampaign = async (req, res) => {
  const c = ownerCampaigns(req.user).find((x) => x.id === req.params.id);
  if (!c) return ApiResponse.error(res, 'Campaign not found', 404);
  return ApiResponse.success(res, c);
};

const buildMessage = ({ campaign, settings, ownerId, recipient }) => {
  const vars = {
    company_name: recipient.company || '',
    contact_name: recipient.name || '',
    country: recipient.country || '',
    product: recipient.product || '',
    email: recipient.email,
    sender_name: settings.from_name || '',
  };
  const subject = mailer.renderTemplate(campaign.subject, vars);
  const bodyText = mailer.renderTemplate(campaign.body, vars);
  const unsubUrl = `${config.apiPublicUrl}/api/v1/email/unsubscribe/${mailer.unsubscribeToken(ownerId, recipient.email)}`;
  const senderLabel = mailer.escapeHtml(settings.from_name || settings.from_email || settings.user);
  const html = mailer.wrapHtml({
    title: subject,
    bodyHtml: mailer.textToHtml(bodyText),
    footerHtml: `You are receiving this email from ${senderLabel}. <a href="${unsubUrl}" style="color:#64748b">Unsubscribe</a>`,
  });
  const text = `${bodyText.replace(/<[^>]+>/g, '')}\n\n--\nUnsubscribe: ${unsubUrl}`;
  return { subject, html, text, unsubUrl };
};

const createCampaign = async (req, res) => {
  const { name, subject, body, audience } = req.body || {};
  if (!subject || !String(subject).trim()) return ApiResponse.error(res, 'Subject is required', 400);
  if (!body || !String(body).trim()) return ApiResponse.error(res, 'Email body is required', 400);

  const built = buildRecipients(req.user, audience || {});
  if (built.recipients.length === 0) {
    return ApiResponse.error(res, 'No recipients match this audience. Add tags to leads with email addresses, or paste emails.', 400);
  }

  const campaign = {
    id: generateId('cmp'),
    owner_id: req.user.id,
    company_id: req.user.company_id || '',
    name: String(name || subject).trim().slice(0, 120),
    subject: String(subject).trim().slice(0, 200),
    body: String(body),
    audience: { mode: built.mode, tags: built.tags, emails: built.mode === 'custom' ? built.recipients.map((r) => r.email) : [] },
    status: 'draft',
    total: built.recipients.length,
    sent: 0,
    failed: 0,
    recipients: built.recipients,
    error: '',
    created_by: req.user.name || req.user.email || '',
    created_at: new Date().toISOString(),
    started_at: null,
    finished_at: null,
  };
  dataStore.emailCampaigns.unshift(campaign);
  dbSync.saveEmailCampaign(campaign);

  if (req.body && req.body.send === true) {
    return startSending(req, res, campaign);
  }
  return ApiResponse.created(res, summarize(campaign), 'Campaign saved as draft');
};

const runCampaign = async (campaign, settings, ownerId) => {
  const transport = mailer.createOwnerTransport(settings);
  const delay = Math.max(400, Math.floor(60000 / (Number(settings.rate_per_minute) || 20)));
  const from = mailer.formatFrom(settings);
  let sinceSave = 0;

  for (const r of campaign.recipients) {
    if (r.status === 'sent') continue;
    const msg = buildMessage({ campaign, settings, ownerId, recipient: r });
    try {
      await transport.sendMail({
        from,
        to: r.email,
        replyTo: settings.reply_to || undefined,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        headers: { 'List-Unsubscribe': `<${msg.unsubUrl}>` },
      });
      r.status = 'sent';
      r.error = '';
      r.sent_at = new Date().toISOString();
      campaign.sent += 1;
    } catch (err) {
      r.status = 'failed';
      r.error = String(err.message || err).slice(0, 200);
      campaign.failed += 1;
    }
    sinceSave += 1;
    if (sinceSave >= 10) {
      sinceSave = 0;
      dbSync.saveEmailCampaign(campaign);
    }
    await sleep(delay);
  }

  campaign.status = campaign.sent === 0 && campaign.failed > 0 ? 'failed' : 'sent';
  campaign.finished_at = new Date().toISOString();
  dbSync.saveEmailCampaign(campaign);
};

const startSending = async (req, res, campaign) => {
  const settings = getSettingsRecord(req.user.id);
  if (!settings || !settings.pass_enc) {
    return ApiResponse.error(res, 'Configure and test your SMTP sender before sending a campaign', 400);
  }
  if (!mailer.createOwnerTransport(settings)) {
    return ApiResponse.error(res, 'Stored SMTP password could not be read. Please re-enter it in sender settings.', 400);
  }
  if (campaign.status === 'sending') return ApiResponse.error(res, 'Campaign is already sending', 409);

  // A campaign interrupted by a restart continues with the recipients that were not sent yet
  if (campaign.status === 'draft_resume') {
    campaign.status = 'draft';
    campaign.resumed = true;
  } else if (campaign.audience && campaign.audience.mode !== 'custom' && campaign.status === 'draft') {
    // Rebuild the audience at send time so new tags/unsubscribes are respected (custom lists stay as saved)
    const built = buildRecipients(req.user, campaign.audience);
    campaign.recipients = built.recipients;
    campaign.total = built.recipients.length;
  }
  if (campaign.total === 0) return ApiResponse.error(res, 'No recipients to send to', 400);

  campaign.status = 'sending';
  campaign.started_at = new Date().toISOString();
  campaign.error = '';
  dbSync.saveEmailCampaign(campaign);

  runCampaign(campaign, settings, req.user.id).catch((err) => {
    campaign.status = 'failed';
    campaign.error = String(err.message || err).slice(0, 200);
    campaign.finished_at = new Date().toISOString();
    dbSync.saveEmailCampaign(campaign);
  });

  return ApiResponse.success(res, summarize(campaign), `Sending to ${campaign.total} recipient${campaign.total === 1 ? '' : 's'}`);
};

const sendCampaign = async (req, res) => {
  const c = ownerCampaigns(req.user).find((x) => x.id === req.params.id);
  if (!c) return ApiResponse.error(res, 'Campaign not found', 404);
  if (c.status === 'paused') {
    c.status = 'draft_resume';
  }
  if (c.status === 'sent' && !(req.body && req.body.retry_failed)) {
    return ApiResponse.error(res, 'Campaign already sent. Use retry_failed to resend failed recipients.', 409);
  }
  if (req.body && req.body.retry_failed) {
    c.recipients.forEach((r) => {
      if (r.status === 'failed') r.status = 'pending';
    });
    c.failed = 0;
    c.status = 'draft';
  }
  return startSending(req, res, c);
};

const sendTestCampaign = async (req, res) => {
  const settings = getSettingsRecord(req.user.id);
  if (!settings || !settings.pass_enc) return ApiResponse.error(res, 'Configure your SMTP sender first', 400);
  const { subject, body } = req.body || {};
  const to = (req.body && req.body.to) || req.user.email;
  if (!subject || !body) return ApiResponse.error(res, 'Subject and body are required', 400);
  if (!EMAIL_RE.test(to || '')) return ApiResponse.error(res, 'A valid recipient email is required', 400);

  const transport = mailer.createOwnerTransport(settings);
  if (!transport) return ApiResponse.error(res, 'Stored SMTP password could not be read. Please re-enter it.', 400);

  const sample = ownerLeads(req.user).find((l) => l.email) || {};
  const recipient = {
    email: to,
    name: sample.contact_person || 'Sample Contact',
    company: sample.company_name || sample.name || 'Sample Company',
    country: String(sample.country || 'India').replace(/[\uD83C-􏰀-\uDFFF]+/g, '').trim(),
    product: sample.product || 'your product',
  };
  const msg = buildMessage({ campaign: { subject, body }, settings, ownerId: req.user.id, recipient });
  try {
    await transport.sendMail({ from: mailer.formatFrom(settings), to, subject: `[TEST] ${msg.subject}`, html: msg.html, text: msg.text });
    return ApiResponse.success(res, { to }, `Test campaign email sent to ${to}`);
  } catch (err) {
    return ApiResponse.error(res, `Test send failed: ${err.message}`, 400);
  }
};

const deleteCampaign = async (req, res) => {
  const idx = dataStore.emailCampaigns.findIndex((c) => c.id === req.params.id && c.owner_id === req.user.id);
  if (idx === -1) return ApiResponse.error(res, 'Campaign not found', 404);
  if (dataStore.emailCampaigns[idx].status === 'sending') return ApiResponse.error(res, 'Cannot delete a campaign while it is sending', 409);
  const [removed] = dataStore.emailCampaigns.splice(idx, 1);
  dbSync.deleteEmailCampaign(removed.id);
  return ApiResponse.success(res, { id: removed.id }, 'Campaign deleted');
};

/* ------------------------------------------------------------------ */
/* Public unsubscribe                                                  */
/* ------------------------------------------------------------------ */

const page = (title, text) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#f4f6f8;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a">
<div style="max-width:480px;margin:60px auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;text-align:center">
<h1 style="font-size:22px;margin:0 0 10px 0">${title}</h1><p style="margin:0;color:#475569;line-height:1.6">${text}</p></div></body></html>`;

const unsubscribe = async (req, res) => {
  const parsed = mailer.parseUnsubscribeToken(req.params.token);
  if (!parsed) return res.status(400).send(page('Invalid link', 'This unsubscribe link is not valid.'));

  const { ownerId, email } = parsed;
  const settings = getSettingsRecord(ownerId);
  if (settings) {
    settings.unsubscribed = Array.isArray(settings.unsubscribed) ? settings.unsubscribed : [];
    if (!settings.unsubscribed.includes(email)) settings.unsubscribed.push(email);
    dbSync.saveEmailSetting(settings);
  } else {
    const rec = { owner_id: ownerId, unsubscribed: [email], updated_at: new Date().toISOString() };
    dataStore.emailSettings.push(rec);
    dbSync.saveEmailSetting(rec);
  }
  // Only this sender's own company leads are flagged; other companies are not affected
  const senderUser = dataStore.users.find((u) => u.id === ownerId);
  dataStore.leads.forEach((l) => {
    if (!senderUser || !isLeadInUserScope(l, senderUser)) return;
    const match =
      String(l.email || '').toLowerCase() === email ||
      (Array.isArray(l.contacts) && l.contacts.some((c) => c && String(c.email || '').toLowerCase() === email));
    if (match) {
      l.email_unsubscribed = true;
      dbSync.saveLead(l);
    }
  });
  return res.send(page('You are unsubscribed', `${email} will not receive further marketing emails from this sender.`));
};

module.exports = {
  requireFeature,
  normalizeTags,
  getStatus,
  getSettings,
  saveSettings,
  testSettings,
  getTags,
  previewAudience,
  listCampaigns,
  getCampaign,
  createCampaign,
  sendCampaign,
  sendTestCampaign,
  deleteCampaign,
  unsubscribe,
};
