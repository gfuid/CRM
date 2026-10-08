import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Modal from '../components/Modal';
import {
  Eye,
  Calendar,
  RefreshCw,
  X,
  User,
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
  Globe,
  Building2,
  Layers,
  DollarSign,
  Clock,
  Send,
  FileText,
  Ship,
  Sparkles,
  History,
  Tag
} from 'lucide-react';
import { OUTREACH_COLUMNS, INITIAL_OUTREACH_LOGS } from '../data/outreachData';
import { SEED_LEADS } from '../data/seedLeads';

// Format date as Day / Month / Year (DD/MM/YYYY)
export const formatDMY = (dateStr, dateIso) => {
  if (dateIso && dateIso.includes('-')) {
    const parts = dateIso.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const y = parts[2];
      if (p1 > 12) {
        // Was M/D/YYYY (e.g. 9/26/2026) -> Day/Month/Year
        return `${String(p1).padStart(2, '0')}/${String(p0).padStart(2, '0')}/${y}`;
      }
      if (parts[0].length === 1 && p0 <= 12 && p1 <= 12) {
        // Single digit month at start (e.g. 9/5/2026) -> Day/Month/Year
        return `${String(p1).padStart(2, '0')}/${String(p0).padStart(2, '0')}/${y}`;
      }
      // Already DD/MM/YYYY
      return `${String(p0).padStart(2, '0')}/${String(p1).padStart(2, '0')}/${y}`;
    }
  }
  return dateStr;
};

export default function Outreach() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState(() =>
    INITIAL_OUTREACH_LOGS.map((item) => ({
      ...item,
      date: formatDMY(item.date, item.date_iso),
    }))
  );
  const [fromDate, setFromDate] = useState('2026-09-20');
  const [toDate, setToDate] = useState('2026-09-27');
  const [selectedUser, setSelectedUser] = useState('All users');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal 1: Daily Breakdown Modal (matches OneRoot screenshots 4 & 5)
  const [activeBreakdown, setActiveBreakdown] = useState(null);

  // Modal 2: Complete Lead Dossier Details ("eys clik pr sab trah ke details")
  const [activePreviewLead, setActivePreviewLead] = useState(null);

  // Persistent storage check on mount & normalize dates to DD/MM/YYYY
  useEffect(() => {
    try {
      const stored = localStorage.getItem('oneroot_outreach_v3');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map((item) => ({
            ...item,
            date: formatDMY(item.date, item.date_iso),
          }));
          setLogs(normalized);
          localStorage.setItem('oneroot_outreach_v3', JSON.stringify(normalized));
          return;
        }
      }
    } catch {}
    const normalizedInitial = INITIAL_OUTREACH_LOGS.map((item) => ({
      ...item,
      date: formatDMY(item.date, item.date_iso),
    }));
    setLogs(normalizedInitial);
  }, []);

  // Filter logs by date range & user
  const filteredLogs = logs.filter((log) => {
    if (selectedUser !== 'All users' && log.user !== selectedUser) {
      return false;
    }
    if (fromDate && log.date_iso < fromDate) {
      return false;
    }
    if (toDate && log.date_iso > toDate) {
      return false;
    }
    return true;
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  };

  // Open Full Lead Dossier when clicking any lead card
  const handleLeadClick = (leadSummary) => {
    // 1. Try to find the exact lead in SEED_LEADS or localStorage
    let fullLead = null;
    try {
      const localLeads = JSON.parse(localStorage.getItem('oneroot_leads_v3') || '[]');
      if (Array.isArray(localLeads) && localLeads.length > 0) {
        fullLead = localLeads.find(
          (l) =>
            (l.company_name && l.company_name.toLowerCase() === leadSummary.company_name?.toLowerCase()) ||
            (l.name && l.name.toLowerCase() === leadSummary.company_name?.toLowerCase())
        );
      }
    } catch {}

    if (!fullLead) {
      fullLead = SEED_LEADS.find(
        (l) =>
          (l.company_name && l.company_name.toLowerCase() === leadSummary.company_name?.toLowerCase()) ||
          (l.name && l.name.toLowerCase() === leadSummary.company_name?.toLowerCase())
      );
    }

    if (fullLead) {
      setActivePreviewLead(fullLead);
    } else {
      // Build a comprehensive lead object from summary
      setActivePreviewLead({
        id: leadSummary.id || 'lead_prev_' + Date.now(),
        company_name: leadSummary.company_name,
        name: leadSummary.company_name,
        country: leadSummary.country || 'India 🇮🇳',
        type: 'Export',
        contact_person: leadSummary.contact_person || 'Procurement Manager',
        phone: leadSummary.phone || '+91 98452 11890',
        email: leadSummary.email || 'procurement@company.com',
        website: 'https://' + leadSummary.company_name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
        address: 'Industrial Processing Zone, India',
        products: leadSummary.product ? [leadSummary.product] : ['Agricultural Commodities'],
        quantity: leadSummary.quantity || 50000,
        price: leadSummary.price || 50000,
        stage: leadSummary.stage || 'Requirement Understood',
        agent_name: activeBreakdown?.user || 'Shiva',
        activity_history: [
          {
            activity: 'Call initiated',
            date: `${formatDMY(activeBreakdown?.date, activeBreakdown?.date_iso) || '26/09/2026'} · ${leadSummary.time || '11:00 AM'}`,
            note: leadSummary.note || 'Discussed product specs and shipment schedule',
            author: `by ${activeBreakdown?.user || 'Shiva'}`,
          },
        ],
        previous_remarks: [
          {
            remark: leadSummary.note || 'Follow up scheduled',
            date: `${formatDMY(activeBreakdown?.date, activeBreakdown?.date_iso) || '26/09/2026'}`,
            author: activeBreakdown?.user || 'Shiva',
          },
        ],
        export_requirements: {
          incoterm: 'CIF',
          port_delivery: 'Nhava Sheva / Mundra Port',
          payment_days: 'CAD on BL copy',
          polish_level: 'Machine Cleaned',
        },
      });
    }
  };

  const allUserOptions = ['All users', 'adric', 'Shiva', 'Rohan', 'David', 'Preetham', 'aarav', 'Rahul'];

  return (
    <div className="space-y-6 antialiased pb-12">
      {/* Page Header matching OneRoot CRM */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Outreach
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Daily calls, emails, WhatsApp and lead touches by user
        </p>
      </div>

      {/* FILTER BAR - EXACT MATCH TO ONEROOT SCREENSHOT 3 */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-end gap-3 sm:gap-4">
          {/* FROM Date */}
          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              From
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10 px-3.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* TO Date */}
          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              To
            </label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-10 px-3.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* USER Selector */}
          <div className="space-y-1 min-w-[140px]">
            <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              User
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="h-10 w-full px-3.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              {allUserOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button - Vivid Purple pill matching OneRoot */}
          <div>
            <button
              type="button"
              onClick={handleRefresh}
              className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* OUTREACH SUMMARY TABLE - EXACT MATCH TO ONEROOT SCREENSHOT 3 */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-white font-extrabold uppercase text-[10px] tracking-wider whitespace-nowrap">
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5">User</th>
                <th className="py-3 px-3 text-center">New Lead</th>
                <th className="py-3 px-3 text-center">Call Initiated</th>
                <th className="py-3 px-3 text-center">Email</th>
                <th className="py-3 px-3 text-center">WhatsApp Text/Zalo</th>
                <th className="py-3 px-3 text-center">Response</th>
                <th className="py-3 px-3 text-center">Meeting</th>
                <th className="py-3 px-3 text-center">Price Discussion</th>
                <th className="py-3 px-3 text-center">Payment Discussion</th>
                <th className="py-3 px-3 text-center">Sample Discussion</th>
                <th className="py-3 px-3 text-center">Sample Sent</th>
                <th className="py-3 px-3.5 text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="13" className="py-12 text-center text-slate-400 text-xs">
                    No outreach activities recorded for this date range or user.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((row, idx) => {
                  const isTinted = idx % 2 === 0;
                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        isTinted
                          ? 'bg-rose-50/20 dark:bg-slate-850/60 hover:bg-rose-50/40'
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3.5 px-3.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {formatDMY(row.date, row.date_iso)}
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span>{row.user}</span>
                        </span>
                      </td>

                      {/* Counts across 10 activities */}
                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.new_lead > 0 ? (
                          <span className="text-purple-700 dark:text-purple-400 font-extrabold">{row.counts.new_lead}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.call_initiated > 0 ? (
                          <span className="text-cyan-700 dark:text-cyan-400 font-black">{row.counts.call_initiated}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.email > 0 ? (
                          <span className="text-indigo-700 dark:text-indigo-400 font-extrabold">{row.counts.email}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.whatsapp > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-extrabold">{row.counts.whatsapp}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.response > 0 ? (
                          <span className="text-rose-700 dark:text-rose-400 font-extrabold">{row.counts.response}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.meeting > 0 ? (
                          <span className="text-orange-700 dark:text-orange-400 font-extrabold">{row.counts.meeting}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.price_discussion > 0 ? (
                          <span className="text-amber-700 dark:text-amber-400 font-extrabold">{row.counts.price_discussion}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.payment_discussion > 0 ? (
                          <span className="text-teal-700 dark:text-teal-400 font-extrabold">{row.counts.payment_discussion}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.sample_discussion > 0 ? (
                          <span className="text-cyan-800 dark:text-cyan-300 font-extrabold">{row.counts.sample_discussion}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.sample_sent > 0 ? (
                          <span className="text-purple-800 dark:text-purple-300 font-extrabold">{row.counts.sample_sent}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Detail Button: purple pill matching OneRoot */}
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setActiveBreakdown(row)}
                          className="px-3 py-1 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer mx-auto"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: DAILY BREAKDOWN OVERLAY (EXACT ONEROOT SCREENSHOT 4 & 5 MATCH) */}
      {activeBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-[96vw] xl:max-w-7xl max-h-[92vh] flex flex-col bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
            {/* Dark Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-start justify-between bg-slate-950 text-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800">
                  Daily Breakdown
                </span>
                <h2 className="text-2xl sm:text-3xl font-black mt-1 text-white tracking-tight">
                  {activeBreakdown.user}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDMY(activeBreakdown.date, activeBreakdown.date_iso)} · Click a lead for preview
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveBreakdown(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close Breakdown"
              >
                <X size={18} />
              </button>
            </div>

            {/* Horizontal Multi-Column Board for All Activities */}
            <div className="flex-1 overflow-x-auto overflow-y-auto p-4 bg-slate-900/90 text-xs">
              <div className="flex gap-3 min-w-max pb-2">
                {OUTREACH_COLUMNS.map((col) => {
                  const items = activeBreakdown.activities?.[col.key] || [];
                  const count = activeBreakdown.counts?.[col.key] || items.length || 0;

                  return (
                    <div
                      key={col.key}
                      className="w-72 sm:w-80 flex flex-col bg-slate-50/70 dark:bg-slate-850/80 rounded-2xl border border-slate-700/60 overflow-hidden shrink-0 shadow-xs"
                    >
                      {/* Column Header */}
                      <div
                        className={`p-2.5 px-3 text-center text-white font-black text-xs uppercase tracking-wider ${col.headerBg} flex items-center justify-center gap-1.5 shadow-xs`}
                      >
                        <span>{col.label}</span>
                        <span className="bg-white/25 px-2 py-0.2 rounded-full text-[11px] font-black">
                          {count}
                        </span>
                      </div>

                      {/* Leads / Activity Cards in this column */}
                      <div className="flex-1 p-2.5 space-y-2.5 min-h-[300px] max-h-[58vh] overflow-y-auto">
                        {items.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-slate-500 text-[11px] italic py-16">
                            — No activities —
                          </div>
                        ) : (
                          items.map((card, cIdx) => (
                            <div
                              key={cIdx}
                              onClick={() => handleLeadClick(card)}
                              className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer space-y-1.5 text-left group"
                              title="Click to view full lead details"
                            >
                              <div className="font-extrabold text-slate-900 dark:text-white text-xs group-hover:text-purple-600 transition-colors">
                                {card.company_name}
                              </div>
                              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                {card.contact_person}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {card.time}
                              </div>
                              <div className="text-[11px] text-slate-700 dark:text-slate-300 font-normal pt-1 border-t border-slate-100 dark:border-slate-700/60 leading-relaxed">
                                {card.note}
                              </div>
                              <div className="pt-1 flex items-center justify-between text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                                <span>Preview details</span>
                                <Eye size={11} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: COMPLETE LEAD DOSSIER VIEW ("eys clik pr sab trah ke details") */}
      {activePreviewLead && (
        <Modal
          isOpen={Boolean(activePreviewLead)}
          onClose={() => setActivePreviewLead(null)}
          title={activePreviewLead.company_name || activePreviewLead.name}
          subtitle={`View customer details · Created ${activePreviewLead.created_at ? new Date(activePreviewLead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '23 Sep 2026'}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-5 text-xs max-h-[78vh] overflow-y-auto pr-1">
            {/* Header Status Badges Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  📅 Created {activePreviewLead.created_at ? new Date(activePreviewLead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '23 Sep 2026'}
                </span>
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-purple-50 text-purple-800 border border-purple-200">
                  {activePreviewLead.stage || activePreviewLead.status || 'Requirement Understood'}
                </span>
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                  {activePreviewLead.type === 'Domestic' ? '🏠 Domestic' : '🌐 Export'}
                </span>
                {activePreviewLead.follow_up_date && (
                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    ⏰ Follow-up: {activePreviewLead.follow_up_date}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                  👤 Rep: {activePreviewLead.agent_name || activeBreakdown?.user || 'Shiva'}
                </span>
              </div>
            </div>

            {/* Target Commodities & Contract Value */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
                <div className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-400">Target Commodities</div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(Array.isArray(activePreviewLead.products) && activePreviewLead.products.length > 0
                    ? activePreviewLead.products
                    : (activePreviewLead.product ? activePreviewLead.product.split(',').map(p => p.trim()) : ['Rice DDGS'])
                  ).map((p, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-black bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 border border-amber-300 shadow-2xs">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-gradient-to-br from-rose-50/80 via-pink-50/50 to-indigo-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-xs">
                <div className="text-[10px] font-bold uppercase text-rose-800 dark:text-rose-400">Contract Value & Quantity</div>
                {(() => {
                  const dealVal = Number(activePreviewLead.price) || Number(activePreviewLead.value) || 0;
                  const dealQty = Number(activePreviewLead.quantity) || 0;
                  const unit = activePreviewLead.quantity_unit || (dealQty >= 1000 ? 'kg' : 'MT');
                  const lakhs = (dealVal / 100000).toFixed(2);
                  const isMT = unit.toLowerCase() === 'mt' || unit.toLowerCase().includes('tonne');
                  const mt = isMT ? dealQty : (dealQty / 1000);
                  return (
                    <div className="mt-1">
                      <div className="text-base font-black text-rose-950 dark:text-rose-200">
                        {dealVal > 0 ? `₹${dealVal.toLocaleString('en-IN')}` : '₹0 (Unpriced inquiry)'}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        {dealVal >= 100000 ? `₹${lakhs} Lakhs INR • ` : ''}
                        {dealQty.toLocaleString()} {unit} {mt > 0 && !isMT ? `(≈ ${mt.toFixed(1)} MT)` : ''}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Customer Contact Details */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="font-extrabold text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="flex items-center gap-1.5 text-xs">
                  <User size={14} className="text-rose-600 dark:text-rose-400" /> Customer & Buyer Details
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {activePreviewLead.country}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100 flex justify-between items-center">
                    <span className="text-xs">{activePreviewLead.contact_person || 'Contact Person'}</span>
                    <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-bold">
                      Procurement
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 text-[11px] space-y-1">
                    {activePreviewLead.phone && (
                      <div className="flex items-center justify-between">
                        <span>📞 {activePreviewLead.phone}</span>
                        <a
                          href={`https://wa.me/${String(activePreviewLead.phone).replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-0.5"
                        >
                          <MessageCircle size={10} /> Chat WA
                        </a>
                      </div>
                    )}
                    {activePreviewLead.email && (
                      <div>
                        <a href={`mailto:${activePreviewLead.email}`} className="text-blue-600 hover:underline">
                          ✉️ {activePreviewLead.email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 text-[11px] space-y-1.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200">Company Location & Address</div>
                  <div className="text-slate-600 dark:text-slate-400">
                    {activePreviewLead.address || 'Industrial Area / Commercial Trading Zone'}
                  </div>
                  {activePreviewLead.website && (
                    <div className="flex items-center gap-1 pt-0.5">
                      <Globe size={11} className="text-slate-400" />
                      <a href={activePreviewLead.website.startsWith('http') ? activePreviewLead.website : `https://${activePreviewLead.website}`} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold underline">
                        {activePreviewLead.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Daily Activity History */}
            {activePreviewLead.activity_history && activePreviewLead.activity_history.length > 0 && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5">
                    <History size={14} className="text-indigo-600" /> Logged Activities History ({activePreviewLead.activity_history.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {activePreviewLead.activity_history.map((hist, hIdx) => (
                    <div key={hIdx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 text-[10px]">
                          {hist.activity}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{hist.date}</span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-200 font-medium">{hist.note}</div>
                      <div className="text-[10px] text-slate-400 text-right">{hist.author}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActivePreviewLead(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
