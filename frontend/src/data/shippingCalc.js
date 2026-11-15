/**
 * Shipment cost sheet / quotation calculator.
 *
 * PROVISIONAL FORMULAS: these follow common export practice and will be replaced by the
 * company's own sheet once it is shared. Keep every formula in this file so that swap is one place.
 *
 *   Product cost      = (purchase price per ton - variation/deduction per ton) x total tons      [local currency]
 *   FOB cost          = product cost + customs clearance + local charges + agency charges          [converted at the rate]
 *   CFR cost          = FOB cost + ocean freight per container x containers
 *   CIF cost          = CFR cost + insurance (% of CFR cost)
 *   Sale value        = selling price per ton x total tons (on the chosen term)
 *   Gross profit      = sale value - cost on that term
 *   Commissions       = sale value x (agent % + consultant % + sales incentive %)
 *   Profit before tax = gross profit - commissions
 *   Net profit        = profit before tax - tax % of a positive profit
 */

export const CONTAINER_TYPES = ['20 ft', '40 ft', '40 ft HC', '20 ft Reefer', '40 ft Reefer', 'Break bulk'];
export const PRICE_TERMS = ['FOB', 'CFR', 'CIF'];
export const CURRENCIES = ['INR', 'USD', 'EUR', 'AED', 'VND', 'LKR', 'BDT', 'NGN', 'KES', 'GBP', 'CNY', 'IDR', 'THB', 'MYR'];

/** Fields only the owner (or staff with full access) may see or change. */
export const MONEY_KEYS = ['purchase_per_ton', 'deduction_per_ton', 'costs', 'commission', 'tax_pct', 'target_margin_pct'];

export const newSheet = (overrides = {}) => ({
  id: '',
  name: '',
  mode: 'shipment', // 'shipment' | 'quotation'
  buyer: '',
  lead_id: '',
  product: '',
  term: 'CIF',
  container: { type: '20 ft', tons_per: 25, count: 1, bags_per: 500 },
  currency: { local: 'INR', foreign: 'USD', rate: 83 }, // rate = local currency for 1 foreign
  purchase_per_ton: 0,
  deduction_per_ton: 0,
  costs: { customs: 0, local_charges: 0, agency: 0, freight_per_container: 0, insurance_pct: 0 },
  selling_price_per_ton: 0,
  commission: { agent_pct: 0, consultant_pct: 0, sales_pct: 0 },
  tax_pct: 0,
  target_margin_pct: 10,
  tasks: [],
  notes: '',
  ...overrides,
});

const num = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/**
 * All the numbers for one sheet. `hidden` = true when the viewer may not see costs:
 * then only quantities and the sale value are returned, money results are null.
 */
export function calcSheet(sheet, { hidden = false } = {}) {
  const s = sheet || {};
  const c = s.container || {};
  const tons = num(c.tons_per) * num(c.count);
  const bags = num(c.bags_per) * num(c.count);
  const rate = num(s.currency?.rate) || 1;
  const saleValue = num(s.selling_price_per_ton) * tons;
  const base = {
    tons: round(tons, 3),
    bags: Math.round(bags),
    containers: num(c.count),
    saleValue: round(saleValue),
    sellingPerTon: num(s.selling_price_per_ton),
  };
  if (hidden) return { ...base, hidden: true, fob: null, cfr: null, cif: null, gross: null, net: null };

  const costs = s.costs || {};
  const productLocal = (num(s.purchase_per_ton) - num(s.deduction_per_ton)) * tons;
  const product = productLocal / rate;
  const fobCharges = (num(costs.customs) + num(costs.local_charges) + num(costs.agency)) / rate;
  const fob = product + fobCharges;
  const freight = num(costs.freight_per_container) * num(c.count);
  const cfr = fob + freight;
  const insurance = (num(costs.insurance_pct) / 100) * cfr;
  const cif = cfr + insurance;
  const term = PRICE_TERMS.includes(s.term) ? s.term : 'CIF';
  const cost = term === 'FOB' ? fob : term === 'CFR' ? cfr : cif;
  const gross = saleValue - cost;
  const cm = s.commission || {};
  const commissionPct = num(cm.agent_pct) + num(cm.consultant_pct) + num(cm.sales_pct);
  const commissions = {
    agent: (num(cm.agent_pct) / 100) * saleValue,
    consultant: (num(cm.consultant_pct) / 100) * saleValue,
    sales: (num(cm.sales_pct) / 100) * saleValue,
  };
  const commissionTotal = commissions.agent + commissions.consultant + commissions.sales;
  const pbt = gross - commissionTotal;
  const tax = pbt > 0 ? (num(s.tax_pct) / 100) * pbt : 0;
  const net = pbt - tax;
  const perTon = (v) => (tons > 0 ? round(v / tons) : 0);
  // Quotation: the price per ton that leaves the target margin after commissions
  const margin = num(s.target_margin_pct);
  const denominator = 1 - (margin + commissionPct) / 100;
  const quote = (v) => (tons > 0 && denominator > 0 ? round(v / tons / denominator) : null);

  return {
    ...base,
    hidden: false,
    term,
    productLocal: round(productLocal),
    product: round(product),
    fobCharges: round(fobCharges),
    freight: round(freight),
    insurance: round(insurance),
    fob: round(fob),
    cfr: round(cfr),
    cif: round(cif),
    cost: round(cost),
    perTon: { fob: perTon(fob), cfr: perTon(cfr), cif: perTon(cif), cost: perTon(cost) },
    gross: round(gross),
    commissions: { agent: round(commissions.agent), consultant: round(commissions.consultant), sales: round(commissions.sales), total: round(commissionTotal) },
    pbt: round(pbt),
    tax: round(tax),
    net: round(net),
    netLocal: round(net * rate),
    marginPct: saleValue > 0 ? round((net / saleValue) * 100, 1) : 0,
    quotePerTon: { fob: quote(fob), cfr: quote(cfr), cif: quote(cif) },
  };
}

/** A copy of a sheet to start a new one from (keeps every number, clears the id and tasks' done state). */
export const copySheet = (sheet) => ({
  ...JSON.parse(JSON.stringify(sheet || {})),
  id: '',
  name: `${sheet?.name || 'Cost sheet'} (copy)`,
  tasks: (sheet?.tasks || []).map((t) => ({ ...t, id: `t${Math.random().toString(36).slice(2, 9)}`, done: false })),
  created_at: undefined,
  updated_at: undefined,
});

export const money = (v, cur = 'USD') =>
  v === null || v === undefined ? '—' : `${cur} ${Number(v).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
