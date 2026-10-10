import React, { useState } from 'react';
import {
  Users2,
  TrendingUp,
  ListTodo,
  ShieldCheck,
  ChevronRight,
  UserPlus,
  Settings,
  ExternalLink,
  Crown,
  UserCheck,
  Briefcase,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Sparkles,
  Link,
  MoreHorizontal,
  Video,
  Send,
  Zap,
  Check,
  MessageSquare,
  Activity
} from 'lucide-react';
import OwnerStaffHierarchyView from '../components/OwnerStaffHierarchyView';

export default function OverviewSection({
  overviewSummary,
  users = [],
  company,
  onNavigate,
  onUpdateStaffLimit,
  onUpdateRole,
  onToggleStatus,
}) {
  const [selectedFunnelIndex, setSelectedFunnelIndex] = useState(2);
  const [aiPrompt, setAiPrompt] = useState('Analyze owner staff quota bottlenecks and active deal drop-offs...');
  const [selectedRange, setSelectedRange] = useState('Last month');
  const [chartRangeOpen, setChartRangeOpen] = useState(false);

  const team = overviewSummary?.team || {};
  const crm = overviewSummary?.crm || {};
  const health = overviewSummary?.health || {};

  const totalUsers = team.total ?? users.length;
  const activeUsers = team.active ?? users.filter((u) => u.is_active).length;
  const ownersCount = users.filter((u) => u.persona === 'owner' || u.is_owner || u.role === 'admin').length;
  const adminsCount = team.admins ?? users.filter((u) => u.role === 'admin').length;
  const managersCount = team.managers ?? users.filter((u) => u.role === 'manager').length;
  const agentsCount = team.agents ?? users.filter((u) => u.role === 'agent').length;

  const totalLeads = crm.totalLeads ?? 248;
  const wonLeads = crm.wonLeads ?? 36;
  const totalTasks = crm.totalTasks ?? 142;
  const pendingTasks = crm.pendingTasks ?? 28;

  // Funnel data for Zentra 3D isometric bars
  const funnelStages = [
    { label: 'Initiated Leads', volume: '65.2k', percent: 100, height: 'h-44', drop: '0%' },
    { label: 'Qualified Inquiries', volume: '54.8k', percent: 84, height: 'h-36', drop: '-16%' },
    { label: 'Active Negotiations', volume: '48.6k', percent: 74, height: 'h-32', drop: '-10%', highlighted: true },
    { label: 'Staff Quota Assigned', volume: '38.3k', percent: 58, height: 'h-24', drop: '-16%' },
    { label: 'Completed Deals', volume: '32.9k', percent: 50, height: 'h-20', drop: '-8%' },
  ];

  // Scheduled Meetings / Notices from Kristin Watson style
  const scheduledMeetings = [
    {
      date: 'Tue, 14 Oct',
      time: '09:30 AM',
      title: 'Global Export Review & Quota Sync',
      type: 'Zoom',
      typeColor: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      date: 'Wed, 15 Oct',
      time: '02:00 PM',
      title: 'New Business Owner Onboarding',
      type: 'Google Meet',
      typeColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      date: 'Fri, 17 Oct',
      time: '04:30 PM',
      title: 'SGS Quality & Port Clearance Audit',
      type: 'CRM Notice',
      typeColor: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      date: 'Mon, 20 Oct',
      time: '11:00 AM',
      title: 'Quarterly Subscription Renewal Window',
      type: 'Broadcast',
      typeColor: 'text-purple-600 bg-purple-50 border-purple-200',
    },
  ];

  // Developed Areas / System KPIs from Kristin Watson style
  const developedAreas = [
    { name: 'Staff Quota Allocation', value: 88, trend: 'up' },
    { name: 'Lead Conversion SLA', value: 92, trend: 'up' },
    { name: 'Platform API Uptime', value: 99, trend: 'up' },
    { name: 'Port Clearance Efficiency', value: 56, trend: 'down' },
    { name: 'Owner Renewal Health', value: 79, trend: 'up' },
  ];

  const recentUsers = (team.recentUsers || users.slice(-5).reverse()) || [];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* 1. Header Title & Subtitle (Zentra & Kristin Watson Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight m-0">
              Overview
            </h1>
            <span
              className="w-7 h-7 rounded-full bg-slate-200/80 text-slate-600 flex items-center justify-center cursor-pointer hover:bg-slate-300 transition-colors shadow-2xs"
              title="Copy Dashboard View Link"
            >
              <Link size={13} />
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Welcome, Kristin & Master Admin &bull; Realtime telemetry, quota monitoring & platform analytics
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('users')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
          >
            <UserPlus size={13} />
            <span>Manage Team</span>
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 transition-all shadow-2xs cursor-pointer"
          >
            <Settings size={13} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* 2. Main 2-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: 8 of 12 cols (Kristin Watson Top Row + Zentra 3D Funnel + Wave Chart) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Row 1: Kristin Watson Trio (Profile Card + Peach Gradient + Cyan Gradient) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-stretch">
            {/* Card 1: Kristin Watson Profile Card (4 cols) */}
            <div className="sm:col-span-4 bg-white rounded-3xl border border-slate-200/80 shadow-card p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Admin Profile
                </span>
                <button
                  onClick={() => window.location.reload()}
                  className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                  title="Refresh Identity"
                >
                  <RotateCcw size={13} />
                </button>
              </div>

              {/* Avatar with Circular SVG Progress Ring */}
              <div className="flex flex-col items-center text-center my-3">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth="6"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="transparent"
                      stroke="#ff6b57"
                      strokeWidth="6"
                      strokeDasharray="264"
                      strokeDashoffset="32"
                      strokeLinecap="round"
                    />
                  </svg>
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
                    alt="Kristin Watson"
                    className="w-18 h-18 rounded-full object-cover absolute border-2 border-white shadow-sm"
                  />
                  <div className="absolute bottom-0 right-1 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white">
                    ★
                  </div>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base mt-2.5 mb-0 tracking-tight">
                  Kristin Watson
                </h3>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                  Super Admin &bull; Master Console
                </p>
              </div>

              {/* 3 Metric Pills below avatar */}
              <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100/90 text-slate-700 text-xs font-bold">
                  <Users2 size={11} className="text-slate-500" />
                  <span>{ownersCount || 11}</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100/90 text-slate-700 text-xs font-bold">
                  <CheckCircle2 size={11} className="text-emerald-500" />
                  <span>{activeUsers || 56}</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100/90 text-slate-700 text-xs font-bold">
                  <Crown size={11} className="text-amber-500" />
                  <span>{wonLeads || 12}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Peach Sunset Gradient Mesh Card (4 cols) */}
            <div className="sm:col-span-4 rounded-3xl p-5 text-white flex flex-col justify-between shadow-glow-peach relative overflow-hidden bg-gradient-to-br from-[#ff8e75] via-[#ff6854] to-[#ffa382]">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-white/90">Prioritized tasks</span>
                  <div className="text-[10px] text-white/70">Staff Quotas</div>
                </div>
                <div className="w-8 h-8 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                  <Clock size={16} />
                </div>
              </div>

              <div className="my-6">
                <div className="text-4xl sm:text-5xl font-black tracking-tight leading-none">
                  83%
                </div>
                <div className="text-xs font-semibold text-white/80 mt-1.5">
                  Avg. Completed
                </div>
              </div>

              {/* Connected Trackers Pill below inside or matched */}
              <div className="pt-2 border-t border-white/20 text-[11px] text-white/90 font-medium flex items-center justify-between">
                <span>Active Allocations</span>
                <span className="font-bold">+14% this month</span>
              </div>
            </div>

            {/* Card 3: Cyan-Sky-Blue Radiant Gradient Mesh Card (4 cols) */}
            <div className="sm:col-span-4 rounded-3xl p-5 text-white flex flex-col justify-between shadow-glow-cyan relative overflow-hidden bg-gradient-to-br from-[#38bdf8] via-[#2dd4bf] to-[#6366f1]">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-white/90">Additional tasks</span>
                  <div className="text-[10px] text-white/70">Pipeline Flow</div>
                </div>
                <div className="w-8 h-8 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                  <Check size={16} />
                </div>
              </div>

              <div className="my-6">
                <div className="text-4xl sm:text-5xl font-black tracking-tight leading-none">
                  56%
                </div>
                <div className="text-xs font-semibold text-white/80 mt-1.5">
                  Avg. Completed
                </div>
              </div>

              <div className="pt-2 border-t border-white/20 text-[11px] text-white/90 font-medium flex items-center justify-between">
                <span>Deal Velocity</span>
                <span className="font-bold">3.2d Turnaround</span>
              </div>
            </div>
          </div>

          {/* Connected Trackers Pill Strip (From Kristin Watson UI) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-800">Trackers connected</span>
              <span className="text-[11px] text-slate-400 font-medium">3 active connections</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center -space-x-1">
                <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 font-black text-[10px] flex items-center justify-center border-2 border-white shadow-2xs">
                  F
                </span>
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-black text-[10px] flex items-center justify-center border-2 border-white shadow-2xs">
                  T
                </span>
                <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 font-black text-[10px] flex items-center justify-center border-2 border-white shadow-2xs">
                  S
                </span>
              </div>
              <button className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer">
                <MoreHorizontal size={13} />
              </button>
            </div>
          </div>

          {/* Row 2: Zentra 3D Isometric Bar Funnel & AI Explorer Bar */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 m-0 tracking-tight">
                  Payments & CRM Deal Conversion Funnel
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Stage-by-stage inquiry velocity, drop-off, and finalized trade transactions
                </p>
              </div>

              <button className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60">
                <MoreHorizontal size={16} />
              </button>
            </div>

            {/* 3D Isometric / Perspective Bar Stages (Zentra Style) */}
            <div className="grid grid-cols-5 gap-2 sm:gap-4 items-end pt-4 pb-2">
              {funnelStages.map((stage, idx) => {
                const isSelected = selectedFunnelIndex === idx;

                return (
                  <div
                    key={stage.label}
                    onClick={() => setSelectedFunnelIndex(idx)}
                    className="flex flex-col items-center cursor-pointer group"
                  >
                    {/* Header metrics */}
                    <div className="text-center mb-3">
                      <div className="text-[10px] sm:text-xs text-slate-400 font-medium truncate max-w-[80px] sm:max-w-none">
                        {stage.label}
                      </div>
                      <div className="text-sm sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
                        {stage.volume}
                      </div>
                    </div>

                    {/* Interactive 3D Bar Stack */}
                    <div className="w-full relative flex flex-col items-center">
                      {/* Floating Tooltip for Selected Bar (Zentra Style) */}
                      {isSelected && (
                        <div className="absolute -top-11 z-20 whitespace-nowrap px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-float text-[11px] font-bold text-slate-800 flex items-center gap-1.5 animate-fadeIn">
                          <span>{stage.volume} deals</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-emerald-600">Conv: {stage.percent}%</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-rose-500">Drop: {stage.drop}</span>
                        </div>
                      )}

                      {/* Top Isometric Cap Pill */}
                      <div
                        className={`w-3/4 h-2 rounded-full mb-1 transition-all ${
                          isSelected
                            ? 'bg-blue-400 shadow-sm'
                            : 'bg-slate-200 group-hover:bg-slate-300'
                        }`}
                      />

                      {/* Main Bar Column with Diagonal Stripes */}
                      <div
                        className={`w-full rounded-2xl transition-all duration-300 relative overflow-hidden flex items-end ${
                          isSelected
                            ? 'bg-gradient-to-t from-blue-600 via-blue-500 to-cyan-400 shadow-lg shadow-blue-500/30'
                            : 'bg-gradient-to-t from-blue-400/80 via-blue-300/60 to-cyan-200/40 opacity-70 group-hover:opacity-90'
                        } ${stage.height}`}
                      >
                        {/* Diagonal stripes texture overlay */}
                        <div className="absolute inset-0 bg-stripes pointer-events-none" />

                        {/* Glossy top edge highlight */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-white/40" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Embedded AI Explorer Bar (Zentra Style) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/30">
                  <Sparkles size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-blue-900">
                    What would you like to explore next?
                  </div>
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-700 bg-transparent focus:outline-none placeholder:text-slate-400 mt-0.5 truncate"
                    placeholder="Ask AI about conversions, owners, or quota bottlenecks..."
                  />
                </div>
              </div>

              <button
                onClick={() => alert(`AI Analysis query sent: "${aiPrompt}"`)}
                className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shadow-blue-600/20 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>Ask AI</span>
                <Send size={12} />
              </button>
            </div>
          </div>

          {/* Row 3: Kristin Watson Focusing / Productivity Analytics Chart */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 m-0 tracking-tight">
                  Focusing & System Throughput
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Platform productivity, server telemetry and active rep engagement
                </p>
              </div>

              <div className="relative">
                <button
                  onClick={() => setChartRangeOpen(!chartRangeOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <span>Range: {selectedRange}</span>
                  <ChevronRight size={13} className="rotate-90 text-slate-400" />
                </button>

                {chartRangeOpen && (
                  <div className="absolute right-0 mt-2 w-36 bg-white rounded-2xl shadow-float border border-slate-200 p-1.5 z-40 text-xs">
                    {['Last week', 'Last month', 'Last quarter'].map((rng) => (
                      <button
                        key={rng}
                        onClick={() => {
                          setSelectedRange(rng);
                          setChartRangeOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                      >
                        {rng}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Smooth Curved Wave Chart with Dot Pattern Background (Kristin Watson Style) */}
            <div className="relative h-56 w-full rounded-2xl bg-slate-50/50 border border-slate-100 bg-dot-pattern overflow-hidden flex items-end p-4">
              {/* SVG Wave lines */}
              <svg
                className="w-full h-full absolute inset-0 pointer-events-none"
                viewBox="0 0 600 200"
                preserveAspectRatio="none"
              >
                {/* Coral wave */}
                <path
                  d="M0,150 C80,140 120,80 180,90 C240,100 280,180 340,160 C400,140 460,70 520,110 C560,130 580,160 600,165"
                  fill="none"
                  stroke="#ff705a"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                {/* Blue wave */}
                <path
                  d="M0,170 C90,165 140,110 200,120 C260,130 300,90 350,95 C410,100 450,150 510,140 C560,130 580,95 600,90"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>

              {/* Floating Tooltip (Week 8 / Unbalanced) */}
              <div className="absolute left-[56%] top-[30%] -translate-x-1/2 flex flex-col items-center">
                <div className="px-3 py-1.5 rounded-2xl bg-white border border-slate-200/90 shadow-float text-center">
                  <div className="text-[11px] font-black text-slate-900">Week 8</div>
                  <div className="text-[9px] font-bold text-slate-400">Peak Volume: 142k</div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white mt-1 shadow-sm" />
              </div>

              {/* Right Bottom Metric: 41% */}
              <div className="absolute right-4 bottom-3 text-right">
                <div className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                  41%
                </div>
                <div className="text-[10px] font-bold text-slate-400">Avg. Concentration</div>
              </div>
            </div>

            {/* Legend pills below chart */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-[#ff705a]" />
                  <span className="text-slate-600 font-semibold text-xs">Maximum focus load</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-[#38bdf8]" />
                  <span className="text-slate-600 font-semibold text-xs">Baseline standard</span>
                </div>
              </div>

              <span className="text-slate-400 text-xs font-medium">Updated 5m ago</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 4 of 12 cols (Gross Volume + Meetings List + Developed Areas) */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. Zentra Gross Trade Volume Card with Striped Progress */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Gross Volume
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                +24.8% YoY
              </span>
            </div>

            <div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                $41,520,000
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Total annualized pipeline trade contracts
              </p>
            </div>

            {/* Textured Striped Progress Bars (Zentra Style) */}
            <div className="space-y-3.5 pt-1">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span>Direct Export Deals</span>
                  <span className="text-emerald-600">$30.7M (74%)</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden relative">
                  <div className="h-full bg-emerald-500 rounded-full w-[74%] bg-stripes" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span>Owner Subscriptions & Quotas</span>
                  <span className="text-blue-600">$7.4M (18%)</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden relative">
                  <div className="h-full bg-blue-500 rounded-full w-[58%] bg-stripes" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span>Transit Port Logistics</span>
                  <span className="text-rose-500">$3.4M (8%)</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden relative">
                  <div className="h-full bg-rose-400 rounded-full w-[42%] bg-stripes" />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Kristin Watson "My meetings & broadcasts" Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 m-0 tracking-tight">
                My meetings & notices
              </h3>
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <Calendar size={13} />
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {scheduledMeetings.map((item, i) => (
                <div key={i} className="py-3 flex items-start justify-between gap-3 group">
                  <div className="space-y-1">
                    <div className="text-[11px] font-extrabold text-slate-400">
                      {item.date} &bull; <span className="text-slate-900">{item.time}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.typeColor}`}
                    >
                      <Video size={10} />
                      <span>{item.type}</span>
                    </span>
                  </div>

                  <span className="w-6 h-6 rounded-full bg-slate-50 group-hover:bg-slate-100 text-slate-400 group-hover:text-slate-700 flex items-center justify-center transition-colors shrink-0 mt-1 cursor-pointer">
                    <ArrowUpRight size={13} />
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigate('users')}
              className="w-full py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 transition-colors text-center cursor-pointer"
            >
              See all scheduled notices &rsaquo;
            </button>
          </div>

          {/* 3. Kristin Watson "Developed areas / System Indexes" Progress Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 m-0 tracking-tight">
                Developed areas
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Most common areas of operational focus</p>
            </div>

            <div className="space-y-3.5">
              {developedAreas.map((area) => (
                <div key={area.name} className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-slate-700 truncate w-40">{area.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${area.value}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1 w-12 justify-end">
                    <span className="font-bold text-slate-800 text-[11px]">{area.value}%</span>
                    {area.trend === 'up' ? (
                      <span className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black">
                        ↑
                      </span>
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-[10px] font-black">
                        ↓
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Transactions Dot Matrix (Zentra Style) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Transactions
                </span>
                <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  106k
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Peak: Wed
              </span>
            </div>

            {/* Capsule Dot Matrix (Zentra style vertical dots) */}
            <div className="flex items-end justify-between gap-1.5 h-14 pt-2">
              {[4, 6, 8, 12, 14, 10, 7, 5, 9, 13, 11, 6, 8].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end items-center h-full">
                  <div
                    className={`w-2 rounded-full transition-all ${
                      h > 10 ? 'bg-emerald-500' : 'bg-emerald-300/70'
                    }`}
                    style={{ height: `${h * 3.5}px` }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 font-semibold text-slate-500">
              <span>vs last period</span>
              <span className="text-emerald-600 font-bold">+34,002 deals</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Business Owners & Staff Directory (Hierarchical View: Har Owner ke niche unke staff!) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <Crown size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 m-0 tracking-tight">
                Business Owners & Staff Quota Hierarchy
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Har owner ke niche unke staff ke details &bull; Click owner to expand &bull; Right here owner ke staff count badhao ([+] / [-])
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('users')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer self-start sm:self-auto shadow-sm"
          >
            <span>Full User Management</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <OwnerStaffHierarchyView
          users={users}
          onUpdateStaffLimit={onUpdateStaffLimit}
          onUpdateRole={onUpdateRole}
          onToggleStatus={onToggleStatus}
        />
      </div>
    </div>
  );
}
