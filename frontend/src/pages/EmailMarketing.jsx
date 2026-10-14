import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Mail,
  Crown,
  Send,
  Settings,
  Tag,
  Users,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lock,
  Sparkles,
  FileText,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const PROVIDERS = [
  { id: 'gmail', label: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: 587, secure: false, hint: 'Use a 16-character App Password (Google Account → Security → App passwords). Your normal password will not work.' },
  { id: 'zoho', label: 'Zoho Mail', host: 'smtp.zoho.in', port: 465, secure: true, hint: 'Enable IMAP/SMTP access in Zoho Mail settings. Use an app-specific password if 2FA is on.' },
  { id: 'outlook', label: 'Outlook / Microsoft 365', host: 'smtp.office365.com', port: 587, secure: false, hint: 'SMTP AUTH must be enabled for the mailbox in the Microsoft 365 admin center.' },
  { id: 'hostinger', label: 'Hostinger', host: 'smtp.hostinger.com', port: 465, secure: true, hint: 'Use the full mailbox address as username.' },
  { id: 'godaddy', label: 'GoDaddy Workspace', host: 'smtpout.secureserver.net', port: 465, secure: true, hint: 'Use the full mailbox address as username.' },
  { id: 'maileroo', label: 'Maileroo (free 3,000/mo)', host: 'smtp.maileroo.com', port: 587, secure: false, hint: 'Create SMTP credentials in the Maileroo dashboard and verify your sending domain (SPF/DKIM).' },
  { id: 'custom', label: 'Other / Custom SMTP', host: '', port: 587, secure: false, hint: 'Ask your email provider for SMTP host, port and credentials.' },
];

const PLACEHOLDERS = [
  { key: 'company_name', label: 'Company' },
  { key: 'contact_name', label: 'Contact name' },
  { key: 'country', label: 'Country' },
  { key: 'product', label: 'Product' },
  { key: 'sender_name', label: 'Your name' },
];

const EMAIL_RE = /[^\s@,;<>"']+@[^\s@,;<>"']+\.[^\s@,;<>"']+/g;

const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const statusStyle = (s) =>
  s === 'sent'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    : s === 'sending'
    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
    : s === 'failed'
    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

const inputCls =
  'w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none';
const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1';
const cardCls = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 sm:p-6';
const primaryBtn =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const secondaryBtn =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

function Notice({ type = 'info', children }) {
  const cls =
    type === 'error'
      ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
      : type === 'success'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
      : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200';
  const Icon = type === 'error' ? AlertCircle : type === 'success' ? CheckCircle2 : Sparkles;
  return (
    <div className={`flex items-start gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-medium ${cls}`}>
      <Icon size={14} className="shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sender settings                                                     */
/* ------------------------------------------------------------------ */

function SenderSettings({ profile, onSaved }) {
  const [form, setForm] = useState({ host: '', port: 587, secure: false, user: '', pass: '', from_name: '', from_email: '', reply_to: '', rate_per_minute: 20 });
  const [provider, setProvider] = useState('gmail');
  const [hasPassword, setHasPassword] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState(null);
  const [testTo, setTestTo] = useState(profile?.email || '');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api
      .getEmailSettings()
      .then((res) => {
        const s = res?.data;
        if (!s) return;
        setForm((f) => ({ ...f, host: s.host, port: s.port, secure: s.secure, user: s.user, from_name: s.from_name, from_email: s.from_email, reply_to: s.reply_to, rate_per_minute: s.rate_per_minute }));
        setHasPassword(Boolean(s.has_password));
        setVerifiedAt(s.verified_at);
        const match = PROVIDERS.find((p) => p.host && p.host === s.host);
        setProvider(match ? match.id : 'custom');
      })
      .catch(() => {});
  }, []);

  const pickProvider = (id) => {
    setProvider(id);
    const p = PROVIDERS.find((x) => x.id === id);
    if (p && p.host) setForm((f) => ({ ...f, host: p.host, port: p.port, secure: p.secure }));
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy('save');
    setMsg(null);
    try {
      const res = await api.saveEmailSettings(form);
      setHasPassword(Boolean(res?.data?.has_password));
      setVerifiedAt(res?.data?.verified_at || null);
      setForm((f) => ({ ...f, pass: '' }));
      setMsg({ type: 'success', text: 'Sender settings saved. Now send a test email to confirm it works.' });
      if (onSaved) onSaved();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  };

  const test = async () => {
    setBusy('test');
    setMsg(null);
    try {
      const res = await api.testEmailSettings({ to: testTo });
      setVerifiedAt(res?.data?.verified_at || new Date().toISOString());
      setMsg({ type: 'success', text: res?.message || 'Test email sent.' });
      if (onSaved) onSaved();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  };

  const hint = PROVIDERS.find((p) => p.id === provider)?.hint;

  return (
    <form onSubmit={save} className="space-y-5">
      <div className={cardCls}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings size={16} className="text-emerald-600" /> Sender (SMTP) settings
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Campaign emails are sent from <strong>your own</strong> mailbox, so replies come straight to you and your domain reputation stays yours.
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              verifiedAt ? statusStyle('sent') : hasPassword ? statusStyle('sending') : statusStyle('draft')
            }`}
          >
            {verifiedAt ? `Verified ${fmtDate(verifiedAt)}` : hasPassword ? 'Saved, not tested' : 'Not configured'}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Email provider</label>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => pickProvider(p.id)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                    provider === p.id
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {hint && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">{hint}</p>}
          </div>

          <div>
            <label className={labelCls}>SMTP host *</label>
            <input className={inputCls} value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="smtp.gmail.com" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Port *</label>
              <input className={inputCls} type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} required />
            </div>
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.secure} onChange={(e) => setForm({ ...form, secure: e.target.checked })} className="rounded" />
                SSL (port 465)
              </label>
            </div>
          </div>

          <div>
            <label className={labelCls}>Username (your email) *</label>
            <input className={inputCls} value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} placeholder="you@yourcompany.com" required autoComplete="off" />
          </div>
          <div>
            <label className={labelCls}>Password / App password {hasPassword ? '' : '*'}</label>
            <input
              className={inputCls}
              type="password"
              value={form.pass}
              onChange={(e) => setForm({ ...form, pass: e.target.value })}
              placeholder={hasPassword ? '•••••••• (saved, leave blank to keep)' : 'App password'}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className={labelCls}>From name</label>
            <input className={inputCls} value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} placeholder="Rahul from Travel-Trade" />
          </div>
          <div>
            <label className={labelCls}>From email</label>
            <input className={inputCls} type="email" value={form.from_email} onChange={(e) => setForm({ ...form, from_email: e.target.value })} placeholder="Defaults to username" />
          </div>
          <div>
            <label className={labelCls}>Reply-to (optional)</label>
            <input className={inputCls} type="email" value={form.reply_to} onChange={(e) => setForm({ ...form, reply_to: e.target.value })} placeholder="sales@yourcompany.com" />
          </div>
          <div>
            <label className={labelCls}>Sending speed (emails per minute)</label>
            <input className={inputCls} type="number" min={1} max={120} value={form.rate_per_minute} onChange={(e) => setForm({ ...form, rate_per_minute: Number(e.target.value) })} />
            <p className="text-[10px] text-slate-400 mt-1">Keep it low (10–20) for Gmail and free SMTP plans to avoid daily limits.</p>
          </div>
        </div>

        {msg && (
          <div className="mt-4">
            <Notice type={msg.type}>{msg.text}</Notice>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="submit" className={primaryBtn} disabled={busy !== ''}>
            {busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Save settings
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <input className={`${inputCls} w-56`} type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Send test to" />
            <button type="button" onClick={test} className={secondaryBtn} disabled={busy !== '' || !hasPassword}>
              {busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send test
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Campaign composer                                                   */
/* ------------------------------------------------------------------ */

function Composer({ profile, configured, onCreated }) {
  const [form, setForm] = useState({ name: '', subject: '', body: '' });
  const [mode, setMode] = useState('tags');
  const [tags, setTags] = useState([]);
  const [selected, setSelected] = useState([]);
  const [customText, setCustomText] = useState('');
  const [preview, setPreview] = useState({ count: 0, sample: [] });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const bodyRef = useRef(null);

  const loadTags = useCallback(() => {
    api.getEmailTags().then((res) => setTags(Array.isArray(res?.data) ? res.data : [])).catch(() => {});
  }, []);
  useEffect(loadTags, [loadTags]);

  const customEmails = useMemo(() => Array.from(new Set((customText.match(EMAIL_RE) || []).map((e) => e.toLowerCase()))), [customText]);

  useEffect(() => {
    const params = { mode };
    if (mode === 'tags') params.tags = selected.join(',');
    if (mode === 'custom') params.emails = customEmails.slice(0, 2000).join(',');
    if (mode === 'tags' && selected.length === 0) {
      setPreview({ count: 0, sample: [] });
      return;
    }
    const t = setTimeout(() => {
      api.previewEmailAudience(params).then((res) => setPreview(res?.data || { count: 0, sample: [] })).catch(() => setPreview({ count: 0, sample: [] }));
    }, 250);
    return () => clearTimeout(t);
  }, [mode, selected, customEmails]);

  const insertPlaceholder = (key) => {
    const token = `{{${key}}}`;
    const el = bodyRef.current;
    if (!el) return setForm((f) => ({ ...f, body: f.body + token }));
    const start = el.selectionStart ?? form.body.length;
    const end = el.selectionEnd ?? form.body.length;
    const next = form.body.slice(0, start) + token + form.body.slice(end);
    setForm((f) => ({ ...f, body: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const onCsv = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCustomText((t) => `${t}\n${String(reader.result || '')}`);
    reader.readAsText(file);
  };

  const audience = () => (mode === 'custom' ? { mode, emails: customEmails } : mode === 'tags' ? { mode, tags: selected } : { mode: 'all' });

  const submit = async (send) => {
    if (!form.subject.trim() || !form.body.trim()) return setMsg({ type: 'error', text: 'Subject and email body are required.' });
    if (preview.count === 0) return setMsg({ type: 'error', text: 'No recipients. Pick tags that have leads with email addresses, or paste emails.' });
    if (send && !configured) return setMsg({ type: 'error', text: 'Configure and test your sender settings before sending.' });
    if (send && !window.confirm(`Send "${form.subject}" to ${preview.count} recipient${preview.count === 1 ? '' : 's'} now?`)) return;
    setBusy(send ? 'send' : 'draft');
    setMsg(null);
    try {
      const res = await api.createEmailCampaign({ ...form, audience: audience(), send });
      setMsg({ type: 'success', text: res?.message || (send ? 'Campaign is sending.' : 'Draft saved.') });
      setForm({ name: '', subject: '', body: '' });
      setSelected([]);
      setCustomText('');
      if (onCreated) onCreated();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  };

  const sendTest = async () => {
    if (!form.subject.trim() || !form.body.trim()) return setMsg({ type: 'error', text: 'Write a subject and body first.' });
    setBusy('test');
    setMsg(null);
    try {
      const res = await api.sendEmailCampaignTest({ subject: form.subject, body: form.body, to: profile?.email });
      setMsg({ type: 'success', text: res?.message || 'Test sent.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  };

  const toggleTag = (t) => setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Message */}
      <div className={`${cardCls} lg:col-span-3 space-y-4`}>
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText size={16} className="text-emerald-600" /> Message
        </h3>
        <div>
          <label className={labelCls}>Campaign name (internal)</label>
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="October turmeric offer" />
        </div>
        <div>
          <label className={labelCls}>Subject *</label>
          <input className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="New season turmeric pricing for {{company_name}}" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
            <label className={`${labelCls} mb-0`}>Email body *</label>
            <div className="flex flex-wrap gap-1">
              {PLACEHOLDERS.map((p) => (
                <button type="button" key={p.key} onClick={() => insertPlaceholder(p.key)} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 cursor-pointer" title={`Insert {{${p.key}}}`}>
                  + {p.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            ref={bodyRef}
            className={`${inputCls} min-h-[220px] font-mono`}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder={'Hi {{contact_name}},\n\nWe have fresh stock of {{product}} ready for shipment to {{country}}...\n\nRegards,\n{{sender_name}}'}
          />
          <p className="text-[10px] text-slate-400 mt-1">Plain text with blank lines between paragraphs works best. Basic HTML is also allowed. An unsubscribe link is added automatically.</p>
        </div>
      </div>

      {/* Audience */}
      <div className={`${cardCls} lg:col-span-2 space-y-4`}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Users size={16} className="text-emerald-600" /> Audience
          </h3>
          <button type="button" onClick={loadTags} className="text-slate-400 hover:text-emerald-600 cursor-pointer" title="Refresh tags">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-bold">
          {[
            { id: 'tags', label: 'By tags' },
            { id: 'all', label: 'All leads' },
            { id: 'custom', label: 'Paste / CSV' },
          ].map((m) => (
            <button type="button" key={m.id} onClick={() => setMode(m.id)} className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${mode === m.id ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs' : 'text-slate-500'}`}>
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'tags' && (
          <div>
            {tags.length === 0 ? (
              <Notice>
                No tags yet. Open a lead, add tags like <strong>turmeric-buyer</strong> or <strong>dubai</strong>, and they will appear here.
              </Notice>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => {
                  const on = selected.includes(t.tag);
                  return (
                    <button
                      type="button"
                      key={t.tag}
                      onClick={() => toggleTag(t.tag)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                        on ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                      }`}
                    >
                      <Tag size={10} /> {t.tag}
                      <span className={`px-1 rounded ${on ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>{t.with_email}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {mode === 'all' && <Notice>Every lead that has an email address and has not unsubscribed.</Notice>}

        {mode === 'custom' && (
          <div className="space-y-2">
            <textarea className={`${inputCls} min-h-[120px]`} value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder="Paste emails separated by commas, spaces or new lines. Or upload a CSV." />
            <label className={`${secondaryBtn} cursor-pointer`}>
              <Upload size={14} /> Upload CSV
              <input type="file" accept=".csv,.txt" className="hidden" onChange={(e) => onCsv(e.target.files?.[0])} />
            </label>
            <p className="text-[10px] text-slate-400">{customEmails.length} valid email{customEmails.length === 1 ? '' : 's'} detected.</p>
          </div>
        )}

        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Recipients</span>
            <span className="text-xl font-black text-emerald-600">{preview.count}</span>
          </div>
          {preview.sample?.length > 0 && (
            <div className="mt-1.5 text-[10px] text-slate-400 truncate">
              {preview.sample.map((s) => s.email).join(', ')}
              {preview.count > preview.sample.length ? ' …' : ''}
            </div>
          )}
        </div>

        {msg && <Notice type={msg.type}>{msg.text}</Notice>}

        <div className="flex flex-col gap-2 pt-1">
          <button type="button" onClick={() => submit(true)} className={`${primaryBtn} justify-center`} disabled={busy !== '' || preview.count === 0}>
            {busy === 'send' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send to {preview.count} now
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => submit(false)} className={`${secondaryBtn} justify-center`} disabled={busy !== ''}>
              {busy === 'draft' ? <Loader2 size={14} className="animate-spin" /> : null} Save draft
            </button>
            <button type="button" onClick={sendTest} className={`${secondaryBtn} justify-center`} disabled={busy !== '' || !configured} title={configured ? `Sends to ${profile?.email}` : 'Configure sender first'}>
              {busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Test to me
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Campaign list                                                       */
/* ------------------------------------------------------------------ */

function CampaignList({ campaigns, onRefresh, configured }) {
  const [open, setOpen] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);

  const loadDetail = async (id) => {
    if (open === id) return setOpen(null);
    setOpen(id);
    setDetail(null);
    try {
      const res = await api.getEmailCampaign(id);
      setDetail(res?.data || null);
    } catch {}
  };

  useEffect(() => {
    if (!open) return;
    const c = campaigns.find((x) => x.id === open);
    if (c && c.status === 'sending') {
      api.getEmailCampaign(open).then((res) => setDetail(res?.data || null)).catch(() => {});
    }
  }, [campaigns, open]);

  const act = async (fn, id) => {
    setBusy(id);
    setMsg(null);
    try {
      const res = await fn();
      setMsg({ type: 'success', text: res?.message || 'Done' });
      onRefresh();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  };

  if (campaigns.length === 0) {
    return (
      <div className={`${cardCls} text-center py-12`}>
        <Mail size={32} className="mx-auto text-slate-300" />
        <div className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No campaigns yet</div>
        <div className="text-xs text-slate-400 mt-1">Create your first campaign from the “New Campaign” tab.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      {campaigns.map((c) => {
        const done = c.sent + c.failed;
        const pct = c.total ? Math.round((done / c.total) * 100) : 0;
        return (
          <div key={c.id} className={`${cardCls} p-4 sm:p-5`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{c.name || c.subject}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${statusStyle(c.status)}`}>{c.status}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">Subject: {c.subject}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {c.audience?.mode === 'tags' ? `Tags: ${(c.audience.tags || []).join(', ')}` : c.audience?.mode === 'custom' ? 'Custom list' : 'All leads'} · Created {fmtDate(c.created_at)}
                  {c.finished_at ? ` · Finished ${fmtDate(c.finished_at)}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {c.status === 'draft' && (
                  <button className={primaryBtn} disabled={busy === c.id || !configured} onClick={() => act(() => api.sendEmailCampaign(c.id), c.id)} title={configured ? '' : 'Configure sender first'}>
                    <Send size={13} /> Send
                  </button>
                )}
                {(c.status === 'sent' || c.status === 'failed') && c.failed > 0 && (
                  <button className={secondaryBtn} disabled={busy === c.id} onClick={() => act(() => api.sendEmailCampaign(c.id, { retry_failed: true }), c.id)}>
                    <RefreshCw size={13} /> Retry {c.failed}
                  </button>
                )}
                <button className={secondaryBtn} onClick={() => loadDetail(c.id)}>
                  {open === c.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Recipients
                </button>
                {c.status !== 'sending' && (
                  <button
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    title="Delete"
                    disabled={busy === c.id}
                    onClick={() => window.confirm('Delete this campaign and its log?') && act(() => api.deleteEmailCampaign(c.id), c.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <span>
                  <span className="text-emerald-600">{c.sent} sent</span>
                  {c.failed > 0 && <span className="text-rose-500"> · {c.failed} failed</span>}
                  <span> · {c.total} total</span>
                </span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 mt-1 overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${c.total ? (c.sent / c.total) * 100 : 0}%` }} />
                <div className="h-full bg-rose-400 transition-all" style={{ width: `${c.total ? (c.failed / c.total) * 100 : 0}%` }} />
              </div>
              {c.error && <div className="text-[11px] text-rose-600 mt-1">{c.error}</div>}
            </div>

            {open === c.id && (
              <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                {!detail ? (
                  <div className="text-xs text-slate-400 flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Loading…</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-[11px]">
                      <thead className="text-slate-400 text-left">
                        <tr><th className="py-1 pr-2">Email</th><th className="py-1 pr-2">Company</th><th className="py-1 pr-2">Status</th><th className="py-1">Note</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(detail.recipients || []).map((r) => (
                          <tr key={r.email}>
                            <td className="py-1 pr-2 font-semibold text-slate-700 dark:text-slate-200">{r.email}</td>
                            <td className="py-1 pr-2 text-slate-500">{r.company || '—'}</td>
                            <td className="py-1 pr-2"><span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${statusStyle(r.status === 'pending' ? 'draft' : r.status)}`}>{r.status}</span></td>
                            <td className="py-1 text-rose-500 truncate max-w-[220px]">{r.error || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function EmailMarketing({ onNavigateToLeads }) {
  const { profile } = useAuth();
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [tab, setTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState([]);

  const loadStatus = useCallback(() => {
    api
      .getEmailStatus()
      .then((res) => setStatus(res?.data || { enabled: false, is_owner: false }))
      .catch((err) => {
        setStatusError(err.message);
        setStatus({ enabled: false, is_owner: false });
      });
  }, []);

  const loadCampaigns = useCallback(() => {
    api.getEmailCampaigns().then((res) => setCampaigns(Array.isArray(res?.data) ? res.data : [])).catch(() => {});
  }, []);

  useEffect(loadStatus, [loadStatus]);
  useEffect(() => {
    if (status?.enabled) loadCampaigns();
  }, [status?.enabled, loadCampaigns]);

  const anySending = campaigns.some((c) => c.status === 'sending');
  useEffect(() => {
    if (!anySending) return;
    const t = setInterval(loadCampaigns, 4000);
    return () => clearInterval(t);
  }, [anySending, loadCampaigns]);

  const tabs = [
    { id: 'campaigns', label: 'Campaigns', icon: Mail, count: campaigns.length },
    { id: 'new', label: 'New Campaign', icon: Send },
    { id: 'settings', label: 'Sender Settings', icon: Settings },
  ];

  return (
    <div className="w-full space-y-5 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Email Marketing</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
              <Crown size={12} /> Premium
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Tag your leads, pick an audience, and send campaigns from your own email address.
          </p>
        </div>
        {status?.enabled && (
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2.5 py-1 rounded-full font-bold border ${status.configured ? statusStyle('sent') : statusStyle('draft')}`}>
              {status.configured ? `Sender: ${status.from_email}` : 'Sender not configured'}
            </span>
            <button className={secondaryBtn} onClick={onNavigateToLeads}>
              <Tag size={13} /> Tag leads
            </button>
          </div>
        )}
      </div>

      {!status ? (
        <div className={`${cardCls} text-xs text-slate-400 flex items-center gap-2`}><Loader2 size={14} className="animate-spin" /> Checking feature access…</div>
      ) : !status.enabled ? (
        <div className={`${cardCls} text-center py-12`}>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600">
            <Lock size={24} />
          </div>
          <h2 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">Email Marketing is a premium feature</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
            {status.is_owner
              ? 'Ask the platform admin to enable Email Marketing for your company. Once enabled, you can send campaigns to tagged leads from your own mailbox.'
              : 'Only the company owner can use Email Marketing.'}
          </p>
          {statusError && <p className="text-[11px] text-rose-500 mt-3">{statusError}</p>}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
            {[
              ['Tag leads', 'Add tags such as “dubai” or “turmeric-buyer” while creating or editing a lead.'],
              ['Pick audience', 'Send to one or more tags, all leads, or a pasted / CSV list of emails.'],
              ['Your own sender', 'Mails go out from your Gmail, Zoho or company SMTP with an unsubscribe link.'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/60">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{t}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{d}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 w-fit max-w-full overflow-x-auto">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    tab === t.id ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon size={14} />
                  <span>{t.label}</span>
                  {t.count !== undefined && <span className="px-1.5 rounded-md bg-slate-200/80 dark:bg-slate-600 text-[10px]">{t.count}</span>}
                </button>
              );
            })}
          </div>

          {!status.configured && tab !== 'settings' && (
            <Notice>
              Set up your sender first.{' '}
              <button className="underline font-bold cursor-pointer" onClick={() => setTab('settings')}>Open sender settings</button>
            </Notice>
          )}

          {tab === 'campaigns' && <CampaignList campaigns={campaigns} onRefresh={loadCampaigns} configured={status.configured} />}
          {tab === 'new' && (
            <Composer
              profile={profile}
              configured={status.configured}
              onCreated={() => {
                loadCampaigns();
                setTab('campaigns');
              }}
            />
          )}
          {tab === 'settings' && <SenderSettings profile={profile} onSaved={loadStatus} />}
        </>
      )}
    </div>
  );
}
