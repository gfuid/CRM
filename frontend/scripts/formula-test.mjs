/**
 * Test cases for the calculator formula engine (frontend/src/data/formula.js, copied to admin/src/data/formula.js).
 * Run:  node frontend/scripts/formula-test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateCalculator, checkCalculator, parseFormula, makeKey, EXAMPLE_ROWS } from '../src/data/formula.js';

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
const sheet = evaluateCalculator(EXAMPLE_ROWS, {});
rec('F-01', 'Example calculator = the company sheet (FOB / CFR / CIF)', '143.87 / 159.87 / 162.02', `${sheet.values.fob?.toFixed(2)} / ${sheet.values.cfr?.toFixed(2)} / ${sheet.values.cif?.toFixed(2)}`, near(sheet.values.fob, 143.87) && near(sheet.values.cfr, 159.87) && near(sheet.values.cif, 162.02));
const perKg = evaluateCalculator(EXAMPLE_ROWS, { unit_kg: 1 });
rec('F-02', 'Choosing "Kg" in the dropdown gives the price per kg', 'FOB 0.1439', perKg.values.fob?.toFixed(4), near(perKg.values.fob, 0.1439, 0.00005));
rec('F-03', 'Typed values replace the starting values', 'profit 3% -> FOB 145.28', evaluateCalculator(EXAMPLE_ROWS, { profit: 3 }).values.fob?.toFixed(2), near(evaluateCalculator(EXAMPLE_ROWS, { profit: 3 }).values.fob, 145.28));

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
const b = fs.readFileSync(path.join(here, '../../admin/src/data/formula.js'), 'utf8');
rec('S-01', 'Admin Console and CRM use the same formula file', 'identical', a === b ? 'identical' : 'different — copy frontend/src/data/formula.js to admin/src/data/', a === b);

const fails = results.filter((x) => x.result === 'FAIL');
console.table(results.map((x) => ({ ...x, scenario: x.scenario.slice(0, 64), expected: x.expected.slice(0, 30), actual: x.actual.slice(0, 40) })));
console.log(`CALCULATOR FORMULAS: ${results.length - fails.length} PASSED | ${fails.length} FAILED | TOTAL: ${results.length}`);
process.exit(fails.length ? 1 : 0);
