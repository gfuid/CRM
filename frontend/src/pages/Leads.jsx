import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
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
  AlertCircle
} from 'lucide-react';

// Comprehensive Countries with Flags
export const COUNTRIES_WITH_FLAGS = [
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
];

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
export const INCOTERMS = ['FOB', 'CIF', 'CFR', 'EXW', 'FCA', 'CIP', 'DDP'];
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

export const INITIAL_LEADS = [
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
    case 'Requirement Understood':
      return 'bg-blue-50 text-blue-700 border-blue-200';
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

export default function Leads() {
  const { profile, isOwner, isStaff, getTeamMembers } = useAuth();
  const [leads, setLeads] = useState(INITIAL_LEADS);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeDetailLead, setActiveDetailLead] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [teamList, setTeamList] = useState([]);
  const [filterStaff, setFilterStaff] = useState('');

  // Filter Bar state
  const [filterType, setFilterType] = useState('created'); // 'created' | 'followup'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

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
    type: 'Export', // Type *
    company_name: '', // Company name *
    contacts: [{ ...defaultContact }], // Contact 1, 2, ...
    whatsapp: '',
    website: '',
    country: 'United Arab Emirates 🇦🇪', // All country add kro with flags
    lead_source: 'Direct Inquiry',
    address: '',
    // Company Profile
    credit_rating: 'AA',
    turnover: '',
    sourcing_region: '',
    legacy_industry_type: '',
    // Product
    products: ['Turmeric'], // Products *
    quantity: 0,
    price: 0, // Price ($)
    // Export requirements
    industry_type: 'Food & Spice Processing',
    material_type: 'Whole Raw',
    polish_level: 'Double Polish',
    min_curcumin: '3.5%',
    cultivation_methods: 'Conventional Cleaned',
    preferred_origin: '',
    quantity_needed_kg: '',
    max_price_inr: '',
    incoterm: 'CIF',
    port_delivery: '',
    payment_days: 'CAD on BL copy',
    // Assignment
    assigned_to: isStaff ? (profile?.id || 'staff') : 'usr_athish', // Assign to *
    agent_name: isStaff ? (profile?.name || 'Staff Member') : 'Athish',
    follow_up_date: '',
    notes: '',
  };

  const [form, setForm] = useState(initForm);

  // Load from API on mount
  useEffect(() => {
    loadLeads();
    if (isOwner && getTeamMembers) {
      getTeamMembers().then((res) => {
        if (Array.isArray(res) && res.length > 0) setTeamList(res);
      }).catch(() => {});
    }
  }, [profile?.id, isOwner]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const res = await api.getLeads();
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setLeads(res.data);
      }
    } catch {
      // Keep initialized leads on API failure
    } finally {
      setLoading(false);
    }
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
      if (current.length > 1) current.splice(idx, 1);
    } else {
      current.push(prod);
    }
    setForm({ ...form, products: current });
  };

  // Open Create Modal
  const openCreate = () => {
    setEditingLead(null);
    setForm({
      ...initForm,
      assigned_to: isStaff ? (profile?.id || 'usr_staff') : (teamList[0]?.id || 'usr_athish'),
      agent_name: isStaff ? (profile?.name || 'Staff Member') : (teamList[0]?.name || 'Athish'),
      follow_up_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEdit = (lead) => {
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
      : ['Turmeric'];

    const exp = lead.export_requirements || {};

    setForm({
      type: lead.type || 'Export',
      company_name: lead.company_name || lead.name || '',
      contacts: existingContacts,
      whatsapp: lead.whatsapp || lead.phone || '',
      website: lead.website || '',
      country: lead.country || 'India 🇮🇳',
      lead_source: lead.source || 'Direct Inquiry',
      address: lead.address || '',
      credit_rating: lead.credit_rating || 'AA',
      turnover: lead.turnover || '',
      sourcing_region: lead.sourcing_region || '',
      legacy_industry_type: lead.legacy_industry_type || '',
      products: leadProducts,
      quantity: lead.quantity || 0,
      price: lead.price || lead.value || 0,
      industry_type: exp.industry_type || 'Food & Spice Processing',
      material_type: exp.material_type || 'Whole Raw',
      polish_level: exp.polish_level || 'Double Polish',
      min_curcumin: exp.min_curcumin || '3.5%',
      cultivation_methods: exp.cultivation_method || 'Conventional Cleaned',
      preferred_origin: exp.preferred_origin || '',
      quantity_needed_kg: exp.quantity_needed_kg || lead.quantity || '',
      max_price_inr: exp.max_price_inr || '',
      incoterm: exp.incoterm || 'CIF',
      port_delivery: exp.port_delivery || '',
      payment_days: exp.payment_days || 'CAD on BL copy',
      assigned_to: lead.assigned_to || (isStaff ? profile?.id : 'usr_athish'),
      agent_name: lead.agent_name || (isStaff ? profile?.name : 'Athish'),
      follow_up_date: lead.follow_up_date || '',
      notes: lead.notes || '',
    });
    setModalOpen(true);
  };

  // Open Details Modal
  const openDetails = (lead) => {
    setActiveDetailLead(lead);
    setDetailModalOpen(true);
  };

  // Save Lead
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.company_name.trim()) {
      alert('Company name is required');
      return;
    }

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
      type: form.type,
      company_name: form.company_name,
      name: form.company_name,
      contacts: form.contacts,
      contact_person: primary.name,
      email: primary.email,
      phone: primary.phone,
      whatsapp: form.whatsapp,
      website: form.website,
      country: form.country,
      source: form.lead_source,
      address: form.address,
      credit_rating: form.credit_rating,
      turnover: form.turnover,
      sourcing_region: form.sourcing_region,
      legacy_industry_type: form.legacy_industry_type,
      products: form.products,
      product: form.products.join(', '),
      quantity: Number(form.quantity) || 0,
      price: Number(form.price) || 0,
      value: Number(form.price) || 0,
      stage: editingLead ? editingLead.stage : 'Requirement Understood',
      export_requirements: {
        industry_type: form.industry_type,
        material_type: form.material_type,
        polish_level: form.polish_level,
        min_curcumin: form.min_curcumin,
        cultivation_method: form.cultivation_methods,
        preferred_origin: form.preferred_origin,
        quantity_needed_kg: Number(form.quantity_needed_kg) || Number(form.quantity) || 0,
        max_price_inr: Number(form.max_price_inr) || 0,
        incoterm: form.incoterm,
        port_delivery: form.port_delivery,
        payment_days: form.payment_days,
      },
      assigned_to: finalAssignedTo,
      agent_name: finalAgentName,
      follow_up_date: form.follow_up_date,
      notes: form.notes,
    };

    if (editingLead) {
      try {
        await api.updateLead(editingLead.id, leadPayload);
      } catch {}
      setLeads((prev) =>
        prev.map((l) => (l.id === editingLead.id ? { ...l, ...leadPayload } : l))
      );
    } else {
      let created = null;
      try {
        const res = await api.createLead(leadPayload);
        if (res && res.data) created = res.data;
      } catch {}

      const newRecord = created || {
        ...leadPayload,
        id: 'lead_' + Date.now(),
        created_at: new Date().toISOString(),
      };
      setLeads((prev) => [newRecord, ...prev]);
    }

    setModalOpen(false);
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
        // Owner filtering by specific staff member
        const matchesStaff =
          lead.assigned_to === filterStaff ||
          lead.agent_name === filterStaff;
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

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <Plus size={16} /> Add New Export Lead
        </button>
      </div>

      {/* KPI Stats Overview (Clean Light Theme) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Pipeline Value</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            ${totalValue.toLocaleString()}
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
              <option value={profile?.id || 'usr_admin_1'}>{profile?.name || 'Owner'} (Direct)</option>
              {teamList.map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {tm.name} ({tm.department || tm.role || 'Staff'})
                </option>
              ))}
              {teamList.length === 0 && (
                <>
                  <option value="usr_athish">Athish (Commodity)</option>
                  <option value="usr_agent_1">Sarah Jenkins</option>
                  <option value="usr_agent_2">Michael Vance</option>
                </>
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
                <th className="py-3.5 px-4">Assigned Rep</th>
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
                    <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Company & Country */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{lead.company_name || lead.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Globe size={11} className="text-slate-400" />
                          <span>{lead.country}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 font-semibold text-slate-600">
                            {lead.type || 'Export'}
                          </span>
                        </div>
                      </td>

                      {/* Contact Person */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-semibold text-slate-900">{lead.contact_person || '—'}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {lead.phone && <span>{lead.phone}</span>}
                          {lead.whatsapp && (
                            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                              <MessageCircle size={10} /> WA
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
                        <div className="font-bold text-slate-900">
                          {Number(lead.quantity).toLocaleString()} kg
                        </div>
                        <div className="text-[11px] font-bold text-emerald-600">
                          ${(Number(lead.price) || Number(lead.value) || 0).toLocaleString()}
                        </div>
                      </td>

                      {/* Assigned Rep */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {lead.agent_name || 'Athish'}
                        </span>
                      </td>

                      {/* Follow-up date */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{lead.follow_up_date || 'dd-mm-yyyy'}</span>
                        </div>
                      </td>

                      {/* Stage */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full font-bold text-[10px] border ${getStatusBadge(
                            lead.stage || lead.status
                          )}`}
                        >
                          {lead.stage || lead.status || 'New'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openDetails(lead)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="View Lead Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => openEdit(lead)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Edit Lead"
                          >
                            <Edit3 size={14} />
                          </button>
                          {isOwner && (
                            <button
                              onClick={() => handleDelete(lead.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
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
                <div key={lead.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-sm text-slate-900">
                        {lead.company_name || lead.name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <span>{lead.country}</span>
                        <span>•</span>
                        <span className="font-semibold text-emerald-700">{lead.type || 'Export'}</span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[10px] border ${getStatusBadge(
                        lead.stage || lead.status
                      )}`}
                    >
                      {lead.stage || lead.status}
                    </span>
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
                  <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl">
                    <div>
                      <span className="text-slate-400">Qty:</span>{' '}
                      <span className="font-bold text-slate-800">
                        {Number(lead.quantity).toLocaleString()} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Price:</span>{' '}
                      <span className="font-bold text-emerald-600">
                        ${(Number(lead.price) || Number(lead.value) || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Contact & Follow up */}
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-1">
                      <User size={12} className="text-slate-400" />
                      <span>{lead.contact_person || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      <span>{lead.follow_up_date || 'dd-mm-yyyy'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-emerald-700">
                      Assigned: {lead.agent_name || 'Athish'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openDetails(lead)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openEdit(lead)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700"
                      >
                        Edit
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-1 text-rose-500"
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

      {/* COMPREHENSIVE ADD / EDIT LEAD MODAL WITH ALL USER FIELDS */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLead ? 'Edit Export Trade Lead' : 'Add New Export Trade Lead'}
      >
        <form onSubmit={handleSave} className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
          {/* SECTION: Type */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Type *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Export', 'Import', 'Domestic'].map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setForm({ ...form, type: t })}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    form.type === t
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION: Customer details */}
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Building2 size={16} className="text-emerald-600" />
                Customer Details
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Al-Barakah Global Agro Foods LLC"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Contacts Array (Contact 1, Contact 2, ...) */}
            <div className="space-y-4">
              {form.contacts.map((contact, cIdx) => (
                <div key={cIdx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Contact {cIdx + 1}
                    </span>
                    {form.contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContact(cIdx)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                      >
                        Remove Contact
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        placeholder="Contact name"
                        value={contact.name}
                        onChange={(e) => handleContactChange(cIdx, 'name', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Phone
                      </label>
                      <input
                        type="text"
                        placeholder="Phone number"
                        value={contact.phone}
                        onChange={(e) => handleContactChange(cIdx, 'phone', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Dynamic extra phone numbers */}
                  {contact.extra_phones && contact.extra_phones.map((ext, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Alternate phone #${pIdx + 2}`}
                        value={ext}
                        onChange={(e) => handleExtraPhoneChange(cIdx, pIdx, e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeExtraPhone(cIdx, pIdx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addExtraPhone(cIdx)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <Plus size={13} /> Add another number
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="email@example.com"
                        value={contact.email}
                        onChange={(e) => handleContactChange(cIdx, 'email', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sourcing Director"
                        value={contact.designation}
                        onChange={(e) => handleContactChange(cIdx, 'designation', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        LinkedIn
                      </label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/..."
                        value={contact.linkedin}
                        onChange={(e) => handleContactChange(cIdx, 'linkedin', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addAnotherContact}
                className="w-full py-2 border-2 border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:text-emerald-700 hover:border-emerald-400 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus size={14} /> Add another contact
              </button>
            </div>

            {/* Other Customer fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  placeholder="+971 50 123 4567"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Website</label>
                <input
                  type="text"
                  placeholder="https://company.com"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Country with Flags & Lead Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Country *
                </label>
                <select
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {COUNTRIES_WITH_FLAGS.map((c) => (
                    <option key={c.code} value={`${c.name} ${c.flag}`}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lead Source
                </label>
                <select
                  value={form.lead_source}
                  onChange={(e) => setForm({ ...form, lead_source: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {LEAD_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
              <textarea
                rows={2}
                placeholder="Warehouse or corporate address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* SECTION: Company profile */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-600" />
                Company Profile
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Credit Rating
                </label>
                <select
                  value={form.credit_rating}
                  onChange={(e) => setForm({ ...form, credit_rating: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {CREDIT_RATINGS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Turnover (cr)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50 cr"
                  value={form.turnover}
                  onChange={(e) => setForm({ ...form, turnover: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sourcing Region
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nizamabad & Guntur"
                  value={form.sourcing_region}
                  onChange={(e) => setForm({ ...form, sourcing_region: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Legacy Industry Type (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Spice Milling & Processing"
                  value={form.legacy_industry_type}
                  onChange={(e) => setForm({ ...form, legacy_industry_type: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION: Product */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Layers size={16} className="text-amber-600" />
                Products & Volume
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Products * (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMODITY_PRODUCTS.map((prod) => {
                  const isSelected = form.products.includes(prod);
                  return (
                    <button
                      type="button"
                      key={prod}
                      onClick={() => toggleProduct(prod)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {prod}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION: Export requirements */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Ship size={16} className="text-blue-600" />
                Export Requirements
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Industry Type
                </label>
                <select
                  value={form.industry_type}
                  onChange={(e) => setForm({ ...form, industry_type: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {INDUSTRY_TYPES.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Material Type
                </label>
                <select
                  value={form.material_type}
                  onChange={(e) => setForm({ ...form, material_type: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {MATERIAL_TYPES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Polish Level
                </label>
                <select
                  value={form.polish_level}
                  onChange={(e) => setForm({ ...form, polish_level: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {POLISH_LEVELS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Min Curcumin %
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3.5%"
                  value={form.min_curcumin}
                  onChange={(e) => setForm({ ...form, min_curcumin: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cultivation Methods
                </label>
                <select
                  value={form.cultivation_methods}
                  onChange={(e) => setForm({ ...form, cultivation_methods: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {CULTIVATION_METHODS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Origin
                </label>
                <input
                  type="text"
                  placeholder="e.g. Salem, India"
                  value={form.preferred_origin}
                  onChange={(e) => setForm({ ...form, preferred_origin: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity Needed (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 50000"
                  value={form.quantity_needed_kg}
                  onChange={(e) => setForm({ ...form, quantity_needed_kg: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 145"
                  value={form.max_price_inr}
                  onChange={(e) => setForm({ ...form, max_price_inr: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Incoterm
                </label>
                <select
                  value={form.incoterm}
                  onChange={(e) => setForm({ ...form, incoterm: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {INCOTERMS.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Port Delivery
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jebel Ali / Nhava Sheva"
                  value={form.port_delivery}
                  onChange={(e) => setForm({ ...form, port_delivery: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Days After Sailing
                </label>
                <input
                  type="text"
                  placeholder="e.g. CAD on BL copy / 30 Days"
                  value={form.payment_days}
                  onChange={(e) => setForm({ ...form, payment_days: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION: Assignment */}
          <div className="space-y-3 pt-2 bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
            <div className="border-b border-emerald-200 pb-2">
              <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
                <User size={16} className="text-emerald-700" />
                Assignment & Follow-up
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-950 mb-1">
                Assign to *
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
                  <option value={profile?.id || 'usr_admin_1'}>
                    {profile?.name || 'You (Company Owner)'} [Owner]
                  </option>
                  {teamList.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name} ({tm.department || tm.role || 'Staff'})
                    </option>
                  ))}
                  {teamList.length === 0 && (
                    <>
                      <option value="usr_athish">Athish (Commodity Export)</option>
                      <option value="usr_agent_1">Sarah Jenkins (Enterprise Sales)</option>
                      <option value="usr_agent_2">Michael Vance (Inbound Sales)</option>
                    </>
                  )}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${profile?.name || 'You'} (Your Personal Staff Workspace)`}
                    className="w-full px-3 py-2 text-xs bg-emerald-100/60 border border-emerald-300 font-bold text-emerald-900 rounded-xl focus:outline-none cursor-not-allowed"
                  />
                </div>
              )}
              <p className="text-[11px] text-emerald-800 font-semibold mt-1">
                {isOwner
                  ? 'ℹ️ As Company Owner, you can assign this lead to yourself or any team member.'
                  : '🔒 Locked: Leads created by staff are strictly assigned to your personal account.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-950 mb-1">
                Follow-up Date (dd-mm-yyyy)
              </label>
              <input
                type="date"
                value={form.follow_up_date}
                onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {editingLead ? 'Update Lead' : 'Save Export Lead'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL: VIEW FULL COMMODITY SPECIFICATIONS */}
      {activeDetailLead && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Lead Dossier: ${activeDetailLead.company_name || activeDetailLead.name}`}
        >
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1 text-xs">
            {/* Header info */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="font-bold text-slate-900 text-sm">
                  {activeDetailLead.company_name || activeDetailLead.name}
                </span>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {activeDetailLead.country} • {activeDetailLead.type || 'Export'}
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full font-bold text-[11px] border ${getStatusBadge(
                  activeDetailLead.stage || activeDetailLead.status
                )}`}
              >
                {activeDetailLead.stage || activeDetailLead.status}
              </span>
            </div>

            {/* Products & Deal */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                <div className="text-[10px] font-bold uppercase text-amber-800">Products</div>
                <div className="font-black text-amber-950 text-sm mt-0.5">
                  {Array.isArray(activeDetailLead.products)
                    ? activeDetailLead.products.join(', ')
                    : activeDetailLead.product}
                </div>
              </div>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <div className="text-[10px] font-bold uppercase text-emerald-800">Contract Value & Qty</div>
                <div className="font-black text-emerald-950 text-sm mt-0.5">
                  ${(Number(activeDetailLead.price) || Number(activeDetailLead.value) || 0).toLocaleString()} • {Number(activeDetailLead.quantity).toLocaleString()} kg
                </div>
              </div>
            </div>

            {/* Contacts list */}
            <div className="space-y-2">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                Contacts
              </div>
              {Array.isArray(activeDetailLead.contacts) && activeDetailLead.contacts.length > 0 ? (
                activeDetailLead.contacts.map((c, i) => (
                  <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-900 flex justify-between">
                      <span>{c.name || 'Contact'} ({c.designation || 'Representative'})</span>
                      <span className="text-[10px] font-medium text-slate-400">Contact {i + 1}</span>
                    </div>
                    <div className="text-slate-600 flex flex-wrap gap-3 text-[11px]">
                      {c.phone && <span>📞 {c.phone}</span>}
                      {c.email && <span>✉️ {c.email}</span>}
                      {c.linkedin && (
                        <a href={c.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-600">
                  <span>Contact: {activeDetailLead.contact_person}</span> • <span>{activeDetailLead.phone}</span>
                </div>
              )}
            </div>

            {/* Export Specs */}
            {activeDetailLead.export_requirements && (
              <div className="space-y-2">
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                  <Ship size={14} className="text-emerald-600" /> Export Specifications
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">Incoterm</span>
                    <span className="font-bold text-slate-800">{activeDetailLead.export_requirements.incoterm || 'FOB'}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">Port Delivery</span>
                    <span className="font-bold text-slate-800">{activeDetailLead.export_requirements.port_delivery || '—'}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">Polish Level</span>
                    <span className="font-bold text-slate-800">{activeDetailLead.export_requirements.polish_level || '—'}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">Min Curcumin %</span>
                    <span className="font-bold text-slate-800">{activeDetailLead.export_requirements.min_curcumin || '—'}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">Payment Terms</span>
                    <span className="font-bold text-slate-800">{activeDetailLead.export_requirements.payment_days || '—'}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">Preferred Origin</span>
                    <span className="font-bold text-slate-800">{activeDetailLead.export_requirements.preferred_origin || '—'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Assignment & Notes */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-emerald-900 font-bold block">Assigned Representative</span>
                <span className="text-emerald-700 font-semibold">{activeDetailLead.agent_name || 'Athish'}</span>
              </div>
              <div>
                <span className="text-emerald-900 font-bold block">Follow-Up</span>
                <span className="text-emerald-700 font-semibold">{activeDetailLead.follow_up_date || 'Not scheduled'}</span>
              </div>
            </div>

            {activeDetailLead.notes && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-slate-800 block mb-1">Notes:</span>
                {activeDetailLead.notes}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              {(isOwner ||
                activeDetailLead.assigned_to === profile?.id ||
                activeDetailLead.agent_name === profile?.name ||
                activeDetailLead.assigned_to === profile?.name ||
                (profile?.name?.toLowerCase().includes('athish') && (activeDetailLead.assigned_to === 'usr_athish' || activeDetailLead.agent_name === 'Athish'))) && (
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    openEdit(activeDetailLead);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                >
                  Edit Lead
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
