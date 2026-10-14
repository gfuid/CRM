import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Modal from '../components/Modal';
import {
  Eye,
  Calendar,
  RefreshCw,
  X,
  User,
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
  Globe,
  Building2,
  Layers,
  DollarSign,
  Clock,
  Send,
  FileText,
  Ship,
  Sparkles,
  History,
  Tag
} from 'lucide-react';
import { OUTREACH_COLUMNS, INITIAL_OUTREACH_LOGS } from '../data/outreachData';
import { SEED_LEADS } from '../data/seedLeads';

// ISO formatting helper (YYYY-MM-DD)
export const parseToIso = (d) => {
  if (!d) return null;
  const s = String(d).trim();

  // 1. Matches YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // 2. Matches DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  // 3. Matches "14 Oct 2026" or "14-Oct-2026"
  const monthNames = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const namedMatch = s.match(/(\d{1,2})[\s\-]+([a-zA-Z]{3,9})[\s\-]+(\d{4})/);
  if (namedMatch) {
    const day = namedMatch[1].padStart(2, '0');
    const monStr = namedMatch[2].toLowerCase().slice(0, 3);
    const mon = monthNames[monStr] || '10';
    return `${namedMatch[3]}-${mon}-${day}`;
  }

  // 4. Fallback to local Date object
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
};

export const getTodayIso = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format date as Day / Month / Year (DD/MM/YYYY)
export const formatDMY = (dateStr, dateIso) => {
  if (dateIso && dateIso.includes('-')) {
    const parts = dateIso.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }
  if (!dateStr) return '';
  const iso = parseToIso(dateStr);
  if (iso) {
    const parts = iso.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export const extractTime = (d) => {
  if (!d) return '11:00 AM';
  if (typeof d === 'string' && d.includes('·')) {
    const parts = d.split('·');
    return parts[parts.length - 1].trim();
  }
  if (typeof d === 'string' && /AM|PM/i.test(d)) {
    const match = d.match(/\d{1,2}:\d{2}\s*(?:AM|PM)/i);
    if (match) return match[0];
  }
  const parsed = new Date(d);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return '11:00 AM';
};

export const classifyActivity = (actText) => {
  if (!actText) return 'call_initiated';
  const lower = String(actText).toLowerCase();
  if (lower.includes('email reply') || (lower.includes('email') && lower.includes('repl'))) return 'email_reply';
  if (lower.includes('email') || lower.includes('mail')) return 'email';
  if (lower.includes('whatsapp') || lower.includes('zalo') || lower.includes('chat') || lower.includes('message')) return 'whatsapp';
  if (lower.includes('meeting') || lower.includes('conference') || lower.includes('zoom') || lower.includes('google meet')) return 'meeting';
  if (lower.includes('payment') || lower.includes('cad') || lower.includes('lc') || lower.includes('advance')) return 'payment_discussion';
  if (lower.includes('price') || lower.includes('rate') || lower.includes('discount') || lower.includes('quote') || lower.includes('quotation')) {
    if (lower.includes('sent quotation') || lower.includes('quote sent')) return 'sent_quotations';
    return 'price_discussion';
  }
  if (lower.includes('sample sent') || lower.includes('dispatched sample') || lower.includes('courier')) return 'sample_sent';
  if (lower.includes('sample')) return 'sample_discussion';
  if (lower.includes('negotiat')) return 'negotiation';
  if (lower.includes('response') || lower.includes('replied') || lower.includes('feedback')) return 'response';
  if (lower.includes('call') || lower.includes('phone') || lower.includes('tele')) return 'call_initiated';
  return 'call_initiated';
};

export const buildOutreachMatrix = (leads = [], extraLogs = []) => {
  const map = new Map();

  const getOrCreateRow = (dateIso, user) => {
    const key = `${dateIso}_${user}`;
    if (!map.has(key)) {
      map.set(key, {
        id: `out_${dateIso}_${user.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        date: formatDMY('', dateIso),
        date_iso: dateIso,
        user,
        counts: {
          new_lead: 0,
          call_initiated: 0,
          email: 0,
          whatsapp: 0,
          response: 0,
          meeting: 0,
          price_discussion: 0,
          payment_discussion: 0,
          sample_discussion: 0,
          sample_sent: 0,
          negotiation: 0,
          sent_quotations: 0,
          email_reply: 0,
        },
        activities: {
          new_lead: [],
          call_initiated: [],
          email: [],
          whatsapp: [],
          response: [],
          meeting: [],
          price_discussion: [],
          payment_discussion: [],
          sample_discussion: [],
          sample_sent: [],
          negotiation: [],
          sent_quotations: [],
          email_reply: [],
        },
      });
    }
    return map.get(key);
  };

  // 1. Process all leads
  leads.forEach((lead) => {
    const leadDateIso = parseToIso(lead.created_at || lead.created_date) || getTodayIso();
    const leadUser = (lead.created_by_name || lead.agent_name || 'Keerthana Ponni K').trim();

    const row = getOrCreateRow(leadDateIso, leadUser);
    row.counts.new_lead += 1;
    row.activities.new_lead.push({
      id: lead.id,
      company_name: lead.company_name || lead.name || 'Unnamed Company',
      contact_person: lead.contact_person || (lead.contacts && lead.contacts[0]?.name) || 'Contact Person',
      time: extractTime(lead.created_at) || '10:00 AM',
      note: lead.notes || `Created trade lead for ${Array.isArray(lead.products) ? lead.products.join(', ') : (lead.product || 'Agricultural Commodities')}`,
      product: Array.isArray(lead.products) ? lead.products.join(', ') : (lead.product || 'Rice DDGS'),
      country: lead.country || 'International',
      phone: lead.phone || '',
      email: lead.email || '',
      stage: lead.stage || 'Lead Generation',
      quantity: lead.quantity || 0,
      price: lead.price || lead.value || 0,
    });

    // 2. Process activity_history if present
    if (Array.isArray(lead.activity_history)) {
      lead.activity_history.forEach((act) => {
        const actDateIso = parseToIso(act.date || act.created_at) || leadDateIso;
        const actUser = (act.author ? act.author.replace(/^by\s+/i, '') : leadUser) || leadUser;
        const actType = classifyActivity(act.activity);

        const actRow = getOrCreateRow(actDateIso, actUser.trim());
        if (actRow.counts[actType] !== undefined) {
          actRow.counts[actType] += 1;
        } else {
          actRow.counts.call_initiated += 1;
        }

        const bucket = actRow.activities[actType] || actRow.activities.call_initiated;
        bucket.push({
          id: lead.id,
          company_name: lead.company_name || lead.name || 'Unnamed Company',
          contact_person: lead.contact_person || 'Contact Person',
          time: extractTime(act.date) || act.time || '11:00 AM',
          note: act.note || `${act.activity} logged`,
          product: Array.isArray(lead.products) ? lead.products.join(', ') : (lead.product || 'Commodities'),
          country: lead.country || 'International',
          phone: lead.phone || '',
          email: lead.email || '',
          stage: lead.stage || 'Requirement Understood',
          quantity: lead.quantity || 0,
          price: lead.price || lead.value || 0,
        });
      });
    }

    // 3. Process previous_remarks if present
    if (Array.isArray(lead.previous_remarks)) {
      lead.previous_remarks.forEach((rem) => {
        const remDateIso = parseToIso(rem.date || rem.follow_up_date) || leadDateIso;
        const remUser = (rem.author || leadUser).trim();
        const remType = classifyActivity(rem.today_remark || rem.remark || 'call_initiated');

        const remRow = getOrCreateRow(remDateIso, remUser);
        if (remRow.counts[remType] !== undefined) {
          remRow.counts[remType] += 1;
        } else {
          remRow.counts.response += 1;
        }

        const bucket = remRow.activities[remType] || remRow.activities.response;
        bucket.push({
          id: lead.id,
          company_name: lead.company_name || lead.name || 'Unnamed Company',
          contact_person: lead.contact_person || 'Contact Person',
          time: extractTime(rem.date) || '12:00 PM',
          note: rem.today_remark || rem.remark || 'Follow-up interaction recorded',
          product: Array.isArray(lead.products) ? lead.products.join(', ') : (lead.product || 'Commodities'),
          country: lead.country || 'International',
          phone: lead.phone || '',
          email: lead.email || '',
          stage: lead.stage || 'Contact Established',
          quantity: lead.quantity || 0,
          price: lead.price || lead.value || 0,
        });
      });
    }
  });

  // 4. Incorporate any extra static or stored logs
  if (Array.isArray(extraLogs)) {
    extraLogs.forEach((item) => {
      const dateIso = item.date_iso || parseToIso(item.date) || getTodayIso();
      const user = item.user || 'Shiva';
      const row = getOrCreateRow(dateIso, user);
      if (item.counts) {
        Object.keys(item.counts).forEach((k) => {
          if (row.counts[k] !== undefined) {
            row.counts[k] = (row.counts[k] || 0) + (item.counts[k] || 0);
          }
        });
      }
      if (item.activities) {
        Object.keys(item.activities).forEach((k) => {
          if (row.activities[k] && Array.isArray(item.activities[k])) {
            row.activities[k].push(...item.activities[k]);
          }
        });
      }
    });
  }

  // 5. Convert to array and sort descending by date_iso
  const result = Array.from(map.values()).sort((a, b) => b.date_iso.localeCompare(a.date_iso));
  return result;
};

export default function Outreach() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState([]);
  const [logs, setLogs] = useState([]);
  const [datePreset, setDatePreset] = useState('all'); // 'all' | 'today' | '7days' | 'month' | 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('All users');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);

  // Modal 1: Daily Breakdown Modal (matches OneRoot screenshots 4 & 5)
  const [activeBreakdown, setActiveBreakdown] = useState(null);

  // Modal 2: Complete Lead Dossier Details ("eys clik pr sab trah ke details")
  const [activePreviewLead, setActivePreviewLead] = useState(null);

  // Load all leads, team, and outreach data
  const loadAllData = async () => {
    let currentLeads = [];
    try {
      const stored = localStorage.getItem('oneroot_leads_v3');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentLeads = parsed;
          setLeads(parsed);
        }
      }
    } catch {}

    let storedOutreach = [];
    try {
      const storedOut = localStorage.getItem('oneroot_outreach_v3');
      if (storedOut) {
        const parsed = JSON.parse(storedOut);
        if (Array.isArray(parsed)) storedOutreach = parsed;
      }
    } catch {}

    // Compute initial matrix from local storage immediately so there is no blank screen
    if (currentLeads.length > 0 || storedOutreach.length > 0 || INITIAL_OUTREACH_LOGS.length > 0) {
      const computed = buildOutreachMatrix(currentLeads, storedOutreach.length > 0 ? storedOutreach : INITIAL_OUTREACH_LOGS);
      setLogs(computed);
    }

    // Now fetch fresh leads and team from remote API
    try {
      const [leadsRes, usersRes] = await Promise.all([
        api.getLeads().catch(() => null),
        api.getUsers().catch(() => null),
      ]);

      if (usersRes && usersRes.success && Array.isArray(usersRes.data)) {
        setTeamMembers(usersRes.data);
      }

      if (leadsRes && leadsRes.success && Array.isArray(leadsRes.data) && leadsRes.data.length > 0) {
        setLeads(leadsRes.data);
        try {
          localStorage.setItem('oneroot_leads_v3', JSON.stringify(leadsRes.data));
        } catch {}
        const computed = buildOutreachMatrix(leadsRes.data, storedOutreach.length > 0 ? storedOutreach : INITIAL_OUTREACH_LOGS);
        setLogs(computed);
        try {
          localStorage.setItem('oneroot_outreach_v3', JSON.stringify(computed));
        } catch {}
      }
    } catch (err) {
      console.warn('Outreach data refresh warning:', err);
    }
  };

  useEffect(() => {
    loadAllData();
    const handleUpdate = () => loadAllData();
    window.addEventListener('crm_leads_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('crm_leads_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const toIso = (dt) => {
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'all') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'today') {
      const todayStr = toIso(now);
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === '7days') {
      const past = new Date(now.getTime() - 7 * 86400000);
      setFromDate(toIso(past));
      setToDate(toIso(now));
    } else if (preset === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFromDate(toIso(first));
      setToDate(toIso(last));
    }
  };

  // Filter logs by date range & user
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedUser !== 'All users' && log.user !== selectedUser) {
        return false;
      }
      if (datePreset !== 'all') {
        if (fromDate && log.date_iso < fromDate) {
          return false;
        }
        if (toDate && log.date_iso > toDate) {
          return false;
        }
      }
      return true;
    });
  }, [logs, selectedUser, datePreset, fromDate, toDate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAllData();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  };

  // Open Full Lead Dossier when clicking any lead card
  const handleLeadClick = (leadSummary) => {
    if (!leadSummary) return;

    // 1. Try to find the exact lead in state leads
    let fullLead = leads.find(
      (l) =>
        (leadSummary.id && l.id === leadSummary.id) ||
        (l.company_name && l.company_name.toLowerCase() === leadSummary.company_name?.toLowerCase()) ||
        (l.name && l.name.toLowerCase() === leadSummary.company_name?.toLowerCase())
    );

    // 2. Try localStorage
    if (!fullLead) {
      try {
        const localLeads = JSON.parse(localStorage.getItem('oneroot_leads_v3') || '[]');
        if (Array.isArray(localLeads) && localLeads.length > 0) {
          fullLead = localLeads.find(
            (l) =>
              (leadSummary.id && l.id === leadSummary.id) ||
              (l.company_name && l.company_name.toLowerCase() === leadSummary.company_name?.toLowerCase()) ||
              (l.name && l.name.toLowerCase() === leadSummary.company_name?.toLowerCase())
          );
        }
      } catch {}
    }

    // 3. Try SEED_LEADS
    if (!fullLead) {
      fullLead = SEED_LEADS.find(
        (l) =>
          (l.company_name && l.company_name.toLowerCase() === leadSummary.company_name?.toLowerCase()) ||
          (l.name && l.name.toLowerCase() === leadSummary.company_name?.toLowerCase())
      );
    }

    if (fullLead) {
      setActivePreviewLead(fullLead);
    } else {
      // Build a comprehensive lead object from summary
      setActivePreviewLead({
        id: leadSummary.id || 'lead_prev_' + Date.now(),
        company_name: leadSummary.company_name,
        name: leadSummary.company_name,
        country: leadSummary.country || 'India 🇮🇳',
        type: 'Export',
        contact_person: leadSummary.contact_person || 'Procurement Manager',
        phone: leadSummary.phone || '+91 98452 11890',
        email: leadSummary.email || 'procurement@company.com',
        website: 'https://' + (leadSummary.company_name || 'company').toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
        address: 'Industrial Processing Zone, India',
        products: leadSummary.product ? [leadSummary.product] : ['Agricultural Commodities'],
        quantity: leadSummary.quantity || 50000,
        price: leadSummary.price || 50000,
        stage: leadSummary.stage || 'Requirement Understood',
        agent_name: activeBreakdown?.user || profile?.name || 'Keerthana Ponni K',
        activity_history: [
          {
            activity: 'Call initiated',
            date: `${formatDMY(activeBreakdown?.date, activeBreakdown?.date_iso) || '14/10/2026'} · ${leadSummary.time || '11:00 AM'}`,
            note: leadSummary.note || 'Discussed product specs and shipment schedule',
            author: `by ${activeBreakdown?.user || profile?.name || 'Keerthana Ponni K'}`,
          },
        ],
        previous_remarks: [
          {
            remark: leadSummary.note || 'Follow up scheduled',
            date: `${formatDMY(activeBreakdown?.date, activeBreakdown?.date_iso) || '14/10/2026'}`,
            author: activeBreakdown?.user || profile?.name || 'Keerthana Ponni K',
          },
        ],
        export_requirements: {
          incoterm: 'CIF',
          port_delivery: 'Nhava Sheva / Mundra Port',
          payment_days: 'CAD on BL copy',
          polish_level: 'Machine Cleaned',
        },
      });
    }
  };

  const allUserOptions = useMemo(() => {
    const set = new Set(['All users']);
    if (profile?.name) set.add(profile.name);
    teamMembers.forEach((t) => {
      if (t.name) set.add(t.name);
    });
    logs.forEach((l) => {
      if (l.user) set.add(l.user);
    });
    leads.forEach((l) => {
      const u = l.created_by_name || l.agent_name;
      if (u) set.add(u);
    });
    return Array.from(set);
  }, [teamMembers, profile, logs, leads]);

  return (
    <div className="space-y-6 antialiased pb-12">
      {/* Page Header matching OneRoot CRM */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Outreach
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Daily calls, emails, WhatsApp and lead touches by user
        </p>
      </div>

      {/* FILTER BAR - EXACT MATCH TO ONEROOT SCREENSHOT 3 + PRESETS */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-end gap-3 sm:gap-4">
          {/* DATE PRESETS */}
          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Date Presets
            </label>
            <div className="flex items-center gap-1.5 h-10">
              <button
                type="button"
                onClick={() => handlePresetChange('all')}
                className={`h-10 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  datePreset === 'all'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('today')}
                className={`h-10 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  datePreset === 'today'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('7days')}
                className={`h-10 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  datePreset === '7days'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('month')}
                className={`h-10 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  datePreset === 'month'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                This Month
              </button>
            </div>
          </div>

          {/* FROM Date */}
          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              From
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="h-10 px-3.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* TO Date */}
          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              To
            </label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="h-10 px-3.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* USER Selector */}
          <div className="space-y-1 min-w-[140px]">
            <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              User
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="h-10 w-full px-3.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              {allUserOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button - Vivid Purple pill matching OneRoot */}
          <div>
            <button
              type="button"
              onClick={handleRefresh}
              className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* OUTREACH SUMMARY TABLE - EXACT MATCH TO ONEROOT SCREENSHOT 3 */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-white font-extrabold uppercase text-[10px] tracking-wider whitespace-nowrap">
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5">User</th>
                <th className="py-3 px-3 text-center">New Lead</th>
                <th className="py-3 px-3 text-center">Call Initiated</th>
                <th className="py-3 px-3 text-center">Email</th>
                <th className="py-3 px-3 text-center">WhatsApp Text/Zalo</th>
                <th className="py-3 px-3 text-center">Response</th>
                <th className="py-3 px-3 text-center">Meeting</th>
                <th className="py-3 px-3 text-center">Price Discussion</th>
                <th className="py-3 px-3 text-center">Payment Discussion</th>
                <th className="py-3 px-3 text-center">Sample Discussion</th>
                <th className="py-3 px-3 text-center">Sample Sent</th>
                <th className="py-3 px-3.5 text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="13" className="py-12 text-center text-slate-400 text-xs">
                    No outreach activities recorded for this date range or user.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((row, idx) => {
                  const isTinted = idx % 2 === 0;
                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        isTinted
                          ? 'bg-rose-50/20 dark:bg-slate-850/60 hover:bg-rose-50/40'
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3.5 px-3.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {formatDMY(row.date, row.date_iso)}
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span>{row.user}</span>
                        </span>
                      </td>

                      {/* Counts across 10 activities */}
                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.new_lead > 0 ? (
                          <span className="text-purple-700 dark:text-purple-400 font-extrabold">{row.counts.new_lead}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.call_initiated > 0 ? (
                          <span className="text-cyan-700 dark:text-cyan-400 font-black">{row.counts.call_initiated}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.email > 0 ? (
                          <span className="text-indigo-700 dark:text-indigo-400 font-extrabold">{row.counts.email}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.whatsapp > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-extrabold">{row.counts.whatsapp}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.response > 0 ? (
                          <span className="text-rose-700 dark:text-rose-400 font-extrabold">{row.counts.response}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.meeting > 0 ? (
                          <span className="text-orange-700 dark:text-orange-400 font-extrabold">{row.counts.meeting}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.price_discussion > 0 ? (
                          <span className="text-amber-700 dark:text-amber-400 font-extrabold">{row.counts.price_discussion}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.payment_discussion > 0 ? (
                          <span className="text-teal-700 dark:text-teal-400 font-extrabold">{row.counts.payment_discussion}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.sample_discussion > 0 ? (
                          <span className="text-cyan-800 dark:text-cyan-300 font-extrabold">{row.counts.sample_discussion}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {row.counts.sample_sent > 0 ? (
                          <span className="text-purple-800 dark:text-purple-300 font-extrabold">{row.counts.sample_sent}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Detail Button: purple pill matching OneRoot */}
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setActiveBreakdown(row)}
                          className="px-3 py-1 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer mx-auto"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: DAILY BREAKDOWN OVERLAY (EXACT ONEROOT SCREENSHOT 4 & 5 MATCH) */}
      {activeBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-[96vw] xl:max-w-7xl max-h-[92vh] flex flex-col bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
            {/* Dark Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-start justify-between bg-slate-950 text-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800">
                  Daily Breakdown
                </span>
                <h2 className="text-2xl sm:text-3xl font-black mt-1 text-white tracking-tight">
                  {activeBreakdown.user}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDMY(activeBreakdown.date, activeBreakdown.date_iso)} · Click a lead for preview
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveBreakdown(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close Breakdown"
              >
                <X size={18} />
              </button>
            </div>

            {/* Horizontal Multi-Column Board for All Activities */}
            <div className="flex-1 overflow-x-auto overflow-y-auto p-4 bg-slate-900/90 text-xs">
              <div className="flex gap-3 min-w-max pb-2">
                {OUTREACH_COLUMNS.map((col) => {
                  const items = activeBreakdown.activities?.[col.key] || [];
                  const count = activeBreakdown.counts?.[col.key] || items.length || 0;

                  return (
                    <div
                      key={col.key}
                      className="w-72 sm:w-80 flex flex-col bg-slate-50/70 dark:bg-slate-850/80 rounded-2xl border border-slate-700/60 overflow-hidden shrink-0 shadow-xs"
                    >
                      {/* Column Header */}
                      <div
                        className={`p-2.5 px-3 text-center text-white font-black text-xs uppercase tracking-wider ${col.headerBg} flex items-center justify-center gap-1.5 shadow-xs`}
                      >
                        <span>{col.label}</span>
                        <span className="bg-white/25 px-2 py-0.2 rounded-full text-[11px] font-black">
                          {count}
                        </span>
                      </div>

                      {/* Leads / Activity Cards in this column */}
                      <div className="flex-1 p-2.5 space-y-2.5 min-h-[300px] max-h-[58vh] overflow-y-auto">
                        {items.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-slate-500 text-[11px] italic py-16">
                            — No activities —
                          </div>
                        ) : (
                          items.map((card, cIdx) => (
                            <div
                              key={cIdx}
                              onClick={() => handleLeadClick(card)}
                              className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer space-y-1.5 text-left group"
                              title="Click to view full lead details"
                            >
                              <div className="font-extrabold text-slate-900 dark:text-white text-xs group-hover:text-purple-600 transition-colors">
                                {card.company_name}
                              </div>
                              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                {card.contact_person}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {card.time}
                              </div>
                              <div className="text-[11px] text-slate-700 dark:text-slate-300 font-normal pt-1 border-t border-slate-100 dark:border-slate-700/60 leading-relaxed">
                                {card.note}
                              </div>
                              <div className="pt-1 flex items-center justify-between text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                                <span>Preview details</span>
                                <Eye size={11} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: COMPLETE LEAD DOSSIER VIEW ("eys clik pr sab trah ke details") */}
      {activePreviewLead && (
        <Modal
          isOpen={Boolean(activePreviewLead)}
          onClose={() => setActivePreviewLead(null)}
          title={activePreviewLead.company_name || activePreviewLead.name}
          subtitle={`View customer details · Created ${activePreviewLead.created_at ? new Date(activePreviewLead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '23 Sep 2026'}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-5 text-xs max-h-[78vh] overflow-y-auto pr-1">
            {/* Header Status Badges Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  📅 Created {activePreviewLead.created_at ? new Date(activePreviewLead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '23 Sep 2026'}
                </span>
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-purple-50 text-purple-800 border border-purple-200">
                  {activePreviewLead.stage || activePreviewLead.status || 'Requirement Understood'}
                </span>
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                  {activePreviewLead.type === 'Domestic' ? '🏠 Domestic' : '🌐 Export'}
                </span>
                {activePreviewLead.follow_up_date && (
                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    ⏰ Follow-up: {activePreviewLead.follow_up_date}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                  👤 Rep: {activePreviewLead.agent_name || activeBreakdown?.user || 'Shiva'}
                </span>
              </div>
            </div>

            {/* Target Commodities & Contract Value */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
                <div className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-400">Target Commodities</div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(Array.isArray(activePreviewLead.products) && activePreviewLead.products.length > 0
                    ? activePreviewLead.products
                    : (activePreviewLead.product ? activePreviewLead.product.split(',').map(p => p.trim()) : ['Rice DDGS'])
                  ).map((p, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-black bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 border border-amber-300 shadow-2xs">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-gradient-to-br from-rose-50/80 via-pink-50/50 to-indigo-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-xs">
                <div className="text-[10px] font-bold uppercase text-rose-800 dark:text-rose-400">Contract Value & Quantity</div>
                {(() => {
                  const dealVal = Number(activePreviewLead.price) || Number(activePreviewLead.value) || 0;
                  const dealQty = Number(activePreviewLead.quantity) || 0;
                  const unit = activePreviewLead.quantity_unit || (dealQty >= 1000 ? 'kg' : 'MT');
                  const lakhs = (dealVal / 100000).toFixed(2);
                  const isMT = unit.toLowerCase() === 'mt' || unit.toLowerCase().includes('tonne');
                  const mt = isMT ? dealQty : (dealQty / 1000);
                  return (
                    <div className="mt-1">
                      <div className="text-base font-black text-rose-950 dark:text-rose-200">
                        {dealVal > 0 ? `₹${dealVal.toLocaleString('en-IN')}` : '₹0 (Unpriced inquiry)'}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        {dealVal >= 100000 ? `₹${lakhs} Lakhs INR • ` : ''}
                        {dealQty.toLocaleString()} {unit} {mt > 0 && !isMT ? `(≈ ${mt.toFixed(1)} MT)` : ''}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Customer Contact Details */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="font-extrabold text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="flex items-center gap-1.5 text-xs">
                  <User size={14} className="text-rose-600 dark:text-rose-400" /> Customer & Buyer Details
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {activePreviewLead.country}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100 flex justify-between items-center">
                    <span className="text-xs">{activePreviewLead.contact_person || 'Contact Person'}</span>
                    <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-bold">
                      Procurement
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 text-[11px] space-y-1">
                    {activePreviewLead.phone && (
                      <div className="flex items-center justify-between">
                        <span>📞 {activePreviewLead.phone}</span>
                        <a
                          href={`https://wa.me/${String(activePreviewLead.phone).replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-0.5"
                        >
                          <MessageCircle size={10} /> Chat WA
                        </a>
                      </div>
                    )}
                    {activePreviewLead.email && (
                      <div>
                        <a href={`mailto:${activePreviewLead.email}`} className="text-blue-600 hover:underline">
                          ✉️ {activePreviewLead.email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 text-[11px] space-y-1.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200">Company Location & Address</div>
                  <div className="text-slate-600 dark:text-slate-400">
                    {activePreviewLead.address || 'Industrial Area / Commercial Trading Zone'}
                  </div>
                  {activePreviewLead.website && (
                    <div className="flex items-center gap-1 pt-0.5">
                      <Globe size={11} className="text-slate-400" />
                      <a href={activePreviewLead.website.startsWith('http') ? activePreviewLead.website : `https://${activePreviewLead.website}`} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold underline">
                        {activePreviewLead.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Daily Activity History */}
            {activePreviewLead.activity_history && activePreviewLead.activity_history.length > 0 && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5">
                    <History size={14} className="text-indigo-600" /> Logged Activities History ({activePreviewLead.activity_history.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {activePreviewLead.activity_history.map((hist, hIdx) => (
                    <div key={hIdx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 text-[10px]">
                          {hist.activity}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{hist.date}</span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-200 font-medium">{hist.note}</div>
                      <div className="text-[10px] text-slate-400 text-right">{hist.author}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActivePreviewLead(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
