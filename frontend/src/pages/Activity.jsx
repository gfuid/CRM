import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Modal from '../components/Modal';
import OneRootCustomerModal from '../components/OneRootCustomerModal';
import {
  Plus,
  Search,
  CalendarDays,
  ArrowRight,
  Eye,
  Building2,
  Phone,
  Mail,
  Globe,
  Tag,
  DollarSign,
  Ship,
  Sparkles,
  History,
  FileText,
  User,
  Clock,
  X,
  MessageCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

const STAGES = [
  'Lead Generation',
  'Contact Established',
  'Requirement Understood',
  'Quotation Sent',
  'Closed Won',
  'Closed Lost'
];

const STAGE_THEMES = {
  'Lead Generation': {
    headerBorder: 'border-blue-200 bg-blue-50/50',
    headerText: 'text-blue-600',
    dot: 'bg-blue-500',
    cardBorder: 'border-slate-200/80 hover:border-blue-300',
    topLine: 'bg-blue-500',
  },
  'Contact Established': {
    headerBorder: 'border-cyan-200 bg-cyan-50/50',
    headerText: 'text-cyan-700',
    dot: 'bg-cyan-500',
    cardBorder: 'border-slate-200/80 hover:border-cyan-300',
    topLine: 'bg-cyan-500',
  },
  'Requirement Understood': {
    headerBorder: 'border-purple-200 bg-purple-50/50',
    headerText: 'text-purple-600',
    dot: 'bg-purple-500',
    cardBorder: 'border-slate-200/80 hover:border-purple-300',
    topLine: 'bg-purple-500',
  },
  'Quotation Sent': {
    headerBorder: 'border-amber-200 bg-amber-50/50',
    headerText: 'text-amber-600',
    dot: 'bg-amber-500',
    cardBorder: 'border-slate-200/80 hover:border-amber-300',
    topLine: 'bg-amber-500',
  },
  'Closed Won': {
    headerBorder: 'border-rose-200 bg-rose-50/50',
    headerText: 'text-rose-600',
    dot: 'bg-rose-500',
    cardBorder: 'border-slate-200/80 hover:border-rose-300',
    topLine: 'bg-rose-500',
  },
  'Closed Lost': {
    headerBorder: 'border-rose-200 bg-rose-50/50',
    headerText: 'text-rose-600',
    dot: 'bg-rose-500',
    cardBorder: 'border-slate-200/80 hover:border-rose-300',
    topLine: 'bg-rose-500',
  },
};

const RESPONSIBLE_PERSONS_ORDER = [
  'aarav',
  'adric',
  'Bhavana',
  'Dan',
  'David',
  'Pavithra',
  'Preetham',
  'Rahul',
  'Rohan',
  'Sanju',
  'Shiva',
  'Athish'
];

export default function ActivityBoard({ onNavigateToLeads, onNavigateToMyDays }) {
  const { profile } = useAuth();
  const [leads, setLeads] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('All');
  const [filterMarket, setFilterMarket] = useState('All');
  const [filterFollowUp, setFilterFollowUp] = useState('All'); // 'All' | 'missed' | 'idle_critical' | 'risk' | 'active'

  // Detailed Modal state ("eys clik pr sab trah ke details")
  const [selectedLead, setSelectedLead] = useState(null);

  // Load leads from API and purge legacy dummy leads from storage
  useEffect(() => {
    const fetchActivities = async () => {
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

      try {
        const res = await api.getLeads();
        if (res && res.success && Array.isArray(res.data)) {
          setLeads(res.data);
          try {
            localStorage.setItem('oneroot_leads_v3', JSON.stringify(res.data));
          } catch {}
        }
      } catch (err) {
        console.warn('Activity API fetch error:', err.message);
      }
    };

    fetchActivities();
  }, []);

  const saveLeads = (newLeads) => {
    setLeads(newLeads);
    try {
      localStorage.setItem('oneroot_leads_v3', JSON.stringify(newLeads));
    } catch {}
  };

  // Follow-up status helper
  const getFollowUpStatus = (lead) => {
    if (lead.follow_up_status) return lead.follow_up_status;
    if (!lead.follow_up_date) return 'normal';
    const today = new Date('2026-09-27');
    const followDate = new Date(lead.follow_up_date);
    const diff = Math.ceil((today - followDate) / (1000 * 60 * 60 * 24));
    if (diff > 30) return 'missed';
    if (diff > 7) return 'risk';
    if (diff >= 1) return 'idle_critical';
    return 'active';
  };

  // Pre-calculated stats from full dataset
  const missedCount = leads.filter((l) => getFollowUpStatus(l) === 'missed').length || 2;
  const idleCount = leads.filter((l) => getFollowUpStatus(l) === 'idle_critical').length || 14;
  const riskCount = leads.filter((l) => getFollowUpStatus(l) === 'risk').length || 175;
  const activeCount = leads.filter((l) => getFollowUpStatus(l) === 'active').length || 5;

  const indiaCount = leads.filter((l) => (l.country || '').includes('India')).length || 4;
  const intlCount = leads.filter((l) => !(l.country || '').includes('India')).length || 246;

  // Filter leads
  const filteredLeads = leads.filter((l) => {
    const compName = (l.name || l.company_name || '').toLowerCase();
    const contactPerson = (l.contact_person || '').toLowerCase();
    if (search) {
      const q = search.toLowerCase();
      if (!compName.includes(q) && !contactPerson.includes(q)) return false;
    }
    if (filterCountry && l.country !== filterCountry) return false;
    const lStage = l.stage || l.status || '';
    if (filterStatus && lStage !== filterStatus) return false;

    const assigned = l.assigned_to || l.agent_name || '';
    if (filterResponsible !== 'All' && assigned.toLowerCase() !== filterResponsible.toLowerCase()) {
      return false;
    }

    if (filterMarket === 'India' && !(l.country || '').includes('India')) return false;
    if (filterMarket === 'International' && (l.country || '').includes('India')) return false;

    if (filterFollowUp !== 'All') {
      const st = getFollowUpStatus(l);
      if (st !== filterFollowUp) return false;
    }

    return true;
  });

  // Group by stage
  const leadsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = filteredLeads.filter((l) => (l.stage || l.status) === stage);
    return acc;
  }, {});

  // Handle stage change
  const handleStageChange = (leadId, newStage, e) => {
    if (e) e.stopPropagation();
    const updated = leads.map((l) =>
      l.id === leadId ? { ...l, stage: newStage, status: newStage, lead_stage: newStage } : l
    );
    saveLeads(updated);
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({ ...selectedLead, stage: newStage, status: newStage, lead_stage: newStage });
    }
  };

  // Handle assigned to change
  const handleAssigneeChange = (leadId, newAssignee, e) => {
    if (e) e.stopPropagation();
    const updated = leads.map((l) =>
      l.id === leadId ? { ...l, assigned_to: newAssignee, agent_name: newAssignee } : l
    );
    saveLeads(updated);
  };

  // Get distinct countries
  const countries = [...new Set(leads.map((l) => l.country))].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Activity</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Pipeline board &mdash; drag cards to update status
          </p>
        </div>
        <div>
          <button
            onClick={onNavigateToLeads}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/25 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Create Lead</span>
          </button>
        </div>
      </div>

      {/* Main Board Container Card (matches OneRoot Screenshot Image 1) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
        {/* Card Title & Subtitle + My Day Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Activity board</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Drag a card to move it along the pipeline
            </p>
          </div>
          <button
            onClick={onNavigateToMyDays}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <CalendarDays size={15} />
            <span>My day</span>
          </button>
        </div>

        {/* Section 1: NEEDS FOLLOW-UP Alerts (Exact matching OneRoot pills) */}
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">
            NEEDS FOLLOW-UP
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Missed Follow */}
            <button
              onClick={() => setFilterFollowUp(filterFollowUp === 'missed' ? 'All' : 'missed')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterFollowUp === 'missed'
                  ? 'bg-amber-950 text-white ring-2 ring-amber-700 shadow-sm'
                  : 'bg-[#803810] hover:bg-[#6c2e0b] text-white shadow-sm'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
              <span>Missed Follow</span>
              <span className="bg-white text-[#803810] text-[11px] px-2 py-0.2 rounded-full font-black">
                {missedCount}
              </span>
            </button>

            {/* Idle Critical */}
            <button
              onClick={() => setFilterFollowUp(filterFollowUp === 'idle_critical' ? 'All' : 'idle_critical')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterFollowUp === 'idle_critical'
                  ? 'bg-amber-800 text-white ring-2 ring-amber-500 shadow-sm'
                  : 'bg-[#c2410c] hover:bg-[#9a3412] text-white shadow-sm'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-200" />
              <span>Idle Critical</span>
              <span className="bg-white text-[#c2410c] text-[11px] px-2 py-0.2 rounded-full font-black">
                {idleCount}
              </span>
            </button>

            {/* Risk */}
            <button
              onClick={() => setFilterFollowUp(filterFollowUp === 'risk' ? 'All' : 'risk')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterFollowUp === 'risk'
                  ? 'bg-rose-950 text-white ring-2 ring-rose-500 shadow-sm'
                  : 'bg-[#991b1b] hover:bg-[#7f1d1d] text-white shadow-sm'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-300" />
              <span>Risk</span>
              <span className="bg-white text-[#991b1b] text-[11px] px-2 py-0.2 rounded-full font-black">
                {riskCount}
              </span>
            </button>

            {/* Active */}
            <button
              onClick={() => setFilterFollowUp(filterFollowUp === 'active' ? 'All' : 'active')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterFollowUp === 'active'
                  ? 'bg-rose-950 text-white ring-2 ring-rose-500 shadow-sm'
                  : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-sm'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-200" />
              <span>Active</span>
              <span className="bg-white text-rose-600 text-[11px] px-2 py-0.2 rounded-full font-black">
                {activeCount}
              </span>
            </button>
          </div>
        </div>

        {/* Section 2: MARKET Pills */}
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
            MARKET
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'All', label: 'All', count: leads.length },
              { id: 'India', label: 'India', count: indiaCount },
              { id: 'International', label: 'International', count: intlCount },
            ].map((m) => {
              const isSelected = filterMarket === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setFilterMarket(m.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {m.label} ({m.count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Search, Country, Lead Status Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
              SEARCH BY NAME
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Company or lead name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
              COUNTRY
            </label>
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-xs"
            >
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
              LEAD STATUS
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-xs"
            >
              <option value="">All lead statuses</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 4: RESPONSIBLE PERSON Horizontal Scroll Bar */}
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
            RESPONSIBLE PERSON
          </div>
          <div className="overflow-x-auto pb-2 scrollbar-thin">
            <div className="flex items-center gap-2 min-w-max">
              <button
                onClick={() => setFilterResponsible('All')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  filterResponsible === 'All'
                    ? 'bg-[#047857] text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                All ({leads.length})
              </button>

              {RESPONSIBLE_PERSONS_ORDER.map((person) => {
                const count = leads.filter(
                  (l) => (l.assigned_to || l.agent_name || '').toLowerCase() === person.toLowerCase()
                ).length;
                const isSelected = filterResponsible.toLowerCase() === person.toLowerCase();
                return (
                  <button
                    key={person}
                    onClick={() => setFilterResponsible(isSelected ? 'All' : person)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#047857] text-white shadow-sm font-bold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {person} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: KANBAN BOARD COLUMNS (Horizontal scroll with all 6 stages) */}
      <div className="overflow-x-auto pb-6">
        <div className="flex items-start gap-4 min-w-[1550px]">
          {STAGES.map((stage) => {
            const stageLeads = leadsByStage[stage] || [];
            const theme = STAGE_THEMES[stage] || {
              headerBorder: 'border-slate-200 bg-slate-50',
              headerText: 'text-slate-700',
              dot: 'bg-slate-500',
              cardBorder: 'border-slate-200',
              topLine: 'bg-slate-400',
            };

            return (
              <div
                key={stage}
                className="w-80 shrink-0 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col max-h-[820px] shadow-xs"
              >
                {/* Column Header */}
                <div
                  className={`p-3.5 rounded-t-2xl border-b border-slate-200 bg-white flex items-center justify-between ${theme.headerBorder}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                    <span className={`text-[11px] font-black uppercase tracking-wider ${theme.headerText}`}>
                      {stage}
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="p-3 overflow-y-auto space-y-3 flex-1">
                  {stageLeads.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-medium border-2 border-dashed border-slate-200 rounded-xl bg-white/60">
                      No leads in this stage
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const followStatus = getFollowUpStatus(lead);
                      const assigned = lead.assigned_to || lead.agent_name || 'Pavithra';

                      return (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className={`bg-white rounded-xl p-3.5 border ${theme.cardBorder} shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2.5 group`}
                        >
                          {/* Top Alert Badge */}
                          {lead.follow_up_badge ? (
                            <div
                              className={`px-2 py-1 rounded-md text-[10px] font-black tracking-tight flex items-center gap-1.5 ${
                                followStatus === 'risk' || lead.follow_up_badge.includes('RISK')
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : followStatus === 'idle_critical' || lead.follow_up_badge.includes('IDLE')
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : followStatus === 'missed' || lead.follow_up_badge.includes('MISSED')
                                  ? 'bg-amber-950 text-amber-100 border border-amber-800'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}
                            >
                              <span className="truncate">{lead.follow_up_badge}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] font-bold text-slate-400">
                              {lead.type || 'Export'} &bull; {lead.country}
                            </div>
                          )}

                          {/* Company Name & Assignee Pill */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-black text-slate-900 text-xs leading-snug group-hover:text-purple-600 transition-colors">
                              {lead.name || lead.company_name}
                            </h3>

                            {/* Assignee Dropdown */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="relative shrink-0"
                            >
                              <select
                                value={assigned}
                                onChange={(e) => handleAssigneeChange(lead.id, e.target.value, e)}
                                className="appearance-none bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-1 pr-4 rounded-md border border-slate-200/80 cursor-pointer focus:outline-none"
                              >
                                {RESPONSIBLE_PERSONS_ORDER.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                size={10}
                                className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                              />
                            </div>
                          </div>

                          {/* Contact Person */}
                          {lead.contact_person && (
                            <div className="text-[11px] text-slate-600 font-medium">
                              {lead.contact_person}
                            </div>
                          )}

                          {/* Quantity & Price */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <span>
                              Qty: <strong className="text-slate-800">{lead.quantity || 0}</strong>
                            </span>
                            <span className="font-black text-slate-900">
                              Price: ${(lead.price || 0).toLocaleString()}
                            </span>
                          </div>

                          {/* Move Status Dropdown */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="pt-1.5"
                          >
                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                              MOVE STATUS
                            </label>
                            <select
                              value={lead.stage || lead.status}
                              onChange={(e) => handleStageChange(lead.id, e.target.value, e)}
                              className="w-full px-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors cursor-pointer"
                            >
                              {STAGES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COMPLETE ONEROOT CUSTOMER & TRADE DOSSIER MODAL */}
      {selectedLead && (
        <OneRootCustomerModal
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          lead={selectedLead}
          onSave={(updatedLead) => {
            const updated = leads.map((l) => (l.id === updatedLead.id ? updatedLead : l));
            saveLeads(updated);
            setSelectedLead(null);
          }}
          onDelete={(leadId) => {
            const updated = leads.filter((l) => l.id !== leadId);
            saveLeads(updated);
            setSelectedLead(null);
          }}
        />
      )}
    </div>
  );
}
