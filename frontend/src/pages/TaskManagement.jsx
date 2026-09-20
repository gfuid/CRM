import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Modal from '../components/Modal';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Zap,
  Timer,
  User,
  Check,
  Filter,
  Sparkles
} from 'lucide-react';

const MOCK_TASKS = [
  {
    id: 'task_1',
    title: 'Send Pre-Shipment Sample of Curcumin 3.5% Turmeric to Al-Barakah',
    description: 'Prepare 500g double-polished turmeric finger samples with lab certificate and dispatch via DHL.',
    priority: 'High',
    due_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
    deadline_time: '18:00',
    status: 'In Progress',
    assigned_name: 'Rohan',
  },
  {
    id: 'task_2',
    title: 'Confirm Phytosanitary Certificate for VietSpices Red Chilli at Chennai Port',
    description: 'Coordinate with Plant Quarantine department for 2x40ft Teja stemless red chilli containers.',
    priority: 'High',
    due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    deadline_time: '14:30',
    status: 'Pending',
    assigned_name: 'Shiva',
  },
  {
    id: 'task_3',
    title: 'Review Mundra Port Ocean Freight Rates for Rice DDGS to Rotterdam',
    description: 'Compare Maersk and MSC 40ft container freight quotes for 120 MT consignment.',
    priority: 'High',
    due_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    deadline_time: '12:00',
    status: 'Completed',
    assigned_name: 'David',
  },
  {
    id: 'task_4',
    title: 'Draft Proforma Invoice for 85 MT Maize Consignment to Dhaka',
    description: 'Specify CFR Chittagong Port terms and bank routing instructions for irrevocable LC.',
    priority: 'Medium',
    due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    deadline_time: '17:00',
    status: 'Pending',
    assigned_name: 'Preetham',
  },
  {
    id: 'task_5',
    title: 'Track Reefer Container Temperature Logs for Pollachi Tender Coconut to Colombo',
    description: 'Confirm pre-cooling at +12°C with shipping line before loading at Tuticorin Port.',
    priority: 'Medium',
    due_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
    deadline_time: '16:00',
    status: 'In Progress',
    assigned_name: 'Rohan',
  },
];

export default function TaskManagement() {
  const { profile, getTeamMembers, isOwner, isStaff } = useAuth();
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [teamMembers, setTeamMembers] = useState(
    profile ? [{ id: profile.id, full_name: profile.name || profile.full_name || 'Owner', name: profile.name || 'Owner' }] : []
  );
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [filterMember, setFilterMember] = useState('');

  const initForm = {
    title: '',
    description: '',
    priority: 'Medium',
    due_date: new Date().toISOString().split('T')[0],
    deadline_time: '18:00',
    assigned_to: '',
    status: 'Pending',
  };
  const [form, setForm] = useState(initForm);

  useEffect(() => {
    loadTasks();
    loadTeam();
  }, [profile]);

  const loadTeam = async () => {
    try {
      const members = await getTeamMembers();
      if (members && members.length > 0) {
        setTeamMembers(members);
      } else if (profile) {
        setTeamMembers([{ id: profile.id, full_name: profile.name || profile.full_name || 'Owner', name: profile.name || 'Owner' }]);
      }
    } catch {
      if (profile) {
        setTeamMembers([{ id: profile.id, full_name: profile.name || profile.full_name || 'Owner', name: profile.name || 'Owner' }]);
      }
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await api.getTasks();
      if (res && res.success && res.data && res.data.length > 0) {
        setTasks(res.data);
      }
    } catch {
      // fallback to mock
    } finally {
      setLoading(false);
    }
  };

  // Precise Deadline & Alert calculation
  const getAlert = (task) => {
    if (task.status === 'Completed') {
      return { type: 'completed', label: 'Completed' };
    }

    const dateStr = task.due_date ? task.due_date.split('T')[0] : new Date().toISOString().split('T')[0];
    const timeStr = task.deadline_time || '18:00';
    const deadlineDateTime = new Date(`${dateStr}T${timeStr}:00`);

    const now = new Date();
    const diffMs = deadlineDateTime - now;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      const overdueHours = Math.abs(diffHours);
      if (overdueHours < 24) {
        return { type: 'overdue', label: `Overdue by ${overdueHours}h`, days: 1 };
      }
      return { type: 'overdue', label: `Overdue by ${Math.abs(diffDays)}d`, days: Math.abs(diffDays) };
    }

    if (diffHours <= 4) {
      return { type: 'due-soon', label: `Due in ${Math.max(1, diffHours)}h!`, urgent: true };
    }
    if (diffHours <= 24) {
      return { type: 'due-soon', label: `Due Today, ${formatTime12h(timeStr)}` };
    }
    if (diffDays <= 2) {
      return { type: 'due-soon', label: `Due Tomorrow, ${formatTime12h(timeStr)}` };
    }

    return { type: 'on-track', label: `${diffDays} days left` };
  };

  const formatTime12h = (time24 = '18:00') => {
    if (!time24) return '06:00 PM';
    const [h, m] = time24.split(':');
    let hours = parseInt(h, 10);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${m || '00'} ${suffix}`;
  };

  const alertCounts = {
    All: tasks.length,
    Overdue: tasks.filter((t) => getAlert(t).type === 'overdue').length,
    'Due Soon': tasks.filter((t) => getAlert(t).type === 'due-soon').length,
    'On Track': tasks.filter((t) => getAlert(t).type === 'on-track').length,
    Completed: tasks.filter((t) => getAlert(t).type === 'completed').length,
  };

  const filteredTasks = tasks.filter((t) => {
    if (isStaff) {
      const isMine =
        t.assigned_to === profile?.id ||
        t.assigned_to === profile?.name ||
        t.assigned_name === profile?.name;
      if (!isMine) return false;
    } else if (filterMember && t.assigned_to !== filterMember) {
      return false;
    }
    if (activeFilter === 'All') return true;
    const alert = getAlert(t);
    if (activeFilter === 'Overdue') return alert.type === 'overdue';
    if (activeFilter === 'Due Soon') return alert.type === 'due-soon';
    if (activeFilter === 'On Track') return alert.type === 'on-track';
    if (activeFilter === 'Completed') return alert.type === 'completed';
    return true;
  });

  // Quick Preset Helper for Deadlines
  const setDeadlinePreset = (preset) => {
    const today = new Date();
    switch (preset) {
      case 'today_eod':
        setForm((prev) => ({
          ...prev,
          due_date: today.toISOString().split('T')[0],
          deadline_time: '18:00',
        }));
        break;
      case 'tomorrow_10am': {
        const tom = new Date(today.getTime() + 86400000);
        setForm((prev) => ({
          ...prev,
          due_date: tom.toISOString().split('T')[0],
          deadline_time: '10:00',
        }));
        break;
      }
      case 'in_3_days': {
        const d3 = new Date(today.getTime() + 86400000 * 3);
        setForm((prev) => ({
          ...prev,
          due_date: d3.toISOString().split('T')[0],
          deadline_time: '18:00',
        }));
        break;
      }
      case 'next_week': {
        const d7 = new Date(today.getTime() + 86400000 * 7);
        setForm((prev) => ({
          ...prev,
          due_date: d7.toISOString().split('T')[0],
          deadline_time: '18:00',
        }));
        break;
      }
      default:
        break;
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const assignedId = isStaff ? (profile?.id || 'usr_staff') : (form.assigned_to || null);
      const assignedMember = teamMembers.find((m) => m.id === form.assigned_to);
      const assignedName = isStaff ? (profile?.name || 'Staff') : (assignedMember ? (assignedMember.name || assignedMember.full_name) : 'Unassigned');

      const payload = {
        ...form,
        due_date: form.due_date,
        deadline_time: form.deadline_time || '18:00',
        assigned_to: assignedId,
        assigned_name: assignedName,
      };

      const res = await api.createTask(payload);
      if (res && res.success) {
        setModalOpen(false);
        setForm(initForm);
        loadTasks();
      } else {
        // Local fallback update
        const newTask = {
          id: 'tsk_' + Date.now(),
          ...payload,
        };
        setTasks([newTask, ...tasks]);
        setModalOpen(false);
        setForm(initForm);
      }
    } catch (err) {
      console.error('Save task error:', err);
      const newTask = {
        id: 'tsk_' + Date.now(),
        ...form,
        assigned_name: isStaff ? (profile?.name || 'Staff') : 'Unassigned',
      };
      setTasks([newTask, ...tasks]);
      setModalOpen(false);
      setForm(initForm);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.updateTask(taskId, { status: newStatus });
      loadTasks();
    } catch (err) {
      // optimistic update
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    }
  };

  const handleDelete = async (id) => {
    if (!isOwner) {
      alert('Permission Denied: Only Company Owners can delete tasks.');
      return;
    }
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.deleteTask(id);
      loadTasks();
    } catch (err) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const updateField = (field, val) => setForm({ ...form, [field]: val });

  const getBadgeColors = (type) => {
    switch (type) {
      case 'overdue':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'due-soon':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'on-track':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'completed':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6 antialiased pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {isStaff ? 'My Daily Action Tasks' : 'Task & Activity Dispatch'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isStaff
              ? 'Personal trade follow-ups with strict completion deadlines'
              : 'Track deadlines, dispatch buyer requests, logistics SLAs, and team action items'}
          </p>
        </div>
        <button
          onClick={() => {
            setForm(initForm);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>Assign New Task</span>
        </button>
      </div>

      {/* Filter and Overview Card */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Alert Filters */}
          <div className="flex flex-wrap gap-2">
            {['All', 'Overdue', 'Due Soon', 'On Track', 'Completed'].map((f) => {
              const isActive = activeFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {f} · <span className="opacity-90">{alertCounts[f]}</span>
                </button>
              );
            })}
          </div>

          {/* Team Member Filter */}
          <select
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
          >
            <option value="">All team members</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3.5">Alert</th>
                <th className="px-5 py-3.5">Task Description</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-extrabold">
                    <Clock size={13} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Deadline & Time</span>
                  </div>
                </th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Assigned To</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-8 text-center text-slate-400">
                    Loading tasks...
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-8 text-center text-slate-400">
                    No tasks found matching filter criteria
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const alert = getAlert(task);
                  const badgeStyle = getBadgeColors(alert.type);
                  const priorityStyle = getPriorityBadge(task.priority);
                  const taskDate = task.due_date ? task.due_date.split('T')[0] : '2026-09-21';
                  const taskTime = task.deadline_time || '18:00';

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Alert Tag */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeStyle}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full bg-current ${alert.urgent ? 'animate-ping' : ''}`} />
                          {alert.label}
                        </span>
                      </td>

                      {/* Task Info */}
                      <td className="px-5 py-3.5 max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-white truncate">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-slate-400 truncate mt-0.5">{task.description}</div>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold border ${priorityStyle}`}
                        >
                          {task.priority}
                        </span>
                      </td>

                      {/* Prominent Deadline & Time */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-extrabold text-slate-800 dark:text-slate-100">
                          <Calendar size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>
                            {new Date(taskDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
                          <Clock size={12} className="text-slate-400 shrink-0" />
                          <span>{formatTime12h(taskTime)}</span>
                        </div>
                      </td>

                      {/* Status Selector */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <select
                          className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>

                      {/* Assigned Person */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-300 font-bold text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-black">
                            {(task.assigned_name || 'U')[0]}
                          </div>
                          <span>{task.assigned_name || 'Unassigned'}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1">
                          {isOwner && (
                            <button
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              onClick={() => handleDelete(task.id)}
                              title="Delete Task (Owner Only)"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
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

      {/* Assign Task Modal with DEADLINE PRESETS, DEADLINE DATE & DEADLINE TIME */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Assign New Task with Deadline"
        subtitle="Set clear targets and completion time for your team"
        footer={
          <>
            <button
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
              onClick={handleSave}
            >
              Assign Task
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Quick Deadline Presets */}
          <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40">
            <label className="block text-xs font-extrabold text-emerald-950 dark:text-emerald-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Timer size={14} className="text-emerald-600 dark:text-emerald-400" />
                Quick Deadline Presets
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-normal">Click to auto-set</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setDeadlinePreset('today_eod')}
                className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 hover:text-emerald-800 dark:hover:text-emerald-300 hover:border-emerald-400 transition-all cursor-pointer text-center"
              >
                ⚡ Today (6 PM)
              </button>
              <button
                type="button"
                onClick={() => setDeadlinePreset('tomorrow_10am')}
                className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 hover:text-emerald-800 dark:hover:text-emerald-300 hover:border-emerald-400 transition-all cursor-pointer text-center"
              >
                🌅 Tomorrow (10 AM)
              </button>
              <button
                type="button"
                onClick={() => setDeadlinePreset('in_3_days')}
                className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 hover:text-emerald-800 dark:hover:text-emerald-300 hover:border-emerald-400 transition-all cursor-pointer text-center"
              >
                📅 In 3 Days
              </button>
              <button
                type="button"
                onClick={() => setDeadlinePreset('next_week')}
                className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 hover:text-emerald-800 dark:hover:text-emerald-300 hover:border-emerald-400 transition-all cursor-pointer text-center"
              >
                🗓️ Next Week
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Task Title *
            </label>
            <input
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g. Follow up with Al-Barakah on LC approval"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              rows={2}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Operational instructions, consignee contacts, or delivery notes..."
            />
          </div>

          {/* Row with Priority, Deadline Date, Deadline Time, Assign To */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={form.priority}
                onChange={(e) => updateField('priority', e.target.value)}
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar size={12} className="text-emerald-600 dark:text-emerald-400" />
                <span>Deadline Date *</span>
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
                value={form.due_date}
                onChange={(e) => updateField('due_date', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock size={12} className="text-emerald-600 dark:text-emerald-400" />
                <span>Deadline Time *</span>
              </label>
              <input
                type="time"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
                value={form.deadline_time || '18:00'}
                onChange={(e) => updateField('deadline_time', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Assign To
              </label>
              {isOwner ? (
                <select
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={form.assigned_to}
                  onChange={(e) => updateField('assigned_to', e.target.value)}
                >
                  <option value="">Select member</option>
                  <option value={profile?.id}>{profile?.name || 'Owner'} (Direct)</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  readOnly
                  value={`${profile?.name || 'You'} (Staff Task)`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none cursor-not-allowed"
                />
              )}
            </div>
          </div>

          {/* Active Deadline Target Banner */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <Clock size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Target Completion:</span>
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white">
              {new Date(form.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {formatTime12h(form.deadline_time || '18:00')}
            </span>
          </div>
        </form>
      </Modal>
    </div>
  );
}
