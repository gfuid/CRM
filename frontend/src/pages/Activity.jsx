import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Modal from '../components/Modal';
import OneRootCustomerModal from '../components/OneRootCustomerModal';
import CountryFlag from '../components/CountryFlag';
import { findCountry } from '../data/countryCodes';
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
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
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
    headerBorder: 'border-emerald-200 bg-emerald-50/50',
    headerText: 'text-emerald-600',
    dot: 'bg-emerald-500',
    cardBorder: 'border-slate-200/80 hover:border-emerald-300',
    topLine: 'bg-emerald-500',
  },
  'Closed Lost': {
    headerBorder: 'border-rose-200 bg-rose-50/50',
    headerText: 'text-rose-600',
    dot: 'bg-rose-500',
    cardBorder: 'border-slate-200/80 hover:border-rose-300',
    topLine: 'bg-rose-500',
  },
};

export default function ActivityBoard({ onNavigateToLeads, onNavigateToMyDays }) {
  const { profile, getTeamMembers } = useAuth();
  const [leads, setLeads] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('All');
  const [filterMarket, setFilterMarket] = useState('All');
  const [filterFollowUp, setFilterFollowUp] = useState('All'); // 'All' | 'missed' | 'idle_critical' | 'risk' | 'active'

  // Detailed Modal state
  const [selectedLead, setSelectedLead] = useState(null);

  // Helper to show the real assignee name (looked up by staff id)
  const sanitizeLead = useCallback((l) => {
    const assignedId = l.assigned_to || '';
    const member = assignedId ? (teamMembers || []).find((t) => t.id === assignedId) : null;
    let assigned = member?.name
      || (assignedId && assignedId === profile?.id ? profile?.name : '')
      || (l.agent_name && !String(l.agent_name).startsWith('usr_') ? l.agent_name : '');
    if (!assigned) assigned = assignedId ? 'Team member' : (profile?.name || 'Unassigned');
    return {
      ...l,
      agent_name: assigned,
      assigned_to: assignedId || profile?.id || '',
    };
  }, [profile, teamMembers]);

  // Load leads from API & storage
  const fetchActivities = useCallback(async () => {
    try {
      const stored = localStorage.getItem('oneroot_leads_v3');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const clean = parsed
            .filter(
              (l) =>
                !l.id?.startsWith('lead_') &&
                l.company_name !== 'Gk Optotorg LLC' &&
                l.company_name !== 'Baltimport LLC' &&
                l.company_name !== 'Al-Barakah Global Agro Foods LLC'
            )
            .map((l, idx) => sanitizeLead(l, idx));
          setLeads(clean);
        }
      }
    } catch {}

    try {
      const res = await api.getLeads();
      if (res && res.success && Array.isArray(res.data)) {
        const sanitized = res.data.map((l, idx) => sanitizeLead(l, idx));
        setLeads(sanitized);
        try {
          localStorage.setItem('oneroot_leads_v3', JSON.stringify(sanitized));
        } catch {}
      }
    } catch (err) {
      console.warn('Activity API fetch error:', err.message);
    }
  }, [sanitizeLead]);

  useEffect(() => {
    fetchActivities();
    window.addEventListener('crm_leads_updated', fetchActivities);
    return () => {
      window.removeEventListener('crm_leads_updated', fetchActivities);
    };
  }, [fetchActivities]);

  // Load team members strictly belonging to this company 
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        let members = [];
        if (getTeamMembers) {
          members = await getTeamMembers();
        } else {
          const res = await api.getUsers({ include_self: true });
          if (res && res.success && Array.isArray(res.data)) {
            members = res.data;
          }
        }
        // Team list comes from the server, already limited to this company
        const filtered = (members || []).filter(
          (u) => Boolean(u)
        );
        setTeamMembers(filtered);
      } catch (err) {
        console.warn('Activity fetch team error:', err.message);
      }
    };
    fetchTeam();
  }, [getTeamMembers]);

  // Responsible persons are the current user and verified company staff.
  const responsiblePersons = useMemo(() => {
    const list = [];
    const staffNames = (teamMembers || [])
      .map((t) => t.name?.trim())
      .filter((n) => n && !n.startsWith('usr_'));

    if (staffNames.length > 0) {
      staffNames.forEach((s) => {
        if (!list.includes(s)) list.push(s);
      });
    }

    const ownerName = profile?.name?.trim();
    if (ownerName && !list.includes(ownerName)) {
      list.push(ownerName);
    }

    return list;
  }, [teamMembers, profile]);

  const saveLeads = (newLeads) => {
    setLeads(newLeads);
    try {
      localStorage.setItem('oneroot_leads_v3', JSON.stringify(newLeads));
      window.dispatchEvent(new Event('crm_leads_updated'));
    } catch {}
  };

  // Follow-up status & detailed card presentation helper (matches Image 3)
  const getFollowUpDetails = useCallback((lead) => {
    const rawDate = lead.follow_up_date;
    if (!rawDate) {
      return {
        status: 'active',
        isOverdue: false,
        isDueToday: false,
        diffDays: 0,
        formattedDate: 'No follow-up set',
        badgeText: 'ACTIVE · ON TRACK',
        badgeClass: 'text-emerald-700',
        dotClass: 'bg-emerald-500',
        cardBg: 'bg-white border-slate-200/90 hover:border-emerald-300',
        cardHover: 'hover:shadow-lg hover:shadow-slate-500/10',
        dateBoxClass: 'bg-slate-50 border border-slate-200 text-slate-700',
        remarkTextClass: 'text-slate-700 font-medium italic',
        remarkCountClass: 'text-slate-500 font-semibold',
        dividerClass: 'border-slate-100',
        subtextColor: 'text-slate-600',
        shouldBlink: false,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(rawDate);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - targetDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedDate = !isNaN(targetDate.getTime())
      ? `${monthNames[targetDate.getMonth()]} ${targetDate.getDate()}, ${targetDate.getFullYear()}`
      : rawDate;

    if (diffDays > 0) {
      // OVERDUE: Soft coral-red background, live blinking red dot, alert header matching Image 3!
      return {
        status: diffDays > 30 ? 'missed' : diffDays > 7 ? 'risk' : 'idle_critical',
        isOverdue: true,
        isDueToday: false,
        diffDays,
        formattedDate: `Follow-up: ${formattedDate} (Overdue)`,
        badgeText: `RISK · FOLLOW-UP OVERDUE ${diffDays} ${diffDays === 1 ? 'DAY' : 'DAYS'}`,
        badgeClass: 'text-red-700',
        dotClass: 'bg-red-600',
        cardBg: 'bg-[#fee2e2]/85 border-red-300 hover:border-red-400 hover:shadow-red-200/50',
        cardHover: 'hover:shadow-lg hover:shadow-red-500/10',
        dateBoxClass: 'bg-white/90 border border-red-200/90 text-red-700 shadow-2xs',
        remarkTextClass: 'text-red-950/90 font-medium italic',
        remarkCountClass: 'text-red-700 font-semibold',
        dividerClass: 'border-red-200/70',
        subtextColor: 'text-red-900/80',
        shouldBlink: true,
      };
    } else if (diffDays === 0) {
      // DUE TODAY: Warm amber background with pulsing indicator
      return {
        status: 'idle_critical',
        isOverdue: false,
        isDueToday: true,
        diffDays: 0,
        formattedDate: `Follow-up: ${formattedDate} (Due Today)`,
        badgeText: 'URGENT · FOLLOW-UP DUE TODAY',
        badgeClass: 'text-amber-800',
        dotClass: 'bg-amber-500',
        cardBg: 'bg-amber-50/90 border-amber-300 hover:border-amber-400',
        cardHover: 'hover:shadow-lg hover:shadow-amber-500/10',
        dateBoxClass: 'bg-white/95 border border-amber-300 text-amber-800 shadow-2xs',
        remarkTextClass: 'text-amber-950 font-medium italic',
        remarkCountClass: 'text-amber-800 font-semibold',
        dividerClass: 'border-amber-200',
        subtextColor: 'text-amber-900/80',
        shouldBlink: true,
      };
    } else {
      // UPCOMING / FUTURE: Clean crisp cards
      const daysAhead = Math.abs(diffDays);
      const isSoon = daysAhead <= 3;
      return {
        status: 'active',
        isOverdue: false,
        isDueToday: false,
        diffDays,
        formattedDate: `Follow-up: ${formattedDate}`,
        badgeText: isSoon ? `UPCOMING · IN ${daysAhead} ${daysAhead === 1 ? 'DAY' : 'DAYS'}` : 'ACTIVE · ON TRACK',
        badgeClass: isSoon ? 'text-blue-700' : 'text-emerald-700',
        dotClass: isSoon ? 'bg-blue-500' : 'bg-emerald-500',
        cardBg: isSoon
          ? 'bg-blue-50/50 border-blue-200 hover:border-blue-300'
          : 'bg-white border-slate-200/90 hover:border-emerald-300',
        cardHover: 'hover:shadow-lg hover:shadow-slate-500/10',
        dateBoxClass: isSoon
          ? 'bg-white/90 border border-blue-200 text-blue-700'
          : 'bg-slate-50 border border-slate-200 text-slate-700',
        remarkTextClass: 'text-slate-700 font-medium italic',
        remarkCountClass: 'text-slate-500 font-semibold',
        dividerClass: 'border-slate-100',
        subtextColor: 'text-slate-600',
        shouldBlink: false,
      };
    }
  }, []);

  // Extract latest remark and total count from previous_remarks or history
  const getLatestRemarkInfo = (lead) => {
    let latestText = '';
    let count = 0;

    if (Array.isArray(lead.previous_remarks) && lead.previous_remarks.length > 0) {
      count = lead.previous_remarks.length;
      const last = lead.previous_remarks[lead.previous_remarks.length - 1];
      if (typeof last === 'string') {
        latestText = last;
      } else if (last) {
        latestText = last.today_remark || last.text || last.remark || last.planned_action || last.notes || '';
      }
    } else if (lead.today_remarks) {
      latestText = lead.today_remarks;
      count = 1;
    } else if (lead.next_follow_up_action) {
      latestText = lead.next_follow_up_action;
      count = 1;
    } else if (lead.notes) {
      latestText = lead.notes;
      count = 1;
    }

    return { latestText: latestText.trim(), count };
  };

  // Extract clean product tags (EXPORT, Turmeric, etc.)
  const getProductTags = (lead) => {
    const tags = [];
    if (Array.isArray(lead.products)) {
      tags.push(...lead.products.filter(Boolean));
    } else if (typeof lead.products === 'string' && lead.products) {
      tags.push(...lead.products.split(',').map((s) => s.trim()).filter(Boolean));
    }
    if (lead.product && !tags.includes(lead.product)) {
      tags.push(lead.product);
    }
    if (lead.commodity && !tags.includes(lead.commodity)) {
      tags.push(lead.commodity);
    }
    return tags.slice(0, 2);
  };

  // Actual stats calculated from leads with sanitized status
  const missedCount = leads.filter((l) => getFollowUpDetails(l).status === 'missed').length;
  const idleCount = leads.filter((l) => getFollowUpDetails(l).status === 'idle_critical').length;
  const riskCount = leads.filter((l) => getFollowUpDetails(l).status === 'risk').length;
  const activeCount = leads.filter((l) => getFollowUpDetails(l).status === 'active').length;

  const indiaCount = leads.filter((l) => (l.country || '').includes('India')).length;
  const intlCount = leads.filter((l) => !(l.country || '').includes('India')).length;

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

    const assigned = (l.agent_name || l.assigned_to || '').toLowerCase();
    if (filterResponsible !== 'All' && assigned !== filterResponsible.toLowerCase()) {
      return false;
    }

    if (filterMarket === 'India' && !(l.country || '').includes('India')) return false;
    if (filterMarket === 'International' && (l.country || '').includes('India')) return false;

    if (filterFollowUp !== 'All') {
      const st = getFollowUpDetails(l).status;
      if (st !== filterFollowUp) return false;
    }

    return true;
  });

  // Group by stage
  const leadsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = filteredLeads.filter((l) => (l.stage || l.status) === stage);
    return acc;
  }, {});

  const isOwnerView = ['owner', 'admin', 'super_admin', 'superadmin'].includes(String(profile?.role || '').toLowerCase());

  // Save one lead change on the server, then refresh the board from the server's answer
  const persistLead = async (leadId, changes) => {
    const before = leads;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...changes } : l)));
    try {
      const res = await api.updateLead(leadId, changes);
      if (!res || res.success === false) throw new Error(res?.message || 'Could not save the change');
      if (res.data) {
        const fresh = sanitizeLead(res.data, 0);
        setLeads((prev) => {
          const next = prev.map((l) => (l.id === leadId ? { ...l, ...fresh } : l));
          try { localStorage.setItem('oneroot_leads_v3', JSON.stringify(next)); } catch {}
          return next;
        });
        return fresh;
      }
      return null;
    } catch (err) {
      setLeads(before);
      alert(err?.message || 'Could not save the change. Please try again.');
      return null;
    }
  };

  // Handle stage change
  const handleStageChange = async (leadId, newStage, e) => {
    if (e) e.stopPropagation();
    const fresh = await persistLead(leadId, { stage: newStage });
    if (fresh && selectedLead && selectedLead.id === leadId) {
      setSelectedLead({ ...selectedLead, ...fresh });
    }
  };

  // Handle assigned to change (owner only; the server stores the staff id)
  const handleAssigneeChange = async (leadId, newAssignee, e) => {
    if (e) e.stopPropagation();
    if (!isOwnerView) {
      alert('Only your company owner can reassign a lead.');
      return;
    }
    const member = (teamMembers || []).find((t) => t.name?.trim() === newAssignee || t.id === newAssignee);
    const assigneeId = member ? member.id : (newAssignee === profile?.name?.trim() ? profile?.id : null);
    if (!assigneeId) return;
    await persistLead(leadId, { assigned_to: assigneeId });
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
            Pipeline board &mdash; drag or click cards to update status &amp; view complete dossiers
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

      {/* Main Board Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
        {/* Card Title & Subtitle + My Day Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Activity board</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live pipeline stages with urgency indicators and follow-up tracking
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

        {/* Section 1: NEEDS FOLLOW-UP Alerts (Emotionally & Semantically Tuned) */}
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">
            NEEDS FOLLOW-UP
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Missed Follow: Alert Crimson Red with Live Blinking Ping Dot */}
            <button
              onClick={() => setFilterFollowUp(filterFollowUp === 'missed' ? 'All' : 'missed')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
                filterFollowUp === 'missed'
                  ? 'bg-red-700 text-white ring-2 ring-red-400 ring-offset-2 shadow-sm'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-200 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span>Missed Follow</span>
              <span className="bg-white text-red-700 text-[11px] px-2 py-0.2 rounded-full font-black">
                {missedCount}
              </span>
            </button>

            {/* Idle Critical: High-Visibility Warning Tangerine / Amber */}
            <button
              onClick={() => setFilterFollowUp(filterFollowUp === 'idle_critical' ? 'All' : 'idle_critical')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
                filterFollowUp === 'idle_critical'
                  ? 'bg-amber-600 text-white ring-2 ring-amber-300 ring-offset-2 shadow-sm'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-200" />
              <span>Idle Critical</span>
              <span className="bg-white text-amber-800 text-[11px] px-2 py-0.2 rounded-full font-black">
                {idleCount}
              </span>
            </button>

            {/* Risk: Deep Ruby / Rose for Accounts at Risk */}
            <button
              onClick={() => setFilterFollowUp(filterFollowUp === 'risk' ? 'All' : 'risk')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
                filterFollowUp === 'risk'
                  ? 'bg-rose-700 text-white ring-2 ring-rose-400 ring-offset-2 shadow-sm'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-200" />
              <span>Risk</span>
              <span className="bg-white text-rose-800 text-[11px] px-2 py-0.2 rounded-full font-black">
                {riskCount}
              </span>
            </button>

            {/* Active: Vibrant Emerald Green representing healthy pipeline growth */}
            <button
              onClick={() => setFilterFollowUp(filterFollowUp === 'active' ? 'All' : 'active')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
                filterFollowUp === 'active'
                  ? 'bg-emerald-700 text-white ring-2 ring-emerald-400 ring-offset-2 shadow-sm'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-200" />
              <span>Active</span>
              <span className="bg-white text-emerald-800 text-[11px] px-2 py-0.2 rounded-full font-black">
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

        {/* Section 4: RESPONSIBLE PERSON Horizontal Scroll Bar (Tenant Verified Personnel Only) */}
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

              {responsiblePersons.map((person) => {
                const count = leads.filter(
                  (l) => (l.agent_name || l.assigned_to || '').toLowerCase() === person.toLowerCase()
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
                className="w-80 shrink-0 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col max-h-[850px] shadow-xs"
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
                      const details = getFollowUpDetails(lead);
                      const assigned = lead.agent_name || lead.assigned_to || profile?.name || 'Unassigned';
                      const remarkInfo = getLatestRemarkInfo(lead);
                      const productTags = getProductTags(lead);
                      const countryObj = findCountry(lead.country);

                      const qtyVal = Number(lead.quantity || 0);
                      const qtyFormatted = qtyVal.toLocaleString();
                      const unit = lead.quantity_unit || (qtyVal >= 1000 ? 'kg' : (lead.unit || 'MT'));
                      const priceVal = Number(lead.price || lead.value || 0);
                      const priceFormatted = priceVal.toLocaleString();

                      return (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className={`rounded-2xl p-4 border ${details.cardBg} ${details.cardHover} transition-all duration-200 cursor-pointer space-y-3 group shadow-xs`}
                        >
                          {/* 1. Top Alert Header: Blinking Live Ping Dot & Uppercase Text (Matches Image 3) */}
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                            {details.shouldBlink ? (
                              <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${details.dotClass}`}></span>
                              </span>
                            ) : (
                              <span className={`w-2 h-2 rounded-full shrink-0 ${details.dotClass}`}></span>
                            )}
                            <span className={`${details.badgeClass} ${details.shouldBlink ? 'animate-pulse' : ''} truncate`}>
                              {details.badgeText}
                            </span>
                          </div>

                          {/* 2. Company Name & Assignee Dropdown Pill (Image 3: Pavithra ⌄) */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-black text-slate-900 text-sm leading-snug group-hover:text-purple-700 transition-colors line-clamp-2">
                              {lead.name || lead.company_name}
                            </h3>

                            {/* Clean Assignee Pill */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="relative shrink-0"
                            >
                              <select
                                value={assigned}
                                disabled={!isOwnerView}
                                title={isOwnerView ? 'Reassign lead' : 'Only your company owner can reassign'}
                                onChange={(e) => handleAssigneeChange(lead.id, e.target.value, e)}
                                className="appearance-none bg-purple-100/90 hover:bg-purple-200 text-purple-900 text-xs font-bold pl-2.5 pr-6 py-1 rounded-lg border border-purple-200/90 cursor-pointer focus:outline-none transition-colors shadow-2xs"
                              >
                                {responsiblePersons.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                size={12}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-purple-700 pointer-events-none"
                              />
                            </div>
                          </div>

                          {/* 3. Quantity & Price metrics line */}
                          <div className="text-xs text-slate-600 font-medium">
                            Qty: <strong className="text-slate-900 font-black">{qtyFormatted} {unit}</strong>
                            <span className="mx-1.5 text-slate-400">&bull;</span>
                            Price: <strong className="text-slate-900 font-black">${priceFormatted}</strong>
                          </div>

                          {/* 4. Company Name / Contact Person with Building Icon */}
                          <div className={`flex items-center gap-1.5 text-xs font-semibold ${details.subtextColor}`}>
                            <Building2 size={13} className="shrink-0 opacity-80" />
                            <span className="truncate">{lead.name || lead.company_name}</span>
                          </div>

                          {/* 5. Country Flag and Country Name */}
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                            <CountryFlag
                              code={countryObj?.code}
                              name={lead.country}
                              className="w-5 h-3.5 rounded-[2px] shadow-2xs"
                            />
                            <span>{lead.country || 'International'}</span>
                          </div>

                          {/* 6. Follow-up Date Box Container with Calendar Icon */}
                          <div className={`px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${details.dateBoxClass}`}>
                            <CalendarDays size={14} className="shrink-0" />
                            <span className={details.shouldBlink ? 'animate-pulse' : ''}>
                              {details.formattedDate}
                            </span>
                          </div>

                          {/* 7. Tags: EXPORT & Product details */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="bg-slate-200/80 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase">
                              {lead.type || 'EXPORT'}
                            </span>
                            {productTags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="bg-slate-200/80 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded tracking-wide"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* 8. Remarks & Follow-up History (Italics + Count) */}
                          {remarkInfo.latestText && (
                            <div className="pt-0.5">
                              <div className={`border-t my-1.5 ${details.dividerClass}`} />
                              <p className={`text-xs leading-relaxed ${details.remarkTextClass}`}>
                                &ldquo;{remarkInfo.latestText}&rdquo;
                              </p>
                              <span className={`text-[10px] block mt-1 ${details.remarkCountClass}`}>
                                {remarkInfo.count} {remarkInfo.count === 1 ? 'remark' : 'remarks'}
                              </span>
                            </div>
                          )}

                          {/* 9. Move Status Dropdown */}
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
                              className="w-full px-2.5 py-1.5 bg-white/90 hover:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors cursor-pointer shadow-2xs"
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
          onSave={async (updatedLead, changes) => {
            if (changes && Object.keys(changes).length === 0) { setSelectedLead(null); return; }
            const fresh = await persistLead(updatedLead.id, changes || updatedLead);
            if (fresh) setSelectedLead(null);
          }}
          onDelete={async (leadId) => {
            if (!isOwnerView) { alert('Only your company owner can delete a lead.'); return; }
            try {
              const res = await api.deleteLead(leadId);
              if (res && res.success === false) throw new Error(res.message || 'Could not delete the lead');
              saveLeads(leads.filter((l) => l.id !== leadId));
              setSelectedLead(null);
            } catch (err) {
              alert(err?.message || 'Could not delete the lead. Please try again.');
            }
          }}
        />
      )}
    </div>
  );
}
