import React, { useState, useEffect } from 'react';
import {
  Search,
  AlertCircle,
  Edit2,
  Calendar,
  CalendarDays,
  Target,
  User,
  Phone,
  Mail,
  Building2,
  Globe,
  Tag,
  DollarSign,
  Clock,
  CheckCircle2,
  Check,
  X,
  ChevronDown,
  ExternalLink,
  MessageCircle,
  Sparkles
} from 'lucide-react';
import Modal from '../components/Modal';
import OneRootCustomerModal from '../components/OneRootCustomerModal';
import { api } from '../services/api';

const STAGES = [
  'Lead Generation',
  'Contact Established',
  'Requirement Understood',
  'Quotation Sent',
  'Closed Won',
  'Closed Lost'
];

export default function FollowUp() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [responsibleFilter, setResponsibleFilter] = useState('All responsible');
  const [activeTab, setActiveTab] = useState('overdue'); // 'overdue' | 'all'
  const [hoveredRowId, setHoveredRowId] = useState(null);

  // Edit / View Customer Modal
  const [editingLead, setEditingLead] = useState(null);

  // Dedicated Quick Follow-up Modal (Current interaction remarks vs. Planned future action)
  const [quickLead, setQuickLead] = useState(null);
  const [quickTodayRemark, setQuickTodayRemark] = useState('');
  const [quickNextDate, setQuickNextDate] = useState('');
  const [quickNextTime, setQuickNextTime] = useState('10:00');
  const [quickFutureAction, setQuickFutureAction] = useState('');
  const [quickStage, setQuickStage] = useState('');
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  // Load leads from API and local storage
  useEffect(() => {
    const fetchFollowUps = async () => {
      // 1. Read and clean local storage
      try {
        const stored = localStorage.getItem('oneroot_leads_v3');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const clean = parsed.filter(
              (l) =>
                !l.id?.startsWith('lead_') &&
                l.company_name !== 'Gk Optotorg LLC' &&
                l.company_name !== 'Baltimport LLC' &&
                l.company_name !== 'Al-Barakah Global Agro Foods LLC'
            );
            setLeads(clean);
          }
        }
      } catch {}

      // 2. Fetch fresh real leads from server API
      try {
        const res = await api.getLeads();
        if (res && res.success && Array.isArray(res.data)) {
          setLeads(res.data);
          try {
            localStorage.setItem('oneroot_leads_v3', JSON.stringify(res.data));
          } catch {}
        }
      } catch (err) {
        console.warn('FollowUp API fetch error:', err.message);
      }
    };

    fetchFollowUps();
  }, []);

  const saveLeads = (newLeads) => {
    setLeads(newLeads);
    try {
      localStorage.setItem('oneroot_leads_v3', JSON.stringify(newLeads));
    } catch {}
  };

  // Current real date
  const today = new Date();

  // Helper to format date like "May 27, 2026"
  const formatFollowDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate days overdue
  const getDaysOverdue = (dateStr) => {
    if (!dateStr) return 0;
    const followDate = new Date(dateStr);
    const diff = Math.ceil((today - followDate) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // Overdue leads: follow_up_date before today
  const overdueLeads = leads.filter((l) => {
    if (!l.follow_up_date) return false;
    const fDate = new Date(l.follow_up_date);
    return fDate < today;
  });

  // All leads with follow-up scheduled
  const allFollowUpLeads = leads.filter((l) => Boolean(l.follow_up_date));

  // Determine active dataset
  const baseList = activeTab === 'overdue' ? overdueLeads : allFollowUpLeads;

  // Sort by most overdue / closest date first
  const sortedLeads = [...baseList].sort((a, b) => {
    return new Date(a.follow_up_date) - new Date(b.follow_up_date);
  });

  // Filter by search & responsible person
  const filteredLeads = sortedLeads.filter((l) => {
    const compName = (l.name || l.company_name || '').toLowerCase();
    const contact = (l.contact_person || '').toLowerCase();
    const assigned = (l.assigned_to || l.agent_name || '').toLowerCase();
    const planned = (l.next_follow_up_action || '').toLowerCase();
    const current = (l.today_remarks || '').toLowerCase();

    if (search) {
      const q = search.toLowerCase();
      if (
        !compName.includes(q) &&
        !contact.includes(q) &&
        !assigned.includes(q) &&
        !planned.includes(q) &&
        !current.includes(q)
      ) {
        return false;
      }
    }

    if (responsibleFilter !== 'All responsible' && assigned !== responsibleFilter.toLowerCase()) {
      return false;
    }

    return true;
  });

  // Unique list of responsible reps
  const distinctResponsible = [
    'All responsible',
    ...new Set(sortedLeads.map((l) => l.assigned_to || l.agent_name).filter(Boolean))
  ];

  // Open full edit modal
  const handleOpenEdit = (lead, e) => {
    if (e) e.stopPropagation();
    setEditingLead(lead);
  };

  // Open quick follow-up modal
  const handleOpenQuick = (lead, e) => {
    if (e) e.stopPropagation();
    setQuickLead(lead);
    setQuickTodayRemark('');
    // Default next date to 2 days from today
    const nextD = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
    setQuickNextDate(nextD);
    setQuickNextTime(lead.follow_up_time || lead.time || '10:00');
    setQuickFutureAction('');
    setQuickStage(lead.stage || lead.status || 'Requirement Understood');
  };

  // Save quick follow-up modal
  const handleSaveQuick = async (e) => {
    e.preventDefault();
    if (!quickLead) return;
    if (!quickNextDate) {
      alert('Please select the next follow-up date.');
      return;
    }

    setIsSubmittingQuick(true);
    try {
      const now = new Date();
      const formattedTimestamp = now.toLocaleString('en-US');
      const formattedDate = now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const entryText = [
        quickTodayRemark.trim() ? `[Today's Interaction]: ${quickTodayRemark.trim()}` : null,
        quickFutureAction.trim() ? `[Planned Action on ${quickNextDate} at ${quickNextTime || '10:00'}]: ${quickFutureAction.trim()}` : null,
      ].filter(Boolean).join(' | ');

      const newRemarkEntry = {
        today_remark: quickTodayRemark.trim(),
        planned_action: quickFutureAction.trim(),
        text: entryText,
        remark: entryText,
        follow_up_date: quickNextDate,
        follow_up_time: quickNextTime || '10:00',
        timestamp: formattedTimestamp,
        date: formattedDate,
        author: quickLead.assigned_to || 'User',
      };

      const updatedRemarks = [
        newRemarkEntry,
        ...(quickLead.previous_remarks || []),
      ];

      const isStillOverdue = new Date(quickNextDate) < today;
      const diff = Math.ceil((today - new Date(quickNextDate)) / (1000 * 60 * 60 * 24));

      const updatedLead = {
        ...quickLead,
        follow_up_date: quickNextDate,
        follow_up_time: quickNextTime || '10:00',
        today_remarks: quickTodayRemark.trim() || quickLead.today_remarks || '',
        next_follow_up_action: quickFutureAction.trim() || quickLead.next_follow_up_action || '',
        stage: quickStage,
        status: quickStage,
        lead_stage: quickStage,
        previous_remarks: updatedRemarks,
        follow_up_status: isStillOverdue ? (diff > 7 ? 'risk' : 'idle_critical') : 'active',
        follow_up_badge: isStillOverdue
          ? `● ${diff > 7 ? 'RISK' : 'IDLE CRITICAL'} · FOLLOW-UP OVERDUE ${diff} DAYS`
          : '● ACTIVE · ON TRACK',
      };

      const nextList = leads.map((l) => (l.id === updatedLead.id ? updatedLead : l));
      saveLeads(nextList);

      try {
        await api.updateLead(updatedLead.id, {
          follow_up_date: quickNextDate,
          follow_up_time: quickNextTime || '10:00',
          today_remarks: updatedLead.today_remarks,
          next_follow_up_action: updatedLead.next_follow_up_action,
          stage: quickStage,
          status: quickStage,
          previous_remarks: updatedRemarks,
        });
      } catch (err) {
        console.warn('API error saving quick follow-up:', err);
      }

      setQuickLead(null);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  // Save edited customer from OneRootCustomerModal
  const handleSaveCustomer = async (updatedLead) => {
    const isStillOverdue = new Date(updatedLead.follow_up_date) < today;
    const diff = Math.ceil((today - new Date(updatedLead.follow_up_date)) / (1000 * 60 * 60 * 24));
    const processedLead = {
      ...updatedLead,
      follow_up_status: isStillOverdue ? (diff > 7 ? 'risk' : 'idle_critical') : 'active',
      follow_up_badge: isStillOverdue
        ? `● ${diff > 7 ? 'RISK' : 'IDLE CRITICAL'} · FOLLOW-UP OVERDUE ${diff} DAYS`
        : '● ACTIVE · ON TRACK'
    };
    const updated = leads.map((l) => (l.id === processedLead.id ? processedLead : l));
    saveLeads(updated);

    try {
      await api.updateLead(processedLead.id, processedLead);
    } catch (err) {
      console.warn('API updateLead failed:', err);
    }

    setEditingLead(null);
  };

  // Delete lead from OneRootCustomerModal
  const handleDeleteCustomer = (leadId) => {
    const updated = leads.filter((l) => l.id !== leadId);
    saveLeads(updated);
    try {
      api.deleteLead(leadId);
    } catch {}
    setEditingLead(null);
  };

  // Status pill theme helper
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Closed Lost':
        return 'bg-amber-100 text-amber-900 border border-amber-200';
      case 'Lead Generation':
        return 'bg-amber-100 text-amber-900 border border-amber-200';
      case 'Contact Established':
        return 'bg-blue-100 text-blue-900 border border-blue-200';
      case 'Requirement Understood':
        return 'bg-purple-100 text-purple-900 border border-purple-200';
      case 'Quotation Sent':
        return 'bg-yellow-100 text-yellow-900 border border-yellow-200';
      case 'Closed Won':
        return 'bg-emerald-100 text-emerald-900 border border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Follow up</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage scheduled client follow-ups, today's interaction logs, and future planned actions
          </p>
        </div>

        {/* Tab Toggle: Overdue vs. All */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'overdue'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overdue ({overdueLeads.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Follow-ups ({allFollowUpLeads.length})
          </button>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
        {/* Banner */}
        {activeTab === 'overdue' ? (
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl px-4 py-3 flex items-center justify-between text-rose-700 text-xs font-bold">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{overdueLeads.length} leads with overdue follow-up dates. Action required today!</span>
            </div>
            <span className="hidden sm:inline text-[11px] font-semibold text-rose-500">
              Log today's interaction and set future planned date
            </span>
          </div>
        ) : (
          <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl px-4 py-3 flex items-center justify-between text-purple-800 text-xs font-bold">
            <div className="flex items-center gap-2.5">
              <CalendarDays size={16} className="text-purple-600 shrink-0" />
              <span>Showing all {allFollowUpLeads.length} active leads with scheduled follow-ups.</span>
            </div>
          </div>
        )}

        {/* Search & Responsible Dropdown Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search company, contact, responsible, planned action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-2xs"
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={responsibleFilter}
              onChange={(e) => setResponsibleFilter(e.target.value)}
              className="w-full sm:w-auto appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-8 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer shadow-2xs"
            >
              {distinctResponsible.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
          </div>
        </div>

        {/* Structured Follow-up Table with Separate Remarks & Planned Action */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4 font-black">COMPANY & CONTACT</th>
                <th className="py-3.5 px-4 font-black">RESPONSIBLE</th>
                <th className="py-3.5 px-4 font-black">FOLLOW-UP DATE</th>
                <th className="py-3.5 px-4 font-black min-w-[280px]">
                  CURRENT NOTES & PLANNED ACTION
                </th>
                <th className="py-3.5 px-4 font-black">STATUS</th>
                <th className="py-3.5 px-4 font-black text-right min-w-[140px]">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No follow-up leads match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const days = getDaysOverdue(lead.follow_up_date);
                  const isHovered = hoveredRowId === lead.id;
                  const isOverdue = new Date(lead.follow_up_date) < today;

                  // Extract latest interaction remarks and planned action
                  const lastInteraction =
                    lead.today_remarks ||
                    lead.previous_remarks?.[0]?.today_remark ||
                    lead.notes ||
                    '';

                  const plannedAction =
                    lead.next_follow_up_action ||
                    lead.previous_remarks?.[0]?.planned_action ||
                    '';

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => handleOpenEdit(lead)}
                      onMouseEnter={() => setHoveredRowId(lead.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                      className="hover:bg-purple-50/30 transition-colors group cursor-pointer relative"
                    >
                      {/* COMPANY & CONTACT */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                          {lead.name || lead.company_name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                          <span>{lead.contact_person || '—'}</span>
                          {lead.country && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-[10px] text-slate-400">{lead.country}</span>
                            </>
                          )}
                        </div>

                        {/* Tooltip */}
                        {isHovered && (
                          <div className="absolute left-6 -top-7 z-20 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                            Click to view and edit customer details
                          </div>
                        )}
                      </td>

                      {/* RESPONSIBLE */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {lead.assigned_to || lead.agent_name || 'Rohan'}
                      </td>

                      {/* FOLLOW-UP DATE & OVERDUE DAYS */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              isOverdue ? 'text-rose-600' : 'text-slate-800'
                            }`}
                          >
                            {formatFollowDate(lead.follow_up_date)}
                          </span>
                          {lead.follow_up_time && (
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-bold border border-purple-200/60 flex items-center gap-0.5">
                              <Clock size={9} />
                              <span>{lead.follow_up_time}</span>
                            </span>
                          )}
                        </div>
                        {isOverdue ? (
                          <div className="text-[10px] font-bold text-rose-500 mt-0.5">
                            {days} days overdue
                          </div>
                        ) : (
                          <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                            Scheduled on track
                          </div>
                        )}
                      </td>

                      {/* SEPARATE CURRENT REMARKS & PLANNED ACTION */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5 max-w-sm">
                          {/* Planned Action for Follow-up Date */}
                          <div className="flex items-start gap-1.5 text-[11px] bg-purple-50/70 p-1.5 rounded-lg border border-purple-200/60">
                            <Target size={12} className="text-purple-600 shrink-0 mt-0.5" />
                            <div className="leading-tight">
                              <span className="font-bold text-purple-900 text-[10px] block">
                                Planned Action:
                              </span>
                              <span className="text-purple-950 font-medium line-clamp-1">
                                {plannedAction || 'Pending next action instructions'}
                              </span>
                            </div>
                          </div>

                          {/* Last Interaction Remarks */}
                          {lastInteraction && (
                            <div className="flex items-start gap-1.5 text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-200/60 text-slate-600">
                              <MessageCircle size={12} className="text-slate-400 shrink-0 mt-0.5" />
                              <div className="leading-tight">
                                <span className="font-bold text-slate-700 text-[10px] block">
                                  Last Interaction Note:
                                </span>
                                <span className="text-slate-700 line-clamp-1">
                                  {lastInteraction}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadgeClass(
                            lead.stage || lead.status
                          )}`}
                        >
                          {lead.stage || lead.status}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="Log today's interaction remark and set next follow-up date"
                            onClick={(e) => handleOpenQuick(lead, e)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                          >
                            <CalendarDays size={12} />
                            <span>Log Action</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(lead, e)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-medium pt-2">
          <span>
            Showing <strong className="text-slate-800">{filteredLeads.length}</strong> of{' '}
            <strong className="text-slate-800">{baseList.length}</strong> follow-up leads
          </span>
          <span className="text-[11px] text-slate-400">
            Click <strong>Log Action</strong> to update today's interaction and set future planned action.
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* QUICK FOLLOW-UP ACTION MODAL (Current vs Future separation)    */}
      {/* ============================================================== */}
      {quickLead && (
        <Modal
          isOpen={!!quickLead}
          onClose={() => setQuickLead(null)}
          title="Log Follow-up & Schedule Planned Action"
          size="md"
        >
          <form onSubmit={handleSaveQuick} className="space-y-4">
            {/* Header info card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-900">
                  {quickLead.name || quickLead.company_name}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Contact: {quickLead.contact_person || '—'} &bull; Rep: {quickLead.assigned_to || 'Sales Team'}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadgeClass(
                  quickStage
                )}`}
              >
                {quickStage}
              </span>
            </div>

            {/* Field 1: Remarks/notes for today's interaction */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <MessageCircle size={13} className="text-blue-600" />
                  <span>Remarks / Notes for Today's Interaction <span className="text-rose-500 font-extrabold">* (Mandatory)</span></span>
                </label>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                  Today's Call / Note
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Record current details of what happened or was discussed today with this customer.
              </p>
              <textarea
                rows={3}
                required
                placeholder="e.g. Called customer today. Discussed revised packaging requirements and payment terms. Customer requested 2 days to confirm proforma..."
                value={quickTodayRemark}
                onChange={(e) => setQuickTodayRemark(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
              />
            </div>

            {/* Next Follow-up Date & Call Timing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar size={13} className="text-purple-600" />
                  <span>Next Scheduled Follow-up Date <span className="text-rose-500 font-extrabold">* (Mandatory)</span></span>
                </label>
                <input
                  type="date"
                  required
                  value={quickNextDate}
                  onChange={(e) => setQuickNextDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock size={13} className="text-purple-600" />
                  <span>Call Timing / Scheduled Time <span className="text-rose-500 font-extrabold">* (Mandatory)</span></span>
                </label>
                <input
                  type="time"
                  required
                  value={quickNextTime || '10:00'}
                  onChange={(e) => setQuickNextTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Field 2: Planned action/remarks for future follow-up date */}
            <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <Target size={13} className="text-purple-600" />
                  <span>Planned Action / Remarks for Future Date <span className="text-rose-500 font-extrabold">* (Mandatory)</span></span>
                </label>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full">
                  Dedicated Action on {quickNextDate || 'Scheduled Date'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Dedicated instructions for what specific action to execute on that future follow-up date.
              </p>
              <textarea
                rows={3}
                placeholder="e.g. Call back buyer to verify deposit receipt, confirm container booking with shipping line..."
                value={quickFutureAction}
                onChange={(e) => setQuickFutureAction(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-2xs"
              />
            </div>

            {/* Optional Stage Advancement */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Update Deal Stage (Optional)
              </label>
              <select
                value={quickStage}
                onChange={(e) => setQuickStage(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setQuickLead(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingQuick}
                className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-xl shadow-md shadow-purple-600/25 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check size={14} />
                <span>{isSubmittingQuick ? 'Saving...' : 'Save Follow-up & Remarks'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* VIEW & EDIT CUSTOMER MODAL ("Click to view and edit customer") */}
      {/* ============================================================== */}
      {editingLead && (
        <OneRootCustomerModal
          isOpen={!!editingLead}
          onClose={() => setEditingLead(null)}
          lead={editingLead}
          onSave={handleSaveCustomer}
          onDelete={handleDeleteCustomer}
        />
      )}
    </div>
  );
}
