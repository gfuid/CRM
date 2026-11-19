/**
 * Today's exchange rates for the price calculator (like Google's currency converter).
 * Source: ExchangeRate-API open access (https://www.exchangerate-api.com, free, no key, updated once a day).
 * Rates are kept in memory for 6 hours per base currency, so the CRM asks at most a few times a day.
 */
const CACHE_MS = 6 * 3600 * 1000;
const cache = new Map(); // base -> { at, data }

const fetchJson = async (url, ms = 8000) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
};

/** { base, rates: { INR: 93.51, ... }, updated_at, source } or throws when the service cannot be reached. */
const getRates = async (base = 'USD', { fetcher = fetchJson, now = Date.now() } = {}) => {
  const code = String(base || 'USD').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  if (code.length !== 3) throw new Error('Unknown currency');
  const hit = cache.get(code);
  if (hit && now - hit.at < CACHE_MS) return hit.data;
  try {
    const raw = await fetcher(`https://open.er-api.com/v6/latest/${code}`);
    if (!raw || raw.result !== 'success' || !raw.rates) throw new Error('Rates not available');
    const data = {
      base: code,
      rates: raw.rates,
      updated_at: raw.time_last_update_utc ? new Date(raw.time_last_update_utc).toISOString() : new Date(now).toISOString(),
      source: 'ExchangeRate-API',
      source_url: 'https://www.exchangerate-api.com',
    };
    cache.set(code, { at: now, data });
    return data;
  } catch (err) {
    if (hit) return { ...hit.data, stale: true }; // an older rate is better than none
    throw err;
  }
};

const clearRates = () => cache.clear();

module.exports = { getRates, clearRates };
