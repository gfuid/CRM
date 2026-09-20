import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Search,
  Filter,
  Download,
  Plus,
  Edit3,
  Trash2,
  Check,
  DollarSign,
  Briefcase,
  Users,
  ShieldCheck,
  Building2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  SlidersHorizontal,
  X
} from 'lucide-react';
import Modal from '../components/Modal';

export default function Analytics() {
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState('Apr');
  const [timeframe, setTimeframe] = useState('This Month');
  const [tableSearch, setTableSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);

  // 12 Months revenue data for Dot-Matrix Chart
  const monthlyData = {
    '2025': [
      { month: 'Jan', online: 4, offline: 3, total: 18420, onlineRev: 10420, offlineRev: 8000 },
      { month: 'Feb', online: 7, offline: 5, total: 24190, onlineRev: 14190, offlineRev: 10000 },
      { month: 'Mar', online: 9, offline: 6, total: 31840, onlineRev: 18840, offlineRev: 13000 },
      { month: 'Apr', online: 12, offline: 8, total: 28923, onlineRev: 17366, offlineRev: 11557 },
      { month: 'May', online: 6, offline: 4, total: 21300, onlineRev: 13300, offlineRev: 8000 },
      { month: 'Jun', online: 5, offline: 3, total: 19850, onlineRev: 11850, offlineRev: 8000 },
      { month: 'Jul', online: 8, offline: 6, total: 27410, onlineRev: 16410, offlineRev: 11000 },
      { month: 'Aug', online: 10, offline: 7, total: 33650, onlineRev: 20650, offlineRev: 13000 },
      { month: 'Sep', online: 7, offline: 5, total: 26100, onlineRev: 15100, offlineRev: 11000 },
      { month: 'Oct', online: 11, offline: 9, total: 39400, onlineRev: 23400, offlineRev: 16000 },
      { month: 'Nov', online: 8, offline: 6, total: 29820, onlineRev: 17820, offlineRev: 12000 },
      { month: 'Dec', online: 13, offline: 9, total: 44950, onlineRev: 27950, offlineRev: 17000 },
    ],
    '2024': [
      { month: 'Jan', online: 3, offline: 2, total: 14200, onlineRev: 8200, offlineRev: 6000 },
      { month: 'Feb', online: 5, offline: 4, total: 19500, onlineRev: 11500, offlineRev: 8000 },
      { month: 'Mar', online: 7, offline: 5, total: 25000, onlineRev: 15000, offlineRev: 10000 },
      { month: 'Apr', online: 9, offline: 6, total: 22400, onlineRev: 13400, offlineRev: 9000 },
      { month: 'May', online: 5, offline: 3, total: 17800, onlineRev: 10800, offlineRev: 7000 },
      { month: 'Jun', online: 4, offline: 3, total: 16200, onlineRev: 9200, offlineRev: 7000 },
      { month: 'Jul', online: 6, offline: 4, total: 21500, onlineRev: 12500, offlineRev: 9000 },
      { month: 'Aug', online: 8, offline: 5, total: 27000, onlineRev: 16000, offlineRev: 11000 },
      { month: 'Sep', online: 6, offline: 4, total: 21000, onlineRev: 12000, offlineRev: 9000 },
      { month: 'Oct', online: 9, offline: 7, total: 31000, onlineRev: 18000, offlineRev: 13000 },
      { month: 'Nov', online: 7, offline: 5, total: 24000, onlineRev: 14000, offlineRev: 10000 },
      { month: 'Dec', online: 11, offline: 8, total: 36000, onlineRev: 21000, offlineRev: 15000 },
    ],
  };

  const currentYearData = monthlyData[selectedYear] || monthlyData['2025'];
  const activeMonthObj = currentYearData.find((m) => m.month === selectedMonth) || currentYearData[3];
  const yearTotalRevenue = currentYearData.reduce((sum, m) => sum + m.total, 0);

  // Performance breakdown based on timeframe
  const performanceData = {
    'This Month': { salesAchieved: '$493,200', salesPct: 82, kpiPct: 71, csatPct: 86 },
    'Last Month': { salesAchieved: '$420,100', salesPct: 74, kpiPct: 68, csatPct: 84 },
    'This Quarter': { salesAchieved: '$1,380,000', salesPct: 88, kpiPct: 76, csatPct: 89 },
    'Year to Date': { salesAchieved: '$2,522,895', salesPct: 91, kpiPct: 80, csatPct: 88 },
  }[timeframe] || { salesAchieved: '$493,200', salesPct: 82, kpiPct: 71, csatPct: 86 };

  // Authentic Global Commodity Export Deals & Shipments
  const [deals, setDeals] = useState([
    {
      id: 'deal_1',
      name: 'Curcumin 3.5% Turmeric Finger Consignment (50 MT)',
      code: '#EXP-88421',
      category: 'Spices Export',
      client: 'Al-Barakah Global Agro Foods LLC (UAE 🇦🇪)',
      seats: 50, // Metric Tons
      unitPrice: 1680,
      revenue: 84000,
      status: 'Closed Won',
      date: '19 Sep 2026',
    },
    {
      id: 'deal_2',
      name: 'Teja S4 Stemless Red Chilli (36 MT)',
      code: '#EXP-91043',
      category: 'Spices Export',
      client: 'VietSpices Import & Distribution (Vietnam 🇻🇳)',
      seats: 36,
      unitPrice: 1902,
      revenue: 68500,
      status: 'Negotiation',
      date: '19 Sep 2026',
    },
    {
      id: 'deal_3',
      name: 'Rice DDGS & DORB High-Protein Animal Feed (120 MT)',
      code: '#EXP-77312',
      category: 'Feed Ingredients',
      client: 'Continental Feeds BV (Netherlands 🇳🇱)',
      seats: 120,
      unitPrice: 1183,
      revenue: 142000,
      status: 'Closed Won',
      date: '18 Sep 2026',
    },
    {
      id: 'deal_4',
      name: 'Yellow Maize & Soya Seed Rail Consignment (85 MT)',
      code: '#EXP-44021',
      category: 'Grain & Oilseed',
      client: 'Dhaka Agro Feeds Ltd (Bangladesh 🇧🇩)',
      seats: 85,
      unitPrice: 894,
      revenue: 76000,
      status: 'Closed Won',
      date: '20 Sep 2026',
    },
    {
      id: 'deal_5',
      name: 'Fresh Tender Coconut Diamond Cut Reefer Container',
      code: '#EXP-33104',
      category: 'Fresh Produce',
      client: 'Ceylon Tropical Goods PLC (Sri Lanka 🇱🇰)',
      seats: 25,
      unitPrice: 1280,
      revenue: 32000,
      status: 'Proposal Sent',
      date: '21 Sep 2026',
    },
    {
      id: 'deal_6',
      name: 'Double Polish Turmeric Fingers CIF Dammam',
      code: '#EXP-12890',
      category: 'Spices Export',
      client: 'Gulf Spice Processing Est. (Saudi Arabia 🇸🇦)',
      seats: 35,
      unitPrice: 1657,
      revenue: 58000,
      status: 'Closed Won',
      date: '16 Sep 2026',
    },
  ]);

  // Form State for Add / Edit Deal Modal
  const [dealForm, setDealForm] = useState({
    name: '',
    category: 'Spices Export',
    client: '',
    seats: 20,
    unitPrice: 1500,
    status: 'Proposal Sent',
  });

  const handleOpenAdd = () => {
    setEditingDeal(null);
    setDealForm({
      name: '',
      category: 'Enterprise Cloud',
      client: '',
      seats: 10,
      unitPrice: 1000,
      status: 'Proposal Sent',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (deal) => {
    setEditingDeal(deal);
    setDealForm({
      name: deal.name,
      category: deal.category,
      client: deal.client,
      seats: deal.seats,
      unitPrice: deal.unitPrice,
      status: deal.status,
    });
    setModalOpen(true);
  };

  const handleSaveDeal = (e) => {
    e.preventDefault();
    const calculatedRevenue = Number(dealForm.seats) * Number(dealForm.unitPrice);

    if (editingDeal) {
      setDeals(
        deals.map((d) =>
          d.id === editingDeal.id
            ? {
                ...d,
                ...dealForm,
                seats: Number(dealForm.seats),
                unitPrice: Number(dealForm.unitPrice),
                revenue: calculatedRevenue,
              }
            : d
        )
      );
    } else {
      const newDeal = {
        id: 'deal_' + Date.now(),
        code: `#D-${Math.floor(10000 + Math.random() * 90000)}`,
        ...dealForm,
        seats: Number(dealForm.seats),
        unitPrice: Number(dealForm.unitPrice),
        revenue: calculatedRevenue,
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      };
      setDeals([newDeal, ...deals]);
    }
    setModalOpen(false);
  };

  const handleDeleteDeal = (id) => {
    if (window.confirm('Delete this enterprise contract record?')) {
      setDeals(deals.filter((d) => d.id !== id));
    }
  };

  const handleExportCSV = () => {
    const headers = ['Deal Name', 'Contract Code', 'Category', 'Client', 'Seats/Units', 'Unit Price ($)', 'Total Revenue ($)', 'Status', 'Date'];
    const rows = deals.map((d) => [
      `"${d.name}"`,
      d.code,
      `"${d.category}"`,
      `"${d.client}"`,
      d.seats,
      d.unitPrice,
      d.revenue,
      d.status,
      d.date,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Travel_Trade_CRM_Deals_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Deals
  const filteredDeals = deals.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
      d.client.toLowerCase().includes(tableSearch.toLowerCase()) ||
      d.code.toLowerCase().includes(tableSearch.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full space-y-6">
      {/* 1. TOP METRICS ROW: 4 Horizontal Cards (100% Tailwind Responsive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* Card 1: Total Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Pipeline Revenue</span>
            <span className="p-1.5 rounded-lg bg-mint-50 text-mint-600">
              <DollarSign size={15} />
            </span>
          </div>
          <div className="flex items-end justify-between mt-3">
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">$101,491</div>
              <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-mint-600 bg-mint-50 px-2 py-0.5 rounded-full">
                <TrendingUp size={12} />
                <span>+1.50% vs last week</span>
              </div>
            </div>
            {/* SVG Sparkline */}
            <div className="h-10 w-20">
              <svg width="80" height="38" viewBox="0 0 80 38" fill="none">
                <path d="M2 30C14 28 20 18 32 22C44 26 52 10 64 14C70 16 74 4 78 6" stroke="#58BA84" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Software Licenses Sold */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Enterprise Seats Sold</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Briefcase size={15} />
            </span>
          </div>
          <div className="flex items-end justify-between mt-3">
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">4,346</div>
              <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-mint-600 bg-mint-50 px-2 py-0.5 rounded-full">
                <TrendingUp size={12} />
                <span>+2.10% vs target</span>
              </div>
            </div>
            <div className="h-10 w-20">
              <svg width="80" height="38" viewBox="0 0 80 38" fill="none">
                <path d="M2 26C12 24 22 32 34 20C44 10 54 16 64 8C70 4 74 6 78 2" stroke="#58BA84" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 3: Closed Won Sales */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Closed Contract Value</span>
            <span className="p-1.5 rounded-lg bg-coral-50 text-coral-600">
              <ShieldCheck size={15} />
            </span>
          </div>
          <div className="flex items-end justify-between mt-3">
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">$283,142</div>
              <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-crimson-600 bg-crimson-50 px-2 py-0.5 rounded-full">
                <TrendingDown size={12} />
                <span>-4.51% quarterly dip</span>
              </div>
            </div>
            <div className="h-10 w-20">
              <svg width="80" height="38" viewBox="0 0 80 38" fill="none">
                <path d="M2 6C12 10 22 4 32 16C44 26 54 18 64 28C70 32 74 28 78 32" stroke="#EB4E55" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 4: Total Customer Accounts */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Active Client Companies</span>
            <span className="p-1.5 rounded-lg bg-gold-50 text-gold-700">
              <Building2 size={15} />
            </span>
          </div>
          <div className="flex items-end justify-between mt-3">
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">8,426</div>
              <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-mint-600 bg-mint-50 px-2 py-0.5 rounded-full">
                <TrendingUp size={12} />
                <span>+3.75% retention</span>
              </div>
            </div>
            <div className="h-10 w-20">
              <svg width="80" height="38" viewBox="0 0 80 38" fill="none">
                <path d="M2 28C10 26 20 16 32 20C42 24 52 8 64 10C70 12 74 2 78 4" stroke="#58BA84" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE ROW: Interactive Sales Summary Chart & Performance Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Dot-Matrix Sales Chart (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          {/* Chart Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Revenue & Inbound Contract Matrix</h2>
              <p className="text-xs text-slate-400 mt-0.5">Click any month below to analyze deal flow & touchpoint split</p>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                {['2024', '2025'].map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      selectedYear === yr ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Subtotal Headline & Channel Legend */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mt-4 gap-2">
            <div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                ${yearTotalRevenue.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                Total Annual Revenue for FY {selectedYear}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-mint-500" />
                <span>Enterprise Inbound</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-mint-300" />
                <span>Outbound SDR</span>
              </div>
            </div>
          </div>

          {/* Selected Month Floating Dynamic Badge */}
          <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold">{activeMonthObj.month}</span>
              <span className="text-slate-600 font-semibold">Selected Month Revenue:</span>
              <span className="text-mint-700 font-black text-sm">${activeMonthObj.total.toLocaleString()}</span>
            </div>
            <div className="text-slate-500 text-[11px] hidden sm:block">
              Inbound: <span className="font-bold text-slate-800">${activeMonthObj.onlineRev.toLocaleString()}</span> &bull; Outbound: <span className="font-bold text-slate-800">${activeMonthObj.offlineRev.toLocaleString()}</span>
            </div>
          </div>

          {/* Dot-Matrix Visual Columns */}
          <div className="mt-6 pt-2">
            <div className="grid grid-cols-12 gap-1 sm:gap-2 h-48 items-end border-b border-slate-100 pb-2">
              {currentYearData.map((item) => {
                const isSelected = item.month === selectedMonth;
                const totalDots = 14;
                const onlineDots = item.online;
                const offlineDots = item.offline;

                return (
                  <button
                    key={item.month}
                    onClick={() => setSelectedMonth(item.month)}
                    className={`flex flex-col items-center justify-end h-full group transition-all py-1 rounded-lg ${
                      isSelected ? 'bg-coral-50/60 ring-2 ring-coral-400/50' : 'hover:bg-slate-50'
                    }`}
                    title={`${item.month}: $${item.total.toLocaleString()}`}
                  >
                    {/* Vertical Dots */}
                    <div className="flex flex-col-reverse gap-1 items-center mb-2">
                      {Array.from({ length: totalDots }).map((_, dotIdx) => {
                        let dotColor = 'bg-slate-100';
                        if (dotIdx < offlineDots) {
                          dotColor = isSelected ? 'bg-mint-400' : 'bg-mint-200 group-hover:bg-mint-300';
                        } else if (dotIdx < offlineDots + onlineDots) {
                          dotColor = isSelected ? 'bg-mint-600' : 'bg-mint-500 group-hover:bg-mint-600';
                        }
                        return <span key={dotIdx} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors ${dotColor}`} />;
                      })}
                    </div>

                    {/* Month Label */}
                    <span
                      className={`text-[11px] font-bold mt-1 transition-colors ${
                        isSelected ? 'text-coral-600 font-black' : 'text-slate-400 group-hover:text-slate-700'
                      }`}
                    >
                      {item.month}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Performance Indicators (1/3 width) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Sales Quota & KPI</h2>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-coral-500"
              >
                <option>This Month</option>
                <option>Last Month</option>
                <option>This Quarter</option>
                <option>Year to Date</option>
              </select>
            </div>

            {/* Performance Bars */}
            <div className="space-y-5 mt-5">
              {/* Product / Deal Target */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">Contract Volume</span>
                  <span className="text-mint-600 font-bold">Quota achieved ({performanceData.salesPct}%)</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r from-mint-500 to-mint-600 transition-all duration-500 ${
                      performanceData.salesPct >= 95 ? 'w-full' : performanceData.salesPct >= 80 ? 'w-[85%]' : performanceData.salesPct >= 60 ? 'w-2/3' : 'w-1/2'
                    }`}
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{performanceData.salesAchieved} secured</div>
              </div>

              {/* Team Deal Conversion KPI */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">Team Conversion KPI</span>
                  <span className="text-blue-600 font-bold">{performanceData.kpiPct}% conversion rate</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-blue-500 transition-all duration-500 ${
                      performanceData.kpiPct >= 95 ? 'w-full' : performanceData.kpiPct >= 80 ? 'w-[85%]' : performanceData.kpiPct >= 65 ? 'w-2/3' : 'w-1/2'
                    }`}
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Lead to Closed Won velocity</div>
              </div>

              {/* Customer Retention */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">Net Client Retention</span>
                  <span className="text-gold-700 font-bold">{performanceData.csatPct}% renewal rate</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gold-500 transition-all duration-500 ${
                      performanceData.csatPct >= 95 ? 'w-full' : performanceData.csatPct >= 90 ? 'w-[94%]' : performanceData.csatPct >= 75 ? 'w-3/4' : 'w-1/2'
                    }`}
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Low churn enterprise renewals</div>
              </div>
            </div>
          </div>

          {/* Action Callout */}
          <div className="mt-6 p-4 rounded-xl bg-coral-50/70 border border-coral-200/70 text-xs text-coral-900">
            <div className="flex items-center gap-1.5 font-bold text-coral-800">
              <Sparkles size={14} className="text-coral-600" />
              <span>Pipeline Health: Excellent</span>
            </div>
            <p className="mt-1 text-[11px] text-coral-700 leading-relaxed">
              Q3 target is on track to surpass previous benchmarks by +14.2%.
            </p>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM SECTION: Real Enterprise Deals & Contracts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        {/* Table Top Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Enterprise Deals & Active Contracts</h2>
            <p className="text-xs text-slate-400 mt-0.5">Manage software licenses, contract terms, and client accounts</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 rounded-xl shadow-sm transition-all"
            >
              <Plus size={15} />
              <span>Add Enterprise Deal</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-4">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search contracts by deal name, client, or code..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coral-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-coral-500"
            >
              <option>All</option>
              <option>Enterprise Cloud</option>
              <option>AI Infrastructure</option>
              <option>FinTech Security</option>
              <option>Healthcare Suite</option>
              <option>Analytics</option>
              <option>ERP Integration</option>
            </select>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Contract / Deal Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Client Company</th>
                <th className="py-3 px-4 text-center">Seats / Units</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Total Value</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No enterprise contracts found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{deal.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{deal.code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                        {deal.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {deal.client}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {deal.seats} seats
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600">
                      ${deal.unitPrice.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">
                      ${deal.revenue.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          deal.status === 'Closed Won'
                            ? 'bg-mint-100 text-mint-700'
                            : deal.status === 'Negotiation'
                            ? 'bg-gold-100 text-gold-800'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {deal.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(deal)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Edit Contract"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteDeal(deal.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          title="Delete Contract"
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

      {/* 4. Add / Edit Deal Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDeal ? 'Edit Enterprise Contract' : 'Add New Enterprise Deal'}
      >
        <form onSubmit={handleSaveDeal} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deal / Contract Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Cloud Fleet License"
              value={dealForm.name}
              onChange={(e) => setDealForm({ ...dealForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-coral-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={dealForm.category}
                onChange={(e) => setDealForm({ ...dealForm, category: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-coral-500"
              >
                <option>Enterprise Cloud</option>
                <option>AI Infrastructure</option>
                <option>FinTech Security</option>
                <option>Healthcare Suite</option>
                <option>Analytics</option>
                <option>ERP Integration</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client Company Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Acme Corp"
                value={dealForm.client}
                onChange={(e) => setDealForm({ ...dealForm, client: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-coral-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Seats / Licenses
              </label>
              <input
                type="number"
                min="1"
                required
                value={dealForm.seats}
                onChange={(e) => setDealForm({ ...dealForm, seats: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-coral-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit Price ($)
              </label>
              <input
                type="number"
                min="1"
                required
                value={dealForm.unitPrice}
                onChange={(e) => setDealForm({ ...dealForm, unitPrice: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-coral-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deal Status
              </label>
              <select
                value={dealForm.status}
                onChange={(e) => setDealForm({ ...dealForm, status: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-coral-500"
              >
                <option>Proposal Sent</option>
                <option>Negotiation</option>
                <option>Closed Won</option>
                <option>Qualified</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-xs flex justify-between items-center text-slate-600">
            <span>Total Calculated Value:</span>
            <span className="text-base font-black text-slate-900">
              ${(Number(dealForm.seats || 0) * Number(dealForm.unitPrice || 0)).toLocaleString()}
            </span>
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
              {editingDeal ? 'Update Contract' : 'Save Deal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
