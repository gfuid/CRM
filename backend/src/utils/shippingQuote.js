/**
 * Quote prices for a cost sheet, worked out on the server so that staff who may not see costs
 * still get the right FOB / CFR / CIF price. SAME FORMULA as frontend/src/data/shippingCalc.js
 * (the company's "Quotation Calculator" sheet); both are checked against the sheet's own numbers in tests.
 */
const num = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const round = (n) => Math.round(n * 100) / 100;

/** Sheets saved before 2026-11-16 used other fields: map them to the new ones. */
const upgradeSheet = (s) => {
  if (!s || s.price_per_kg !== undefined || s.purchase_per_ton === undefined) return s;
  const count = Math.max(1, num(s.container && s.container.count));
  const old = s.costs || {};
  return {
    ...s,
    quote_unit: 'ton',
    price_per_kg: Math.round(((num(s.purchase_per_ton) - num(s.deduction_per_ton)) / 1000) * 1e4) / 1e4,
    transport_per_kg: 0,
    costs: {
      customs_per_container: round((num(old.customs) + num(old.local_charges) + num(old.agency)) / count),
      freight_per_container: num(old.freight_per_container),
      insurance_per_container: 0,
    },
    profit_pct: s.target_margin_pct !== undefined ? num(s.target_margin_pct) : 3,
  };
};

/** { fob, cfr, cif } per ton in the quote currency. */
const quotePerTon = (sheet) => {
  const s = sheet || {};
  const tonsPer = num(s.container && s.container.tons_per);
  const rate = num(s.currency && s.currency.rate) || 1;
  const costs = s.costs || {};
  const markup = 1 + num(s.profit_pct) / 100;
  const perContainer = (v) => (tonsPer > 0 ? num(v) / tonsPer : 0);
  const goods = (num(s.price_per_kg) + num(s.transport_per_kg)) * 1000;
  const customs = perContainer(costs.customs_per_container);
  const insurance = perContainer(costs.insurance_per_container);
  const freight = perContainer(costs.freight_per_container);
  const fob = ((goods + customs) * markup) / rate;
  return { fob: round(fob), cfr: round(fob + freight), cif: round(((goods + customs + insurance) * markup) / rate + freight) };
};

module.exports = { upgradeSheet, quotePerTon };
