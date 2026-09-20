import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Modal from '../components/Modal';
import { Plus, Trash2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

const MOCK_TASKS = [
  {
    id: 'task_1',
    title: 'Review Q3 Enterprise Proposal with Nexis FinTech team',
    description: 'Ensure 15-seat quota and dedicated SLA terms are included before DocuSign send',
    priority: 'High',
    due_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    status: 'Pending',
    assigned_name: 'Sarah Jenkins',
  },
  {
    id: 'task_2',
    title: 'Follow up on signed DocuSign contract for Apex Logistics ($48,000)',
    description: 'Call David Vance to confirm billing details and onboarding kickoff date',
    priority: 'High',
    due_date: new Date().toISOString().split('T')[0],
    status: 'In Progress',
    assigned_name: 'Michael Vance',
  },
  {
    id: 'task_3',
    title: 'Team standup: verify weekly outbound call targets and lead allocation',
    description: 'Review SDR outreach numbers and adjust cadences for UK/EU prospects',
    priority: 'Medium',
    due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    status: 'Pending',
    assigned_name: 'Alex Morgan',
  },
  {
    id: 'task_4',
    title: 'Audit newly invited staff accounts against Growth Plan quota (15 seats)',
    description: 'Deactivate inactive trial accounts and ensure compliance with subscription tier',
    priority: 'Low',
    due_date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    status: 'Completed',
    assigned_name: 'Sarah Jenkins',
  },
];

export default function TaskManagement() {
  const { profile, getTeamMembers } = useAuth();
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [teamMembers, setTeamMembers] = useState([
    { id: 'usr_1', full_name: 'Sarah Jenkins', name: 'Sarah Jenkins' },
    { id: 'usr_2', full_name: 'Alex Morgan', name: 'Alex Morgan' },
    { id: 'usr_3', full_name: 'Michael Vance', name: 'Michael Vance' },
  ]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [filterMember, setFilterMember] = useState('');

  const initForm = {
    title: '',
    description: '',
    priority: 'Medium',
    due_date: new Date().toISOString().split('T')[0],
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
      if (members && members.length > 0) setTeamMembers(members);
    } catch {
      // fallback
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
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const getAlert = (task) => {
    if (task.status === 'Completed') return { type: 'completed', label: 'Completed' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.due_date);
    due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { type: 'overdue', label: 'Overdue', days: Math.abs(diff) };
    if (diff <= 2) return { type: 'due-soon', label: 'Due Soon' };
    return { type: 'on-track', label: 'On Track' };
  };

  const alertCounts = {
    All: tasks.length,
    Overdue: tasks.filter((t) => getAlert(t).type === 'overdue').length,
    'Due Soon': tasks.filter((t) => getAlert(t).type === 'due-soon').length,
    'On Track': tasks.filter((t) => getAlert(t).type === 'on-track').length,
    Completed: tasks.filter((t) => getAlert(t).type === 'completed').length,
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterMember && t.assigned_to !== filterMember) return false;
    if (activeFilter === 'All') return true;
    const alert = getAlert(t);
    if (activeFilter === 'Overdue') return alert.type === 'overdue';
    if (activeFilter === 'Due Soon') return alert.type === 'due-soon';
    if (activeFilter === 'On Track') return alert.type === 'on-track';
    if (activeFilter === 'Completed') return alert.type === 'completed';
    return true;
  });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createTask({
        ...form,
        assigned_to: form.assigned_to || null,
      });
      if (res && res.success) {
        setModalOpen(false);
        setForm(initForm);
        loadTasks();
      }
    } catch (err) {
      console.error('Save task error:', err);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.updateTask(taskId, { status: newStatus });
      loadTasks();
    } catch (err) {
      console.error('Status change error:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.deleteTask(id);
      loadTasks();
    } catch (err) {
      console.error('Delete task error:', err);
    }
  };

  const updateField = (field, val) => setForm({ ...form, [field]: val });

  const getBadgeColors = (type) => {
    switch (type) {
      case 'overdue':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'due-soon':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'on-track':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'completed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Task Management</h1>
          <p className="text-sm text-slate-500 mt-1">Assigned tasks with priority, due date, and alert status</p>
        </div>
        <button
          onClick={() => {
            setForm(initForm);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Assign Task</span>
        </button>
      </div>

      {/* Filter and Overview Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <p className="text-xs text-slate-500">
          Assign a task to team members with a priority and completion target date.
        </p>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Alert Filters */}
          <div className="flex flex-wrap gap-2">
            {['All', 'Overdue', 'Due Soon', 'On Track', 'Completed'].map((f) => {
              const isActive = activeFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {f} · <span className="opacity-80">{alertCounts[f]}</span>
                </button>
              );
            })}
          </div>

          {/* Team Member Filter */}
          <select
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Alert</th>
                <th className="px-5 py-3.5">Task</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Target Date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Assigned To</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
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

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {alert.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-slate-400 truncate">{task.description}</div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold border ${priorityStyle}`}
                        >
                          {task.priority}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="text-slate-700">
                          {new Date(task.due_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        {alert.type === 'overdue' && (
                          <div className="text-xs font-bold text-rose-600">{alert.days} days overdue</div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <select
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 font-medium">
                        {task.assigned_name || 'Unassigned'}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            onClick={() => handleDelete(task.id)}
                            title="Delete Task"
                          >
                            <Trash2 size={15} />
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

      {/* Assign Task Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Assign New Task"
        footer={
          <>
            <button
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              onClick={handleSave}
            >
              Assign Task
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Task Title *
            </label>
            <input
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g. Follow up on Enterprise SLA"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              rows={2}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={form.priority}
                onChange={(e) => updateField('priority', e.target.value)}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Due Date *
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
                value={form.due_date}
                onChange={(e) => updateField('due_date', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assign To
              </label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={form.assigned_to}
                onChange={(e) => updateField('assigned_to', e.target.value)}
              >
                <option value="">Select person</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
