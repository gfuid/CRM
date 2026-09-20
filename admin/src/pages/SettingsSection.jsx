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
  AlertTriangle
} from 'lucide-react';

export default function SettingsSection({ company, onUpdateSettings }) {
  const [formData, setFormData] = useState({
    name: company?.name || 'Stellarsync Enterprise',
    industry: company?.industry || 'Software & Cloud Sales',
    revenueTargetMonthly: company?.revenueTargetMonthly || 150000,
    timezone: company?.timezone || 'UTC+05:30',
  });

  const [strictQuota, setStrictQuota] = useState(true);
  const [emailVerification, setEmailVerification] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('https://hooks.stellarsync.io/crm-events');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || 'Stellarsync Enterprise',
        industry: company.industry || 'Software & Cloud Sales',
        revenueTargetMonthly: company.revenueTargetMonthly || 150000,
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
    <div className="space-y-6 max-w-4xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Identity */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Building size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">
                Primary Organization Identity
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Global brand metadata and default operational parameters
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Company / Tenant Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Industry Sector
              </label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Monthly Pipeline Revenue Goal ($)
              </label>
              <input
                type="number"
                value={formData.revenueTargetMonthly}
                onChange={(e) => setFormData({ ...formData, revenueTargetMonthly: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Operational Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">
                SaaS Security & Quota Enforcement
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Headcount seat gates, registration rules, and system locks
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div>
                <div className="font-bold text-slate-900 text-xs">Strict Staff Quota Enforcement</div>
                <div className="text-[11px] text-slate-500">
                  Block owner/admins from adding team members beyond subscription tier limits
                </div>
              </div>
              <input
                type="checkbox"
                checked={strictQuota}
                onChange={(e) => setStrictQuota(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div>
                <div className="font-bold text-slate-900 text-xs">Mandatory Email Verification</div>
                <div className="text-[11px] text-slate-500">
                  Require newly invited sales agents to confirm email before granting CRM access
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailVerification}
                onChange={(e) => setEmailVerification(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/60">
              <div>
                <div className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-amber-600" />
                  <span>Platform Maintenance Mode</span>
                </div>
                <div className="text-[11px] text-amber-700">
                  Restricts non-admin staff access while schema updates or database migrations run
                </div>
              </div>
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Webhook Integrations */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">
                Webhook & Real-Time Alerts
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Send audit events, quota alerts, and lead deals to external systems
              </p>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Webhook Endpoint URL
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
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
            <div className="text-xs text-slate-400">All changes logged to system audit trail.</div>
          )}

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            <Save size={15} />
            <span>Save Platform Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
