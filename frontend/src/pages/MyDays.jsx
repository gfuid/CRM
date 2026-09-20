import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Clock,
  Tag,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import Modal from '../components/Modal';

import { api } from '../services/api';

export default function MyDays() {
  const [tasks, setTasks] = useState([
    {
      id: 'day_1',
      task: 'Finalize SGS Inspection booking for JNPT container',
      priority: 'high',
      completed: true,
      time_slot: '09:30 AM - 10:30 AM',
      category: 'Export Compliance',
    },
    {
      id: 'day_2',
      task: 'Call Al-Barakah VP Procurement regarding LC opening for 50 MT Turmeric',
      priority: 'high',
      completed: false,
      time_slot: '11:00 AM - 11:30 AM',
      category: 'Client Trade Sync',
    },
    {
      id: 'day_3',
      task: 'Check Guntur Red Chilli mandi spot prices & procurement parity',
      priority: 'medium',
      completed: true,
      time_slot: '02:00 PM - 02:30 PM',
      category: 'Market Sourcing',
    },
    {
      id: 'day_4',
      task: 'Verify Maersk ocean freight bill of lading drafts for Rotterdam shipment',
      priority: 'medium',
      completed: false,
      time_slot: '04:30 PM - 05:00 PM',
      category: 'Shipping & Logistics',
    },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    task: '',
    priority: 'high',
    time_slot: '01:00 PM - 01:30 PM',
    category: 'Export Operations',
  });

  useEffect(() => {
    api.getMyDays()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setTasks(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    api.toggleMyDay(id).catch(() => {});
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    api.deleteMyDay(id).catch(() => {});
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.task) return;
    const entry = {
      id: `day_${Date.now()}`,
      task: newTask.task,
      priority: newTask.priority,
      completed: false,
      time_slot: newTask.time_slot,
      category: newTask.category,
    };
    setTasks([...tasks, entry]);
    api.addMyDay(entry).catch(() => {});
    setModalOpen(false);
    setNewTask({
      task: '',
      priority: 'high',
      time_slot: '01:00 PM - 01:30 PM',
      category: 'Export Operations',
    });
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'high':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 border border-blue-200';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Days Daily Agenda</h1>
          <p className="text-xs text-slate-500 mt-1">
            Focus milestones, scheduled client calls, and prioritized tasks for today
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus size={16} />
          <span>Add Today's Task</span>
        </button>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 border-l-4 border-l-emerald-500">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">Today's Execution Progress:</span>
            <span className="font-extrabold text-sm text-emerald-600">
              {completedCount} of {tasks.length} Completed
            </span>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {progressPct}% Complete
          </span>
        </div>

        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-emerald-500 rounded-full transition-all duration-500 ${
              progressPct === 0
                ? 'w-0'
                : progressPct <= 15
                ? 'w-[15%]'
                : progressPct <= 25
                ? 'w-1/4'
                : progressPct <= 50
                ? 'w-1/2'
                : progressPct <= 75
                ? 'w-3/4'
                : progressPct <= 90
                ? 'w-[90%]'
                : 'w-full'
            }`}
          />
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
            No items on today's agenda yet. Click "Add Today's Task" to schedule one.
          </div>
        ) : (
          tasks.map((t) => (
            <div
              key={t.id}
              className={`rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                t.completed
                  ? 'bg-slate-50/70 border-slate-200/60 shadow-none'
                  : 'bg-white border-slate-200/80 shadow-sm hover:border-slate-300'
              }`}
            >
              <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                <button
                  onClick={() => toggleTask(t.id)}
                  className="shrink-0 text-slate-400 hover:text-emerald-500 transition-colors mt-0.5 sm:mt-0"
                >
                  {t.completed ? (
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  ) : (
                    <Circle size={20} />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div
                    className={`font-bold text-sm tracking-tight ${
                      t.completed ? 'line-through text-slate-400' : 'text-slate-900'
                    }`}
                  >
                    {t.task}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock size={12} className="text-slate-400" />
                      <span>{t.time_slot}</span>
                    </span>
                    <span>&bull;</span>
                    <span className="font-semibold text-slate-600">{t.category}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getPriorityBadge(t.priority)}`}>
                  {t.priority.toUpperCase()}
                </span>
                <button
                  onClick={() => deleteTask(t.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete Task"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Schedule Today's Priority">
        <form onSubmit={handleAddTask} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Task Milestone</label>
            <input
              type="text"
              required
              placeholder="e.g. Conduct demo presentation with Apex Logistics team"
              value={newTask.task}
              onChange={(e) => setNewTask({ ...newTask, task: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Time Slot</label>
              <input
                type="text"
                value={newTask.time_slot}
                onChange={(e) => setNewTask({ ...newTask, time_slot: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
            <input
              type="text"
              value={newTask.category}
              onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
            >
              Add To Agenda
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
