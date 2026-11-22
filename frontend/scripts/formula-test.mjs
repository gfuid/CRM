/**
 * Test cases for the calculator formula engine (frontend/src/data/formula.js, copied to admin/src/data/formula.js).
 * Run:  node frontend/scripts/formula-test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateCalculator, checkCalculator, parseFormula, makeKey, currencyOf, unitText, upgradeToCurrency, EXAMPLE_ROWS } from '../src/data/formula.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const rec = (id, scenario, expected, actual, pass) => results.push({ id, scenario, expected: String(expected), actual: String(actual), result: pass ? 'PASS' : 'FAIL' });
const near = (a, b, eps = 0.005) => Math.abs(a - b) <= eps;
const one = (formula, boxes = {}) => {
  const rows = [...Object.entries(boxes).map(([key, v]) => ({ key, label: key, kind: 'number', default: v })), { key: 'x', label: 'x', kind: 'formula', formula }];
  const r = evaluateCalculator(rows, {});
  return { v: r.values.x, e: r.errors.x || '' };
};

// The company sheet, built with the engine
const sheet = evaluateCalculator(EXAMPLE_ROWS, {}, { fx: 95 });
rec('F-01', 'Example calculator = the company sheet (FOB / CFR / CIF)', '143.87 / 159.87 / 162.02', `${sheet.values.fob?.toFixed(2)} / ${sheet.values.cfr?.toFixed(2)} / ${sheet.values.cif?.toFixed(2)}`, near(sheet.values.fob, 143.87) && near(sheet.values.cfr, 159.87) && near(sheet.values.cif, 162.02));
const perKg = evaluateCalculator(EXAMPLE_ROWS, { unit_kg: 1 }, { fx: 95 });
rec('F-02', 'Choosing "Kg" in the dropdown gives the price per kg', 'FOB 0.1439', perKg.values.fob?.toFixed(4), near(perKg.values.fob, 0.1439, 0.00005));
rec('F-03', 'Typed values replace the starting values', 'profit 3% -> FOB 145.28', evaluateCalculator(EXAMPLE_ROWS, { profit: 3 }, { fx: 95 }).values.fob?.toFixed(2), near(evaluateCalculator(EXAMPLE_ROWS, { profit: 3 }, { fx: 95 }).values.fob, 145.28));

// Maths
const cases = [
  ['M-01', '1 + 2 * 3', 7], ['M-02', '(1 + 2) * 3', 9], ['M-03', '2 ^ 3 ^ 2', 512], ['M-04', '10 - 4 - 3', 3], ['M-05', '-5 + 2', -3],
  ['M-06', '5% * 200', 10], ['M-07', 'SUM(1, 2, 3) + MAX(4, 9) - MIN(2, 7)', 13], ['M-08', 'ROUND(2.345, 2)', 2.35], ['M-09', 'ROUNDUP(2.301, 1)', 2.4],
  ['M-10', 'ROUNDDOWN(2.399, 1)', 2.3], ['M-11', 'IF(3 > 2, 10, 20)', 10], ['M-12', 'IF(3 <= 2, 10, 20)', 20], ['M-13', 'AVERAGE(2, 4, 9)', 5], ['M-14', '=1+1', 2],
  ['M-15', 'ABS(-4) + SQRT(9)', 7], ['M-16', '2 = 2', 1], ['M-17', '2 <> 2', 0],
];
cases.forEach(([id, f, want]) => { const r = one(f); rec(id, `Formula ${f}`, want, r.v ?? r.e, near(r.v, want)); });

// Boxes and rows
rec('B-01', 'Box names work in formulas', '25 * 4 = 100', one('tons * qty', { tons: 25, qty: 4 }).v, one('tons * qty', { tons: 25, qty: 4 }).v === 100);
rec('B-02', 'Row numbers work like Excel (R1 = first row)', 'R1 + R2 = 7', one('R1 + R2', { a: 3, b: 4 }).v, one('R1 + R2', { a: 3, b: 4 }).v === 7);
const order = evaluateCalculator([{ key: 'total', label: 't', kind: 'formula', formula: 'a * 2' }, { key: 'a', label: 'a', kind: 'number', default: 6 }], {});
rec('B-03', 'A formula may use a box that comes later', '12', order.values.total, order.values.total === 12);
const chain = evaluateCalculator([{ key: 'a', label: 'a', kind: 'number', default: 2 }, { key: 'b', label: 'b', kind: 'formula', formula: 'a*10' }, { key: 'c', label: 'c', kind: 'formula', formula: 'b+1' }], {});
rec('B-04', 'A formula may use another formula', '21', chain.values.c, chain.values.c === 21);
rec('B-05', 'Empty input counts as 0', '0 + 5 = 5', one('a + 5', { a: '' }).v, one('a + 5', { a: '' }).v === 5);

// Mistakes are reported, never run as code
const bad = [
  ['E-01', 'eval(1)', /Unknown function/], ['E-02', 'alert(1)', /Unknown function/], ['E-03', '1 +', /ends too early/], ['E-04', 'nope * 2', /Unknown box/],
  ['E-05', '1 / 0', /divide by 0/], ['E-06', '2 $ 3', /not allowed/], ['E-07', 'IF(1, 2)', /IF needs 3 parts/], ['E-08', '(1 + 2', /Missing "\)"/],
  ['E-09', 'constructor', /Unknown box/], ['E-10', '__proto__ * 1', /Unknown box/],
];
bad.forEach(([id, f, re]) => { const r = one(f); rec(id, `Wrong formula "${f}" gives a clear message`, re.source, r.e || r.v, r.v === null && re.test(r.e)); });
const loop = evaluateCalculator([{ key: 'a', label: 'a', kind: 'formula', formula: 'b + 1' }, { key: 'b', label: 'b', kind: 'formula', formula: 'a + 1' }], {});
rec('E-11', 'A loop (a uses b, b uses a) is reported', 'loop', Object.values(loop.errors).join(' | '), Object.values(loop.errors).some((m) => /loop/.test(m)));

// Checks before saving
rec('C-01', 'The example calculator has no problems', '0', checkCalculator(EXAMPLE_ROWS).length, checkCalculator(EXAMPLE_ROWS).length === 0);
const probs = checkCalculator([{ key: 'a', label: '', kind: 'number' }, { key: 'a', label: 'Dup', kind: 'number' }, { key: 'f', label: 'F', kind: 'formula', formula: '1 +' }, { key: 's', label: 'S', kind: 'select', options: [] }]);
rec('C-02', 'Missing name, same box name twice, broken formula, empty dropdown are listed', '4 problems', probs.join(' | '), probs.length >= 4);
rec('C-03', 'Box names are made from the row name', 'price_per_kg_inr, tons_2', `${makeKey('Price per kg (INR)')}, ${makeKey('Tons', ['tons'])}`, makeKey('Price per kg (INR)') === 'price_per_kg_inr' && makeKey('Tons', ['tons']) === 'tons_2');
let threw = '';
try { parseFormula(''); } catch (e) { threw = e.message; }
rec('C-04', 'An empty formula is refused', 'The formula is empty', threw, threw === 'The formula is empty');

// The Admin Console runs the same engine
const a = fs.readFileSync(path.join(here, '../src/data/formula.js'), 'utf8');
// Currency boxes: pick a local and a quote currency, fx = today's rate (local for 1 quote)
const CUR_ROWS = [
  { key: 'tons', label: 'Total ton in a container', kind: 'number', default: 25 },
  { key: 'local_currency', label: 'Local value in currency', kind: 'currency', role: 'local', default: 'INR' },
  { key: 'quote_currency', label: 'Share quote in currency', kind: 'currency', role: 'quote', default: 'USD' },
  { key: 'unit_kg', label: 'Need quote in Ton/kg', kind: 'select', default: 1000, options: [{ label: 'Ton', value: 1000 }, { label: 'Kg', value: 1 }] },
  { key: 'price_kg', label: 'Per kg price', kind: 'number', default: 10 },
  { key: 'transport_kg', label: 'Local transport', kind: 'number', default: 1 },
  { key: 'customs', label: 'Customs', kind: 'number', default: 60000 },
  { key: 'profit', label: 'Profit %', kind: 'number', default: 2 },
  { key: 'fob', label: 'FOB', kind: 'formula', unit: '{quote}/MT', formula: '((price_kg + transport_kg) * unit_kg + customs / tons * unit_kg / 1000) * (1 + profit%) / fx' },
];
const BAD_ROWS = [...CUR_ROWS, { key: 'bad', label: 'Bad', kind: 'formula', formula: 'local_currency * 2' }];
const cur95 = evaluateCalculator(CUR_ROWS, {}, { fx: 95 });
rec('X-01', 'fx = the rate the page gives: same FOB as the old sheet with rate 95', '143.87', cur95.values.fob?.toFixed(2), near(cur95.values.fob, 143.87));
const noRate = evaluateCalculator(CUR_ROWS, {}).errors.fob || '';
rec('X-02', 'Without a rate the result says the rate is not loaded', 'not loaded', noRate, /not loaded/.test(noRate));
const same = evaluateCalculator(CUR_ROWS, { quote_currency: 'INR' });
rec('X-03', 'Same local and quote currency: fx = 1 (no rate needed)', '13668.0', same.values.fob?.toFixed(1), near(same.values.fob, 13668, 0.05));
const aed = currencyOf(CUR_ROWS, { local_currency: 'AED', quote_currency: 'eur' });
rec('X-04', 'Chosen currencies are read (any case), units use them', 'AED EUR EUR/MT', `${aed.local} ${aed.quote} ${unitText('{quote}/MT', aed)}`, aed.local === 'AED' && aed.quote === 'EUR' && unitText('{quote}/MT', aed) === 'EUR/MT');
const curBad = evaluateCalculator(BAD_ROWS, {}, { fx: 95 }).errors.bad || '';
rec('X-05', 'A currency box has no number; using its name in a formula points to fx', 'use fx', curBad, /use fx/.test(curBad));
const noBoxes = checkCalculator([{ key: 'a', label: 'A', kind: 'number', default: 1 }, { key: 'b', label: 'B', kind: 'formula', formula: 'a / fx' }]);
rec('X-06', 'fx without the two currency boxes is refused before saving', 'Add a "Local currency"', noBoxes[0] || 'none', /Local currency/.test(noBoxes[0] || ''));
const twoLocal = checkCalculator([...CUR_ROWS, { key: 'local2', label: 'Local 2', kind: 'currency', role: 'local', default: 'AED' }]);
const twoLocalRefused = twoLocal.some((x) => /Only one "Local/.test(x));
rec('X-07', 'Only one Local currency box; the full example checks clean', 'refused / 0 problems', `${twoLocalRefused ? 'refused' : 'allowed'} / ${checkCalculator(CUR_ROWS).length} problems`, twoLocalRefused && checkCalculator(CUR_ROWS).length === 0);
const fxNamed = checkCalculator([{ key: 'fx', label: 'Fx', kind: 'number', default: 1 }]).length > 0;
rec('X-08', 'A box may not be called fx (it is the rate)', 'fx_box + refused', `${makeKey('FX')} + ${fxNamed ? 'refused' : 'allowed'}`, makeKey('FX') === 'fx_box' && fxNamed);
const OLD_EXAMPLE = [
  { key: 'tons', label: 'Total ton in a container', kind: 'number', default: 25, unit: 'MT' },
  { key: 'rate', label: 'Share quote in which currency (1 USD = ? INR)', kind: 'number', default: 95, unit: 'INR' },
  { key: 'unit_kg', label: 'Need quote in Ton/kg', kind: 'select', default: 1000, options: [{ label: 'Ton', value: 1000 }, { label: 'Kg', value: 1 }] },
  { key: 'price_kg', label: 'Per Kg Price', kind: 'number', default: 10, unit: 'INR/kg' },
  { key: 'transport_kg', label: 'Local transport', kind: 'number', default: 1, unit: 'INR/kg' },
  { key: 'customs', label: 'Customs', kind: 'number', default: 60000, unit: 'INR/container' },
  { key: 'profit', label: 'Profit in %', kind: 'number', default: 2, unit: '%' },
  { key: 'fob', label: 'FOB', kind: 'formula', formula: '((price_kg + transport_kg) * unit_kg + customs / tons * unit_kg / 1000) * (1 + profit%) / rate', unit: 'USD' },
];
const up = upgradeToCurrency(OLD_EXAMPLE);
const upRes = up ? evaluateCalculator(up, {}, { fx: 95 }) : { values: {} };
rec('X-09', 'Old calculator with a typed rate -> currency dropdowns + fx, same FOB at the same rate', 'local INR, quote USD, {local}/kg, FOB 143.87, again: null',
  `${up?.[1]?.kind}:${up?.[1]?.default} ${up?.[2]?.default} ${up?.[4]?.unit} FOB ${upRes.values.fob?.toFixed(2)} again: ${upgradeToCurrency(up)}`,
  up && up[1].role === 'local' && up[1].default === 'INR' && up[2].role === 'quote' && up[2].default === 'USD' && up[4].unit === '{local}/kg' && up[8].formula.endsWith('/ fx') && near(upRes.values.fob, 143.87) && upgradeToCurrency(up) === null && upgradeToCurrency(EXAMPLE_ROWS) === null);

const b = fs.readFileSync(path.join(here, '../../admin/src/data/formula.js'), 'utf8');
rec('S-01', 'Admin Console and CRM use the same formula file', 'identical', a === b ? 'identical' : 'different — copy frontend/src/data/formula.js to admin/src/data/', a === b);

const fails = results.filter((x) => x.result === 'FAIL');
console.table(results.map((x) => ({ ...x, scenario: x.scenario.slice(0, 64), expected: x.expected.slice(0, 30), actual: x.actual.slice(0, 40) })));
console.log(`CALCULATOR FORMULAS: ${results.length - fails.length} PASSED | ${fails.length} FAILED | TOTAL: ${results.length}`);
process.exit(fails.length ? 1 : 0);
