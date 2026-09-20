import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
  Check
} from 'lucide-react';
import Modal from '../components/Modal';

export default function FollowUp() {
  const { profile, getTeamMembers, isOwner, isStaff } = useAuth();
  const [teamList, setTeamList] = useState([]);

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
  }, [profile]);

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
    setFollowUps(
      followUps.map((item) =>
        item.id === id
          ? { ...item, status: item.status === 'completed' ? 'pending' : 'completed' }
          : item
      )
    );
  };

  const handleCreate = (e) => {
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
                        <button
                          onClick={() => toggleComplete(item.id)}
                          className="px-3 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          {isDone ? 'Undo' : 'Done'}
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

      {/* Schedule Follow-up Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Schedule New Follow-up">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Client Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rachel Adams"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Zenith Tech Corp"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
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
