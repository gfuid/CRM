/**
 * Mailer Service
 * - Platform transport (env SMTP_*): transactional mails such as the registration thank-you.
 * - Owner transport (per-company SMTP credentials, encrypted at rest): email marketing campaigns.
 */

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const config = require('../config/env');

/* ------------------------------------------------------------------ */
/* Secret encryption (AES-256-GCM)                                     */
/* ------------------------------------------------------------------ */

const getKey = () => crypto.createHash('sha256').update(String(config.mailEncKey || config.jwtSecret)).digest();

const encryptSecret = (plain) => {
  if (!plain) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
};

const decryptSecret = (stored) => {
  if (!stored) return '';
  if (!String(stored).startsWith('enc:')) return String(stored);
  try {
    const [, ivB64, tagB64, dataB64] = String(stored).split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch (e) {
    return '';
  }
};

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Replace {{placeholders}} in a template string. Unknown keys become ''. */
const renderTemplate = (template, vars = {}) =>
  String(template || '').replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) =>
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ''
  );

/** Turn plain text with line breaks into simple HTML paragraphs (if no HTML tags present). */
const textToHtml = (body) => {
  const s = String(body || '');
  if (/<[a-z][\s\S]*>/i.test(s)) return s;
  return s
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px 0;line-height:1.6">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
};

const wrapHtml = ({ title, bodyHtml, footerHtml = '' }) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
        <tr><td style="padding:28px 32px;font-size:15px">${bodyHtml}</td></tr>
        ${footerHtml ? `<tr><td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">${footerHtml}</td></tr>` : ''}
      </table>
    </td></tr>
  </table>
</body></html>`;

const welcomeEmail = ({ name, companyName, loginUrl }) => {
  const safeName = escapeHtml(name || 'there');
  const safeCompany = escapeHtml(companyName || 'your company');
  const subject = `Welcome to Travel-Trade CRM, ${name || 'there'}!`;
  const bodyHtml = `
    <h1 style="margin:0 0 12px 0;font-size:22px;color:#065f46">Thank you for registering 🎉</h1>
    <p style="margin:0 0 14px 0;line-height:1.6">Hi ${safeName},</p>
    <p style="margin:0 0 14px 0;line-height:1.6">Your workspace for <strong>${safeCompany}</strong> is ready. You can now add leads, schedule follow-ups, create tasks and invite your staff.</p>
    <p style="margin:20px 0"><a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">Open your CRM</a></p>
    <p style="margin:0;line-height:1.6;color:#475569">If you did not create this account, you can ignore this email.</p>`;
  const html = wrapHtml({ title: subject, bodyHtml, footerHtml: 'Travel-Trade CRM · Export & Commodity Trade Platform' });
  const text = `Hi ${name || 'there'},\n\nThank you for registering. Your workspace for ${companyName || 'your company'} is ready.\nOpen your CRM: ${loginUrl}\n\nIf you did not create this account, you can ignore this email.`;
  return { subject, html, text };
};

/* ------------------------------------------------------------------ */
/* Transports                                                          */
/* ------------------------------------------------------------------ */

let platformTransport = null;

const isPlatformMailConfigured = () => Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);

const getPlatformTransport = () => {
  if (!isPlatformMailConfigured()) return null;
  if (!platformTransport) {
    platformTransport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return platformTransport;
};

/** Send a transactional mail from the platform sender. Never throws; returns {ok, error}. */
const sendPlatformMail = async ({ to, subject, html, text }) => {
  const transport = getPlatformTransport();
  if (!transport) {
    console.warn(`[Mailer] Platform SMTP not configured. Skipped mail to ${to}: "${subject}"`);
    return { ok: false, skipped: true, error: 'Platform SMTP not configured' };
  }
  try {
    const info = await transport.sendMail({ from: config.smtp.from, to, subject, html, text });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.warn(`[Mailer] Platform mail to ${to} failed:`, err.message);
    return { ok: false, error: err.message };
  }
};

const sendWelcomeEmail = async (user, companyName) => {
  if (!user || !user.email) return { ok: false, error: 'No recipient' };
  const mail = welcomeEmail({ name: user.name, companyName, loginUrl: `${config.appUrl}/login` });
  return sendPlatformMail({ to: user.email, ...mail });
};

/** Build a nodemailer transport from an owner's stored SMTP settings (password encrypted). */
const createOwnerTransport = (settings) => {
  if (!settings || !settings.host || !settings.user) return null;
  const pass = decryptSecret(settings.pass_enc);
  if (!pass) return null;
  const port = Number(settings.port) || 587;
  return nodemailer.createTransport({
    host: settings.host,
    port,
    secure: settings.secure !== undefined ? Boolean(settings.secure) : port === 465,
    auth: { user: settings.user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
};

const formatFrom = (settings) => {
  const email = settings.from_email || settings.user;
  return settings.from_name ? `"${String(settings.from_name).replace(/"/g, '')}" <${email}>` : email;
};

/* ------------------------------------------------------------------ */
/* Unsubscribe tokens                                                  */
/* ------------------------------------------------------------------ */

const unsubscribeToken = (ownerId, email) => {
  const payload = Buffer.from(`${ownerId}|${String(email).toLowerCase()}`).toString('base64url');
  const sig = crypto.createHmac('sha256', getKey()).update(payload).digest('base64url').slice(0, 24);
  return `${payload}.${sig}`;
};

const parseUnsubscribeToken = (token) => {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', getKey()).update(payload).digest('base64url').slice(0, 24);
  if (expected !== sig) return null;
  const [ownerId, email] = Buffer.from(payload, 'base64url').toString('utf8').split('|');
  if (!ownerId || !email) return null;
  return { ownerId, email };
};

module.exports = {
  encryptSecret,
  decryptSecret,
  renderTemplate,
  textToHtml,
  wrapHtml,
  escapeHtml,
  welcomeEmail,
  isPlatformMailConfigured,
  sendPlatformMail,
  sendWelcomeEmail,
  createOwnerTransport,
  formatFrom,
  unsubscribeToken,
  parseUnsubscribeToken,
};
