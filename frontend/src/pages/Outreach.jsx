import React, { useState, useEffect } from 'react';
import {
  Phone,
  Mail,
  Calendar,
  Plus,
  Search,
  CheckCircle2,
  TrendingUp,
  Filter,
  Users
} from 'lucide-react';
import Modal from '../components/Modal';

const LinkedInIcon = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function Outreach() {
  const [records, setRecords] = useState([
    {
      id: 'out_1',
      employee_name: 'Sarah Jenkins',
      department: 'Enterprise Sales',
      date: new Date().toISOString().split('T')[0],
      calls_made: 42,
      emails_sent: 85,
      linkedin_touches: 30,
      meetings_booked: 4,
      target_met: true,
    },
    {
      id: 'out_2',
      employee_name: 'Michael Vance',
      department: 'Inbound Sales',
      date: new Date().toISOString().split('T')[0],
      calls_made: 38,
      emails_sent: 70,
      linkedin_touches: 25,
      meetings_booked: 3,
      target_met: true,
    },
    {
      id: 'out_3',
      employee_name: 'Alex Morgan',
      department: 'SDR Outreach',
      date: new Date().toISOString().split('T')[0],
      calls_made: 18,
      emails_sent: 35,
      linkedin_touches: 15,
      meetings_booked: 1,
      target_met: false,
    },
    {
      id: 'out_4',
      employee_name: 'David Miller',
      department: 'Enterprise Sales',
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      calls_made: 45,
      emails_sent: 90,
      linkedin_touches: 32,
      meetings_booked: 5,
      target_met: true,
    },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newLog, setNewLog] = useState({
    employee_name: 'Sarah Jenkins',
    calls_made: 30,
    emails_sent: 50,
    linkedin_touches: 20,
    meetings_booked: 2,
  });

  useEffect(() => {
    fetch('http://localhost:5000/api/v1/outreach', {
      headers: { 'x-user-id': 'usr_admin_1' },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setRecords(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const totalCalls = records.reduce((s, r) => s + (r.calls_made || 0), 0);
  const totalEmails = records.reduce((s, r) => s + (r.emails_sent || 0), 0);
  const totalLinkedIn = records.reduce((s, r) => s + (r.linkedin_touches || 0), 0);
  const totalMeetings = records.reduce((s, r) => s + (r.meetings_booked || 0), 0);

  const filtered = records.filter(
    (r) =>
      r.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      r.department?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveLog = (e) => {
    e.preventDefault();
    const entry = {
      id: `out_${Date.now()}`,
      employee_name: newLog.employee_name,
      department: 'Sales Team',
      date: new Date().toISOString().split('T')[0],
      calls_made: Number(newLog.calls_made) || 0,
      emails_sent: Number(newLog.emails_sent) || 0,
      linkedin_touches: Number(newLog.linkedin_touches) || 0,
      meetings_booked: Number(newLog.meetings_booked) || 0,
      target_met: Number(newLog.calls_made) >= 30 && Number(newLog.emails_sent) >= 50,
    };
    setRecords([entry, ...records]);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Daily Outreach Matrix</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track daily sales rep call targets, email cadences, and meetings booked
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus size={16} />
          <span>Log Daily Activity</span>
        </button>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>Calls Initiated</span>
            <Phone size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalCalls}</div>
          <div className="text-xs text-emerald-600 font-semibold mt-1">Target: 30 / rep / day</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>Emails Dispatched</span>
            <Mail size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalEmails}</div>
          <div className="text-xs text-blue-600 font-semibold mt-1">Target: 50 / rep / day</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>LinkedIn Touches</span>
            <LinkedInIcon size={16} className="text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalLinkedIn}</div>
          <div className="text-xs text-slate-400 mt-1">Social selling pipeline</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>Meetings Scheduled</span>
            <Calendar size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalMeetings}</div>
          <div className="text-xs text-emerald-600 font-semibold mt-1">High conversion meetings</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search representative..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
            />
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Showing {filtered.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-3">Representative</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Calls Made</th>
                <th className="py-3 px-3">Emails Sent</th>
                <th className="py-3 px-3">LinkedIn Touches</th>
                <th className="py-3 px-3">Meetings Booked</th>
                <th className="py-3 px-3 text-right">Daily Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    <div>{item.employee_name}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{item.department}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-medium">{item.date}</td>
                  <td className="py-3 px-3 font-bold text-slate-800">{item.calls_made}</td>
                  <td className="py-3 px-3 font-bold text-slate-800">{item.emails_sent}</td>
                  <td className="py-3 px-3 font-bold text-slate-800">{item.linkedin_touches}</td>
                  <td className="py-3 px-3 font-bold text-emerald-600">{item.meetings_booked}</td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        item.target_met
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {item.target_met ? '✓ Target Met' : 'In Progress'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Activity Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Log Daily Outreach Activity">
        <form onSubmit={handleSaveLog} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Representative Name</label>
            <input
              type="text"
              required
              value={newLog.employee_name}
              onChange={(e) => setNewLog({ ...newLog, employee_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Calls Made</label>
              <input
                type="number"
                min="0"
                value={newLog.calls_made}
                onChange={(e) => setNewLog({ ...newLog, calls_made: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Emails Sent</label>
              <input
                type="number"
                min="0"
                value={newLog.emails_sent}
                onChange={(e) => setNewLog({ ...newLog, emails_sent: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">LinkedIn Touches</label>
              <input
                type="number"
                min="0"
                value={newLog.linkedin_touches}
                onChange={(e) => setNewLog({ ...newLog, linkedin_touches: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Meetings Booked</label>
              <input
                type="number"
                min="0"
                value={newLog.meetings_booked}
                onChange={(e) => setNewLog({ ...newLog, meetings_booked: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
            </div>
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
              Save Metrics
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
