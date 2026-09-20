import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  CalendarClock,
  Search,
  Plus,
  Phone,
  Mail,
  Video,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Filter,
  User,
  MoreVertical,
  Check,
  Trash2,
  Building2,
  Sparkles,
  Move,
  X,
} from 'lucide-react';
import Modal from '../components/Modal';
import { INITIAL_LEADS } from './Leads';

export default function FollowUp() {
  const { profile, getTeamMembers, isOwner, isStaff } = useAuth();
  const [teamList, setTeamList] = useState([]);
  const [leadsList, setLeadsList] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadSearch, setLeadSearch] = useState('');
  const [isLeadSearchOpen, setIsLeadSearchOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        if (getTeamMembers) {
          const members = await getTeamMembers();
          if (members && members.length > 0) setTeamList(members);
        }
      } catch (e) {}
    };
    fetchTeam();
    loadFollowUps();
    loadLeads();
  }, [profile]);

  const loadLeads = async () => {
    try {
      const res = await api.getLeads();
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setLeadsList(res.data);
      } else {
        setLeadsList(INITIAL_LEADS);
      }
    } catch {
      setLeadsList(INITIAL_LEADS);
    }
  };

  const loadFollowUps = async () => {
    try {
      const res = await api.getFollowUps();
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setFollowUps(res.data);
      }
    } catch (e) {}
  };

  const [followUps, setFollowUps] = useState([
    {
      id: 'fu_1',
      client_name: 'Tariq Mansoor',
      company: 'Al-Barakah Global Agro Foods LLC (UAE 🇦🇪)',
      avatar: 'TM',
      scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      scheduled_time: '11:00 AM',
      type: 'whatsapp',
      priority: 'high',
      status: 'pending',
      assigned_to: profile?.name || 'Team Lead',
      agenda: 'Verify DHL tracking for sample turmeric (curcumin 3.5%) and confirm LC draft opening.',
    },
    {
      id: 'fu_2',
      client_name: 'Nguyen Van Minh',
      company: 'VietSpices Import & Distribution (Vietnam 🇻🇳)',
      avatar: 'NM',
      scheduled_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      scheduled_time: '02:00 PM',
      type: 'demo',
      priority: 'high',
      status: 'pending',
      assigned_to: profile?.name || 'Team Lead',
      agenda: 'Video meeting to review SGS lab moisture certificate and finalize 2x40ft Teja stemless red chilli booking.',
    },
    {
      id: 'fu_3',
      client_name: 'Hendrik Van Dijk',
      company: 'Continental Feeds BV (Netherlands 🇳🇱)',
      avatar: 'HD',
      scheduled_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
      scheduled_time: '04:00 PM',
      type: 'email',
      priority: 'high',
      status: 'pending',
      assigned_to: profile?.name || 'Team Lead',
      agenda: 'Confirm bulk delivery of Corn DDGS (protein 28% min) to Rotterdam Port.',
    },
    {
      id: 'fu_4',
      client_name: 'Kamal Hossain',
      company: 'Dhaka Agro Feeds Ltd (Bangladesh 🇧🇩)',
      avatar: 'KH',
      scheduled_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      scheduled_time: '10:30 AM',
      type: 'phone',
      priority: 'medium',
      status: 'upcoming',
      assigned_to: 'Athish',
      agenda: 'Confirm receipt of 3 rakes Maize & Soya seed at Petrapole Border and negotiate Q3 repeat order.',
    },
    {
      id: 'fu_5',
      client_name: 'Rohan Jayasuriya',
      company: 'Ceylon Tropical Goods PLC (Sri Lanka 🇱🇰)',
      avatar: 'RJ',
      scheduled_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
      scheduled_time: '03:15 PM',
      type: 'whatsapp',
      priority: 'normal',
      status: 'completed',
      assigned_to: 'Athish',
      agenda: 'Reefer container logistics quote confirmed from Tuticorin Port for Pollachi Tender Coconut.',
    },
  ]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    client_name: '',
    company: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '02:00 PM',
    type: 'phone',
    priority: 'high',
    assigned_to: 'Athish',
    agenda: '',
  });

  const getChannelIcon = (type) => {
    switch (type) {
      case 'phone':
        return <Phone size={14} className="text-emerald-500" />;
      case 'email':
        return <Mail size={14} className="text-blue-500" />;
      case 'demo':
        return <Video size={14} className="text-purple-500" />;
      case 'whatsapp':
        return <MessageSquare size={14} className="text-emerald-600" />;
      default:
        return <CalendarClock size={14} className="text-slate-400" />;
    }
  };

  const toggleComplete = (id) => {
    const target = followUps.find((f) => f.id === id);
    if (!target) return;
    const nextStatus = target.status === 'completed' ? 'pending' : 'completed';
    setFollowUps(
      followUps.map((item) =>
        item.id === id ? { ...item, status: nextStatus } : item
      )
    );
    api.updateFollowUp(id, { status: nextStatus }).catch(() => {});
  };

  const handleDelete = (id, e) => {
    if (e) e.stopPropagation();
    setFollowUps(followUps.filter((item) => item.id !== id));
    api.deleteFollowUp(id).catch(() => {});
  };

  const applyLeadToForm = (lead) => {
    if (!lead) return;
    setSelectedLead(lead);
    const company = lead.company_name || lead.name || '';
    const client = lead.contact_person || (Array.isArray(lead.contacts) && lead.contacts[0]?.name) || '';
    const prods = Array.isArray(lead.products) ? lead.products.join(', ') : (lead.product || '');
    const stage = lead.stage || lead.status || 'Active Lead';

    // Auto select preferred channel if phone / WA exists
    let channel = 'phone';
    if (lead.whatsapp) channel = 'whatsapp';
    else if (lead.email) channel = 'email';

    // Auto suggest agenda if empty or default
    const agendaText = `Follow-up regarding ${prods || 'export trade order'} (${lead.country || 'Global'}). Current stage: ${stage}.`;

    setFormData((prev) => ({
      ...prev,
      client_name: client || prev.client_name,
      company: company || prev.company,
      type: channel,
      agenda: prev.agenda && prev.agenda.trim() ? prev.agenda : agendaText,
      assigned_to: lead.agent_name || prev.assigned_to,
    }));
    setIsLeadSearchOpen(false);
    setLeadSearch('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.client_name || !formData.company) return;

    const newItem = {
      id: 'fu_' + Date.now(),
      ...formData,
      avatar: formData.client_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      status: 'pending',
    };

    setFollowUps([newItem, ...followUps]);
    setModalOpen(false);
    api.createFollowUp(formData).catch(() => {});

    setFormData({
      client_name: '',
      company: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '02:00 PM',
      type: 'phone',
      priority: 'high',
      assigned_to: profile?.name || 'Owner',
      agenda: '',
    });
    setSelectedLead(null);
    setLeadSearch('');
  };

  const filtered = followUps.filter((item) => {
    if (isStaff) {
      const isMine =
        item.assigned_to === profile?.id ||
        item.assigned_to === profile?.name ||
        item.assigned_to === profile?.email;
      if (!isMine) return false;
    }

    const matchesSearch =
      item.client_name.toLowerCase().includes(search.toLowerCase()) ||
      item.company.toLowerCase().includes(search.toLowerCase()) ||
      item.agenda.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'completed' && item.status === 'completed') ||
      (statusFilter === 'pending' && (item.status === 'pending' || item.status === 'upcoming')) ||
      (statusFilter === 'overdue' && item.status === 'overdue');

    return matchesSearch && matchesStatus;
  });

  const dueTodayCount = followUps.filter(
    (f) => f.scheduled_date === new Date().toISOString().split('T')[0] && f.status !== 'completed'
  ).length;
  const overdueCount = followUps.filter((f) => f.status === 'overdue').length;
  const completedCount = followUps.filter((f) => f.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarClock className="text-purple-600" size={26} />
            <span>{isStaff ? 'My Scheduled Follow Ups' : 'Follow Up Management'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isStaff
              ? 'Your personal scheduled buyer check-ins, calls, and closing milestones.'
              : 'Never lose a deal. Track scheduled calls, demos, check-ins, and closing milestones across the company.'}
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus size={16} />
          <span>Schedule Follow-up</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <CalendarClock size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{followUps.length}</div>
            <div className="text-xs font-medium text-slate-500">Total Follow-ups</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{dueTodayCount}</div>
            <div className="text-xs font-medium text-slate-500">Due Today</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600">{overdueCount}</div>
            <div className="text-xs font-medium text-slate-500">Overdue Action Needed</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600">{completedCount}</div>
            <div className="text-xs font-medium text-slate-500">Completed</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client, company, or agenda..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'pending', 'overdue', 'completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === tab
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Follow-ups Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="py-3 px-4 w-12 text-center">Status</th>
                <th className="py-3 px-4">Client & Company</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Scheduled For</th>
                <th className="py-3 px-4">Follow-up Agenda</th>
                <th className="py-3 px-4">Assigned Rep</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-medium">
                    No follow-ups found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isDone = item.status === 'completed';
                  const isOverdue = item.status === 'overdue';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isDone ? 'opacity-60 bg-slate-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleComplete(item.id)}
                          className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 hover:border-emerald-500 text-transparent hover:text-emerald-500'
                          }`}
                          title={isDone ? 'Mark Pending' : 'Mark Completed'}
                        >
                          <Check size={14} strokeWidth={3} />
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {item.avatar}
                          </div>
                          <div>
                            <div className={`font-semibold text-slate-900 ${isDone ? 'line-through' : ''}`}>
                              {item.client_name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-normal">{item.company}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                          {getChannelIcon(item.type)}
                          <span>{item.type}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-900 font-medium">{item.scheduled_date}</div>
                        <div className={`text-[11px] font-semibold ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                          {item.scheduled_time} {isOverdue && '• Overdue'}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <span className="text-slate-600 line-clamp-2">{item.agenda}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <User size={12} className="text-slate-400" />
                          <span>{item.assigned_to}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.priority === 'high'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.priority === 'medium'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {item.priority}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => toggleComplete(item.id)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            {isDone ? 'Undo' : 'Done'}
                          </button>
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete follow-up"
                          >
                            <Trash2 size={14} />
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
      </div>

      {/* Schedule Follow-up Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Schedule New Follow-up">
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Smart Lead Fetcher & Drag-to-Fill Bar */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
              try {
                const raw = e.dataTransfer.getData('application/json');
                if (raw) applyLeadToForm(JSON.parse(raw));
              } catch (err) {
                console.warn('Drop error:', err);
              }
            }}
            className={`p-3.5 rounded-2xl border transition-all ${
              isDraggingOver
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Sparkles size={14} className="text-emerald-600" />
                <span>Auto-Fetch from Trade Leads</span>
                <span className="text-[10px] font-normal text-slate-400">
                  (Search, click, drag onto form, or type below)
                </span>
              </div>
              {selectedLead && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLead(null);
                    setFormData((prev) => ({ ...prev, client_name: '', company: '' }));
                  }}
                  className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                >
                  <X size={12} /> Clear Linked Lead
                </button>
              )}
            </div>

            {/* Search Dropdown / Autocomplete */}
            <div className="relative mb-2.5">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={selectedLead ? `✓ Linked: ${selectedLead.company_name || selectedLead.name}` : "Search leads by company, buyer name, country, or commodity..."}
                  value={leadSearch}
                  onFocus={() => setIsLeadSearchOpen(true)}
                  onChange={(e) => {
                    setLeadSearch(e.target.value);
                    setIsLeadSearchOpen(true);
                  }}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                />
                {leadSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setLeadSearch('');
                      setIsLeadSearchOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Autocomplete Results Dropdown */}
              {isLeadSearchOpen && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                  {leadsList.filter((l) => {
                    if (!leadSearch.trim()) return true;
                    const q = leadSearch.toLowerCase();
                    return (
                      (l.company_name || l.name || '').toLowerCase().includes(q) ||
                      (l.contact_person || '').toLowerCase().includes(q) ||
                      (l.country || '').toLowerCase().includes(q) ||
                      (Array.isArray(l.products) ? l.products.join(' ') : (l.product || '')).toLowerCase().includes(q)
                    );
                  }).slice(0, 8).map((lead) => (
                    <button
                      type="button"
                      key={lead.id}
                      onClick={() => applyLeadToForm(lead)}
                      className="w-full text-left p-2.5 hover:bg-emerald-50/60 dark:hover:bg-slate-800 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{lead.company_name || lead.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                            {lead.country}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>Buyer: {lead.contact_person || '—'}</span>
                          <span>•</span>
                          <span>{Array.isArray(lead.products) ? lead.products.join(', ') : lead.product}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        {lead.stage || lead.status || 'Select'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Draggable & Clickable Quick Chips */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1">
                <Move size={10} /> Quick Leads (Click or Drag onto Form):
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {leadsList.slice(0, 8).map((lead) => {
                  const isSelected = selectedLead?.id === lead.id;
                  return (
                    <div
                      key={lead.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify(lead));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => applyLeadToForm(lead)}
                      title="Click to auto-fill or drag onto the form"
                      className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-grab active:cursor-grabbing select-none ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50'
                      }`}
                    >
                      <Building2 size={12} className={isSelected ? 'text-white' : 'text-slate-400'} />
                      <span className="max-w-[130px] truncate">{lead.company_name || lead.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Client & Company Inputs (Manual Typing + Drop Target) */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              try {
                const raw = e.dataTransfer.getData('application/json');
                if (raw) applyLeadToForm(JSON.parse(raw));
              } catch {}
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Client Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rachel Adams (or select lead above)"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Zenith Tech Corp (or select lead above)"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Channel</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              >
                <option value="phone">Phone Call</option>
                <option value="email">Email</option>
                <option value="demo">Product Demo</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Time</label>
              <input
                type="text"
                placeholder="10:30 AM"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Team Member</label>
              {isOwner ? (
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                >
                  <option value={profile?.name || 'Owner'}>{profile?.name || 'Owner'} (You)</option>
                  {teamList.map((tm) => (
                    <option key={tm.id} value={tm.name}>
                      {tm.name} ({tm.department || tm.role || 'Staff'})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  readOnly
                  value={`${profile?.name || 'You'} (Your Account)`}
                  className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-xl focus:outline-none cursor-not-allowed"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Follow-up Agenda / Notes *</label>
            <textarea
              required
              rows="3"
              placeholder="What needs to be discussed or sent?"
              value={formData.agenda}
              onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all"
            >
              Schedule Follow-up
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
