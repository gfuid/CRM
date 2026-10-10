import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Save,
  Check,
  Shield,
  Bell,
  Globe,
  DollarSign,
  AlertTriangle,
  Lock,
  Sparkles
} from 'lucide-react';

export default function SettingsSection({ company, onUpdateSettings }) {
  const [formData, setFormData] = useState({
    name: company?.name || 'Travel-Trade',
    industry: company?.industry || 'Travel, Tourism & Trade Services',
    revenueTargetMonthly: company?.revenueTargetMonthly || 0,
    timezone: company?.timezone || 'UTC+05:30',
  });

  const [strictQuota, setStrictQuota] = useState(true);
  const [emailVerification, setEmailVerification] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('https://hooks.travel-trade.com/crm-events');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || 'Travel-Trade',
        industry: company.industry || 'Travel, Tourism & Trade Services',
        revenueTargetMonthly: company.revenueTargetMonthly || 0,
        timezone: company.timezone || 'UTC+05:30',
      });
    }
  }, [company]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight m-0">
            Console Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Global CRM tenant identity, quota policies, security gates & webhooks
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Identity */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <Building size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 m-0 tracking-tight">
                Primary Organization Identity
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Global brand metadata and default operational parameters
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Company / Tenant Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Industry Sector
              </label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Monthly Pipeline Revenue Goal ($)
              </label>
              <input
                type="number"
                value={formData.revenueTargetMonthly}
                onChange={(e) => setFormData({ ...formData, revenueTargetMonthly: e.target.value })}
                className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Primary Operational Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-semibold"
              >
                <option value="UTC+05:30">UTC+05:30 (India Standard Time)</option>
                <option value="UTC-05:00">UTC-05:00 (US Eastern Time)</option>
                <option value="UTC-08:00">UTC-08:00 (US Pacific Time)</option>
                <option value="UTC+00:00">UTC+00:00 (Greenwich Mean Time)</option>
                <option value="UTC+01:00">UTC+01:00 (Central European Time)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security & Quota Policies */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Shield size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 m-0 tracking-tight">
                SaaS Security & Quota Enforcement
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Headcount seat gates, registration rules, and system locks
              </p>
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
              <div>
                <div className="font-extrabold text-slate-900 text-xs">Strict Staff Quota Enforcement</div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Block owner/admins from adding team members beyond subscription tier limit (Default 2 seats)
                </div>
              </div>
              <input
                type="checkbox"
                checked={strictQuota}
                onChange={(e) => setStrictQuota(e.target.checked)}
                className="w-4 h-4 accent-slate-900 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
              <div>
                <div className="font-extrabold text-slate-900 text-xs">Mandatory Email Verification</div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Require newly invited sales agents to confirm email before granting CRM access
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailVerification}
                onChange={(e) => setEmailVerification(e.target.checked)}
                className="w-4 h-4 accent-slate-900 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70">
              <div>
                <div className="font-extrabold text-amber-900 text-xs flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-amber-600" />
                  <span>Platform Maintenance Mode</span>
                </div>
                <div className="text-[11px] text-amber-800 font-medium">
                  Restricts non-admin staff access while schema updates or database migrations run
                </div>
              </div>
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Webhook Integrations */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 m-0 tracking-tight">
                Webhook & Real-Time Alerts
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Send audit events, quota alerts, and lead deals to external systems
              </p>
            </div>
          </div>

          <div className="pt-1">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Webhook Endpoint URL
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Triggered on: USER_CREATED, SUBSCRIPTION_UPGRADE, PLAN_QUOTA_EXCEEDED, HIGH_LATENCY_ALERT
            </p>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold animate-fadeIn">
              <Check size={16} />
              <span>Platform settings updated successfully in backend!</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-medium">All changes logged to system audit trail.</div>
          )}

          <button
            type="submit"
            className="flex items-center gap-2 px-7 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Save size={14} />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
