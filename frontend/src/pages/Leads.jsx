import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import PhoneInputWithCountry from '../components/PhoneInputWithCountry';
import LeadEmailHistory from '../components/email/LeadEmailHistory';
import { LeadAiCalls } from './AiCalling';
import { LeadDocuments } from './Quotations';
import BulkImportModal from '../components/BulkImportModal';
import CountryFlag from '../components/CountryFlag';
import { parsePhoneNumber } from '../data/countryCodes';
import { SEED_LEADS } from '../data/seedLeads';
import { DEFAULT_COMMODITIES, PIPELINE_STAGES, LEAD_SOURCES, withCurrent, useLeadOptions, runOnEnter, toTimeInputValue, formatLocation, chatLinks, linkFromPhone, isPhoneLink } from '../data/leadOptions';
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
  { id: 'Zalo', label: 'Zalo', icon: '💙', placeholder: 'Zalo number or https://zalo.me/...' },
  { id: 'Line', label: 'Line', icon: '🟢', placeholder: 'Line ID or https://line.me/ti/p/...' },
  { id: 'Telegram', label: 'Telegram', icon: '✈️', placeholder: 'https://t.me/channel' },
  { id: 'YouTube', label: 'YouTube', icon: '🎥', placeholder: 'https://youtube.com/@channel' },
  { id: 'Website', label: 'Website / Other', icon: '🌐', placeholder: 'https://...' },
];

// Comprehensive Countries with Flags — Alphabetically Sorted A to Z
export const COUNTRIES_WITH_FLAGS = [
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
  { code: 'AD', name: 'Andorra', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴' },
  { code: 'AG', name: 'Antigua and Barbuda', flag: '🇦🇬' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲' },
  { code: 'AW', name: 'Aruba', flag: '🇦🇼' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿' },
  { code: 'BS', name: 'Bahamas', flag: '🇧🇸' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'BZ', name: 'Belize', flag: '🇧🇿' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯' },
  { code: 'BT', name: 'Bhutan', flag: '🇧🇹' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮' },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'CV', name: 'Cape Verde', flag: '🇨🇻' },
  { code: 'CF', name: 'Central African Republic', flag: '🇨🇫' },
  { code: 'TD', name: 'Chad', flag: '🇹🇩' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'KM', name: 'Comoros', flag: '🇰🇲' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬' },
  { code: 'CD', name: 'Congo (DRC)', flag: '🇨🇩' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'DJ', name: 'Djibouti', flag: '🇩🇯' },
  { code: 'DM', name: 'Dominica', flag: '🇩🇲' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'FJ', name: 'Fiji', flag: '🇫🇯' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'GD', name: 'Grenada', flag: '🇬🇩' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾' },
  { code: 'HT', name: 'Haiti', flag: '🇭🇹' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'KI', name: 'Kiribati', flag: '🇰🇮' },
  { code: 'XK', name: 'Kosovo', flag: '🇽🇰' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷' },
  { code: 'LY', name: 'Libya', flag: '🇱🇾' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'MO', name: 'Macau', flag: '🇲🇴' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹' },
  { code: 'MH', name: 'Marshall Islands', flag: '🇲🇭' },
  { code: 'MR', name: 'Mauritania', flag: '🇲🇷' },
  { code: 'MU', name: 'Mauritius', flag: '🇲🇺' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'FM', name: 'Micronesia', flag: '🇫🇲' },
  { code: 'MD', name: 'Moldova', flag: '🇲🇩' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨' },
  { code: 'MN', name: 'Mongolia', flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'NA', name: 'Namibia', flag: '🇳🇦' },
  { code: 'NR', name: 'Nauru', flag: '🇳🇷' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KP', name: 'North Korea', flag: '🇰🇵' },
  { code: 'MK', name: 'North Macedonia', flag: '🇲🇰' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'PW', name: 'Palau', flag: '🇵🇼' },
  { code: 'PS', name: 'Palestine', flag: '🇵🇸' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦' },
  { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'KN', name: 'Saint Kitts and Nevis', flag: '🇰🇳' },
  { code: 'LC', name: 'Saint Lucia', flag: '🇱🇨' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', flag: '🇻🇨' },
  { code: 'WS', name: 'Samoa', flag: '🇼🇸' },
  { code: 'SM', name: 'San Marino', flag: '🇸🇲' },
  { code: 'ST', name: 'São Tomé and Príncipe', flag: '🇸🇹' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
  { code: 'SC', name: 'Seychelles', flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'SB', name: 'Solomon Islands', flag: '🇸🇧' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩' },
  { code: 'SR', name: 'Suriname', flag: '🇸🇷' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'TJ', name: 'Tajikistan', flag: '🇹🇯' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'TL', name: 'Timor-Leste', flag: '🇹🇱' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬' },
  { code: 'TO', name: 'Tonga', flag: '🇹🇴' },
  { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲' },
  { code: 'TV', name: 'Tuvalu', flag: '🇹🇻' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿' },
  { code: 'VU', name: 'Vanuatu', flag: '🇻🇺' },
  { code: 'VA', name: 'Vatican City', flag: '🇻🇦' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' },
];

// These lists live in data/leadOptions.js so every lead form shows the same options
export const COMMODITY_PRODUCTS = DEFAULT_COMMODITIES;
export { PIPELINE_STAGES, LEAD_SOURCES };

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

export const QUANTITY_UNITS = [
  { value: 'MT', label: 'Tonnes (MT)', short: 'MT' },
  { value: 'kg', label: 'Kilograms (kg)', short: 'kg' },
  { value: 'Quintal', label: 'Quintals (Qtl)', short: 'Qtl' },
  { value: 'lbs', label: 'Pounds (lbs)', short: 'lbs' },
  { value: 'Containers', label: 'Containers (FCL / 20ft)', short: 'FCL' },
  { value: 'Bags', label: 'Bags (50kg)', short: 'Bags' },
];

export const getQuantityInMT = (qty, unit = 'MT') => {
  const q = Number(qty) || 0;
  if (!q) return 0;
  const u = (unit || '').toLowerCase();
  if (u === 'mt' || u === 'tonnes' || u === 'tonne' || u === 'tones' || u === 'tons' || u === 'ton') {
    return q;
  }
  if (u === 'kg' || u === 'kilograms' || u === 'kgs') {
    return q / 1000;
  }
  if (u === 'quintal' || u === 'quintals' || u === 'qtl') {
    return q * 0.1;
  }
  if (u === 'lbs' || u === 'pounds') {
    return q * 0.00045359237;
  }
  if (u === 'containers' || u === 'container' || u === 'fcl') {
    return q * 25;
  }
  if (u === 'bags') {
    return (q * 50) / 1000;
  }
  return q >= 1000 ? q / 1000 : q;
};

export const formatQuantityEquivalent = (qty, unit = 'MT') => {
  const q = Number(qty) || 0;
  if (!q) return 'Enter quantity to preview unit conversions';
  const mt = getQuantityInMT(q, unit);
  const kg = mt * 1000;
  const fcl = (mt / 25).toFixed(1);

  const u = (unit || '').toLowerCase();
  if (u === 'mt' || u === 'tonnes' || u === 'tones') {
    return `≈ ${kg.toLocaleString()} kg • ${mt.toLocaleString()} Metric Tonnes (~${fcl} FCL Containers)`;
  }
  if (u === 'kg') {
    return `≈ ${mt.toFixed(2)} Metric Tonnes (MT) • ${kg.toLocaleString()} kg (~${fcl} FCL Containers)`;
  }
  if (u === 'quintal' || u === 'qtl') {
    return `≈ ${kg.toLocaleString()} kg • ${mt.toFixed(2)} MT (~${fcl} FCL Containers)`;
  }
  if (u === 'containers' || u === 'fcl') {
    return `≈ ${mt.toFixed(1)} MT • ${kg.toLocaleString()} kg (~${q} Full Containers)`;
  }
  if (u === 'bags') {
    return `≈ ${kg.toLocaleString()} kg • ${mt.toFixed(2)} MT`;
  }
  return `≈ ${kg.toLocaleString()} kg • ${mt.toFixed(2)} MT`;
};

export const INITIAL_LEADS = SEED_LEADS;


// Local calendar day as YYYY-MM-DD (offset in days from today)
const localDay = (offset = 0) => {
  const d = new Date(Date.now() + offset * 86400000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};
const monthStart = () => localDay(0).slice(0, 8) + '01';

// "Last contact 9 days ago" text and colour for a lead (server sends days_since_contact / no_contact_alert)
const lastContactBadge = (lead) => {
  const d = lead?.days_since_contact;
  if (d === null || d === undefined) return null;
  const text = d === 0 ? 'Last contact: today' : d === 1 ? 'Last contact: yesterday' : `Last contact: ${d} days ago`;
  return {
    text,
    alert: Boolean(lead.no_contact_alert),
    cls: lead.no_contact_alert
      ? 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/50 dark:border-rose-900'
      : 'text-slate-500 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-800/60 dark:border-slate-700',
  };
};

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

  // Exact match first ("Niger" must not show for "Nigeria"); the stored value may carry a flag after the name
  const selectedObj = useMemo(() => {
    const v = String(value || '').trim();
    if (!v) return null;
    const matches = COUNTRIES_WITH_FLAGS.filter(
      (c) => v === c.name || v === `${c.name} ${c.flag}` || v.startsWith(`${c.name} `)
    );
    if (!matches.length) return null;
    return matches.sort((a, b) => b.name.length - a.name.length)[0];
  }, [value]);

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
              <CountryFlag code={selectedObj.code} name={selectedObj.name} className="w-4 h-3" />
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
                    <CountryFlag code={c.code} name={c.name} className="w-4 h-3" />
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
  // Owner, or staff the owner allowed to edit the full lead (Team → staff → "Edit full lead details")
  const fullEdit = isOwner || profile?.permissions?.edit_lead_details === true;
  const [leads, setLeads] = useState(INITIAL_LEADS);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeDetailLead, setActiveDetailLead] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [teamList, setTeamList] = useState([]);
  const [filterStaff, setFilterStaff] = useState('');
  const [filterNoContact, setFilterNoContact] = useState(false);

  // Form Tab & Modal Polish
  const [activeFormTab, setActiveFormTab] = useState('basic'); // 'basic' | 'contact' | 'deal' | 'export'

  // Bulk Import / Export state
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Toast notification
  const [notification, setNotification] = useState(null);
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, type === 'success' ? 4000 : 8000);
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
  const [filterTag, setFilterTag] = useState('');

  // Dynamic Commodity options state (user can add & remove products)
  // The company list is saved on the server, so the owner and all staff see the same products everywhere.
  const { commodities: companyCommodities, saveOptions: saveLeadOptions } = useLeadOptions(isOwner);
  // Products already on the lead being edited that are no longer in the company list
  const [extraCommodities, setExtraCommodities] = useState([]);
  const allCommodityOptions = useMemo(
    () => Array.from(new Set([...companyCommodities, ...extraCommodities])),
    [companyCommodities, extraCommodities]
  );
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
  const [tagInput, setTagInput] = useState('');

  // Lead Form Initial State matching user requirements
  const defaultContact = {
    name: '',
    phone: '',
    country_code: '',
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
    extra_whatsapp: [], // more WhatsApp / Zalo numbers of the company
    website: '',
    social_media: '',
    social_links: [
      { platform: 'LinkedIn', url: '' },
      { platform: 'Instagram', url: '' }
    ],
    country: 'United Arab Emirates 🇦🇪',
    lead_source: 'Direct Inquiry',
    address: '',
    state: '',
    city: '',
    pincode: '',
    credit_rating: 'AA',
    turnover: '',
    stage: 'Lead Generation', // a new lead starts at the first stage
    // Product
    products: [], // Empty array by default
    tags: [], // Optional marketing tags (used by Email Marketing audiences)
    quantity: 0,
    quantity_unit: 'MT',
    price: 0, // Price ($)
    product_notes: '',
    // Trade & Shipping terms
    incoterm: 'CIF',
    port_delivery: '',
    payment_days: 'LC at Sight (Letter of Credit)',
    // Assignment & Creator Info (Requirement 4 & 6)
    assigned_to: isStaff ? (profile?.id || 'staff') : (profile?.id || 'owner'),
    agent_name: isStaff ? (profile?.name || 'Staff Member') : (profile?.name || 'Owner'),
    created_by_id: profile?.id || 'usr_staff_creator',
    created_by_name: profile?.name || profile?.full_name || 'Owner',
    created_at: new Date().toISOString(),
    follow_up_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    follow_up_time: '10:00',
    today_remarks: '',
    next_follow_up_action: '',
    notes: '',
  };

  const [form, setForm] = useState(initForm);

  // Lead Dossier interactive activity, follow-up remark, & document state
  const [dossierActivityType, setDossierActivityType] = useState('Call initiated');
  const [dossierActivityNote, setDossierActivityNote] = useState('');
  // Activities saved on the server for each lead (the same list in the View window, the Edit form and on every device)
  const [leadActivities, setLeadActivities] = useState({});
  const loadLeadActivities = useCallback((leadId) => {
    if (!leadId) return;
    api.getActivities({ lead_id: leadId })
      .then((r) => { const list = Array.isArray(r) ? r : r?.data; if (Array.isArray(list)) setLeadActivities((m) => ({ ...m, [leadId]: list })); })
      .catch(() => { /* no access to Activity: the panel shows what this browser has */ });
  }, []);
  useEffect(() => { loadLeadActivities(activeDetailLead?.id); }, [activeDetailLead?.id, loadLeadActivities]);
  useEffect(() => { loadLeadActivities(editingLead?.id); }, [editingLead?.id, loadLeadActivities]);
  const activityEntries = (lead) => {
    const server = lead && leadActivities[lead.id];
    if (!server) return lead?.activity_history || [];
    return server.map((a) => ({
      activity: a.title,
      note: a.description || '',
      date: a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + new Date(a.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
      author: a.user_name ? `by ${a.user_name}` : '',
    }));
  };
  const [dossierFollowUpDate, setDossierFollowUpDate] = useState('');
  const [dossierFollowUpTime, setDossierFollowUpTime] = useState('10:00');
  const [dossierTodayRemark, setDossierTodayRemark] = useState('');
  const [dossierFutureAction, setDossierFutureAction] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docLinkName, setDocLinkName] = useState('');
  const [docLinkUrl, setDocLinkUrl] = useState('');

  // Persistence helper: saves to React state and localStorage
  const updateAndPersistLeads = (updater) => {
    setLeads((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem('oneroot_leads_v3', JSON.stringify(next));
        window.dispatchEvent(new Event('crm_leads_updated'));
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
    const fetchTeam = () => {
      if (isOwner && getTeamMembers) {
        getTeamMembers().then((res) => {
          if (Array.isArray(res)) setTeamList(res);
        }).catch(() => {});
      }
    };
    fetchTeam();
    window.addEventListener('crm_staff_updated', fetchTeam);
    return () => window.removeEventListener('crm_staff_updated', fetchTeam);
  }, [profile?.id, isOwner]);

  // Dossier Action Handlers
  const handleLogDossierActivity = async (leadArg) => {
    // Called from the View window (activeDetailLead) or the Edit form (the lead being edited)
    const target = leadArg && leadArg.id ? leadArg : activeDetailLead;
    if (!target || !dossierActivityType) return;
    const newEntry = {
      activity: dossierActivityType,
      note: dossierActivityNote.trim() || 'Activity logged',
      date: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      author: `by ${profile?.name || 'User'}`,
    };

    // Save it on the server so the owner and other devices see it too
    try {
      const saved = await api.createActivity({
        type: 'note',
        title: dossierActivityType,
        description: newEntry.note,
        lead_id: target.id,
      });
      const rec = saved?.data || saved;
      if (rec && rec.id) setLeadActivities((m) => (m[target.id] ? { ...m, [target.id]: [{ ...rec, user_name: rec.user_name || profile?.name || '' }, ...m[target.id]] } : m));
    } catch (err) {
      showNotification(err?.message || 'Activity could not be saved.', 'error');
      return;
    }

    const updatedHistory = [newEntry, ...(target.activity_history || [])];
    const updatedLead = {
      ...target,
      activity_history: updatedHistory,
      notes: dossierActivityNote.trim() || target.notes,
    };

    if (activeDetailLead && activeDetailLead.id === target.id) setActiveDetailLead(updatedLead);
    if (editingLead && editingLead.id === target.id) setEditingLead((prev) => (prev ? { ...prev, activity_history: updatedHistory } : prev));
    setDossierActivityNote('');
    // Only the activity list changes (the lead may be half-edited in the form)
    updateAndPersistLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? { ...l, activity_history: updatedHistory, notes: updatedLead.notes } : l))
    );
    showNotification(`Activity "${dossierActivityType}" logged successfully!`, 'success');
  };

  const handleSaveDossierFollowUp = async () => {
    if (!activeDetailLead) return;
    const dateToSave = dossierFollowUpDate || activeDetailLead.follow_up_date;
    const timeToSave = dossierFollowUpTime || activeDetailLead.follow_up_time || '10:00';
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
        dossierFutureAction.trim() ? `Planned for ${dateToSave} at ${timeToSave}: ${dossierFutureAction.trim()}` : null,
      ].filter(Boolean).join(' | '),
      follow_up_date: dateToSave,
      follow_up_time: timeToSave,
      date: formattedNow,
      author: profile?.name || 'User',
    };

    const updatedRemarks = [
      newRemarkEntry,
      ...(activeDetailLead.previous_remarks || []),
    ];

    const compositeNotes = [
      dossierTodayRemark.trim() ? `[Today's Interaction - ${formattedNow}]: ${dossierTodayRemark.trim()}` : null,
      dossierFutureAction.trim() ? `[Planned Action on ${dateToSave} at ${timeToSave}]: ${dossierFutureAction.trim()}` : null,
      activeDetailLead.notes || '',
    ].filter(Boolean).join('\n\n');

    const updatedLead = {
      ...activeDetailLead,
      follow_up_date: dateToSave,
      follow_up_time: timeToSave,
      today_remarks: dossierTodayRemark.trim() || activeDetailLead.today_remarks || '',
      next_follow_up_action: dossierFutureAction.trim() || activeDetailLead.next_follow_up_action || '',
      notes: compositeNotes,
      previous_remarks: updatedRemarks,
    };

    let saved = updatedLead;
    try {
      // The server appends this to the permanent remark history; we never send the history itself
      const res = await api.updateLead(updatedLead.id, {
        follow_up_date: dateToSave,
        follow_up_time: timeToSave,
        today_remarks: dossierTodayRemark.trim(),
        next_follow_up_action: dossierFutureAction.trim(),
        notes: compositeNotes,
      });
      if (res?.data) saved = { ...updatedLead, ...res.data };
    } catch (apiErr) {
      console.warn('API update follow-up error:', apiErr);
      showNotification(apiErr?.message || 'Remark could not be saved. Please try again.', 'error');
      return;
    }

    setActiveDetailLead(saved);
    setDossierTodayRemark('');
    setDossierFutureAction('');
    updateAndPersistLeads((prev) =>
      prev.map((l) => (l.id === saved.id ? saved : l))
    );

    showNotification('Follow-up schedule and remarks saved successfully!', 'success');
  };

  // Documents are saved as links (Google Drive, Dropbox, OneDrive...). The file itself stays in that drive.
  const saveLeadDocuments = async (documents, okMsg) => {
    if (!activeDetailLead) return;
    const before = activeDetailLead;
    const updatedLead = { ...activeDetailLead, documents };
    setActiveDetailLead(updatedLead);
    setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    try {
      const res = await api.updateLead(updatedLead.id, { documents });
      if (res && res.success === false) throw new Error(res.message);
      showNotification(okMsg, 'success');
    } catch (err) {
      setActiveDetailLead(before);
      setLeads((prev) => prev.map((l) => (l.id === before.id ? before : l)));
      showNotification(err?.message || 'Document could not be saved.', 'error');
    }
  };

  const handleUploadDossierDoc = async () => {
    if (!activeDetailLead) return;
    const name = (docLinkName || '').trim();
    let url = (docLinkUrl || '').trim();
    if (!name || !url) { showNotification('Enter a document name and its link.', 'error'); return; }
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try { new URL(url); } catch { showNotification('Please paste a valid link (e.g. a Google Drive share link).', 'error'); return; }
    setIsUploadingDoc(true);
    const newDoc = {
      id: 'doc_' + Date.now(),
      name: name.slice(0, 150),
      url: url.slice(0, 1000),
      upload_date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      added_by: profile?.name || '',
    };
    await saveLeadDocuments([newDoc, ...(activeDetailLead.documents || [])], `Document "${newDoc.name}" saved.`);
    setDocLinkName(''); setDocLinkUrl(''); setIsUploadingDoc(false);
  };

  const handleDeleteDossierDoc = async (docId) => {
    if (!activeDetailLead) return;
    await saveLeadDocuments((activeDetailLead.documents || []).filter((d) => d.id !== docId), 'Document removed.');
  };

  // Contact person dynamic helpers
  // Contacts are copied, never changed in place: the lead being edited keeps its saved values,
  // and older / imported contacts may have no extra_phones list yet.
  const withContact = (index, change) => setForm((f) => ({
    ...f,
    contacts: f.contacts.map((c, i) => (i === index ? change({ ...c, extra_phones: Array.isArray(c.extra_phones) ? [...c.extra_phones] : [] }) : c)),
  }));

  const handleContactChange = (index, field, value) => {
    withContact(index, (c) => ({ ...c, [field]: value }));
  };

  const addExtraPhone = (contactIndex) => {
    withContact(contactIndex, (c) => ({ ...c, extra_phones: [...c.extra_phones, ''] }));
  };

  const handleExtraPhoneChange = (contactIndex, phoneIndex, value) => {
    withContact(contactIndex, (c) => ({ ...c, extra_phones: c.extra_phones.map((p, j) => (j === phoneIndex ? value : p)) }));
  };

  const removeExtraPhone = (contactIndex, phoneIndex) => {
    withContact(contactIndex, (c) => ({ ...c, extra_phones: c.extra_phones.filter((_, j) => j !== phoneIndex) }));
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
  const handleAddCustomCommodity = async () => {
    if (!isOwner) {
      showNotification('Permission Denied: Only Company Owners/Admins can add new commodities or products.', 'error');
      return;
    }
    const trimmed = customProductText.trim();
    if (!trimmed) return;
    if (!companyCommodities.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      try {
        await saveLeadOptions({ commodities: [...companyCommodities, trimmed] });
      } catch (err) {
        showNotification(err?.message || 'The product could not be saved. Please try again.', 'error');
        return;
      }
    }
    if (!form.products.includes(trimmed)) {
      setForm((prev) => ({ ...prev, products: [...prev.products, trimmed] }));
    }
    setCustomProductText('');
    setShowCustomProductInput(false);
    showNotification(`Commodity "${trimmed}" added for your whole team and selected!`, 'success');
  };

  // Remove commodity category handler (Owner only)
  const handleRemoveCommodity = async (prodToRemove) => {
    if (!isOwner || isStaff) {
      showNotification('Permission Denied: Only Company Owners/Admins can delete commodity categories.', 'error');
      return;
    }
    if (companyCommodities.includes(prodToRemove)) {
      if (companyCommodities.length <= 1) {
        showNotification('At least one commodity must remain in list', 'error');
        return;
      }
      try {
        await saveLeadOptions({ commodities: companyCommodities.filter((p) => p !== prodToRemove) });
      } catch (err) {
        showNotification(err?.message || 'The product could not be removed. Please try again.', 'error');
        return;
      }
    }
    setExtraCommodities((prev) => prev.filter((p) => p !== prodToRemove));
    if (form.products.includes(prodToRemove)) {
      setForm((prev) => ({ ...prev, products: prev.products.filter((p) => p !== prodToRemove) }));
    }
    showNotification(`Commodity "${prodToRemove}" removed from options for your whole team.`, 'info');
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
      if (field === 'platform') {
        const number = prev.whatsapp || prev.contacts?.[0]?.phone || '';
        const auto = linkFromPhone(value, number);
        const current = updated[index].url;
        if (auto && (!current || isPhoneLink(current))) updated[index].url = auto;
        else if (!auto && isPhoneLink(current)) updated[index].url = '';
      }
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
    const before = leads.find((l) => l.id === leadId);
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: newStage, status: newStage, lead_stage: newStage } : l))
    );
    try {
      await api.updateLead(leadId, { stage: newStage });
      showNotification(`Lead stage updated to "${newStage}"`, 'success');
    } catch (err) {
      console.warn('Failed to update stage on server:', err.message);
      if (before) setLeads((prev) => prev.map((l) => (l.id === leadId ? before : l)));
      showNotification(err?.message || 'Stage could not be changed.', 'error');
    }
  };

  // Open Create Modal
  const openCreate = () => {
    setIsSubmitting(false);
    setEditingLead(null);
    setExtraCommodities([]);
    setActiveFormTab('basic');
    setShowCustomProductInput(false);
    setCustomProductText('');
    setShowCustomIndustryInput(false);
    setCustomIndustryText('');
    setShowCustomPaymentInput(false);
    setCustomPaymentText('');
    setForm({
      ...initForm,
      assigned_to: isStaff ? (profile?.id || 'usr_staff') : (teamList[0]?.id || profile?.id || 'owner'),
      agent_name: isStaff ? (profile?.name || 'Staff Member') : (teamList[0]?.name || profile?.name || 'Owner'),
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
        lead.agent_id === profile?.id;
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
      ? lead.contacts.map((c) => {
          const parsed = parsePhoneNumber(c.phone || '', lead.country);
          return {
            ...c,
            phone: c.phone || '',
            country_code: c.country_code || (c.phone ? parsed.dialCode : ''),
          };
        })
      : [
          {
            name: lead.contact_person || '',
            phone: lead.phone || '',
            country_code: lead.phone ? parsePhoneNumber(lead.phone, lead.country).dialCode : '',
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

    setExtraCommodities(leadProducts);

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
      extra_whatsapp: Array.isArray(lead.extra_whatsapp) ? [...lead.extra_whatsapp] : [],
      website: lead.website || '',
      social_media: lead.social_media || '',
      social_links: leadSocialLinks,
      country: lead.country || '',
      lead_source: lead.source || 'Direct Inquiry',
      address: lead.address || '',
      state: lead.state || '',
      city: lead.city || '',
      pincode: lead.pincode || '',
      credit_rating: lead.credit_rating || 'AA',
      turnover: lead.turnover || '',
      stage: lead.stage || lead.status || lead.lead_stage || 'Requirement Understood',
      products: leadProducts,
      quantity: lead.quantity || 0,
      quantity_unit: lead.quantity_unit || (Number(lead.quantity) >= 1000 ? 'kg' : 'MT'),
      price: lead.price || 0,
      product_notes: exp.product_notes || lead.product_notes || '',
      incoterm: exp.incoterm || 'CIF',
      port_delivery: exp.port_delivery || '',
      payment_days: exp.payment_days || 'LC at Sight (Letter of Credit)',
      assigned_to: lead.assigned_to || profile?.id || '',
      agent_name: lead.agent_name || profile?.name || 'Self',
      created_by_id: lead.created_by_id || profile?.id || '',
      created_by_name: lead.created_by_name || profile?.name || 'Self',
      created_at: lead.created_at || new Date().toISOString(),
      follow_up_date: lead.follow_up_date || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      follow_up_time: toTimeInputValue(lead.follow_up_time),
      // Remark boxes start empty when editing: earlier remarks are listed under them, a new one is added with Enter
      today_remarks: '',
      next_follow_up_action: '',
      notes: lead.notes || '',
      tags: Array.isArray(lead.tags) ? lead.tags : [],
    });
    setTagInput('');
    setModalOpen(true);
  };

  // Open Details Modal
  const openDetails = (lead) => {
    setActiveDetailLead(lead);
    setDossierFollowUpDate(lead.follow_up_date || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
    setDossierFollowUpTime(lead.follow_up_time || '10:00');
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
    // Staff can swap a product for another, but not remove products from a lead
    if (editingLead && !fullEdit) {
      const before = (Array.isArray(editingLead.products) ? editingLead.products : String(editingLead.product || '').split(','))
        .map((p) => String(p || '').trim()).filter(Boolean).length;
      if (form.products.length < before) {
        alert(`You can replace a product with another one, but not remove it. Please keep at least ${before} product${before > 1 ? 's' : ''} selected (ask your company owner to remove one).`);
        document.getElementById('form-sec-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    // A new lead needs its first remark + planned action. An existing lead already has them (new ones are optional).
    if (!editingLead && (!form.today_remarks || !form.today_remarks.trim())) {
      alert("Today's Interaction / Discussion Remarks is mandatory! Please enter remarks.");
      return;
    }
    if (!editingLead && (!form.next_follow_up_action || !form.next_follow_up_action.trim())) {
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

      const leadPayload = {
        company_name: form.company_name,
        name: form.company_name,
        // Extra emails are sent only when the contact has (or had) them, so nothing changes for older leads
        contacts: (form.contacts || []).map((c) => {
          const out = c.extra_emails === undefined ? { ...c } : { ...c, extra_emails: c.extra_emails.map((e) => String(e || '').trim()).filter(Boolean) };
          if (Array.isArray(c.extra_phones)) out.extra_phones = c.extra_phones.map((p) => String(p || '').trim()).filter((p) => p.replace(/[^0-9]/g, '').length > 4);
          return out;
        }),
        contact_person: primary.name,
        email: primary.email,
        phone: primary.phone,
        whatsapp: form.whatsapp,
        ...((form.extra_whatsapp || []).length || Array.isArray(editingLead?.extra_whatsapp)
          ? { extra_whatsapp: (form.extra_whatsapp || []).filter((n) => String(n || '').replace(/[^0-9]/g, '').length > 4) }
          : {}),
        website: form.website,
        social_media: form.social_media || form.social_links?.[0]?.url || '',
        social_links: form.social_links || [],
        country: form.country,
        source: form.lead_source,
        address: form.address,
        state: String(form.state || '').trim(),
        city: String(form.city || '').trim(),
        pincode: String(form.pincode || '').trim(),
        tags: Array.isArray(form.tags) ? form.tags : [],
        stage: form.stage || (editingLead ? editingLead.stage : 'Lead Generation'),
        status: form.stage || (editingLead ? editingLead.stage : 'Lead Generation'),
        lead_stage: form.stage || (editingLead ? editingLead.stage : 'Lead Generation'),
        follow_up_date: form.follow_up_date,
        follow_up_time: form.follow_up_time || '10:00',
        today_remarks: form.today_remarks || '',
        next_follow_up_action: form.next_follow_up_action || '',
        notes: [
          form.today_remarks ? `[Today's Notes]: ${form.today_remarks}` : null,
          form.next_follow_up_action ? `[Planned Action on ${form.follow_up_date}]: ${form.next_follow_up_action}` : null,
          form.notes || null,
        ].filter(Boolean).join('\n') || form.notes || '',
        ...(fullEdit ? {
          type: form.type,
          industry_type: form.industry_type,
          credit_rating: form.credit_rating,
          turnover: form.turnover,
          sourcing_region: form.sourcing_region,
          legacy_industry_type: form.industry_type,
          products: form.products,
          product: form.products.join(', '),
          quantity: Number(form.quantity) || 0,
          quantity_unit: form.quantity_unit || 'MT',
          price: Number(form.price) || 0,
          value: Number(form.price) || 0,
          export_requirements: {
            industry_type: form.industry_type,
            incoterm: form.incoterm,
            port_delivery: form.port_delivery,
            payment_days: form.payment_days,
            product_notes: form.product_notes,
            quantity_unit: form.quantity_unit || 'MT',
          },
        } : {}),
        ...(isOwner ? {
          assigned_to: finalAssignedTo,
          agent_name: finalAgentName,
        } : {}),
        // Staff choose the commodity and quantity when they add a lead (price stays with the owner).
        // Sent only when something was filled in, so a lead without a product still saves as before.
        ...(!fullEdit && (editingLead || form.products.length > 0 || Number(form.quantity) > 0 || String(form.product_notes || '').trim()) ? {
          products: form.products,
          product: form.products.join(', '),
          quantity: Number(form.quantity) || 0,
          quantity_unit: form.quantity_unit || 'MT',
          export_requirements: {
            product_notes: form.product_notes,
            quantity_unit: form.quantity_unit || 'MT',
          },
        } : {}),
      };

      if (editingLead) {
        // Empty remark boxes must not wipe the remark already saved on the lead
        if (!String(leadPayload.today_remarks || '').trim()) delete leadPayload.today_remarks;
        if (!String(leadPayload.next_follow_up_action || '').trim()) delete leadPayload.next_follow_up_action;
        // A social row without a link is only a blank box in the form: never save it
        const linksOnly = (v) => (Array.isArray(v) ? v.filter((x) => String(x?.url || '').trim()) : v);
        leadPayload.social_links = linksOnly(leadPayload.social_links);
        if (!fullEdit) {
          // The form fills in a few things by itself (contact country code, WhatsApp from the first
          // phone, an empty social row). Staff can't change contact details, so don't send what they didn't touch.
          const STAFF_FIELDS = ['today_remarks', 'next_follow_up_action', 'follow_up_date', 'follow_up_time', 'notes', 'stage', 'status', 'lead_stage',
            'products', 'product', 'quantity', 'quantity_unit', 'export_requirements'];
          const tidy = (v) => {
            if (Array.isArray(v)) { const a = v.map(tidy).filter((x) => x !== undefined); return a.length ? a : undefined; }
            if (v && typeof v === 'object') {
              const o = {};
              Object.keys(v).sort().forEach((k) => { if (k === 'country_code') return; const t = tidy(v[k]); if (t !== undefined) o[k] = t; });
              return Object.keys(o).length ? o : undefined;
            }
            if (v === null || v === undefined) return undefined;
            const s = String(v).trim();
            return s === '' ? undefined : s;
          };
          const firstPhone = String(editingLead.contacts?.[0]?.phone || editingLead.phone || '').replace(/[^0-9]/g, '');
          Object.keys(leadPayload).forEach((k) => {
            if (STAFF_FIELDS.includes(k)) return;
            const autoWhatsApp = k === 'whatsapp' && !String(editingLead.whatsapp || '').trim()
              && String(leadPayload.whatsapp || '').replace(/[^0-9]/g, '') === firstPhone;
            const before = k === 'social_links' ? linksOnly(editingLead[k]) : editingLead[k];
            if (autoWhatsApp || JSON.stringify(tidy(leadPayload[k])) === JSON.stringify(tidy(before))) delete leadPayload[k];
          });
        }
        const res = await api.updateLead(editingLead.id, leadPayload);
        updateAndPersistLeads((prev) =>
          prev.map((l) => (l.id === editingLead.id ? { ...l, ...(res?.data || leadPayload) } : l))
        );
        showNotification('Lead updated successfully!', 'success');
      } else {
        const res = await api.createLead(leadPayload);
        const newRecord = res.data;
        if (!newRecord?.id) throw new Error('Lead creation response did not include a lead ID.');
        // Avoid duplicate in local state if already present
        updateAndPersistLeads((prev) => {
          if (prev.some((l) => l.id === newRecord.id)) return prev;
          return [newRecord, ...prev];
        });
        showNotification('Trade lead created successfully!', 'success');
      }

      setModalOpen(false);
    } catch (err) {
      console.error('Error saving lead:', err);
      showNotification(err?.message || 'Error saving lead. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Lead form: Enter in a remark box saves ONLY the remark and lists it below.
  // The lead itself is saved only with the Update button.
  const [isSavingRemark, setIsSavingRemark] = useState(false);
  const handleSaveRemarkOnly = async () => {
    if (!editingLead || isSavingRemark) return;
    const today = String(form.today_remarks || '').trim();
    const planned = String(form.next_follow_up_action || '').trim();
    if (!today && !planned) return;
    if (!form.follow_up_date) {
      showNotification('Please select the next follow-up date first.', 'error');
      return;
    }
    setIsSavingRemark(true);
    try {
      const changes = {
        ...(today ? { today_remarks: today } : {}),
        ...(planned ? { next_follow_up_action: planned } : {}),
      };
      if (form.follow_up_date !== (editingLead.follow_up_date || '')) changes.follow_up_date = form.follow_up_date;
      const formTime = form.follow_up_time || '10:00';
      if (formTime !== toTimeInputValue(editingLead.follow_up_time)) changes.follow_up_time = formTime;
      const res = await api.updateLead(editingLead.id, changes);
      const saved = res?.data;
      if (saved?.id) {
        updateAndPersistLeads((prev) => prev.map((l) => (l.id === saved.id ? { ...l, ...saved } : l)));
        setEditingLead((prev) => (prev ? { ...prev, ...saved } : prev));
      }
      setForm((prev) => ({ ...prev, today_remarks: '', next_follow_up_action: '' }));
      showNotification('Remark saved.', 'success');
    } catch (err) {
      showNotification(err?.message || 'The remark could not be saved. Please try again.', 'error');
    } finally {
      setIsSavingRemark(false);
    }
  };
  // Add Lead form: Enter moves to the next box (nothing is saved until the Save button)
  const focusNextOnEnter = (nextId) => runOnEnter(() => document.getElementById(nextId)?.focus());

  // "Daily Activity & Interactions": the same panel in the View window and in the Edit form
  const renderActivityPanel = (lead) => { const history = activityEntries(lead); return (
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
          {history.length} logged activities
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
          onKeyDown={runOnEnter(() => handleLogDossierActivity(lead))}
          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">
            Tick an activity above — a note on its own is not saved.
          </span>
          <button
            type="button"
            onClick={() => handleLogDossierActivity(lead)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <Send size={12} /> Log Activity
          </button>
        </div>
      </div>

      {/* Campaign mails sent to this lead (owner only; hidden when there are none) */}
      {isOwner && <LeadEmailHistory leadId={lead.id} />}
      {isOwner && <LeadAiCalls leadId={lead.id} />}
      {(isOwner || profile?.permissions?.quotations === true) && <LeadDocuments leadId={lead.id} />}

      {/* Activity History Timeline */}
      {history.length > 0 && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <History size={13} className="text-slate-400" />
            <span>Activity history ({history.length})</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {history.map((hist, hIdx) => (
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
  ); };

  // Delete Lead - Owner only
  const handleDelete = async (id) => {
    if (!isOwner) {
      alert('Permission Denied: Only Company Owners can delete trade leads.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this export trade lead?')) {
      try {
        await api.deleteLead(id);
      } catch (err) {
        showNotification(err?.message || 'Lead could not be deleted.', 'error');
        return;
      }
      setLeads((prev) => prev.filter((l) => l.id !== id));
      if (activeDetailLead?.id === id) setDetailModalOpen(false);
      showNotification('Trade lead deleted successfully.', 'success');
    }
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
      'Address',
      'State / Province',
      'Area / City',
      'Pin Code',
      'Contact Person',
      'Phone',
      'Email',
      'WhatsApp / Zalo',
      'Website',
      'Products',
      'Quantity',
      'Unit',
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
      escapeCSV(l.address || ''),
      escapeCSV(l.state || ''),
      escapeCSV(l.city || ''),
      escapeCSV(l.pincode || ''),
      escapeCSV(l.contact_person || l.contacts?.[0]?.name || ''),
      escapeCSV(l.phone || l.contacts?.[0]?.phone || ''),
      escapeCSV(l.email || l.contacts?.[0]?.email || ''),
      escapeCSV(l.whatsapp || ''),
      escapeCSV(l.website || ''),
      escapeCSV(Array.isArray(l.products) ? l.products.join(', ') : (l.product || '')),
      escapeCSV(l.quantity || 0),
      escapeCSV(l.quantity_unit || (Number(l.quantity) >= 1000 ? 'kg' : 'MT')),
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

  // Filter & Sort Logic
  // Every tag used on the leads this person can see, with how many leads carry it
  const tagOptions = Object.values(
    leads.reduce((acc, l) => {
      (Array.isArray(l.tags) ? l.tags : []).forEach((t) => {
        const k = String(t).trim().toLowerCase();
        if (!k) return;
        acc[k] = acc[k] || { tag: String(t).trim(), count: 0 };
        acc[k].count += 1;
      });
      return acc;
    }, {})
  ).sort((a, b) => a.tag.localeCompare(b.tag));
  const noContactCount = leads.filter((l) => l.no_contact_alert).length;
  const filteredLeads = leads
    .filter((lead) => {
      if (filterNoContact && !lead.no_contact_alert) return false;
      // Role Isolation for Staff: Staff can ONLY see their own leads!
      if (isStaff && profile?.data_scope !== 'all') {
        const isAssignedToMe =
          lead.assigned_to === profile?.id ||
          lead.assigned_to === profile?.name ||
          lead.agent_name === profile?.name ||
          lead.agent_id === profile?.id;
        if (!isAssignedToMe) return false;
      } else if (filterStaff) {
        // Owner filtering by specific staff member 
        // Filter by the staff member the lead is assigned to (by id; the creator stays unchanged)
        const member = filterStaff === profile?.id ? profile : teamList.find((t) => t.id === filterStaff);
        const matchesStaff =
          lead.assigned_to === filterStaff ||
          (!lead.assigned_to && member?.name && lead.agent_name === member.name);
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
        const matchesTags = Array.isArray(lead.tags) && lead.tags.some((t) => String(t).toLowerCase().includes(q));
        if (!matchesName && !matchesContact && !matchesEmail && !matchesCountry && !matchesProduct && !matchesTags) return false;
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

      // Tag (exact, ignoring case)
      if (filterTag && !(Array.isArray(lead.tags) && lead.tags.some((t) => String(t).trim().toLowerCase() === filterTag.toLowerCase()))) {
        return false;
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
  const totalVolumeMT = filteredLeads.reduce(
    (sum, l) => sum + getQuantityInMT(l.quantity, l.quantity_unit || (Number(l.quantity) >= 1000 ? 'kg' : 'MT')),
    0
  );
  const totalValueLakhs = totalValue / 100000;
  const atRiskLeadsList = filteredLeads.filter((l) => {
    const isClosed = ['Closed Won', 'Closed Lost'].includes(l.stage || l.status);
    if (isClosed) return false;
    return l.follow_up_date && String(l.follow_up_date).split('T')[0] < localDay(0);
  });
  const atRiskValueUSD = atRiskLeadsList.reduce((sum, l) => sum + (Number(l.price) || Number(l.value) || 0), 0);

  return (
    <div className="w-full space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
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
            {isStaff && profile?.data_scope === 'all'
              ? `Showing all company leads (you have full-company view). You can update only leads assigned to you.`
              : isStaff
              ? `Showing exclusively leads assigned to you (${profile?.name || 'Staff'}). Data isolated from other employees.`
              : 'Manage global commodity buyers, turmeric, chillies, DDGS, and export shipping requirements across all staff.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
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
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-800 shadow-xs transition-all cursor-pointer"
            title="Import multiple leads via CSV spreadsheet"
          >
            <Upload size={14} className="text-emerald-700" />
            <span>Bulk Import</span>
          </button>

          {/* Manual Add Lead */}
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Dynamic Notification Toast */}
      {notification && (
        <div
          role={notification.type === 'success' ? 'status' : 'alert'}
          data-lead-toast={notification.type}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[80] w-[calc(100%-2rem)] max-w-xl shadow-lg p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-fadeIn ${
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
            <span>{isStaff ? (profile?.name || 'Staff') : `${teamList.length} Staff`}</span>
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
                  onClick={() => { setFromDate(localDay(0)); setToDate(localDay(0)); }}
                  className={`px-2 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    fromDate === localDay(0) && toDate === localDay(0)
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => { setFromDate(localDay(-6)); setToDate(localDay(0)); }}
                  className={`px-2 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    fromDate === localDay(-6) && toDate === localDay(0)
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  onClick={() => { setFromDate(monthStart()); setToDate(localDay(0)); }}
                  className={`px-2 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    fromDate === monthStart() && toDate === localDay(0)
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
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isOwner ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-2.5 pt-2 border-t border-slate-100`}>
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
            {companyCommodities.map((p) => (
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

          <select
            id="leads-filter-tag"
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            aria-label="Filter by tag"
            className={`w-full px-3 py-2 text-xs font-medium border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${filterTag ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-50/70 border-slate-200 text-slate-700'}`}
          >
            <option value="">{tagOptions.length ? 'All Tags' : 'No tags yet'}</option>
            {tagOptions.map((t) => (
              <option key={t.tag} value={t.tag}>
                #{t.tag} ({t.count})
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
                <option key={tm.id} value={tm.id}>
                  {tm.name} ({tm.department || tm.role || 'Staff'})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Buyers nobody has talked to for 7+ days */}
      {(noContactCount > 0 || filterNoContact) && (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 rounded-2xl border text-xs font-semibold ${filterNoContact ? 'bg-rose-600 border-rose-600 text-white' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <span>
            ⚠️ {noContactCount} {noContactCount === 1 ? 'buyer has' : 'buyers have'} had no contact for 7+ days. Call or write a remark today so no buyer is lost.
          </span>
          <button
            type="button"
            onClick={() => setFilterNoContact((v) => !v)}
            className={`px-3 py-1.5 rounded-xl font-bold shrink-0 cursor-pointer ${filterNoContact ? 'bg-white text-rose-700' : 'bg-rose-600 text-white hover:bg-rose-700'}`}
          >
            {filterNoContact ? 'Show all leads' : 'Show only these'}
          </button>
        </div>
      )}

      {/* Leads Table & Mobile View Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Company & Country</th>
                <th className="py-3.5 px-4">Contact Person</th>
                <th className="py-3.5 px-4">Products</th>
                <th className="py-3.5 px-4">Quantity / Deal</th>
                <th className="py-3.5 px-4">Created By & Date</th>
                <th className="py-3.5 px-4">Follow-Up</th>
                <th className="py-3.5 px-4 text-center">Stage</th>
                <th className="py-3 px-4 text-right sticky right-0 bg-slate-50 z-[1] shadow-[-8px_0_12px_-10px_rgba(16,24,40,0.15)]">Actions</th>
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
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group border-b border-slate-100 last:border-0"
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
                        {Array.isArray(lead.tags) && lead.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {lead.tags.slice(0, 3).map((t) => (
                              <span key={t} className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                #{t}
                              </span>
                            ))}
                            {lead.tags.length > 3 && <span className="text-[9px] text-slate-400">+{lead.tags.length - 3}</span>}
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
                              <MessageCircle size={10} /> WA / Zalo
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
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                          <span>
                            {Number(lead.quantity).toLocaleString()}{' '}
                            <span className="text-emerald-700 dark:text-emerald-300 font-extrabold text-[11px] bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                              {lead.quantity_unit || (Number(lead.quantity) >= 1000 ? 'kg' : 'MT')}
                            </span>
                          </span>
                        </div>
                        {(() => {
                          const val = Number(lead.price) || Number(lead.value) || 0;
                          const unit = lead.quantity_unit || (Number(lead.quantity) >= 1000 ? 'kg' : 'MT');
                          const mt = getQuantityInMT(lead.quantity, unit);
                          return (
                            <div className="mt-0.5">
                              <div className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <span>${val.toLocaleString('en-US')}</span>
                                {mt > 0 && unit.toLowerCase() !== 'mt' && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    • {mt.toFixed(1)} MT
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Created By & Date (Requirement 4 & 5: Assigned rep replaced with Created By & Date) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center text-[10px] font-black shrink-0">
                            {(lead.created_by_name || lead.agent_name || '?')[0]?.toUpperCase()}
                          </span>
                          <span className="truncate max-w-[125px]">{lead.created_by_name || lead.agent_name || 'Unknown'}</span>
                        </div>
                        {lead.agent_name && lead.created_by_name && lead.agent_name !== lead.created_by_name && lead.agent_name !== 'Unassigned' && (
                          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 truncate max-w-[150px]" title="Currently assigned to">
                            → Assigned: {lead.agent_name}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                          <Calendar size={10} className="text-slate-400" />
                          <span>
                            {lead.created_at
                              ? new Date(lead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
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
                              <div className="flex items-center gap-1.5">
                                <Calendar size={12} className="text-slate-400" />
                                <span className="text-[11px] font-semibold">{lead.follow_up_date || '—'}</span>
                                {lead.follow_up_time && (
                                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded font-bold border border-emerald-200/60 flex items-center gap-0.5">
                                    <Clock size={9} />
                                    <span>{lead.follow_up_time}</span>
                                  </span>
                                )}
                              </div>
                              {lastContactBadge(lead) && (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${lastContactBadge(lead).cls}`} title={lead.last_contact_type || ''}>
                                  {lastContactBadge(lead).alert ? '⚠ ' : ''}{lastContactBadge(lead).text}
                                </span>
                              )}
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
                      <td className="py-3.5 px-4 text-right sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 z-[1] shadow-[-8px_0_12px_-10px_rgba(16,24,40,0.15)]">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => openDetails(lead)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                            title="View Full Lead Specifications & Dossier"
                          >
                            <Eye size={12} /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(lead)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 dark:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
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
                          {Number(lead.quantity).toLocaleString()}{' '}
                          <span className="text-emerald-700 dark:text-emerald-400 font-extrabold text-[10px]">
                            {lead.quantity_unit || (Number(lead.quantity) >= 1000 ? 'kg' : 'MT')}
                          </span>
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
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-slate-400" />
                      <span>{lead.follow_up_date || 'dd-mm-yyyy'}</span>
                      {lead.follow_up_time && (
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded font-bold border border-emerald-200/60 flex items-center gap-0.5">
                          <Clock size={9} />
                          <span>{lead.follow_up_time}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {lastContactBadge(lead) && (
                    <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${lastContactBadge(lead).cls}`}>
                      {lastContactBadge(lead).alert ? '⚠ ' : ''}{lastContactBadge(lead).text}
                    </div>
                  )}

                  {/* Creator Info (Requirement 4 & 5) & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                    <div className="text-[10px]">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Created by: {lead.created_by_name || lead.agent_name || 'Unknown'}
                      </span>
                      <span className="text-slate-400 block">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
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
            {editingLead && (
              <button
                type="button"
                onClick={() => document.getElementById('form-sec-activity')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <History size={13} className="text-indigo-600" />
                <span>5. Activity</span>
              </button>
            )}
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
              {fullEdit && <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Trade Type <span className="text-rose-500 font-bold">*</span>
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
              </div>}

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
              {fullEdit && <div className="bg-slate-50/90 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
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
              </div>}

              {/* Lead Source & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lead Source</label>
                  <select
                    value={form.lead_source}
                    onChange={(e) => setForm({ ...form, lead_source: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                  >
                    {withCurrent(LEAD_SOURCES, form.lead_source).map((s) => (
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

              {/* Marketing Tags (optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tags <span className="font-normal text-slate-400">(optional, for email marketing)</span>
                </label>
                <div className="flex flex-wrap items-center gap-1.5 w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500">
                  {(form.tags || []).map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {t}
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, tags: (form.tags || []).filter((x) => x !== t) })}
                        className="text-emerald-500 hover:text-rose-500 cursor-pointer"
                        aria-label={`Remove tag ${t}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <datalist id="lead-tag-suggestions">
                    {tagOptions.filter((t) => !(form.tags || []).some((x) => x.toLowerCase() === t.tag.toLowerCase())).map((t) => <option key={t.tag} value={t.tag} />)}
                  </datalist>
                  <input
                    type="text"
                    list="lead-tag-suggestions"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const clean = tagInput.trim().replace(/,+$/, '');
                        if (clean && !(form.tags || []).some((x) => x.toLowerCase() === clean.toLowerCase())) {
                          setForm({ ...form, tags: [...(form.tags || []), clean] });
                        }
                        setTagInput('');
                      } else if (e.key === 'Backspace' && !tagInput && (form.tags || []).length > 0) {
                        setForm({ ...form, tags: (form.tags || []).slice(0, -1) });
                      }
                    }}
                    onBlur={() => {
                      const clean = tagInput.trim().replace(/,+$/, '');
                      if (clean && !(form.tags || []).some((x) => x.toLowerCase() === clean.toLowerCase())) {
                        setForm({ ...form, tags: [...(form.tags || []), clean] });
                      }
                      setTagInput('');
                    }}
                    placeholder={(form.tags || []).length ? 'Add another…' : 'e.g. turmeric-buyer, dubai, hot — press Enter'}
                    className="flex-1 min-w-[140px] text-xs bg-transparent outline-none py-0.5"
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

              {/* State / City / Pin code: three across when there is room, wrapping on narrow screens */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-700 mb-1">State / Province</label>
                  <input
                    type="text"
                    maxLength={80}
                    placeholder="e.g. Dubai, Maharashtra"
                    value={form.state || ''}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Area / City</label>
                  <input
                    type="text"
                    maxLength={80}
                    placeholder="e.g. Al Quoz, Mumbai"
                    value={form.city || ''}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pin Code</label>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="e.g. 400001"
                    value={form.pincode || ''}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
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
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Tariq Mansoor"
                          value={contact.name}
                          onChange={(e) => handleContactChange(cIdx, 'name', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Phone Number
                        </label>
                        <PhoneInputWithCountry
                          value={contact.phone}
                          countryCode={contact.country_code}
                          defaultCountry={form.country}
                          onChange={(fullPhone, dialCode) => {
                            const before = form.contacts[cIdx]?.phone || '';
                            const updated = form.contacts.map((c, j) => (j === cIdx ? { ...c, phone: fullPhone, country_code: dialCode } : c));
                            const next = { ...form, contacts: updated };
                            // First contact's phone = the WhatsApp / Zalo number, unless someone typed a different one
                            if (cIdx === 0 && (!form.whatsapp || form.whatsapp === before)) {
                              next.whatsapp = fullPhone;
                              next.social_links = (form.social_links || []).map((l) => (l && (!l.url || isPhoneLink(l.url)) && linkFromPhone(l.platform, fullPhone) ? { ...l, url: linkFromPhone(l.platform, fullPhone) } : l));
                            }
                            setForm(next);
                          }}
                          placeholder="e.g. 11 268 8960"
                        />
                      </div>
                    </div>

                    {/* Extra Phones */}
                    {contact.extra_phones && contact.extra_phones.map((ext, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-2">
                        <div className="flex-1">
                          <PhoneInputWithCountry
                            value={ext}
                            defaultCountry={contact.country_code || form.country}
                            onChange={(fullPhone) => handleExtraPhoneChange(cIdx, pIdx, fullPhone)}
                            placeholder={`Alternate phone #${pIdx + 2}`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExtraPhone(cIdx, pIdx)}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl cursor-pointer transition-colors"
                          title="Remove phone number"
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

                    {/* More email addresses for this person */}
                    {(contact.extra_emails || []).map((em, eIdx) => (
                      <div key={eIdx} className="flex items-center gap-2" data-extra-email>
                        <input
                          type="email"
                          placeholder={`Another email #${eIdx + 2}`}
                          value={em}
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((f) => ({ ...f, contacts: f.contacts.map((c, j) => (j === cIdx ? { ...c, extra_emails: (c.extra_emails || []).map((x, k) => (k === eIdx ? v : x)) } : c)) }));
                          }}
                          className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, contacts: f.contacts.map((c, j) => (j === cIdx ? { ...c, extra_emails: (c.extra_emails || []).filter((_, k) => k !== eIdx) } : c)) }))}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl cursor-pointer transition-colors"
                          title="Remove email"
                          aria-label="Remove email"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {(contact.extra_emails || []).length < 5 && (
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, contacts: f.contacts.map((c, j) => (j === cIdx ? { ...c, extra_emails: [...(c.extra_emails || []), ''] } : c)) }))}
                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} /> Add another email
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Direct WhatsApp Field */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <span>📱 Direct WhatsApp / Zalo Number</span>
                  <span className="text-[10px] text-slate-400 font-normal">(With country code)</span>
                </label>
                <div className="w-full sm:max-w-md">
                  <PhoneInputWithCountry
                    value={form.whatsapp}
                    defaultCountry={form.country}
                    onChange={(fullPhone) => setForm({ ...form, whatsapp: fullPhone })}
                    placeholder="e.g. 50 892 4110"
                  />
                </div>
                {(form.extra_whatsapp || []).map((num, wIdx) => (
                  <div key={wIdx} className="flex items-center gap-2 mt-2 w-full sm:max-w-md" data-extra-whatsapp>
                    <div className="flex-1 min-w-0">
                      <PhoneInputWithCountry
                        value={num}
                        defaultCountry={form.country}
                        onChange={(fullPhone) => setForm((f) => ({ ...f, extra_whatsapp: (f.extra_whatsapp || []).map((x, j) => (j === wIdx ? fullPhone : x)) }))}
                        placeholder={`WhatsApp / Zalo #${wIdx + 2}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, extra_whatsapp: (f.extra_whatsapp || []).filter((_, j) => j !== wIdx) }))}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl cursor-pointer transition-colors"
                      title="Remove this number"
                      aria-label="Remove WhatsApp / Zalo number"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {(form.extra_whatsapp || []).length < 5 && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, extra_whatsapp: [...(f.extra_whatsapp || []), ''] }))}
                    className="mt-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} /> Add another WhatsApp / Zalo number
                  </button>
                )}
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
                      (LinkedIn, Instagram, WeChat, Zalo, Line, Telegram, etc.)
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
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none font-semibold text-slate-800 dark:text-slate-100"
                          >
                            {SOCIAL_PLATFORMS.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.icon} {p.label}
                              </option>
                            ))}
                          </select>
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
            {<div id="form-sec-products" className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs">
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
                    Target Commodities (Select all that apply)
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
                {editingLead && !fullEdit && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 -mt-1" data-staff-product-note>
                    You can swap a product for another one or add more, but not remove products. To swap, pick the new one, then untick the old one.
                  </p>
                )}

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
                        {!isStaff && isOwner && (
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
                            title={`Delete / Remove "${prod}" category (Owner only)`}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Volume Quantity & Unit
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      Commodity Volume
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={form.quantity_unit === 'MT' || form.quantity_unit === 'Tonnes' ? "e.g. 50" : "e.g. 50000"}
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none font-semibold text-slate-900 dark:text-white"
                      />
                    </div>
                    <select
                      value={form.quantity_unit || 'MT'}
                      onChange={(e) => setForm({ ...form, quantity_unit: e.target.value })}
                      className="w-36 px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none font-bold text-slate-800 dark:text-slate-100 cursor-pointer shadow-xs shrink-0"
                    >
                      {QUANTITY_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 inline-block"></span>
                    <span>{formatQuantityEquivalent(form.quantity, form.quantity_unit || 'MT')}</span>
                  </span>
                </div>

                {fullEdit && <div>
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
                </div>}
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
            }

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
              {fullEdit && <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              </div>}

              {/* Lead Pipeline Stage + Assigned Rep (side by side) */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
               <div className="min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[22px]">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0">
                    Lead Pipeline Stage <span className="text-rose-500">*</span>
                  </label>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border truncate min-w-0 ${getStatusBadge(form.stage)}`}>
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
                  Current stage of this lead. Can also be changed from the leads table.
                </p>
               </div>

                  <div className="min-w-0">
                    <label className="flex items-center min-h-[22px] text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      <span>Assign Rep / Staff <span className="text-rose-500">*</span></span>
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
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 font-semibold text-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none cursor-pointer"
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
                        className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-300 font-semibold text-slate-700 rounded-xl cursor-not-allowed"
                      />
                    )}
                    <p className="text-[11px] text-slate-500 mt-1">
                      {isOwner ? 'Who will handle this lead.' : 'Leads you add are assigned to you.'}
                    </p>
                  </div>
              </div>

              {/* Next Follow-up + Remarks Card (two columns in both rows) */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="block text-xs font-bold text-emerald-950 dark:text-emerald-200 mb-1 flex items-center gap-1">
                      <Calendar size={12} className="text-emerald-600" />
                      <span>Next Follow-up Date <span className="text-rose-500 font-extrabold">* (Mandatory)</span></span>
                    </label>
                    <input
                      type="date"
                      required
                      value={form.follow_up_date}
                      onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
                      className="block w-full min-w-0 max-w-full h-[38px] box-border appearance-none text-left [&::-webkit-date-and-time-value]:text-left px-3 py-2 text-xs bg-white border border-emerald-400 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-xs font-bold text-emerald-950 dark:text-emerald-200 mb-1 flex items-center gap-1">
                      <Clock size={12} className="text-emerald-600" />
                      <span>Call Timing <span className="text-rose-500 font-extrabold">* (Mandatory)</span></span>
                    </label>
                    <input
                      type="time"
                      required
                      value={form.follow_up_time || '10:00'}
                      onChange={(e) => setForm({ ...form, follow_up_time: e.target.value })}
                      className="block w-full min-w-0 max-w-full h-[38px] box-border appearance-none text-left [&::-webkit-date-and-time-value]:text-left px-3 py-2 text-xs bg-white border border-emerald-400 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-800 dark:text-slate-100"
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
                      id="lead-form-today-remark"
                      rows={2}
                      required={!editingLead}
                      placeholder="What was discussed / decided on today's call or meeting with the client..."
                      value={form.today_remarks}
                      onChange={(e) => setForm({ ...form, today_remarks: e.target.value })}
                      onKeyDown={editingLead ? runOnEnter(handleSaveRemarkOnly) : focusNextOnEnter('lead-form-planned-action')}
                      className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-950 dark:text-emerald-200 mb-1">
                      Planned Action for Next Follow-up Date <span className="text-rose-500 font-extrabold">* (Mandatory)</span>
                    </label>
                    <textarea
                      id="lead-form-planned-action"
                      rows={2}
                      required={!editingLead}
                      placeholder="What specific action needs to be taken on scheduled date (e.g., share quote, verify LC)..."
                      value={form.next_follow_up_action}
                      onChange={(e) => setForm({ ...form, next_follow_up_action: e.target.value })}
                      onKeyDown={editingLead ? runOnEnter(handleSaveRemarkOnly) : focusNextOnEnter('lead-form-save-button')}
                      className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Editing: Enter saves the remark and lists it here. The lead is saved only with the Update button. */}
                {editingLead && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-emerald-900/80 dark:text-emerald-200/80 font-medium">
                      {isSavingRemark
                        ? 'Saving remark…'
                        : 'Press Enter to save the remark below (Shift+Enter = new line). Other lead details are saved only with the Update button.'}
                    </p>
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-white/80 dark:bg-slate-900/40 max-h-44 overflow-y-auto divide-y divide-emerald-100 dark:divide-emerald-900/50">
                      {(editingLead.previous_remarks || []).length === 0 ? (
                        <div className="px-3 py-2.5 text-[11px] text-slate-400 font-medium">No remarks saved yet.</div>
                      ) : (
                        (editingLead.previous_remarks || []).slice(0, 30).map((rem, rIdx) => {
                          const when = rem.date && !Number.isNaN(Date.parse(rem.date)) && /^\d{4}-\d{2}-\d{2}T/.test(String(rem.date))
                            ? new Date(rem.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : (rem.date || rem.timestamp || '');
                          return (
                            <div key={rIdx} className="px-3 py-2 text-[11px] space-y-0.5">
                              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 font-semibold">
                                <span className="text-slate-600 dark:text-slate-300 font-bold truncate">{rem.author || 'Team member'}</span>
                                <span className="shrink-0">{when}</span>
                              </div>
                              {rem.today_remark || rem.planned_action ? (
                                <>
                                  {rem.today_remark && (
                                    <p className="text-slate-800 dark:text-slate-100 font-medium whitespace-pre-wrap">{rem.today_remark}</p>
                                  )}
                                  {rem.planned_action && (
                                    <p className="text-emerald-800 dark:text-emerald-300 font-medium whitespace-pre-wrap">
                                      Next{rem.follow_up_date ? ` (${rem.follow_up_date})` : ''}: {rem.planned_action}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="text-slate-800 dark:text-slate-100 font-medium whitespace-pre-wrap">{rem.remark || rem.text}</p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Same activity log as the View window */}
          {editingLead && <div id="form-sec-activity" className="mt-5">{renderActivityPanel(editingLead)}</div>}

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
              id="lead-form-save-button"
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

      {/* BULK IMPORT: format -> upload -> review & import */}
      <BulkImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        isOwner={isOwner}
        profile={profile}
        teamList={teamList}
        commodities={companyCommodities}
        existingNames={leads.map((l) => l.company_name || l.name)}
        onImported={(added) => {
          setLeads((prev) => [...added, ...prev]);
          showNotification(`${added.length} lead${added.length === 1 ? '' : 's'} imported.`, 'success');
        }}
      />

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
                  <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${String(activeDetailLead.follow_up_date).split('T')[0] < new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0] ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    ⏰ Follow-up: {new Date(activeDetailLead.follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} {String(activeDetailLead.follow_up_date).split('T')[0] < new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0] ? '· Overdue' : ''}
                  </span>
                )}
                {lastContactBadge(activeDetailLead) && (
                  <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${lastContactBadge(activeDetailLead).cls}`} title={activeDetailLead.last_contact_type || ''}>
                    {lastContactBadge(activeDetailLead).alert ? '⚠ ' : '💬 '}{lastContactBadge(activeDetailLead).text}
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
                    : (activeDetailLead.product ? activeDetailLead.product.split(',').map(p => p.trim()) : [])
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
                  const unit = activeDetailLead.quantity_unit || (dealQty >= 1000 ? 'kg' : 'MT');
                  const mt = getQuantityInMT(dealQty, unit);
                  return (
                    <div className="mt-1">
                      <div className="text-base font-black text-emerald-950 dark:text-emerald-200">
                        {dealVal > 0 ? `$${dealVal.toLocaleString('en-US')}` : '$0 (Unpriced inquiry)'}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        {dealQty.toLocaleString()} {unit}{' '}
                        {dealQty > 0 && unit.toLowerCase() !== 'mt' && `(≈ ${mt.toFixed(1)} MT)`}
                        {dealQty > 0 && unit.toLowerCase() === 'mt' && `(≈ ${(mt * 1000).toLocaleString()} kg)`}
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
                  {activeDetailLead.country} • Source: <strong className="text-slate-700 dark:text-slate-300">{activeDetailLead.source || activeDetailLead.lead_source || '—'}</strong>
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
                            {chatLinks(c.phone) && (
                              <span className="flex items-center gap-2 shrink-0">
                                <a
                                  href={chatLinks(c.phone).whatsapp}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5"
                                >
                                  <MessageCircle size={10} /> WhatsApp
                                </a>
                                <a
                                  href={chatLinks(c.phone).zalo}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                                >
                                  <MessageCircle size={10} /> Zalo
                                </a>
                              </span>
                            )}
                          </div>
                        )}
                        {c.email && (
                          <div>
                            <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline">
                              ✉️ {c.email}
                            </a>
                          </div>
                        )}
                        {(c.extra_emails || []).filter(Boolean).map((em) => (
                          <div key={em}>
                            <a href={`mailto:${em}`} className="text-blue-600 hover:underline">
                              ✉️ {em}
                            </a>
                          </div>
                        ))}
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
                    {[activeDetailLead.contact_person, activeDetailLead.phone, activeDetailLead.email].filter(Boolean).length
                      ? (<><strong>{activeDetailLead.contact_person || '—'}</strong>{activeDetailLead.phone ? ` • ${activeDetailLead.phone}` : ''}{activeDetailLead.email ? ` • ${activeDetailLead.email}` : ''}</>)
                      : 'No contact person added yet.'}
                  </div>
                )}

                {/* Additional Company Profile */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 text-[11px] space-y-1.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200">Company Profile & Location</div>
                  {[activeDetailLead.whatsapp, ...(activeDetailLead.extra_whatsapp || [])].filter(Boolean).map((num, i) => (
                    <div key={`${num}-${i}`} className="text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-2">
                      <span><span className="font-semibold text-slate-700 dark:text-slate-300">WhatsApp / Zalo{i ? ` #${i + 1}` : ''}: </span>{num}</span>
                      {chatLinks(num) && (
                        <>
                          <a href={chatLinks(num).whatsapp} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-emerald-600 hover:underline">WhatsApp</a>
                          <a href={chatLinks(num).zalo} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 hover:underline">Zalo</a>
                        </>
                      )}
                    </div>
                  ))}
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Address: </span>
                    {activeDetailLead.address || '—'}
                  </div>
                  {formatLocation(activeDetailLead) && (
                    <div className="text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">City / State / Pin: </span>
                      {formatLocation(activeDetailLead)}
                    </div>
                  )}
                  {activeDetailLead.website && (
                    <div className="flex items-center gap-1 pt-0.5">
                      <Globe size={11} className="text-slate-400" />
                      <a href={activeDetailLead.website.startsWith('http') ? activeDetailLead.website : `https://${activeDetailLead.website}`} target="_blank" rel="noreferrer" className="text-emerald-700 dark:text-emerald-400 font-bold underline">
                        {activeDetailLead.website}
                      </a>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-slate-500">
                    <span>Credit: <strong className="text-slate-700 dark:text-slate-300">{activeDetailLead.credit_rating || '—'}</strong></span>
                    <span>•</span>
                    <span>Turnover: <strong className="text-slate-700 dark:text-slate-300">{activeDetailLead.turnover || '—'}</strong></span>
                    <span>•</span>
                    <span>Industry: <strong className="text-slate-700 dark:text-slate-300">{activeDetailLead.industry_type || '—'}</strong></span>
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
                    {(activeDetailLead.created_by_name || activeDetailLead.agent_name || 'Unknown')[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>Created by:</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-black">
                        {activeDetailLead.created_by_name || activeDetailLead.agent_name || 'Unknown'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Record created on {activeDetailLead.created_at ? new Date(activeDetailLead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </div>
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Current Assignee</div>
                  <div className="font-extrabold text-indigo-700 dark:text-indigo-400 text-xs">
                    {(activeDetailLead.assigned_to && (activeDetailLead.assigned_to === profile?.id ? profile?.name : teamList.find((t) => t.id === activeDetailLead.assigned_to)?.name)) || activeDetailLead.agent_name || '—'}
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
                    value={activeDetailLead.assigned_to || profile?.id || ''}
                    onChange={async (e) => {
                      const newId = e.target.value;
                      const member = newId === profile?.id ? profile : teamList.find((t) => t.id === newId);
                      const before = activeDetailLead;
                      const updatedLead = { ...activeDetailLead, assigned_to: newId, agent_name: member?.name || activeDetailLead.agent_name };
                      setActiveDetailLead(updatedLead);
                      setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
                      try {
                        const res = await api.updateLead(updatedLead.id, { assigned_to: newId });
                        if (res && res.success === false) throw new Error(res.message);
                        const saved = res?.data ? { ...updatedLead, ...res.data } : updatedLead;
                        setActiveDetailLead(saved);
                        setLeads((prev) => prev.map((l) => (l.id === saved.id ? saved : l)));
                        showNotification(`Lead reassigned to ${member?.name || 'team member'}`, 'success');
                      } catch (err) {
                        setActiveDetailLead(before);
                        setLeads((prev) => prev.map((l) => (l.id === before.id ? before : l)));
                        showNotification(err?.message || 'Lead could not be reassigned.', 'error');
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  >
                    {[{ id: profile?.id || '', name: `${profile?.name || 'Owner'} (You)` }, ...teamList.map((t) => ({ id: t.id, name: t.name }))]
                      .filter((m) => m.id)
                      .filter((m, idx, self) => self.findIndex((x) => x.id === m.id) === idx)
                      .map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Only admins can reassign this lead to another user.</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={activeDetailLead.stage || activeDetailLead.status || 'Requirement Understood'}
                    onChange={async (e) => {
                      const newStage = e.target.value;
                      const before = activeDetailLead;
                      const updatedLead = { ...activeDetailLead, stage: newStage, status: newStage, lead_stage: newStage };
                      setActiveDetailLead(updatedLead);
                      setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
                      try {
                        const res = await api.updateLead(updatedLead.id, { stage: newStage });
                        if (res && res.success === false) throw new Error(res.message);
                        showNotification(`Lead status updated to ${newStage}`, 'success');
                      } catch (err) {
                        setActiveDetailLead(before);
                        setLeads((prev) => prev.map((l) => (l.id === before.id ? before : l)));
                        showNotification(err?.message || 'Status could not be changed.', 'error');
                      }
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
            {renderActivityPanel(activeDetailLead)}

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Calendar size={12} className="text-emerald-600" />
                      <span>Follow-up date <span className="text-rose-500 font-extrabold">* (Mandatory)</span></span>
                    </label>
                    <input
                      type="date"
                      required
                      value={dossierFollowUpDate || activeDetailLead.follow_up_date || ''}
                      onChange={(e) => setDossierFollowUpDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-emerald-400 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Clock size={12} className="text-emerald-600" />
                      <span>Call Timing <span className="text-rose-500 font-extrabold">* (Mandatory)</span></span>
                    </label>
                    <input
                      type="time"
                      required
                      value={dossierFollowUpTime || activeDetailLead.follow_up_time || '10:00'}
                      onChange={(e) => setDossierFollowUpTime(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-emerald-400 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Today's Interaction / Discussion Remarks <span className="text-rose-500 font-extrabold">* (Mandatory)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="What was discussed / done today (e.g. called client, discussed CIF price & sample)..."
                      value={dossierTodayRemark}
                      onChange={(e) => setDossierTodayRemark(e.target.value)}
                      onKeyDown={runOnEnter(handleSaveDossierFollowUp)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Planned Action for Next Follow-up Date <span className="text-rose-500 font-extrabold">* (Mandatory)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="What action to take on future date (e.g. share lab report, check payment receipt)..."
                      value={dossierFutureAction}
                      onChange={(e) => setDossierFutureAction(e.target.value)}
                      onKeyDown={runOnEnter(handleSaveDossierFollowUp)}
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
                    <p className="text-[10px] text-slate-400">Save the share link of a file from Google Drive, Dropbox or OneDrive</p>
                  </div>
                </div>
              </div>
              {isOwner && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={docLinkName}
                    onChange={(e) => setDocLinkName(e.target.value)}
                    placeholder="Document name (e.g. Proforma Invoice)"
                    className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <input
                    type="url"
                    value={docLinkUrl}
                    onChange={(e) => setDocLinkUrl(e.target.value)}
                    placeholder="Paste share link"
                    className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleUploadDossierDoc}
                    disabled={isUploadingDoc}
                    className="px-3 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-blue-200 dark:border-blue-800 shrink-0"
                  >
                    <Upload size={13} />
                    <span>{isUploadingDoc ? 'Saving...' : 'Add Document'}</span>
                  </button>
                </div>
              )}

              {/* Document List */}
              {activeDetailLead.documents && activeDetailLead.documents.length > 0 ? (
                <div className="space-y-2">
                  {activeDetailLead.documents.map((doc) => (
                    <div key={doc.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{doc.name}</div>
                          <div className="text-[10px] text-slate-400">{doc.url ? 'Link' : (doc.size || 'Name only, no file')} • Added {doc.upload_date || doc.uploaded_at || ''}{doc.added_by ? ` by ${doc.added_by}` : ''}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg cursor-pointer"
                            title="Open document"
                          >
                            <Download size={14} />
                          </a>
                        )}
                        {isOwner && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDossierDoc(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          title="Delete document"
                        >
                          <Trash2 size={14} />
                        </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400">
                  <Paperclip size={20} className="mx-auto text-slate-300 mb-1" />
                  <p className="text-xs font-semibold">No documents added yet.</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Add the share link of trade agreements, COA or lab test certificates</p>
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
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeDetailLead.export_requirements?.incoterm || activeDetailLead.incoterm || '—'}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <span className="text-slate-400 block text-[10px]">Port Delivery</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeDetailLead.export_requirements?.port_delivery || '—'}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                    <span className="text-slate-400 block text-[10px]">Payment Terms</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeDetailLead.export_requirements?.payment_days || activeDetailLead.payment_terms || '—'}</span>
                  </div>
                  {/* The owner's own specification fields (Protein %, Moisture %, ...) saved on this lead */}
                  {Object.entries(activeDetailLead.export_requirements?.custom_specs || {})
                    .filter(([, v]) => v)
                    .map(([name, v]) => (
                      <div key={name} className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                        <span className="text-slate-400 block text-[10px]">{name}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{String(v)}</span>
                      </div>
                    ))}
                  {activeDetailLead.export_requirements?.polish_level && (
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                      <span className="text-slate-400 block text-[10px]">Polish / Treatment</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{activeDetailLead.export_requirements.polish_level}</span>
                    </div>
                  )}
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
