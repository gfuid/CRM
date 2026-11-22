import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

/**
 * One place for the lists used by every lead form (Add Lead, Edit Lead, Activity, Follow up).
 * The commodity list and the specification fields are saved per company on the server,
 * so the owner and all staff see the same list on every device.
 */

export const DEFAULT_COMMODITIES = [
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
  'Self/own',
  'Customs Data',
  'Website',
  'Trade Fair',
  'Gulfood Trade Show',
  'LinkedIn Inbound',
  'B2B Trade Portal',
  'Referral',
  'Cold Outreach',
  'Embassy / Trade Council',
];

/** "Al Quoz, Dubai - 00000" from the lead's city, state and pin code ('' when none is filled). */
export const formatLocation = (lead) => {
  const place = [lead?.city, lead?.state].map((v) => String(v || '').trim()).filter(Boolean).join(', ');
  const pin = String(lead?.pincode || '').trim();
  return [place, pin].filter(Boolean).join(' - ');
};

/** Chat links for a phone number: WhatsApp and Zalo both use the number with country code, digits only. */
export const chatLinks = (phone) => {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  if (digits.length < 6) return null;
  return { whatsapp: `https://wa.me/${digits}`, zalo: `https://zalo.me/${digits}`, telegram: `https://t.me/+${digits}` };
};

/** Chat apps the same mobile number works for (one number for all of them). */
export const CHAT_APPS = ['WhatsApp', 'Zalo', 'Line', 'WeChat', 'Telegram'];

/**
 * What a social platform gets straight from a phone number.
 * WhatsApp, Zalo and Telegram open a chat by number (a link); Line and WeChat find people by their
 * number, so they get the number itself (+971501234567).
 */
export const linkFromPhone = (platform, phone) => {
  const links = chatLinks(phone);
  if (!links) return '';
  if (platform === 'WhatsApp') return links.whatsapp;
  if (platform === 'Zalo') return links.zalo;
  if (platform === 'Telegram') return links.telegram;
  if (platform === 'Line' || platform === 'WeChat') return `+${String(phone).replace(/[^0-9]/g, '')}`;
  return '';
};
/** True when a link was made from a phone number (so it may be replaced when the number changes). */
export const isPhoneLink = (url) => /^https:\/\/(wa\.me\/|zalo\.me\/|t\.me\/\+)\d+$/.test(String(url || '')) || /^\+\d{6,15}$/.test(String(url || ''));
/** Social links that came from the old number follow the new number (typed links and IDs stay). */
export const followNumber = (links, phone) => (links || []).map((l) => {
  if (!l || (l.url && !isPhoneLink(l.url))) return l;
  const auto = linkFromPhone(l.platform, phone);
  return auto ? { ...l, url: auto } : l;
});

/** A saved value that is not in the list any more (old leads) is still shown, so nothing looks blank. */
export const withCurrent = (list, current) =>
  current && !list.includes(current) ? [...list, current] : list;

/** A time box only accepts 24h "HH:mm". Older leads may hold "10:00 AM"; convert so the box is never blank. */
export const toTimeInputValue = (value, fallback = '10:00') => {
  const m = /^\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?\s*$/i.exec(String(value || ''));
  if (!m) return fallback;
  let h = Number(m[1]);
  const ap = (m[3] || '').toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || Number(m[2]) > 59) return fallback;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
};

/** Remark / note boxes: Enter saves, Shift+Enter starts a new line. */
const isPlainEnter = (e) => e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing;
export const submitOnEnter = (e) => {
  if (!isPlainEnter(e)) return;
  e.preventDefault();
  e.currentTarget.form?.requestSubmit();
};
export const runOnEnter = (fn) => (e) => {
  if (!isPlainEnter(e)) return;
  e.preventDefault();
  fn();
};

const LEGACY_KEY = 'crm_user_commodities';

export function useLeadOptions(isOwner) {
  const [commodities, setCommodities] = useState(DEFAULT_COMMODITIES);
  const [specFields, setSpecFields] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.getLeadOptions();
        const data = res?.data || {};
        if (!alive) return;
        let list = Array.isArray(data.commodities) && data.commodities.length ? data.commodities : DEFAULT_COMMODITIES;
        setSpecFields(Array.isArray(data.spec_fields) ? data.spec_fields : []);

        // Older versions kept the owner's product list only in this browser. Move it to the server once.
        let legacy = null;
        try { legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null'); } catch { legacy = null; }
        if (isOwner && !data.saved && Array.isArray(legacy) && legacy.length) {
          const merged = Array.from(new Set([...list, ...legacy.map((p) => String(p || '').trim()).filter(Boolean)]));
          if (merged.length !== list.length) {
            const saved = await api.saveLeadOptions({ commodities: merged });
            list = saved?.data?.commodities || merged;
          }
        }
        try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
        if (alive) setCommodities(list);
      } catch (err) {
        console.warn('Lead options could not be loaded, using the default list:', err?.message);
      }
    })();
    return () => { alive = false; };
  }, [isOwner]);

  /** Owner only. Saves on the server first, so a failed save never looks saved. */
  const saveOptions = useCallback(async (patch) => {
    const res = await api.saveLeadOptions(patch);
    const data = res?.data || {};
    if (Array.isArray(data.commodities)) setCommodities(data.commodities);
    if (Array.isArray(data.spec_fields)) setSpecFields(data.spec_fields);
    return data;
  }, []);

  return { commodities, specFields, saveOptions };
}
