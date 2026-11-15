/**
 * Test cases for the shipment cost sheet / quotation calculator (frontend/src/data/shippingCalc.js).
 * The numbers come from the company's own "Quotation Calculator" Google Sheet.
 * Run:  npm --prefix frontend run test:shipping
 */
import { newSheet, calcSheet, copySheet, upgradeSheet } from '../src/data/shippingCalc.js';

const results = [];
const rec = (id, scenario, expected, actual, pass) => results.push({ id, scenario, expected: String(expected), actual: String(actual), result: pass ? 'PASS' : 'FAIL' });
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;

// The example in the sheet: 25 MT per container, 95 INR per USD, ex-plant 10/kg, transport 1/kg,
// customs 60,000 per container, 3% profit, freight 400 USD per container, insurance 5,000 per container.
const sheetExample = newSheet({
  term: 'CIF',
  quote_unit: 'ton',
  container: { type: '20 ft', tons_per: 25, count: 1, bags_per: 500 },
  currency: { local: 'INR', foreign: 'USD', rate: 95 },
  price_per_kg: 10,
  transport_per_kg: 1,
  costs: { customs_per_container: 60000, freight_per_container: 400, insurance_per_container: 5000 },
  profit_pct: 3,
});
const r = calcSheet(sheetExample);

rec('SHEET-01', 'FOB per ton = same as the company sheet', '145.28', r.perTon.fob, near(r.perTon.fob, 145.28));
rec('SHEET-02', 'CFR per ton = same as the company sheet', '161.28', r.perTon.cfr, near(r.perTon.cfr, 161.28));
rec('SHEET-03', 'CIF per ton = same as the company sheet', '163.45', r.perTon.cif, near(r.perTon.cif, 163.45));
rec('B-01', 'Cost up to port per ton in INR = 11,000 + 60,000 / 25', '13400', r.build.costFobLocal, r.build.costFobLocal === 13400);
rec('B-02', 'Freight per ton = 400 / 25, without profit on it', '16', r.build.freight, r.build.freight === 16 && near(r.perTon.cfr - r.perTon.fob, 16));
rec('B-03', 'Insurance only in CIF: 5,000 / 25 = 200 INR per ton', '200', r.build.insurance, r.build.insurance === 200);

const kg = calcSheet({ ...sheetExample, quote_unit: 'kg' });
rec('KG-01', 'Per kg quote = per ton / 1000 (the sheet’s per-kg mistake is fixed)', 'FOB 0.1453, CIF 0.1635', `${kg.quote.fob}, ${kg.quote.cif}`, near(kg.quote.fob, 0.1453, 0.0001) && near(kg.quote.cif, 0.1635, 0.0001));
rec('KG-02', 'Per ton quote shows per ton numbers', '145.28', r.quote.fob, near(r.quote.fob, 145.28));

const two = calcSheet({ ...sheetExample, container: { ...sheetExample.container, count: 2 } });
rec('Q-01', 'Total quantity and bags from the containers', '50 MT, 1000 bags', `${two.tons} MT, ${two.bags} bags`, two.tons === 50 && two.bags === 1000);
rec('Q-02', 'Price per ton does not change with the number of containers', '163.45', two.perTon.cif, near(two.perTon.cif, 163.45));
rec('P-01', 'Shipment value = CIF price x tons', '163.45 x 50 ≈ 8172.63', two.saleValue, near(two.saleValue, 8172.63, 0.05));
rec('P-02', 'Profit = 3% of the cost (goods + customs + insurance), in USD', '13,600 x 0.03 / 95 x 50 ≈ 214.74', two.profit, near(two.profit, 214.74, 0.05));
rec('P-03', 'No commission or tax = net profit equals the profit', 'equal', `${two.net} / ${two.profit}`, near(two.net, two.profit));

const withCm = calcSheet({ ...sheetExample, commission: { agent_pct: 1, consultant_pct: 0, sales_pct: 0.5 }, tax_pct: 25 });
rec('CM-01', 'Commissions are taken out of the profit and do not change the quote', 'CIF still 163.45', withCm.perTon.cif, near(withCm.perTon.cif, 163.45));
rec('CM-02', 'Commissions = % of the shipment value; tax on positive profit', 'pbt = profit - 1.5% of sale', withCm.pbt, near(withCm.pbt, withCm.profit - withCm.saleValue * 0.015) && near(withCm.tax, withCm.pbt * 0.25));
const loss = calcSheet({ ...sheetExample, profit_pct: 1, commission: { agent_pct: 5 }, tax_pct: 25 });
rec('CM-03', 'A loss after commissions shows negative and no tax', 'net < 0, tax 0', `${loss.net}, ${loss.tax}`, loss.net < 0 && loss.tax === 0);

const fob = calcSheet({ ...sheetExample, term: 'FOB' });
rec('T-01', 'Choosing FOB makes FOB the shipment price', '145.28', fob.quotePerTon, near(fob.quotePerTon, 145.28));

const hidden = calcSheet({ ...sheetExample, quote: { fob: 145.28, cfr: 161.28, cif: 163.45 }, price_per_kg: undefined, costs: undefined }, { hidden: true });
rec('H-01', 'Staff without cost access get the quote from the server, no money details', 'CIF 163.45, net null', `${hidden.quote.cif}, ${hidden.net}`, hidden.quote.cif === 163.45 && hidden.net === null && hidden.build === undefined);

const empty = calcSheet(newSheet({ container: { type: '20 ft', tons_per: 0, count: 0, bags_per: 0 } }));
rec('E-01', 'An empty sheet gives zeros, not errors', '0 tons, net 0, FOB 0', `${empty.tons}, ${empty.net}, ${empty.perTon.fob}`, empty.tons === 0 && empty.net === 0 && empty.perTon.fob === 0);
const text = calcSheet({ ...sheetExample, price_per_kg: '10', costs: { ...sheetExample.costs, customs_per_container: '60,000' }, currency: { ...sheetExample.currency, rate: '95' } });
rec('E-02', 'Text with commas is read as a number', '145.28', text.perTon.fob, near(text.perTon.fob, 145.28));

const old = upgradeSheet({ container: { tons_per: 25, count: 2 }, purchase_per_ton: 24900, deduction_per_ton: 400, costs: { customs: 41500, local_charges: 16600, agency: 8300, freight_per_container: 1200, insurance_pct: 0.5 }, target_margin_pct: 10 });
rec('UP-01', 'Sheets saved with the old fields are turned into the new ones', 'price 24.5/kg, customs 33,200/container, profit 10%', `${old.price_per_kg}, ${old.costs.customs_per_container}, ${old.profit_pct}`, old.price_per_kg === 24.5 && old.costs.customs_per_container === 33200 && old.costs.freight_per_container === 1200 && old.profit_pct === 10);

const copy = copySheet({ ...sheetExample, id: 'ship_1', name: 'Saigon CIF', tasks: [{ id: 'a', title: 'Booking', done: true }] });
rec('CP-01', 'Copy keeps every number but is a new sheet with open tasks', 'no id, (copy), task open', `${copy.id || 'no id'} | ${copy.name} | ${copy.tasks[0].done}`, copy.id === '' && copy.name === 'Saigon CIF (copy)' && copy.tasks[0].done === false && copy.price_per_kg === 10 && copy.tasks[0].id !== 'a');

const fails = results.filter((x) => x.result === 'FAIL');
console.table(results.map((x) => ({ ...x, scenario: x.scenario.slice(0, 62), expected: x.expected.slice(0, 36), actual: x.actual.slice(0, 40) })));
console.log(`SHIPPING CALCULATOR: ${results.length - fails.length} PASSED | ${fails.length} FAILED | TOTAL: ${results.length}`);
process.exit(fails.length ? 1 : 0);
