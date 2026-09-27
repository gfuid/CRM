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
  BarChart2,
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
  ArrowUpRight,
  Check,
  FileSpreadsheet,
  Activity,
  Zap,
  Award,
  DollarSign,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  BellRing,
  Send,
  Filter,
  TrendingDown
} from 'lucide-react';

// Formatting helpers for INR Lakhs / Crores and USD
export const formatLakhs = (lakhs) => {
  if (!lakhs || isNaN(lakhs)) return '₹0 L';
  if (lakhs >= 100) {
    return `₹${(lakhs / 100).toFixed(2)} Cr`;
  }
  return `₹${Number(lakhs).toFixed(1)} L`;
};

export const formatDual = (lakhs, usd) => {
  const lakhsStr = formatLakhs(lakhs);
  const usdVal = usd || Math.round((lakhs * 100000) / 84);
  return `${lakhsStr} ($${usdVal.toLocaleString()})`;
};

// Comprehensive Country Metadata with ISO Badges for flawless cross-platform rendering
const COUNTRY_METADATA = {
  'Bangladesh': { code: 'BD', flag: '🇧🇩', name: 'Bangladesh', badgeBg: 'bg-rose-500', badgeText: 'text-white', port: 'Chittagong Port', region: 'South Asia' },
  'Nepal': { code: 'NP', flag: '🇳🇵', name: 'Nepal', badgeBg: 'bg-pink-600', badgeText: 'text-white', port: 'Birgunj ICP', region: 'South Asia' },
  'Vietnam': { code: 'VN', flag: '🇻🇳', name: 'Vietnam', badgeBg: 'bg-purple-600', badgeText: 'text-white', port: 'Hai Phong / HCMC', region: 'SE Asia' },
  'Malaysia': { code: 'MY', flag: '🇲🇾', name: 'Malaysia', badgeBg: 'bg-blue-600', badgeText: 'text-white', port: 'Port Klang', region: 'SE Asia' },
  'Not specified': { code: 'GL', flag: '🌐', name: 'Not Specified / Global', badgeBg: 'bg-slate-500', badgeText: 'text-white', port: 'CIF Any Port', region: 'International' },
  'India': { code: 'IN', flag: '🇮🇳', name: 'India', badgeBg: 'bg-orange-500', badgeText: 'text-white', port: 'Nhava Sheva', region: 'Domestic' },
  'Russia': { code: 'RU', flag: '🇷🇺', name: 'Russia', badgeBg: 'bg-indigo-600', badgeText: 'text-white', port: 'Novorossiysk', region: 'CIS / Europe' },
  'Indonesia': { code: 'ID', flag: '🇮🇩', name: 'Indonesia', badgeBg: 'bg-rose-600', badgeText: 'text-white', port: 'Tanjung Priok', region: 'SE Asia' },
  'Saudi Arabia': { code: 'SA', flag: '🇸🇦', name: 'Saudi Arabia', badgeBg: 'bg-cyan-600', badgeText: 'text-white', port: 'Jeddah Port', region: 'Middle East' },
  'Greece': { code: 'GR', flag: '🇬🇷', name: 'Greece', badgeBg: 'bg-sky-600', badgeText: 'text-white', port: 'Piraeus Port', region: 'Europe' },
};

// Commodity color, icon, and market pricing specs
const COMMODITY_SPECS = {
  'turmeric': { icon: '🌿', label: 'Turmeric (Finger & Powder)', grad: 'from-amber-500 to-yellow-500', barCol: 'bg-amber-500', avgPricePerMT: 1450 },
  'rice ddgs': { icon: '🌾', label: 'Rice DDGS (45% Protein)', grad: 'from-rose-400 to-pink-500', barCol: 'bg-rose-500', avgPricePerMT: 285 },
  'corn ddgs': { icon: '🌽', label: 'Corn DDGS (Feed Grade)', grad: 'from-yellow-400 to-amber-500', barCol: 'bg-yellow-500', avgPricePerMT: 295 },
  'dorb': { icon: '🌻', label: 'DORB (De-Oiled Rice Bran)', grad: 'from-purple-500 to-indigo-500', barCol: 'bg-purple-500', avgPricePerMT: 180 },
  'chilli': { icon: '🌶️', label: 'Dry Red Chilli (Teja/S4)', grad: 'from-rose-500 to-red-600', barCol: 'bg-rose-500', avgPricePerMT: 2400 },
  'maize': { icon: '🌽', label: 'Yellow Maize (Feed Grain)', grad: 'from-orange-500 to-amber-600', barCol: 'bg-orange-500', avgPricePerMT: 230 },
  'rsm': { icon: '🌾', label: 'Rapeseed Meal (RSM 38%)', grad: 'from-blue-500 to-indigo-600', barCol: 'bg-blue-500', avgPricePerMT: 310 },
  'ginger': { icon: '🫚', label: 'Fresh / Dry Ginger', grad: 'from-teal-400 to-cyan-500', barCol: 'bg-teal-500', avgPricePerMT: 1850 },
  'Not specified': { icon: '📦', label: 'General Commodity Inquiry', grad: 'from-slate-400 to-slate-500', barCol: 'bg-slate-400', avgPricePerMT: 500 },
};

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
  'rice ddgs': 'bg-rose-500 text-rose-500',
  'corn ddgs': 'bg-yellow-500 text-yellow-500',
  'dorb': 'bg-purple-500 text-purple-500',
  'chilli': 'bg-rose-500 text-rose-500',
  'maize': 'bg-orange-500 text-orange-500',
  'rsm': 'bg-blue-500 text-blue-500',
  'Not specified': 'bg-slate-400 text-slate-400',
  'ginger': 'bg-teal-500 text-teal-500',
};

// Deterministic Baseline Dataset Generation for 252 Leads across Dates with Order Values & Follow-Up Risk Tracking
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
    { name: 'rice ddgs', count: 38, color: 'bg-rose-400' },
    { name: 'corn ddgs', count: 31, color: 'bg-yellow-500' },
    { name: 'dorb', count: 26, color: 'bg-purple-500' },
    { name: 'chilli', count: 20, color: 'bg-rose-500' },
    { name: 'maize', count: 19, color: 'bg-orange-500' },
    { name: 'rsm', count: 18, color: 'bg-blue-500' },
    { name: 'Not specified', count: 7, color: 'bg-slate-400' },
    { name: 'ginger', count: 4, color: 'bg-cyan-500' },
  ];

  const statuses = [
    { name: 'Lead Generation', count: 101, color: 'bg-blue-500', barColor: 'from-blue-500 to-indigo-500' },
    { name: 'Contact Established', count: 88, color: 'bg-amber-500', barColor: 'from-amber-400 to-orange-500' },
    { name: 'Closed Lost', count: 61, color: 'bg-rose-500', barColor: 'from-rose-500 to-red-600' },
    { name: 'Closed Won', count: 2, color: 'bg-rose-500', barColor: 'from-rose-500 via-pink-500 to-indigo-500' },
  ];

  const team = [
    { name: 'Rohan', count: 48, role: 'Senior Trader', avatar: 'RO', color: 'from-blue-600 to-indigo-600' },
    { name: 'Shiva', count: 39, role: 'Export Manager', avatar: 'SH', color: 'from-rose-500 to-pink-600' },
    { name: 'David', count: 35, role: 'Trade Specialist', avatar: 'DA', color: 'from-amber-600 to-orange-600' },
    { name: 'Preetham', count: 31, role: 'Sales Executive', avatar: 'PR', color: 'from-purple-600 to-indigo-600' },
    { name: 'adric', count: 27, role: 'Key Accounts', avatar: 'AD', color: 'from-pink-600 to-rose-600' },
    { name: 'aarav', count: 24, role: 'Desk Trader', avatar: 'AA', color: 'from-cyan-600 to-blue-600' },
    { name: 'Rahul', count: 21, role: 'Commodity Rep', avatar: 'RA', color: 'from-violet-600 to-purple-600' },
    { name: 'Dan', count: 16, role: 'Regional Lead', avatar: 'DA', color: 'from-violet-600 to-purple-600' },
    { name: 'Pavithra', count: 11, role: 'Operations Associate', avatar: 'PA', color: 'from-fuchsia-600 to-pink-600' },
  ];

  const buyerCompanyPool = [
    'Al-Barakah Global Agro Foods LLC',
    'Dhaka Poultry & Feed Industries Ltd',
    'VietSpices Import & Distribution Co',
    'Himalayan Organic Agro Trading ICP',
    'Penang Edible Oils & Spices Sdn Bhd',
    'Continental Feeds BV Rotterdam',
    'Gulf International Agro Grains LLC',
    'Chittagong Grain & Feed Mills Ltd',
    'Saigon Food Ingredients Corp',
    'Kathmandu Valley Agro Wholesalers',
    'Delta Agri Export-Import Ltd',
    'Aman Feed Mills & Poultry Ltd',
    'Mekong Delta Spices & Herbs Co',
    'Apex Global Commodity Trading LLC',
    'Red Sea Agro Sourcing Ltd',
    'Athens Olive & Herb Importers',
    'Jakarta Animal Feed & Grain PT',
    'Volga Agro Trade LLC',
  ];

  const delayReasons = [
    'Quotation sent 4 days ago; rep did not follow up on LC draft',
    'Buyer requested updated CIF quote & COA; follow-up overdue by 5 days',
    'Lab sample received at destination; client feedback not pursued by rep',
    'Price negotiation stalled; counter-offer not addressed by rep for 6 days',
    'Payment terms CAD vs LC pending; follow-up missed by 3 days',
    'High-value 2x40ft container inquiry waiting on freight quote; rep inactive',
    'Client requested SGS moisture & aflatoxin test report; rep delayed 4 days',
    'Draft sales contract shared; rep did not call buyer to confirm signing'
  ];

  // Daily lead distribution for September 2026 (Days 1 to 20): total 184
  const sepCounts = [
    { day: 20, count: 14 },
    { day: 19, count: 12 },
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

  // Assign dates, order values (₹ Lakhs & $ USD), and follow-up risk attributes
  for (let i = 0; i < 252; i++) {
    let dateStr = '2026-09-20';
    if (i < 184) {
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
      const day = ((i - 184) % 31) + 1;
      const dStr = day < 10 ? `0${day}` : `${day}`;
      dateStr = `2026-08-${dStr}`;
    } else {
      const day = ((i - 230) % 31) + 1;
      const dStr = day < 10 ? `0${day}` : `${day}`;
      dateStr = `2026-07-${dStr}`;
    }

    // Realistic Order Value in Lakhs: distributed between ₹12.5 L and ₹58.0 L
    const baseLakhs = parseFloat((12.5 + ((i * 17.3 + 7) % 45.5)).toFixed(1));
    const orderValueUsd = Math.round((baseLakhs * 100000) / 84);
    const statusName = statusPool[i] || 'Lead Generation';
    const isClosed = statusName === 'Closed Won' || statusName === 'Closed Lost';

    // Overdue follow-up modeling: ~23% of active leads have delayed/missed follow-ups
    const isOverdue = !isClosed && (i % 4 === 1 || i % 7 === 0);
    const overdueDays = isOverdue ? 2 + ((i * 3) % 6) : 0;
    const followUpStatus = isClosed ? 'completed' : isOverdue ? 'overdue' : (i % 5 === 0 ? 'due_today' : 'scheduled');
    const isAtRisk = isOverdue;
    const riskSeverity = !isAtRisk ? 'healthy' : (baseLakhs >= 20 || overdueDays >= 4) ? 'critical' : 'high';
    const potentialLossLakhs = isAtRisk ? baseLakhs : 0;
    const delayReason = isAtRisk ? delayReasons[i % delayReasons.length] : '';
    const company = `${buyerCompanyPool[i % buyerCompanyPool.length]} (#${i + 1})`;

    leads.push({
      id: `lead_det_${i + 1}`,
      date: dateStr,
      country: countryPool[i] || 'Bangladesh',
      product: productPool[i % productPool.length] || 'turmeric',
      status: statusName,
      agent: teamPool[i] || 'Rohan',
      type: 'Export',
      value: orderValueUsd,
      orderValueLakhs: baseLakhs,
      valueInr: baseLakhs * 100000,
      company,
      followUpStatus,
      overdueDays,
      isAtRisk,
      riskSeverity,
      potentialLossLakhs,
      delayReason,
      quantityMT: Math.round(baseLakhs * 1.6),
    });
  }

  return { leads, countries, products, statuses, team };
};

const BASELINE_DATA = buildDeterministicLeads();

export default function Analytics() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('insights'); // 'insights' | 'calendar'
  const [datePreset, setDatePreset] = useState('all');
  const [customFrom, setCustomFrom] = useState('2026-09-01');
  const [customTo, setCustomTo] = useState('2026-09-20');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('2026-09-20');
  const [calendarMonth, setCalendarMonth] = useState({ year: 2026, month: 8 });
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [trendMetric, setTrendMetric] = useState('lakhs'); // 'lakhs' | 'risk' | 'count' | 'value'
  const [chartStyle, setChartStyle] = useState('spline'); // 'spline' | 'bars'
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState(null);
  const [riskFilterOnly, setRiskFilterOnly] = useState(false); // Toggle to show exclusively at-risk deals
  const [selectedStaffRiskFilter, setSelectedStaffRiskFilter] = useState(null); // Filter risk table by staff
  const [nudgeToast, setNudgeToast] = useState(null); // Escalation notification feedback

  // Visual Chart View Mode States
  const [commodityChartMode, setCommodityChartMode] = useState('donut'); // 'donut' | 'bars' | 'list'
  const [hoveredCommodity, setHoveredCommodity] = useState(null);

  const [countryChartMode, setCountryChartMode] = useState('donut'); // 'donut' | 'bars' | 'list'
  const [hoveredCountry, setHoveredCountry] = useState(null);

  const [funnelChartMode, setFunnelChartMode] = useState('funnel'); // 'funnel' | 'bars' | 'list'
  const [hoveredStage, setHoveredStage] = useState(null);

  const [repViewMode, setRepViewMode] = useState('chart'); // 'chart' | 'cards'
  const [hoveredRep, setHoveredRep] = useState(null);

  const [riskChartMode, setRiskChartMode] = useState('bars'); // 'bars' | 'table'

  // Trigger real-time escalation nudge to staff
  const handleNudgeStaff = (staffName, leadCount, amountLakhs) => {
    setNudgeToast(`⚡ Escalation Alert sent to ${staffName}: ${leadCount} delayed deals worth ₹${amountLakhs.toFixed(1)} Lakhs require immediate client follow-up!`);
    setTimeout(() => {
      setNudgeToast(null);
    }, 5000);
  };

  // Filter leads based on the active date preset, range, and risk toggle
  const filteredLeads = useMemo(() => {
    return BASELINE_DATA.leads.filter((lead) => {
      if (riskFilterOnly && !lead.isAtRisk) return false;
      if (datePreset === 'all') return true;
      if (datePreset === 'today') return lead.date === '2026-09-20';
      if (datePreset === 'yesterday') return lead.date === '2026-09-19';
      if (datePreset === 'this_week') return lead.date >= '2026-09-14' && lead.date <= '2026-09-20';
      if (datePreset === 'this_month') return lead.date >= '2026-09-01' && lead.date <= '2026-09-30';
      if (datePreset === 'last_month') return lead.date >= '2026-08-01' && lead.date <= '2026-08-31';
      if (datePreset === 'last_30_days') return lead.date >= '2026-08-21' && lead.date <= '2026-09-20';
      if (datePreset === '1m') return lead.date >= '2026-08-20' && lead.date <= '2026-09-20';
      if (datePreset === '3m') return lead.date >= '2026-06-20' && lead.date <= '2026-09-20';
      if (datePreset === '6m') return lead.date >= '2026-03-20' && lead.date <= '2026-09-20';
      if (datePreset === '1y') return lead.date >= '2025-09-20' && lead.date <= '2026-09-20';
      if (datePreset === 'single_date') return lead.date === selectedCalendarDate;
      if (datePreset === 'custom') {
        if (customFrom && customTo) return lead.date >= customFrom && lead.date <= customTo;
        if (customFrom) return lead.date >= customFrom;
        if (customTo) return lead.date <= customTo;
      }
      return true;
    });
  }, [datePreset, customFrom, customTo, selectedCalendarDate, riskFilterOnly]);

  // Recalculate Metrics, Order Values in Lakhs, and Follow-Up Risk based on filtered leads
  const metrics = useMemo(() => {
    const total = filteredLeads.length;
    const inPipeline = filteredLeads.filter((l) => l.status !== 'Closed Won' && l.status !== 'Closed Lost').length;
    const closedWon = filteredLeads.filter((l) => l.status === 'Closed Won').length;
    const closedLost = filteredLeads.filter((l) => l.status === 'Closed Lost').length;
    const exportCount = filteredLeads.filter((l) => l.type === 'Export').length;
    const domesticCount = filteredLeads.filter((l) => l.type === 'Domestic').length;

    // Monetary Values in INR Lakhs
    const totalOrderValueLakhs = filteredLeads.reduce((sum, l) => sum + (l.orderValueLakhs || 25), 0);
    const totalPipelineValueLakhs = filteredLeads.filter((l) => l.status !== 'Closed Won' && l.status !== 'Closed Lost').reduce((sum, l) => sum + (l.orderValueLakhs || 25), 0);
    const totalClosedWonValueLakhs = filteredLeads.filter((l) => l.status === 'Closed Won').reduce((sum, l) => sum + (l.orderValueLakhs || 25), 0);

    // At-Risk Deals & Potential Revenue Loss Exposure (Delayed/Missed Follow-up)
    const atRiskLeads = filteredLeads.filter((l) => l.isAtRisk).sort((a, b) => (b.orderValueLakhs || 0) - (a.orderValueLakhs || 0));
    const totalAtRiskValueLakhs = atRiskLeads.reduce((sum, l) => sum + (l.orderValueLakhs || 0), 0);
    const totalAtRiskCount = atRiskLeads.length;
    const criticalRiskLeads = atRiskLeads.filter((l) => l.riskSeverity === 'critical');
    const criticalRiskValueLakhs = criticalRiskLeads.reduce((sum, l) => sum + (l.orderValueLakhs || 0), 0);
    const criticalRiskCount = criticalRiskLeads.length;

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

    // Pipeline Status Breakdown with Stage Values & At-Risk Slippage
    const statusMap = {};
    filteredLeads.forEach((l) => {
      statusMap[l.status] = (statusMap[l.status] || 0) + 1;
    });
    const pipelineStatus = BASELINE_DATA.statuses.map((s) => {
      const count = statusMap[s.name] || 0;
      const stageLeads = filteredLeads.filter((l) => l.status === s.name);
      const stageValLakhs = stageLeads.reduce((sum, l) => sum + (l.orderValueLakhs || 25), 0);
      const atRiskStageLeads = stageLeads.filter((l) => l.isAtRisk);
      const atRiskValLakhs = atRiskStageLeads.reduce((sum, l) => sum + (l.orderValueLakhs || 0), 0);
      const atRiskCount = atRiskStageLeads.length;
      return {
        status: s.name,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        color: s.color,
        barColor: s.barColor,
        stageValLakhs,
        atRiskValLakhs,
        atRiskCount,
      };
    });

    // Team Workload & Staff Accountability Breakdown (Orders, Value & Follow-Up Risk)
    const teamWorkload = BASELINE_DATA.team.map((t) => {
      const memberLeads = filteredLeads.filter((l) => l.agent === t.name);
      const count = memberLeads.length;
      const totalValLakhs = memberLeads.reduce((sum, l) => sum + (l.orderValueLakhs || 25), 0);
      const pipeValLakhs = memberLeads.filter((l) => l.status !== 'Closed Won' && l.status !== 'Closed Lost').reduce((sum, l) => sum + (l.orderValueLakhs || 25), 0);
      const wonValLakhs = memberLeads.filter((l) => l.status === 'Closed Won').reduce((sum, l) => sum + (l.orderValueLakhs || 25), 0);

      const memberAtRiskLeads = memberLeads.filter((l) => l.isAtRisk);
      const atRiskValLakhs = memberAtRiskLeads.reduce((sum, l) => sum + (l.orderValueLakhs || 0), 0);
      const atRiskCount = memberAtRiskLeads.length;
      const onTimeCount = count - atRiskCount;
      const followUpCompliance = count > 0 ? Math.round((onTimeCount / count) * 100) : 100;
      const avgDealLakhs = count > 0 ? parseFloat((totalValLakhs / count).toFixed(1)) : 0;

      return {
        name: t.name,
        role: t.role,
        avatar: t.avatar,
        color: t.color,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        totalValLakhs,
        pipeValLakhs,
        wonValLakhs,
        atRiskValLakhs,
        atRiskCount,
        followUpCompliance,
        avgDealLakhs,
      };
    }).filter((t) => t.count > 0 || datePreset === 'all');

    return {
      totalLeads: total,
      inPipeline,
      closedWon,
      closedLost,
      exportCount,
      domesticCount,
      totalOrderValueLakhs,
      totalPipelineValueLakhs,
      totalClosedWonValueLakhs,
      totalAtRiskValueLakhs,
      totalAtRiskCount,
      criticalRiskValueLakhs,
      criticalRiskCount,
      atRiskLeads,
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
    if (datePreset === '1m') return 'Last 1 Month';
    if (datePreset === '3m') return 'Last 3 Months';
    if (datePreset === '6m') return 'Last 6 Months';
    if (datePreset === '1y') return 'Last 1 Year';
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

  // Dynamic Timeline Trend Points (reactive to 1M, 3M, 6M, 1Y, and active filters)
  const timelineData = useMemo(() => {
    const points = [];
    if (datePreset === 'this_week') {
      const days = [
        { label: 'Mon 14', date: '2026-09-14' },
        { label: 'Tue 15', date: '2026-09-15' },
        { label: 'Wed 16', date: '2026-09-16' },
        { label: 'Thu 17', date: '2026-09-17' },
        { label: 'Fri 18', date: '2026-09-18' },
        { label: 'Sat 19', date: '2026-09-19' },
        { label: 'Sun 20', date: '2026-09-20' },
      ];
      days.forEach((d) => {
        const matches = filteredLeads.filter((l) => l.date === d.date);
        const count = matches.length;
        const val = matches.reduce((sum, l) => sum + (l.value || 35000), 0);
        const valLakhs = matches.reduce((sum, l) => sum + (l.orderValueLakhs || 25), 0);
        const riskMatches = matches.filter((l) => l.isAtRisk);
        const riskLakhs = riskMatches.reduce((sum, l) => sum + (l.orderValueLakhs || 0), 0);
        points.push({
          label: d.label,
          fullDate: d.date,
          count,
          value: val,
          valLakhs: parseFloat(valLakhs.toFixed(1)),
          riskLakhs: parseFloat(riskLakhs.toFixed(1)),
          riskCount: riskMatches.length,
          topCommodity: matches[0]?.product ? (COMMODITY_SPECS[matches[0].product]?.label || matches[0].product) : 'Turmeric',
        });
      });
    } else if (datePreset === '1m' || datePreset === 'this_month' || datePreset === 'last_30_days') {
      for (let day = 1; day <= 20; day++) {
        const dStr = day < 10 ? `0${day}` : `${day}`;
        const dateKey = `2026-09-${dStr}`;
        const matches = filteredLeads.filter((l) => l.date === dateKey);
        const count = matches.length;
        const val = matches.reduce((sum, l) => sum + (l.value || 35000), 0);
        const valLakhs = matches.reduce((sum, l) => sum + (l.orderValueLakhs || 25), 0);
        const riskMatches = matches.filter((l) => l.isAtRisk);
        const riskLakhs = riskMatches.reduce((sum, l) => sum + (l.orderValueLakhs || 0), 0);
        points.push({
          label: `${day} Sep`,
          fullDate: dateKey,
          count,
          value: val,
          valLakhs: parseFloat(valLakhs.toFixed(1)),
          riskLakhs: parseFloat(riskLakhs.toFixed(1)),
          riskCount: riskMatches.length,
          topCommodity: matches[0]?.product ? (COMMODITY_SPECS[matches[0].product]?.label || matches[0].product) : 'Turmeric',
        });
      }
    } else if (datePreset === '3m') {
      const weeks = [
        { label: 'W1 Jul', start: '2026-07-01', end: '2026-07-07' },
        { label: 'W2 Jul', start: '2026-07-08', end: '2026-07-14' },
        { label: 'W3 Jul', start: '2026-07-15', end: '2026-07-21' },
        { label: 'W4 Jul', start: '2026-07-22', end: '2026-07-31' },
        { label: 'W1 Aug', start: '2026-08-01', end: '2026-08-07' },
        { label: 'W2 Aug', start: '2026-08-08', end: '2026-08-14' },
        { label: 'W3 Aug', start: '2026-08-15', end: '2026-08-21' },
        { label: 'W4 Aug', start: '2026-08-22', end: '2026-08-31' },
        { label: 'W1 Sep', start: '2026-09-01', end: '2026-09-07' },
        { label: 'W2 Sep', start: '2026-09-08', end: '2026-09-14' },
        { label: 'W3 Sep', start: '2026-09-15', end: '2026-09-20' },
      ];
      weeks.forEach((w) => {
        const matches = filteredLeads.filter((l) => l.date >= w.start && l.date <= w.end);
        const count = matches.length;
        const val = matches.reduce((sum, l) => sum + (l.value || 35000), 0);
        const valLakhs = matches.reduce((sum, l) => sum + (l.orderValueLakhs || 25), 0);
        const riskMatches = matches.filter((l) => l.isAtRisk);
        const riskLakhs = riskMatches.reduce((sum, l) => sum + (l.orderValueLakhs || 0), 0);
        points.push({
          label: w.label,
          fullDate: `${w.start} to ${w.end}`,
          count,
          value: val,
          valLakhs: parseFloat(valLakhs.toFixed(1)),
          riskLakhs: parseFloat(riskLakhs.toFixed(1)),
          riskCount: riskMatches.length,
          topCommodity: matches[0]?.product ? (COMMODITY_SPECS[matches[0].product]?.label || matches[0].product) : 'Turmeric & DDGS',
        });
      });
    } else {
      const months = [
        { label: 'May 26', key: '2026-05', count: 18, baseLakhs: 480 },
        { label: 'Jun 26', key: '2026-06', count: 24, baseLakhs: 640 },
        { label: 'Jul 26', key: '2026-07', count: 32, baseLakhs: 850 },
        { label: 'Aug 26', key: '2026-08', count: 48, baseLakhs: 1290 },
        { label: 'Sep 26', key: '2026-09', count: 130, baseLakhs: 3480 },
      ];
      months.forEach((m) => {
        const matches = filteredLeads.filter((l) => l.date.startsWith(m.key));
        const count = matches.length || m.count;
        const val = matches.reduce((sum, l) => sum + (l.value || 35000), count * 36500);
        const valLakhs = matches.reduce((sum, l) => sum + (l.orderValueLakhs || 25), m.baseLakhs);
        const riskMatches = matches.filter((l) => l.isAtRisk);
        const riskLakhs = riskMatches.reduce((sum, l) => sum + (l.orderValueLakhs || 0), m.baseLakhs * 0.22);
        points.push({
          label: m.label,
          fullDate: m.label,
          count,
          value: val,
          valLakhs: parseFloat(valLakhs.toFixed(1)),
          riskLakhs: parseFloat(riskLakhs.toFixed(1)),
          riskCount: riskMatches.length || Math.round(count * 0.22),
          topCommodity: 'Turmeric, Rice DDGS & DORB',
        });
      });
    }
    return points;
  }, [filteredLeads, datePreset]);

  // SVG dimensions & coordinate mapper for trend chart
  const svgW = 840;
  const svgH = 220;
  const pL = 55;
  const pR = 25;
  const pT = 20;
  const pB = 35;
  const cW = svgW - pL - pR;
  const cH = svgH - pT - pB;

  const maxTrendVal = useMemo(() => {
    const vals = timelineData.map((d) => {
      if (trendMetric === 'lakhs') return d.valLakhs;
      if (trendMetric === 'risk') return d.riskLakhs;
      if (trendMetric === 'count') return d.count;
      return d.value;
    });
    return Math.max(...vals, 1);
  }, [timelineData, trendMetric]);

  const trendPoints = useMemo(() => {
    if (timelineData.length === 0) return [];
    const len = timelineData.length;
    return timelineData.map((d, i) => {
      const v = trendMetric === 'lakhs' ? d.valLakhs : trendMetric === 'risk' ? d.riskLakhs : trendMetric === 'count' ? d.count : d.value;
      const x = len === 1 ? pL + cW / 2 : pL + (i / (len - 1)) * cW;
      const y = pT + cH - (v / maxTrendVal) * cH;
      return { ...d, x, y, val: v };
    });
  }, [timelineData, trendMetric, maxTrendVal, cW, cH]);

  const splineD = useMemo(() => {
    if (trendPoints.length === 0) return '';
    if (trendPoints.length === 1) return `M ${trendPoints[0].x} ${trendPoints[0].y}`;
    let d = `M ${trendPoints[0].x} ${trendPoints[0].y}`;
    for (let i = 0; i < trendPoints.length - 1; i++) {
      const p0 = trendPoints[i];
      const p1 = trendPoints[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [trendPoints]);

  const areaD = useMemo(() => {
    if (trendPoints.length === 0) return '';
    const bottomY = pT + cH;
    const first = trendPoints[0];
    const last = trendPoints[trendPoints.length - 1];
    return `${splineD} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [splineD, trendPoints, pT, cH]);

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
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50/90 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60 shadow-2xs">
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
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
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
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-400 w-32 sm:w-40"
            />
          </div>

          {/* Calendar Date Range Dropdown Popover */}
          <div className="relative">
            <button
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                datePreset !== 'all'
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-800 dark:text-rose-300 ring-2 ring-rose-400/20'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
              title="Select Calendar Date or Range"
            >
              <Calendar size={14} className={datePreset !== 'all' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'} />
              <span>{getDateFilterLabel()}</span>
              <ChevronDown size={13} className="text-slate-400 ml-0.5" />
            </button>

            {dateDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-4 animate-scaleUp">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-white">
                    <Calendar size={15} className="text-rose-600" />
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
                          ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xs'
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
                          ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xs'
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
                          ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xs'
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
                          ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xs'
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
                          ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xs'
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
                          ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      📊 Last Month (Aug)
                    </button>
                  </div>

                  {/* Relative Time Range Buttons: 1M / 3M / 6M / 1Y */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                      Chart Time Range
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { key: '1m', label: '1M' },
                        { key: '3m', label: '3M' },
                        { key: '6m', label: '6M' },
                        { key: '1y', label: '1Y' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => {
                            setDatePreset(key);
                            setDateDropdownOpen(false);
                          }}
                          className={`py-2 rounded-lg text-xs font-extrabold transition-all text-center ${
                            datePreset === key
                              ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
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

          {/* Quick Time Range Pills: 1M / 3M / 6M / 1Y */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
            {[
              { key: '1m', label: '1M' },
              { key: '3m', label: '3M' },
              { key: '6m', label: '6M' },
              { key: '1y', label: '1Y' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDatePreset(key)}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  datePreset === key
                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={`Filter: Last ${label}`}
              >
                {label}
              </button>
            ))}
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
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-rose-50/90 via-pink-50/60 to-indigo-50/90 dark:from-rose-950/40 dark:via-pink-950/30 dark:to-indigo-950/40 border border-rose-200/80 dark:border-rose-800/60 rounded-2xl animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 flex items-center justify-center">
              <Calendar size={14} />
            </div>
            <div>
              <span className="text-xs font-black text-rose-950 dark:text-rose-200">
                Filtered Period: {getDateFilterLabel()}
              </span>
              <span className="text-[11px] text-rose-700 dark:text-rose-400 block font-medium">
                Displaying {metrics.totalLeads} inquiries ({metrics.totalLeads > 0 ? Math.round((metrics.totalLeads / 252) * 100) : 0}% of all-time 252 records)
              </span>
            </div>
          </div>

          <button
            onClick={() => setDatePreset('all')}
            className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-all shadow-xs cursor-pointer"
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
                  <CalendarDays size={20} className="text-rose-500 dark:text-rose-400" />
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
                        ? 'bg-rose-50/80 dark:bg-rose-950/50 border-rose-500 ring-2 ring-rose-500/30 shadow-sm'
                        : isToday
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700'
                        : dayLeads.length > 0
                        ? 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-rose-400 hover:shadow-xs'
                        : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black ${
                        isSelected ? 'text-rose-700 dark:text-rose-300' : isToday ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-slate-200'
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
                            ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white'
                            : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'
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
                  <Clock size={17} className="text-rose-500 dark:text-rose-400" />
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold hover:from-rose-600 hover:to-pink-700 transition-colors shadow-xs"
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
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 hover:border-rose-400 transition-colors"
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
                      <span className="font-bold text-rose-600 dark:text-rose-400">Export CIF</span>
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

      {/* VIEW MODE 2: CHARTS & BREAKDOWN (Always reactive to active Date Filter & Risk Toggle) */}
      {viewMode === 'insights' && (
        <div className="space-y-6 animate-fadeIn">
          {/* NUDGE NOTIFICATION ESCALATION TOAST */}
          {nudgeToast && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border-2 border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-200 flex items-center justify-between shadow-lg animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 animate-bounce">
                  <BellRing size={16} />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider block text-amber-700 dark:text-amber-400">
                    Follow-up Action Dispatched
                  </span>
                  <span className="text-xs font-semibold">{nudgeToast}</span>
                </div>
              </div>
              <button
                onClick={() => setNudgeToast(null)}
                className="w-7 h-7 rounded-xl text-amber-500 hover:text-amber-800 dark:hover:text-white hover:bg-amber-100 dark:hover:bg-amber-900/60 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* TOP 4 KPI CARDS: ORDER VALUE IN LAKHS & REVENUE AT RISK */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Leads & Total Order Volume */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Total inquiries
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Users size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
                {metrics.totalLeads}{' '}
                <span className="text-sm font-bold text-slate-400">Deals</span>
              </div>
              <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                <span>Order Book: {formatLakhs(metrics.totalOrderValueLakhs)}</span>
                <span className="text-slate-400 font-semibold text-[10px]">
                  (${Math.round((metrics.totalOrderValueLakhs * 100000) / 84 / 1000)}k USD)
                </span>
              </div>
            </div>

            {/* 2. In Pipeline & Active Value */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Active pipeline
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
                {metrics.inPipeline}{' '}
                <span className="text-sm font-bold text-slate-400">Active</span>
              </div>
              <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <span>Pipeline Value: {formatLakhs(metrics.totalPipelineValueLakhs)}</span>
              </div>
            </div>

            {/* 3. Closed Won Contracts */}
            <div className="bg-gradient-to-br from-rose-50/50 via-white to-pink-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/20 p-5 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 shadow-sm transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600/80 dark:text-rose-400/80">
                  Closed won
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-100/90 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-2 tracking-tight">
                {metrics.closedWon}{' '}
                <span className="text-sm font-bold text-rose-500/70">Finalized</span>
              </div>
              <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                <span>Contract Value: {formatLakhs(metrics.totalClosedWonValueLakhs)}</span>
              </div>
            </div>

            {/* 4. POTENTIAL REVENUE AT RISK (MISSED/DELAYED FOLLOW-UPS) */}
            <div
              onClick={() => {
                const el = document.getElementById('slippage-risk-monitor');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-rose-50/70 dark:bg-rose-950/40 p-5 rounded-2xl border-2 border-rose-200 dark:border-rose-900/60 shadow-sm transition-all hover:border-rose-400 cursor-pointer group"
              title="Click to inspect at-risk deals"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1">
                  <AlertTriangle size={13} className="text-rose-600" />
                  <span>Revenue at Risk</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-200/80 dark:bg-rose-900 text-rose-800 dark:text-rose-200 animate-pulse">
                  Potential Loss
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-700 dark:text-rose-300 mt-2 tracking-tight">
                {formatLakhs(metrics.totalAtRiskValueLakhs)}
              </div>
              <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center justify-between">
                <span>{metrics.totalAtRiskCount} Deals with Delayed Follow-up</span>
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* QUICK RISK TOGGLE FILTER BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">View Scope:</span>
              <button
                onClick={() => setRiskFilterOnly(false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  !riskFilterOnly
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                🌐 All Inquiries ({BASELINE_DATA.leads.length})
              </button>
              <button
                onClick={() => setRiskFilterOnly(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  riskFilterOnly
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-200'
                }`}
              >
                <AlertTriangle size={13} />
                <span>⚠️ Only At-Risk Deals ({metrics.totalAtRiskCount} Deals · {formatLakhs(metrics.totalAtRiskValueLakhs)})</span>
              </button>
            </div>

            {riskFilterOnly && (
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                Filtering all charts & tables to deals requiring urgent follow-up
              </span>
            )}
          </div>

          {/* 1. EXECUTIVE INTERACTIVE TRADE INQUIRY & DEAL VELOCITY TREND CHART */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
            {/* Chart Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Activity size={16} />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Trade Inquiry & Deal Velocity Trend
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    trendMetric === 'risk'
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300'
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                  }`}>
                    {trendMetric === 'risk' ? 'Loss Exposure Mode' : 'Live Reactive'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Time-series trajectory for <span className="font-bold text-slate-700 dark:text-slate-300">{getDateFilterLabel()}</span> ({metrics.totalLeads} total records in scope)
                </p>
              </div>

              {/* View & Metric Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Metric Selector: Lakhs vs Risk vs Count vs USD */}
                <div className="flex flex-wrap items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTrendMetric('lakhs')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      trendMetric === 'lakhs'
                        ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <DollarSign size={13} />
                    <span>Order Value (₹ Lakhs)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendMetric('risk')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      trendMetric === 'risk'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-rose-600 hover:text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    <AlertTriangle size={13} />
                    <span>At-Risk (₹ Lakhs) ⚠️</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendMetric('count')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      trendMetric === 'count'
                        ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <BarChart3 size={13} />
                    <span>Inquiry Count</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendMetric('value')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      trendMetric === 'value'
                        ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Deal Value ($)</span>
                  </button>
                </div>

                {/* Chart Style: Spline vs Bars */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setChartStyle('spline')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      chartStyle === 'spline'
                        ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Smooth Area Spline"
                  >
                    <TrendingUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartStyle('bars')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      chartStyle === 'bars'
                        ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Volume Column Bars"
                  >
                    <BarChart2 size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive SVG Chart Canvas */}
            <div className="relative mt-4">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="w-full h-56 sm:h-64 select-none overflow-visible"
              >
                <defs>
                  {/* Area gradient for Blush / Luxury (Default/Lakhs/Count) */}
                  <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.32" />
                    <stop offset="60%" stopColor="#ec4899" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Area gradient for Rose (At-Risk Mode) */}
                  <linearGradient id="trendRiskAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
                    <stop offset="70%" stopColor="#f43f5e" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Line gradient */}
                  <linearGradient id="trendLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={trendMetric === 'risk' ? '#e11d48' : '#f43f5e'} />
                    <stop offset="50%" stopColor={trendMetric === 'risk' ? '#f43f5e' : '#ec4899'} />
                    <stop offset="100%" stopColor={trendMetric === 'risk' ? '#fb7185' : '#8b5cf6'} />
                  </linearGradient>

                  {/* Bar gradients */}
                  <linearGradient id="trendBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={trendMetric === 'risk' ? '#f43f5e' : '#fb7185'} />
                    <stop offset="100%" stopColor={trendMetric === 'risk' ? '#be123c' : '#8b5cf6'} />
                  </linearGradient>
                  <linearGradient id="trendBarActiveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>

                {/* Horizontal Dotted Gridlines & Y-Axis Markers */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = pT + cH * (1 - ratio);
                  const labelVal = maxTrendVal * ratio;
                  let formattedVal = '';
                  if (trendMetric === 'lakhs') {
                    formattedVal = formatLakhs(labelVal);
                  } else if (trendMetric === 'risk') {
                    formattedVal = `₹${labelVal.toFixed(0)} L`;
                  } else if (trendMetric === 'count') {
                    formattedVal = Math.round(labelVal);
                  } else {
                    formattedVal = `$${(labelVal / 1000).toFixed(0)}k`;
                  }

                  return (
                    <g key={ratio}>
                      <line
                        x1={pL}
                        y1={y}
                        x2={svgW - pR}
                        y2={y}
                        stroke="currentColor"
                        strokeDasharray="4 4"
                        className="text-slate-200 dark:text-slate-800"
                        strokeWidth="1"
                      />
                      <text
                        x={pL - 10}
                        y={y + 3.5}
                        textAnchor="end"
                        className="text-[9px] font-bold fill-slate-400 select-none"
                      >
                        {formattedVal}
                      </text>
                    </g>
                  );
                })}

                {/* Chart Style: Spline Mode (Area Fill + Stroke Line) */}
                {chartStyle === 'spline' && (
                  <>
                    {areaD && (
                      <path
                        d={areaD}
                        fill={trendMetric === 'risk' ? 'url(#trendRiskAreaGrad)' : 'url(#trendAreaGrad)'}
                        className="transition-all duration-300"
                      />
                    )}
                    {splineD && (
                      <path
                        d={splineD}
                        fill="none"
                        stroke="url(#trendLineGrad)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all duration-300 drop-shadow-sm"
                      />
                    )}
                  </>
                )}

                {/* Chart Style: Bar Mode */}
                {chartStyle === 'bars' && (
                  <g>
                    {trendPoints.map((pt, idx) => {
                      const isHovered = hoveredTrendIndex === idx;
                      const barWidth = Math.max(Math.min(cW / trendPoints.length - 4, 30), 6);
                      const barH = pT + cH - pt.y;
                      return (
                        <rect
                          key={pt.fullDate || idx}
                          x={pt.x - barWidth / 2}
                          y={pt.y}
                          width={barWidth}
                          height={Math.max(barH, 3)}
                          rx={Math.min(barWidth / 2, 4)}
                          fill={isHovered ? 'url(#trendBarActiveGrad)' : 'url(#trendBarGrad)'}
                          className="transition-all duration-200 cursor-pointer"
                        />
                      );
                    })}
                  </g>
                )}

                {/* Hover Guide & Active Highlight */}
                {hoveredTrendIndex !== null && trendPoints[hoveredTrendIndex] && (
                  <g>
                    <line
                      x1={trendPoints[hoveredTrendIndex].x}
                      y1={pT}
                      x2={trendPoints[hoveredTrendIndex].x}
                      y2={pT + cH}
                      stroke={trendMetric === 'risk' ? '#f43f5e' : '#ec4899'}
                      strokeDasharray="3 3"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={trendPoints[hoveredTrendIndex].x}
                      cy={trendPoints[hoveredTrendIndex].y}
                      r="9"
                      fill={trendMetric === 'risk' ? '#f43f5e' : '#ec4899'}
                      fillOpacity="0.25"
                      className="animate-ping"
                    />
                    <circle
                      cx={trendPoints[hoveredTrendIndex].x}
                      cy={trendPoints[hoveredTrendIndex].y}
                      r="5.5"
                      fill="#ffffff"
                      stroke={trendMetric === 'risk' ? '#e11d48' : '#f43f5e'}
                      strokeWidth="3"
                    />
                  </g>
                )}

                {/* Invisible Hover Rect Trigger Columns across full chart width */}
                {trendPoints.map((pt, idx) => {
                  const colW = cW / trendPoints.length;
                  return (
                    <rect
                      key={`hit-${idx}`}
                      x={pt.x - colW / 2}
                      y={pT}
                      width={colW}
                      height={cH}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredTrendIndex(idx)}
                      onMouseLeave={() => setHoveredTrendIndex(null)}
                    />
                  );
                })}

                {/* X-Axis Labels */}
                {trendPoints.map((pt, idx) => {
                  const step = trendPoints.length > 15 ? 3 : trendPoints.length > 8 ? 2 : 1;
                  const isVisible = idx % step === 0 || idx === trendPoints.length - 1;
                  if (!isVisible) return null;
                  return (
                    <text
                      key={`lbl-${idx}`}
                      x={pt.x}
                      y={pT + cH + 18}
                      textAnchor="middle"
                      className="text-[10px] font-bold fill-slate-400 select-none"
                    >
                      {pt.label}
                    </text>
                  );
                })}
              </svg>

              {/* Floating Rich Tooltip */}
              {hoveredTrendIndex !== null && trendPoints[hoveredTrendIndex] && (
                <div
                  className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-full bg-slate-900/95 dark:bg-slate-800/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-xs min-w-[190px]"
                  style={{
                    left: `${(trendPoints[hoveredTrendIndex].x / svgW) * 100}%`,
                    top: `${(trendPoints[hoveredTrendIndex].y / svgH) * 100}%`,
                    marginTop: '-12px',
                  }}
                >
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400 pb-1 border-b border-slate-700/80 mb-1.5 flex items-center justify-between">
                    <span>{trendPoints[hoveredTrendIndex].fullDate}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs mb-1">
                    <span className="text-slate-300 font-medium">Inquiries:</span>
                    <span className="font-black text-white">{trendPoints[hoveredTrendIndex].count} Leads</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs mb-1">
                    <span className="text-slate-300 font-medium">Order Value:</span>
                    <span className="font-extrabold text-rose-300">
                      ₹{trendPoints[hoveredTrendIndex].valLakhs?.toFixed(1)} Lakhs
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400 mb-1">
                    <span>CIF ($):</span>
                    <span>${trendPoints[hoveredTrendIndex].value.toLocaleString()}</span>
                  </div>

                  {trendPoints[hoveredTrendIndex].riskLakhs > 0 && (
                    <div className="mt-1 pt-1 border-t border-slate-700/60 bg-rose-950/40 p-1.5 rounded border border-rose-800/50">
                      <div className="flex items-center justify-between text-rose-300 font-black text-[11px]">
                        <span className="flex items-center gap-1">
                          <AlertTriangle size={11} className="text-rose-400" /> At-Risk Loss:
                        </span>
                        <span>₹{trendPoints[hoveredTrendIndex].riskLakhs?.toFixed(1)} L</span>
                      </div>
                      <span className="text-[9px] text-rose-400/90 block mt-0.5">
                        {trendPoints[hoveredTrendIndex].riskCount} deals with delayed staff follow-up
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 text-[10px] pt-1.5 border-t border-slate-700/60 text-slate-400 mt-1">
                    <span>Top Demand:</span>
                    <span className="font-semibold text-amber-300 truncate max-w-[100px]">
                      {trendPoints[hoveredTrendIndex].topCommodity}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Chart KPI Milestone Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-5">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Peak Inquiries Day</span>
                <span className="text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
                  18 Leads (16 Sep)
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active Period Order Value</span>
                <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                  {formatLakhs(metrics.totalOrderValueLakhs)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">At-Risk Loss Exposure</span>
                <span className="text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
                  {formatLakhs(metrics.totalAtRiskValueLakhs)} ({metrics.totalAtRiskCount} Deals)
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Win Conversion Rate</span>
                <span className="text-sm font-black text-teal-600 dark:text-teal-400 mt-0.5 block">
                  {metrics.totalLeads > 0 ? ((metrics.closedWon / metrics.totalLeads) * 100).toFixed(1) : 0}% Closed
                </span>
              </div>
            </div>
          </div>

          {/* DEDICATED AT-RISK PIPELINE & SLIPPAGE LOSS MONITOR */}
          <div
            id="slippage-risk-monitor"
            className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-rose-200 dark:border-rose-900/80 shadow-md transition-colors relative overflow-hidden"
          >
            {/* Ambient Red Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header & Loss Callout */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-rose-100 dark:border-rose-900/50 relative z-10">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shadow-xs">
                    <ShieldAlert size={18} />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <span>Pipeline at Risk & Follow-up Slippage Monitor</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                      ⚠️ Potential Revenue Loss
                    </span>
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  High-value orders (₹10L - ₹50L+) in sales stages where assigned representatives have delayed client follow-ups
                </p>
              </div>

              {/* Loss Metric Badges */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-right">
                  <span className="text-[10px] uppercase font-bold text-rose-500 dark:text-rose-400 block tracking-wider">Total Loss Exposure</span>
                  <span className="text-base font-black text-rose-700 dark:text-rose-300">
                    {formatLakhs(metrics.totalAtRiskValueLakhs)}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-right">
                  <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block tracking-wider">Critical Risk Deals</span>
                  <span className="text-base font-black text-amber-700 dark:text-amber-300">
                    {metrics.criticalRiskCount} High-Ticket
                  </span>
                </div>
              </div>
            </div>

            {/* Explanation Alert Strip */}
            <div className="mt-4 p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-xs text-rose-950 dark:text-rose-200 flex items-start gap-2.5">
              <AlertOctagon size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block">Executive Risk Alert (Potential Revenue Loss due to Delayed Follow-ups):</span>
                <span>
                  Out of {metrics.totalAtRiskCount} deals, ₹{formatLakhs(metrics.totalAtRiskValueLakhs)} in trade contract value is currently at risk due to overdue client follow-ups by assigned representatives. Immediate action is required to prevent pipeline slippage and revenue loss to competitors.
                </span>
              </div>
            </div>

            {/* STAFF-WISE REVENUE AT RISK RANKING */}
            <div className="mt-5 space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <UserCheck size={14} className="text-indigo-500" />
                  <span>Staff-Wise Revenue at Risk</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">
                  Sorted by potential loss exposure
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {metrics.teamWorkload
                  .filter((m) => m.atRiskCount > 0)
                  .sort((a, b) => b.atRiskValLakhs - a.atRiskValLakhs)
                  .map((member) => (
                    <div
                      key={member.name}
                      onClick={() => {
                        setSelectedStaffRiskFilter(
                          selectedStaffRiskFilter === member.name ? null : member.name
                        );
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer group ${
                        selectedStaffRiskFilter === member.name
                          ? 'bg-rose-50/80 dark:bg-rose-950/60 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 hover:border-rose-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${member.color} text-white flex items-center justify-center font-black text-xs shadow-xs`}>
                            {member.avatar}
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors block">
                              {member.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-medium">
                              {member.role}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-rose-600 dark:text-rose-400 block">
                            ₹{member.atRiskValLakhs.toFixed(1)} L
                          </span>
                          <span className="text-[10px] font-bold text-rose-500/80">
                            {member.atRiskCount} Delayed Leads
                          </span>
                        </div>
                      </div>

                      {/* Visual Health Ratio */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                          <span>Follow-up On-Time: {member.followUpCompliance}%</span>
                          <span className="text-rose-600">{100 - member.followUpCompliance}% Delayed</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                            style={{ width: `${member.followUpCompliance}%` }}
                            title="On-time Follow-ups"
                          />
                          <div
                            className="h-full bg-rose-500"
                            style={{ width: `${100 - member.followUpCompliance}%` }}
                            title="Delayed Follow-ups"
                          />
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Total Portfolio: ₹{formatLakhs(member.totalValLakhs)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNudgeStaff(member.name, member.atRiskCount, member.atRiskValLakhs);
                          }}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Send size={10} />
                          <span>Nudge Rep</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* TOP HIGH-VALUE AT-RISK ORDERS VISUALIZATION & TABLE (₹10L - ₹50L+) */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 relative z-10 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-rose-600" />
                    <span>High-Value Deals at Risk of Loss (Overdue Value & Follow-Up Delay)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedStaffRiskFilter
                      ? `Showing only delayed leads assigned to ${selectedStaffRiskFilter}`
                      : 'Orders with overdue client follow-ups sorted by deal value in Lakhs'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedStaffRiskFilter && (
                    <button
                      onClick={() => setSelectedStaffRiskFilter(null)}
                      className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1 mr-2"
                    >
                      <span>Clear Filter ({selectedStaffRiskFilter})</span>
                      <X size={12} />
                    </button>
                  )}

                  <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRiskChartMode('bars')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        riskChartMode === 'bars'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <BarChart3 size={12} />
                      <span>Visual Risk Chart</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRiskChartMode('table')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        riskChartMode === 'table'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Activity size={12} />
                      <span>Details Table</span>
                    </button>
                  </div>
                </div>
              </div>

              {riskChartMode === 'bars' ? (
                <div className="space-y-3">
                  {/* Top At-Risk Deals Horizontal Exposure Chart */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-700/50 mb-3">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Top 10 High-Value Overdue Exposures (Ranked by Contract Loss in Lakhs)
                      </span>
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                        Max Exposure: ₹57.7 Lakhs ($68.7k)
                      </span>
                    </div>

                    <div className="space-y-3">
                      {metrics.atRiskLeads
                        .filter((l) => (selectedStaffRiskFilter ? l.agent === selectedStaffRiskFilter : true))
                        .slice(0, 10)
                        .map((lead, idx) => {
                          const countryMeta = COUNTRY_METADATA[lead.country] || { code: 'GL', badgeBg: 'bg-slate-600', badgeText: 'text-white' };
                          const maxVal = 60;
                          const barPct = Math.min(Math.round((lead.orderValueLakhs / maxVal) * 100), 100);

                          return (
                            <div
                              key={lead.id}
                              className="group p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700 transition-all hover:shadow-xs"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 truncate">
                                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 flex items-center justify-center shrink-0">
                                    #{idx + 1}
                                  </span>
                                  <span className={`w-5 h-3.5 rounded text-[9px] font-black ${countryMeta.badgeBg} ${countryMeta.badgeText} flex items-center justify-center shrink-0`}>
                                    {countryMeta.code}
                                  </span>
                                  <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                    {lead.company}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
                                    · {lead.country}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                    {lead.status}
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    {lead.agent}
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                                    <Clock size={10} />
                                    <span>{lead.overdueDays}d Overdue</span>
                                  </span>
                                  <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                                    ₹{lead.orderValueLakhs.toFixed(1)} L
                                  </span>
                                </div>
                              </div>

                              {/* Visual Progress Bar */}
                              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative mb-2">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 transition-all duration-500"
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>

                              {/* Footer Details & Quick Action */}
                              <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-2 truncate">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                                    {lead.product} (~{lead.quantityMT} MT)
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-700">|</span>
                                  <span className="truncate text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                    <AlertTriangle size={11} className="text-amber-500 shrink-0" />
                                    <span className="truncate">{lead.delayReason}</span>
                                  </span>
                                </div>

                                <button
                                  onClick={() => handleNudgeStaff(lead.agent, 1, lead.orderValueLakhs)}
                                  className="px-2.5 py-0.5 rounded text-[10px] font-black bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shrink-0 shadow-2xs"
                                >
                                  Nudge Rep
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Table View */
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2.5 px-3.5">Company & Country</th>
                        <th className="py-2.5 px-3">Commodity & MT</th>
                        <th className="py-2.5 px-3 text-right">Order Value</th>
                        <th className="py-2.5 px-3">Assigned Rep</th>
                        <th className="py-2.5 px-3">Stage</th>
                        <th className="py-2.5 px-3">Follow-up Delay</th>
                        <th className="py-2.5 px-3">Loss Threat Reason</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {metrics.atRiskLeads
                        .filter((l) => (selectedStaffRiskFilter ? l.agent === selectedStaffRiskFilter : true))
                        .slice(0, 10)
                        .map((lead) => {
                          const countryMeta = COUNTRY_METADATA[lead.country] || { code: 'GL', badgeBg: 'bg-slate-600', badgeText: 'text-white' };
                          return (
                            <tr key={lead.id} className="hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-colors">
                              {/* Company & Country */}
                              <td className="py-2.5 px-3.5">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span className={`w-5 h-3.5 rounded text-[9px] font-black ${countryMeta.badgeBg} ${countryMeta.badgeText} flex items-center justify-center shrink-0`}>
                                    {countryMeta.code}
                                  </span>
                                  <span className="truncate max-w-[190px]">{lead.company}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  {lead.country}
                                </span>
                              </td>

                              {/* Commodity */}
                              <td className="py-2.5 px-3">
                                <span className="font-bold capitalize text-slate-800 dark:text-slate-200 block">
                                  {lead.product}
                                </span>
                                <span className="text-[10px] text-slate-400">~{lead.quantityMT || 40} MT</span>
                              </td>

                              {/* Order Value in Lakhs & USD */}
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <span className="text-xs font-black text-rose-700 dark:text-rose-300 block">
                                  ₹{lead.orderValueLakhs.toFixed(1)} Lakhs
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400">
                                  (${lead.value?.toLocaleString()})
                                </span>
                              </td>

                              {/* Assigned Rep */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                  {lead.agent}
                                </span>
                              </td>

                              {/* Stage */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                  {lead.status}
                                </span>
                              </td>

                              {/* Follow-up Delay */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                                  <Clock size={10} />
                                  <span>{lead.overdueDays} Days Overdue</span>
                                </span>
                              </td>

                              {/* Delay Reason */}
                              <td className="py-2.5 px-3 max-w-[220px]">
                                <span className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">
                                  {lead.delayReason || 'Follow-up pending'}
                                </span>
                              </td>

                              {/* Action */}
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleNudgeStaff(lead.agent, 1, lead.orderValueLakhs)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
                                  title="Send immediate nudge to employee"
                                >
                                  Nudge Rep
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* 2. PIPELINE CONVERSION FUNNEL & TRADE TYPE DONUT ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* PIPELINE CONVERSION FUNNEL (Takes 2 Columns) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers size={18} className="text-blue-600 dark:text-blue-400" />
                    <span>Sales Pipeline Stage Funnel & Conversion</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lead progression from initial inquiry to signed export contracts with stage deal valuations
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFunnelChartMode('funnel')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        funnelChartMode === 'funnel'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Layers size={12} />
                      <span>Visual Funnel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFunnelChartMode('bars')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        funnelChartMode === 'bars'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <BarChart3 size={12} />
                      <span>Stage Bars</span>
                    </button>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                    {metrics.inPipeline} Deals in Pipeline
                  </span>
                </div>
              </div>

              {/* STAGE DATA */}
              {(() => {
                const stages = [
                  { stage: 'Lead Generation', step: 1, count: Math.round(metrics.totalLeads * 0.38) || 85, pct: 38, grad: 'from-blue-500 to-indigo-600', fillGrad: 'url(#stg-grad-1)', strokeCol: '#3b82f6', valLakhs: 2480, atRiskLakhs: 420, atRiskCount: 14, passPct: 74, dropPct: 26 },
                  { stage: 'Contact Established', step: 2, count: Math.round(metrics.totalLeads * 0.28) || 62, pct: 28, grad: 'from-indigo-500 to-cyan-500', fillGrad: 'url(#stg-grad-2)', strokeCol: '#6366f1', valLakhs: 1820, atRiskLakhs: 310, atRiskCount: 11, passPct: 61, dropPct: 39 },
                  { stage: 'Requirement Understood', step: 3, count: Math.round(metrics.totalLeads * 0.17) || 44, pct: 17, grad: 'from-cyan-500 to-teal-500', fillGrad: 'url(#stg-grad-3)', strokeCol: '#06b6d4', valLakhs: 1240, atRiskLakhs: 185, atRiskCount: 6, passPct: 58, dropPct: 42 },
                  { stage: 'Sample Sent / Lab Tested', step: 4, count: Math.round(metrics.totalLeads * 0.10) || 24, pct: 10, grad: 'from-amber-400 to-amber-500', fillGrad: 'url(#stg-grad-4)', strokeCol: '#f59e0b', valLakhs: 710, atRiskLakhs: 95, atRiskCount: 3, passPct: 80, dropPct: 20 },
                  { stage: 'Quotation Sent (CIF)', step: 5, count: Math.round(metrics.totalLeads * 0.08) || 20, pct: 8, grad: 'from-orange-500 to-orange-600', fillGrad: 'url(#stg-grad-5)', strokeCol: '#f97316', valLakhs: 580, atRiskLakhs: 68, atRiskCount: 2, passPct: 65, dropPct: 35 },
                  { stage: 'Price Negotiation & LC', step: 6, count: Math.max(Math.round(metrics.totalLeads * 0.05), 1) || 12, pct: 5, grad: 'from-purple-500 to-fuchsia-600', fillGrad: 'url(#stg-grad-6)', strokeCol: '#a855f7', valLakhs: 360, atRiskLakhs: 48, atRiskCount: 2, passPct: 15, dropPct: 85 },
                  { stage: 'Closed Won (Contract Final)', step: 7, count: metrics.closedWon || 2, pct: 1.2, grad: 'from-rose-500 via-pink-500 to-indigo-600', fillGrad: 'url(#stg-grad-7)', strokeCol: '#f43f5e', valLakhs: metrics.totalClosedWonValueLakhs || 48.5, atRiskLakhs: 0, atRiskCount: 0, passPct: 100, dropPct: 0 },
                ];

                if (funnelChartMode === 'funnel') {
                  const widths = [
                    { top: 580, bot: 500 },
                    { top: 500, bot: 420 },
                    { top: 420, bot: 340 },
                    { top: 340, bot: 270 },
                    { top: 270, bot: 210 },
                    { top: 210, bot: 160 },
                    { top: 160, bot: 120 },
                  ];
                  const cX = 350;
                  const stepH = 43;
                  const gap = 5;

                  return (
                    <div className="relative pt-1 pb-2">
                      <svg viewBox="0 0 700 350" className="w-full h-auto select-none overflow-visible">
                        <defs>
                          <linearGradient id="stg-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#4f46e5" />
                          </linearGradient>
                          <linearGradient id="stg-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#4f46e5" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                          <linearGradient id="stg-grad-3" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#0d9488" />
                          </linearGradient>
                          <linearGradient id="stg-grad-4" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#d97706" />
                          </linearGradient>
                          <linearGradient id="stg-grad-5" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f97316" />
                            <stop offset="100%" stopColor="#ea580c" />
                          </linearGradient>
                          <linearGradient id="stg-grad-6" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#9333ea" />
                          </linearGradient>
                          <linearGradient id="stg-grad-7" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f43f5e" />
                            <stop offset="50%" stopColor="#ec4899" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                          </linearGradient>
                          <filter id="funnel-shadow" x="-5%" y="-5%" width="110%" height="120%">
                            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodOpacity="0.18" />
                          </filter>
                        </defs>

                        {stages.map((stg, idx) => {
                          const yTop = idx * (stepH + gap) + 6;
                          const yBot = yTop + stepH;
                          const wTop = widths[idx].top;
                          const wBot = widths[idx].bot;
                          const x1 = cX - wTop / 2;
                          const x2 = cX + wTop / 2;
                          const x3 = cX + wBot / 2;
                          const x4 = cX - wBot / 2;
                          const isHovered = hoveredStage === idx;

                          return (
                            <g
                              key={stg.stage}
                              className="cursor-pointer transition-all duration-200"
                              onMouseEnter={() => setHoveredStage(idx)}
                              onMouseLeave={() => setHoveredStage(null)}
                            >
                              {/* Funnel Trapezoid Segment */}
                              <polygon
                                points={`${x1},${yTop} ${x2},${yTop} ${x3},${yBot} ${x4},${yBot}`}
                                fill={stg.fillGrad}
                                stroke={isHovered ? '#ffffff' : 'rgba(255,255,255,0.25)'}
                                strokeWidth={isHovered ? 2.5 : 1}
                                filter="url(#funnel-shadow)"
                                className="transition-all duration-200"
                              />

                              {/* Centered Stage Information */}
                              <text
                                x={cX}
                                y={yTop + 18}
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize="12"
                                fontWeight="800"
                                className="drop-shadow-xs pointer-events-none"
                              >
                                {stg.step}. {stg.stage}
                              </text>
                              <text
                                x={cX}
                                y={yTop + 33}
                                textAnchor="middle"
                                fill="rgba(255,255,255,0.92)"
                                fontSize="10.5"
                                fontWeight="700"
                                className="drop-shadow-xs pointer-events-none"
                              >
                                {stg.count} Deals ({stg.pct}%) · {formatLakhs(stg.valLakhs)}
                              </text>

                              {/* Left & Right Side Metric Callouts */}
                              {idx < stages.length - 1 && (
                                <g className="pointer-events-none">
                                  <line
                                    x1={x2 + 8}
                                    y1={yTop + stepH / 2}
                                    x2={670}
                                    y2={yTop + stepH / 2}
                                    stroke="currentColor"
                                    strokeDasharray="2 2"
                                    strokeWidth="1"
                                    className="text-slate-300 dark:text-slate-700"
                                  />
                                  <text
                                    x={675}
                                    y={yTop + stepH / 2 + 4}
                                    textAnchor="end"
                                    fill={stg.dropPct > 35 ? '#f43f5e' : '#64748b'}
                                    fontSize="10"
                                    fontWeight="800"
                                  >
                                    {stg.passPct}% Conv (-{stg.dropPct}%)
                                  </text>
                                </g>
                              )}

                              {/* Left At-Risk Warning Pill on Trapezoid */}
                              {stg.atRiskLakhs > 0 && (
                                <g className="pointer-events-none">
                                  <rect
                                    x={x1 - 120}
                                    y={yTop + stepH / 2 - 9}
                                    width="112"
                                    height="18"
                                    rx="5"
                                    fill="#fff1f2"
                                    stroke="#fda4af"
                                    strokeWidth="1"
                                    className="dark:fill-rose-950/80 dark:stroke-rose-800"
                                  />
                                  <text
                                    x={x1 - 64}
                                    y={yTop + stepH / 2 + 3.5}
                                    textAnchor="middle"
                                    fill="#e11d48"
                                    fontSize="8.5"
                                    fontWeight="800"
                                  >
                                    ⚠️ ₹{formatLakhs(stg.atRiskLakhs)} At-Risk
                                  </text>
                                </g>
                              )}
                            </g>
                          );
                        })}
                      </svg>

                      {/* Floating Rich Tooltip */}
                      {hoveredStage !== null && stages[hoveredStage] && (
                        <div
                          className="absolute pointer-events-none z-20 top-4 right-4 bg-slate-900/95 dark:bg-slate-800/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-xs min-w-[210px]"
                        >
                          <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-700">
                            <span className="font-extrabold text-blue-400">
                              Stage {stages[hoveredStage].step}: {stages[hoveredStage].stage}
                            </span>
                          </div>
                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Active Deals:</span>
                              <span className="font-bold">{stages[hoveredStage].count} ({stages[hoveredStage].pct}%)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Stage Deal Value:</span>
                              <span className="font-bold text-rose-300">{formatLakhs(stages[hoveredStage].valLakhs)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Pass-Through Rate:</span>
                              <span className="font-bold text-cyan-400">{stages[hoveredStage].passPct}%</span>
                            </div>
                            {stages[hoveredStage].atRiskLakhs > 0 && (
                              <div className="flex justify-between pt-1 border-t border-slate-800 text-rose-400 font-bold">
                                <span>At-Risk Delayed:</span>
                                <span>₹{formatLakhs(stages[hoveredStage].atRiskLakhs)} ({stages[hoveredStage].atRiskCount} leads)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Funnel KPI Footnote */}
                      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                        <div className="p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
                          <span className="text-[10px] text-slate-400 block font-semibold">Total Pipeline</span>
                          <span className="font-black text-blue-700 dark:text-blue-300">₹72.5 Cr (189 Deals)</span>
                        </div>
                        <div className="p-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40">
                          <span className="text-[10px] text-slate-400 block font-semibold">Total At-Risk</span>
                          <span className="font-black text-rose-700 dark:text-rose-300">₹11.26 Cr (38 Delayed)</span>
                        </div>
                        <div className="p-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40">
                          <span className="text-[10px] text-slate-400 block font-semibold">Signed Win Rate</span>
                          <span className="font-black text-rose-700 dark:text-rose-300">1.2% Closed Won</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Stage Comparison Bars View Mode
                return (
                  <div className="space-y-2.5">
                    {stages.map((stg) => (
                      <div key={stg.stage} className="group">
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black flex items-center justify-center">
                              {stg.step}
                            </span>
                            <span className="text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">
                              {stg.stage}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-right">
                            {stg.atRiskLakhs > 0 && (
                              <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/60 hidden sm:inline">
                                ⚠️ ₹{formatLakhs(stg.atRiskLakhs)} At-Risk ({stg.atRiskCount} delayed)
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              {formatLakhs(stg.valLakhs)}
                            </span>
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {stg.count} <span className="text-slate-400 font-medium text-[11px]">({stg.pct}%)</span>
                            </span>
                          </div>
                        </div>

                        {/* Funnel Progress Track */}
                        <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${stg.grad} transition-all duration-500 shadow-xs`}
                            style={{ width: `${Math.max(stg.pct * 2.5, 3)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* TRADE CATEGORY SPLIT: INTERACTIVE DONUT CHART (Takes 1 Column) */}
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <PieChart size={18} className="text-rose-500 dark:text-rose-400" />
                      <span>Trade Classification</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Export vs. Domestic mandate
                    </p>
                  </div>
                </div>

                {/* SVG Donut Ring Visualization with Blush-to-Indigo Luminous Gradient */}
                <div className="flex flex-col items-center justify-center pt-2">
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg viewBox="0 0 150 150" className="w-full h-full transform -rotate-90 overflow-visible">
                      <defs>
                        <linearGradient id="trade-ring-blush-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f43f5e" />
                          <stop offset="35%" stopColor="#ec4899" />
                          <stop offset="70%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                        <filter id="trade-glow" x="-25%" y="-25%" width="150%" height="150%">
                          <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#f43f5e" floodOpacity="0.28" />
                        </filter>
                      </defs>

                      {/* Base Track Ring */}
                      <circle
                        cx="75"
                        cy="75"
                        r="54"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="15"
                        className="text-slate-100 dark:text-slate-800"
                      />

                      {/* Active Export Gradient Segment */}
                      <circle
                        cx="75"
                        cy="75"
                        r="54"
                        fill="transparent"
                        stroke="url(#trade-ring-blush-grad)"
                        strokeWidth="15"
                        filter="url(#trade-glow)"
                        strokeDasharray={`${((metrics.exportCount || 252) / (metrics.totalLeads || 252)) * 339.29} 339.29`}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                      />

                      {metrics.domesticCount > 0 && (
                        <circle
                          cx="75"
                          cy="75"
                          r="54"
                          fill="transparent"
                          stroke="#f59e0b"
                          strokeWidth="15"
                          strokeDasharray={`${(metrics.domesticCount / (metrics.totalLeads || 252)) * 339.29} 339.29`}
                          strokeDashoffset={`-${((metrics.exportCount || 252) / (metrics.totalLeads || 252)) * 339.29}`}
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />
                      )}
                    </svg>

                    {/* Donut Center Metrics */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                      <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {metrics.totalLeads}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Total Deals
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 mt-1 rounded-full bg-gradient-to-r from-rose-50 to-indigo-50 dark:from-rose-950/70 dark:to-indigo-950/70 text-rose-600 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80 shadow-2xs">
                        100% Export
                      </span>
                    </div>
                  </div>

                  {/* Donut Legends */}
                  <div className="w-full space-y-2 mt-4">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-rose-50/90 via-fuchsia-50/60 to-indigo-50/90 dark:from-rose-950/40 dark:via-fuchsia-950/20 dark:to-indigo-950/40 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-600 shadow-xs ring-2 ring-rose-300/60 dark:ring-rose-800/60 shrink-0" />
                        <div>
                          <span className="text-xs font-black text-rose-950 dark:text-rose-200 block">
                            🌐 International Export
                          </span>
                          <span className="text-[10px] font-medium text-rose-700/80 dark:text-rose-300/80">
                            CIF / FOB to 10 Target Countries
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-rose-900 dark:text-rose-100 block">
                          {metrics.exportCount}
                        </span>
                        <span className="text-[10px] font-black text-rose-600 dark:text-rose-400">
                          100%
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between opacity-70">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                            🏠 Domestic Mandi Trade
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Indian Local Trade / APMC
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                          {metrics.domesticCount}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          0%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center font-medium">
                100% Export-Oriented Global Trading Desk
              </div>
            </div>
          </div>

          {/* 3. COMMODITIES BREAKDOWN & GEOGRAPHIC COUNTRY MATRIX (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LEADS BY COMMODITY / PRODUCT - INTERACTIVE DONUT & BAR CHART */}
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Package size={18} className="text-amber-500" />
                      <span>Commodity Demand & Cargo Volumes</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Commodity inquiry shares with estimated metric tonnes (MT)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setCommodityChartMode('donut')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          commodityChartMode === 'donut'
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <PieChart size={12} />
                        <span>Donut Chart</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommodityChartMode('bars')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          commodityChartMode === 'bars'
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <BarChart3 size={12} />
                        <span>Volume Bars</span>
                      </button>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                      {displayProducts.length} Commodities
                    </span>
                  </div>
                </div>

                {(() => {
                  const commColors = {
                    turmeric: '#f59e0b',
                    'rice ddgs': '#fb7185', // Blush Coral (was flat #10b981)
                    'corn ddgs': '#eab308',
                    dorb: '#8b5cf6', // Royal Lilac
                    chilli: '#f43f5e', // Ruby Blush
                    maize: '#f97316',
                    rsm: '#3b82f6',
                    ginger: '#14b8a6', // Aquamarine
                    'Not specified': '#94a3b8'
                  };

                  const totalCount = displayProducts.reduce((sum, p) => sum + p.count, 0) || 1;
                  const totalMT = displayProducts.reduce((sum, p) => sum + (p.count * 45), 0);
                  const totalVal = displayProducts.reduce((sum, p) => {
                    const spec = COMMODITY_SPECS[p.product] || { avgPricePerMT: 500 };
                    return sum + (p.count * 45 * spec.avgPricePerMT);
                  }, 0);

                  const C = 2 * Math.PI * 64; // ~402.12
                  let accumPct = 0;

                  if (commodityChartMode === 'donut') {
                    const hoveredItem = hoveredCommodity
                      ? displayProducts.find((p) => p.product === hoveredCommodity)
                      : null;
                    const hoveredSpec = hoveredItem ? (COMMODITY_SPECS[hoveredItem.product] || {}) : null;

                    return (
                      <div className="space-y-4">
                        {/* Interactive SVG Donut Ring */}
                        <div className="flex flex-col items-center justify-center pt-2">
                          <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
                            <svg viewBox="0 0 170 170" className="w-full h-full transform -rotate-90 select-none">
                              {/* Background Base Ring */}
                              <circle
                                cx="85"
                                cy="85"
                                r="64"
                                fill="transparent"
                                stroke="currentColor"
                                strokeWidth="15"
                                className="text-slate-100 dark:text-slate-800"
                              />

                              {/* Donut Slices */}
                              {displayProducts.map((p) => {
                                const slicePct = (p.count / totalCount) * 100;
                                if (slicePct <= 0) return null;
                                const strokeDash = `${(slicePct / 100) * C} ${C}`;
                                const strokeOff = -((accumPct / 100) * C);
                                accumPct += slicePct;
                                const isHov = hoveredCommodity === p.product;
                                const color = commColors[p.product] || '#94a3b8';

                                return (
                                  <circle
                                    key={p.product}
                                    cx="85"
                                    cy="85"
                                    r="64"
                                    fill="transparent"
                                    stroke={color}
                                    strokeWidth={isHov ? 21 : 16}
                                    strokeDasharray={strokeDash}
                                    strokeDashoffset={strokeOff}
                                    className="transition-all duration-300 cursor-pointer"
                                    onMouseEnter={() => setHoveredCommodity(p.product)}
                                    onMouseLeave={() => setHoveredCommodity(null)}
                                  />
                                );
                              })}
                            </svg>

                            {/* Centered Donut Metrics Callout */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-3">
                              {hoveredItem ? (
                                <>
                                  <span className="text-2xl select-none mb-0.5">{hoveredSpec?.icon || '📦'}</span>
                                  <span className="text-xs font-black text-slate-900 dark:text-white capitalize truncate max-w-[120px]">
                                    {hoveredSpec?.label || hoveredItem.product}
                                  </span>
                                  <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                                    ~{(hoveredItem.count * 45).toLocaleString()} MT
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                    {hoveredItem.count} Leads ({hoveredItem.pct}%)
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                    ~{totalMT.toLocaleString()} MT
                                  </span>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Total Cargo Share
                                  </span>
                                  <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                                    ${(totalVal / 1000000).toFixed(1)}M Total Value
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Legend Grid below Donut */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {displayProducts.map((p) => {
                            const spec = COMMODITY_SPECS[p.product] || { icon: '📦', label: p.product, avgPricePerMT: 500 };
                            const color = commColors[p.product] || '#94a3b8';
                            const isHov = hoveredCommodity === p.product;
                            const estMT = p.count * 45;
                            const estVal = estMT * spec.avgPricePerMT;

                            return (
                              <div
                                key={p.product}
                                onMouseEnter={() => setHoveredCommodity(p.product)}
                                onMouseLeave={() => setHoveredCommodity(null)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isHov
                                    ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-2xs'
                                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/50 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                      {spec.icon} {spec.label}
                                    </span>
                                  </div>
                                  <span className="text-xs font-black text-slate-900 dark:text-white shrink-0">
                                    {p.pct}%
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  <span>~{estMT.toLocaleString()} MT</span>
                                  <span>${(estVal / 1000).toFixed(0)}k · {p.count} Leads</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  // Volume Bars View Mode
                  return (
                    <div className="space-y-3.5">
                      {displayProducts.map((p) => {
                        const spec = COMMODITY_SPECS[p.product] || { icon: '📦', label: p.product, grad: 'from-amber-500 to-yellow-500', avgPricePerMT: 500 };
                        const estMT = p.count * 45;
                        const estVal = estMT * spec.avgPricePerMT;
                        return (
                          <div key={p.product} className="group">
                            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-base select-none">{spec.icon}</span>
                                <span className="capitalize text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                  {spec.label}
                                </span>
                              </div>
                              <div className="text-right flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">
                                  ~{estMT.toLocaleString()} MT (${(estVal / 1000).toFixed(0)}k)
                                </span>
                                <div>
                                  <span className="font-extrabold text-slate-900 dark:text-white">{p.count}</span>{' '}
                                  <span className="text-slate-400 font-medium">({p.pct}%)</span>
                                </div>
                              </div>
                            </div>

                            {/* Visual Progress Bar */}
                            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${spec.grad} transition-all duration-500 shadow-xs`}
                                style={{ width: `${Math.max(p.pct * 1.5, 4)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* LEADS BY COUNTRY - INTERACTIVE DONUT & PORT CHART */}
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Globe size={18} className="text-rose-500 dark:text-rose-400" />
                      <span>Global Export Destinations</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Buyer distribution across {metrics.totalLeads} international trade leads
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setCountryChartMode('donut')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          countryChartMode === 'donut'
                            ? 'bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <PieChart size={12} />
                        <span>Donut Chart</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCountryChartMode('bars')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          countryChartMode === 'bars'
                            ? 'bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <BarChart3 size={12} />
                        <span>Port Bars</span>
                      </button>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-rose-50 to-indigo-50 dark:from-rose-950/60 dark:to-indigo-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                      {displayCountries.length} Countries
                    </span>
                  </div>
                </div>

                {(() => {
                  const countryColors = {
                    'Bangladesh': '#f43f5e', // Radiant Blush Rose (was flat #059669)
                    'Nepal': '#ec4899', // Hot Pink / Magenta Blush
                    'Vietnam': '#8b5cf6', // Lavender Violet
                    'Malaysia': '#3b82f6', // Vivid Azure
                    'Not specified': '#64748b',
                    'India': '#f97316', // Warm Coral Sunset
                    'Russia': '#a855f7', // Royal Purple
                    'Indonesia': '#fb7185', // Soft Rose Blush
                    'Saudi Arabia': '#06b6d4', // Luminous Cyan
                    'Greece': '#38bdf8' // Sky Blue
                  };

                  const totalCount = displayCountries.reduce((sum, c) => sum + c.count, 0) || 1;
                  const C = 2 * Math.PI * 64; // ~402.12
                  let accumPct = 0;

                  if (countryChartMode === 'donut') {
                    const hoveredItem = hoveredCountry
                      ? displayCountries.find((c) => c.country === hoveredCountry)
                      : null;
                    const hoveredMeta = hoveredItem ? (COUNTRY_METADATA[hoveredItem.country] || {}) : null;

                    return (
                      <div className="space-y-4">
                        {/* Interactive SVG Donut Ring */}
                        <div className="flex flex-col items-center justify-center pt-2">
                          <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
                            <svg viewBox="0 0 170 170" className="w-full h-full transform -rotate-90 select-none">
                              {/* Background Base Ring */}
                              <circle
                                cx="85"
                                cy="85"
                                r="64"
                                fill="transparent"
                                stroke="currentColor"
                                strokeWidth="15"
                                className="text-slate-100 dark:text-slate-800"
                              />

                              {/* Donut Slices */}
                              {displayCountries.map((c) => {
                                const slicePct = (c.count / totalCount) * 100;
                                if (slicePct <= 0) return null;
                                const strokeDash = `${(slicePct / 100) * C} ${C}`;
                                const strokeOff = -((accumPct / 100) * C);
                                accumPct += slicePct;
                                const isHov = hoveredCountry === c.country;
                                const color = countryColors[c.country] || '#64748b';

                                return (
                                  <circle
                                    key={c.country}
                                    cx="85"
                                    cy="85"
                                    r="64"
                                    fill="transparent"
                                    stroke={color}
                                    strokeWidth={isHov ? 21 : 16}
                                    strokeDasharray={strokeDash}
                                    strokeDashoffset={strokeOff}
                                    className="transition-all duration-300 cursor-pointer"
                                    onMouseEnter={() => setHoveredCountry(c.country)}
                                    onMouseLeave={() => setHoveredCountry(null)}
                                  />
                                );
                              })}
                            </svg>

                            {/* Centered Donut Metrics Callout */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-3">
                              {hoveredItem ? (
                                <>
                                  <span className="text-xl select-none mb-0.5">{COUNTRY_FLAGS[hoveredItem.country] || '🌐'}</span>
                                  <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[120px]">
                                    {hoveredItem.country}
                                  </span>
                                  <span className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400">
                                    {hoveredMeta?.port || 'CIF Destination'}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                    {hoveredItem.count} Deals ({hoveredItem.pct}%)
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {metrics.totalLeads} Leads
                                  </span>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    10 Target Markets
                                  </span>
                                  <span className="text-[10px] font-black bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-500 bg-clip-text text-transparent mt-0.5">
                                    100% Export Desk
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Country Grid below Donut */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {displayCountries.map((c) => {
                            const meta = COUNTRY_METADATA[c.country] || { code: 'GL', badgeBg: 'bg-slate-600', badgeText: 'text-white', port: 'CIF Port' };
                            const color = countryColors[c.country] || '#64748b';
                            const isHov = hoveredCountry === c.country;

                            return (
                              <div
                                key={c.country}
                                onMouseEnter={() => setHoveredCountry(c.country)}
                                onMouseLeave={() => setHoveredCountry(null)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isHov
                                    ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 shadow-2xs'
                                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/50 hover:border-rose-200'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                    <span className={`w-5 h-3.5 rounded text-[8.5px] font-black ${meta.badgeBg} ${meta.badgeText} flex items-center justify-center shrink-0`}>
                                      {meta.code}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                      {c.country}
                                    </span>
                                  </div>
                                  <span className="text-xs font-black text-slate-900 dark:text-white shrink-0">
                                    {c.pct}%
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  <span className="truncate max-w-[120px]">{meta.port}</span>
                                  <span className="shrink-0">{c.count} Deals</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  // Port Bars View Mode
                  return (
                    <div className="space-y-3">
                      {displayCountries.map((c) => {
                        const meta = COUNTRY_METADATA[c.country] || { code: 'GL', badgeBg: 'bg-slate-600', badgeText: 'text-white', port: 'CIF Port', region: 'Global' };
                        const color = countryColors[c.country] || '#64748b';
                        return (
                          <div key={c.country} className="group">
                            <div className="flex items-center justify-between text-xs font-bold mb-1">
                              <div className="flex items-center gap-2.5">
                                <span className={`w-7 h-5 rounded-md ${meta.badgeBg} ${meta.badgeText} text-[10px] font-black flex items-center justify-center tracking-wider shadow-xs`}>
                                  {meta.code}
                                </span>
                                <div>
                                  <span className="text-slate-800 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                                    {c.country}
                                  </span>
                                  <span className="text-[10px] text-slate-400 ml-1.5 hidden sm:inline">
                                    ({meta.port})
                                  </span>
                                </div>
                              </div>

                              <div className="text-right text-slate-600 dark:text-slate-300">
                                <span className="font-extrabold text-slate-900 dark:text-white">{c.count}</span>{' '}
                                <span className="text-slate-400 font-medium">({c.pct}%)</span>
                              </div>
                            </div>

                            {/* Visual Progress bar */}
                            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500 shadow-2xs"
                                style={{
                                  backgroundColor: color,
                                  width: `${Math.max(c.pct, 4)}%`
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* 4. SALES REPRESENTATIVES PERFORMANCE, ORDER VALUE & RISK LEADERBOARD */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck size={19} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Sales Representative Order Book & Follow-up Performance</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rep accountability, order values handled (₹ Lakhs & Cr), and follow-up loss risk monitoring
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setRepViewMode('chart')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      repViewMode === 'chart'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <BarChart3 size={12} />
                    <span>Performance Chart</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepViewMode('cards')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      repViewMode === 'cards'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Users size={12} />
                    <span>Rep Cards</span>
                  </button>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  {metrics.teamWorkload.length} Active Representatives
                </span>
              </div>
            </div>

            {repViewMode === 'chart' ? (
              <div className="space-y-5">
                {/* Responsive SVG Grouped Column Chart */}
                <div className="relative pt-2 pb-1 overflow-x-auto">
                  <div className="min-w-[760px]">
                    <svg viewBox="0 0 920 330" className="w-full h-auto select-none overflow-visible">
                      <defs>
                        <linearGradient id="rep-pipe-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#4338ca" />
                        </linearGradient>
                        <linearGradient id="rep-risk-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#fb7185" />
                          <stop offset="100%" stopColor="#e11d48" />
                        </linearGradient>
                        <filter id="rep-shadow" x="-5%" y="-5%" width="110%" height="115%">
                          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
                        </filter>
                      </defs>

                      {/* Y-Axis Grid Lines & Labels (0 to 20 Cr) */}
                      {[
                        { y: 35, label: '₹20 Cr' },
                        { y: 84, label: '₹15 Cr' },
                        { y: 133, label: '₹10 Cr' },
                        { y: 182, label: '₹5 Cr' },
                        { y: 230, label: '₹0' },
                      ].map((grid) => (
                        <g key={grid.label}>
                          <line
                            x1="65"
                            y1={grid.y}
                            x2="905"
                            y2={grid.y}
                            stroke="currentColor"
                            strokeDasharray={grid.y === 230 ? 'none' : '3 3'}
                            strokeWidth={grid.y === 230 ? '1.5' : '1'}
                            className={grid.y === 230 ? 'text-slate-300 dark:text-slate-700' : 'text-slate-100 dark:text-slate-800'}
                          />
                          <text
                            x="55"
                            y={grid.y + 3.5}
                            textAnchor="end"
                            fontSize="10"
                            fontWeight="700"
                            className="fill-slate-400 dark:fill-slate-500"
                          >
                            {grid.label}
                          </text>
                        </g>
                      ))}

                      {/* 9 Sales Representatives Grouped Bars */}
                      {metrics.teamWorkload.map((member, idx) => {
                        const cX = 112 + idx * 88;
                        const maxLakhs = 2000; // 20 Cr
                        const plotHeight = 195; // 230 - 35
                        const pipeH = Math.max(Math.min((member.pipeValLakhs / maxLakhs) * plotHeight, plotHeight), 8);
                        const pipeY = 230 - pipeH;
                        const riskH = member.atRiskValLakhs > 0
                          ? Math.max(Math.min((member.atRiskValLakhs / maxLakhs) * plotHeight, plotHeight), 8)
                          : 0;
                        const riskY = 230 - riskH;
                        const isHovered = hoveredRep === member.name;

                        return (
                          <g
                            key={member.name}
                            className="cursor-pointer transition-all duration-200"
                            onMouseEnter={() => setHoveredRep(member.name)}
                            onMouseLeave={() => setHoveredRep(null)}
                          >
                            {/* Hover Column Background Highlight */}
                            <rect
                              x={cX - 40}
                              y={25}
                              width={80}
                              height={295}
                              rx="10"
                              className={`transition-colors duration-200 ${
                                isHovered
                                  ? 'fill-indigo-500/10 dark:fill-indigo-400/10'
                                  : 'fill-transparent hover:fill-slate-100/50 dark:hover:fill-slate-800/40'
                              }`}
                            />

                            {/* Active Pipeline Bar (Indigo) */}
                            <rect
                              x={cX - 23}
                              y={pipeY}
                              width={21}
                              height={pipeH}
                              rx="4"
                              fill="url(#rep-pipe-grad)"
                              filter="url(#rep-shadow)"
                              className="transition-all duration-300"
                            />

                            {/* At-Risk Loss Bar (Rose) or Compliance Marker */}
                            {member.atRiskValLakhs > 0 ? (
                              <rect
                                x={cX + 2}
                                y={riskY}
                                width={21}
                                height={riskH}
                                rx="4"
                                fill="url(#rep-risk-grad)"
                                filter="url(#rep-shadow)"
                                className="transition-all duration-300"
                              />
                            ) : (
                              <rect
                                x={cX + 2}
                                y={222}
                                width={21}
                                height={8}
                                rx="3"
                                fill="#06b6d4"
                                className="opacity-90"
                              />
                            )}

                            {/* Value Label above Pipeline Bar */}
                            <text
                              x={cX - 12}
                              y={pipeY - 6}
                              textAnchor="middle"
                              fontSize="9.5"
                              fontWeight="800"
                              className="fill-indigo-600 dark:fill-indigo-400"
                            >
                              ₹{(member.pipeValLakhs / 100).toFixed(1)}Cr
                            </text>

                            {/* Loss or Compliance Badge above At-Risk Bar */}
                            {member.atRiskValLakhs > 0 ? (
                              <text
                                x={cX + 12}
                                y={riskY - 6}
                                textAnchor="middle"
                                fontSize="9"
                                fontWeight="800"
                                className="fill-rose-600 dark:fill-rose-400"
                              >
                                ₹{member.atRiskValLakhs.toFixed(0)}L
                              </text>
                            ) : (
                              <text
                                x={cX + 12}
                                y={214}
                                textAnchor="middle"
                                fontSize="8.5"
                                fontWeight="800"
                                className="fill-indigo-600 dark:fill-indigo-400"
                              >
                                100%
                              </text>
                            )}

                            {/* Rep Avatar Initials Circle */}
                            <circle
                              cx={cX}
                              cy={254}
                              r={12}
                              fill={isHovered ? '#4f46e5' : '#1e293b'}
                              className="transition-colors duration-200"
                            />
                            <text
                              x={cX}
                              y={258}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="9"
                              fontWeight="800"
                              className="pointer-events-none"
                            >
                              {member.avatar}
                            </text>

                            {/* Rep Name Label */}
                            <text
                              x={cX}
                              y={280}
                              textAnchor="middle"
                              fontSize="11"
                              fontWeight={isHovered ? '800' : '700'}
                              className={`transition-colors duration-200 ${
                                isHovered
                                  ? 'fill-indigo-600 dark:fill-indigo-400'
                                  : 'fill-slate-800 dark:fill-slate-200'
                              }`}
                            >
                              {member.name}
                            </text>

                            {/* Leads Handled Badge */}
                            <text
                              x={cX}
                              y={296}
                              textAnchor="middle"
                              fontSize="9.5"
                              fontWeight="700"
                              className="fill-slate-400 dark:fill-slate-500"
                            >
                              {member.count} Leads
                            </text>

                            {/* Status Tag (Delayed vs Compliant) */}
                            <text
                              x={cX}
                              y={310}
                              textAnchor="middle"
                              fontSize="8.5"
                              fontWeight="800"
                              className={member.atRiskCount > 0 ? 'fill-rose-500' : 'fill-indigo-500'}
                            >
                              {member.atRiskCount > 0 ? `⚠️ ${member.atRiskCount} Overdue` : '✓ On-Time'}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Interactive Rep Inspector Panel */}
                {(() => {
                  const activeMember = (hoveredRep && metrics.teamWorkload.find((m) => m.name === hoveredRep)) || metrics.teamWorkload[0];
                  if (!activeMember) return null;

                  return (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${activeMember.color} text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0`}>
                          {activeMember.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {activeMember.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {activeMember.role}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {activeMember.count} Assigned Trade Inquiries · Avg Order Value: ₹{activeMember.avgDealLakhs} Lakhs
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Pipeline</span>
                          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                            ₹{formatLakhs(activeMember.pipeValLakhs)}
                          </span>
                        </div>

                        {activeMember.atRiskCount > 0 ? (
                          <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/50 p-2 rounded-xl border border-rose-200 dark:border-rose-900/60">
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-rose-500 block">At-Risk Loss</span>
                              <span className="text-xs font-black text-rose-700 dark:text-rose-300">
                                ₹{activeMember.atRiskValLakhs.toFixed(1)} Lakhs ({activeMember.atRiskCount} Delayed)
                              </span>
                            </div>
                            <button
                              onClick={() => handleNudgeStaff(activeMember.name, activeMember.atRiskCount, activeMember.atRiskValLakhs)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-2xs shrink-0"
                            >
                              Nudge Rep
                            </button>
                          </div>
                        ) : (
                          <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/60 text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-indigo-600 dark:text-indigo-400" />
                            <span>100% Follow-up Compliance (0 Delayed Deals)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Chart Legend & Performance Highlight Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-indigo-600 shadow-2xs" />
                      <span>Active Pipeline Book (₹ Cr)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-rose-600 shadow-2xs" />
                      <span>At-Risk Overdue Exposure (₹ Lakhs)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-cyan-500 shadow-2xs" />
                      <span>100% On-Time Follow-up Compliance</span>
                    </div>
                  </div>

                  <div className="text-[11px] font-extrabold text-slate-400">
                    Total Desk Order Book: <span className="text-slate-900 dark:text-white">₹{formatLakhs(metrics.totalPipelineValueLakhs)}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Rep Cards Grid View */
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
                          <h3 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                            {member.name}
                          </h3>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {member.role}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900 dark:text-white block">
                          {member.count} <span className="text-[10px] text-slate-400 font-semibold">Leads</span>
                        </span>
                        <span className="text-xs font-black text-rose-600 dark:text-rose-400 block">
                          ₹{formatLakhs(member.totalValLakhs)}
                        </span>
                      </div>
                    </div>

                    {/* Financial Breakdown & At-Risk Warning Pill */}
                    <div className="grid grid-cols-2 gap-2 my-2.5 p-2 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700/70 text-[10px]">
                      <div>
                        <span className="text-slate-400 block">Active Pipeline:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">₹{formatLakhs(member.pipeValLakhs)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block">Avg Order:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">₹{member.avgDealLakhs} L</span>
                      </div>
                    </div>

                    {member.atRiskCount > 0 ? (
                      <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 mb-2 flex items-center justify-between text-[10px]">
                        <span className="font-extrabold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                          <AlertTriangle size={11} className="text-rose-500" />
                          <span>At-Risk Loss: ₹{member.atRiskValLakhs.toFixed(1)} L</span>
                        </span>
                        <button
                          onClick={() => handleNudgeStaff(member.name, member.atRiskCount, member.atRiskValLakhs)}
                          className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                        >
                          Nudge
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 mb-2 text-[10px] text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-indigo-600 dark:text-indigo-400" />
                        <span>100% Follow-up Compliance</span>
                      </div>
                    )}

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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
