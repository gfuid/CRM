import React, { useState, useEffect } from 'react';
import { Check, X, RefreshCw, Send, Loader2 } from 'lucide-react';

// Helper to get auth headers similar to App.jsx
const getHeaders = () => {
  const token = localStorage.getItem('crm_admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : { 'x-user-id': 'usr_super_admin' }),
  };
};

export default function EmailSettings({ apiBase }) {
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState({
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    from_name: '',
    from_email: '',
    reply_to: '',
    rate_per_minute: 20,
  });
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Load status and existing masked settings on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statusRes, settingsRes] = await Promise.all([
          fetch(`${apiBase}/email/status`, { headers: getHeaders() }).then(r => r.json()),
          fetch(`${apiBase}/email/settings`, { headers: getHeaders() }).then(r => r.json()),
        ]);
        if (statusRes.success) setStatus(statusRes.data);
        if (settingsRes.success) {
          const s = settingsRes.data;
          setSettings(prev => ({
            ...prev,
            host: s.host || '',
            port: s.port || 587,
            secure: Boolean(s.secure),
            user: s.user || '',
            from_name: s.from_name || '',
            from_email: s.from_email || '',
            reply_to: s.reply_to || '',
            rate_per_minute: s.rate_per_minute || 20,
          }));
          setHasPassword(Boolean(s.pass_enc));
        }
      } catch (e) {
        console.error('Failed to load email settings', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [apiBase]);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    if (field === 'pass') setHasPassword(!!value);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const body = { ...settings };
      // Exclude password if unchanged (hasPassword indicates existing encrypted password)
      if (!hasPassword) delete body.pass;
      const res = await fetch(`${apiBase}/email/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      }).then(r => r.json());
      if (res.success) {
        setHasPassword(true);
        setTestResult(null);
        alert('SMTP sender settings saved');
      } else {
        alert('Error saving settings: ' + (res.message || 'unknown'));
      }
    } catch (e) {
      console.error(e);
      alert('Network error while saving');
    } finally {
      setSaving(false);
    }
  };

  const testSettings = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${apiBase}/email/settings/test`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({}),
      }).then(r => r.json());
      if (res.success) {
        setTestResult({ ok: true, to: res.data.to, verified_at: res.data.verified_at });
      } else {
        setTestResult({ ok: false, error: res.message });
      }
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-slate-500" size={24} />
        <span className="ml-2 text-sm text-slate-600">Loading email settings…</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 sm:p-7 space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
          <Send size={18} />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900 m-0 tracking-tight">Email Marketing – SMTP Sender</h3>
          <p className="text-xs text-slate-400 mt-0.5">Configure per‑company SMTP credentials for campaign delivery.</p>
        </div>
      </div>

      {status && (
        <div className="flex items-center text-sm">
          <span className={`mr-2 px-2 py-0.5 rounded ${status.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>Status: {status.enabled ? 'Enabled' : 'Disabled'}</span>
          {status.configured && <span className="ml-2 text-slate-600">Configured: {status.from_email || status.platform_mail_configured ? 'Yes' : 'No'}</span>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">SMTP Host</label>
          <input type="text" className="w-full px-4 py-2.5 text-xs rounded-2xl border bg-slate-50 focus:bg-white" value={settings.host} onChange={e => handleChange('host', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Port</label>
          <input type="number" className="w-full px-4 py-2.5 text-xs rounded-2xl border bg-slate-50 focus:bg-white" value={settings.port} onChange={e => handleChange('port', Number(e.target.value))} />
        </div>
        <div className="flex items-center space-x-2 col-span-2">
          <input type="checkbox" checked={settings.secure} onChange={e => handleChange('secure', e.target.checked)} className="w-4 h-4 accent-indigo-600" />
          <label className="text-xs font-medium text-slate-700">Secure (TLS/SSL)</label>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Username / Email</label>
          <input type="email" className="w-full px-4 py-2.5 text-xs rounded-2xl border bg-slate-50 focus:bg-white" value={settings.user} onChange={e => handleChange('user', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Password (App password)</label>
          <input type="password" placeholder={hasPassword ? '••••••••' : ''} className="w-full px-4 py-2.5 text-xs rounded-2xl border bg-slate-50 focus:bg-white" value={settings.pass} onChange={e => handleChange('pass', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">From Name</label>
          <input type="text" className="w-full px-4 py-2.5 text-xs rounded-2xl border bg-slate-50 focus:bg-white" value={settings.from_name} onChange={e => handleChange('from_name', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">From Email</label>
          <input type="email" className="w-full px-4 py-2.5 text-xs rounded-2xl border bg-slate-50 focus:bg-white" value={settings.from_email} onChange={e => handleChange('from_email', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Reply‑To (optional)</label>
          <input type="email" className="w-full px-4 py-2.5 text-xs rounded-2xl border bg-slate-50 focus:bg-white" value={settings.reply_to} onChange={e => handleChange('reply_to', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Rate per minute</label>
          <input type="number" min={1} max={120} className="w-full px-4 py-2.5 text-xs rounded-2xl border bg-slate-50 focus:bg-white" value={settings.rate_per_minute} onChange={e => handleChange('rate_per_minute', Number(e.target.value))} />
        </div>
      </div>

      <div className="flex space-x-3 pt-2">
        <button type="button" onClick={saveSettings} disabled={saving} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 disabled:opacity-50">
          {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Check size={16} className="mr-1" />} Save Settings
        </button>
        <button type="button" onClick={testSettings} disabled={testing || !status?.configured} className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-2xl hover:bg-indigo-100 disabled:opacity-50">
          {testing ? <Loader2 className="animate-spin mr-2" size={16} /> : <Send size={16} className="mr-1" />} Test SMTP
        </button>
        <button type="button" onClick={() => { setStatus(null); setSettings({ host: '', port: 587, secure: false, user: '', pass: '', from_name: '', from_email: '', reply_to: '', rate_per_minute: 20 }); setHasPassword(false); }} className="inline-flex items-center px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200">
          <RefreshCw size={14} className="mr-1" /> Reset Form
        </button>
      </div>

      {testResult && (
        <div className={`mt-3 p-3 rounded-2xl text-sm ${testResult.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          {testResult.ok ? (
            <>✅ Test email delivered to <strong>{testResult.to}</strong>. Verified at {new Date(testResult.verified_at).toLocaleString()}.</>
          ) : (
            <>❌ Test failed: {testResult.error}</>
          )}
        </div>
      )}
    </div>
  );
}
