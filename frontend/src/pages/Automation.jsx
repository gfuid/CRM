import React, { useState } from 'react';
import {
  Zap,
  CheckCircle2,
  Bell,
  Users,
  Clock,
  ArrowRight,
  Shield,
  Send,
  Plus,
  Play,
  RotateCcw
} from 'lucide-react';

export default function Automation() {
  const [workflows, setWorkflows] = useState([
    {
      id: 'wf_1',
      title: 'Auto-Assign Inbound Leads (Round-Robin)',
      description: 'Automatically distributes newly created leads equally among all active sales agents in the company.',
      category: 'Lead Routing',
      enabled: true,
      lastRun: '14 minutes ago',
      runsCount: 142,
    },
    {
      id: 'wf_2',
      title: 'High-Value Deal Escalation Alert',
      description: 'Sends instant notification to Company Owner whenever any deal stage moves above $25,000.',
      category: 'Deal Velocity',
      enabled: true,
      lastRun: '2 hours ago',
      runsCount: 38,
    },
    {
      id: 'wf_3',
      title: 'Staff Seat Quota Threshold Warning',
      description: 'Alerts the administrator when employee headcount reaches 90% of current subscription tier limit.',
      category: 'SaaS Quota',
      enabled: true,
      lastRun: 'Yesterday',
      runsCount: 12,
    },
    {
      id: 'wf_4',
      title: 'Daily Task & Follow-up SLA Reminder',
      description: 'Dispatches morning push notifications to sales reps for follow-up calls scheduled for today.',
      category: 'Reminders',
      enabled: false,
      lastRun: '3 days ago',
      runsCount: 89,
    },
    {
      id: 'wf_5',
      title: 'Customer Welcome Sequence on Closed Won',
      description: 'Sends automated onboarding package and contract receipt when deal is marked Closed Won.',
      category: 'Customer Onboarding',
      enabled: true,
      lastRun: '5 hours ago',
      runsCount: 65,
    },
  ]);

  const [toastMsg, setToastMsg] = useState('');

  const toggleWorkflow = (id) => {
    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.id === id) {
          const nextState = !wf.enabled;
          setToastMsg(`Workflow "${wf.title}" is now ${nextState ? 'Active' : 'Paused'}`);
          setTimeout(() => setToastMsg(''), 3000);
          return { ...wf, enabled: nextState };
        }
        return wf;
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Workflow Automation</h1>
          <p className="text-xs text-slate-500 mt-1">
            Automate sales pipeline routing, task SLA reminders, and deal milestone triggers
          </p>
        </div>

        <button
          onClick={() => {
            setToastMsg('Custom Automation Rule Builder opened');
            setTimeout(() => setToastMsg(''), 3000);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus size={16} />
          <span>Create Workflow</span>
        </button>
      </div>

      {/* Workflows List */}
      <div className="grid grid-cols-1 gap-4">
        {workflows.map((wf) => (
          <div
            key={wf.id}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-slate-300"
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  wf.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Zap size={20} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="font-bold text-slate-900 text-sm m-0">{wf.title}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                    {wf.category}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                  {wf.description}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2 font-medium">
                  <span>Last executed: <strong className="text-slate-600">{wf.lastRun}</strong></span>
                  <span>&bull;</span>
                  <span>Total runs: <strong className="text-slate-600">{wf.runsCount} executions</strong></span>
                </div>
              </div>
            </div>

            {/* Toggle switch */}
            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              <span
                className={`text-xs font-bold ${
                  wf.enabled ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {wf.enabled ? 'Active' : 'Paused'}
              </span>
              <button
                onClick={() => toggleWorkflow(wf.id)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 focus:outline-none ${
                  wf.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                    wf.enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Execution Activity Log */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0">Recent Automation Runs</h3>
            <p className="text-xs text-slate-400 mt-0.5">Automated actions executed by the CRM engine</p>
          </div>
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Engine Running</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-3">Workflow Name</th>
                <th className="py-3 px-3">Trigger Event</th>
                <th className="py-3 px-3">Target Contact / Deal</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Executed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-3 font-semibold text-slate-900">Auto-Assign Inbound Leads</td>
                <td className="py-3 px-3 text-slate-600">New Form Submission</td>
                <td className="py-3 px-3 text-slate-700">David Miller (Apex Logistics)</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Executed (Assigned to Sarah J.)
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-slate-400">14 mins ago</td>
              </tr>
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-3 font-semibold text-slate-900">High-Value Deal Alert</td>
                <td className="py-3 px-3 text-slate-600">Deal Value Updated ($48,000)</td>
                <td className="py-3 px-3 text-slate-700">Apex Global Logistics</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Notification Dispatched
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-slate-400">2 hours ago</td>
              </tr>
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-3 font-semibold text-slate-900">Customer Welcome Sequence</td>
                <td className="py-3 px-3 text-slate-600">Stage Moved: Closed Won</td>
                <td className="py-3 px-3 text-slate-700">Starlight Media ($95,000)</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Email Sent
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-slate-400">5 hours ago</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
