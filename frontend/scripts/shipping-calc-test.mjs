/**
 * Test cases for the shipment cost sheet / quotation calculator (frontend/src/data/shippingCalc.js).
 * Run:  npm --prefix frontend run test:shipping
 */
import { newSheet, calcSheet, copySheet } from '../src/data/shippingCalc.js';

const results = [];
const rec = (id, scenario, expected, actual, pass) => results.push({ id, scenario, expected: String(expected), actual: String(actual), result: pass ? 'PASS' : 'FAIL' });
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;

// 2 x 20 ft, 25 MT each = 50 MT. Buy at 24,900 INR/MT less 400 deduction; rate 83 INR per USD.
const base = newSheet({
  term: 'CIF',
  container: { type: '20 ft', tons_per: 25, count: 2, bags_per: 500 },
  currency: { local: 'INR', foreign: 'USD', rate: 83 },
  purchase_per_ton: 24900,
  deduction_per_ton: 400,
  costs: { customs: 41500, local_charges: 16600, agency: 8300, freight_per_container: 1200, insurance_pct: 0.5 },
  selling_price_per_ton: 380,
  commission: { agent_pct: 2, consultant_pct: 1, sales_pct: 0.5 },
  tax_pct: 25,
  target_margin_pct: 10,
});
const r = calcSheet(base);

rec('Q-01', 'Total quantity and bags from the containers', '50 MT, 1000 bags', `${r.tons} MT, ${r.bags} bags`, r.tons === 50 && r.bags === 1000);
rec('C-01', 'Product cost = (purchase - deduction) x tons, converted', '(24900-400)*50/83 = 14759.04', r.product, near(r.product, 14759.04));
rec('C-02', 'FOB = product + customs, local and agency charges', '14759.04 + 800 = 15559.04', r.fob, near(r.fob, 15559.04));
rec('C-03', 'CFR = FOB + freight per container x containers', '15559.04 + 2400 = 17959.04', r.cfr, near(r.cfr, 17959.04));
rec('C-04', 'CIF = CFR + insurance % of CFR', '17959.04 * 1.005 = 18048.84', r.cif, near(r.cif, 18048.84));
rec('P-01', 'Sale value = selling price x tons', '380 * 50 = 19000', r.saleValue, r.saleValue === 19000);
rec('P-02', 'Gross profit on CIF = sale - CIF cost', '19000 - 18048.84 = 951.16', r.gross, near(r.gross, 951.16));
rec('P-03', 'Commissions are % of the sale value', '380 + 190 + 95 = 665', r.commissions.total, near(r.commissions.total, 665));
rec('P-04', 'Profit before tax = gross - commissions', '286.16', r.pbt, near(r.pbt, 286.16));
rec('P-05', 'Tax on a positive profit, net = PBT - tax', 'tax 71.54, net 214.62', `${r.tax}, ${r.net}`, near(r.tax, 71.54) && near(r.net, 214.62));
rec('P-06', 'Net profit is also shown in the local currency', 'net x 83 ≈ 17814 (within 1)', r.netLocal, near(r.netLocal, r.net * 83, 1));

const fob = calcSheet({ ...base, term: 'FOB' });
rec('T-01', 'On FOB terms the profit is against the FOB cost', '19000 - 15559.04 = 3440.96', fob.gross, near(fob.gross, 3440.96));
const loss = calcSheet({ ...base, selling_price_per_ton: 300 });
rec('T-02', 'A loss shows as a negative profit and no tax', 'net < 0, tax 0', `${loss.net}, ${loss.tax}`, loss.net < 0 && loss.tax === 0);

// Quote price: cost per ton / (1 - (margin + commissions)%)
rec('QT-01', 'Quote price per ton keeps the target margin after commissions', 'CIF 360.98 / (1 - 0.135) = 417.32', r.quotePerTon.cif, near(r.quotePerTon.cif, 417.32));
const impossible = calcSheet({ ...base, target_margin_pct: 99 });
rec('QT-02', 'An impossible margin gives no quote instead of a wrong number', 'null', impossible.quotePerTon.cif, impossible.quotePerTon.cif === null);

const hidden = calcSheet(base, { hidden: true });
rec('H-01', 'Hidden mode (staff without cost access) returns no money results', 'net null, sale shown', `${hidden.net}, ${hidden.saleValue}`, hidden.net === null && hidden.fob === null && hidden.saleValue === 19000);

const empty = calcSheet(newSheet({ container: { type: '20 ft', tons_per: 0, count: 0, bags_per: 0 } }));
rec('E-01', 'An empty sheet gives zeros, not errors', '0 tons, net 0', `${empty.tons}, ${empty.net}, ${empty.perTon.fob}`, empty.tons === 0 && empty.net === 0 && empty.perTon.fob === 0);
const text = calcSheet({ ...base, purchase_per_ton: '24,900', currency: { ...base.currency, rate: '' } });
rec('E-02', 'Text with commas is read as a number; a missing rate counts as 1', 'product 1225000', text.product, near(text.product, (24900 - 400) * 50));

const copy = copySheet({ ...base, id: 'ship_1', name: 'Saigon CIF', tasks: [{ id: 'a', title: 'Booking', done: true }] });
rec('CP-01', 'Copy keeps every number but is a new sheet with open tasks', 'no id, (copy), task open', `${copy.id || 'no id'} | ${copy.name} | ${copy.tasks[0].done}`, copy.id === '' && copy.name === 'Saigon CIF (copy)' && copy.tasks[0].done === false && copy.purchase_per_ton === 24900 && copy.tasks[0].id !== 'a');

const fails = results.filter((x) => x.result === 'FAIL');
console.table(results.map((x) => ({ ...x, scenario: x.scenario.slice(0, 62), expected: x.expected.slice(0, 36), actual: x.actual.slice(0, 40) })));
console.log(`SHIPPING CALCULATOR: ${results.length - fails.length} PASSED | ${fails.length} FAILED | TOTAL: ${results.length}`);
process.exit(fails.length ? 1 : 0);
