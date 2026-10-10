import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  Filter,
  TrendingDown,
  Inbox
} from 'lucide-react';

// Formatting helpers for INR Lakhs / Crores and USD
export const formatLakhs = (lakhs) => {
  if (!lakhs || isNaN(lakhs)) return '₹0 L';
  if (lakhs >= 100) {
    return `₹${(lakhs / 100).toFixed(2)} Cr`;
  }
  return `₹${Number(lakhs).toFixed(1)} L`;
};

export const formatDual = (lakhs) => {
  return formatLakhs(lakhs);
};

// Comprehensive Country Metadata with ISO Badges
const COUNTRY_METADATA = {
  'Bangladesh': { code: 'BD', flag: '🇧🇩', name: 'Bangladesh', badgeBg: 'bg-rose-500', badgeText: 'text-white', port: 'Chittagong Port', region: 'South Asia' },
  'Nepal': { code: 'NP', flag: '🇳🇵', name: 'Nepal', badgeBg: 'bg-pink-600', badgeText: 'text-white', port: 'Birgunj ICP', region: 'South Asia' },
  'Vietnam': { code: 'VN', flag: '🇻🇳', name: 'Vietnam', badgeBg: 'bg-purple-600', badgeText: 'text-white', port: 'Hai Phong / HCMC', region: 'SE Asia' },
  'Malaysia': { code: 'MY', flag: '🇲🇾', name: 'Malaysia', badgeBg: 'bg-blue-600', badgeText: 'text-white', port: 'Port Klang', region: 'SE Asia' },
  'Australia': { code: 'AU', flag: '🇦🇺', name: 'Australia', badgeBg: 'bg-blue-600', badgeText: 'text-white', port: 'Port of Melbourne', region: 'Oceania' },
  'Global': { code: 'GL', flag: '🌐', name: 'Global / Multi-country', badgeBg: 'bg-slate-500', badgeText: 'text-white', port: 'CIF Destination Port', region: 'International' },
  'India': { code: 'IN', flag: '🇮🇳', name: 'India', badgeBg: 'bg-orange-500', badgeText: 'text-white', port: 'Nhava Sheva / Mundra', region: 'Domestic' },
  'Russia': { code: 'RU', flag: '🇷🇺', name: 'Russia', badgeBg: 'bg-indigo-600', badgeText: 'text-white', port: 'Novorossiysk', region: 'CIS / Europe' },
  'Indonesia': { code: 'ID', flag: '🇮🇩', name: 'Indonesia', badgeBg: 'bg-rose-600', badgeText: 'text-white', port: 'Tanjung Priok', region: 'SE Asia' },
  'Saudi Arabia': { code: 'SA', flag: '🇸🇦', name: 'Saudi Arabia', badgeBg: 'bg-cyan-600', badgeText: 'text-white', port: 'Jeddah Port', region: 'Middle East' },
  'United Arab Emirates': { code: 'AE', flag: '🇦🇪', name: 'United Arab Emirates', badgeBg: 'bg-emerald-600', badgeText: 'text-white', port: 'Jebel Ali Port', region: 'Middle East' },
  'Greece': { code: 'GR', flag: '🇬🇷', name: 'Greece', badgeBg: 'bg-sky-600', badgeText: 'text-white', port: 'Piraeus Port', region: 'Europe' },
};

const COUNTRY_FLAGS = {
  'Bangladesh': '🇧🇩',
  'Nepal': '🇳🇵',
  'Vietnam': '🇻🇳',
  'Malaysia': '🇲🇾',
  'Australia': '🇦🇺',
  'Global': '🌐',
  'India': '🇮🇳',
  'Russia': '🇷🇺',
  'Indonesia': '🇮🇩',
  'Saudi Arabia': '🇸🇦',
  'United Arab Emirates': '🇦🇪',
  'Greece': '🇬🇷',
};

// Commodity specs
const COMMODITY_SPECS = {
  'turmeric': { icon: '🌿', label: 'Turmeric (Finger & Powder)', grad: 'from-amber-500 to-yellow-500', barCol: 'bg-amber-500', avgPricePerMT: 1450 },
  'rice ddgs': { icon: '🌾', label: 'Rice DDGS (45% Protein)', grad: 'from-rose-400 to-pink-500', barCol: 'bg-rose-500', avgPricePerMT: 285 },
  'corn ddgs': { icon: '🌽', label: 'Corn DDGS (Feed Grade)', grad: 'from-yellow-400 to-amber-500', barCol: 'bg-yellow-500', avgPricePerMT: 295 },
  'dorb': { icon: '🌻', label: 'DORB (De-Oiled Rice Bran)', grad: 'from-purple-500 to-indigo-500', barCol: 'bg-purple-500', avgPricePerMT: 180 },
  'chilli': { icon: '🌶️', label: 'Dry Red Chilli (Teja/S4)', grad: 'from-rose-500 to-red-600', barCol: 'bg-rose-500', avgPricePerMT: 2400 },
  'maize': { icon: '🌽', label: 'Yellow Maize (Feed Grain)', grad: 'from-orange-500 to-amber-600', barCol: 'bg-orange-500', avgPricePerMT: 230 },
  'rsm': { icon: '🌾', label: 'Rapeseed Meal (RSM 38%)', grad: 'from-blue-500 to-indigo-600', barCol: 'bg-blue-500', avgPricePerMT: 310 },
  'ginger': { icon: '🫚', label: 'Fresh / Dry Ginger', grad: 'from-teal-400 to-cyan-500', barCol: 'bg-teal-500', avgPricePerMT: 1850 },
  'soya seed': { icon: '🌱', label: 'Soya Seed (Export Quality)', grad: 'from-emerald-400 to-green-500', barCol: 'bg-emerald-500', avgPricePerMT: 520 },
};

const COMMODITY_COLORS = {
  turmeric: '#f59e0b',
  'rice ddgs': '#fb7185',
  'corn ddgs': '#eab308',
  dorb: '#8b5cf6',
  chilli: '#f43f5e',
  maize: '#f97316',
  rsm: '#3b82f6',
  ginger: '#14b8a6',
  'soya seed': '#10b981',
};

const PIPELINE_STAGES = [
  { name: 'Lead Generation', step: 1, color: 'bg-blue-500', grad: 'from-blue-500 to-indigo-600', strokeCol: '#3b82f6' },
  { name: 'Contact Established', step: 2, color: 'bg-indigo-500', grad: 'from-indigo-500 to-cyan-500', strokeCol: '#6366f1' },
  { name: 'Requirement Understood', step: 3, color: 'bg-cyan-500', grad: 'from-cyan-500 to-teal-500', strokeCol: '#06b6d4' },
  { name: 'Sample Sent', step: 4, color: 'bg-amber-400', grad: 'from-amber-400 to-amber-500', strokeCol: '#f59e0b' },
  { name: 'Quotation Sent', step: 5, color: 'bg-orange-500', grad: 'from-orange-500 to-orange-600', strokeCol: '#f97316' },
  { name: 'Negotiation', step: 6, color: 'bg-purple-500', grad: 'from-purple-500 to-fuchsia-600', strokeCol: '#a855f7' },
  { name: 'Closed Won', step: 7, color: 'bg-emerald-500', grad: 'from-emerald-500 to-teal-600', strokeCol: '#10b981' },
  { name: 'Closed Lost', step: 8, color: 'bg-rose-500', grad: 'from-rose-500 to-red-600', strokeCol: '#f43f5e' },
];

export default function Analytics() {
  const { profile, isOwner, isStaff } = useAuth();
  const [rawLeads, setRawLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('insights'); // 'insights' | 'calendar'
  const [datePreset, setDatePreset] = useState('all');
  
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState(todayStr);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayStr);
  
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [trendMetric, setTrendMetric] = useState('lakhs'); // 'lakhs' | 'count' | 'value'
  const [chartStyle, setChartStyle] = useState('spline'); // 'spline' | 'bars'
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState(null);

  // Visual Chart View Modes
  const [commodityChartMode, setCommodityChartMode] = useState('donut'); // 'donut' | 'bars'
  const [hoveredCommodity, setHoveredCommodity] = useState(null);

  const [countryChartMode, setCountryChartMode] = useState('donut'); // 'donut' | 'bars'
  const [hoveredCountry, setHoveredCountry] = useState(null);

  const [funnelChartMode, setFunnelChartMode] = useState('funnel'); // 'funnel' | 'bars'
  const [hoveredStage, setHoveredStage] = useState(null);

  const [repViewMode, setRepViewMode] = useState('chart'); // 'chart' | 'cards'
  const [hoveredRep, setHoveredRep] = useState(null);

  // Fetch real leads from API and LocalStorage
  useEffect(() => {
    let isMounted = true;
    const fetchRealData = async () => {
      try {
        setLoading(true);
        // Immediate local cache
        try {
          const stored = localStorage.getItem('oneroot_leads_v3');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && isMounted) {
              setRawLeads(parsed);
            }
          }
        } catch (e) {}

        const res = await api.getLeads();
        if (res && res.success && Array.isArray(res.data)) {
          if (isMounted) setRawLeads(res.data);
        }
      } catch (err) {
        console.warn('Analytics: API fetch leads fallback to local cache:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRealData();
    return () => { isMounted = false; };
  }, [profile?.id]);

  // Normalize real leads into analytical records
  const normalizedLeads = useMemo(() => {
    return rawLeads.map((l, index) => {
      const date = l.created_at ? l.created_at.split('T')[0] : (l.date || todayStr);
      const priceNum = Number(l.price) || Number(l.value) || 0;
      const rawQty = Number(l.quantity) || 0;
      
      // Calculate INR value in Lakhs directly from INR deal value
      const orderValueLakhs = l.orderValueLakhs !== undefined
        ? Number(l.orderValueLakhs)
        : parseFloat((priceNum / 100000).toFixed(2));
      
      const orderValueInr = Math.round(priceNum);
      const unit = (l.quantity_unit || (rawQty >= 1000 ? 'kg' : 'MT')).toLowerCase();
      let quantityMT = 0;
      if (unit === 'mt' || unit === 'tonnes' || unit === 'tones' || unit === 'tonne') {
        quantityMT = rawQty;
      } else if (unit === 'quintal' || unit === 'qtl') {
        quantityMT = rawQty * 0.1;
      } else if (unit === 'lbs') {
        quantityMT = rawQty * 0.00045359237;
      } else if (unit === 'containers' || unit === 'fcl') {
        quantityMT = rawQty * 25;
      } else {
        quantityMT = rawQty > 0 ? (rawQty / 1000) : (orderValueLakhs * 1.15);
      }

      // Extract Clean Country Name
      const cleanCountry = (l.country || 'Global')
        .replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, '')
        .trim() || 'Global';

      // Primary Product
      let primaryProd = 'Turmeric';
      if (Array.isArray(l.products) && l.products.length > 0 && l.products[0]) {
        primaryProd = l.products[0].trim();
      } else if (l.product) {
        primaryProd = l.product.split(',')[0].trim();
      }

      // Stage / Status
      const statusName = l.stage || l.status || l.lead_stage || 'Requirement Understood';

      // Agent / Rep Name
      const agentName = l.agent_name || l.created_by_name || (profile?.name || 'Staff');
      const companyName = l.company_name || l.name || `Trade Account #${index + 1}`;

      return {
        id: l.id || `lead_${index}`,
        date,
        country: cleanCountry,
        rawCountry: l.country || cleanCountry,
        product: primaryProd.toLowerCase(),
        displayProduct: primaryProd,
        status: statusName,
        agent: agentName,
        type: l.type || 'Export',
        value: orderValueInr,
        orderValueLakhs,
        company: companyName,
        quantityMT,
        follow_up_date: l.follow_up_date || '',
        created_at: l.created_at || date,
      };
    });
  }, [rawLeads, todayStr, profile?.name]);

  // Filter leads based on the active date preset, range, and search
  const filteredLeads = useMemo(() => {
    const now = new Date();
    const curYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastYearMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
    
    const dAgo = (days) => new Date(now.getTime() - days * 86400000).toISOString().split('T')[0];
    const yesterdayStr = dAgo(1);
    const sevenDaysAgo = dAgo(7);
    const thirtyDaysAgo = dAgo(30);
    const ninetyDaysAgo = dAgo(90);
    const halfYearAgo = dAgo(180);
    const oneYearAgo = dAgo(365);

    return normalizedLeads.filter((lead) => {
      // Date Filter
      if (datePreset === 'today' && lead.date !== todayStr) return false;
      if (datePreset === 'yesterday' && lead.date !== yesterdayStr) return false;
      if (datePreset === 'this_week' && (lead.date < sevenDaysAgo || lead.date > todayStr)) return false;
      if (datePreset === 'this_month' && !lead.date.startsWith(curYearMonth)) return false;
      if (datePreset === 'last_month' && !lead.date.startsWith(lastYearMonth)) return false;
      if (datePreset === 'last_30_days' && (lead.date < thirtyDaysAgo || lead.date > todayStr)) return false;
      if (datePreset === '1m' && (lead.date < thirtyDaysAgo || lead.date > todayStr)) return false;
      if (datePreset === '3m' && (lead.date < ninetyDaysAgo || lead.date > todayStr)) return false;
      if (datePreset === '6m' && (lead.date < halfYearAgo || lead.date > todayStr)) return false;
      if (datePreset === '1y' && (lead.date < oneYearAgo || lead.date > todayStr)) return false;
      if (datePreset === 'single_date' && lead.date !== selectedCalendarDate) return false;
      if (datePreset === 'custom') {
        if (customFrom && lead.date < customFrom) return false;
        if (customTo && lead.date > customTo) return false;
      }

      // Search Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const match =
          lead.company.toLowerCase().includes(q) ||
          lead.country.toLowerCase().includes(q) ||
          lead.displayProduct.toLowerCase().includes(q) ||
          lead.agent.toLowerCase().includes(q) ||
          lead.status.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [normalizedLeads, datePreset, todayStr, selectedCalendarDate, customFrom, customTo, searchTerm]);

  // Recalculate Metrics from real filtered leads
  const metrics = useMemo(() => {
    const total = filteredLeads.length;
    const inPipeline = filteredLeads.filter((l) => l.status !== 'Closed Won' && l.status !== 'Closed Lost').length;
    const closedWon = filteredLeads.filter((l) => l.status === 'Closed Won').length;
    const closedLost = filteredLeads.filter((l) => l.status === 'Closed Lost').length;
    const exportCount = filteredLeads.filter((l) => l.type === 'Export' || l.type === 'International' || !l.type).length;
    const domesticCount = filteredLeads.filter((l) => l.type === 'Domestic').length;

    // Monetary Values in INR Lakhs
    const totalOrderValueLakhs = filteredLeads.reduce((sum, l) => sum + (l.orderValueLakhs || 0), 0);
    const totalPipelineValueLakhs = filteredLeads
      .filter((l) => l.status !== 'Closed Won' && l.status !== 'Closed Lost')
      .reduce((sum, l) => sum + (l.orderValueLakhs || 0), 0);
    const totalClosedWonValueLakhs = filteredLeads
      .filter((l) => l.status === 'Closed Won')
      .reduce((sum, l) => sum + (l.orderValueLakhs || 0), 0);

    // Total Cargo Volume in Metric Tonnes (MT)
    const totalVolumeMT = filteredLeads.reduce((sum, l) => sum + (l.quantityMT || 0), 0);
    const avgDealValueLakhs = total > 0 ? parseFloat((totalOrderValueLakhs / total).toFixed(1)) : 0;

    // Country Breakdown
    const countryMap = {};
    filteredLeads.forEach((l) => {
      countryMap[l.country] = (countryMap[l.country] || 0) + 1;
    });
    const countries = Object.keys(countryMap)
      .map((c) => ({
        country: c,
        count: countryMap[c],
        pct: total > 0 ? Math.round((countryMap[c] / total) * 100) : 0,
        flag: COUNTRY_FLAGS[c] || '🌐',
      }))
      .sort((a, b) => b.count - a.count);

    // Product Breakdown
    const productMap = {};
    filteredLeads.forEach((l) => {
      const prodKey = l.displayProduct || l.product;
      productMap[prodKey] = (productMap[prodKey] || 0) + 1;
    });
    const products = Object.keys(productMap)
      .map((p) => {
        const lower = p.toLowerCase();
        return {
          product: p,
          count: productMap[p],
          pct: total > 0 ? Math.round((productMap[p] / total) * 100) : 0,
          color: COMMODITY_COLORS[lower] || '#94a3b8',
        };
      })
      .sort((a, b) => b.count - a.count);

    // Pipeline Status Breakdown
    const statusMap = {};
    filteredLeads.forEach((l) => {
      statusMap[l.status] = (statusMap[l.status] || 0) + 1;
    });
    const pipelineStatus = PIPELINE_STAGES.map((s) => {
      const count = statusMap[s.name] || 0;
      const stageLeads = filteredLeads.filter((l) => l.status === s.name);
      const stageValLakhs = stageLeads.reduce((sum, l) => sum + (l.orderValueLakhs || 0), 0);
      return {
        ...s,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        stageValLakhs,
      };
    });

    // Team Workload Breakdown from real leads
    const repMap = {};
    filteredLeads.forEach((l) => {
      const rep = l.agent || 'Staff';
      if (!repMap[rep]) {
        repMap[rep] = { count: 0, totalValLakhs: 0, pipeValLakhs: 0, wonValLakhs: 0 };
      }
      repMap[rep].count += 1;
      repMap[rep].totalValLakhs += l.orderValueLakhs || 0;
      if (l.status === 'Closed Won') {
        repMap[rep].wonValLakhs += l.orderValueLakhs || 0;
      } else if (l.status !== 'Closed Lost') {
        repMap[rep].pipeValLakhs += l.orderValueLakhs || 0;
      }
    });

    const colors = [
      'from-blue-600 to-indigo-600',
      'from-rose-500 to-pink-600',
      'from-amber-600 to-orange-600',
      'from-emerald-600 to-teal-600',
      'from-purple-600 to-indigo-600',
      'from-cyan-600 to-blue-600',
    ];

    const teamWorkload = Object.keys(repMap)
      .map((name, i) => {
        const item = repMap[name];
        const initials = name.slice(0, 2).toUpperCase();
        const avgDealLakhs = item.count > 0 ? parseFloat((item.totalValLakhs / item.count).toFixed(1)) : 0;
        return {
          name,
          role: 'Trade Representative',
          avatar: initials,
          color: colors[i % colors.length],
          count: item.count,
          pct: total > 0 ? Math.round((item.count / total) * 100) : 0,
          totalValLakhs: item.totalValLakhs,
          pipeValLakhs: item.pipeValLakhs,
          wonValLakhs: item.wonValLakhs,
          avgDealLakhs,
        };
      })
      .sort((a, b) => b.count - a.count);

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
      totalVolumeMT,
      avgDealValueLakhs,
      countries,
      products,
      pipelineStatus,
      teamWorkload,
    };
  }, [filteredLeads]);

  // Calendar Day Leads Lookup
  const leadsByDate = useMemo(() => {
    const map = {};
    normalizedLeads.forEach((l) => {
      if (!map[l.date]) map[l.date] = [];
      map[l.date].push(l);
    });
    return map;
  }, [normalizedLeads]);

  // Date Filter Label
  const getDateFilterLabel = () => {
    if (datePreset === 'all') return 'All Time';
    if (datePreset === 'today') return 'Today';
    if (datePreset === 'yesterday') return 'Yesterday';
    if (datePreset === 'this_week') return 'Last 7 Days';
    if (datePreset === 'this_month') return 'This Month';
    if (datePreset === 'last_month') return 'Last Month';
    if (datePreset === 'last_30_days' || datePreset === '1m') return 'Last 30 Days';
    if (datePreset === '3m') return 'Last 3 Months';
    if (datePreset === '6m') return 'Last 6 Months';
    if (datePreset === '1y') return 'Last 1 Year';
    if (datePreset === 'single_date') return `Date: ${selectedCalendarDate}`;
    if (datePreset === 'custom') return `${customFrom || 'Start'} to ${customTo || 'Today'}`;
    return 'Date Filter';
  };

  // Export Analytics Summary to CSV
  const handleExportAnalyticsCSV = () => {
    const lines = [];
    lines.push('Category,Item,Lead Count,Percentage');
    lines.push(`Filter Period,${getDateFilterLabel()},${metrics.totalLeads},100%`);
    lines.push(`Overview,Total Inquiries,${metrics.totalLeads},100%`);
    lines.push(`Overview,In Pipeline,${metrics.inPipeline},${metrics.totalLeads > 0 ? Math.round((metrics.inPipeline / metrics.totalLeads) * 100) : 0}%`);
    lines.push(`Overview,Closed Won,${metrics.closedWon},${metrics.totalLeads > 0 ? Math.round((metrics.closedWon / metrics.totalLeads) * 100) : 0}%`);
    lines.push(`Overview,Export Desk,${metrics.exportCount},100%`);
    lines.push(`Overview,Total Trade Volume MT,${metrics.totalVolumeMT.toFixed(2)} MT,N/A`);
    lines.push(`Overview,Order Book Value,${formatLakhs(metrics.totalOrderValueLakhs)},N/A`);

    metrics.countries.forEach((c) => {
      lines.push(`Country,${c.country},${c.count},${c.pct}%`);
    });
    metrics.products.forEach((p) => {
      lines.push(`Product,${p.product},${p.count},${p.pct}%`);
    });
    metrics.pipelineStatus.forEach((s) => {
      lines.push(`Pipeline Status,${s.name},${s.count},${s.pct}%`);
    });
    metrics.teamWorkload.forEach((m) => {
      lines.push(`Representative,${m.name},${m.count},${m.pct}%`);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(lines.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `trade_analytics_${datePreset}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Search filtering in commodities and countries
  const displayCountries = useMemo(() => {
    if (!searchTerm.trim()) return metrics.countries;
    return metrics.countries.filter((c) => c.country.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [metrics.countries, searchTerm]);

  const displayProducts = useMemo(() => {
    if (!searchTerm.trim()) return metrics.products;
    return metrics.products.filter((p) => p.product.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [metrics.products, searchTerm]);

  // Dynamic Timeline Trend Points built from REAL leads
  const timelineData = useMemo(() => {
    const points = [];
    if (filteredLeads.length === 0) {
      // Empty fallback timeline
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const dayLabel = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        points.push({
          label: dayLabel,
          fullDate: d.toISOString().split('T')[0],
          count: 0,
          value: 0,
          valLakhs: 0,
          topCommodity: 'No inquiries',
        });
      }
      return points;
    }

    // Group leads by date
    const dateMap = {};
    filteredLeads.forEach((l) => {
      const d = l.date;
      if (!dateMap[d]) {
        dateMap[d] = { count: 0, value: 0, valLakhs: 0, prods: {} };
      }
      dateMap[d].count += 1;
      dateMap[d].value += l.value || 0;
      dateMap[d].valLakhs += l.orderValueLakhs || 0;
      dateMap[d].prods[l.displayProduct] = (dateMap[d].prods[l.displayProduct] || 0) + 1;
    });

    // Sort distinct dates
    const sortedDates = Object.keys(dateMap).sort();

    // If only 1 or 2 dates, pad with neighboring days for smooth curve
    if (sortedDates.length === 1) {
      const singleDate = sortedDates[0];
      const dObj = new Date(singleDate);
      const prevDate = new Date(dObj.getTime() - 86400000).toISOString().split('T')[0];
      const nextDate = new Date(dObj.getTime() + 86400000).toISOString().split('T')[0];

      const item = dateMap[singleDate];
      const topProd = Object.keys(item.prods)[0] || 'Commodity';

      points.push({
        label: new Date(prevDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        fullDate: prevDate,
        count: 0,
        value: 0,
        valLakhs: 0,
        topCommodity: 'None',
      });
      points.push({
        label: new Date(singleDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        fullDate: singleDate,
        count: item.count,
        value: item.value,
        valLakhs: parseFloat(item.valLakhs.toFixed(1)),
        topCommodity: topProd,
      });
      points.push({
        label: new Date(nextDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        fullDate: nextDate,
        count: 0,
        value: 0,
        valLakhs: 0,
        topCommodity: 'None',
      });
      return points;
    }

    sortedDates.forEach((d) => {
      const item = dateMap[d];
      let topProd = 'Commodity';
      let maxPCount = 0;
      Object.keys(item.prods).forEach((p) => {
        if (item.prods[p] > maxPCount) {
          maxPCount = item.prods[p];
          topProd = p;
        }
      });

      const label = new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      points.push({
        label,
        fullDate: d,
        count: item.count,
        value: item.value,
        valLakhs: parseFloat(item.valLakhs.toFixed(1)),
        topCommodity: topProd,
      });
    });

    return points;
  }, [filteredLeads]);

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
      if (trendMetric === 'count') return d.count;
      return d.value;
    });
    return Math.max(...vals, 1);
  }, [timelineData, trendMetric]);

  const trendPoints = useMemo(() => {
    if (timelineData.length === 0) return [];
    const len = timelineData.length;
    return timelineData.map((d, i) => {
      const v = trendMetric === 'lakhs' ? d.valLakhs : trendMetric === 'count' ? d.count : d.value;
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
            Real-time pipeline metrics, commodity cargo volumes, and export inquiry trends
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
                    {[
                      { key: 'all', label: 'All Time' },
                      { key: 'today', label: 'Today' },
                      { key: 'yesterday', label: 'Yesterday' },
                      { key: 'this_week', label: 'Last 7 Days' },
                      { key: 'this_month', label: 'This Month' },
                      { key: 'last_month', label: 'Last Month' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => {
                          setDatePreset(key);
                          setDateDropdownOpen(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-left font-bold transition-all ${
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
                Displaying {metrics.totalLeads} inquiries in scope
              </span>
            </div>
          </div>

          <button
            onClick={() => setDatePreset('all')}
            className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-all shadow-xs cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Reset to All Time</span>
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
                  onClick={() => {
                    const now = new Date();
                    setCalendarMonth({ year: now.getFullYear(), month: now.getMonth() });
                    setSelectedCalendarDate(todayStr);
                  }}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Current Month
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
                const mStr = String(calendarMonth.month + 1).padStart(2, '0');
                const dateKey = `${calendarMonth.year}-${mStr}-${dStr}`;
                const dayLeads = leadsByDate[dateKey] || [];
                const isToday = dateKey === todayStr;
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
                          {dayLeads[0]?.displayProduct || dayLeads[0]?.product} {dayLeads.length > 1 ? `+${dayLeads.length - 1}` : ''}
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
                        📦 {item.displayProduct || item.product}
                      </span>
                      <span className="font-semibold text-slate-500 text-[11px]">
                        Rep: {item.agent}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span>Value: ${(item.value || 0).toLocaleString()}</span>
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

      {/* VIEW MODE 2: CHARTS & BREAKDOWN */}
      {viewMode === 'insights' && (
        <div className="space-y-6 animate-fadeIn">
          {/* TOP 4 KPI CARDS: ORDER VALUE IN LAKHS & CARGO VOLUME */}
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
            <div className="bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 shadow-sm transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/80">
                  Closed won
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight">
                {metrics.closedWon}{' '}
                <span className="text-sm font-bold text-emerald-500/70">Finalized</span>
              </div>
              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <span>Contract Value: {formatLakhs(metrics.totalClosedWonValueLakhs)}</span>
              </div>
            </div>

            {/* 4. TOTAL TRADE VOLUME (Clean, Professional replacement of Revenue at Risk) */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Total trade volume
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Package size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
                {metrics.totalVolumeMT >= 1 ? `${metrics.totalVolumeMT.toFixed(1)} MT` : `${metrics.totalVolumeMT.toFixed(2)} MT`}
              </div>
              <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 mt-1 flex items-center justify-between">
                <span>Avg Deal: {formatLakhs(metrics.avgDealValueLakhs)}</span>
                <span className="text-slate-400 font-medium text-[10px]">Agricultural Commodities</span>
              </div>
            </div>
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
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                    Live Reactive
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Time-series trajectory for <span className="font-bold text-slate-700 dark:text-slate-300">{getDateFilterLabel()}</span> ({metrics.totalLeads} total records in scope)
                </p>
              </div>

              {/* View & Metric Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Metric Selector */}
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
                  <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.32" />
                    <stop offset="60%" stopColor="#ec4899" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                  </linearGradient>

                  <linearGradient id="trendLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="50%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>

                  <linearGradient id="trendBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" />
                    <stop offset="100%" stopColor="#8b5cf6" />
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
                        fill="url(#trendAreaGrad)"
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
                      const barWidth = Math.max(Math.min(cW / Math.max(trendPoints.length, 1) - 4, 30), 6);
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
                      stroke="#ec4899"
                      strokeDasharray="3 3"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={trendPoints[hoveredTrendIndex].x}
                      cy={trendPoints[hoveredTrendIndex].y}
                      r="9"
                      fill="#ec4899"
                      fillOpacity="0.25"
                      className="animate-ping"
                    />
                    <circle
                      cx={trendPoints[hoveredTrendIndex].x}
                      cy={trendPoints[hoveredTrendIndex].y}
                      r="5.5"
                      fill="#ffffff"
                      stroke="#f43f5e"
                      strokeWidth="3"
                    />
                  </g>
                )}

                {/* Invisible Hover Rect Trigger Columns across full chart width */}
                {trendPoints.map((pt, idx) => {
                  const colW = cW / Math.max(trendPoints.length, 1);
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

                  <div className="flex items-center justify-between gap-3 text-[10px] pt-1.5 border-t border-slate-700/60 text-slate-400 mt-1">
                    <span>Primary Product:</span>
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Pipeline Value</span>
                <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                  {formatLakhs(metrics.totalPipelineValueLakhs)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active Order Value</span>
                <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                  {formatLakhs(metrics.totalOrderValueLakhs)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block">Cargo Trade Volume</span>
                <span className="text-sm font-black text-purple-700 dark:text-purple-300 mt-0.5 block">
                  {metrics.totalVolumeMT.toFixed(1)} MT
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Win Conversion Rate</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {metrics.totalLeads > 0 ? ((metrics.closedWon / metrics.totalLeads) * 100).toFixed(1) : 0}% Closed
                </span>
              </div>
            </div>
          </div>

          {/* 2. PIPELINE CONVERSION FUNNEL & TRADE CLASSIFICATION ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* PIPELINE CONVERSION FUNNEL (2 Columns) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers size={18} className="text-blue-600 dark:text-blue-400" />
                    <span>Sales Pipeline Stage Funnel & Conversion</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lead progression from initial inquiry to signed export contracts with deal valuations
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

              {/* Dynamic Funnel Stages */}
              {(() => {
                const stages = metrics.pipelineStatus;

                if (funnelChartMode === 'funnel') {
                  const widths = [
                    { top: 580, bot: 510 },
                    { top: 510, bot: 440 },
                    { top: 440, bot: 370 },
                    { top: 370, bot: 300 },
                    { top: 300, bot: 240 },
                    { top: 240, bot: 180 },
                    { top: 180, bot: 120 },
                    { top: 120, bot: 80 },
                  ];
                  const cX = 350;
                  const stepH = 38;
                  const gap = 4;

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
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#059669" />
                          </linearGradient>
                          <linearGradient id="stg-grad-8" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f43f5e" />
                            <stop offset="100%" stopColor="#e11d48" />
                          </linearGradient>
                          <filter id="funnel-shadow" x="-5%" y="-5%" width="110%" height="120%">
                            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodOpacity="0.18" />
                          </filter>
                        </defs>

                        {stages.map((stg, idx) => {
                          const yTop = idx * (stepH + gap) + 4;
                          const yBot = yTop + stepH;
                          const wTop = widths[idx]?.top || 200;
                          const wBot = widths[idx]?.bot || 150;
                          const x1 = cX - wTop / 2;
                          const x2 = cX + wTop / 2;
                          const x3 = cX + wBot / 2;
                          const x4 = cX - wBot / 2;
                          const isHovered = hoveredStage === idx;

                          return (
                            <g
                              key={stg.name}
                              className="cursor-pointer transition-all duration-200"
                              onMouseEnter={() => setHoveredStage(idx)}
                              onMouseLeave={() => setHoveredStage(null)}
                            >
                              <polygon
                                points={`${x1},${yTop} ${x2},${yTop} ${x3},${yBot} ${x4},${yBot}`}
                                fill={`url(#stg-grad-${(idx % 8) + 1})`}
                                stroke={isHovered ? '#ffffff' : 'rgba(255,255,255,0.25)'}
                                strokeWidth={isHovered ? 2.5 : 1}
                                filter="url(#funnel-shadow)"
                                className="transition-all duration-200"
                              />

                              <text
                                x={cX}
                                y={yTop + 16}
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize="11"
                                fontWeight="800"
                                className="drop-shadow-xs pointer-events-none"
                              >
                                {stg.step}. {stg.name}
                              </text>
                              <text
                                x={cX}
                                y={yTop + 29}
                                textAnchor="middle"
                                fill="rgba(255,255,255,0.92)"
                                fontSize="10"
                                fontWeight="700"
                                className="drop-shadow-xs pointer-events-none"
                              >
                                {stg.count} Deals ({stg.pct}%) · {formatLakhs(stg.stageValLakhs)}
                              </text>
                            </g>
                          );
                        })}
                      </svg>

                      {/* Floating Rich Tooltip */}
                      {hoveredStage !== null && stages[hoveredStage] && (
                        <div className="absolute pointer-events-none z-20 top-4 right-4 bg-slate-900/95 dark:bg-slate-800/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-xs min-w-[210px]">
                          <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-700">
                            <span className="font-extrabold text-blue-400">
                              Stage {stages[hoveredStage].step}: {stages[hoveredStage].name}
                            </span>
                          </div>
                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Deals in Stage:</span>
                              <span className="font-bold">{stages[hoveredStage].count} ({stages[hoveredStage].pct}%)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Stage Value:</span>
                              <span className="font-bold text-rose-300">{formatLakhs(stages[hoveredStage].stageValLakhs)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Funnel Footnote */}
                      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                        <div className="p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
                          <span className="text-[10px] text-slate-400 block font-semibold">Active Pipeline</span>
                          <span className="font-black text-blue-700 dark:text-blue-300">
                            {formatLakhs(metrics.totalPipelineValueLakhs)} ({metrics.inPipeline} Deals)
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40">
                          <span className="text-[10px] text-slate-400 block font-semibold">Total Cargo</span>
                          <span className="font-black text-purple-700 dark:text-purple-300">
                            {metrics.totalVolumeMT.toFixed(1)} MT Volume
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
                          <span className="text-[10px] text-slate-400 block font-semibold">Won Contracts</span>
                          <span className="font-black text-emerald-700 dark:text-emerald-300">
                            {metrics.closedWon} Finalized Deals
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Stage Comparison Bars View Mode
                return (
                  <div className="space-y-2.5">
                    {stages.map((stg) => (
                      <div key={stg.name} className="group">
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black flex items-center justify-center">
                              {stg.step}
                            </span>
                            <span className="text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">
                              {stg.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-right">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              {formatLakhs(stg.stageValLakhs)}
                            </span>
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {stg.count} <span className="text-slate-400 font-medium text-[11px]">({stg.pct}%)</span>
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${stg.grad} transition-all duration-500 shadow-xs`}
                            style={{ width: `${Math.max(stg.pct * 2.5, stg.count > 0 ? 5 : 0)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* TRADE CATEGORY SPLIT: INTERACTIVE DONUT CHART (1 Column) */}
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
                      </defs>

                      <circle
                        cx="75"
                        cy="75"
                        r="54"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="15"
                        className="text-slate-100 dark:text-slate-800"
                      />

                      <circle
                        cx="75"
                        cy="75"
                        r="54"
                        fill="transparent"
                        stroke="url(#trade-ring-blush-grad)"
                        strokeWidth="15"
                        strokeDasharray={`${((metrics.exportCount || 1) / Math.max(metrics.totalLeads, 1)) * 339.29} 339.29`}
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
                          strokeDasharray={`${(metrics.domesticCount / Math.max(metrics.totalLeads, 1)) * 339.29} 339.29`}
                          strokeDashoffset={`-${((metrics.exportCount || 1) / Math.max(metrics.totalLeads, 1)) * 339.29}`}
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />
                      )}
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                      <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {metrics.totalLeads}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Total Deals
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 mt-1 rounded-full bg-gradient-to-r from-rose-50 to-indigo-50 dark:from-rose-950/70 dark:to-indigo-950/70 text-rose-600 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80 shadow-2xs">
                        {metrics.totalLeads > 0 ? `${Math.round((metrics.exportCount / metrics.totalLeads) * 100)}% Export` : 'Export Desk'}
                      </span>
                    </div>
                  </div>

                  <div className="w-full space-y-2 mt-4">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-rose-50/90 via-fuchsia-50/60 to-indigo-50/90 dark:from-rose-950/40 dark:via-fuchsia-950/20 dark:to-indigo-950/40 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-600 shadow-xs shrink-0" />
                        <div>
                          <span className="text-xs font-black text-rose-950 dark:text-rose-200 block">
                            🌐 International Export
                          </span>
                          <span className="text-[10px] font-medium text-rose-700/80 dark:text-rose-300/80">
                            CIF / FOB Global Inquiries
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-rose-900 dark:text-rose-100 block">
                          {metrics.exportCount}
                        </span>
                        <span className="text-[10px] font-black text-rose-600 dark:text-rose-400">
                          {metrics.totalLeads > 0 ? Math.round((metrics.exportCount / metrics.totalLeads) * 100) : 100}%
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                            🏠 Domestic Mandi Trade
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Local Trade / APMC
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                          {metrics.domesticCount}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {metrics.totalLeads > 0 ? Math.round((metrics.domesticCount / metrics.totalLeads) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center font-medium">
                Live Trade Desk Analytics
              </div>
            </div>
          </div>

          {/* 3. COMMODITIES BREAKDOWN & GEOGRAPHIC COUNTRY MATRIX (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LEADS BY COMMODITY / PRODUCT */}
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
                        <span>Donut</span>
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
                        <span>Bars</span>
                      </button>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                      {displayProducts.length} Commodities
                    </span>
                  </div>
                </div>

                {displayProducts.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No commodity inquiries recorded for the selected filter period.
                  </div>
                ) : (
                  (() => {
                    const totalCount = displayProducts.reduce((sum, p) => sum + p.count, 0) || 1;
                    const C = 2 * Math.PI * 64;
                    let accumPct = 0;

                    if (commodityChartMode === 'donut') {
                      const hoveredItem = hoveredCommodity
                        ? displayProducts.find((p) => p.product === hoveredCommodity)
                        : null;
                      const hoveredLower = hoveredItem ? hoveredItem.product.toLowerCase() : '';
                      const hoveredSpec = COMMODITY_SPECS[hoveredLower] || { icon: '📦', label: hoveredItem?.product || '' };

                      return (
                        <div className="space-y-4">
                          <div className="flex flex-col items-center justify-center pt-2">
                            <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
                              <svg viewBox="0 0 170 170" className="w-full h-full transform -rotate-90 select-none">
                                <circle
                                  cx="85"
                                  cy="85"
                                  r="64"
                                  fill="transparent"
                                  stroke="currentColor"
                                  strokeWidth="15"
                                  className="text-slate-100 dark:text-slate-800"
                                />

                                {displayProducts.map((p) => {
                                  const slicePct = (p.count / totalCount) * 100;
                                  if (slicePct <= 0) return null;
                                  const strokeDash = `${(slicePct / 100) * C} ${C}`;
                                  const strokeOff = -((accumPct / 100) * C);
                                  accumPct += slicePct;
                                  const isHov = hoveredCommodity === p.product;
                                  const color = p.color || '#94a3b8';

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

                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-3">
                                {hoveredItem ? (
                                  <>
                                    <span className="text-2xl select-none mb-0.5">{hoveredSpec.icon || '📦'}</span>
                                    <span className="text-xs font-black text-slate-900 dark:text-white capitalize truncate max-w-[120px]">
                                      {hoveredSpec.label || hoveredItem.product}
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                      {hoveredItem.count} Leads ({hoveredItem.pct}%)
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                      {metrics.totalVolumeMT.toFixed(1)} MT
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                      Total Cargo Volume
                                    </span>
                                    <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                                      {displayProducts.length} Commodities
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            {displayProducts.map((p) => {
                              const lower = p.product.toLowerCase();
                              const spec = COMMODITY_SPECS[lower] || { icon: '📦', label: p.product };
                              const isHov = hoveredCommodity === p.product;

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
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {spec.icon} {spec.label}
                                      </span>
                                    </div>
                                    <span className="text-xs font-black text-slate-900 dark:text-white shrink-0">
                                      {p.pct}%
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                    <span>{p.count} Leads</span>
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
                          const lower = p.product.toLowerCase();
                          const spec = COMMODITY_SPECS[lower] || { icon: '📦', label: p.product, grad: 'from-amber-500 to-yellow-500' };
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
                                  <div>
                                    <span className="font-extrabold text-slate-900 dark:text-white">{p.count}</span>{' '}
                                    <span className="text-slate-400 font-medium">({p.pct}%)</span>
                                  </div>
                                </div>
                              </div>

                              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${spec.grad || 'from-amber-500 to-yellow-500'} transition-all duration-500 shadow-xs`}
                                  style={{ width: `${Math.max(p.pct * 1.5, 4)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* LEADS BY COUNTRY */}
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
                        <span>Donut</span>
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
                        <span>Bars</span>
                      </button>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-rose-50 to-indigo-50 dark:from-rose-950/60 dark:to-indigo-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                      {displayCountries.length} Countries
                    </span>
                  </div>
                </div>

                {displayCountries.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No export country data recorded yet.
                  </div>
                ) : (
                  (() => {
                    const countryColors = {
                      'Bangladesh': '#f43f5e',
                      'Nepal': '#ec4899',
                      'Vietnam': '#8b5cf6',
                      'Malaysia': '#3b82f6',
                      'Australia': '#2563eb',
                      'Global': '#64748b',
                      'India': '#f97316',
                      'Russia': '#a855f7',
                      'Indonesia': '#fb7185',
                      'Saudi Arabia': '#06b6d4',
                      'United Arab Emirates': '#059669',
                      'Greece': '#38bdf8'
                    };

                    const totalCount = displayCountries.reduce((sum, c) => sum + c.count, 0) || 1;
                    const C = 2 * Math.PI * 64;
                    let accumPct = 0;

                    if (countryChartMode === 'donut') {
                      const hoveredItem = hoveredCountry
                        ? displayCountries.find((c) => c.country === hoveredCountry)
                        : null;
                      const hoveredMeta = hoveredItem ? (COUNTRY_METADATA[hoveredItem.country] || {}) : null;

                      return (
                        <div className="space-y-4">
                          <div className="flex flex-col items-center justify-center pt-2">
                            <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
                              <svg viewBox="0 0 170 170" className="w-full h-full transform -rotate-90 select-none">
                                <circle
                                  cx="85"
                                  cy="85"
                                  r="64"
                                  fill="transparent"
                                  stroke="currentColor"
                                  strokeWidth="15"
                                  className="text-slate-100 dark:text-slate-800"
                                />

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
                                      Export Markets
                                    </span>
                                    <span className="text-[10px] font-black bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-500 bg-clip-text text-transparent mt-0.5">
                                      100% Export Desk
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

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
                  })()
                )}
              </div>
            </div>
          </div>

          {/* 4. SALES REPRESENTATIVES PERFORMANCE & ORDER BOOK */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck size={19} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Sales Representative Order Book & Performance</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Portfolio value handled (₹ Lakhs & Cr) and assigned inquiries by team member
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
                    <span>Chart</span>
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
                    <span>Cards</span>
                  </button>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  {metrics.teamWorkload.length} Active Representatives
                </span>
              </div>
            </div>

            {metrics.teamWorkload.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No representative activity recorded yet.
              </div>
            ) : repViewMode === 'chart' ? (
              <div className="space-y-5">
                <div className="relative pt-2 pb-1 overflow-x-auto">
                  <div className="min-w-[600px]">
                    <svg viewBox="0 0 880 280" className="w-full h-auto select-none overflow-visible">
                      <defs>
                        <linearGradient id="rep-pipe-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#4338ca" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      {[
                        { y: 35, label: 'High' },
                        { y: 100, label: 'Mid' },
                        { y: 165, label: 'Low' },
                        { y: 220, label: '0' },
                      ].map((grid) => (
                        <g key={grid.label}>
                          <line
                            x1="65"
                            y1={grid.y}
                            x2="840"
                            y2={grid.y}
                            stroke="currentColor"
                            strokeDasharray={grid.y === 220 ? 'none' : '3 3'}
                            strokeWidth={grid.y === 220 ? '1.5' : '1'}
                            className={grid.y === 220 ? 'text-slate-300 dark:text-slate-700' : 'text-slate-100 dark:text-slate-800'}
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

                      {/* Team Member Bars */}
                      {metrics.teamWorkload.map((member, idx) => {
                        const maxVal = Math.max(...metrics.teamWorkload.map((m) => m.totalValLakhs), 1);
                        const cX = 140 + idx * Math.min(680 / Math.max(metrics.teamWorkload.length, 1), 160);
                        const plotHeight = 180;
                        const pipeH = Math.max(Math.min((member.totalValLakhs / maxVal) * plotHeight, plotHeight), 12);
                        const pipeY = 220 - pipeH;
                        const isHovered = hoveredRep === member.name;

                        return (
                          <g
                            key={member.name}
                            className="cursor-pointer transition-all duration-200"
                            onMouseEnter={() => setHoveredRep(member.name)}
                            onMouseLeave={() => setHoveredRep(null)}
                          >
                            <rect
                              x={cX - 25}
                              y={pipeY}
                              width={50}
                              height={pipeH}
                              rx="6"
                              fill="url(#rep-pipe-grad)"
                              className="transition-all duration-300"
                            />

                            <text
                              x={cX}
                              y={pipeY - 6}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="800"
                              className="fill-indigo-600 dark:fill-indigo-400"
                            >
                              {formatLakhs(member.totalValLakhs)}
                            </text>

                            <circle
                              cx={cX}
                              cy={244}
                              r={12}
                              fill={isHovered ? '#4f46e5' : '#1e293b'}
                              className="transition-colors duration-200"
                            />
                            <text
                              x={cX}
                              y={248}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="9"
                              fontWeight="800"
                              className="pointer-events-none"
                            >
                              {member.avatar}
                            </text>

                            <text
                              x={cX}
                              y={268}
                              textAnchor="middle"
                              fontSize="11"
                              fontWeight={isHovered ? '800' : '700'}
                              className={`transition-colors duration-200 ${
                                isHovered ? 'fill-indigo-600 dark:fill-indigo-400' : 'fill-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {member.name}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-400">
                    <span className="w-3 h-3 rounded-sm bg-indigo-600 shadow-2xs" />
                    <span>Portfolio Order Book (₹ Lakhs)</span>
                  </div>

                  <div className="text-[11px] font-extrabold text-slate-400">
                    Total Desk Order Book: <span className="text-slate-900 dark:text-white">{formatLakhs(metrics.totalOrderValueLakhs)}</span>
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
                          {formatLakhs(member.totalValLakhs)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-2.5 p-2 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700/70 text-[10px]">
                      <div>
                        <span className="text-slate-400 block">Active Pipeline:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatLakhs(member.pipeValLakhs)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block">Avg Deal:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatLakhs(member.avgDealLakhs)}</span>
                      </div>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${member.color} transition-all duration-500`}
                        style={{ width: `${Math.max(member.pct * 4, 12)}%` }}
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
