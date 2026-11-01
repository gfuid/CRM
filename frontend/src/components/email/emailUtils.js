/* Helpers shared by the email marketing screens: providers, HTML cleaning, image shrinking, preview, starter templates. */

/**
 * Email providers for the "connect your mailbox" setup.
 * appPasswordUrl opens the exact page where the owner creates the app password.
 */
export const PROVIDERS = [
  {
    id: 'gmail',
    label: 'Gmail',
    domains: ['gmail.com', 'googlemail.com'],
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    appPasswordUrl: 'https://myaccount.google.com/apppasswords',
    appPasswordLabel: 'Open Google App Passwords',
    prerequisite: { label: 'Turn on 2-Step Verification first', url: 'https://myaccount.google.com/signinoptions/twosv' },
    steps: [
      'Click the button below — Google opens the App passwords page (sign in if asked).',
      'Type a name such as “Travel-Trade CRM” and press Create.',
      'Copy the 16-letter password Google shows (spaces do not matter) and paste it here.',
    ],
    note: 'If Google says the page is not available, turn on 2-Step Verification first. Work (Google Workspace) accounts may need their admin to allow it.',
    color: '#ea4335',
  },
  {
    id: 'outlook',
    label: 'Outlook / Hotmail',
    domains: ['outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'outlook.in'],
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    appPasswordUrl: 'https://account.live.com/proofs/AppPassword',
    appPasswordLabel: 'Open Microsoft App Passwords',
    prerequisite: { label: 'Turn on two-step verification first', url: 'https://account.microsoft.com/security' },
    steps: [
      'Click the button below and sign in to your Microsoft account.',
      'Choose “Create a new app password”.',
      'Copy the password and paste it here.',
    ],
    note: 'Microsoft is switching mailboxes away from password sign-in for sending mail. If the test fails, use Gmail, Zoho or your company mailbox instead.',
    color: '#0078d4',
  },
  {
    id: 'yahoo',
    label: 'Yahoo Mail',
    domains: ['yahoo.com', 'yahoo.in', 'yahoo.co.in', 'ymail.com', 'rocketmail.com'],
    host: 'smtp.mail.yahoo.com',
    port: 465,
    secure: true,
    appPasswordUrl: 'https://login.yahoo.com/account/security',
    appPasswordLabel: 'Open Yahoo Account Security',
    steps: [
      'Click the button below and sign in to Yahoo.',
      'Under “External connections”, choose Generate app password and give it a name.',
      'Copy the password and paste it here.',
    ],
    color: '#6001d2',
  },
  {
    id: 'zoho',
    label: 'Zoho Mail (India)',
    domains: ['zohomail.in'],
    host: 'smtp.zoho.in',
    port: 465,
    secure: true,
    appPasswordUrl: 'https://accounts.zoho.in/home#security/app_password',
    appPasswordLabel: 'Open Zoho App Passwords',
    steps: [
      'Click the button below and sign in to Zoho.',
      'Press “Generate New Password”, name it “Travel-Trade CRM”.',
      'Copy the password and paste it here.',
    ],
    note: 'If you sign in at zoho.com (not zoho.in), choose “Zoho Mail (.com)”.',
    color: '#e42527',
  },
  {
    id: 'zoho_com',
    label: 'Zoho Mail (.com)',
    domains: ['zohomail.com', 'zoho.com'],
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    appPasswordUrl: 'https://accounts.zoho.com/home#security/app_password',
    appPasswordLabel: 'Open Zoho App Passwords',
    steps: [
      'Click the button below and sign in to Zoho.',
      'Press “Generate New Password”, name it “Travel-Trade CRM”.',
      'Copy the password and paste it here.',
    ],
    color: '#e42527',
  },
  {
    id: 'hostinger',
    label: 'Hostinger',
    domains: [],
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    appPasswordUrl: 'https://hpanel.hostinger.com/emails',
    appPasswordLabel: 'Open Hostinger Emails',
    steps: ['Use your full mailbox address and its normal mailbox password.', 'Forgot it? Reset it in Hostinger → Emails, then paste it here.'],
    color: '#673de6',
  },
  {
    id: 'godaddy',
    label: 'GoDaddy',
    domains: [],
    host: 'smtpout.secureserver.net',
    port: 465,
    secure: true,
    appPasswordUrl: 'https://productivity.godaddy.com',
    appPasswordLabel: 'Open GoDaddy Email',
    steps: ['Use your full mailbox address and its normal mailbox password.'],
    color: '#1bdbdb',
  },
  {
    id: 'custom',
    label: 'Other / company mail',
    domains: [],
    host: '',
    port: 587,
    secure: false,
    steps: ['Ask your email provider or IT person for the SMTP server name, port and password, and enter them under “Advanced”.'],
    color: '#64748b',
  },
];

export const providerById = (id) => PROVIDERS.find((p) => p.id === id) || PROVIDERS[PROVIDERS.length - 1];

export const detectProvider = (email) => {
  const domain = String(email || '').split('@')[1]?.toLowerCase().trim();
  if (!domain) return null;
  return PROVIDERS.find((p) => p.domains.includes(domain)) || null;
};

/** Turns raw SMTP errors into advice an owner can act on. */
export const explainSmtpError = (message, provider) => {
  const m = String(message || '');
  if (/application-specific password|app password|534-5\.7\.9|InvalidSecondFactor/i.test(m)) {
    return 'This mailbox needs an app password, not your normal password. Create one with the button above and paste it again.';
  }
  if (/535|Invalid login|Username and Password not accepted|authentication failed|AUTH/i.test(m)) {
    return provider && provider.appPasswordUrl && provider.id !== 'hostinger' && provider.id !== 'godaddy'
      ? 'The email or app password is wrong. Create a new app password with the button above and paste it again.'
      : 'The email or password is wrong. Check them and try again.';
  }
  if (/basic authentication is (not supported|disabled)|5\.7\.139|5\.7\.30/i.test(m)) {
    return 'Microsoft has switched off password sign-in for this mailbox. Please use Gmail, Zoho or your company mailbox.';
  }
  if (/wrong version number|ssl3_get_record|tls_validate_record_header|unknown protocol/i.test(m)) {
    return 'The SSL setting does not match the port. Use port 465 with SSL ticked, or port 587 with SSL unticked (under “Advanced”).';
  }
  if (/self[- ]signed|certificate/i.test(m)) {
    return 'The mail server’s security certificate was not accepted. Ask your email provider for the correct SMTP server name.';
  }
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|ECONNECTION|getaddrinfo|timeout/i.test(m)) {
    return 'The mail server could not be reached. Check the server name and port under “Advanced”, or choose your provider again.';
  }
  return m;
};

/* ------------------------------------------------------------------ */
/* HTML cleaning (same rules as the server)                            */
/* ------------------------------------------------------------------ */

const ALLOWED_TAGS = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'A', 'H1', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'IMG', 'TABLE', 'TBODY', 'THEAD', 'TR', 'TD', 'TH', 'DIV', 'SPAN', 'HR', 'BLOCKQUOTE', 'CENTER', 'SMALL', 'SUP', 'SUB', 'FONT']);
const DROP_WITH_CONTENT = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'TITLE', 'FORM', 'SELECT', 'TEXTAREA', 'BUTTON', 'INPUT', 'META', 'LINK', 'BASE']);
const ALLOWED_ATTRS = new Set(['href', 'src', 'alt', 'title', 'style', 'width', 'height', 'align', 'cellpadding', 'cellspacing', 'border', 'role', 'target', 'colspan', 'rowspan', 'bgcolor', 'valign', 'color', 'size', 'face', 'data-btn']);
const SAFE_URL = /^(https?:|mailto:|tel:|#)/i;
const BAD_CSS = /expression\s*\(|javascript:|vbscript:|behavior\s*:|-moz-binding|url\s*\(\s*['"]?\s*(?!https?:)/i;

export const sanitizeHtml = (html) => {
  if (typeof window === 'undefined' || !window.DOMParser) return String(html || '');
  const doc = new window.DOMParser().parseFromString(`<body>${String(html || '')}</body>`, 'text/html');
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 8) { child.remove(); return; } // comment
      if (child.nodeType !== 1) return;
      const tag = child.tagName;
      if (DROP_WITH_CONTENT.has(tag)) { child.remove(); return; }
      if (!ALLOWED_TAGS.has(tag)) {
        walk(child);
        child.replaceWith(...child.childNodes);
        return;
      }
      [...child.attributes].forEach((a) => {
        const name = a.name.toLowerCase();
        const value = a.value.trim();
        if (!ALLOWED_ATTRS.has(name)) child.removeAttribute(a.name);
        else if ((name === 'href' || name === 'src') && value && !SAFE_URL.test(value.replace(/[\u0000-\u001f\s]+/g, ''))) child.removeAttribute(a.name);
        else if (name === 'style' && BAD_CSS.test(value)) child.removeAttribute(a.name);
      });
      if (tag === 'A' && child.getAttribute('href')) {
        child.setAttribute('target', '_blank');
      }
      walk(child);
    });
  };
  walk(doc.body);
  return doc.body.innerHTML.trim();
};

export const htmlIsEmpty = (html) => {
  const s = String(html || '');
  if (/<img\b/i.test(s)) return false;
  return !s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
};

/* ------------------------------------------------------------------ */
/* Pictures                                                            */
/* ------------------------------------------------------------------ */

const MAX_BYTES = 185 * 1024; // server limit is 200 KB

const dataUrlBytes = (dataUrl) => Math.floor(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4);

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result));
  r.onerror = () => reject(new Error('The file could not be read.'));
  r.readAsDataURL(file);
});

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('This file could not be opened as a picture.'));
  img.src = src;
});

/**
 * Prepares a picture for email: max 1200 px wide, compressed to under ~185 KB.
 * Small PNG (logos with transparency) and GIF (animations) are kept as they are.
 */
export const prepareEmailImage = async (file) => {
  if (!file || !/^image\/(png|jpe?g|gif|webp)$/i.test(file.type)) throw new Error('Please choose a JPG, PNG, GIF or WebP picture.');
  if (file.size > 20 * 1024 * 1024) throw new Error('This picture is larger than 20 MB. Please choose a smaller one.');
  const original = await readAsDataUrl(file);
  if (/image\/gif/i.test(file.type)) {
    if (file.size > MAX_BYTES) throw new Error('This GIF is larger than 185 KB. Please use a smaller GIF or a JPG/PNG picture.');
    return { dataUrl: original, width: 0 };
  }
  const img = await loadImage(original);
  const width = Math.min(1200, img.naturalWidth);
  const height = Math.round((img.naturalHeight * width) / img.naturalWidth);
  if (/image\/png/i.test(file.type) && file.size <= MAX_BYTES && img.naturalWidth <= 1200) {
    return { dataUrl: original, width: img.naturalWidth };
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  let scale = 1;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    for (const q of [0.85, 0.75, 0.65, 0.55]) {
      const out = canvas.toDataURL('image/jpeg', q);
      if (dataUrlBytes(out) <= MAX_BYTES) return { dataUrl: out, width: canvas.width };
    }
    scale *= 0.8;
    canvas.width = Math.max(200, Math.round(width * scale));
    canvas.height = Math.max(100, Math.round(height * scale));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
  throw new Error('This picture could not be made small enough. Please try another one.');
};

/* ------------------------------------------------------------------ */
/* Preview (same frame as the real email)                              */
/* ------------------------------------------------------------------ */

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const SAMPLE_VARS = {
  company_name: 'Al Noor Trading LLC',
  contact_name: 'Mr. Khalid',
  country: 'United Arab Emirates',
  product: 'Turmeric Finger',
  email: 'buyer@example.com',
};

export const renderVars = (text, vars) => String(text || '').replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, k) => (vars[k] !== undefined ? esc(vars[k]) : ''));

const textToHtml = (body) => {
  const s = String(body || '');
  if (/<[a-z][\s\S]*>/i.test(s)) return s;
  return s.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px 0;line-height:1.6">${esc(p).replace(/\n/g, '<br/>')}</p>`).join('');
};

export const previewDocument = ({ subject, body, senderName }) => {
  const vars = { ...SAMPLE_VARS, sender_name: senderName || 'Your name' };
  const bodyHtml = textToHtml(renderVars(body, vars));
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><title>${esc(renderVars(subject, vars))}</title>
<style>img{max-width:100%;height:auto} a{color:#047857}</style></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
<tr><td style="padding:28px 32px;font-size:15px">${bodyHtml}</td></tr>
<tr><td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">You are receiving this email from ${esc(senderName || 'your company')}. <a href="#" style="color:#64748b">Unsubscribe</a></td></tr>
</table></td></tr></table></body></html>`;
};

/* ------------------------------------------------------------------ */
/* Building blocks + starter designs                                   */
/* ------------------------------------------------------------------ */

export const buttonHtml = (label, url) =>
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0" data-btn="1"><tr><td style="background:#059669;border-radius:8px" bgcolor="#059669"><a href="${esc(url)}" target="_blank" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px">${esc(label)}</a></td></tr></table><p><br></p>`;

const H = (t) => `<h2 style="margin:0 0 12px 0;font-size:22px;color:#065f46">${t}</h2>`;
const P = (t) => `<p style="margin:0 0 14px 0;line-height:1.6">${t}</p>`;

export const STARTER_TEMPLATES = [
  {
    key: 'offer',
    name: 'Product offer',
    description: 'Introduce a product with 3 key points and a quote button.',
    subject: 'Fresh {{product}} available for {{company_name}}',
    body: `${H('Fresh stock ready to ship')}${P('Dear {{contact_name}},')}${P('We have new-season <b>{{product}}</b> ready for shipment to {{country}}. Here is why buyers choose us:')}<ul style="margin:0 0 14px 0;padding-left:20px;line-height:1.7"><li>Export-grade quality with lab reports for every lot</li><li>Flexible packing: 25 kg / 50 kg bags or custom</li><li>Shipment within 10–15 days of confirmation</li></ul>${P('Reply to this email with your required quantity and destination port, and we will send our best price.')}${buttonHtml('Request a quote', 'mailto:?subject=Quote%20request')}${P('Regards,<br>{{sender_name}}')}`,
  },
  {
    key: 'pricelist',
    name: 'New season price list',
    description: 'Share updated prices; attach a picture of your price sheet.',
    subject: 'Updated price list — {{product}}',
    body: `${H('Our new season price list')}${P('Hello {{contact_name}},')}${P('Prices for <b>{{product}}</b> have been updated for this season. Add a picture of your price sheet or catalogue below with the 🖼 button.')}<p style="margin:0 0 14px 0;line-height:1.6;color:#64748b"><i>[Insert your price-list picture here]</i></p>${P('Prices are valid for 15 days, FOB Indian port. Bulk orders get an additional discount.')}${P('Best regards,<br>{{sender_name}}')}`,
  },
  {
    key: 'followup',
    name: 'Follow-up after enquiry',
    description: 'A short, polite reminder after you sent a quotation.',
    subject: 'Following up on our quotation, {{contact_name}}',
    body: `${P('Dear {{contact_name}},')}${P('I hope you are doing well. I am following up on the quotation we shared for <b>{{product}}</b>.')}${P('Do you have any questions about quality, packing or shipment schedule? I would be happy to arrange a quick call at a time that suits you.')}${P('Looking forward to hearing from you.')}${P('Warm regards,<br>{{sender_name}}')}`,
  },
  {
    key: 'greetings',
    name: 'Season’s greetings',
    description: 'Festival wishes to keep in touch with every buyer.',
    subject: 'Warm wishes from all of us, {{contact_name}}',
    body: `<div style="text-align:center">${H('Season’s Greetings!')}${P('Dear {{contact_name}} and the team at {{company_name}},')}${P('Thank you for your trust and business this year. Wishing you and your family happiness, health and success.')}${P('With warm regards,<br><b>{{sender_name}}</b>')}</div>`,
  },
];

export const PLACEHOLDERS = [
  { key: 'contact_name', label: 'Contact name' },
  { key: 'company_name', label: 'Company' },
  { key: 'country', label: 'Country' },
  { key: 'product', label: 'Product' },
  { key: 'sender_name', label: 'Your name' },
];

/** Value for <input type="datetime-local"> from a Date (local time). */
export const toLocalInput = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const quickTimes = () => {
  const now = new Date();
  const at = (days, h) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(h, 0, 0, 0); return d; };
  const nextMonday = (() => { const d = at(((8 - now.getDay()) % 7) || 7, 10); return d; })();
  const list = [
    { label: 'In 1 hour', date: new Date(now.getTime() + 60 * 60000) },
    { label: 'Tomorrow 10 AM', date: at(1, 10) },
    { label: 'Monday 10 AM', date: nextMonday },
  ];
  if (now.getHours() < 16) list.splice(1, 0, { label: 'Today 5 PM', date: at(0, 17) });
  // Sunday: "Tomorrow 10 AM" and "Monday 10 AM" are the same moment
  const seen = new Set();
  return list.filter((q) => { const k = q.date.getTime(); if (seen.has(k)) return false; seen.add(k); return true; });
};

export const timeZoneLabel = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; }
};
