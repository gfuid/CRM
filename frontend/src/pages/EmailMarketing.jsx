import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Mail, Crown, Send, Settings, Tag, Users, Upload, CheckCircle2, AlertCircle, Loader2, Trash2, RefreshCw,
  ChevronDown, ChevronUp, Lock, Sparkles, FileText, ExternalLink, Eye, EyeOff, CalendarClock, Clock, LayoutTemplate,
  Copy, Pencil, Save, X, Monitor, Smartphone, ShieldCheck, Plus, Play, Ban,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import RichEmailEditor from '../components/email/RichEmailEditor';
import {
  PROVIDERS, providerById, detectProvider, explainSmtpError, sanitizeHtml, htmlIsEmpty, previewDocument,
  STARTER_TEMPLATES, toLocalInput, quickTimes, timeZoneLabel,
} from '../components/email/emailUtils';

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
    : s === 'scheduled'
    ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800'
    : s === 'failed'
    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
    : s === 'paused'
    ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

const inputCls =
  'w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none';
const labelCls = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1';
const cardCls = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card p-5 sm:p-6';
const primaryBtn =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const scheduleBtn =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const secondaryBtn =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

function Notice({ type = 'info', children }) {
  const cls =
    type === 'error'
      ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
      : type === 'success'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
      : type === 'warn'
      ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
      : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-200';
  const Icon = type === 'error' ? AlertCircle : type === 'success' ? CheckCircle2 : Sparkles;
  return (
    <div className={`flex items-start gap-2 px-3.5 py-2.5 rounded-lg border text-xs font-medium ${cls}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={14} className="shrink-0 mt-0.5" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sender setup: provider → app password → save & test                */
/* ------------------------------------------------------------------ */

function StepBadge({ n, done }) {
  return (
    <span className={`w-6 h-6 shrink-0 rounded-full text-[11px] font-bold flex items-center justify-center ${done ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'}`}>
      {done ? <CheckCircle2 size={13} /> : n}
    </span>
  );
}

function SenderSettings({ profile, onSaved }) {
  const [form, setForm] = useState({ host: '', port: 587, secure: false, user: '', pass: '', from_name: profile?.name || '', from_email: '', reply_to: '', rate_per_minute: 20 });
  const [provider, setProvider] = useState('gmail');
  const [hasPassword, setHasPassword] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState(null);
  const [testTo, setTestTo] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .getEmailSettings()
      .then((res) => {
        const s = res?.data;
        if (!s) return;
        setForm((f) => ({ ...f, host: s.host, port: s.port, secure: s.secure, user: s.user, from_name: s.from_name || f.from_name, from_email: s.from_email, reply_to: s.reply_to, rate_per_minute: s.rate_per_minute }));
        setHasPassword(Boolean(s.has_password));
        setVerifiedAt(s.verified_at);
        const match = PROVIDERS.find((p) => p.id === s.provider) || PROVIDERS.find((p) => p.host && p.host === s.host);
        setProvider(match ? match.id : 'custom');
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const p = providerById(provider);

  const pickProvider = (id) => {
    setProvider(id);
    const x = providerById(id);
    if (x.host) setForm((f) => ({ ...f, host: x.host, port: x.port, secure: x.secure }));
    else setForm((f) => ({ ...f, host: PROVIDERS.some((q) => q.host && q.host === f.host) ? '' : f.host, port: 587, secure: false }));
    if (id === 'custom') setAdvanced(true);
    setMsg(null);
  };

  const onEmail = (value) => {
    setForm((f) => ({ ...f, user: value }));
    const d = detectProvider(value);
    if (d && d.id !== provider) pickProvider(d.id);
  };

  const saveAndTest = async (e) => {
    e.preventDefault();
    if (!form.user.trim()) return setMsg({ type: 'error', text: 'Enter your email address first.' });
    if (!form.host.trim()) return setMsg({ type: 'error', text: 'Choose your email provider, or fill in the server under “Advanced”.' });
    if (!hasPassword && !form.pass.trim()) return setMsg({ type: 'error', text: 'Paste the app password first.' });
    setBusy('save');
    setMsg(null);
    try {
      const res = await api.saveEmailSettings({ ...form, provider });
      setHasPassword(Boolean(res?.data?.has_password));
      setVerifiedAt(res?.data?.verified_at || null);
      setForm((f) => ({ ...f, pass: '' }));
      if (onSaved) onSaved();
    } catch (err) {
      setBusy('');
      return setMsg({ type: 'error', text: err.message });
    }
    setBusy('test');
    try {
      const to = testTo.trim() || form.user.trim();
      const res = await api.testEmailSettings({ to });
      setVerifiedAt(res?.data?.verified_at || new Date().toISOString());
      setMsg({ type: 'success', text: `Connected! A test email was sent to ${to}. Check your inbox (and Spam folder once).` });
      if (onSaved) onSaved();
    } catch (err) {
      setMsg({ type: 'error', text: explainSmtpError(err.message, p) });
    } finally {
      setBusy('');
    }
  };

  const status = verifiedAt ? { cls: statusStyle('sent'), text: `Connected · tested ${fmtDate(verifiedAt)}` } : hasPassword ? { cls: statusStyle('paused'), text: 'Saved, not tested yet' } : { cls: statusStyle('draft'), text: 'Not connected' };

  return (
    <form onSubmit={saveAndTest} className="space-y-4 max-w-3xl" data-sender-setup>
      <div className={cardCls}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Mail size={16} className="text-emerald-600" /> Connect your email
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              Campaigns go out from <b>your own</b> mailbox, so buyers reply straight to you. It takes about 2 minutes, once.
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${status.cls}`}>{status.text}</span>
        </div>

        {!loaded ? (
          <div className="mt-5 text-xs text-slate-400 flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Loading…</div>
        ) : (
          <ol className="mt-6 space-y-6">
            {/* Step 1 */}
            <li className="flex gap-3">
              <StepBadge n={1} done={Boolean(form.user)} />
              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Your email address</div>
                <input className={`${inputCls} max-w-md`} type="email" value={form.user} onChange={(e) => onEmail(e.target.value)} placeholder="you@gmail.com or sales@yourcompany.com" autoComplete="off" aria-label="Your email address" />
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Email provider">
                  {PROVIDERS.map((x) => (
                    <button
                      type="button"
                      key={x.id}
                      role="radio"
                      aria-checked={provider === x.id}
                      onClick={() => pickProvider(x.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                        provider === x.id
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: x.color }} /> {x.label}
                    </button>
                  ))}
                </div>
              </div>
            </li>

            {/* Step 2 */}
            <li className="flex gap-3">
              <StepBadge n={2} done={hasPassword} />
              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {p.appPasswordUrl && !['hostinger', 'godaddy'].includes(p.id) ? `Create an app password in ${p.label}` : 'Your mailbox password'}
                </div>
                <ol className="list-decimal pl-4 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {p.steps.map((s) => <li key={s}>{s}</li>)}
                </ol>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {p.appPasswordUrl && (
                    <a href={p.appPasswordUrl} target="_blank" rel="noopener noreferrer" className={primaryBtn} data-app-password-link>
                      <ExternalLink size={14} /> {p.appPasswordLabel}
                    </a>
                  )}
                  {p.prerequisite && (
                    <a href={p.prerequisite.url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline underline-offset-2">
                      {p.prerequisite.label}
                    </a>
                  )}
                </div>
                {p.note && <p className="text-[11px] text-slate-500 dark:text-slate-400">{p.note}</p>}
              </div>
            </li>

            {/* Step 3 */}
            <li className="flex gap-3">
              <StepBadge n={3} done={Boolean(verifiedAt)} />
              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Paste it here and test</div>
                <div className="relative max-w-md">
                  <input
                    className={`${inputCls} font-mono pr-10`}
                    type={showPass ? 'text' : 'password'}
                    value={form.pass}
                    onChange={(e) => setForm({ ...form, pass: e.target.value })}
                    placeholder={hasPassword ? '•••• saved — paste a new one to replace' : 'Paste the app password'}
                    autoComplete="new-password"
                    aria-label="App password"
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label={showPass ? 'Hide password' : 'Show password'}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1"><ShieldCheck size={12} /> Stored encrypted. It is never shown again and is used only to send your campaigns.</p>
                <button type="submit" className={primaryBtn} disabled={busy !== ''}>
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {busy === 'save' ? 'Saving…' : busy === 'test' ? 'Sending test email…' : 'Save & send test email'}
                </button>
                {msg && <Notice type={msg.type}>{msg.text}</Notice>}
              </div>
            </li>
          </ol>
        )}
      </div>

      <div className={`${cardCls} p-0 sm:p-0`}>
        <button type="button" onClick={() => setAdvanced((v) => !v)} className="w-full flex items-center justify-between px-5 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer" aria-expanded={advanced}>
          <span className="flex items-center gap-2"><Settings size={14} className="text-slate-400" /> Advanced: sender name, reply-to, speed, SMTP server</span>
          {advanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {advanced && (
          <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div>
              <label className={labelCls}>From name (buyers see this)</label>
              <input className={inputCls} value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} placeholder="Ravi from Nova Agro Exports" />
            </div>
            <div>
              <label className={labelCls}>Reply-to (optional)</label>
              <input className={inputCls} type="email" value={form.reply_to} onChange={(e) => setForm({ ...form, reply_to: e.target.value })} placeholder="sales@yourcompany.com" />
            </div>
            <div>
              <label className={labelCls}>From email (optional)</label>
              <input className={inputCls} type="email" value={form.from_email} onChange={(e) => setForm({ ...form, from_email: e.target.value })} placeholder="Same as your email" />
            </div>
            <div>
              <label className={labelCls}>Emails per minute</label>
              <input className={inputCls} type="number" min={1} max={120} value={form.rate_per_minute} onChange={(e) => setForm({ ...form, rate_per_minute: Number(e.target.value) })} />
              <p className="text-[10px] text-slate-400 mt-1">Keep 10–20 for Gmail (Gmail allows about 500 emails a day).</p>
            </div>
            <div>
              <label className={labelCls}>SMTP server</label>
              <input className={inputCls} value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="smtp.yourcompany.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Port</label>
                <input className={inputCls} type="number" value={form.port} onChange={(e) => { const port = Number(e.target.value); setForm({ ...form, port, secure: port === 465 }); }} aria-label="SMTP port" />
              </div>
              <label className="flex items-end gap-2 pb-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.secure} onChange={(e) => setForm({ ...form, secure: e.target.checked })} className="rounded" /> SSL (465)
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Send the test email to</label>
              <input className={`${inputCls} max-w-md`} type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder={form.user || 'Your own email'} />
            </div>
          </div>
        )}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Preview                                                             */
/* ------------------------------------------------------------------ */

function PreviewModal({ subject, body, senderName, onClose }) {
  const [device, setDevice] = useState('desktop');
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="Email preview" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-float w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500">Preview with sample buyer details</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{subject ? subject.replace(/{{\s*company_name\s*}}/g, 'Al Noor Trading LLC').replace(/{{\s*contact_name\s*}}/g, 'Mr. Khalid').replace(/{{\s*product\s*}}/g, 'Turmeric Finger') : '(no subject)'}</div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setDevice('desktop')} className={`p-2 rounded-md cursor-pointer ${device === 'desktop' ? 'bg-slate-100 dark:bg-slate-800' : ''}`} aria-label="Desktop preview"><Monitor size={15} /></button>
            <button type="button" onClick={() => setDevice('mobile')} className={`p-2 rounded-md cursor-pointer ${device === 'mobile' ? 'bg-slate-100 dark:bg-slate-800' : ''}`} aria-label="Phone preview"><Smartphone size={15} /></button>
            <button type="button" onClick={onClose} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Close preview"><X size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 p-3 flex justify-center">
          <iframe title="Email preview" sandbox="allow-popups" srcDoc={previewDocument({ subject, body, senderName })} className="bg-white rounded-lg border border-slate-200 transition-all" style={{ width: device === 'mobile' ? 380 : '100%', height: '70vh' }} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Template picker + save                                              */
/* ------------------------------------------------------------------ */

function TemplateStrip({ templates, onPick }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1" data-template-strip>
      <span className="text-[11px] font-semibold text-slate-500 shrink-0">Start from:</span>
      {templates.map((t) => (
        <button key={`my-${t.id}`} type="button" onClick={() => onPick({ ...t, template_id: t.id })} className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 cursor-pointer hover:border-emerald-400">
          <LayoutTemplate size={11} /> {t.name}
        </button>
      ))}
      {STARTER_TEMPLATES.map((t) => (
        <button key={t.key} type="button" onClick={() => onPick(t)} className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer hover:border-slate-400" title={t.description}>
          {t.name}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Campaign composer                                                   */
/* ------------------------------------------------------------------ */

function Composer({ profile, configured, senderName, seed, templates, onTemplatesChanged, onCreated }) {
  const [form, setForm] = useState({ name: seed?.campaignName || '', subject: seed?.subject || '', body: seed?.body || '', template_id: seed?.template_id || null });
  const [mode, setMode] = useState('tags');
  const [tags, setTags] = useState([]);
  const [selected, setSelected] = useState([]);
  const [customText, setCustomText] = useState('');
  const [preview, setPreview] = useState({ count: 0, sample: [] });
  const [when, setWhen] = useState('now');
  const [at, setAt] = useState(() => toLocalInput(quickTimes()[1].date));
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

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
      return undefined;
    }
    const t = setTimeout(() => {
      api.previewEmailAudience(params).then((res) => setPreview(res?.data || { count: 0, sample: [] })).catch(() => setPreview({ count: 0, sample: [] }));
    }, 250);
    return () => clearTimeout(t);
  }, [mode, selected, customEmails]);

  const pickTemplate = (t) => {
    if (!htmlIsEmpty(form.body) && !window.confirm('Replace the current email with this template?')) return;
    setForm((f) => ({ ...f, subject: t.subject || f.subject, body: t.body, template_id: t.template_id || null }));
    setMsg(null);
  };

  const onCsv = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCustomText((t) => `${t}\n${String(reader.result || '')}`);
    reader.readAsText(file);
  };

  const audience = () => (mode === 'custom' ? { mode, emails: customEmails } : mode === 'tags' ? { mode, tags: selected } : { mode: 'all' });
  const scheduledIso = () => {
    const d = new Date(at);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };

  const submit = async (action) => {
    const body = sanitizeHtml(form.body);
    if (!form.subject.trim() || htmlIsEmpty(body)) return setMsg({ type: 'error', text: 'Subject and email body are required.' });
    if (preview.count === 0) return setMsg({ type: 'error', text: 'No recipients. Pick tags that have leads with email addresses, or paste emails.' });
    if (action !== 'draft' && !configured) return setMsg({ type: 'error', text: 'Connect your email first (Sender setup tab).' });
    const payload = { name: form.name, subject: form.subject, body, audience: audience(), template_id: form.template_id };
    if (action === 'schedule') {
      const iso = scheduledIso();
      if (!iso || Date.parse(iso) < Date.now() + 60000) return setMsg({ type: 'error', text: 'Pick a date and time in the future.' });
      payload.scheduled_at = iso;
    }
    if (action === 'send' && !window.confirm(`Send "${form.subject}" to ${preview.count} recipient${preview.count === 1 ? '' : 's'} now?`)) return;
    if (action === 'send') payload.send = true;
    setBusy(action);
    setMsg(null);
    try {
      await api.createEmailCampaign(payload);
      if (onCreated) onCreated(action === 'schedule' ? `Scheduled for ${fmtDate(payload.scheduled_at)}.` : action === 'send' ? 'Campaign is sending.' : 'Draft saved.');
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  };

  const sendTest = async () => {
    const body = sanitizeHtml(form.body);
    if (!form.subject.trim() || htmlIsEmpty(body)) return setMsg({ type: 'error', text: 'Write a subject and body first.' });
    setBusy('test');
    setMsg(null);
    try {
      const res = await api.sendEmailCampaignTest({ subject: form.subject, body, to: profile?.email });
      setMsg({ type: 'success', text: res?.message || 'Test sent.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  };

  const saveAsTemplate = async () => {
    const body = sanitizeHtml(form.body);
    if (htmlIsEmpty(body)) return setMsg({ type: 'error', text: 'Write the email first, then save it as a template.' });
    const name = window.prompt('Template name', form.name || form.subject || 'My template');
    if (!name) return;
    setBusy('tpl');
    try {
      const res = await api.createEmailTemplate({ name, subject: form.subject, body });
      setForm((f) => ({ ...f, template_id: res?.data?.id || f.template_id }));
      setMsg({ type: 'success', text: `Saved as template “${name}”.` });
      if (onTemplatesChanged) onTemplatesChanged();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  };

  const toggleTag = (t) => setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  const tz = timeZoneLabel();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5" data-composer>
      <div className={`${cardCls} lg:col-span-3 space-y-4`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileText size={16} className="text-emerald-600" /> Message</h3>
          <div className="flex items-center gap-1.5">
            <button type="button" className={secondaryBtn} onClick={() => setShowPreview(true)} disabled={htmlIsEmpty(form.body)}><Eye size={13} /> Preview</button>
            <button type="button" className={secondaryBtn} onClick={saveAsTemplate} disabled={busy !== ''}>{busy === 'tpl' ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save as template</button>
          </div>
        </div>
        <TemplateStrip templates={templates} onPick={pickTemplate} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Campaign name (only you see it)</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="October turmeric offer" />
          </div>
          <div>
            <label className={labelCls}>Subject *</label>
            <input className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Fresh {{product}} for {{company_name}}" aria-label="Subject" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Email *</label>
          <RichEmailEditor value={form.body} onChange={(html) => setForm((f) => ({ ...f, body: html }))} placeholder="Write your email, add pictures with the 🖼 button, or start from a template above…" />
          <p className="text-[10px] text-slate-400 mt-1">Pictures are shrunk automatically (max ~185 KB each) and count in your company storage. An unsubscribe link is added at the bottom of every email.</p>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-5">
        <div className={`${cardCls} space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><Users size={16} className="text-emerald-600" /> Who gets it</h3>
            <button type="button" onClick={loadTags} className="text-slate-400 hover:text-emerald-600 cursor-pointer" title="Refresh tags" aria-label="Refresh tags"><RefreshCw size={14} /></button>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-[11px] font-semibold">
            {[{ id: 'tags', label: 'By tags' }, { id: 'all', label: 'All leads' }, { id: 'custom', label: 'Paste / CSV' }].map((m) => (
              <button type="button" key={m.id} onClick={() => setMode(m.id)} className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${mode === m.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}>{m.label}</button>
            ))}
          </div>
          {mode === 'tags' && (tags.length === 0 ? (
            <Notice>No tags yet. Open a lead, add tags like <strong>turmeric-buyer</strong> or <strong>dubai</strong>, and they appear here.</Notice>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => {
                const on = selected.includes(t.tag);
                return (
                  <button type="button" key={t.tag} onClick={() => toggleTag(t.tag)} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${on ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'}`}>
                    <Tag size={10} /> {t.tag}<span className={`px-1 rounded ${on ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>{t.with_email}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {mode === 'all' && <Notice>Every lead that has an email address and has not unsubscribed.</Notice>}
          {mode === 'custom' && (
            <div className="space-y-2">
              <textarea className={`${inputCls} min-h-[110px]`} value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder="Paste emails separated by commas, spaces or new lines. Or upload a CSV." aria-label="Recipient emails" />
              <label className={`${secondaryBtn} cursor-pointer`}><Upload size={14} /> Upload CSV<input type="file" accept=".csv,.txt" className="hidden" onChange={(e) => onCsv(e.target.files?.[0])} /></label>
              <p className="text-[10px] text-slate-400">{customEmails.length} valid email{customEmails.length === 1 ? '' : 's'} found.</p>
            </div>
          )}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Recipients</span><span className="text-xl font-bold text-emerald-600 tabular-nums" data-recipient-count>{preview.count}</span></div>
            {preview.sample?.length > 0 && <div className="mt-1.5 text-[10px] text-slate-400 truncate">{preview.sample.map((s) => s.email).join(', ')}{preview.count > preview.sample.length ? ' …' : ''}</div>}
          </div>
        </div>

        <div className={`${cardCls} space-y-3`}>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><CalendarClock size={16} className="text-emerald-600" /> When to send</h3>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-[11px] font-semibold" role="radiogroup" aria-label="When to send">
            {[{ id: 'now', label: 'Send now' }, { id: 'later', label: 'Schedule for later' }].map((m) => (
              <button type="button" key={m.id} role="radio" aria-checked={when === m.id} onClick={() => setWhen(m.id)} className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${when === m.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}>{m.label}</button>
            ))}
          </div>
          {when === 'later' && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {quickTimes().map((q) => (
                  <button key={q.label} type="button" onClick={() => setAt(toLocalInput(q.date))} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer ${at === toLocalInput(q.date) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{q.label}</button>
                ))}
              </div>
              <input type="datetime-local" className={inputCls} value={at} min={toLocalInput(new Date(Date.now() + 2 * 60000))} onChange={(e) => setAt(e.target.value)} aria-label="Send date and time" />
              <p className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={11} /> Your time zone{tz ? ` (${tz})` : ''}. The CRM sends it automatically — your computer can be off.</p>
            </div>
          )}
          {msg && <Notice type={msg.type}>{msg.text}</Notice>}
          <div className="flex flex-col gap-2 pt-1">
            {when === 'now' ? (
              <button type="button" onClick={() => submit('send')} className={`${primaryBtn} justify-center py-2.5`} disabled={busy !== '' || preview.count === 0}>
                {busy === 'send' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send to {preview.count} now
              </button>
            ) : (
              <button type="button" onClick={() => submit('schedule')} className={`${scheduleBtn} justify-center py-2.5`} disabled={busy !== '' || preview.count === 0}>
                {busy === 'schedule' ? <Loader2 size={14} className="animate-spin" /> : <CalendarClock size={14} />} Schedule for {at ? fmtDate(new Date(at).toISOString()) : '…'}
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => submit('draft')} className={`${secondaryBtn} justify-center`} disabled={busy !== ''}>{busy === 'draft' ? <Loader2 size={14} className="animate-spin" /> : null} Save draft</button>
              <button type="button" onClick={sendTest} className={`${secondaryBtn} justify-center`} disabled={busy !== '' || !configured} title={configured ? `Sends to ${profile?.email}` : 'Connect your email first'}>{busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Test to me</button>
            </div>
          </div>
        </div>
      </div>
      {showPreview && <PreviewModal subject={form.subject} body={form.body} senderName={senderName} onClose={() => setShowPreview(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Templates library                                                   */
/* ------------------------------------------------------------------ */

function TemplateEditor({ initial, senderName, onClose, onSaved }) {
  const [form, setForm] = useState({ name: initial?.name || '', subject: initial?.subject || '', body: initial?.body || '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const save = async () => {
    const body = sanitizeHtml(form.body);
    if (!form.name.trim()) return setMsg({ type: 'error', text: 'Give the template a name.' });
    if (htmlIsEmpty(body)) return setMsg({ type: 'error', text: 'The email is empty.' });
    setBusy(true);
    try {
      if (initial?.id) await api.updateEmailTemplate(initial.id, { ...form, body });
      else await api.createEmailTemplate({ ...form, body });
      onSaved(initial?.id ? 'Template updated.' : 'Template saved.');
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
      setBusy(false);
    }
  };
  return (
    <div className={`${cardCls} space-y-4`} data-template-editor>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{initial?.id ? 'Edit template' : 'New template'}</h3>
        <div className="flex items-center gap-1.5">
          <button type="button" className={secondaryBtn} onClick={() => setShowPreview(true)} disabled={htmlIsEmpty(form.body)}><Eye size={13} /> Preview</button>
          <button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button type="button" className={primaryBtn} onClick={save} disabled={busy}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save template</button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={labelCls}>Template name *</label><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Turmeric offer" aria-label="Template name" /></div>
        <div><label className={labelCls}>Subject</label><input className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Fresh {{product}} for {{company_name}}" /></div>
      </div>
      <RichEmailEditor value={form.body} onChange={(html) => setForm((f) => ({ ...f, body: html }))} minHeight={320} />
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      {showPreview && <PreviewModal subject={form.subject} body={form.body} senderName={senderName} onClose={() => setShowPreview(false)} />}
    </div>
  );
}

function TemplateThumb({ body, subject, senderName }) {
  return (
    <div className="relative h-40 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100">
      <iframe title={`Preview of ${subject || 'template'}`} sandbox="" srcDoc={previewDocument({ subject, body, senderName })} className="absolute top-0 left-0 origin-top-left pointer-events-none" style={{ width: '250%', height: '250%', transform: 'scale(0.4)' }} tabIndex={-1} />
    </div>
  );
}

function TemplatesTab({ templates, reload, onUse, senderName }) {
  const [editing, setEditing] = useState(null); // null | {} | template
  const [msg, setMsg] = useState(null);
  const remove = async (t) => {
    if (!window.confirm(`Delete template “${t.name}”?`)) return;
    try { await api.deleteEmailTemplate(t.id); setMsg({ type: 'success', text: 'Template deleted.' }); reload(); } catch (err) { setMsg({ type: 'error', text: err.message }); }
  };
  const duplicate = async (t) => {
    try { await api.createEmailTemplate({ name: `${t.name} (copy)`, subject: t.subject, body: t.body }); setMsg({ type: 'success', text: 'Copy created.' }); reload(); } catch (err) { setMsg({ type: 'error', text: err.message }); }
  };

  if (editing) {
    return <TemplateEditor initial={editing} senderName={senderName} onClose={() => setEditing(null)} onSaved={(text) => { setEditing(null); setMsg({ type: 'success', text }); reload(); }} />;
  }

  return (
    <div className="space-y-5" data-templates-tab>
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">My templates</h3>
          <p className="text-xs text-slate-500">Design an email once, reuse it in any campaign. Pictures, buttons and personal fields are kept.</p>
        </div>
        <button type="button" className={primaryBtn} onClick={() => setEditing({})}><Plus size={14} /> New template</button>
      </div>
      {templates.length === 0 ? (
        <div className={`${cardCls} text-center py-8 text-xs text-slate-500`}>No templates yet. Start from a design below or create a new one.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className={`${cardCls} p-4 sm:p-4 space-y-3`} data-template-card>
              <TemplateThumb body={t.body} subject={t.subject} senderName={senderName} />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{t.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{t.subject || 'No subject'} · {fmtDate(t.updated_at)}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" className={`${primaryBtn} px-3`} onClick={() => onUse(t)}><Send size={12} /> Use</button>
                <button type="button" className={`${secondaryBtn} px-3`} onClick={() => setEditing(t)}><Pencil size={12} /> Edit</button>
                <button type="button" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" onClick={() => duplicate(t)} title="Duplicate" aria-label={`Duplicate ${t.name}`}><Copy size={14} /></button>
                <button type="button" className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer ml-auto" onClick={() => remove(t)} title="Delete" aria-label={`Delete ${t.name}`}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Start from a design</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STARTER_TEMPLATES.map((t) => (
            <div key={t.key} className={`${cardCls} p-4 sm:p-4 space-y-2`}>
              <TemplateThumb body={t.body} subject={t.subject} senderName={senderName} />
              <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</div>
              <p className="text-[11px] text-slate-500 min-h-[28px]">{t.description}</p>
              <button type="button" className={`${secondaryBtn} w-full justify-center`} onClick={() => setEditing({ name: t.name, subject: t.subject, body: t.body })}><Pencil size={12} /> Customise</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Campaign list                                                       */
/* ------------------------------------------------------------------ */

function CampaignList({ campaigns, onRefresh, configured, onNew }) {
  const [open, setOpen] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [resched, setResched] = useState(null); // { id, at }

  const loadDetail = async (id) => {
    if (open === id) return setOpen(null);
    setOpen(id);
    setDetail(null);
    try { const res = await api.getEmailCampaign(id); setDetail(res?.data || null); } catch { /* shown as loading */ }
  };

  useEffect(() => {
    if (!open) return;
    const c = campaigns.find((x) => x.id === open);
    if (c && c.status === 'sending') api.getEmailCampaign(open).then((res) => setDetail(res?.data || null)).catch(() => {});
  }, [campaigns, open]);

  const act = async (fn, id) => {
    setBusy(id);
    setMsg(null);
    try { const res = await fn(); setMsg({ type: 'success', text: res?.message || 'Done' }); onRefresh(); } catch (err) { setMsg({ type: 'error', text: err.message }); } finally { setBusy(''); }
  };

  if (campaigns.length === 0) {
    return (
      <div className={`${cardCls} text-center py-12`}>
        <Mail size={32} className="mx-auto text-slate-300" />
        <div className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">No campaigns yet</div>
        <div className="text-xs text-slate-400 mt-1">Write your first email — send it now or schedule it for later.</div>
        <button type="button" className={`${primaryBtn} mt-4`} onClick={onNew}><Plus size={14} /> New campaign</button>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-campaign-list>
      {msg && <Notice type={msg.type}>{msg.text}</Notice>}
      {campaigns.map((c) => {
        const done = c.sent + c.failed;
        const pct = c.total ? Math.round((done / c.total) * 100) : 0;
        return (
          <div key={c.id} className={`${cardCls} p-4 sm:p-5`} data-campaign={c.id}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{c.name || c.subject}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase ${statusStyle(c.status)}`}>{c.status}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">Subject: {c.subject}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {c.audience?.mode === 'tags' ? `Tags: ${(c.audience.tags || []).join(', ')}` : c.audience?.mode === 'custom' ? 'Custom list' : 'All leads'} · Created {fmtDate(c.created_at)}
                  {c.finished_at ? ` · Finished ${fmtDate(c.finished_at)}` : ''}
                </div>
                {c.status === 'scheduled' && (
                  <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900 rounded-md px-2 py-1">
                    <CalendarClock size={12} /> Sends automatically on {fmtDate(c.scheduled_at)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {(c.status === 'draft' || c.status === 'paused') && (
                  <button className={primaryBtn} disabled={busy === c.id || !configured} onClick={() => act(() => api.sendEmailCampaign(c.id), c.id)} title={configured ? '' : 'Connect your email first'}>
                    {c.status === 'paused' ? <Play size={13} /> : <Send size={13} />} {c.status === 'paused' ? 'Resume' : 'Send'}
                  </button>
                )}
                {c.status === 'draft' && (
                  <button className={secondaryBtn} disabled={!configured} onClick={() => setResched({ id: c.id, at: toLocalInput(quickTimes()[1].date) })}><CalendarClock size={13} /> Schedule</button>
                )}
                {c.status === 'scheduled' && (
                  <>
                    <button className={primaryBtn} disabled={busy === c.id} onClick={() => window.confirm('Send this campaign now instead of at the scheduled time?') && act(() => api.sendEmailCampaign(c.id), c.id)}><Send size={13} /> Send now</button>
                    <button className={secondaryBtn} onClick={() => setResched({ id: c.id, at: toLocalInput(new Date(c.scheduled_at)) })}><CalendarClock size={13} /> Change time</button>
                    <button className={secondaryBtn} disabled={busy === c.id} onClick={() => act(() => api.unscheduleEmailCampaign(c.id), c.id)}><Ban size={13} /> Cancel schedule</button>
                  </>
                )}
                {(c.status === 'sent' || c.status === 'failed') && c.failed > 0 && (
                  <button className={secondaryBtn} disabled={busy === c.id} onClick={() => act(() => api.sendEmailCampaign(c.id, { retry_failed: true }), c.id)}><RefreshCw size={13} /> Retry {c.failed}</button>
                )}
                <button className={secondaryBtn} onClick={() => loadDetail(c.id)}>{open === c.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Recipients</button>
                {c.status !== 'sending' && (
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer" title="Delete" aria-label="Delete campaign" disabled={busy === c.id} onClick={() => window.confirm('Delete this campaign and its log?') && act(() => api.deleteEmailCampaign(c.id), c.id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {resched && resched.id === c.id && (
              <div className="mt-3 flex flex-wrap items-center gap-2 p-3 rounded-lg bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900">
                <input type="datetime-local" className={`${inputCls} w-auto`} value={resched.at} min={toLocalInput(new Date(Date.now() + 2 * 60000))} onChange={(e) => setResched({ ...resched, at: e.target.value })} aria-label="New send time" />
                <button className={scheduleBtn} disabled={busy === c.id} onClick={() => { const iso = new Date(resched.at).toISOString(); setResched(null); act(() => api.scheduleEmailCampaign(c.id, iso), c.id); }}><CalendarClock size={13} /> Save time</button>
                <button className={secondaryBtn} onClick={() => setResched(null)}>Cancel</button>
              </div>
            )}

            {c.status !== 'draft' && c.status !== 'scheduled' && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span><span className="text-emerald-600">{c.sent} sent</span>{c.failed > 0 && <span className="text-rose-500"> · {c.failed} failed</span>}<span> · {c.total} total</span></span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 mt-1 overflow-hidden flex">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${c.total ? (c.sent / c.total) * 100 : 0}%` }} />
                  <div className="h-full bg-rose-400 transition-all" style={{ width: `${c.total ? (c.failed / c.total) * 100 : 0}%` }} />
                </div>
              </div>
            )}
            {c.error && <div className="text-[11px] text-rose-600 mt-1">{c.error}</div>}

            {open === c.id && (
              <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                {!detail ? (
                  <div className="text-xs text-slate-400 flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Loading…</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-[11px]">
                      <thead className="text-slate-400 text-left"><tr><th className="py-1 pr-2">Email</th><th className="py-1 pr-2">Company</th><th className="py-1 pr-2">Status</th><th className="py-1">Note</th></tr></thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(detail.recipients || []).map((r) => (
                          <tr key={r.email}>
                            <td className="py-1 pr-2 font-semibold text-slate-700 dark:text-slate-200">{r.email}</td>
                            <td className="py-1 pr-2 text-slate-500">{r.company || '—'}</td>
                            <td className="py-1 pr-2"><span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${statusStyle(r.status === 'pending' ? 'draft' : r.status)}`}>{r.status}</span></td>
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
  const [tab, setTab] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [seed, setSeed] = useState(null);
  const [composerKey, setComposerKey] = useState(0);
  const [banner, setBanner] = useState(null);

  const loadStatus = useCallback(() => {
    api.getEmailStatus()
      .then((res) => setStatus(res?.data || { enabled: false, is_owner: false }))
      .catch((err) => { setStatusError(err.message); setStatus({ enabled: false, is_owner: false }); });
  }, []);
  const loadCampaigns = useCallback(() => {
    api.getEmailCampaigns().then((res) => setCampaigns(Array.isArray(res?.data) ? res.data : [])).catch(() => {});
  }, []);
  const loadTemplates = useCallback(() => {
    api.getEmailTemplates().then((res) => setTemplates(Array.isArray(res?.data) ? res.data : [])).catch(() => {});
  }, []);

  useEffect(loadStatus, [loadStatus]);
  useEffect(() => {
    if (!status?.enabled) return;
    loadCampaigns();
    loadTemplates();
    setTab((t) => t || (status.configured ? 'campaigns' : 'settings'));
  }, [status?.enabled, status?.configured, loadCampaigns, loadTemplates]);

  const anyActive = campaigns.some((c) => c.status === 'sending' || (c.status === 'scheduled' && Date.parse(c.scheduled_at) - Date.now() < 5 * 60000));
  useEffect(() => {
    if (!anyActive) return undefined;
    const t = setInterval(loadCampaigns, 4000);
    return () => clearInterval(t);
  }, [anyActive, loadCampaigns]);

  const scheduledCount = campaigns.filter((c) => c.status === 'scheduled').length;
  const tabs = [
    { id: 'campaigns', label: 'Campaigns', icon: Mail, count: campaigns.length },
    { id: 'new', label: 'New Campaign', icon: Send },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate, count: templates.length },
    { id: 'settings', label: 'Sender setup', icon: Settings, dot: status && !status.configured },
  ];
  const senderName = profile?.name || '';

  const openComposer = (s) => {
    setSeed(s || null);
    setComposerKey((k) => k + 1);
    setTab('new');
  };

  return (
    <div className="w-full space-y-5 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Email Marketing</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"><Crown size={12} /> Premium</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Design emails with pictures, pick your buyers, and send now or at a time you choose — from your own email address.</p>
        </div>
        {status?.enabled && (
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {scheduledCount > 0 && <span className={`px-2.5 py-1 rounded-full font-semibold border ${statusStyle('scheduled')}`}>{scheduledCount} scheduled</span>}
            <span className={`px-2.5 py-1 rounded-full font-semibold border ${status.configured ? statusStyle('sent') : statusStyle('draft')}`}>{status.configured ? `Sending as ${status.from_email}` : 'Email not connected'}</span>
            <button className={secondaryBtn} onClick={onNavigateToLeads}><Tag size={13} /> Tag leads</button>
          </div>
        )}
      </div>

      {!status ? (
        <div className={`${cardCls} text-xs text-slate-400 flex items-center gap-2`}><Loader2 size={14} className="animate-spin" /> Checking feature access…</div>
      ) : !status.enabled ? (
        <div className={`${cardCls} text-center py-12`}>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600"><Lock size={24} /></div>
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Email Marketing is a premium feature</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
            {status.is_owner ? 'Ask the platform admin to switch on Email Marketing for your company. Then connect your Gmail/Zoho in 2 minutes and start sending.' : 'Only the company owner can use Email Marketing.'}
          </p>
          {statusError && <p className="text-[11px] text-rose-500 mt-3">{statusError}</p>}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
            {[
              ['Connect in 2 minutes', 'Pick Gmail, Outlook, Yahoo or Zoho — one click opens the app-password page.'],
              ['Templates with pictures', 'Design an email once with photos, buttons and buyer names, reuse it any time.'],
              ['Send now or schedule', 'Choose a date and time; the CRM sends it even if your computer is off.'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/60">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{t}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{d}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 w-fit max-w-full overflow-x-auto" role="tablist">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => (t.id === 'new' ? openComposer(null) : setTab(t.id))}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${tab === t.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  <Icon size={14} />
                  <span>{t.label}</span>
                  {t.count !== undefined && <span className="px-1.5 rounded bg-slate-200/80 dark:bg-slate-600 text-[10px]">{t.count}</span>}
                  {t.dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                </button>
              );
            })}
          </div>

          {banner && <Notice type="success">{banner}</Notice>}
          {!status.configured && tab !== 'settings' && (
            <Notice type="warn">Connect your email first — it takes 2 minutes. <button className="underline font-semibold cursor-pointer" onClick={() => setTab('settings')}>Open sender setup</button></Notice>
          )}

          {tab === 'campaigns' && <CampaignList campaigns={campaigns} onRefresh={loadCampaigns} configured={status.configured} onNew={() => openComposer(null)} />}
          {tab === 'new' && (
            <Composer
              key={composerKey}
              profile={profile}
              configured={status.configured}
              senderName={senderName}
              seed={seed}
              templates={templates}
              onTemplatesChanged={loadTemplates}
              onCreated={(text) => { setBanner(text); loadCampaigns(); setTab('campaigns'); setTimeout(() => setBanner(null), 6000); }}
            />
          )}
          {tab === 'templates' && (
            <TemplatesTab
              templates={templates}
              reload={loadTemplates}
              senderName={senderName}
              onUse={(t) => openComposer({ subject: t.subject, body: t.body, template_id: t.id, campaignName: t.name })}
            />
          )}
          {tab === 'settings' && <SenderSettings profile={profile} onSaved={loadStatus} />}
        </>
      )}
    </div>
  );
}
