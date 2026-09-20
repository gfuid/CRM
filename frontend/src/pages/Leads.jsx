import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Plus, Search, Edit3, Trash2, Building2, User, Globe, Calendar, DollarSign } from 'lucide-react';

const STATUSES = ['Lead Generation', 'Contact Established', 'Requirement Understood', 'Quotation Sent', 'Closed Won', 'Closed Lost'];
const COUNTRIES = ['Bangladesh', 'Nepal', 'Vietnam', 'Malaysia', 'India', 'Indonesia', 'Russia', 'Saudi Arabia', 'United States', 'United Kingdom', 'Germany', 'Singapore', 'Australia', 'Not specified'];

const getStatusBadge = (status) => {
  switch (status) {
    case 'Lead Generation':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Contact Established':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Requirement Understood':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Quotation Sent':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Closed Won':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Closed Lost':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const MOCK_LEADS = [
  {
    id: 'lead_1',
    company_name: 'Apex Global Logistics',
    contact_person: 'David Vance',
    email: 'david@apexlogistics.com',
    phone: '+1 (555) 234-5678',
    country: 'United States',
    product: 'Enterprise Fleet Tracker Suite',
    industry: 'Logistics',
    quantity: 50,
    price: 960,
    status: 'Quotation Sent',
    follow_up_date: new Date().toISOString().split('T')[0],
    responsible: { id: 'usr_1', full_name: 'Sarah Jenkins' },
  },
  {
    id: 'lead_2',
    company_name: 'Novatech AI Solutions',
    contact_person: 'Elena Rostova',
    email: 'elena@novatech.ai',
    phone: '+44 20 7946 0912',
    country: 'United Kingdom',
    product: 'Cloud Compute Infrastructure',
    industry: 'Artificial Intelligence',
    quantity: 12,
    price: 3200,
    status: 'Requirement Understood',
    follow_up_date: new Date().toISOString().split('T')[0],
    responsible: { id: 'usr_2', full_name: 'Alex Morgan' },
  },
  {
    id: 'lead_3',
    company_name: 'HyperScale Cloud Systems',
    contact_person: 'Marcus Brody',
    email: 'm.brody@hyperscale.io',
    phone: '+1 (555) 876-5432',
    country: 'Germany',
    product: 'Security Governance Platform',
    industry: 'FinTech',
    quantity: 25,
    price: 1800,
    status: 'Closed Won',
    follow_up_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    responsible: { id: 'usr_3', full_name: 'Michael Vance' },
  },
  {
    id: 'lead_4',
    company_name: 'GreenLine Health Corp',
    contact_person: 'Sophia Patel',
    email: 'spatel@greenline.health',
    phone: '+65 6789 0123',
    country: 'Singapore',
    product: 'Compliance Audit Manager',
    industry: 'Healthcare',
    quantity: 80,
    price: 450,
    status: 'Contact Established',
    follow_up_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    responsible: { id: 'usr_1', full_name: 'Sarah Jenkins' },
  },
  {
    id: 'lead_5',
    company_name: 'Beacon Digital Media',
    contact_person: 'Kenneth Clarke',
    email: 'kenneth@beacondigital.com',
    phone: '+61 2 9876 5432',
    country: 'Australia',
    product: 'Brand Performance Suite',
    industry: 'Media & Advertising',
    quantity: 15,
    price: 750,
    status: 'Lead Generation',
    follow_up_date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    responsible: { id: 'usr_2', full_name: 'Alex Morgan' },
  },
];

export default function Leads() {
  const { profile, getTeamMembers } = useAuth();
  const [leads, setLeads] = useState(MOCK_LEADS);
  const [teamMembers, setTeamMembers] = useState([
    { id: 'usr_1', full_name: 'Sarah Jenkins' },
    { id: 'usr_2', full_name: 'Alex Morgan' },
    { id: 'usr_3', full_name: 'Michael Vance' },
  ]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

  const initForm = {
    company_name: '', contact_person: '', email: '', phone: '',
    country: 'Not specified', product: '', industry: 'Software',
    quantity: 1, price: 1000, responsible_id: '', follow_up_date: '',
    status: 'Lead Generation', notes: '',
  };
  const [form, setForm] = useState(initForm);

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
    } catch {}
  };

  const loadLeads = async () => {
    try {
      let query = supabase
        .from('leads')
        .select('*, responsible:profiles!leads_responsible_id_fkey(id, full_name)')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: sortOrder === 'asc' });

      if (filterStatus) query = query.eq('status', filterStatus);
      if (filterCountry) query = query.eq('country', filterCountry);
      if (filterResponsible) query = query.eq('responsible_id', filterResponsible);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        setLeads(data);
      }
    } catch {}
  };

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.company_name?.toLowerCase().includes(q) ||
      l.contact_person?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditingLead(null);
    setForm({ ...initForm, responsible_id: profile?.id || 'usr_1' });
    setModalOpen(true);
  };

  const openEdit = (lead) => {
    setEditingLead(lead);
    setForm({
      company_name: lead.company_name || '',
      contact_person: lead.contact_person || '',
      email: lead.email || '',
      phone: lead.phone || '',
      country: lead.country || 'Not specified',
      product: lead.product || '',
      industry: lead.industry || 'Software',
      quantity: lead.quantity || 1,
      price: lead.price || 0,
      responsible_id: lead.responsible_id || lead.responsible?.id || '',
      follow_up_date: lead.follow_up_date || '',
      status: lead.status || 'Lead Generation',
      notes: lead.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.company_name || !form.contact_person) return;

    if (editingLead) {
      setLeads(
        leads.map((l) =>
          l.id === editingLead.id
            ? {
                ...l,
                ...form,
                quantity: Number(form.quantity),
                price: Number(form.price),
                responsible: teamMembers.find((m) => m.id === form.responsible_id) || l.responsible,
              }
            : l
        )
      );
    } else {
      const newLead = {
        id: 'lead_' + Date.now(),
        ...form,
        quantity: Number(form.quantity),
        price: Number(form.price),
        responsible: teamMembers.find((m) => m.id === form.responsible_id) || { full_name: 'Unassigned' },
      };
      setLeads([newLead, ...leads]);
    }
    setModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this enterprise lead?')) {
      setLeads(leads.filter((l) => l.id !== id));
    }
  };

  const handleResponsibleChange = (leadId, newResponsibleId) => {
    const member = teamMembers.find((m) => m.id === newResponsibleId);
    setLeads(
      leads.map((l) =>
        l.id === leadId
          ? { ...l, responsible_id: newResponsibleId, responsible: member || { full_name: 'Unassigned' } }
          : l
      )
    );
  };

  const updateField = (field, val) => setForm({ ...form, [field]: val });

  const totalPipelineVal = leads.reduce((sum, l) => sum + ((Number(l.quantity) || 1) * (Number(l.price) || 0)), 0);
  const wonVal = leads.filter(l => l.status === 'Closed Won').reduce((sum, l) => sum + ((Number(l.quantity) || 1) * (Number(l.price) || 0)), 0);
  const activeDealsCount = leads.filter(l => l.status !== 'Closed Won' && l.status !== 'Closed Lost').length;
  const followUpCount = leads.filter(l => l.follow_up_date).length;

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise Leads & Pipeline</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track multi-stage customer qualification from enquiry to contract close.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white shadow-sm transition-all"
          onClick={openCreate}
        >
          <Plus size={15} /> Create New Lead
        </button>
      </div>

      {/* 4 Pipeline Summary KPI Cards (100% Tailwind Responsive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Active Pipeline Value</div>
          <div className="text-2xl font-black text-slate-900 mt-1">${totalPipelineVal.toLocaleString()}</div>
          <div className="text-[11px] text-coral-600 font-bold mt-1">Weighted Deal Volume</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Active Deals</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{activeDealsCount}</div>
          <div className="text-[11px] text-slate-400 font-semibold mt-1">In qualification stages</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Won Revenue</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">${wonVal.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1">Closed won deals</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Scheduled Touchpoints</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{followUpCount}</div>
          <div className="text-[11px] text-slate-400 font-semibold mt-1">Pending follow-ups</div>
        </div>
      </div>

      {/* Search and Filters Bar (100% Tailwind) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads, contact, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coral-500"
            />
          </div>

          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coral-500 text-slate-700"
          >
            <option value="">All Countries</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={filterResponsible}
            onChange={(e) => setFilterResponsible(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coral-500 text-slate-700"
          >
            <option value="">All Responsible Reps</option>
            {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coral-500 text-slate-700"
          >
            <option value="">All Pipeline Stages</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Leads Table (100% Tailwind) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Country</th>
                <th className="py-3 px-4">Product / Deal</th>
                <th className="py-3 px-4">Industry</th>
                <th className="py-3 px-4">Responsible</th>
                <th className="py-3 px-4">Follow-Up</th>
                <th className="py-3 px-4 text-center">Stage</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {lead.company_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      <div>{lead.contact_person}</div>
                      <div className="text-[11px] text-slate-400">{lead.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {lead.country}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{lead.product || '—'}</div>
                      <div className="text-[11px] font-bold text-slate-500">${lead.price?.toLocaleString() || 0}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                        {lead.industry}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={lead.responsible_id || lead.responsible?.id || ''}
                        onChange={(e) => handleResponsibleChange(lead.id, e.target.value)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-coral-500"
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map((m) => (
                          <option key={m.id} value={m.id}>{m.full_name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {lead.follow_up_date || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full font-bold text-[10px] border ${getStatusBadge(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(lead)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Edit Lead"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Lead Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLead ? 'Edit Enterprise Lead' : 'Create New Enterprise Lead'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={form.company_name}
                onChange={(e) => updateField('company_name', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-coral-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person *</label>
              <input
                type="text"
                required
                value={form.contact_person}
                onChange={(e) => updateField('contact_person', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-coral-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-coral-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-coral-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
              <select
                value={form.country}
                onChange={(e) => updateField('country', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-coral-500"
              >
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Deal Value ($)</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => updateField('price', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-coral-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pipeline Stage</label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-coral-500"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 rounded-lg shadow-sm"
            >
              {editingLead ? 'Update Lead' : 'Create Lead'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
