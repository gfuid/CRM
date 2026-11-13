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

/** A saved value that is not in the list any more (old leads) is still shown, so nothing looks blank. */
export const withCurrent = (list, current) =>
  current && !list.includes(current) ? [...list, current] : list;

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
