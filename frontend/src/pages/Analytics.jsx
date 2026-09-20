import React, { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  CheckCircle2,
  Globe,
  Download,
  Filter,
  Search,
  Package,
  Layers,
  UserCheck,
  Building2,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

// Realistic Trade Country Flag Mapping
const COUNTRY_FLAGS = {
  'Bangladesh': '🇧🇩',
  'Nepal': '🇳🇵',
  'Vietnam': '🇻🇳',
  'Malaysia': '🇲🇾',
  'Not specified': '🌐',
  'India': '🇮🇳',
  'Russia': '🇷🇺',
  'Indonesia': '🇮🇩',
  'Saudi Arabia': '🇸🇦',
  'Greece': '🇬🇷',
};

// Commodity color and icon accents
const PRODUCT_COLORS = {
  'turmeric': 'bg-amber-500 text-amber-500',
  'rice ddgs': 'bg-emerald-500 text-emerald-500',
  'corn ddgs': 'bg-yellow-500 text-yellow-500',
  'dorb': 'bg-teal-500 text-teal-500',
  'chilli': 'bg-rose-500 text-rose-500',
  'maize': 'bg-orange-500 text-orange-500',
  'rsm': 'bg-blue-500 text-blue-500',
  'Not specified': 'bg-slate-400 text-slate-400',
  'ginger': 'bg-lime-500 text-lime-500',
};

export default function Analytics() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Baseline data provided by the user
  const totalLeads = 252;
  const inPipeline = 250;
  const closedWon = 2;
  const exportCount = 252;
  const domesticCount = 0;

  // Leads by Country
  const countryBreakdown = [
    { country: 'Bangladesh', count: 81, pct: 32, flag: '🇧🇩' },
    { country: 'Nepal', count: 58, pct: 23, flag: '🇳🇵' },
    { country: 'Vietnam', count: 47, pct: 19, flag: '🇻🇳' },
    { country: 'Malaysia', count: 41, pct: 16, flag: '🇲🇾' },
    { country: 'Not specified', count: 13, pct: 5, flag: '🌐' },
    { country: 'India', count: 4, pct: 2, flag: '🇮🇳' },
    { country: 'Russia', count: 3, pct: 1, flag: '🇷🇺' },
    { country: 'Indonesia', count: 2, pct: 1, flag: '🇮🇩' },
    { country: 'Saudi Arabia', count: 2, pct: 1, flag: '🇸🇦' },
    { country: 'Greece', count: 1, pct: 0, flag: '🇬🇷' },
  ];

  // Leads by Product
  const productBreakdown = [
    { product: 'turmeric', count: 176, pct: 52, color: 'bg-amber-500' },
    { product: 'rice ddgs', count: 38, pct: 11, color: 'bg-emerald-500' },
    { product: 'corn ddgs', count: 31, pct: 9, color: 'bg-yellow-500' },
    { product: 'dorb', count: 26, pct: 8, color: 'bg-teal-500' },
    { product: 'chilli', count: 20, pct: 6, color: 'bg-rose-500' },
    { product: 'maize', count: 19, pct: 6, color: 'bg-orange-500' },
    { product: 'rsm', count: 18, pct: 5, color: 'bg-blue-500' },
    { product: 'Not specified', count: 7, pct: 2, color: 'bg-slate-400' },
    { product: 'ginger', count: 4, pct: 1, color: 'bg-lime-500' },
  ];

  // Pipeline Status
  const pipelineStatus = [
    { status: 'Lead Generation', count: 101, pct: 40, color: 'bg-blue-500', barColor: 'from-blue-500 to-indigo-500' },
    { status: 'Contact Established', count: 88, pct: 35, color: 'bg-amber-500', barColor: 'from-amber-400 to-orange-500' },
    { status: 'Closed Lost', count: 61, pct: 24, color: 'bg-rose-500', barColor: 'from-rose-500 to-red-600' },
    { status: 'Closed Won', count: 2, pct: 1, color: 'bg-emerald-500', barColor: 'from-emerald-500 to-teal-500' },
  ];

  // Leads by Responsible Person (Team Workload)
  const teamWorkload = [
    { name: 'Rohan', count: 48, pct: 19, role: 'Senior Trader', avatar: 'RO', color: 'from-blue-600 to-indigo-600' },
    { name: 'Shiva', count: 39, pct: 15, role: 'Export Manager', avatar: 'SH', color: 'from-emerald-600 to-teal-600' },
    { name: 'David', count: 35, pct: 14, role: 'Trade Specialist', avatar: 'DA', color: 'from-amber-600 to-orange-600' },
    { name: 'Preetham', count: 31, pct: 12, role: 'Sales Executive', avatar: 'PR', color: 'from-purple-600 to-indigo-600' },
    { name: 'adric', count: 27, pct: 11, role: 'Key Accounts', avatar: 'AD', color: 'from-pink-600 to-rose-600' },
    { name: 'aarav', count: 24, pct: 10, role: 'Desk Trader', avatar: 'AA', color: 'from-cyan-600 to-blue-600' },
    { name: 'Rahul', count: 21, pct: 8, role: 'Commodity Rep', avatar: 'RA', color: 'from-teal-600 to-emerald-600' },
    { name: 'Dan', count: 16, pct: 6, role: 'Regional Lead', avatar: 'DA', color: 'from-violet-600 to-purple-600' },
    { name: 'Pavithra', count: 11, pct: 4, role: 'Operations Associate', avatar: 'PA', color: 'from-fuchsia-600 to-pink-600' },
  ];

  // Export Analytics Summary to CSV
  const handleExportAnalyticsCSV = () => {
    const lines = [];
    lines.push('Category,Item,Lead Count,Percentage');
    lines.push(`Overview,Total Leads,${totalLeads},100%`);
    lines.push(`Overview,In Pipeline,${inPipeline},99.2%`);
    lines.push(`Overview,Closed Won,${closedWon},0.8%`);
    lines.push(`Overview,Export,${exportCount},100%`);
    lines.push(`Overview,Domestic,${domesticCount},0%`);

    countryBreakdown.forEach((c) => {
      lines.push(`Country,${c.country},${c.count},${c.pct}%`);
    });
    productBreakdown.forEach((p) => {
      lines.push(`Product,${p.product},${p.count},${p.pct}%`);
    });
    pipelineStatus.forEach((s) => {
      lines.push(`Pipeline Status,${s.status},${s.count},${s.pct}%`);
    });
    teamWorkload.forEach((m) => {
      lines.push(`Responsible Person,${m.name},${m.count},${m.pct}%`);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(lines.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `trade_lead_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Country items
  const filteredCountries = countryBreakdown.filter((c) =>
    c.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered Product items
  const filteredProducts = productBreakdown.filter((p) =>
    p.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full space-y-6 pb-12 antialiased">
      {/* Page Title & Subtitle Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Analytics
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Charts and insights across your leads
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search metrics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 w-36 sm:w-48"
            />
          </div>

          {/* Download CSV Button */}
          <button
            onClick={handleExportAnalyticsCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-xs cursor-pointer"
            title="Export complete analytics data as CSV"
          >
            <Download size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Export Report</span>
          </button>
        </div>
      </div>

      {/* TOP 4 KPI CARDS: Total Leads, In Pipeline, Closed Won, Export/Domestic */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Leads */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total leads
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
            {totalLeads}
          </div>
          <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
            <span>Overall buyer accounts registered</span>
          </div>
        </div>

        {/* 2. In Pipeline */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              In pipeline
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
            {inPipeline}
          </div>
          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
            <span>99.2% Active in sales stages</span>
          </div>
        </div>

        {/* 3. Closed Won */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Closed won
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight">
            {closedWon}
          </div>
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <span>Finalized export contracts</span>
          </div>
        </div>

        {/* 4. Export / Domestic */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Export / Domestic
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Globe size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
            {exportCount}
          </div>
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Export: <span className="font-bold text-slate-800 dark:text-slate-200">{exportCount}</span> · Domestic: <span className="font-bold text-slate-800 dark:text-slate-200">{domesticCount}</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Leads by Country & Leads by Product (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEADS BY COUNTRY */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe size={18} className="text-emerald-600 dark:text-emerald-400" />
                <span>Leads by country</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Geographical buyer distribution across {totalLeads} accounts
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {countryBreakdown.length} Countries
            </span>
          </div>

          <div className="space-y-3">
            {filteredCountries.map((c) => (
              <div key={c.country} className="group">
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{c.flag}</span>
                    <span className="text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {c.country}
                    </span>
                  </div>
                  <div className="text-right text-slate-600 dark:text-slate-300">
                    <span className="font-extrabold text-slate-900 dark:text-white">{c.count}</span>{' '}
                    <span className="text-slate-400 font-medium">({c.pct}%)</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.max(c.pct, 1.5)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LEADS BY PRODUCT */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Package size={18} className="text-amber-500" />
                <span>Leads by product</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Commodity demand breakdown across inquiry records
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
              {productBreakdown.length} Commodities
            </span>
          </div>

          <div className="space-y-3">
            {filteredProducts.map((p) => (
              <div key={p.product} className="group">
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${p.color}`} />
                    <span className="capitalize text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {p.product}
                    </span>
                  </div>
                  <div className="text-right text-slate-600 dark:text-slate-300">
                    <span className="font-extrabold text-slate-900 dark:text-white">{p.count}</span>{' '}
                    <span className="text-slate-400 font-medium">({p.pct}%)</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${p.color} transition-all duration-500`}
                    style={{ width: `${Math.max(p.pct, 1.5)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: Pipeline Status & Industry Split (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* PIPELINE STATUS (Takes 2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-blue-600 dark:text-blue-400" />
                <span>Pipeline status</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Current deal progression across active trade stages
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {totalLeads} Total Inquiries
            </span>
          </div>

          {/* Segmented Funnel Bar */}
          <div className="w-full h-4 rounded-xl bg-slate-100 dark:bg-slate-800 flex overflow-hidden mb-6 p-0.5 shadow-inner">
            {pipelineStatus.map((s) => (
              <div
                key={s.status}
                className={`h-full first:rounded-l-lg last:rounded-r-lg bg-gradient-to-r ${s.barColor}`}
                style={{ width: `${s.pct}%` }}
                title={`${s.status}: ${s.count} (${s.pct}%)`}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {pipelineStatus.map((s) => (
              <div
                key={s.status}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${s.color}`} />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {s.status}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {s.pct}% of total inquiries
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-slate-900 dark:text-white block">
                    {s.count}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    ({s.pct}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* INDUSTRY SPLIT (Takes 1 column) */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChart size={18} className="text-teal-600 dark:text-teal-400" />
                  <span>Industry split</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Export vs. Domestic trade focus
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black uppercase text-emerald-800 dark:text-emerald-300">
                    Export Trade
                  </span>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                    252 (100%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-emerald-200 dark:bg-emerald-900 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-600 w-full" />
                </div>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block mt-2 font-medium">
                  Primary trade mandate across Bangladesh, Nepal, Vietnam & Southeast Asia.
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 opacity-60">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                    Domestic Trade
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    0 (0%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full bg-slate-400 w-0" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center font-medium">
            100% Export-Oriented Trading Desk
          </div>
        </div>
      </div>

      {/* SECTION 3: Leads by Responsible Person (Team Workload Overview) */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck size={19} className="text-indigo-600 dark:text-indigo-400" />
              <span>Leads by responsible person</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Team workload overview across all 252 registered trade inquiries
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>{teamWorkload.length} Active Representatives</span>
          </div>
        </div>

        {/* 9 Team Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamWorkload.map((member) => (
            <div
              key={member.name}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-all group"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${member.color} text-white flex items-center justify-center font-black text-xs shadow-xs`}>
                    {member.avatar}
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {member.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {member.role}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-slate-900 dark:text-white block">
                    {member.count}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {member.pct}% of leads
                  </span>
                </div>
              </div>

              {/* Workload Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${member.color} transition-all duration-500`}
                  style={{ width: `${Math.max(member.pct * 4, 10)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
