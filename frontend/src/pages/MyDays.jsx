import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  List,
  Eye,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  CheckCircle2,
  FileText,
  AlertCircle,
  Tag,
  ArrowRight,
  Layers,
  Sparkles,
  Search,
  MessageSquare,
  TrendingUp,
  X
} from 'lucide-react';
import Modal from '../components/Modal';
import { TEAM_MEMBERS, INITIAL_MY_DAYS_REPORTS } from '../data/myDaysData';

export default function MyDays() {
  const [reports, setReports] = useState(INITIAL_MY_DAYS_REPORTS);
  const [selectedMember, setSelectedMember] = useState('All users');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'

  // Calendar state - Default to September 2026
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(8); // 8 is September (0-indexed)

  // Modals
  const [selectedReport, setSelectedReport] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New report form state
  const [newReport, setNewReport] = useState({
    user: 'Shiva',
    date_iso: '2026-09-27',
    leads: 1,
    status: 0,
    reassign: 0,
    remarks: 1,
    summary: '',
    task_lead: '',
    task_action: 'Call Initiated & Price Discussion',
    task_note: '',
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('oneroot_mydays_v3');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReports(parsed);
          return;
        }
      }
      localStorage.setItem('oneroot_mydays_v3', JSON.stringify(INITIAL_MY_DAYS_REPORTS));
    } catch {}
  }, []);

  const saveReports = (updated) => {
    setReports(updated);
    try {
      localStorage.setItem('oneroot_mydays_v3', JSON.stringify(updated));
    } catch {}
  };

  // Filter reports by selected team member
  const filteredReports = reports.filter((r) => {
    if (selectedMember === 'All users') return true;
    return r.user.toLowerCase() === selectedMember.toLowerCase();
  });

  // Calendar helpers
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleTodayMonth = () => {
    setCurrentYear(2026);
    setCurrentMonth(8); // September 2026
  };

  // Generate calendar grid days
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday

  const calendarDays = [];
  // Padding for previous month
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      dayNumber: prevMonthDays - i,
      isCurrentMonth: false,
      date_iso: `${currentMonth === 0 ? currentYear - 1 : currentYear}-${String(currentMonth === 0 ? 12 : currentMonth).padStart(2, '0')}-${String(prevMonthDays - i).padStart(2, '0')}`
    });
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date_iso = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({
      dayNumber: d,
      isCurrentMonth: true,
      date_iso
    });
  }
  // Padding for next month
  const totalCells = Math.ceil(calendarDays.length / 7) * 7;
  const nextDays = totalCells - calendarDays.length;
  for (let n = 1; n <= nextDays; n++) {
    calendarDays.push({
      dayNumber: n,
      isCurrentMonth: false,
      date_iso: `${currentMonth === 11 ? currentYear + 1 : currentYear}-${String(currentMonth === 11 ? 1 : currentMonth + 2).padStart(2, '0')}-${String(n).padStart(2, '0')}`
    });
  }

  // Get reports for a specific calendar day
  const getReportsForDate = (date_iso) => {
    return filteredReports.filter((r) => r.date_iso === date_iso);
  };

  // Add new day report
  const handleCreateReport = (e) => {
    e.preventDefault();
    const dateObj = new Date(newReport.date_iso);
    const dateFormatted = dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const nowTime = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const created = {
      id: `report_${Date.now()}`,
      date: dateFormatted,
      date_iso: newReport.date_iso,
      user: newReport.user,
      leads: Number(newReport.leads) || 0,
      status: Number(newReport.status) || 0,
      reassign: Number(newReport.reassign) || 0,
      remarks: Number(newReport.remarks) || 0,
      updated: `${dateFormatted.split(',')[1]} ${nowTime}`,
      summary: newReport.summary || 'Logged customer interactions and market outreach',
      tasks: newReport.task_lead
        ? [
            {
              lead_name: newReport.task_lead,
              contact: 'Customer Desk',
              time: nowTime,
              action: newReport.task_action,
              note: newReport.task_note || 'Discussed product specs and shipment pricing',
              status: 'Contact Established'
            }
          ]
        : []
    };

    const updated = [created, ...reports];
    saveReports(updated);
    setIsAddModalOpen(false);
    setSelectedReport(created);
    setNewReport({
      user: 'Shiva',
      date_iso: '2026-09-27',
      leads: 1,
      status: 0,
      reassign: 0,
      remarks: 1,
      summary: '',
      task_lead: '',
      task_action: 'Call Initiated & Price Discussion',
      task_note: '',
    });
  };

  // User pill colors
  const getUserBadge = (user) => {
    switch (user) {
      case 'Shiva':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'adric':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'Rohan':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'David':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Days</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            View sales team daily reports (admin days are not tracked)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle (Normal vs Calendar) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List size={14} />
              <span>Normal View</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon size={14} />
              <span>Calendar View</span>
            </button>
          </div>

          {/* Add Day Report Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 cursor-pointer"
          >
            <Plus size={16} />
            <span>+ Log Day Report</span>
          </button>
        </div>
      </div>

      {/* Main Container Card (matching OneRoot Screenshot) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
        {/* Notice Card Banner */}
        <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-2xl p-4">
          <h2 className="text-sm font-bold text-slate-900">Team daily reports</h2>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Admin activity is not recorded here. View saved days for sales users only &mdash; filter by team member below.
          </p>
        </div>

        {/* TEAM MEMBER Horizontal Filter Pills */}
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">
            TEAM MEMBER
          </div>
          <div className="overflow-x-auto pb-1 scrollbar-thin">
            <div className="flex items-center gap-2 min-w-max">
              {TEAM_MEMBERS.map((member) => {
                const isSelected = selectedMember.toLowerCase() === member.toLowerCase();
                return (
                  <button
                    key={member}
                    onClick={() => setSelectedMember(member)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#047857] text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {member}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* MODE 1: NORMAL VIEW (TABLE MATCHING ONEROOT SCREENSHOT)        */}
        {/* ============================================================== */}
        {viewMode === 'list' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-4 font-black">DATE</th>
                  <th className="py-3.5 px-4 font-black">USER</th>
                  <th className="py-3.5 px-4 font-black">LEADS</th>
                  <th className="py-3.5 px-4 font-black">STATUS</th>
                  <th className="py-3.5 px-4 font-black">REASSIGN</th>
                  <th className="py-3.5 px-4 font-black">REMARKS</th>
                  <th className="py-3.5 px-4 font-black">UPDATED</th>
                  <th className="py-3.5 px-4 font-black text-right">VIEW</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      No reports found for {selectedMember}
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr
                      key={report.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setSelectedReport(report)}
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {report.date}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {report.user}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {report.leads}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {report.status}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {report.reassign}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {report.remarks}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-500 whitespace-nowrap">
                        {report.updated}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReport(report);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          <Eye size={13} />
                          <span>Open</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE 2: CALENDAR VIEW (MONTHLY / DAY-BY-DAY TASK GRID)        */}
        {/* ============================================================== */}
        {viewMode === 'calendar' && (
          <div className="space-y-4">
            {/* Calendar Month Navigation Bar */}
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
                <span className="text-sm font-black text-slate-900 ml-2">
                  {monthNames[currentMonth]} {currentYear}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  Showing reports for: <strong className="text-slate-800">{selectedMember}</strong>
                </span>
                <button
                  onClick={handleTodayMonth}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Today
                </button>
              </div>
            </div>

            {/* Calendar Days Header */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div
                  key={d}
                  className="py-2 text-[11px] font-black uppercase tracking-wider text-slate-500 bg-slate-100/70 rounded-lg"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid Cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((cell, idx) => {
                const dayReports = getReportsForDate(cell.date_iso);
                const hasReports = dayReports.length > 0;
                const isToday = cell.date_iso === '2026-09-27';

                return (
                  <div
                    key={idx}
                    className={`min-h-[110px] p-2 rounded-xl border flex flex-col justify-between transition-all ${
                      cell.isCurrentMonth
                        ? isToday
                          ? 'bg-purple-50/40 border-purple-300 ring-2 ring-purple-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        : 'bg-slate-50/50 border-slate-100 text-slate-400'
                    }`}
                  >
                    {/* Date Number Header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black ${
                          isToday
                            ? 'w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center'
                            : cell.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-black text-purple-600 uppercase tracking-tight">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Employee Day Report Pills */}
                    <div className="mt-1.5 space-y-1 flex-1 overflow-y-auto max-h-[85px]">
                      {dayReports.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setSelectedReport(r)}
                          className={`w-full text-left p-1 rounded-md text-[10px] font-bold border transition-transform hover:scale-[1.02] cursor-pointer block truncate ${getUserBadge(
                            r.user
                          )}`}
                          title={`${r.user}: ${r.leads} leads, ${r.remarks} remarks`}
                        >
                          <div className="truncate">
                            <span className="font-black">{r.user}:</span> {r.leads} leads
                            {r.remarks > 0 && `, ${r.remarks} rem`}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Date Footer Indicator */}
                    {hasReports && (
                      <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-semibold">
                        <span>{dayReports.length} {dayReports.length === 1 ? 'user' : 'users'}</span>
                        <span className="text-purple-600 font-bold hover:underline cursor-pointer">
                          View &rarr;
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: DAY REPORT & EMPLOYEE TASKS DETAILS MODAL            */}
      {/* ============================================================== */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title="Employee Daily Execution Dossier"
          size="2xl"
        >
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
            {/* Top Employee & Date Card */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Sales Rep: {selectedReport.user}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white">
                    {selectedReport.date}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Clock size={13} />
                  <span>Updated: {selectedReport.updated}</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-white">
                  Daily Execution Summary
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {selectedReport.summary || 'Recorded end-of-day lead status movements, outreach activities, and trading remarks.'}
                </p>
              </div>
            </div>

            {/* KPI Metrics Grid (Leads, Status, Reassign, Remarks) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 text-center">
                <div className="text-[10px] font-black uppercase tracking-wider text-purple-600">
                  Leads Handled
                </div>
                <div className="text-2xl font-black text-purple-900 mt-1">
                  {selectedReport.leads}
                </div>
              </div>

              <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-3 text-center">
                <div className="text-[10px] font-black uppercase tracking-wider text-cyan-700">
                  Status Advanced
                </div>
                <div className="text-2xl font-black text-cyan-900 mt-1">
                  {selectedReport.status}
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-center">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                  Reassignments
                </div>
                <div className="text-2xl font-black text-amber-900 mt-1">
                  {selectedReport.reassign}
                </div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-center">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                  Remarks & Notes
                </div>
                <div className="text-2xl font-black text-emerald-900 mt-1">
                  {selectedReport.remarks}
                </div>
              </div>
            </div>

            {/* Detailed Tasks / Accounts Worked On */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>Accounts & Tasks Logged on this Day</span>
                </h4>
                <span className="text-xs text-slate-500 font-semibold">
                  {selectedReport.tasks?.length || 0} Records
                </span>
              </div>

              {(!selectedReport.tasks || selectedReport.tasks.length === 0) ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  No individual line items detailed for this submission.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedReport.tasks.map((task, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl p-4 border border-slate-200 hover:border-slate-300 shadow-2xs space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {task.lead_name}
                          </div>
                          {task.contact && (
                            <div className="text-[11px] text-slate-500 font-medium">
                              Contact: {task.contact}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            {task.action}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Clock size={11} />
                            {task.time}
                          </span>
                        </div>
                      </div>

                      {task.note && (
                        <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-700 leading-relaxed font-medium">
                          {task.note}
                        </div>
                      )}

                      {task.status && (
                        <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5 pt-1">
                          <span>Stage Result:</span>
                          <span className="font-black text-slate-800">{task.status}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: LOG NEW DAY REPORT                                   */}
      {/* ============================================================== */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Log Sales Team Daily Report"
          size="lg"
        >
          <form onSubmit={handleCreateReport} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  Team Member
                </label>
                <select
                  value={newReport.user}
                  onChange={(e) => setNewReport({ ...newReport, user: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {TEAM_MEMBERS.filter((m) => m !== 'All users').map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  Report Date
                </label>
                <input
                  type="date"
                  value={newReport.date_iso}
                  onChange={(e) => setNewReport({ ...newReport, date_iso: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  Leads Handled
                </label>
                <input
                  type="number"
                  min="0"
                  value={newReport.leads}
                  onChange={(e) => setNewReport({ ...newReport, leads: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  Status Changes
                </label>
                <input
                  type="number"
                  min="0"
                  value={newReport.status}
                  onChange={(e) => setNewReport({ ...newReport, status: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  Reassigned
                </label>
                <input
                  type="number"
                  min="0"
                  value={newReport.reassign}
                  onChange={(e) => setNewReport({ ...newReport, reassign: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  Remarks Logged
                </label>
                <input
                  type="number"
                  min="0"
                  value={newReport.remarks}
                  onChange={(e) => setNewReport({ ...newReport, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                Day Summary / Highlights
              </label>
              <textarea
                rows={2}
                placeholder="Key accomplishments, negotiations or high-priority accounts worked on..."
                value={newReport.summary}
                onChange={(e) => setNewReport({ ...newReport, summary: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Task Item */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="text-[11px] font-bold text-slate-700">
                Primary Account Touched (Optional)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Company / Lead Name"
                  value={newReport.task_lead}
                  onChange={(e) => setNewReport({ ...newReport, task_lead: e.target.value })}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="Action (e.g. Price Discussion, Quote Sent)"
                  value={newReport.task_action}
                  onChange={(e) => setNewReport({ ...newReport, task_action: e.target.value })}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <textarea
                rows={2}
                placeholder="Notes and remarks about this interaction..."
                value={newReport.task_note}
                onChange={(e) => setNewReport({ ...newReport, task_note: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/25 cursor-pointer"
              >
                Save Daily Report
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
