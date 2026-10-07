import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { SEED_LEADS } from '../data/seedLeads';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Building2,
  User,
  Globe,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Ship,
  FileText,
  CheckCircle2,
  Clock,
  ChevronDown,
  Eye,
  X,
  Layers,
  MapPin,
  TrendingUp,
  AlertCircle,
  Download,
  Upload,
  FileSpreadsheet,
  Share2,
  Factory,
  Sparkles,
  Tag,
  Paperclip,
  MessageSquare,
  Send,
  History,
  CalendarDays,
  Lock,
  Loader2
} from 'lucide-react';

export const AVAILABLE_ACTIVITIES = [
  'Call initiated',
  'Email',
  'WhatsApp text/Zalo',
  'Response',
  'Meeting',
  'Price discussion',
  'Payment discussion',
  'Sample discussion',
  'Sample sent',
  'Negotiation',
  'Sent quotations',
  'Email reply',
  'Follow up calls'
];

export const SOCIAL_PLATFORMS = [
  { id: 'LinkedIn', label: 'LinkedIn', icon: '💼', placeholder: 'https://linkedin.com/in/... or company profile' },
  { id: 'Instagram', label: 'Instagram', icon: '📸', placeholder: 'https://instagram.com/company_handle' },
  { id: 'Twitter', label: 'Twitter / X', icon: '🐦', placeholder: 'https://x.com/handle' },
  { id: 'Facebook', label: 'Facebook', icon: '📘', placeholder: 'https://facebook.com/page' },
  { id: 'WeChat', label: 'WeChat', icon: '💬', placeholder: 'WeChat ID or phone' },
  { id: 'WhatsApp', label: 'WhatsApp', icon: '📱', placeholder: '+971 50 123 4567' },
  { id: 'Telegram', label: 'Telegram', icon: '✈️', placeholder: 'https://t.me/channel' },
  { id: 'YouTube', label: 'YouTube', icon: '🎥', placeholder: 'https://youtube.com/@channel' },
  { id: 'Website', label: 'Website / Other', icon: '🌐', placeholder: 'https://...' },
];

// Comprehensive Countries with Flags — Alphabetically Sorted A to Z
export const COUNTRIES_WITH_FLAGS = [
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
].sort((a, b) => a.name.localeCompare(b.name));

export const COMMODITY_PRODUCTS = [
  'Turmeric',
  'Tender Coconut',
  'Red Chilli',
  'Ginger',
  'Maize',
  'Rice DDGS',
  'Corn DDGS',
  'DORB',
  'RSM',
  'Soya seed',
  'Jowar',
];

export const PIPELINE_STAGES = [
  'Lead Generation',
  'Contact Established',
  'Requirement Understood',
  'Sample Sent',
  'Quotation Sent',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
];

export const LEAD_SOURCES = [
  'Direct Inquiry',
  'Gulfood Trade Show',
  'LinkedIn Inbound',
  'B2B Trade Portal',
  'Referral',
  'Cold Outreach',
  'Website Form',
  'Embassy / Trade Council',
];

export const CREDIT_RATINGS = ['AAA', 'AA+', 'AA', 'A', 'BBB', 'BB', 'Not Rated'];
export const INCOTERMS = ['FOB', 'CIF', 'CFR', 'EXW', 'FCA', 'CIP', 'DDP', 'DAP', 'DPU'];
export const PAYMENT_TERMS = [
  'LC at Sight (Letter of Credit)',
  'LC 30 Days',
  'LC 60 Days',
  'LC 90 Days',
  'CAD (Cash Against Documents)',
  'CAD on BL copy',
  'TT Advance (100% Wire Transfer)',
  'TT 30% Advance + 70% on BL',
  'TT 50% Advance + 50% on BL',
  'Open Account 30 Days',
  'Open Account 60 Days',
  'Irrevocable LC at Sight',
  'Standby LC',
  'Bank Guarantee',
  'DP (Documents against Payment)',
  'DA (Documents against Acceptance)',
];
export const INDUSTRY_TYPES = [
  'Food & Spice Processing',
  'Animal Feed & Poultry',
  'Distilleries & Biofuel',
  'Fresh Produce & Beverages',
  'Pharmaceuticals & Nutraceuticals',
  'Wholesale Commodity Trade',
];
export const MATERIAL_TYPES = [
  'Whole Raw',
  'Powder / Ground',
  'Flakes / Splits',
  'Mash / Meal',
  'Pellets',
  'De-oiled Cake',
  'Fresh Whole Diamonds Cut',
];
export const POLISH_LEVELS = [
  'Double Polish',
  'Single Polish',
  'Unpolished / Rough',
  'Sortex Cleaned',
  'Machine Cleaned',
];
export const CULTIVATION_METHODS = [
  'Conventional Cleaned',
  'Organic Certified',
  'GAP Certified (Good Agricultural Practices)',
  'Natural Sun-Dried Plantation',
];

export const INITIAL_LEADS = SEED_LEADS;
const _OLD_LEADS_UNUSED = [
  {
    id: 'lead_1',
    name: 'Al-Barakah Global Agro Foods LLC',
    company_name: 'Al-Barakah Global Agro Foods LLC',
    type: 'Export',
    contacts: [
      {
        name: 'Tariq Mansoor',
        phone: '+971 50 892 4110',
        extra_phones: ['+971 4 332 8900'],
        email: 'tmansoor@albarakahagro.ae',
        designation: 'VP Procurement & Sourcing',
        linkedin: 'https://linkedin.com/in/tariq-mansoor-agro',
      },
    ],
    contact_person: 'Tariq Mansoor',
    email: 'tmansoor@albarakahagro.ae',
    phone: '+971 50 892 4110',
    whatsapp: '+971 50 892 4110',
    website: 'https://albarakahagro.ae',
    country: 'United Arab Emirates 🇦🇪',
    source: 'Gulfood Trade Show',
    address: 'Warehouse #14, Al Quoz Industrial Area 3, Dubai, UAE',
    credit_rating: 'AAA',
    turnover: '120 cr',
    sourcing_region: 'Nizamabad & Salem, India',
    legacy_industry_type: 'Spice Milling & Wholesale Distribution',
    products: ['Turmeric', 'Ginger'],
    product: 'Turmeric, Ginger',
    quantity: 50000,
    price: 84000,
    value: 84000,
    stage: 'Quotation Sent',
    priority: 'High',
    export_requirements: {
      industry_type: 'Food & Spice Processing',
      material_type: 'Whole Raw',
      polish_level: 'Double Polish',
      min_curcumin: '3.5%',
      cultivation_method: 'Conventional Cleaned',
      preferred_origin: 'Nizamabad / Salem',
      quantity_needed_kg: 50000,
      max_price_inr: 145,
      incoterm: 'CIF',
      port_delivery: 'Jebel Ali Port, Dubai',
      payment_days: 'CAD (Cash Against Documents via Bank)',
    },
    assigned_to: 'usr_athish',
    agent_name: 'Athish',
    follow_up_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    notes: 'Requested certificate of analysis for curcumin content min 3.5%. Samples dispatched via DHL.',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'lead_2',
    name: 'VietSpices Import & Distribution Co.',
    company_name: 'VietSpices Import & Distribution Co.',
    type: 'Export',
    contacts: [
      {
        name: 'Nguyen Van Minh',
        phone: '+84 90 345 6789',
        extra_phones: [],
        email: 'minh.nguyen@vietspices.vn',
        designation: 'General Manager',
        linkedin: 'https://linkedin.com/in/nguyen-minh-spices',
      },
    ],
    contact_person: 'Nguyen Van Minh',
    email: 'minh.nguyen@vietspices.vn',
    phone: '+84 90 345 6789',
    whatsapp: '+84 90 345 6789',
    website: 'https://vietspices.vn',
    country: 'Vietnam 🇻🇳',
    source: 'Direct Inquiry',
    address: 'District 7, Ho Chi Minh City, Vietnam',
    credit_rating: 'AA+',
    turnover: '65 cr',
    sourcing_region: 'Guntur, Andhra Pradesh',
    legacy_industry_type: 'Agro Commodity Trading',
    products: ['Red Chilli', 'Turmeric'],
    product: 'Red Chilli, Turmeric',
    quantity: 36000,
    price: 68500,
    value: 68500,
    stage: 'Requirement Understood',
    priority: 'High',
    export_requirements: {
      industry_type: 'Food & Spice Processing',
      material_type: 'Whole Raw Stemless',
      polish_level: 'Sortex Cleaned',
      min_curcumin: '3.0%',
      cultivation_method: 'Conventional Cleaned',
      preferred_origin: 'Guntur Sannam S4 / Teja',
      quantity_needed_kg: 36000,
      max_price_inr: 160,
      incoterm: 'FOB',
      port_delivery: 'Chennai Port / Nhava Sheva',
      payment_days: '100% LC at Sight',
    },
    assigned_to: 'usr_athish',
    agent_name: 'Athish',
    follow_up_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    notes: 'Looking for 2x40ft containers of Teja Red Chilli stemless. Awaiting lab moisture test report.',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'lead_3',
    name: 'Continental Feeds & Bio-Nutrition BV',
    company_name: 'Continental Feeds & Bio-Nutrition BV',
    type: 'Export',
    contacts: [
      {
        name: 'Hendrik Van Dijk',
        phone: '+31 10 789 2200',
        extra_phones: ['+31 6 5432 1980'],
        email: 'h.vandijk@continentalfeeds.nl',
        designation: 'Head of Feed Ingredients',
        linkedin: 'https://linkedin.com/in/hendrik-vandijk',
      },
    ],
    contact_person: 'Hendrik Van Dijk',
    email: 'h.vandijk@continentalfeeds.nl',
    phone: '+31 10 789 2200',
    whatsapp: '+31 6 5432 1980',
    website: 'https://continentalfeeds.nl',
    country: 'Netherlands 🇳🇱',
    source: 'B2B Trade Portal',
    address: 'Haven 420, Port of Rotterdam, Netherlands',
    credit_rating: 'AAA',
    turnover: '350 cr',
    sourcing_region: 'Punjab & Haryana, India',
    legacy_industry_type: 'Animal Feed & Biofuel Ingredients',
    products: ['Rice DDGS', 'DORB', 'Corn DDGS'],
    product: 'Rice DDGS, DORB, Corn DDGS',
    quantity: 120000,
    price: 142000,
    value: 142000,
    stage: 'Negotiation',
    priority: 'High',
    export_requirements: {
      industry_type: 'Animal Feed & Poultry',
      material_type: 'Pellets',
      polish_level: 'Machine Cleaned',
      min_curcumin: 'N/A',
      cultivation_method: 'Conventional Cleaned',
      preferred_origin: 'North India Grain Distilleries',
      quantity_needed_kg: 120000,
      max_price_inr: 28,
      incoterm: 'CIF',
      port_delivery: 'Port of Rotterdam',
      payment_days: 'CAD on arrival of vessel',
    },
    assigned_to: 'usr_athish',
    agent_name: 'Athish',
    follow_up_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
    notes: 'High protein content (min 45% profat) required. Ocean freight rates confirmed from Mundra Port.',
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: 'lead_4',
    name: 'Dhaka Agro Feeds & Poultry Ltd',
    company_name: 'Dhaka Agro Feeds & Poultry Ltd',
    type: 'Export',
    contacts: [
      {
        name: 'Kamal Hossain',
        phone: '+880 17 1234 5678',
        extra_phones: [],
        email: 'kamal@dhakafeed.com.bd',
        designation: 'Managing Director',
        linkedin: '',
      },
    ],
    contact_person: 'Kamal Hossain',
    email: 'kamal@dhakafeed.com.bd',
    phone: '+880 17 1234 5678',
    whatsapp: '+880 17 1234 5678',
    website: 'https://dhakafeed.com.bd',
    country: 'Bangladesh 🇧🇩',
    source: 'Direct Inquiry',
    address: 'Tejgaon Industrial Area, Dhaka, Bangladesh',
    credit_rating: 'AA',
    turnover: '80 cr',
    sourcing_region: 'West Bengal & Bihar border',
    legacy_industry_type: 'Feed Milling & Agro Processing',
    products: ['Maize', 'RSM', 'Soya seed'],
    product: 'Maize, RSM, Soya seed',
    quantity: 85000,
    price: 76000,
    value: 76000,
    stage: 'Closed Won',
    priority: 'High',
    export_requirements: {
      industry_type: 'Animal Feed & Poultry',
      material_type: 'Whole Raw',
      polish_level: 'Machine Cleaned',
      min_curcumin: 'N/A',
      cultivation_method: 'Conventional Cleaned',
      preferred_origin: 'Bihar / MP',
      quantity_needed_kg: 85000,
      max_price_inr: 24,
      incoterm: 'CFR',
      port_delivery: 'Chittagong Port / Petrapole Border',
      payment_days: 'Irrevocable LC at Sight',
    },
    assigned_to: 'usr_athish',
    agent_name: 'Athish',
    follow_up_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    notes: 'Initial 3 rake consignment completed. Repeat order contract for Q3 under preparation.',
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
  {
    id: 'lead_5',
    name: 'Ceylon Tropical Goods PLC',
    company_name: 'Ceylon Tropical Goods PLC',
    type: 'Export',
    contacts: [
      {
        name: 'Rohan Jayasuriya',
        phone: '+94 11 234 5678',
        extra_phones: [],
        email: 'rohan@ceylontropical.lk',
        designation: 'Director of Imports',
        linkedin: '',
      },
    ],
    contact_person: 'Rohan Jayasuriya',
    email: 'rohan@ceylontropical.lk',
    phone: '+94 11 234 5678',
    whatsapp: '+94 77 123 4567',
    website: 'https://ceylontropical.lk',
    country: 'Sri Lanka 🇱🇰',
    source: 'Referral',
    address: 'Colombo Harbour Area, Sri Lanka',
    credit_rating: 'A',
    turnover: '30 cr',
    sourcing_region: 'Pollachi & Karnataka, India',
    legacy_industry_type: 'Fresh Produce & Beverage Bottling',
    products: ['Tender Coconut', 'Ginger'],
    product: 'Tender Coconut, Ginger',
    quantity: 25000,
    price: 32000,
    value: 32000,
    stage: 'Requirement Understood',
    priority: 'Medium',
    export_requirements: {
      industry_type: 'Fresh Produce & Beverages',
      material_type: 'Fresh Whole Diamonds Cut',
      polish_level: 'Sortex Cleaned',
      min_curcumin: 'N/A',
      cultivation_method: 'Natural Sun-Dried Plantation',
      preferred_origin: 'Pollachi, Tamil Nadu',
      quantity_needed_kg: 25000,
      max_price_inr: 45,
      incoterm: 'CIF',
      port_delivery: 'Colombo Port',
      payment_days: '30% Advance, 70% on BL copy',
    },
    assigned_to: 'usr_athish',
    agent_name: 'Athish',
    follow_up_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
    notes: 'Reefer container logistics quote obtained from Tuticorin Port. Schedule call tomorrow.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

const getStatusBadge = (status) => {
  switch (status) {
    case 'Lead Generation':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Contact Established':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Requirement Understood':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Sample Sent':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Quotation Sent':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Negotiation':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Closed Won':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Closed Lost':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

// Follow-up health status for lead rows
// Active: follow_up_date is today or future
// Missed: 1-2 days overdue
// Idle:   2-5 days overdue
// Risk:   5+ days overdue
const getFollowUpHealth = (followUpDate) => {
  if (!followUpDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(followUpDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - due) / 86400000);
  if (diffDays <= 0) return { label: 'Active',  cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  if (diffDays <= 2) return { label: 'Missed',  cls: 'bg-amber-100 text-amber-800 border-amber-300' };
  if (diffDays <= 5) return { label: 'Idle',    cls: 'bg-orange-100 text-orange-800 border-orange-300' };
  return                      { label: 'Risk',    cls: 'bg-rose-100 text-rose-800 border-rose-300' };
};

// Searchable Country Dropdown Component (A to Z with instant search)
function SearchableCountrySelect({ value, onChange, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return COUNTRIES_WITH_FLAGS;
    const q = search.toLowerCase().trim();
    return COUNTRIES_WITH_FLAGS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedObj = COUNTRIES_WITH_FLAGS.find(
    (c) => value && (value.includes(c.name) || value === c.name || value === `${c.name} ${c.flag}`)
  );

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none flex items-center justify-between text-left cursor-pointer transition-colors shadow-2xs"
      >
        <span className="flex items-center gap-2 truncate">
          {selectedObj ? (
            <>
              <span className="text-sm leading-none">{selectedObj.flag}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedObj.name}</span>
            </>
          ) : (
            <span className="text-slate-600 dark:text-slate-300 font-medium">{value || 'Select Country (A-Z)'}</span>
          )}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-100">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country (A-Z)..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/40">
            {filteredCountries.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">No matching country found</div>
            ) : (
              filteredCountries.map((c) => (
                <button
                  type="button"
                  key={c.code}
                  onClick={() => {
                    onChange(`${c.name} ${c.flag}`);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm leading-none">{c.flag}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{c.code}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Leads() {
  const { profile, isOwner, isStaff, getTeamMembers } = useAuth();
  const [leads, setLeads] = useState(INITIAL_LEADS);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeDetailLead, setActiveDetailLead] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [teamList, setTeamList] = useState([]);
  const [filterStaff, setFilterStaff] = useState('');

  // Form Tab & Modal Polish
  const [activeFormTab, setActiveFormTab] = useState('basic'); // 'basic' | 'contact' | 'deal' | 'export'

  // Bulk Import / Export state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  // Toast notification
  const [notification, setNotification] = useState(null);
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // Filter Bar state
  const [filterType, setFilterType] = useState('created'); // 'created' | 'followup'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Dynamic Commodity options state (user can add & remove products)
  const [allCommodityOptions, setAllCommodityOptions] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_user_commodities');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return COMMODITY_PRODUCTS;
  });
  const [showCustomProductInput, setShowCustomProductInput] = useState(false);
  const [customProductText, setCustomProductText] = useState('');

  // Dynamic Industry options state (user can add custom industries)
  const [allIndustryOptions, setAllIndustryOptions] = useState(INDUSTRY_TYPES);
  const [showCustomIndustryInput, setShowCustomIndustryInput] = useState(false);
  const [customIndustryText, setCustomIndustryText] = useState('');

  // Dynamic Payment Terms options state (user can add custom payment terms)
  const [allPaymentTerms, setAllPaymentTerms] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_user_payment_terms');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return PAYMENT_TERMS;
  });
  const [showCustomPaymentInput, setShowCustomPaymentInput] = useState(false);
  const [customPaymentText, setCustomPaymentText] = useState('');

  // Dynamic Incoterms / Shipping terms options state
  const [allIncoterms, setAllIncoterms] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_user_incoterms');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INCOTERMS;
  });
  const [showCustomIncotermInput, setShowCustomIncotermInput] = useState(false);
  const [customIncotermText, setCustomIncotermText] = useState('');

  // Lead Form Initial State matching user requirements
  const defaultContact = {
    name: '',
    phone: '',
    extra_phones: [],
    email: '',
    designation: '',
    linkedin: '',
  };

  const initForm = {
    type: 'International', // Type * — International or Domestic
    company_name: '', // Company name *
    industry_type: 'Food & Spice Processing', // Explicit industry type
    contacts: [{ ...defaultContact }], // Contact 1, 2, ...
    whatsapp: '',
    website: '',
    social_media: '',
    social_links: [
      { platform: 'LinkedIn', url: '' },
      { platform: 'Instagram', url: '' }
    ],
    country: 'United Arab Emirates 🇦🇪',
    lead_source: 'Direct Inquiry',
    address: '',
    credit_rating: 'AA',
    turnover: '',
    stage: 'Requirement Understood',
    // Product
    products: [], // Empty array by default
    quantity: 0,
    price: 0, // Price ($)
    product_notes: '',
    // Trade & Shipping terms
    incoterm: 'CIF',
    port_delivery: '',
    payment_days: 'LC at Sight (Letter of Credit)',
    // Assignment & Creator Info (Requirement 4 & 6)
    assigned_to: isStaff ? (profile?.id || 'staff') : 'usr_athish',
    agent_name: isStaff ? (profile?.name || 'Staff Member') : 'Athish',
    created_by_id: profile?.id || 'usr_staff_creator',
    created_by_name: profile?.name || profile?.full_name || 'Deepak',
    created_at: new Date().toISOString(),
    follow_up_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    today_remarks: '',
    next_follow_up_action: '',
    notes: '',
  };

  const [form, setForm] = useState(initForm);

  // Lead Dossier interactive activity, follow-up remark, & document state
  const [dossierActivityType, setDossierActivityType] = useState('Call initiated');
  const [dossierActivityNote, setDossierActivityNote] = useState('');
  const [dossierFollowUpDate, setDossierFollowUpDate] = useState('');
  const [dossierTodayRemark, setDossierTodayRemark] = useState('');
  const [dossierFutureAction, setDossierFutureAction] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Persistence helper: saves to React state and localStorage
  const updateAndPersistLeads = (updater) => {
    setLeads((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem('oneroot_leads_v3', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const loadLeads = async () => {
    try {
      setLoading(true);
      // 1. Check local storage for user leads and filter out legacy dummy leads
      let localData = [];
      try {
        const stored = localStorage.getItem('oneroot_leads_v3');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            localData = parsed.filter(
              (l) =>
                !l.id?.startsWith('lead_') &&
                l.company_name !== 'Gk Optotorg LLC' &&
                l.company_name !== 'Baltimport LLC' &&
                l.company_name !== 'Al-Barakah Global Agro Foods LLC'
            );
          }
        }
      } catch (e) {
        console.warn('Error reading local leads:', e);
      }

      // 2. Fetch fresh real leads from remote API
      try {
        const res = await api.getLeads();
        if (res && res.success && Array.isArray(res.data)) {
          setLeads(res.data);
          try {
            localStorage.setItem('oneroot_leads_v3', JSON.stringify(res.data));
          } catch (e) {}
          return;
        }
      } catch (apiErr) {
        // API offline or error, use clean localData
      }

      setLeads(localData);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  // Load from LocalStorage and API on mount
  useEffect(() => {
    loadLeads();
    if (isOwner && getTeamMembers) {
      getTeamMembers().then((res) => {
        if (Array.isArray(res) && res.length > 0) setTeamList(res);
      }).catch(() => {});
    }
  }, [profile?.id, isOwner]);

  // Dossier Action Handlers
  const handleLogDossierActivity = () => {
    if (!activeDetailLead || !dossierActivityType) return;
    const newEntry = {
      activity: dossierActivityType,
      note: dossierActivityNote.trim() || 'Activity logged',
      date: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      author: `by ${profile?.name || 'adric'}`,
    };

    const updatedHistory = [newEntry, ...(activeDetailLead.activity_history || [])];
    const updatedLead = {
      ...activeDetailLead,
      activity_history: updatedHistory,
      notes: dossierActivityNote.trim() || activeDetailLead.notes,
    };

    setActiveDetailLead(updatedLead);
    setDossierActivityNote('');
    updateAndPersistLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
    );
    showNotification(`Activity "${dossierActivityType}" logged successfully!`, 'success');
  };

  const handleSaveDossierFollowUp = async () => {
    if (!activeDetailLead) return;
    const dateToSave = dossierFollowUpDate || activeDetailLead.follow_up_date;
    if (!dateToSave) {
      showNotification('Follow-up date is mandatory! Please select a follow-up date.', 'error');
      return;
    }
    if (!dossierTodayRemark.trim() && !dossierFutureAction.trim()) {
      showNotification("Please enter today's interaction remarks or planned action for next follow-up.", 'error');
      return;
    }

    const formattedNow = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newRemarkEntry = {
      today_remark: dossierTodayRemark.trim(),
      planned_action: dossierFutureAction.trim(),
      remark: [
        dossierTodayRemark.trim() ? `Interaction: ${dossierTodayRemark.trim()}` : null,
        dossierFutureAction.trim() ? `Planned for ${dateToSave}: ${dossierFutureAction.trim()}` : null,
      ].filter(Boolean).join(' | '),
      follow_up_date: dateToSave,
      date: formattedNow,
      author: profile?.name || 'User',
    };

    const updatedRemarks = [
      newRemarkEntry,
      ...(activeDetailLead.previous_remarks || []),
    ];

    const compositeNotes = [
      dossierTodayRemark.trim() ? `[Today's Interaction - ${formattedNow}]: ${dossierTodayRemark.trim()}` : null,
      dossierFutureAction.trim() ? `[Planned Action on ${dateToSave}]: ${dossierFutureAction.trim()}` : null,
      activeDetailLead.notes || '',
    ].filter(Boolean).join('\n\n');

    const updatedLead = {
      ...activeDetailLead,
      follow_up_date: dateToSave,
      today_remarks: dossierTodayRemark.trim() || activeDetailLead.today_remarks || '',
      next_follow_up_action: dossierFutureAction.trim() || activeDetailLead.next_follow_up_action || '',
      notes: compositeNotes,
      previous_remarks: updatedRemarks,
    };

    setActiveDetailLead(updatedLead);
    setDossierTodayRemark('');
    setDossierFutureAction('');

    updateAndPersistLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
    );

    try {
      await api.updateLead(updatedLead.id, {
        follow_up_date: dateToSave,
        today_remarks: updatedLead.today_remarks,
        next_follow_up_action: updatedLead.next_follow_up_action,
        notes: compositeNotes,
        previous_remarks: updatedRemarks,
      });
    } catch (apiErr) {
      console.warn('API update follow-up error:', apiErr);
    }

    showNotification('Follow-up schedule and remarks saved successfully!', 'success');
  };

  const handleUploadDossierDoc = (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeDetailLead) return;
    setIsUploadingDoc(true);
    setTimeout(() => {
      const newDoc = {
        id: 'doc_' + Date.now(),
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        upload_date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
      const updatedLead = {
        ...activeDetailLead,
        documents: [newDoc, ...(activeDetailLead.documents || [])],
      };
      setActiveDetailLead(updatedLead);
      updateAndPersistLeads((prev) =>
        prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
      );
      setIsUploadingDoc(false);
      showNotification(`Document "${file.name}" uploaded successfully!`, 'success');
    }, 400);
  };

  const handleDeleteDossierDoc = (docId) => {
    if (!activeDetailLead) return;
    const updatedLead = {
      ...activeDetailLead,
      documents: (activeDetailLead.documents || []).filter((d) => d.id !== docId),
    };
    setActiveDetailLead(updatedLead);
    updateAndPersistLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
    );
    showNotification('Document removed.', 'success');
  };

  // Contact person dynamic helpers
  const handleContactChange = (index, field, value) => {
    const updated = [...form.contacts];
    updated[index][field] = value;
    setForm({ ...form, contacts: updated });
  };

  const addExtraPhone = (contactIndex) => {
    const updated = [...form.contacts];
    updated[contactIndex].extra_phones.push('');
    setForm({ ...form, contacts: updated });
  };

  const handleExtraPhoneChange = (contactIndex, phoneIndex, value) => {
    const updated = [...form.contacts];
    updated[contactIndex].extra_phones[phoneIndex] = value;
    setForm({ ...form, contacts: updated });
  };

  const removeExtraPhone = (contactIndex, phoneIndex) => {
    const updated = [...form.contacts];
    updated[contactIndex].extra_phones.splice(phoneIndex, 1);
    setForm({ ...form, contacts: updated });
  };

  const addAnotherContact = () => {
    setForm({
      ...form,
      contacts: [...form.contacts, { ...defaultContact }],
    });
  };

  const removeContact = (index) => {
    if (form.contacts.length <= 1) return;
    const updated = [...form.contacts];
    updated.splice(index, 1);
    setForm({ ...form, contacts: updated });
  };

  const toggleProduct = (prod) => {
    const current = [...form.products];
    const idx = current.indexOf(prod);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(prod);
    }
    setForm({ ...form, products: current });
  };

  // Add custom commodity handler (Owner only)
  const handleAddCustomCommodity = () => {
    if (!isOwner) {
      showNotification('Permission Denied: Only Company Owners/Admins can add new commodities or products.', 'error');
      return;
    }
    const trimmed = customProductText.trim();
    if (!trimmed) return;
    let nextList = allCommodityOptions;
    if (!allCommodityOptions.includes(trimmed)) {
      nextList = [...allCommodityOptions, trimmed];
      setAllCommodityOptions(nextList);
      try { localStorage.setItem('crm_user_commodities', JSON.stringify(nextList)); } catch {}
    }
    if (!form.products.includes(trimmed)) {
      setForm((prev) => ({ ...prev, products: [...prev.products, trimmed] }));
    }
    setCustomProductText('');
    setShowCustomProductInput(false);
    showNotification(`Commodity "${trimmed}" added and selected!`, 'success');
  };

  // Remove commodity category handler
  const handleRemoveCommodity = (prodToRemove) => {
    if (allCommodityOptions.length <= 1) {
      showNotification('At least one commodity must remain in list', 'error');
      return;
    }
    const updated = allCommodityOptions.filter((p) => p !== prodToRemove);
    setAllCommodityOptions(updated);
    try { localStorage.setItem('crm_user_commodities', JSON.stringify(updated)); } catch {}
    if (form.products.includes(prodToRemove)) {
      setForm((prev) => ({ ...prev, products: prev.products.filter((p) => p !== prodToRemove) }));
    }
    showNotification(`Commodity "${prodToRemove}" removed from options.`, 'info');
  };

  // Add custom payment term handler - OWNER ONLY
  const handleAddCustomPaymentTerm = () => {
    if (!isOwner) {
      showNotification('Permission Denied: Only company owners can add new payment terms.', 'error');
      return;
    }
    const trimmed = customPaymentText.trim();
    if (!trimmed) return;
    let nextList = allPaymentTerms;
    if (!allPaymentTerms.includes(trimmed)) {
      nextList = [...allPaymentTerms, trimmed];
      setAllPaymentTerms(nextList);
      try { localStorage.setItem('crm_user_payment_terms', JSON.stringify(nextList)); } catch {}
    }
    setForm((prev) => ({ ...prev, payment_days: trimmed }));
    setCustomPaymentText('');
    setShowCustomPaymentInput(false);
    showNotification(`Payment term "${trimmed}" added and selected!`, 'success');
  };

  // Add custom shipping / incoterm handler
  const handleAddCustomIncoterm = () => {
    const trimmed = customIncotermText.trim();
    if (!trimmed) return;
    let nextList = allIncoterms;
    if (!allIncoterms.includes(trimmed)) {
      nextList = [...allIncoterms, trimmed];
      setAllIncoterms(nextList);
      try { localStorage.setItem('crm_user_incoterms', JSON.stringify(nextList)); } catch {}
    }
    setForm((prev) => ({ ...prev, incoterm: trimmed }));
    setCustomIncotermText('');
    setShowCustomIncotermInput(false);
    showNotification(`Shipping term "${trimmed}" added and selected!`, 'success');
  };

  // Add custom industry handler (Owner only)
  const handleAddCustomIndustry = () => {
    if (!isOwner) {
      showNotification('Permission Denied: Only Company Owners/Admins can add new industry types.', 'error');
      return;
    }
    const trimmed = customIndustryText.trim();
    if (!trimmed) return;
    if (!allIndustryOptions.includes(trimmed)) {
      setAllIndustryOptions((prev) => [...prev, trimmed]);
    }
    setForm((prev) => ({ ...prev, industry_type: trimmed }));
    setCustomIndustryText('');
    setShowCustomIndustryInput(false);
    showNotification(`Industry "${trimmed}" selected!`, 'success');
  };

  // Social link helpers
  const handleAddSocialLink = () => {
    setForm((prev) => ({
      ...prev,
      social_links: [...(prev.social_links || []), { platform: 'Instagram', url: '' }],
    }));
  };

  const handleUpdateSocialLink = (index, field, value) => {
    setForm((prev) => {
      const updated = [...(prev.social_links || [])];
      updated[index] = { ...updated[index], [field]: value };
      return {
        ...prev,
        social_links: updated,
        social_media: updated[0]?.url || prev.social_media,
      };
    });
  };

  const handleRemoveSocialLink = (index) => {
    setForm((prev) => {
      const updated = (prev.social_links || []).filter((_, i) => i !== index);
      return {
        ...prev,
        social_links: updated,
        social_media: updated[0]?.url || '',
      };
    });
  };

  // Quick Stage Update from Table or Card
  const handleQuickStageChange = async (leadId, newStage) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: newStage, status: newStage, lead_stage: newStage } : l))
    );
    try {
      await api.updateLead(leadId, { stage: newStage, lead_stage: newStage, status: newStage });
      showNotification(`Lead stage updated to "${newStage}"`, 'success');
    } catch (err) {
      console.warn('Failed to update stage on server:', err.message);
    }
  };

  // Open Create Modal
  const openCreate = () => {
    setIsSubmitting(false);
    setEditingLead(null);
    setActiveFormTab('basic');
    setShowCustomProductInput(false);
    setCustomProductText('');
    setShowCustomIndustryInput(false);
    setCustomIndustryText('');
    setShowCustomPaymentInput(false);
    setCustomPaymentText('');
    setForm({
      ...initForm,
      assigned_to: isStaff ? (profile?.id || 'usr_staff') : (teamList[0]?.id || 'usr_athish'),
      agent_name: isStaff ? (profile?.name || 'Staff Member') : (teamList[0]?.name || 'Athish'),
      follow_up_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      today_remarks: '',
      next_follow_up_action: '',
      notes: '',
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEdit = (lead) => {
    setIsSubmitting(false);
    if (isStaff) {
      const isMine =
        lead.assigned_to === profile?.id ||
        lead.assigned_to === profile?.name ||
        lead.agent_name === profile?.name ||
        lead.agent_id === profile?.id ||
        (profile?.name?.toLowerCase().includes('athish') && (lead.assigned_to === 'usr_athish' || lead.agent_name === 'Athish'));
      if (!isMine) {
        alert('Permission Denied: Staff members can only edit their own assigned leads.');
        return;
      }
    }

    setEditingLead(lead);
    setActiveFormTab('basic');
    setShowCustomProductInput(false);
    setCustomProductText('');
    setShowCustomIndustryInput(false);
    setCustomIndustryText('');
    setShowCustomPaymentInput(false);
    setCustomPaymentText('');

    const existingContacts = Array.isArray(lead.contacts) && lead.contacts.length > 0
      ? lead.contacts
      : [
          {
            name: lead.contact_person || '',
            phone: lead.phone || '',
            extra_phones: [],
            email: lead.email || '',
            designation: lead.designation || '',
            linkedin: lead.linkedin || '',
          },
        ];

    const leadProducts = Array.isArray(lead.products) && lead.products.length > 0
      ? lead.products
      : lead.product
      ? lead.product.split(',').map((p) => p.trim())
      : [];

    if (leadProducts.length > 0) {
      setAllCommodityOptions((prev) => Array.from(new Set([...prev, ...leadProducts])));
    }

    const leadIndustry = lead.industry_type || lead.export_requirements?.industry_type || lead.legacy_industry_type || 'Food & Spice Processing';
    if (leadIndustry && !allIndustryOptions.includes(leadIndustry)) {
      setAllIndustryOptions((prev) => Array.from(new Set([...prev, leadIndustry])));
    }

    const leadSocialLinks = Array.isArray(lead.social_links) && lead.social_links.length > 0
      ? lead.social_links
      : lead.social_media
      ? [{ platform: 'LinkedIn', url: lead.social_media }]
      : [{ platform: 'LinkedIn', url: lead.contacts?.[0]?.linkedin || '' }];

    const exp = lead.export_requirements || {};

    setForm({
      type: lead.type || 'International',
      company_name: lead.company_name || lead.name || '',
      industry_type: leadIndustry,
      contacts: existingContacts,
      whatsapp: lead.whatsapp || lead.phone || '',
      website: lead.website || '',
      social_media: lead.social_media || '',
      social_links: leadSocialLinks,
      country: lead.country || 'India 🇮🇳',
      lead_source: lead.source || 'Direct Inquiry',
      address: lead.address || '',
      credit_rating: lead.credit_rating || 'AA',
      turnover: lead.turnover || '',
      stage: lead.stage || lead.status || lead.lead_stage || 'Requirement Understood',
      products: leadProducts,
      quantity: lead.quantity || 0,
      price: lead.price || lead.value || 0,
      product_notes: exp.product_notes || lead.product_notes || '',
      incoterm: exp.incoterm || 'CIF',
      port_delivery: exp.port_delivery || '',
      payment_days: exp.payment_days || 'LC at Sight (Letter of Credit)',
      assigned_to: lead.assigned_to || (isStaff ? profile?.id : 'usr_athish'),
      agent_name: lead.agent_name || (isStaff ? profile?.name : 'Athish'),
      created_by_id: lead.created_by_id || 'usr_staff_creator',
      created_by_name: lead.created_by_name || lead.agent_name || 'Deepak',
      created_at: lead.created_at || new Date().toISOString(),
      follow_up_date: lead.follow_up_date || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      today_remarks: lead.today_remarks || lead.notes || '',
      next_follow_up_action: lead.next_follow_up_action || '',
      notes: lead.notes || '',
    });
    setModalOpen(true);
  };

  // Open Details Modal
  const openDetails = (lead) => {
    setActiveDetailLead(lead);
    setDossierFollowUpDate(lead.follow_up_date || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
    setDossierTodayRemark(lead.today_remarks || '');
    setDossierFutureAction(lead.next_follow_up_action || '');
    setDossierActivityNote('');
    setDossierActivityType(lead.activity_history?.[0]?.activity || 'Call initiated');
    setDetailModalOpen(true);
  };

  // Save Lead
  const handleSave = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submit
    if (!form.company_name.trim()) {
      alert('Company name is required');
      return;
    }
    if (!form.follow_up_date) {
      alert('Follow-up date is mandatory! Please select a next follow-up date.');
      return;
    }
    if (!form.today_remarks || !form.today_remarks.trim()) {
      alert("Today's Interaction / Discussion Remarks is mandatory! Please enter remarks.");
      return;
    }
    if (!form.next_follow_up_action || !form.next_follow_up_action.trim()) {
      alert("Planned Action for Next Follow-up Date is mandatory! Please enter next planned action.");
      return;
    }

    setIsSubmitting(true);
    try {
      const primary = form.contacts[0] || {};
      
      // Role-based assignment resolution
      let finalAssignedTo = form.assigned_to;
      let finalAgentName = form.agent_name;
      if (isStaff) {
        finalAssignedTo = profile?.id || 'staff';
        finalAgentName = profile?.name || 'Staff Member';
      } else {
        const matched = teamList.find((t) => t.id === form.assigned_to || t.name === form.assigned_to);
        if (matched) {
          finalAssignedTo = matched.id;
          finalAgentName = matched.name;
        }
      }

      // Preserve original creator info (Task 6): If Deepak created, creator remains Deepak even if assigned to Japneet!
      const originalCreatorName = editingLead
        ? (editingLead.created_by_name || form.created_by_name || 'Deepak')
        : (profile?.name || profile?.full_name || 'Deepak');
      const originalCreatorId = editingLead
        ? (editingLead.created_by_id || form.created_by_id || profile?.id)
        : (profile?.id || 'usr_staff_creator');
      const originalCreatedAt = editingLead
        ? (editingLead.created_at || form.created_at || new Date().toISOString())
        : new Date().toISOString();

      const leadPayload = {
        type: form.type,
        company_name: form.company_name,
        name: form.company_name,
        industry_type: form.industry_type,
        contacts: form.contacts,
        contact_person: primary.name,
        email: primary.email,
        phone: primary.phone,
        whatsapp: form.whatsapp,
        website: form.website,
        social_media: form.social_media || form.social_links?.[0]?.url || '',
        social_links: form.social_links || [],
        country: form.country,
        source: form.lead_source,
        address: form.address,
        credit_rating: form.credit_rating,
        turnover: form.turnover,
        sourcing_region: form.sourcing_region,
        legacy_industry_type: form.industry_type,
        products: form.products,
        product: form.products.join(', '),
        quantity: Number(form.quantity) || 0,
        price: Number(form.price) || 0,
        value: Number(form.price) || 0,
        stage: form.stage || (editingLead ? editingLead.stage : 'Requirement Understood'),
        status: form.stage || (editingLead ? editingLead.stage : 'Requirement Understood'),
        lead_stage: form.stage || (editingLead ? editingLead.stage : 'Requirement Understood'),
        export_requirements: {
          industry_type: form.industry_type,
          incoterm: form.incoterm,
          port_delivery: form.port_delivery,
          payment_days: form.payment_days,
          product_notes: form.product_notes,
        },
        assigned_to: finalAssignedTo,
        agent_name: finalAgentName,
        created_by_id: originalCreatorId,
        created_by_name: originalCreatorName,
        created_at: originalCreatedAt,
        follow_up_date: form.follow_up_date,
        today_remarks: form.today_remarks || '',
        next_follow_up_action: form.next_follow_up_action || '',
        previous_remarks: (form.today_remarks || form.next_follow_up_action)
          ? [
              {
                today_remark: form.today_remarks || '',
                planned_action: form.next_follow_up_action || '',
                remark: [
                  form.today_remarks ? `Interaction: ${form.today_remarks}` : null,
                  form.next_follow_up_action ? `Planned for ${form.follow_up_date}: ${form.next_follow_up_action}` : null,
                ].filter(Boolean).join(' | '),
                follow_up_date: form.follow_up_date,
                date: new Date().toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                author: profile?.name || 'User',
              },
              ...(editingLead?.previous_remarks || []),
            ]
          : (editingLead?.previous_remarks || []),
        notes: [
          form.today_remarks ? `[Today's Notes]: ${form.today_remarks}` : null,
          form.next_follow_up_action ? `[Planned Action on ${form.follow_up_date}]: ${form.next_follow_up_action}` : null,
          form.notes || null,
        ].filter(Boolean).join('\n') || form.notes || '',
      };

      if (editingLead) {
        try {
          await api.updateLead(editingLead.id, leadPayload);
        } catch (apiErr) {
          console.warn('API update failed, updating local state:', apiErr);
        }
        setLeads((prev) =>
          prev.map((l) => (l.id === editingLead.id ? { ...l, ...leadPayload } : l))
        );
        showNotification('Lead updated successfully!', 'success');
      } else {
        let created = null;
        try {
          const res = await api.createLead(leadPayload);
          if (res && res.data) created = res.data;
        } catch (apiErr) {
          console.warn('API create failed, falling back to local entry:', apiErr);
        }

        const newRecord = created || {
          ...leadPayload,
          id: 'lead_' + Date.now(),
          created_at: new Date().toISOString(),
        };
        // Avoid duplicate in local state if already present
        setLeads((prev) => {
          if (prev.some((l) => l.id === newRecord.id)) return prev;
          return [newRecord, ...prev];
        });
        showNotification('Trade lead created successfully!', 'success');
      }

      setModalOpen(false);
    } catch (err) {
      console.error('Error saving lead:', err);
      showNotification('Error saving lead. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Lead - Owner only
  const handleDelete = async (id) => {
    if (!isOwner) {
      alert('Permission Denied: Only Company Owners can delete trade leads.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this export trade lead?')) {
      try {
        await api.deleteLead(id);
      } catch {}
      setLeads((prev) => prev.filter((l) => l.id !== id));
      if (activeDetailLead?.id === id) setDetailModalOpen(false);
      showNotification('Trade lead deleted successfully.', 'success');
    }
  };

  // CSV Parser with quote-handling support
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) return [];

    const parseRow = (rowStr) => {
      const cells = [];
      let inQuotes = false;
      let currentCell = '';
      for (let i = 0; i < rowStr.length; i++) {
        const char = rowStr[i];
        if (char === '"' || char === "'") {
          if (inQuotes && rowStr[i + 1] === char) {
            currentCell += char;
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          cells.push(currentCell.trim());
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim());
      return cells;
    };

    const headers = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const parsedRows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseRow(lines[i]);
      if (values.length === 0 || values.every((v) => !v)) continue;

      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });
      parsedRows.push(rowObj);
    }

    return parsedRows;
  };

  // Export current leads as CSV (Company Owner Security Protection)
  const handleExportCSV = () => {
    if (!isOwner) {
      showNotification('Access Denied: Only Company Owner has authority to export lead data.', 'error');
      return;
    }
    const exportData = filteredLeads.length > 0 ? filteredLeads : leads;
    if (!exportData || exportData.length === 0) {
      showNotification('No leads to export', 'error');
      return;
    }

    const headers = [
      'Lead ID',
      'Company Name',
      'Type',
      'Country',
      'Contact Person',
      'Phone',
      'Email',
      'WhatsApp',
      'Website',
      'Products',
      'Quantity (kg)',
      'Deal Value (USD)',
      'Stage',
      'Priority',
      'Lead Source',
      'Credit Rating',
      'Turnover',
      'Incoterm',
      'Port Delivery',
      'Assigned Rep',
      'Follow-up Date',
      'Created Date',
      'Notes',
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = exportData.map((l) => [
      escapeCSV(l.id),
      escapeCSV(l.company_name || l.name),
      escapeCSV(l.type || 'Export'),
      escapeCSV(l.country || ''),
      escapeCSV(l.contact_person || l.contacts?.[0]?.name || ''),
      escapeCSV(l.phone || l.contacts?.[0]?.phone || ''),
      escapeCSV(l.email || l.contacts?.[0]?.email || ''),
      escapeCSV(l.whatsapp || ''),
      escapeCSV(l.website || ''),
      escapeCSV(Array.isArray(l.products) ? l.products.join(', ') : (l.product || '')),
      escapeCSV(l.quantity || 0),
      escapeCSV(l.price || l.value || 0),
      escapeCSV(l.stage || 'Requirement Understood'),
      escapeCSV(l.priority || 'High'),
      escapeCSV(l.source || ''),
      escapeCSV(l.credit_rating || ''),
      escapeCSV(l.turnover || ''),
      escapeCSV(l.export_requirements?.incoterm || l.incoterm || ''),
      escapeCSV(l.export_requirements?.port_delivery || l.port_delivery || ''),
      escapeCSV(l.agent_name || 'Staff'),
      escapeCSV(l.follow_up_date || ''),
      escapeCSV(l.created_at || ''),
      escapeCSV(l.notes || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `trade_leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification(`Exported ${exportData.length} leads successfully!`, 'success');
  };

  // Download sample CSV template
  const handleDownloadSampleCSV = () => {
    const sampleHeaders = [
      'Company Name',
      'Type',
      'Country',
      'Contact Person',
      'Phone',
      'Email',
      'WhatsApp',
      'Website',
      'Products',
      'Quantity kg',
      'Deal Value USD',
      'Stage',
      'Incoterm',
      'Port Delivery',
      'Assigned Rep',
      'Follow-up Date',
      'Notes',
    ];

    const sampleRows = [
      [
        'Al-Zahra Trading LLC',
        'Export',
        'United Arab Emirates 🇦🇪',
        'Ahmed Al-Mansoor',
        '+971 50 111 2222',
        'ahmed@alzahra.ae',
        '+971 50 111 2222',
        'https://alzahra.ae',
        'Turmeric',
        '40000',
        '68000',
        'Requirement Understood',
        'CIF',
        'Jebel Ali Port',
        'Athish',
        new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        'Customer requested COA min 3.5% curcumin',
      ],
      [
        'Global Agri Impex BV',
        'Export',
        'Netherlands 🇳🇱',
        'Lars Janssen',
        '+31 20 555 4321',
        'lars@globalagri.nl',
        '+31 20 555 4321',
        'https://globalagri.nl',
        'Rice DDGS, DORB',
        '80000',
        '95000',
        'Sample Sent',
        'FOB',
        'Rotterdam',
        'Athish',
        new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        'Feed grade protein analysis submitted',
      ],
    ];

    const escapeCSV = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
    const csvContent = [
      sampleHeaders.map(escapeCSV).join(','),
      ...sampleRows.map((r) => r.map(escapeCSV).join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_trade_leads_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle CSV file selection & parsing
  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setImportError('Please select a valid .csv spreadsheet file');
      return;
    }
    setImportFile(file);
    setImportError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const rawRows = parseCSV(text);
        if (rawRows.length === 0) {
          setImportError('No valid data rows found in the CSV file.');
          setImportPreview([]);
          return;
        }

        const mapped = rawRows
          .map((r) => {
            const companyName = r.companyname || r.company || r.name || '';
            if (!companyName) return null;

            const contactName = r.contactperson || r.contact || '';
            const phone = r.phone || '';
            const email = r.email || '';
            const products = (r.products || r.product || 'Turmeric').split(',').map((p) => p.trim());

            return {
              type: r.type || 'Export',
              company_name: companyName,
              name: companyName,
              country: r.country || 'India 🇮🇳',
              contacts: [
                {
                  name: contactName,
                  phone,
                  extra_phones: [],
                  email,
                  designation: r.designation || '',
                  linkedin: '',
                },
              ],
              contact_person: contactName,
              phone,
              email,
              whatsapp: r.whatsapp || phone,
              website: r.website || '',
              source: r.leadsource || r.source || 'Bulk CSV Import',
              address: r.address || '',
              credit_rating: r.creditrating || 'AA',
              turnover: r.turnover || '',
              sourcing_region: r.sourcingregion || '',
              legacy_industry_type: '',
              products,
              product: products.join(', '),
              quantity: Number(r.quantitykg || r.quantity) || 0,
              price: Number(r.dealvalueusd || r.dealvalue || r.price || r.value) || 0,
              value: Number(r.dealvalueusd || r.dealvalue || r.price || r.value) || 0,
              stage: r.stage || 'Requirement Understood',
              priority: r.priority || 'High',
              export_requirements: {
                industry_type: r.industrytype || 'Food & Spice Processing',
                material_type: 'Whole Raw',
                polish_level: 'Double Polish',
                min_curcumin: '3.5%',
                cultivation_method: 'Conventional Cleaned',
                preferred_origin: '',
                quantity_needed_kg: Number(r.quantitykg || r.quantity) || 0,
                max_price_inr: 0,
                incoterm: r.incoterm || 'CIF',
                port_delivery: r.portdelivery || r.port || '',
                payment_days: r.paymentdays || 'CAD on BL copy',
              },
              assigned_to: isStaff ? (profile?.id || 'staff') : 'usr_athish',
              agent_name: isStaff ? (profile?.name || 'Staff') : (r.assignedrep || 'Athish'),
              follow_up_date: r.followupdate || '',
              notes: r.notes || 'Imported via bulk CSV upload',
            };
          })
          .filter(Boolean);

        if (mapped.length === 0) {
          setImportError('None of the rows had a valid "Company Name". Please verify headers in your CSV.');
          setImportPreview([]);
        } else {
          setImportPreview(mapped);
          setImportError('');
        }
      } catch (err) {
        setImportError('Failed to parse CSV file: ' + err.message);
        setImportPreview([]);
      }
    };
    reader.readAsText(file);
  };

  // Execute bulk import
  const executeBulkImport = async () => {
    if (importPreview.length === 0) return;
    setImporting(true);
    setImportError('');
    try {
      const addedLeads = [];
      for (const leadData of importPreview) {
        try {
          const res = await api.createLead(leadData);
          if (res && res.data) {
            addedLeads.push(res.data);
          } else {
            addedLeads.push({
              ...leadData,
              id: 'lead_imp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
              created_at: new Date().toISOString(),
            });
          }
        } catch {
          addedLeads.push({
            ...leadData,
            id: 'lead_imp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            created_at: new Date().toISOString(),
          });
        }
      }

      setLeads((prev) => [...addedLeads, ...prev]);
      setImportModalOpen(false);
      setImportPreview([]);
      setImportFile(null);
      showNotification(`Successfully imported ${addedLeads.length} trade leads in bulk!`, 'success');
    } catch (err) {
      setImportError('Failed to import leads: ' + (err.message || 'Unknown error'));
    } finally {
      setImporting(false);
    }
  };

  // Filter & Sort Logic
  const filteredLeads = leads
    .filter((lead) => {
      // Role Isolation for Staff: Staff can ONLY see their own leads!
      if (isStaff) {
        const isAssignedToMe =
          lead.assigned_to === profile?.id ||
          lead.assigned_to === profile?.name ||
          lead.agent_name === profile?.name ||
          lead.agent_id === profile?.id ||
          (profile?.name?.toLowerCase().includes('athish') && (lead.assigned_to === 'usr_athish' || lead.agent_name === 'Athish'));
        if (!isAssignedToMe) return false;
      } else if (filterStaff) {
        // Owner filtering by specific staff member (e.g. Deepak, Japneet, Athish)
        const staffQ = filterStaff.toLowerCase();
        const matchesStaff =
          lead.assigned_to === filterStaff ||
          lead.agent_name === filterStaff ||
          (lead.agent_name && lead.agent_name.toLowerCase().includes(staffQ)) ||
          (lead.assigned_to && String(lead.assigned_to).toLowerCase().includes(staffQ));
        if (!matchesStaff) return false;
      }

      // Search
      if (search) {
        const q = search.toLowerCase();
        const matchesName = (lead.company_name || lead.name || '').toLowerCase().includes(q);
        const matchesContact = (lead.contact_person || '').toLowerCase().includes(q);
        const matchesEmail = (lead.email || '').toLowerCase().includes(q);
        const matchesCountry = (lead.country || '').toLowerCase().includes(q);
        const matchesProduct = (lead.product || (Array.isArray(lead.products) ? lead.products.join(' ') : '')).toLowerCase().includes(q);
        if (!matchesName && !matchesContact && !matchesEmail && !matchesCountry && !matchesProduct) return false;
      }

      // Country
      if (filterCountry && !(lead.country || '').toLowerCase().includes(filterCountry.toLowerCase())) {
        return false;
      }

      // Product
      if (filterProduct) {
        const prods = Array.isArray(lead.products) ? lead.products : (lead.product || '').split(',').map((p) => p.trim());
        if (!prods.some((p) => p.toLowerCase().includes(filterProduct.toLowerCase()))) {
          return false;
        }
      }

      // Status
      if (filterStatus && (lead.stage || lead.status) !== filterStatus) {
        return false;
      }

      // Date Range
      const targetDate = filterType === 'created' ? lead.created_at : lead.follow_up_date;
      if (targetDate) {
        const d = new Date(targetDate).getTime();
        if (fromDate) {
          const from = new Date(fromDate).getTime();
          if (d < from) return false;
        }
        if (toDate) {
          const to = new Date(toDate).getTime() + 86400000;
          if (d > to) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(filterType === 'created' ? a.created_at || 0 : a.follow_up_date || 0).getTime();
      const dateB = new Date(filterType === 'created' ? b.created_at || 0 : b.follow_up_date || 0).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const totalValue = filteredLeads.reduce((sum, l) => sum + (Number(l.price) || Number(l.value) || 0), 0);
  const totalVolumeMT = filteredLeads.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0) / 1000;
  const totalValueLakhs = totalValue / 100000;
  const atRiskLeadsList = filteredLeads.filter((l) => {
    const isClosed = ['Closed Won', 'Closed Lost'].includes(l.stage || l.status);
    if (isClosed) return false;
    return l.follow_up_date && new Date(l.follow_up_date) < new Date('2026-09-20');
  });
  const atRiskValueUSD = atRiskLeadsList.reduce((sum, l) => sum + (Number(l.price) || Number(l.value) || 0), 0);

  return (
    <div className="w-full space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isStaff ? 'My Assigned Export Leads' : 'Export Trade Leads'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {isStaff ? 'Personal Workspace' : 'Company Pipeline'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isStaff
              ? `Showing exclusively leads assigned to you (${profile?.name || 'Staff'}). Data isolated from other employees.`
              : 'Manage global commodity buyers, turmeric, chillies, DDGS, and export shipping requirements across all staff.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          {/* Export CSV - Owner Security Protection */}
          {isOwner && (
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
              title="Download leads as CSV spreadsheet"
            >
              <Download size={14} className="text-slate-500" />
              <span>Export CSV</span>
            </button>
          )}

          {/* Bulk Import */}
          <button
            onClick={() => {
              setImportModalOpen(true);
              setImportError('');
              setImportPreview([]);
              setImportFile(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-800 shadow-xs transition-all cursor-pointer"
            title="Import multiple leads via CSV spreadsheet"
          >
            <Upload size={14} className="text-emerald-700" />
            <span>Bulk Import</span>
          </button>

          {/* Manual Add Lead */}
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>+ Add Lead</span>
          </button>
        </div>
      </div>

      {/* Dynamic Notification Toast */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2
              size={16}
              className={notification.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}
            />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Stats Overview (Clean Light Theme) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Pipeline Value</span>
            {atRiskValueUSD > 0 && (
              <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200" title="Delayed follow-ups">
                ⚠️ ${atRiskValueUSD.toLocaleString('en-US')} At-Risk
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-2">
            <span>
              ${totalValue.toLocaleString('en-US')}
            </span>
          </div>
          <div className="text-[11px] font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
            <TrendingUp size={12} /> {isStaff ? 'My Active Value' : 'Global Portfolio Value'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Trade Volume</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {totalVolumeMT.toFixed(1)} MT
          </div>
          <div className="text-[11px] font-semibold text-amber-600 mt-0.5">
            Agricultural Commodities
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {isStaff ? 'Your Workspace' : 'Active Team'}
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-1.5 truncate">
            <span>{isStaff ? (profile?.name || 'Staff Member') : `${teamList.length || 4} Staff Members`}</span>
          </div>
          <div className="text-[11px] font-semibold text-emerald-600 mt-0.5 truncate">
            {isStaff ? 'Isolated Portfolio' : 'All Staff Activity Tracked'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Deals</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
            {filteredLeads.length} Leads
          </div>
          <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
            Multi-country inquiries
          </div>
        </div>
      </div>

      {/* FILTER BAR - EXACT MATCH TO USER ATTACHED SCREENSHOT */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        {/* Row 1: Filter by date & order bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter By */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Filter By</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-9 px-3 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-700"
              >
                <option value="created">Created date</option>
                <option value="followup">Follow-up date</option>
              </select>
            </div>

            {/* Quick Calendar Presets */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Date Presets</label>
              <div className="flex items-center gap-1 h-9">
                <button
                  type="button"
                  onClick={() => { setFromDate(''); setToDate(''); }}
                  className={`px-2 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    !fromDate && !toDate
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  All Time
                </button>
                <button
                  type="button"
                  onClick={() => { setFromDate('2026-09-20'); setToDate('2026-09-20'); }}
                  className={`px-2 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    fromDate === '2026-09-20' && toDate === '2026-09-20'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => { setFromDate('2026-09-14'); setToDate('2026-09-20'); }}
                  className={`px-2 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    fromDate === '2026-09-14' && toDate === '2026-09-20'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  onClick={() => { setFromDate('2026-09-01'); setToDate('2026-09-30'); }}
                  className={`px-2 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    fromDate === '2026-09-01' && toDate === '2026-09-30'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  This Month
                </button>
              </div>
            </div>

            {/* From Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="dd-mm-yyyy"
                className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-700"
              />
            </div>

            {/* To Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="dd-mm-yyyy"
                className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-700"
              />
            </div>

            {/* Order */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="h-9 px-3 text-xs font-semibold bg-white border border-purple-200 focus:ring-2 focus:ring-purple-400 focus:outline-none rounded-xl text-slate-700"
              >
                <option value="desc">Newest first (descending)</option>
                <option value="asc">Oldest first (ascending)</option>
              </select>
            </div>
          </div>

          <div className="text-xs font-semibold text-slate-500 self-end pb-1">
            Showing <span className="text-slate-900 font-bold">{filteredLeads.length}</span> of {leads.length} leads
          </div>
        </div>

        {/* Row 2: Search, Country, Product, Stage, and Staff Filter (Owner only) */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isOwner ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-2.5 pt-2 border-t border-slate-100`}>
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search company, contact, or product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
          >
            <option value="">All Countries (with Flags)</option>
            {COUNTRIES_WITH_FLAGS.map((c) => (
              <option key={c.code} value={c.name}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
          >
            <option value="">All Products</option>
            {COMMODITY_PRODUCTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
          >
            <option value="">All Stages</option>
            {PIPELINE_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {isOwner && (
            <select
              value={filterStaff}
              onChange={(e) => setFilterStaff(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-emerald-50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-900"
            >
              <option value="">All Staff Activity</option>
              <option value={profile?.id || 'owner'}>{profile?.name || 'Owner'} (Direct)</option>
              {teamList.map((tm) => (
                <option key={tm.id} value={tm.name}>
                  {tm.name} ({tm.department || tm.role || 'Staff'})
                </option>
              ))}
              {!teamList.some((t) => (t.name || '').toLowerCase().includes('deepak')) && (
                <option value="Deepak">Deepak (Staff)</option>
              )}
              {!teamList.some((t) => (t.name || '').toLowerCase().includes('japneet')) && (
                <option value="Japneet">Japneet (Staff)</option>
              )}
            </select>
          )}
        </div>
      </div>

      {/* Leads Table & Mobile View Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Company & Country</th>
                <th className="py-3.5 px-4">Contact Person</th>
                <th className="py-3.5 px-4">Products</th>
                <th className="py-3.5 px-4">Quantity / Deal</th>
                <th className="py-3.5 px-4">Created By & Date</th>
                <th className="py-3.5 px-4">Follow-Up</th>
                <th className="py-3.5 px-4 text-center">Stage</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-14 text-center text-slate-400">
                    <AlertCircle size={28} className="mx-auto text-slate-300 mb-2" />
                    No export trade leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const prods = Array.isArray(lead.products)
                    ? lead.products
                    : (lead.product || '').split(',').map((p) => p.trim());

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => openDetails(lead)}
                      className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                      title="Click anywhere to view full lead specifications & dossier"
                    >
                      {/* Company & Country */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          <span>{lead.company_name || lead.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Globe size={11} className="text-slate-400" />
                          <span>{lead.country}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-400">
                            {lead.type || 'Export'}
                          </span>
                        </div>
                        {(lead.industry_type || lead.export_requirements?.industry_type || lead.legacy_industry_type) && (
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                            <Factory size={10} className="shrink-0 text-emerald-600" />
                            <span className="truncate max-w-[210px]">{lead.industry_type || lead.export_requirements?.industry_type || lead.legacy_industry_type}</span>
                          </div>
                        )}
                      </td>

                      {/* Contact Person */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{lead.contact_person || '—'}</div>
                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                          {lead.phone && <span>{lead.phone}</span>}
                          {lead.whatsapp && (
                            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                              <MessageCircle size={10} /> WA
                            </span>
                          )}
                          {(lead.social_links?.filter(s => s.url).length > 0 || lead.social_media) && (
                            <span className="text-blue-600 font-semibold flex items-center gap-0.5 text-[10px] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                              <Share2 size={9} /> Social
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Products */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {prods.map((p, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Quantity & Deal */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {Number(lead.quantity).toLocaleString()} kg
                        </div>
                        {(() => {
                          const val = Number(lead.price) || Number(lead.value) || 0;
                          return (
                            <div className="mt-0.5">
                              <div className="text-[11px] font-black text-emerald-700 flex items-center gap-1">
                                <span>${val.toLocaleString('en-US')}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Created By & Date (Requirement 4 & 5: Assigned rep replaced with Created By & Date) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center text-[10px] font-black shrink-0">
                            {(lead.created_by_name || lead.agent_name || 'D')[0]?.toUpperCase()}
                          </span>
                          <span className="truncate max-w-[125px]">{lead.created_by_name || lead.agent_name || 'Deepak'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                          <Calendar size={10} className="text-slate-400" />
                          <span>
                            {lead.created_at
                              ? new Date(lead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '04 Oct 2026'}
                          </span>
                        </div>
                      </td>

                      {/* Follow-up date + health badge */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {(() => {
                          const health = getFollowUpHealth(lead.follow_up_date);
                          return (
                            <div className="space-y-1">
                              {health && (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${health.cls}`}>
                                  {health.label}
                                </span>
                              )}
                              <div className="flex items-center gap-1">
                                <Calendar size={12} className="text-slate-400" />
                                <span className="text-[11px]">{lead.follow_up_date || '—'}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Interactive Stage Dropdown */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <select
                          value={lead.stage || lead.status || 'Requirement Understood'}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleQuickStageChange(lead.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] border cursor-pointer outline-none transition-all shadow-xs ${getStatusBadge(
                            lead.stage || lead.status
                          )}`}
                          title="Click to update lead stage"
                        >
                          {PIPELINE_STAGES.map((s) => (
                            <option key={s} value={s} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold text-xs">
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Actions: View (Requirement 8) & Edit & Delete */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => openDetails(lead)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-all flex items-center gap-1 cursor-pointer"
                            title="View Full Lead Specifications & Dossier"
                          >
                            <Eye size={12} /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(lead)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                            title="Edit Lead Details"
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => handleDelete(lead.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Lead (Owner Only)"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Clean Card Layout for Phones */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredLeads.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No export trade leads found.
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const prods = Array.isArray(lead.products)
                ? lead.products
                : (lead.product || '').split(',').map((p) => p.trim());

              return (
                <div
                  key={lead.id}
                  onClick={() => openDetails(lead)}
                  className="p-4 space-y-3 cursor-pointer hover:bg-emerald-50/30 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {lead.company_name || lead.name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <span>{lead.country}</span>
                        <span>•</span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">{lead.type || 'Export'}</span>
                      </div>
                    </div>
                    <select
                      value={lead.stage || lead.status || 'Requirement Understood'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleQuickStageChange(lead.id, e.target.value)}
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] border cursor-pointer outline-none transition-all ${getStatusBadge(
                        lead.stage || lead.status
                      )}`}
                    >
                      {PIPELINE_STAGES.map((s) => (
                        <option key={s} value={s} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Products */}
                  <div className="flex flex-wrap gap-1">
                    {prods.map((p, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200"
                      >
                        {p}
                      </span>
                    ))}
                  </div>

                  {/* Quantity & Deal Value */}
                  <div className="text-xs bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-slate-400">Qty:</span>{' '}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {Number(lead.quantity).toLocaleString()} kg
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-emerald-700 dark:text-emerald-400">
                          ${(Number(lead.price) || Number(lead.value) || 0).toLocaleString('en-US')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Follow up */}
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 pt-1">
                    <div className="flex items-center gap-1">
                      <User size={12} className="text-slate-400" />
                      <span>{lead.contact_person || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      <span>{lead.follow_up_date || 'dd-mm-yyyy'}</span>
                    </div>
                  </div>

                  {/* Creator Info (Requirement 4 & 5) & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                    <div className="text-[10px]">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Created by: {lead.created_by_name || lead.agent_name || 'Deepak'}
                      </span>
                      <span className="text-slate-400 block">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '04 Oct 2026'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openDetails(lead)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(lead)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 cursor-pointer"
                      >
                        Edit
                      </button>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => handleDelete(lead.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                          title="Delete Lead (Owner Only)"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* REVAMPED ADD / EDIT LEAD MODAL (CLEAN SINGLE SCROLLBAR, ORGANIZED TABS) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLead ? 'Edit Export Trade Lead' : 'Add New Export Trade Lead'}
        subtitle={editingLead ? `Modifying specifications for ${editingLead.company_name || editingLead.name}` : 'Fill in the customer, commodity, and trade specifications below'}
        maxWidth="max-w-4xl"
        bodyClassName="p-4 sm:p-6 overflow-y-auto"
      >
        <form onSubmit={handleSave} className="space-y-5">
          {/* QUICK-JUMP SECTION ANCHORS (SMOOTH SCROLL) */}
          <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs py-2 px-1 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs font-bold scrollbar-none">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold mr-1 shrink-0">Sections:</span>
            <button
              type="button"
              onClick={() => document.getElementById('form-sec-company')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
            >
              <Building2 size={13} className="text-emerald-600" />
              <span>1. Company & Source</span>
            </button>
            <button
              type="button"
              onClick={() => document.getElementById('form-sec-contacts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
            >
              <User size={13} className="text-emerald-600" />
              <span>2. Contacts ({form.contacts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => document.getElementById('form-sec-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
            >
              <Layers size={13} className="text-emerald-600" />
              <span>3. Products & Deal</span>
            </button>
            <button
              type="button"
              onClick={() => document.getElementById('form-sec-shipping')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
            >
              <Ship size={13} className="text-emerald-600" />
              <span>4. Shipping & Assignment</span>
            </button>
          </div>

          {/* ALL 4 SECTIONS RENDERED SEQUENTIALLY FOR CONTINUOUS SCROLLING */}
          <div className="space-y-6 pt-1">
            {/* SECTION 1: BASIC & COMPANY */}
            <div id="form-sec-company" className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-black text-xs">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Company & Trade Source</h3>
                  <p className="text-[11px] text-slate-400">Trade classification, buyer company name, and location</p>
                </div>
              </div>

              {/* Type Selection — International or Domestic only */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Trade Type *
                </label>
                <div className="grid grid-cols-2 gap-2.5 max-w-xs">
                  {['International', 'Domestic'].map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setForm({ ...form, type: t })}
                      className={`py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        form.type === t
                          ? t === 'International'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20'
                            : 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t === 'International' ? '🌐 International' : '🏠 Domestic'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {form.type === 'International' ? 'Cross-border export/import trade lead' : 'India domestic trade lead'}
                </p>
              </div>

              {/* Company Name & Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Al-Barakah Global Agro Foods LLC"
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <SearchableCountrySelect
                    value={form.country}
                    onChange={(selectedCountry) => setForm({ ...form, country: selectedCountry })}
                  />
                </div>
              </div>

              {/* Industry Type & Custom Industry Creation */}
              <div className="bg-slate-50/90 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Factory size={13} className="text-emerald-600" />
                    <span>Industry Type <span className="text-rose-500">*</span></span>
                  </label>
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomIndustryInput(!showCustomIndustryInput)}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus size={13} /> {showCustomIndustryInput ? 'Select from standard list' : '+ Add Custom Industry'}
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1" title="Only Company Owners/Admins can add industry types">
                      <Lock size={11} className="text-slate-400" />
                      <span>Owner only</span>
                    </span>
                  )}
                </div>

                {!showCustomIndustryInput ? (
                  <select
                    value={form.industry_type || 'Food & Spice Processing'}
                    onChange={(e) => setForm({ ...form, industry_type: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none font-semibold text-slate-800 dark:text-slate-100"
                  >
                    {allIndustryOptions.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter custom industry (e.g. Edible Oils, Seeds, Bio-plastics)"
                      value={customIndustryText}
                      onChange={(e) => setCustomIndustryText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomIndustry();
                        }
                      }}
                      className="flex-1 px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-emerald-400 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomIndustry}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer shrink-0 transition-colors shadow-xs"
                    >
                      Save & Select
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomIndustryInput(false);
                        setCustomIndustryText('');
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Selected Industry: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{form.industry_type || 'Food & Spice Processing'}</strong></span>
                  <span className="text-[10px] text-slate-400">Export sector category</span>
                </div>
              </div>

              {/* Lead Source & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lead Source</label>
                  <select
                    value={form.lead_source}
                    onChange={(e) => setForm({ ...form, lead_source: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                  >
                    {LEAD_SOURCES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Website</label>
                  <input
                    type="url"
                    placeholder="https://company.com"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Credit Rating & Turnover */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Credit Rating</label>
                  <select
                    value={form.credit_rating}
                    onChange={(e) => setForm({ ...form, credit_rating: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                  >
                    {CREDIT_RATINGS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Annual Turnover (cr)</label>
                  <input
                    type="text"
                    placeholder="e.g. 50 cr"
                    value={form.turnover}
                    onChange={(e) => setForm({ ...form, turnover: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Warehouse / Corporate Address</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Warehouse #14, Al Quoz Industrial Area 3, Dubai, UAE"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* SECTION 2: CONTACTS */}
            <div id="form-sec-contacts" className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 flex items-center justify-center font-black text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Buyer Contact Personnel</h3>
                    <p className="text-[11px] text-slate-400">Add key buyers & sourcing managers</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addAnotherContact}
                  className="px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} /> Add Person
                </button>
              </div>

              {/* Contact Cards */}
              <div className="space-y-3">
                {form.contacts.map((contact, cIdx) => (
                  <div key={cIdx} className="bg-slate-50/80 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] flex items-center justify-center font-black">
                          {cIdx + 1}
                        </span>
                        <span>{contact.name || `Contact Person #${cIdx + 1}`}</span>
                      </span>
                      {form.contacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeContact(cIdx)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Full Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Tariq Mansoor"
                          value={contact.name}
                          onChange={(e) => handleContactChange(cIdx, 'name', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone Number</label>
                        <input
                          type="text"
                          placeholder="+971 50 892 4110"
                          value={contact.phone}
                          onChange={(e) => handleContactChange(cIdx, 'phone', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Extra Phones */}
                    {contact.extra_phones && contact.extra_phones.map((ext, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Alternate phone #${pIdx + 2}`}
                          value={ext}
                          onChange={(e) => handleExtraPhoneChange(cIdx, pIdx, e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeExtraPhone(cIdx, pIdx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => addExtraPhone(cIdx)}
                      className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} /> Add alternate phone number
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Work Email</label>
                        <input
                          type="email"
                          placeholder="tmansoor@company.com"
                          value={contact.email}
                          onChange={(e) => handleContactChange(cIdx, 'email', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Designation</label>
                        <input
                          type="text"
                          placeholder="e.g. VP Procurement"
                          value={contact.designation}
                          onChange={(e) => handleContactChange(cIdx, 'designation', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">LinkedIn Profile</label>
                        <input
                          type="url"
                          placeholder="https://linkedin.com/in/..."
                          value={contact.linkedin}
                          onChange={(e) => handleContactChange(cIdx, 'linkedin', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Direct WhatsApp Field */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <span>📱 Direct WhatsApp Number</span>
                  <span className="text-[10px] text-slate-400 font-normal">(With country code)</span>
                </label>
                <input
                  type="text"
                  placeholder="+971 50 892 4110"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  className="w-full sm:max-w-sm px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Multi-Social Media Links Manager */}
              <div className="bg-slate-50/90 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Share2 size={14} className="text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Social Media & Online Links
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                      (LinkedIn, Instagram, Twitter/X, WeChat, Facebook, etc.)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSocialLink}
                    className="px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Add Social Link
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(form.social_links && form.social_links.length > 0 ? form.social_links : [{ platform: 'LinkedIn', url: '' }]).map((link, sIdx) => {
                    const matchedPlatform = SOCIAL_PLATFORMS.find((p) => p.id === link.platform) || SOCIAL_PLATFORMS[0];
                    return (
                      <div key={sIdx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {/* Platform Selector */}
                        <div className="relative w-full sm:w-44 shrink-0">
                          <select
                            value={link.platform || 'LinkedIn'}
                            onChange={(e) => handleUpdateSocialLink(sIdx, 'platform', e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none font-semibold text-slate-800 dark:text-slate-100"
                          >
                            {SOCIAL_PLATFORMS.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.icon} {p.label}
                              </option>
                            ))}
                          </select>
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none">
                            {matchedPlatform.icon}
                          </span>
                        </div>

                        {/* URL / ID Input */}
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder={matchedPlatform.placeholder}
                            value={link.url || ''}
                            onChange={(e) => handleUpdateSocialLink(sIdx, 'url', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>

                        {/* Remove Button */}
                        {(form.social_links?.length > 1) && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSocialLink(sIdx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors self-end sm:self-center"
                            title="Remove this social link"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SECTION 3: PRODUCTS & DEAL */}
            <div id="form-sec-products" className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-black text-xs">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Target Commodities & Deal Specifications</h3>
                  <p className="text-[11px] text-slate-400">Commodity requirements, volume quantities, and deal values</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Target Commodities <span className="text-rose-500">*</span> (Select all that apply)
                  </label>
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomProductInput(!showCustomProductInput)}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus size={13} /> {showCustomProductInput ? 'Cancel custom' : '+ Add Other Commodity / Product'}
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1" title="Only Company Owners/Admins can add new commodities">
                      <Lock size={11} className="text-slate-400" />
                      <span>Owner only</span>
                    </span>
                  )}
                </div>

                {/* Inline Custom Commodity / Product Creator */}
                {showCustomProductInput && (
                  <div className="mb-3 p-3 bg-amber-50/90 dark:bg-amber-950/30 rounded-xl border border-amber-300 dark:border-amber-700/60 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter commodity/product name (e.g. Cumin, Cardamom, Basmati Rice, Mustard Seed)..."
                      value={customProductText}
                      onChange={(e) => setCustomProductText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomCommodity();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-amber-400 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomCommodity}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer shrink-0 transition-colors shadow-xs"
                    >
                      Add & Select
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomProductInput(false);
                        setCustomProductText('');
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                {/* Commodity Tag Buttons */}
                <div className="flex flex-wrap gap-2">
                  {allCommodityOptions.map((prod) => {
                    const isSelected = form.products.includes(prod);
                    const isCustom = !COMMODITY_PRODUCTS.includes(prod);
                    return (
                      <div
                        key={prod}
                        onClick={() => toggleProduct(prod)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{isSelected ? '✓' : '+'}</span>
                        <span>{prod}</span>
                        {isCustom && (
                          <span className="text-[10px] px-1 py-0.2 rounded bg-amber-400/30 text-amber-950 dark:text-amber-200 font-normal">
                            custom
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCommodity(prod);
                          }}
                          className={`ml-1 p-0.5 rounded-full transition-colors cursor-pointer ${
                            isSelected
                              ? 'text-amber-100 hover:bg-amber-600 hover:text-white'
                              : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                          }`}
                          title={`Delete / Remove "${prod}" category`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Volume Quantity (kg)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50000 (50 MT)"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Volume: {((Number(form.quantity) || 0) / 1000).toFixed(1)} Metric Tonnes (MT)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Deal Value / Price ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50000"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    US Dollars: ${(Number(form.price) || 0).toLocaleString('en-US')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Commodity & Packaging Specifications (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 50 kg PP / Jute bags, sortex cleaned, moisture < 10%, origin certificates..."
                  value={form.product_notes}
                  onChange={(e) => setForm({ ...form, product_notes: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* SECTION 4: EXPORT SPECS & ASSIGNMENT */}
            <div id="form-sec-shipping" className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 flex items-center justify-center font-black text-xs">
                  4
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Shipping, Terms & Staff Assignment</h3>
                  <p className="text-[11px] text-slate-400">Incoterms, port delivery, payment milestones, and responsible representative</p>
                </div>
              </div>

              {/* Shipping & Trade Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Incoterms / Shipping Terms with Custom Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">Incoterm</label>
                    <button
                      type="button"
                      onClick={() => setShowCustomIncotermInput(!showCustomIncotermInput)}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      {showCustomIncotermInput ? 'Standard' : '+ Custom'}
                    </button>
                  </div>
                  {!showCustomIncotermInput ? (
                    <select
                      value={form.incoterm}
                      onChange={(e) => setForm({ ...form, incoterm: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                    >
                      {allIncoterms.map((term) => (
                        <option key={term} value={term}>{term}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g. DDP Air, FOB Mundra"
                        value={customIncotermText}
                        onChange={(e) => setCustomIncotermText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomIncoterm();
                          }
                        }}
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-emerald-400 rounded-lg focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomIncoterm}
                        className="px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg shrink-0 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Port Delivery</label>
                  <input
                    type="text"
                    placeholder="e.g. Jebel Ali / Nhava Sheva"
                    value={form.port_delivery}
                    onChange={(e) => setForm({ ...form, port_delivery: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Payment Terms with Custom Input - Owner Only Addition */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">Payment Terms</label>
                    {isOwner ? (
                      <button
                        type="button"
                        onClick={() => setShowCustomPaymentInput(!showCustomPaymentInput)}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        {showCustomPaymentInput ? 'Standard' : '+ Custom'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Standard</span>
                    )}
                  </div>
                  {!showCustomPaymentInput || !isOwner ? (
                    <select
                      value={form.payment_days}
                      onChange={(e) => setForm({ ...form, payment_days: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                    >
                      {allPaymentTerms.map((term) => (
                        <option key={term} value={term}>{term}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g. 50% Adv + 50% LC"
                        value={customPaymentText}
                        onChange={(e) => setCustomPaymentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomPaymentTerm();
                          }
                        }}
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-emerald-400 rounded-lg focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomPaymentTerm}
                        className="px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg shrink-0 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Lead Pipeline Stage */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Lead Pipeline Stage <span className="text-rose-500">*</span>
                  </label>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(form.stage)}`}>
                    {form.stage}
                  </span>
                </div>
                <select
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 font-semibold text-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  {PIPELINE_STAGES.map((stg) => (
                    <option key={stg} value={stg}>
                      {stg}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Select current stage of this trade opportunity. Can also be updated in 1-click directly from the leads table.
                </p>
              </div>

              {/* Assignment & Next Follow-up Card */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-emerald-950 dark:text-emerald-200 mb-1">
                      Assign Rep / Staff <span className="text-rose-500">*</span>
                    </label>
                    {isOwner ? (
                      <select
                        value={form.assigned_to}
                        onChange={(e) => {
                          const selUser = teamList.find((t) => t.id === e.target.value || t.name === e.target.value);
                          setForm({
                            ...form,
                            assigned_to: e.target.value,
                            agent_name: selUser ? selUser.name : (e.target.value === profile?.id ? profile?.name : 'Staff Member'),
                          });
                        }}
                        className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 font-bold text-emerald-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      >
                        <option value={profile?.id || 'owner'}>
                          {profile?.name || 'You (Company Owner)'} [Owner]
                        </option>
                        {teamList.map((tm) => (
                          <option key={tm.id} value={tm.id}>
                            {tm.name} ({tm.department || tm.role || 'Staff'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        readOnly
                        value={`${profile?.name || 'You'} (Your Staff Account)`}
                        className="w-full px-3 py-2 text-xs bg-emerald-100/60 border border-emerald-300 font-bold text-emerald-900 rounded-xl cursor-not-allowed"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-950 dark:text-emerald-200 mb-1">
                      Next Follow-up Date <span className="text-rose-500 font-extrabold">* (Mandatory)</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={form.follow_up_date}
                      onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-emerald-400 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Separate Current vs. Future Remarks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-emerald-950 dark:text-emerald-200 mb-1">
                      Today's Interaction / Discussion Remarks <span className="text-rose-500 font-extrabold">* (Mandatory)</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="What was discussed / decided on today's call or meeting with the client..."
                      value={form.today_remarks}
                      onChange={(e) => setForm({ ...form, today_remarks: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-950 dark:text-emerald-200 mb-1">
                      Planned Action for Next Follow-up Date <span className="text-rose-500 font-extrabold">* (Mandatory)</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="What specific action needs to be taken on scheduled date (e.g., share quote, verify LC)..."
                      value={form.next_follow_up_action}
                      onChange={(e) => setForm({ ...form, next_follow_up_action: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS: STICKY AT BOTTOM FOR IMMEDIATE ACCESS */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 mt-6 bg-white dark:bg-slate-900 sticky bottom-0 z-20 pb-1">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-2 ${
                isSubmitting
                  ? 'bg-emerald-400 cursor-not-allowed opacity-80'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{editingLead ? 'Updating Lead...' : 'Creating Lead...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{editingLead ? 'Update Lead Specifications' : 'Save Export Lead'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* BULK IMPORT CSV MODAL */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Bulk Import Trade Leads"
        subtitle="Upload a CSV spreadsheet to import multiple trade leads at once"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {/* Instructions and Download Template Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-900">Need the correct column format?</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Download our sample CSV template with pre-filled headers and examples.</div>
            </div>
            <button
              type="button"
              onClick={handleDownloadSampleCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors shrink-0 cursor-pointer"
            >
              <Download size={13} />
              <span>Download Sample CSV</span>
            </button>
          </div>

          {/* Drag & Drop File Input Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
              }
            }}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-white group"
            onClick={() => document.getElementById('bulk-csv-input')?.click()}
          >
            <input
              id="bulk-csv-input"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <FileSpreadsheet size={24} />
            </div>
            <div className="text-sm font-bold text-slate-800">
              {importFile ? importFile.name : 'Click to select CSV file, or drag and drop here'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Supports standard comma-separated (.csv) files with headers
            </p>
          </div>

          {importError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {importPreview.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Preview Ready ({importPreview.length} leads detected)</span>
                <span className="text-[11px] text-slate-400 font-normal">First 5 rows shown below:</span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 sticky top-0">
                    <tr>
                      <th className="p-2">Company</th>
                      <th className="p-2">Country</th>
                      <th className="p-2">Contact</th>
                      <th className="p-2">Products</th>
                      <th className="p-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreview.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-semibold text-slate-900">{row.company_name}</td>
                        <td className="p-2 text-slate-600">{row.country}</td>
                        <td className="p-2 text-slate-600">{row.contact_person || '—'}</td>
                        <td className="p-2 text-slate-600">{Array.isArray(row.products) ? row.products.join(', ') : row.product}</td>
                        <td className="p-2 font-bold text-emerald-600">${Number(row.price || row.value || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setImportModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={importing || importPreview.length === 0}
              onClick={executeBulkImport}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {importing ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Upload size={14} />
                  <span>Import {importPreview.length} Leads Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* DETAIL MODAL: VIEW FULL COMMODITY SPECIFICATIONS */}
      {/* DETAIL MODAL: VIEW & EDIT CUSTOMER FULL DOSSIER */}
      {activeDetailLead && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={activeDetailLead.company_name || activeDetailLead.name}
          subtitle={`View & edit customer · Created ${activeDetailLead.created_at ? new Date(activeDetailLead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Sep 23, 2026'}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-5 text-xs max-h-[78vh] overflow-y-auto pr-1">
            {/* Header Status Badges Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  📅 Created {activeDetailLead.created_at ? new Date(activeDetailLead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Sep 23, 2026'}
                </span>
                <span className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border ${getStatusBadge(activeDetailLead.stage || activeDetailLead.status)}`}>
                  {activeDetailLead.stage || activeDetailLead.status || 'Requirement Understood'}
                </span>
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {activeDetailLead.type === 'Domestic' ? '🏠 Domestic' : '🌐 Export'}
                </span>
                {activeDetailLead.follow_up_date && (
                  <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${new Date(activeDetailLead.follow_up_date) < new Date('2026-09-25') ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    ⏰ Follow-up: {new Date(activeDetailLead.follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} {new Date(activeDetailLead.follow_up_date) < new Date('2026-09-25') ? '· Overdue' : ''}
                  </span>
                )}
                {activeDetailLead.activity_history?.[0] && (
                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    ⚡ Daily activity: {activeDetailLead.activity_history[0].activity}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    openEdit(activeDetailLead);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 size={13} /> Edit Customer
                </button>
              </div>
            </div>

            {/* Products & Deal Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
                <div className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-400">Target Commodities</div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(Array.isArray(activeDetailLead.products) && activeDetailLead.products.length > 0
                    ? activeDetailLead.products
                    : (activeDetailLead.product ? activeDetailLead.product.split(',').map(p => p.trim()) : ['Rice DDGS'])
                  ).map((p, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-black bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 border border-amber-300 shadow-2xs">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                <div className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-400">Contract Value & Quantity</div>
                {(() => {
                  const dealVal = Number(activeDetailLead.price) || Number(activeDetailLead.value) || 0;
                  const dealQty = Number(activeDetailLead.quantity) || 0;
                  return (
                    <div className="mt-1">
                      <div className="text-base font-black text-emerald-950 dark:text-emerald-200">
                        {dealVal > 0 ? `$${dealVal.toLocaleString('en-US')}` : '$0 (Unpriced inquiry)'}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        {dealQty.toLocaleString()} kg ({dealQty > 0 ? (dealQty / 1000).toFixed(1) + ' MT' : '0 MT'})
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Customer Details & Contacts */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="font-extrabold text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="flex items-center gap-1.5 text-xs">
                  <User size={14} className="text-emerald-600" /> Customer & Buyer Details
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {activeDetailLead.country} • Source: <strong className="text-slate-700 dark:text-slate-300">{activeDetailLead.source || 'Self/own'}</strong>
                </span>
              </div>

              {/* Contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.isArray(activeDetailLead.contacts) && activeDetailLead.contacts.length > 0 ? (
                  activeDetailLead.contacts.map((c, i) => (
                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                      <div className="font-extrabold text-slate-900 dark:text-slate-100 flex justify-between items-center">
                        <span className="text-xs">{c.name || 'Contact Person'}</span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                          {c.designation || 'Buyer'}
                        </span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300 text-[11px] space-y-1">
                        {c.phone && (
                          <div className="flex items-center justify-between">
                            <span>📞 {c.phone}</span>
                            <a
                              href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5"
                            >
                              <MessageCircle size={10} /> Chat WA
                            </a>
                          </div>
                        )}
                        {c.email && (
                          <div>
                            <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline">
                              ✉️ {c.email}
                            </a>
                          </div>
                        )}
                        {c.linkedin && (
                          <div>
                            <a href={c.linkedin.startsWith('http') ? c.linkedin : `https://${c.linkedin}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1">
                              💼 LinkedIn Profile <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border text-slate-600 text-[11px]">
                    <strong>{activeDetailLead.contact_person || 'Mr Duy'}</strong> • {activeDetailLead.phone || '0913108364'} • {activeDetailLead.email || 'email@example.com'}
                  </div>
                )}

                {/* Additional Company Profile */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 text-[11px] space-y-1.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200">Company Profile & Location</div>
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Address: </span>
                    {activeDetailLead.address || 'Room 302A, Floor 3, 241 Dien Bien Phu St., Ho Chi Minh City, Vietnam'}
                  </div>
                  {activeDetailLead.website && (
                    <div className="flex items-center gap-1 pt-0.5">
                      <Globe size={11} className="text-slate-400" />
                      <a href={activeDetailLead.website.startsWith('http') ? activeDetailLead.website : `https://${activeDetailLead.website}`} target="_blank" rel="noreferrer" className="text-emerald-700 dark:text-emerald-400 font-bold underline">
                        {activeDetailLead.website}
                      </a>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-slate-500">
                    <span>Credit: <strong className="text-slate-700 dark:text-slate-300">{activeDetailLead.credit_rating || 'AA'}</strong></span>
                    <span>•</span>
                    <span>Turnover: <strong className="text-slate-700 dark:text-slate-300">{activeDetailLead.turnover || '50 cr'}</strong></span>
                    <span>•</span>
                    <span>Industry: <strong className="text-slate-700 dark:text-slate-300">{activeDetailLead.industry_type || 'Animal Feed'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Social Channels */}
              {((activeDetailLead.social_links && activeDetailLead.social_links.filter(s => s.url).length > 0) || activeDetailLead.social_media) && (
                <div className="pt-2 flex flex-wrap gap-2">
                  {Array.isArray(activeDetailLead.social_links) && activeDetailLead.social_links.filter(s => s.url).map((s, idx) => (
                    <a
                      key={idx}
                      href={s.url.startsWith('http') ? s.url : `https://${s.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
                    >
                      <Share2 size={10} /> {s.platform}: {s.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 22)}
                      <ExternalLink size={9} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* ASSIGNMENT & STATUS SECTION - EXACT ONEROOT MATCH */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="font-extrabold text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="flex items-center gap-1.5 text-xs">
                  <User size={14} className="text-emerald-600" /> Assignment & Status
                </span>
                <span className="text-[10px] text-slate-400">
                  Only admins can reassign this lead to another user.
                </span>
              </div>

              {/* Creator vs Assignee Card (Requirement 4 & 6) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black flex items-center justify-center text-xs shrink-0">
                    {(activeDetailLead.created_by_name || activeDetailLead.agent_name || 'Deepak')[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>Created by:</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-black">
                        {activeDetailLead.created_by_name || activeDetailLead.agent_name || 'Deepak'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Record created on {activeDetailLead.created_at ? new Date(activeDetailLead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '04 Oct 2026'}
                    </div>
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Current Assignee</div>
                  <div className="font-extrabold text-indigo-700 dark:text-indigo-400 text-xs">
                    {activeDetailLead.agent_name || 'Staff Member'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reassign to <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled={!isOwner}
                    value={activeDetailLead.agent_name || 'adric'}
                    onChange={(e) => {
                      const newAgent = e.target.value;
                      const updatedLead = { ...activeDetailLead, agent_name: newAgent, assigned_to: newAgent };
                      setActiveDetailLead(updatedLead);
                      updateAndPersistLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
                      showNotification(`Lead reassigned to ${newAgent}`, 'success');
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  >
                    {['Deepak', 'Japneet', 'Athish', 'adric', 'David', 'Rohan', 'Shiva', ...teamList.map((t) => t.name)]
                      .filter((val, idx, self) => self.indexOf(val) === idx)
                      .map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Only admins can reassign this lead to another user.</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={activeDetailLead.stage || activeDetailLead.status || 'Closed Lost'}
                    onChange={(e) => {
                      const newStage = e.target.value;
                      const updatedLead = { ...activeDetailLead, stage: newStage, status: newStage, lead_stage: newStage };
                      setActiveDetailLead(updatedLead);
                      updateAndPersistLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
                      showNotification(`Lead status updated to ${newStage}`, 'success');
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none font-bold"
                  >
                    {PIPELINE_STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* DAILY ACTIVITY SECTION - EXACT SPECIFICATION MATCH */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-855 border border-slate-200 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                    ⚡
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">Daily Activity & Interactions</h4>
                    <p className="text-[10px] text-slate-400">Log calls, discussions, samples, and sent quotations</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                  {activeDetailLead.activity_history?.length || 0} logged activities
                </span>
              </div>

              {/* Select Activities checklist pills */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select activity:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_ACTIVITIES.map((act) => {
                    const isSelected = dossierActivityType === act;
                    return (
                      <button
                        type="button"
                        key={act}
                        onClick={() => setDossierActivityType(act)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{act}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Activity Note & Submit */}
              <div className="space-y-2">
                <textarea
                  rows={2}
                  placeholder="Write what happened with this lead… (e.g. today their purchasers don't stay at office, requested protein > 45%)..."
                  value={dossierActivityNote}
                  onChange={(e) => setDossierActivityNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Tick an activity above — a note on its own is not saved.
                  </span>
                  <button
                    type="button"
                    onClick={handleLogDossierActivity}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Send size={12} /> Log Activity
                  </button>
                </div>
              </div>

              {/* Activity History Timeline */}
              {activeDetailLead.activity_history && activeDetailLead.activity_history.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <History size={13} className="text-slate-400" />
                    <span>Activity history ({activeDetailLead.activity_history.length})</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activeDetailLead.activity_history.map((hist, hIdx) => (
                      <div key={hIdx} className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 text-[10px]">
                            {hist.activity}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {hist.date}
                          </span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-200 font-medium">
                          {hist.note}
                        </div>
                        <div className="text-[10px] text-slate-400 text-right font-semibold">
                          {hist.author}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* FOLLOW-UP & REMARKS SECTION - EXACT SPECIFICATION MATCH */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">
                    📅
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">Follow-up Schedule & Remarks</h4>
                    <p className="text-[10px] text-slate-400">Track client reminders and follow-up history</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-700">
                  Current: {activeDetailLead.follow_up_date || 'None'}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Follow-up date <span className="text-rose-500 font-extrabold">* (Mandatory)</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dossierFollowUpDate || activeDetailLead.follow_up_date || ''}
                    onChange={(e) => setDossierFollowUpDate(e.target.value)}
                    className="w-full sm:w-64 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-emerald-400 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Today's Interaction / Discussion Remarks <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="What was discussed / done today (e.g. called client, discussed CIF price & sample)..."
                      value={dossierTodayRemark}
                      onChange={(e) => setDossierTodayRemark(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Planned Action for Next Follow-up Date
                    </label>
                    <textarea
                      rows={2}
                      placeholder="What action to take on future date (e.g. share lab report, check payment receipt)..."
                      value={dossierFutureAction}
                      onChange={(e) => setDossierFutureAction(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    Changing the follow-up date counts once per lead per day in Outreach.
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveDossierFollowUp}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <CalendarDays size={14} />
                    <span>Save Follow-up & Remarks</span>
                  </button>
                </div>
              </div>

              {/* Previous Remarks list with clear separation of today's interaction and planned action */}
              {activeDetailLead.previous_remarks && activeDetailLead.previous_remarks.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                    Follow-up & Remarks History ({activeDetailLead.previous_remarks.length})
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activeDetailLead.previous_remarks.map((r, rIdx) => (
                      <div key={rIdx} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
                          <span className="font-bold text-slate-600 dark:text-slate-300">{r.author || 'User'}</span>
                          <span>{r.date}</span>
                        </div>
                        {r.today_remark ? (
                          <div className="text-slate-800 dark:text-slate-200">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">Interaction: </span>
                            {r.today_remark}
                          </div>
                        ) : r.remark && !r.planned_action ? (
                          <div className="text-slate-800 dark:text-slate-200">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">Remark: </span>
                            {r.remark}
                          </div>
                        ) : null}
                        {r.planned_action && (
                          <div className="text-slate-700 dark:text-slate-300 bg-emerald-50/70 dark:bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
                            <span className="font-bold text-emerald-800 dark:text-emerald-300">🎯 Planned Action ({r.follow_up_date || 'Next Follow-up'}): </span>
                            {r.planned_action}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* DOCUMENTS SECTION - EXACT SPECIFICATION MATCH */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
                    📁
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">Documents & Specifications</h4>
                    <p className="text-[10px] text-slate-400">Images, PDF, Office docs, text, ZIP · max 20 MB</p>
                  </div>
                </div>
                <label className="px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-blue-200 dark:border-blue-800">
                  <Upload size={13} />
                  <span>{isUploadingDoc ? 'Uploading...' : 'Upload Document'}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleUploadDossierDoc}
                    disabled={isUploadingDoc}
                  />
                </label>
              </div>

              {/* Document List */}
              {activeDetailLead.documents && activeDetailLead.documents.length > 0 ? (
                <div className="space-y-2">
                  {activeDetailLead.documents.map((doc) => (
                    <div key={doc.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{doc.name}</div>
                          <div className="text-[10px] text-slate-400">{doc.size} • Uploaded {doc.upload_date}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => showNotification(`Downloading ${doc.name}...`, 'success')}
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg cursor-pointer"
                          title="Download document"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDossierDoc(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          title="Delete document"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400">
                  <Paperclip size={20} className="mx-auto text-slate-300 mb-1" />
                  <p className="text-xs font-semibold">No documents uploaded yet.</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Click 'Upload Document' to attach trade agreements, COA, or lab test certificates</p>
                </div>
              )}
            </div>

            {/* Trade & Export Specifications Details */}
            {(activeDetailLead.export_requirements || activeDetailLead.product_notes) && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center gap-1.5 text-xs">
                  <Ship size={14} className="text-emerald-600" />
                  <span>Trade, Shipping & Export Specifications</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <span className="text-slate-400 block text-[10px]">Incoterm</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeDetailLead.export_requirements?.incoterm || 'CIF'}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <span className="text-slate-400 block text-[10px]">Port Delivery</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeDetailLead.export_requirements?.port_delivery || 'Hai Phong / Cat Lai Port'}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <span className="text-slate-400 block text-[10px]">Payment Terms</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeDetailLead.export_requirements?.payment_days || 'CAD on BL copy'}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <span className="text-slate-400 block text-[10px]">Polish / Treatment</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeDetailLead.export_requirements?.polish_level || 'Machine Cleaned'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions Bar with Delete Lead option */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              {isOwner ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(activeDetailLead.id)}
                    className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer border border-rose-200 flex items-center gap-1"
                  >
                    <Trash2 size={13} /> Delete lead
                  </button>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    Deleting removes this lead for everyone and cannot be undone.
                  </span>
                </div>
              ) : <div />}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    openEdit(activeDetailLead);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 cursor-pointer flex items-center gap-1"
                >
                  <Edit3 size={13} /> Edit Lead
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
