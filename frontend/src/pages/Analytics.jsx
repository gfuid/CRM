import React, { useState, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  CheckCircle2,
  Globe,
  Download,
  Search,
  Package,
  Layers,
  UserCheck,
  PieChart,
  BarChart3,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  RotateCcw,
  Sparkles,
  Clock,
  ArrowRight,
  Check,
  FileSpreadsheet
} from 'lucide-react';

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

// Deterministic Baseline Dataset Generation for 252 Leads across Dates
const buildDeterministicLeads = () => {
  const leads = [];

  // Distribution definitions
  const countries = [
    { name: 'Bangladesh', count: 81, flag: '🇧🇩' },
    { name: 'Nepal', count: 58, flag: '🇳🇵' },
    { name: 'Vietnam', count: 47, flag: '🇻🇳' },
    { name: 'Malaysia', count: 41, flag: '🇲🇾' },
    { name: 'Not specified', count: 13, flag: '🌐' },
    { name: 'India', count: 4, flag: '🇮🇳' },
    { name: 'Russia', count: 3, flag: '🇷🇺' },
    { name: 'Indonesia', count: 2, flag: '🇮🇩' },
    { name: 'Saudi Arabia', count: 2, flag: '🇸🇦' },
    { name: 'Greece', count: 1, flag: '🇬🇷' },
  ];

  const products = [
    { name: 'turmeric', count: 176, color: 'bg-amber-500' },
    { name: 'rice ddgs', count: 38, color: 'bg-emerald-500' },
    { name: 'corn ddgs', count: 31, color: 'bg-yellow-500' },
    { name: 'dorb', count: 26, color: 'bg-teal-500' },
    { name: 'chilli', count: 20, color: 'bg-rose-500' },
    { name: 'maize', count: 19, color: 'bg-orange-500' },
    { name: 'rsm', count: 18, color: 'bg-blue-500' },
    { name: 'Not specified', count: 7, color: 'bg-slate-400' },
    { name: 'ginger', count: 4, color: 'bg-lime-500' },
  ];

  const statuses = [
    { name: 'Lead Generation', count: 101, color: 'bg-blue-500', barColor: 'from-blue-500 to-indigo-500' },
    { name: 'Contact Established', count: 88, color: 'bg-amber-500', barColor: 'from-amber-400 to-orange-500' },
    { name: 'Closed Lost', count: 61, color: 'bg-rose-500', barColor: 'from-rose-500 to-red-600' },
    { name: 'Closed Won', count: 2, color: 'bg-emerald-500', barColor: 'from-emerald-500 to-teal-500' },
  ];

  const team = [
    { name: 'Rohan', count: 48, role: 'Senior Trader', avatar: 'RO', color: 'from-blue-600 to-indigo-600' },
    { name: 'Shiva', count: 39, role: 'Export Manager', avatar: 'SH', color: 'from-emerald-600 to-teal-600' },
    { name: 'David', count: 35, role: 'Trade Specialist', avatar: 'DA', color: 'from-amber-600 to-orange-600' },
    { name: 'Preetham', count: 31, role: 'Sales Executive', avatar: 'PR', color: 'from-purple-600 to-indigo-600' },
    { name: 'adric', count: 27, role: 'Key Accounts', avatar: 'AD', color: 'from-pink-600 to-rose-600' },
    { name: 'aarav', count: 24, role: 'Desk Trader', avatar: 'AA', color: 'from-cyan-600 to-blue-600' },
    { name: 'Rahul', count: 21, role: 'Commodity Rep', avatar: 'RA', color: 'from-teal-600 to-emerald-600' },
    { name: 'Dan', count: 16, role: 'Regional Lead', avatar: 'DA', color: 'from-violet-600 to-purple-600' },
    { name: 'Pavithra', count: 11, role: 'Operations Associate', avatar: 'PA', color: 'from-fuchsia-600 to-pink-600' },
  ];

  // Daily lead distribution for September 2026 (Days 1 to 20): total 184
  const sepCounts = [
    { day: 20, count: 14 }, // Today
    { day: 19, count: 12 }, // Yesterday
    { day: 18, count: 15 },
    { day: 17, count: 10 },
    { day: 16, count: 18 },
    { day: 15, count: 11 },
    { day: 14, count: 9 },
    { day: 13, count: 8 },
    { day: 12, count: 12 },
    { day: 11, count: 14 },
    { day: 10, count: 9 },
    { day: 9, count: 7 },
    { day: 8, count: 11 },
    { day: 7, count: 6 },
    { day: 6, count: 8 },
    { day: 5, count: 10 },
    { day: 4, count: 7 },
    { day: 3, count: 5 },
    { day: 2, count: 4 },
    { day: 1, count: 4 },
  ];

  // Build flattened pools
  const countryPool = [];
  countries.forEach((c) => {
    for (let i = 0; i < c.count; i++) countryPool.push(c.name);
  });

  const productPool = [];
  products.forEach((p) => {
    for (let i = 0; i < p.count; i++) productPool.push(p.name);
  });

  const statusPool = [];
  statuses.forEach((s) => {
    for (let i = 0; i < s.count; i++) statusPool.push(s.name);
  });

  const teamPool = [];
  team.forEach((t) => {
    for (let i = 0; i < t.count; i++) teamPool.push(t.name);
  });

  // Assign dates
  let dateIndex = 0;
  for (let i = 0; i < 252; i++) {
    let dateStr = '2026-09-20';
    if (i < 184) {
      // Pick from September
      let cum = 0;
      for (const item of sepCounts) {
        cum += item.count;
        if (i < cum) {
          const dStr = item.day < 10 ? `0${item.day}` : `${item.day}`;
          dateStr = `2026-09-${dStr}`;
          break;
        }
      }
    } else if (i < 230) {
      // August 2026 (46 leads)
      const day = ((i - 184) % 31) + 1;
      const dStr = day < 10 ? `0${day}` : `${day}`;
      dateStr = `2026-08-${dStr}`;
    } else {
      // July 2026 (22 leads)
      const day = ((i - 230) % 31) + 1;
      const dStr = day < 10 ? `0${day}` : `${day}`;
      dateStr = `2026-07-${dStr}`;
    }

    leads.push({
      id: `lead_det_${i + 1}`,
      date: dateStr,
      country: countryPool[i] || 'Bangladesh',
      product: productPool[i % productPool.length] || 'turmeric',
      status: statusPool[i] || 'Lead Generation',
      agent: teamPool[i] || 'Rohan',
      type: 'Export',
      value: 25000 + ((i * 1337) % 65000),
      company: `Trade Account #${i + 1} (${countryPool[i] || 'Export'})`,
    });
  }

  return { leads, countries, products, statuses, team };
};

const BASELINE_DATA = buildDeterministicLeads();

export default function Analytics() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('insights'); // 'insights' | 'calendar'
  const [datePreset, setDatePreset] = useState('all'); // 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'last_30_days' | 'custom' | 'single_date'
  const [customFrom, setCustomFrom] = useState('2026-09-01');
  const [customTo, setCustomTo] = useState('2026-09-20');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('2026-09-20');
  const [calendarMonth, setCalendarMonth] = useState({ year: 2026, month: 8 }); // 0-indexed: 8 is September
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  // Filter leads based on the active date preset or range
  const filteredLeads = useMemo(() => {
    return BASELINE_DATA.leads.filter((lead) => {
      if (datePreset === 'all') return true;
      if (datePreset === 'today') return lead.date === '2026-09-20';
      if (datePreset === 'yesterday') return lead.date === '2026-09-19';
      if (datePreset === 'this_week') return lead.date >= '2026-09-14' && lead.date <= '2026-09-20';
      if (datePreset === 'this_month') return lead.date >= '2026-09-01' && lead.date <= '2026-09-30';
      if (datePreset === 'last_month') return lead.date >= '2026-08-01' && lead.date <= '2026-08-31';
      if (datePreset === 'last_30_days') return lead.date >= '2026-08-21' && lead.date <= '2026-09-20';
      if (datePreset === 'single_date') return lead.date === selectedCalendarDate;
      if (datePreset === 'custom') {
        if (customFrom && customTo) return lead.date >= customFrom && lead.date <= customTo;
        if (customFrom) return lead.date >= customFrom;
        if (customTo) return lead.date <= customTo;
      }
      return true;
    });
  }, [datePreset, customFrom, customTo, selectedCalendarDate]);

  // Recalculate Metrics based on filtered leads
  const metrics = useMemo(() => {
    const total = filteredLeads.length;
    if (datePreset === 'all') {
      // Return exact user-specified figures
      return {
        totalLeads: 252,
        inPipeline: 250,
        closedWon: 2,
        exportCount: 252,
        domesticCount: 0,
        countries: BASELINE_DATA.countries.map((c) => ({
          country: c.name,
          count: c.count,
          pct: Math.round((c.count / 252) * 100),
          flag: c.flag,
        })),
        products: BASELINE_DATA.products.map((p) => ({
          product: p.name,
          count: p.count,
          pct: Math.round((p.count / 339) * 100),
          color: p.color,
        })),
        pipelineStatus: BASELINE_DATA.statuses.map((s) => ({
          status: s.name,
          count: s.count,
          pct: Math.round((s.count / 252) * 100),
          color: s.color,
          barColor: s.barColor,
        })),
        teamWorkload: BASELINE_DATA.team.map((t) => ({
          name: t.name,
          count: t.count,
          pct: Math.round((t.count / 252) * 100),
          role: t.role,
          avatar: t.avatar,
          color: t.color,
        })),
      };
    }

    // Dynamic calculation for filtered date
    const inPipeline = filteredLeads.filter((l) => l.status !== 'Closed Won').length;
    const closedWon = filteredLeads.filter((l) => l.status === 'Closed Won').length;
    const exportCount = filteredLeads.filter((l) => l.type === 'Export').length;
    const domesticCount = filteredLeads.filter((l) => l.type === 'Domestic').length;

    // Country Breakdown
    const countryMap = {};
    filteredLeads.forEach((l) => {
      countryMap[l.country] = (countryMap[l.country] || 0) + 1;
    });
    const countries = BASELINE_DATA.countries
      .map((c) => ({
        country: c.name,
        count: countryMap[c.name] || 0,
        pct: total > 0 ? Math.round(((countryMap[c.name] || 0) / total) * 100) : 0,
        flag: c.flag,
      }))
      .filter((c) => c.count > 0 || datePreset === 'all');

    // Product Breakdown
    const productMap = {};
    filteredLeads.forEach((l) => {
      productMap[l.product] = (productMap[l.product] || 0) + 1;
    });
    const products = BASELINE_DATA.products
      .map((p) => ({
        product: p.name,
        count: productMap[p.name] || 0,
        pct: total > 0 ? Math.round(((productMap[p.name] || 0) / total) * 100) : 0,
        color: p.color,
      }))
      .filter((p) => p.count > 0 || datePreset === 'all');

    // Pipeline Status
    const statusMap = {};
    filteredLeads.forEach((l) => {
      statusMap[l.status] = (statusMap[l.status] || 0) + 1;
    });
    const pipelineStatus = BASELINE_DATA.statuses.map((s) => ({
      status: s.name,
      count: statusMap[s.name] || 0,
      pct: total > 0 ? Math.round(((statusMap[s.name] || 0) / total) * 100) : 0,
      color: s.color,
      barColor: s.barColor,
    }));

    // Team Workload
    const agentMap = {};
    filteredLeads.forEach((l) => {
      agentMap[l.agent] = (agentMap[l.agent] || 0) + 1;
    });
    const teamWorkload = BASELINE_DATA.team
      .map((t) => ({
        name: t.name,
        count: agentMap[t.name] || 0,
        pct: total > 0 ? Math.round(((agentMap[t.name] || 0) / total) * 100) : 0,
        role: t.role,
        avatar: t.avatar,
        color: t.color,
      }))
      .filter((t) => t.count > 0 || datePreset === 'all');

    return {
      totalLeads: total,
      inPipeline,
      closedWon,
      exportCount,
      domesticCount,
      countries,
      products,
      pipelineStatus,
      teamWorkload,
    };
  }, [filteredLeads, datePreset]);

  // Calendar Day Leads Lookup
  const leadsByDate = useMemo(() => {
    const map = {};
    BASELINE_DATA.leads.forEach((l) => {
      if (!map[l.date]) map[l.date] = [];
      map[l.date].push(l);
    });
    return map;
  }, []);

  // Format active date filter label
  const getDateFilterLabel = () => {
    if (datePreset === 'all') return 'All Time';
    if (datePreset === 'today') return 'Today (20 Sep)';
    if (datePreset === 'yesterday') return 'Yesterday (19 Sep)';
    if (datePreset === 'this_week') return 'This Week (14-20 Sep)';
    if (datePreset === 'this_month') return 'This Month (Sep 2026)';
    if (datePreset === 'last_month') return 'Last Month (Aug 2026)';
    if (datePreset === 'last_30_days') return 'Last 30 Days';
    if (datePreset === 'single_date') return `Date: ${selectedCalendarDate}`;
    if (datePreset === 'custom') return `${customFrom} to ${customTo}`;
    return 'Date Filter';
  };

  // Export Analytics Summary to CSV
  const handleExportAnalyticsCSV = () => {
    const lines = [];
    lines.push('Category,Item,Lead Count,Percentage');
    lines.push(`Filter Period,${getDateFilterLabel()},${metrics.totalLeads},100%`);
    lines.push(`Overview,Total Leads,${metrics.totalLeads},100%`);
    lines.push(`Overview,In Pipeline,${metrics.inPipeline},${metrics.totalLeads > 0 ? Math.round((metrics.inPipeline / metrics.totalLeads) * 100) : 0}%`);
    lines.push(`Overview,Closed Won,${metrics.closedWon},${metrics.totalLeads > 0 ? Math.round((metrics.closedWon / metrics.totalLeads) * 100) : 0}%`);
    lines.push(`Overview,Export,${metrics.exportCount},100%`);
    lines.push(`Overview,Domestic,${metrics.domesticCount},0%`);

    metrics.countries.forEach((c) => {
      lines.push(`Country,${c.country},${c.count},${c.pct}%`);
    });
    metrics.products.forEach((p) => {
      lines.push(`Product,${p.product},${p.count},${p.pct}%`);
    });
    metrics.pipelineStatus.forEach((s) => {
      lines.push(`Pipeline Status,${s.status},${s.count},${s.pct}%`);
    });
    metrics.teamWorkload.forEach((m) => {
      lines.push(`Responsible Person,${m.name},${m.count},${m.pct}%`);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(lines.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `trade_lead_analytics_${datePreset}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Search filtering
  const displayCountries = metrics.countries.filter((c) =>
    c.country.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const displayProducts = metrics.products.filter((p) =>
    p.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Month navigation helpers
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCalendarMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCalendarMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  // Calendar Grid calculation for calendarMonth
  const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
  const firstDayIndex = new Date(calendarMonth.year, calendarMonth.month, 1).getDay();

  // Active selected day leads
  const selectedDayLeads = leadsByDate[selectedCalendarDate] || [];

  return (
    <div className="w-full space-y-6 pb-12 antialiased">
      {/* Top Banner: Page Title, View Mode, Calendar Picker & Export */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Analytics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Live Trade Desk
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Charts, date-wise timeline, and trade inquiry insights across your leads
          </p>
        </div>

        {/* Action Controls & Calendar Filter */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* View Switcher: Insights vs Calendar View */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => setViewMode('insights')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'insights'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 size={14} />
              <span>Insights</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarDays size={14} />
              <span>Calendar View</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search metrics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 w-32 sm:w-40"
            />
          </div>

          {/* Calendar Date Range Dropdown Popover */}
          <div className="relative">
            <button
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                datePreset !== 'all'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-400/20'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
              title="Select Calendar Date or Range"
            >
              <Calendar size={14} className={datePreset !== 'all' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'} />
              <span>{getDateFilterLabel()}</span>
              <ChevronDown size={13} className="text-slate-400 ml-0.5" />
            </button>

            {dateDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-4 animate-scaleUp">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-white">
                    <Calendar size={15} className="text-emerald-600" />
                    <span>Calendar & Date Filter</span>
                  </div>
                  <button
                    onClick={() => setDateDropdownOpen(false)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1 text-xs">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Quick Timeline Presets
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        setDatePreset('all');
                        setDateDropdownOpen(false);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-left font-bold transition-all ${
                        datePreset === 'all'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      🌐 All Time (252)
                    </button>
                    <button
                      onClick={() => {
                        setDatePreset('today');
                        setDateDropdownOpen(false);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-left font-bold transition-all ${
                        datePreset === 'today'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      ☀️ Today (20 Sep)
                    </button>
                    <button
                      onClick={() => {
                        setDatePreset('yesterday');
                        setDateDropdownOpen(false);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-left font-bold transition-all ${
                        datePreset === 'yesterday'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      🌙 Yesterday
                    </button>
                    <button
                      onClick={() => {
                        setDatePreset('this_week');
                        setDateDropdownOpen(false);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-left font-bold transition-all ${
                        datePreset === 'this_week'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      📆 Last 7 Days
                    </button>
                    <button
                      onClick={() => {
                        setDatePreset('this_month');
                        setDateDropdownOpen(false);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-left font-bold transition-all ${
                        datePreset === 'this_month'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      🗓️ This Month (Sep)
                    </button>
                    <button
                      onClick={() => {
                        setDatePreset('last_month');
                        setDateDropdownOpen(false);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-left font-bold transition-all ${
                        datePreset === 'last_month'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      📊 Last Month (Aug)
                    </button>
                  </div>
                </div>

                {/* Custom Calendar Date Inputs */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Custom Date Range
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">From Date</span>
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">To Date</span>
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDatePreset('custom');
                      setDateDropdownOpen(false);
                    }}
                    className="w-full py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-xs"
                  >
                    Apply Custom Range
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Download CSV Button */}
          <button
            onClick={handleExportAnalyticsCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-xs cursor-pointer"
            title="Export analytics report as CSV"
          >
            <Download size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* ACTIVE DATE FILTER BANNER */}
      {datePreset !== 'all' && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Calendar size={14} />
            </div>
            <div>
              <span className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                Filtered Period: {getDateFilterLabel()}
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-medium">
                Displaying {metrics.totalLeads} inquiries ({metrics.totalLeads > 0 ? Math.round((metrics.totalLeads / 252) * 100) : 0}% of all-time 252 records)
              </span>
            </div>
          </div>

          <button
            onClick={() => setDatePreset('all')}
            className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 transition-all shadow-xs cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Reset to All Time (252)</span>
          </button>
        </div>
      )}

      {/* VIEW MODE 1: INTERACTIVE MONTHLY CALENDAR GRID */}
      {viewMode === 'calendar' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
            {/* Calendar Month Navigation Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarDays size={20} className="text-emerald-600 dark:text-emerald-400" />
                  <span>{monthNames[calendarMonth.month]} {calendarMonth.year}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any date to inspect day-wise trade inquiries, commodity volumes, and buyer accounts
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCalendarMonth({ year: 2026, month: 8 })}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  September 2026 (Today)
                </button>
                <button
                  onClick={handleNextMonth}
                  className="w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-2">
              {/* Offset leading empty days */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[85px] p-2 rounded-xl bg-slate-50/40 dark:bg-slate-950/20 border border-transparent" />
              ))}

              {/* Month Day Cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
                const mStr = calendarMonth.month + 1 < 10 ? `0${calendarMonth.month + 1}` : `${calendarMonth.month + 1}`;
                const dateKey = `${calendarMonth.year}-${mStr}-${dStr}`;
                const dayLeads = leadsByDate[dateKey] || [];
                const isToday = dateKey === '2026-09-20';
                const isSelected = selectedCalendarDate === dateKey;

                return (
                  <div
                    key={dateKey}
                    onClick={() => {
                      setSelectedCalendarDate(dateKey);
                    }}
                    className={`min-h-[85px] p-2 sm:p-2.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/30 shadow-sm'
                        : isToday
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700'
                        : dayLeads.length > 0
                        ? 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-400 hover:shadow-xs'
                        : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black ${
                        isSelected ? 'text-emerald-700 dark:text-emerald-300' : isToday ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {dayNum}
                      </span>
                      {isToday && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white font-black text-[9px] uppercase tracking-wider animate-pulse">
                          Today
                        </span>
                      )}
                    </div>

                    {dayLeads.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        <span className={`inline-block px-1.5 py-0.5 rounded-md font-extrabold text-[10px] ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                        }`}>
                          +{dayLeads.length} leads
                        </span>
                        <div className="text-[9px] font-medium text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                          {dayLeads[0]?.product} {dayLeads.length > 1 ? `+${dayLeads.length - 1}` : ''}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DAY INQUIRIES DOSSIER DRAWER */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Clock size={17} className="text-emerald-600" />
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Daily Trade Activity: {selectedCalendarDate}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedDayLeads.length > 0
                    ? `${selectedDayLeads.length} trade leads recorded on this date`
                    : 'No leads registered on this date'}
                </p>
              </div>

              {selectedDayLeads.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setDatePreset('single_date');
                      setViewMode('insights');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    <BarChart3 size={13} />
                    <span>Filter All Insights to this Date</span>
                  </button>
                </div>
              )}
            </div>

            {selectedDayLeads.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedDayLeads.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 hover:border-emerald-400 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-900 dark:text-white truncate">
                        {COUNTRY_FLAGS[item.country] || '🌐'} {item.country}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize font-bold text-amber-600 dark:text-amber-400">
                        📦 {item.product}
                      </span>
                      <span className="font-semibold text-slate-500 text-[11px]">
                        Rep: {item.agent}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span>Value: ${(item.value || 35000).toLocaleString()}</span>
                      <span className="font-bold text-emerald-600">Export CIF</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Select another date from the calendar above to inspect trade inquiry logs.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: CHARTS & BREAKDOWN (Always reactive to active Date Filter) */}
      {viewMode === 'insights' && (
        <div className="space-y-6 animate-fadeIn">
          {/* TOP 4 KPI CARDS */}
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
                {metrics.totalLeads}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                <span>{datePreset === 'all' ? 'Overall buyer accounts registered' : `Inquiries in ${getDateFilterLabel()}`}</span>
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
                {metrics.inPipeline}
              </div>
              <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <span>
                  {metrics.totalLeads > 0
                    ? `${Math.round((metrics.inPipeline / metrics.totalLeads) * 100)}% Active in sales stages`
                    : '0% Active'}
                </span>
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
                {metrics.closedWon}
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
                {metrics.exportCount}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Export: <span className="font-bold text-slate-800 dark:text-slate-200">{metrics.exportCount}</span> · Domestic: <span className="font-bold text-slate-800 dark:text-slate-200">{metrics.domesticCount}</span>
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
                    Geographical buyer distribution across {metrics.totalLeads} accounts
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {displayCountries.length} Countries
                </span>
              </div>

              <div className="space-y-3">
                {displayCountries.length > 0 ? (
                  displayCountries.map((c) => (
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
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No matching countries in this period.
                  </div>
                )}
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
                  {displayProducts.length} Commodities
                </span>
              </div>

              <div className="space-y-3">
                {displayProducts.length > 0 ? (
                  displayProducts.map((p) => (
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
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No matching commodities in this period.
                  </div>
                )}
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
                  {metrics.totalLeads} Active Inquiries
                </span>
              </div>

              {/* Segmented Funnel Bar */}
              <div className="w-full h-4 rounded-xl bg-slate-100 dark:bg-slate-800 flex overflow-hidden mb-6 p-0.5 shadow-inner">
                {metrics.pipelineStatus.map((s) => (
                  <div
                    key={s.status}
                    className={`h-full first:rounded-l-lg last:rounded-r-lg bg-gradient-to-r ${s.barColor}`}
                    style={{ width: `${s.pct}%` }}
                    title={`${s.status}: ${s.count} (${s.pct}%)`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {metrics.pipelineStatus.map((s) => (
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
                          {s.pct}% of period inquiries
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
                        {metrics.exportCount} (100%)
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
                  Team workload overview across active inquiries ({metrics.totalLeads} assigned)
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span>{metrics.teamWorkload.length} Active Representatives</span>
              </div>
            </div>

            {/* Team Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.teamWorkload.map((member) => (
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
                      style={{ width: `${Math.max(member.pct * 4, 8)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
