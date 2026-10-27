import React, { useEffect, useState } from 'react';
import { Bot, KeyRound, PlugZap, Save, ShieldCheck, Activity } from 'lucide-react';

/**
 * Platform admin: switch the AI help assistant on, set the xAI (Grok) API key, model and limits.
 * The key is stored encrypted on the server and never shown again (only the last 4 characters).
 */
export default function AiAssistantSection({ apiBase, getHeaders, showToast }) {
  const [s, setS] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [form, setForm] = useState({ enabled: false, model: '', daily_limit_per_user: 40, include_user_data: false, extra_instructions: '' });
  const [models, setModels] = useState([]);
  const [busy, setBusy] = useState(false);
  const [testMsg, setTestMsg] = useState(null);

  const load = async () => {
    try {
      const res = await fetch(`${apiBase}/ai-settings`, { headers: getHeaders() }).then((r) => r.json());
      if (res.success) {
        setS(res.data);
        setForm({
          enabled: res.data.enabled,
          model: res.data.model,
          daily_limit_per_user: res.data.daily_limit_per_user,
          include_user_data: res.data.include_user_data,
          extra_instructions: res.data.extra_instructions || '',
        });
      } else showToast(res.message || 'Could not load AI settings', 'error');
    } catch (err) {
      showToast('Could not load AI settings: ' + err.message, 'error');
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const save = async (extra = {}) => {
    setBusy(true);
    try {
      const body = { ...form, ...extra };
      if (apiKey.trim()) body.api_key = apiKey.trim();
      const res = await fetch(`${apiBase}/ai-settings`, { method: 'PUT', headers: { ...getHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
      if (res.success) {
        setS(res.data);
        setApiKey('');
        setForm((f) => ({ ...f, enabled: res.data.enabled }));
        showToast('AI assistant settings saved');
      } else showToast(res.message || 'Could not save', 'error');
    } catch (err) {
      showToast('Could not save: ' + err.message, 'error');
    } finally { setBusy(false); }
  };

  const removeKey = async () => {
    if (!window.confirm('Remove the API key and switch the assistant off?')) return;
    await save({ api_key: '', enabled: false });
  };

  const test = async () => {
    setBusy(true);
    setTestMsg(null);
    try {
      const res = await fetch(`${apiBase}/ai-settings/test`, { method: 'POST', headers: getHeaders() }).then((r) => r.json());
      setTestMsg(res.data || { ok: false, message: res.message });
      if (res.data?.models?.length) setModels(res.data.models);
    } catch (err) {
      setTestMsg({ ok: false, message: err.message });
    } finally { setBusy(false); }
  };

  if (!s) return <div className="text-xs text-slate-500">Loading…</div>;
  const field = 'w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10';
  const stats = s.stats || {};

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-card space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2"><Bot size={20} className="text-emerald-600" /> AI Help Assistant (Grok)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Owners and staff get a chat button in the CRM to ask how to use it. Answers come from xAI Grok with your API key.</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${s.ready ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{s.ready ? 'ON for users' : 'OFF'}</span>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5"><KeyRound size={13} /> xAI API key</label>
          <div className="flex gap-2">
            <input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={s.has_api_key ? `Saved (${s.api_key_hint}) — paste a new key to replace` : 'Paste your key from console.x.ai'} className={field} />
            {s.has_api_key && <button type="button" onClick={removeKey} disabled={busy} className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 border border-rose-200 bg-rose-50 cursor-pointer shrink-0">Remove</button>}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><ShieldCheck size={11} /> Stored encrypted on the server. It is never shown again or sent to the browser.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Model</label>
            <input list="xai-models" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value.trim() })} className={field} placeholder="e.g. grok-4.3" />
            <datalist id="xai-models">{models.map((m) => <option key={m} value={m} />)}</datalist>
            <p className="text-[10px] text-slate-400 mt-1">Press “Test connection” to see the models your key can use.</p>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Questions per user per day</label>
            <input type="number" min={1} max={1000} value={form.daily_limit_per_user} onChange={(e) => setForm({ ...form, daily_limit_per_user: Number(e.target.value) })} className={field} />
            <p className="text-[10px] text-slate-400 mt-1">Keeps your xAI bill under control.</p>
          </div>
        </div>

        <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
          <input type="checkbox" checked={form.include_user_data} onChange={(e) => setForm({ ...form, include_user_data: e.target.checked })} className="mt-0.5" />
          <span className="text-xs">
            <b>Let the assistant read the user's own CRM summary</b>
            <span className="block text-[11px] text-slate-500">Lets users ask “which follow-ups are due today?”. Only what that user can already see is sent (lead names, countries, follow-up dates, task titles — never contact details, prices, passwords or other companies). This data is sent to xAI. Leave OFF if your customers have not agreed to that.</span>
          </span>
        </label>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Extra notes for the assistant (optional)</label>
          <textarea rows={3} value={form.extra_instructions} onChange={(e) => setForm({ ...form, extra_instructions: e.target.value.slice(0, 3000) })} className={field} placeholder="e.g. Support hours are 10 AM – 7 PM IST. For plan upgrades, raise a ticket." />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
          <span className="text-xs font-bold text-slate-800">Assistant switched ON for all companies</span>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => save()} disabled={busy} className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"><Save size={13} /> Save</button>
          <button type="button" onClick={test} disabled={busy || !s.has_api_key} className="px-4 py-2 rounded-full bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"><PlugZap size={13} /> Test connection</button>
        </div>
        {testMsg && (
          <div className={`text-xs font-semibold rounded-xl px-3 py-2 border ${testMsg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
            {testMsg.message}
            {testMsg.models?.length ? <div className="text-[10px] font-normal mt-1">Models: {testMsg.models.join(', ')}</div> : null}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-card">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-3"><Activity size={16} className="text-indigo-600" /> Usage today {stats.day ? `(${stats.day})` : ''}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[['Questions', stats.requests || 0], ['Errors', stats.errors || 0], ['Input tokens', stats.prompt_tokens || 0], ['Output tokens', stats.completion_tokens || 0]].map(([k, v]) => (
            <div key={k} className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-500">{k}</div>
              <div className="text-lg font-black text-slate-900">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
