import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, CalendarDays, ArrowRight } from 'lucide-react';

const STAGES = ['Lead Generation', 'Contact Established', 'Requirement Understood', 'Quotation Sent', 'Closed Won', 'Closed Lost'];

const STAGE_THEMES = {
  'Lead Generation': {
    badge: 'text-orange-700 bg-orange-50 border-orange-200',
    title: 'text-orange-600',
    topBar: 'bg-orange-500',
  },
  'Contact Established': {
    badge: 'text-blue-700 bg-blue-50 border-blue-200',
    title: 'text-blue-600',
    topBar: 'bg-blue-500',
  },
  'Requirement Understood': {
    badge: 'text-purple-700 bg-purple-50 border-purple-200',
    title: 'text-purple-600',
    topBar: 'bg-purple-500',
  },
  'Quotation Sent': {
    badge: 'text-amber-700 bg-amber-50 border-amber-200',
    title: 'text-amber-600',
    topBar: 'bg-amber-500',
  },
  'Closed Won': {
    badge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    title: 'text-emerald-600',
    topBar: 'bg-emerald-500',
  },
  'Closed Lost': {
    badge: 'text-rose-700 bg-rose-50 border-rose-200',
    title: 'text-rose-600',
    topBar: 'bg-rose-500',
  },
};

const MOCK_LEADS = [
  {
    id: 'lead_1',
    company_name: 'Apex Global Logistics',
    contact_person: 'David Vance',
    country: 'United States',
    product: 'Enterprise Fleet Tracker',
    quantity: 50,
    price: 960,
    status: 'Quotation Sent',
    follow_up_date: new Date().toISOString().split('T')[0],
    responsible: { full_name: 'Sarah Jenkins' },
  },
  {
    id: 'lead_2',
    company_name: 'Novatech AI Solutions',
    contact_person: 'Elena Rostova',
    country: 'United Kingdom',
    product: 'Cloud Compute Infrastructure',
    quantity: 12,
    price: 3200,
    status: 'Requirement Understood',
    follow_up_date: new Date().toISOString().split('T')[0],
    responsible: { full_name: 'Alex Morgan' },
  },
  {
    id: 'lead_3',
    company_name: 'HyperScale Cloud Systems',
    contact_person: 'Marcus Brody',
    country: 'Germany',
    product: 'Security Governance Platform',
    quantity: 25,
    price: 1800,
    status: 'Closed Won',
    follow_up_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    responsible: { full_name: 'Michael Vance' },
  },
  {
    id: 'lead_4',
    company_name: 'GreenLine Health Corp',
    contact_person: 'Sophia Patel',
    country: 'Singapore',
    product: 'Compliance Audit Manager',
    quantity: 80,
    price: 450,
    status: 'Contact Established',
    follow_up_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    responsible: { full_name: 'Sarah Jenkins' },
  },
  {
    id: 'lead_5',
    company_name: 'Beacon Digital Media',
    contact_person: 'Kenneth Clarke',
    country: 'Australia',
    product: 'Brand Performance Suite',
    quantity: 15,
    price: 750,
    status: 'Lead Generation',
    follow_up_date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    responsible: { full_name: 'Alex Morgan' },
  },
];

export default function ActivityBoard({ onNavigateToLeads }) {
  const { profile, getTeamMembers } = useAuth();
  const [leads, setLeads] = useState(MOCK_LEADS);
  const [teamMembers, setTeamMembers] = useState([
    { id: 'usr_1', full_name: 'Sarah Jenkins' },
    { id: 'usr_2', full_name: 'Alex Morgan' },
    { id: 'usr_3', full_name: 'Michael Vance' },
  ]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('');
  const [filterMarket, setFilterMarket] = useState('All');

  useEffect(() => {
    if (profile) {
      loadLeads();
      loadTeam();
    }
  }, [profile]);

  const loadTeam = async () => {
    try {
      const members = await getTeamMembers();
      if (members && members.length > 0) setTeamMembers(members);
    } catch {
      // keep fallback
    }
  };

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*, responsible:profiles!leads_responsible_id_fkey(id, full_name)')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) setLeads(data);
    } catch {
      // keep fallback
    }
  };

  // Follow-up risk calculation
  const getFollowUpRisk = (lead) => {
    if (!lead.follow_up_date) return { type: 'none', days: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followDate = new Date(lead.follow_up_date);
    followDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((today - followDate) / (1000 * 60 * 60 * 24));
    if (diff > 7) return { type: 'risk', days: diff, label: `RISK · OVERDUE ${diff}D` };
    if (diff > 0) return { type: 'warning', days: diff, label: `OVERDUE ${diff}D` };
    return { type: 'active', days: 0 };
  };

  // Filter leads
  const allFiltered = leads.filter((l) => {
    if (search) {
      const q = search.toLowerCase();
      if (!l.company_name?.toLowerCase().includes(q) && !l.contact_person?.toLowerCase().includes(q)) return false;
    }
    if (filterCountry && l.country !== filterCountry) return false;
    if (filterStatus && l.status !== filterStatus) return false;
    if (filterResponsible && l.responsible_id !== filterResponsible) return false;
    if (filterMarket === 'India' && l.country !== 'India') return false;
    if (filterMarket === 'International' && l.country === 'India') return false;
    return true;
  });

  // Count stats
  const riskCount = leads.filter((l) => getFollowUpRisk(l).type === 'risk').length;
  const activeCount = leads.filter((l) => getFollowUpRisk(l).type === 'active' || getFollowUpRisk(l).type === 'none').length;
  const missedCount = leads.filter((l) => getFollowUpRisk(l).days > 30).length;

  // Team member lead counts
  const memberCounts = teamMembers.map((m) => ({
    ...m,
    count: allFiltered.filter((l) => l.responsible_id === m.id).length,
  }));

  // Group by stage
  const leadsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = allFiltered.filter((l) => l.status === stage);
    return acc;
  }, {});

  const handleStageChange = async (leadId, newStage) => {
    await supabase.from('leads').update({ status: newStage }).eq('id', leadId);
    loadLeads();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Activity Board</h1>
          <p className="text-xs text-slate-500 mt-1">
            Visual pipeline Kanban &mdash; move deals through closing stages
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-sm">
            <CalendarDays size={15} />
            <span>My Day</span>
          </button>
          <button
            onClick={onNavigateToLeads}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
          >
            <Plus size={16} />
            <span>Create Lead</span>
          </button>
        </div>
      </div>

      {/* Filter and Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        {/* Needs Follow-Up Alerts */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Needs Follow-up Alerts
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Missed Follow-up</span>
              <span className="bg-rose-200/70 text-rose-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {missedCount}
              </span>
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Idle Critical</span>
              <span className="bg-amber-200/70 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                0
              </span>
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>At Risk</span>
              <span className="bg-rose-200/70 text-rose-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {riskCount}
              </span>
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Active on Track</span>
              <span className="bg-emerald-200/70 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {activeCount}
              </span>
            </button>
          </div>
        </div>

        {/* Market Filter */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Market Region
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'India', 'International'].map((m) => {
              const count =
                m === 'All'
                  ? leads.length
                  : m === 'India'
                  ? leads.filter((l) => l.country === 'India').length
                  : leads.filter((l) => l.country !== 'India').length;
              const isSel = filterMarket === m;
              return (
                <button
                  key={m}
                  onClick={() => setFilterMarket(m)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    isSel
                      ? 'bg-slate-900 text-white font-bold shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Select Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search company or contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
            />
          </div>

          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
          >
            <option value="">All Countries</option>
            {[...new Set(leads.map((l) => l.country))]
              .filter(Boolean)
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
          >
            <option value="">All Stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Responsible Person */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Responsible Person
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterResponsible('')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                !filterResponsible
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({allFiltered.length})
            </button>
            {memberCounts.map((m) => {
              const isSel = filterResponsible === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setFilterResponsible(m.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    isSel
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m.full_name} ({m.count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Kanban Board with Horizontal Scroll Container */}
      <div className="overflow-x-auto pb-4">
        <div className="flex items-start gap-4 min-w-[1240px]">
          {STAGES.map((stage) => {
            const stageLeads = leadsByStage[stage] || [];
            const theme = STAGE_THEMES[stage] || {
              badge: 'text-slate-700 bg-slate-50 border-slate-200',
              title: 'text-slate-700',
              topBar: 'bg-slate-400',
            };

            return (
              <div
                key={stage}
                className="w-72 shrink-0 bg-slate-100/70 border border-slate-200/80 rounded-2xl flex flex-col max-h-[750px] shadow-sm overflow-hidden"
              >
                {/* Column Header */}
                <div className="p-3.5 bg-white border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${theme.topBar}`} />
                    <span className={`text-xs font-extrabold uppercase tracking-wider ${theme.title}`}>
                      {stage}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="p-3 overflow-y-auto space-y-3 flex-1">
                  {stageLeads.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-medium border-2 border-dashed border-slate-200 rounded-xl">
                      No leads in this stage
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const risk = getFollowUpRisk(lead);
                      return (
                        <div
                          key={lead.id}
                          className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all space-y-2.5"
                        >
                          {risk.type === 'risk' && (
                            <div className="px-2 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                              {risk.label}
                            </div>
                          )}
                          {risk.type === 'warning' && (
                            <div className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                              {risk.label}
                            </div>
                          )}

                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {lead.company_name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {lead.contact_person} &bull; {lead.country}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <span>Qty: <strong>{lead.quantity || 0}</strong></span>
                            <span className="font-bold text-slate-900">${(lead.price || 0).toLocaleString()}</span>
                          </div>

                          {/* Stage Transition Selector */}
                          <div className="pt-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                              Move Status
                            </label>
                            <select
                              value={lead.status}
                              onChange={(e) => handleStageChange(lead.id, e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
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
    </div>
  );
}
