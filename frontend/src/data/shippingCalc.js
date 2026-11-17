/**
 * Shipment cost sheet / quotation calculator.
 *
 * FORMULA = the company's "Quotation Calculator" sheet (shared on 2026-11-16). Per ton, in the quote currency:
 *
 *   base (local, per ton) = (ex-plant price per kg + transport to port per kg) x 1000
 *   FOB = (base + customs per container / tons per container) x (1 + profit %) / rate
 *   CFR = FOB + ocean freight per container / tons per container                      (no profit on freight)
 *   CIF = (base + (customs + insurance) per container / tons per container) x (1 + profit %) / rate
 *         + ocean freight per container / tons per container
 *
 * A quote "per kg" is the per-ton price / 1000 (the sheet added per-container charges per ton to a per-kg
 * price when "per kg" was chosen; that is corrected here).
 * Commissions and tax are optional: they are taken out of the profit and do not change the quote.
 * The server keeps the same formula in backend/src/utils/shippingQuote.js (for staff who cannot see costs).
 */

export const CONTAINER_TYPES = ['20 ft', '40 ft', '40 ft HC', '20 ft Reefer', '40 ft Reefer', 'Break bulk'];
export const PRICE_TERMS = ['FOB', 'CFR', 'CIF'];
export const QUOTE_UNITS = [{ id: 'ton', label: 'per ton' }, { id: 'kg', label: 'per kg' }];
export const CURRENCIES = ['INR', 'USD', 'EUR', 'AED', 'VND', 'LKR', 'BDT', 'NGN', 'KES', 'GBP', 'CNY', 'IDR', 'THB', 'MYR'];

// Every country's currency (from the browser), with the common export currencies first
const FALLBACK_CURRENCIES = ['AUD', 'BRL', 'CAD', 'CHF', 'DKK', 'EGP', 'ETB', 'GHS', 'HKD', 'IQD', 'IRR', 'JPY', 'JOD', 'KRW', 'KWD', 'KZT', 'LBP', 'MAD', 'MMK', 'MXN', 'NOK', 'NPR', 'NZD', 'OMR', 'PHP', 'PKR', 'PLN', 'QAR', 'RUB', 'SAR', 'SEK', 'SGD', 'TRY', 'TWD', 'TZS', 'UAH', 'UGX', 'UZS', 'XAF', 'XOF', 'ZAR', 'ZMW'];
const allCodes = (() => {
  try {
    const list = typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : [];
    if (list && list.length) return list;
  } catch { /* older browser */ }
  return FALLBACK_CURRENCIES;
})();
export const OTHER_CURRENCIES = allCodes.filter((c) => !CURRENCIES.includes(c)).sort();
const displayNames = (() => { try { return new Intl.DisplayNames(['en'], { type: 'currency' }); } catch { return null; } })();
/** "INR" -> "INR – Indian Rupee" */
export const currencyLabel = (code) => {
  let name = '';
  try { name = displayNames ? displayNames.of(code) : ''; } catch { name = ''; }
  return name && name !== code ? `${code} – ${name}` : code;
};

/** Fields only the owner (or staff with full access) may see or change. */
export const MONEY_KEYS = ['price_per_kg', 'transport_per_kg', 'costs', 'profit_pct', 'commission', 'tax_pct'];

export const newSheet = (overrides = {}) => ({
  id: '',
  name: '',
  mode: 'shipment', // 'shipment' | 'quotation'
  buyer: '',
  lead_id: '',
  product: '',
  term: 'CIF',
  quote_unit: 'ton',
  quote_kg: 1000, // "Need quote in Ton/kg" of the sheet: 1000 = price per ton, 1 = price per kg
  container: { type: '20 ft', tons_per: 25, count: 1, bags_per: 500 },
  currency: { local: 'INR', foreign: 'USD', rate: 95, local_value: '' }, // rate = local currency for 1 foreign
  price_per_kg: 0,
  transport_per_kg: 0,
  costs: { customs_per_container: 0, freight_per_container: 0, insurance_per_container: 0 },
  profit_pct: 3,
  commission: { agent_pct: 0, consultant_pct: 0, sales_pct: 0 },
  tax_pct: 0,
  tasks: [],
  notes: '',
  ...overrides,
});

const num = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/** How many kg one quoted unit is: the sheet's "Need quote in Ton/kg" (1000 = per ton, 1 = per kg). */
export const kgPerQuote = (s) => {
  const n = num(s && s.quote_kg);
  if (n > 0) return n;
  return s && s.quote_unit === 'kg' ? 1 : 1000;
};

/** Sheets saved before 2026-11-16 used other fields: turn them into the new ones (nothing is lost). */
export const upgradeSheet = (s) => {
  if (!s || s.price_per_kg !== undefined || s.purchase_per_ton === undefined) return s;
  const count = Math.max(1, num(s.container?.count));
  const old = s.costs || {};
  return {
    ...s,
    quote_unit: 'ton',
    price_per_kg: round((num(s.purchase_per_ton) - num(s.deduction_per_ton)) / 1000, 4),
    transport_per_kg: 0,
    costs: {
      customs_per_container: round((num(old.customs) + num(old.local_charges) + num(old.agency)) / count),
      freight_per_container: num(old.freight_per_container),
      insurance_per_container: 0,
    },
    profit_pct: s.target_margin_pct !== undefined ? num(s.target_margin_pct) : 3,
  };
};

/**
 * All the numbers for one sheet. `hidden` = true when the viewer may not see costs:
 * then the quote comes from what the server worked out (`sheet.quote`) and money details are null.
 */
export function calcSheet(input, { hidden = false } = {}) {
  const s = upgradeSheet(input) || {};
  const c = s.container || {};
  const tonsPer = num(c.tons_per);
  const tons = tonsPer * num(c.count);
  const bags = num(c.bags_per) * num(c.count);
  const term = PRICE_TERMS.includes(s.term) ? s.term : 'CIF';
  // The quote is per "Need quote in Ton/kg" kg: 1000 = per ton (like the sheet), 1 = per kg, any other number = per that many kg.
  // Per-container charges are spread per kg, so a per-kg quote is exactly the per-ton price / 1000.
  const kgUnit = kgPerQuote(s);
  const unit = kgUnit === 1000 ? 'ton' : kgUnit === 1 ? 'kg' : 'custom';
  const unitLabel = unit === 'ton' ? 'ton' : unit === 'kg' ? 'kg' : `${kgUnit} kg`;
  const digits = kgUnit < 100 ? 4 : 2;
  const perUnit = (perTon) => (perTon === null || perTon === undefined ? null : round((perTon * kgUnit) / 1000, digits));
  const base = { tons: round(tons, 3), bags: Math.round(bags), containers: num(c.count), term, unit, unitLabel, kgUnit, digits };

  if (hidden) {
    const q = s.quote || {};
    const perTon = { fob: q.fob ?? null, cfr: q.cfr ?? null, cif: q.cif ?? null };
    const price = perTon[term.toLowerCase()];
    return {
      ...base,
      hidden: true,
      perTon,
      quote: { fob: perUnit(perTon.fob), cfr: perUnit(perTon.cfr), cif: perUnit(perTon.cif) },
      quotePerTon: price,
      saleValue: price === null ? null : round(price * tons),
      net: null,
    };
  }

  const rate = num(s.currency?.rate) || 1;
  const costs = s.costs || {};
  const markup = 1 + num(s.profit_pct) / 100;
  const perContainer = (v) => (tonsPer > 0 ? num(v) / tonsPer : 0); // a per-container charge, per ton

  // Local currency, per ton
  const goods = (num(s.price_per_kg) + num(s.transport_per_kg)) * 1000;
  const customs = perContainer(costs.customs_per_container);
  const insurance = perContainer(costs.insurance_per_container);
  const costFobLocal = goods + customs;
  const costCifLocal = goods + customs + insurance;
  // Quote currency, per ton
  const freight = perContainer(costs.freight_per_container);
  const fob = (costFobLocal * markup) / rate;
  const cfr = fob + freight;
  const cif = (costCifLocal * markup) / rate + freight;
  const cost = { fob: costFobLocal / rate, cfr: costFobLocal / rate + freight, cif: costCifLocal / rate + freight };

  const key = term.toLowerCase();
  const pricePerTon = { fob, cfr, cif }[key];
  const saleValue = pricePerTon * tons;
  const profit = (pricePerTon - cost[key]) * tons;
  const cm = s.commission || {};
  const commissions = {
    agent: (num(cm.agent_pct) / 100) * saleValue,
    consultant: (num(cm.consultant_pct) / 100) * saleValue,
    sales: (num(cm.sales_pct) / 100) * saleValue,
  };
  const commissionTotal = commissions.agent + commissions.consultant + commissions.sales;
  const pbt = profit - commissionTotal;
  const tax = pbt > 0 ? (num(s.tax_pct) / 100) * pbt : 0;
  const net = pbt - tax;

  return {
    ...base,
    hidden: false,
    rate,
    build: {
      goods: round(goods),
      customs: round(customs),
      insurance: round(insurance),
      costFobLocal: round(costFobLocal),
      costCifLocal: round(costCifLocal),
      freight: round(freight),
    },
    perTon: { fob: round(fob), cfr: round(cfr), cif: round(cif) },
    perKg: { fob: round(fob / 1000, 4), cfr: round(cfr / 1000, 4), cif: round(cif / 1000, 4) },
    quote: { fob: perUnit(fob), cfr: perUnit(cfr), cif: perUnit(cif) },
    quotePerTon: round(pricePerTon),
    costPerTon: { fob: round(cost.fob), cfr: round(cost.cfr), cif: round(cost.cif) },
    saleValue: round(saleValue),
    profit: round(profit),
    commissions: { agent: round(commissions.agent), consultant: round(commissions.consultant), sales: round(commissions.sales), total: round(commissionTotal) },
    pbt: round(pbt),
    tax: round(tax),
    net: round(net),
    netLocal: round(net * rate),
    saleLocal: round(saleValue * rate),
    marginPct: saleValue > 0 ? round((net / saleValue) * 100, 1) : 0,
  };
}

/** A copy of a sheet to start a new one from (keeps every number, clears the id and tasks' done state). */
export const copySheet = (sheet) => ({
  ...JSON.parse(JSON.stringify(upgradeSheet(sheet) || {})),
  id: '',
  name: `${sheet?.name || 'Cost sheet'} (copy)`,
  tasks: (sheet?.tasks || []).map((t) => ({ ...t, id: `t${Math.random().toString(36).slice(2, 9)}`, done: false })),
  created_at: undefined,
  updated_at: undefined,
});

export const money = (v, cur = 'USD', digits = 2) =>
  v === null || v === undefined ? '—' : `${cur} ${Number(v).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 })}`;
