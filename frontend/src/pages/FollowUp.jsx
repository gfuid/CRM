import React, { useState, useEffect } from 'react';
import {
  Search,
  AlertCircle,
  Edit2,
  Calendar,
  User,
  Phone,
  Mail,
  Building2,
  Globe,
  Tag,
  DollarSign,
  Clock,
  CheckCircle2,
  X,
  ChevronDown,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import Modal from '../components/Modal';
import OneRootCustomerModal from '../components/OneRootCustomerModal';
import { SEED_LEADS } from '../data/seedLeads';

const STAGES = [
  'Lead Generation',
  'Contact Established',
  'Requirement Understood',
  'Quotation Sent',
  'Closed Won',
  'Closed Lost'
];

export default function FollowUp() {
  const [leads, setLeads] = useState(SEED_LEADS);
  const [search, setSearch] = useState('');
  const [responsibleFilter, setResponsibleFilter] = useState('All responsible');
  const [hoveredRowId, setHoveredRowId] = useState(null);

  // Edit / View Customer Modal
  const [editingLead, setEditingLead] = useState(null);
  const [editFormData, setEditFormData] = useState(null);

  // Load leads from storage or default to SEED_LEADS
  useEffect(() => {
    try {
      const stored = localStorage.getItem('oneroot_leads_v3');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= 200) {
          setLeads(parsed);
          return;
        }
      }
      localStorage.setItem('oneroot_leads_v3', JSON.stringify(SEED_LEADS));
      setLeads(SEED_LEADS);
    } catch {
      setLeads(SEED_LEADS);
    }
  }, []);

  const saveLeads = (newLeads) => {
    setLeads(newLeads);
    try {
      localStorage.setItem('oneroot_leads_v3', JSON.stringify(newLeads));
    } catch {}
  };

  // Reference date: Sep 27, 2026
  const today = new Date('2026-09-27');

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

  // Sort by most overdue first (oldest follow_up_date first)
  const sortedOverdue = [...overdueLeads].sort((a, b) => {
    return new Date(a.follow_up_date) - new Date(b.follow_up_date);
  });

  // Filter by search & responsible person
  const filteredLeads = sortedOverdue.filter((l) => {
    const compName = (l.name || l.company_name || '').toLowerCase();
    const contact = (l.contact_person || '').toLowerCase();
    const assigned = (l.assigned_to || l.agent_name || '').toLowerCase();

    if (search) {
      const q = search.toLowerCase();
      if (!compName.includes(q) && !contact.includes(q) && !assigned.includes(q)) {
        return false;
      }
    }

    if (responsibleFilter !== 'All responsible' && assigned !== responsibleFilter.toLowerCase()) {
      return false;
    }

    return true;
  });

  // Unique list of responsible reps from overdue leads
  const distinctResponsible = [
    'All responsible',
    ...new Set(sortedOverdue.map((l) => l.assigned_to || l.agent_name).filter(Boolean))
  ];

  // Open edit modal
  const handleOpenEdit = (lead, e) => {
    if (e) e.stopPropagation();
    setEditingLead(lead);
  };

  // Save edited customer from OneRootCustomerModal
  const handleSaveCustomer = (updatedLead) => {
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
    setEditingLead(null);
  };

  // Delete lead from OneRootCustomerModal
  const handleDeleteCustomer = (leadId) => {
    const updated = leads.filter((l) => l.id !== leadId);
    saveLeads(updated);
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
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Follow up</h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Overdue follow-ups across all leads
        </p>
      </div>

      {/* Main Container Card (matching OneRoot Screenshot) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
        {/* Red / Rose Alert Banner */}
        <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl px-4 py-3 flex items-center gap-2.5 text-rose-700 text-xs font-bold">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{overdueLeads.length} leads with overdue follow-up dates.</span>
        </div>

        {/* Search & Responsible Dropdown Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search company, contact, responsible..."
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

        {/* Structured Overdue Follow-up Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4 font-black">COMPANY</th>
                <th className="py-3.5 px-4 font-black">CONTACT</th>
                <th className="py-3.5 px-4 font-black">RESPONSIBLE</th>
                <th className="py-3.5 px-4 font-black">FOLLOW-UP DATE</th>
                <th className="py-3.5 px-4 font-black">DAYS OVERDUE</th>
                <th className="py-3.5 px-4 font-black">STATUS</th>
                <th className="py-3.5 px-4 font-black text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No overdue follow-up leads match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const days = getDaysOverdue(lead.follow_up_date);
                  const isHovered = hoveredRowId === lead.id;

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => handleOpenEdit(lead)}
                      onMouseEnter={() => setHoveredRowId(lead.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                      className="hover:bg-rose-50/40 transition-colors group cursor-pointer relative"
                    >
                      {/* COMPANY with Tooltip */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-purple-600 transition-colors relative">
                        <span>{lead.name || lead.company_name}</span>

                        {/* Tooltip matching OneRoot screenshot */}
                        {isHovered && (
                          <div className="absolute left-8 -top-7 z-20 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                            Click to view and edit customer
                          </div>
                        )}
                      </td>

                      {/* CONTACT */}
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {lead.contact_person || '—'}
                      </td>

                      {/* RESPONSIBLE */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {lead.assigned_to || lead.agent_name || 'Rohan'}
                      </td>

                      {/* FOLLOW-UP DATE */}
                      <td className="py-3.5 px-4 font-bold text-rose-600 whitespace-nowrap">
                        {formatFollowDate(lead.follow_up_date)}
                      </td>

                      {/* DAYS OVERDUE */}
                      <td className="py-3.5 px-4 font-bold text-rose-600">
                        {days} days
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadgeClass(
                            lead.stage || lead.status
                          )}`}
                        >
                          {lead.stage || lead.status}
                        </span>
                      </td>

                      {/* ACTION */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => handleOpenEdit(lead, e)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Count */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-2">
          <span>
            Showing <strong className="text-slate-800">{filteredLeads.length}</strong> of{' '}
            <strong className="text-slate-800">{overdueLeads.length}</strong> overdue follow-up leads
          </span>
          <span className="text-[11px] text-slate-400">
            Click any row or Edit button to update follow-up date and remarks
          </span>
        </div>
      </div>

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
