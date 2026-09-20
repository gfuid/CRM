import React, { useState } from 'react';
import {
  Network,
  CheckCircle2,
  ExternalLink,
  Plus,
  Shield,
  Zap,
  Mail,
  MessageSquare,
  CreditCard,
  Layers
} from 'lucide-react';

export default function Integrations() {
  const [integrations, setIntegrations] = useState([
    {
      id: 'int_1',
      name: 'Google Workspace & Gmail',
      category: 'Email & Calendar',
      description: 'Sync client email conversations and schedule calendar meetings directly from lead cards.',
      connected: true,
      lastSync: '5 mins ago',
      icon: Mail,
      iconColor: 'text-rose-500 bg-rose-50',
    },
    {
      id: 'int_2',
      name: 'Slack Deal Alerts',
      category: 'Team Messaging',
      description: 'Dispatches instant celebrations to #sales-won when deals close, and alerts reps of new tasks.',
      connected: true,
      lastSync: 'Just now',
      icon: MessageSquare,
      iconColor: 'text-purple-500 bg-purple-50',
    },
    {
      id: 'int_3',
      name: 'Stripe SaaS Billing',
      category: 'Payments & Subscriptions',
      description: 'Process customer subscriptions, recurring plan upgrades, and automatic invoice receipts.',
      connected: true,
      lastSync: '1 hour ago',
      icon: CreditCard,
      iconColor: 'text-blue-500 bg-blue-50',
    },
    {
      id: 'int_4',
      name: 'Zapier & Webhooks',
      category: 'Automation & Sync',
      description: 'Send CRM lead events and pipeline milestones to over 5,000+ business applications.',
      connected: false,
      lastSync: 'Not configured',
      icon: Zap,
      iconColor: 'text-amber-500 bg-amber-50',
    },
    {
      id: 'int_5',
      name: 'WhatsApp Business Cloud API',
      category: 'Messaging',
      description: 'Send verified template messages and chat directly with inbound enterprise leads.',
      connected: false,
      lastSync: 'Not configured',
      icon: Network,
      iconColor: 'text-emerald-500 bg-emerald-50',
    },
  ]);

  const [toastMsg, setToastMsg] = useState('');

  const toggleConnection = (id) => {
    setIntegrations((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const next = !item.connected;
          setToastMsg(`${item.name} is now ${next ? 'Connected' : 'Disconnected'}`);
          setTimeout(() => setToastMsg(''), 3000);
          return {
            ...item,
            connected: next,
            lastSync: next ? 'Just now' : 'Disconnected',
          };
        }
        return item;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Connected Integrations</h1>
        <p className="text-xs text-slate-500 mt-1">
          Seamlessly synchronize email, payments, and messaging with the CRM platform
        </p>
      </div>

      {/* Grid of integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {integrations.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.iconColor}`}>
                    <Icon size={22} />
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      item.connected
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.connected ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    <span>{item.connected ? 'Connected' : 'Available'}</span>
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base mt-4 m-0">{item.name}</h3>
                <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">{item.category}</div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[11px] text-slate-400 font-medium">
                  {item.connected ? `Synced: ${item.lastSync}` : 'Ready to pair'}
                </div>

                <button
                  onClick={() => toggleConnection(item.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    item.connected
                      ? 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                  }`}
                >
                  {item.connected ? 'Manage' : 'Connect'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
