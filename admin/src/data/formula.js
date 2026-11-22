/**
 * A small, safe formula engine for calculators the platform admin builds (like a sheet).
 * NO eval: the formula is parsed into a tree and only maths below is allowed.
 *
 *   Numbers and box names:   price_per_kg * 1000 + customs / tons
 *   Row numbers like Excel:  (R5 + R6) * R4            (R1 = the first row)
 *   Operators:               + - * / ^  and  x%  (= x / 100)
 *   Compare:                 > < >= <= = == != <>      (true = 1, false = 0)
 *   Functions:               SUM MIN MAX AVERAGE ROUND ROUNDUP ROUNDDOWN ABS SQRT IF
 *   Exchange rate:           fx = how much local currency for 1 quote currency (today's rate), e.g. 93.5 for 1 USD = 93.5 INR
 *                            (needs a "Local currency" and a "Quote currency" box; the page gives the rate)
 *
 * THE SAME FILE is kept in admin/src/data/formula.js (frontend/scripts/formula-test.mjs checks they match).
 */

const FUNCS = {
  SUM: (...a) => a.reduce((s, x) => s + x, 0),
  MIN: (...a) => (a.length ? Math.min(...a) : 0),
  MAX: (...a) => (a.length ? Math.max(...a) : 0),
  AVERAGE: (...a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0),
  ROUND: (x, d = 0) => { const p = 10 ** Math.trunc(d); return Math.round(x * p) / p; },
  ROUNDUP: (x, d = 0) => { const p = 10 ** Math.trunc(d); return (x < 0 ? -1 : 1) * Math.ceil(Math.abs(x) * p) / p; },
  ROUNDDOWN: (x, d = 0) => { const p = 10 ** Math.trunc(d); return (x < 0 ? -1 : 1) * Math.floor(Math.abs(x) * p) / p; },
  ABS: (x) => Math.abs(x),
  SQRT: (x) => Math.sqrt(x),
};
export const FUNCTION_NAMES = [...Object.keys(FUNCS), 'IF'];

const tokenize = (src) => {
  const s = String(src || '');
  const out = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i += 1; continue; }
    if (/[0-9.]/.test(ch)) {
      const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
      if (!m) throw new Error(`Wrong number near "${s.slice(i, i + 6)}"`);
      out.push({ t: 'num', v: Number(m[1]) });
      i += m[1].length;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i));
      out.push({ t: 'id', v: m[0] });
      i += m[0].length;
      continue;
    }
    const two = s.slice(i, i + 2);
    if (['>=', '<=', '==', '!=', '<>'].includes(two)) { out.push({ t: 'op', v: two === '<>' ? '!=' : two }); i += 2; continue; }
    if ('+-*/^%(),<>='.includes(ch)) { out.push({ t: 'op', v: ch === '=' ? '==' : ch }); i += 1; continue; }
    throw new Error(`"${ch}" is not allowed in a formula`);
  }
  return out;
};

/** Formula text -> tree. Throws an Error with a plain message when the formula is wrong. */
export const parseFormula = (src) => {
  const text = String(src || '').trim().replace(/^=/, '');
  if (!text) throw new Error('The formula is empty');
  const tk = tokenize(text);
  let p = 0;
  const peek = () => tk[p];
  const take = (v) => {
    const t = tk[p];
    if (!t || (v && t.v !== v)) throw new Error(v ? `Missing "${v}"` : 'The formula ends too early');
    p += 1;
    return t;
  };
  const isOp = (...vs) => peek() && peek().t === 'op' && vs.includes(peek().v);

  const primary = () => {
    const t = peek();
    if (!t) throw new Error('The formula ends too early');
    if (t.t === 'num') { p += 1; return { k: 'num', v: t.v }; }
    if (t.t === 'op' && t.v === '(') { p += 1; const e = compare(); take(')'); return e; }
    if (t.t === 'op' && (t.v === '-' || t.v === '+')) { p += 1; const e = power(); return t.v === '-' ? { k: 'neg', e } : e; }
    if (t.t === 'id') {
      p += 1;
      if (isOp('(')) {
        const name = t.v.toUpperCase();
        if (!FUNCS[name] && name !== 'IF') throw new Error(`Unknown function ${t.v}`);
        p += 1;
        const args = [];
        if (!isOp(')')) {
          args.push(compare());
          while (isOp(',')) { p += 1; args.push(compare()); }
        }
        take(')');
        if (name === 'IF' && args.length !== 3) throw new Error('IF needs 3 parts: IF(test, value if yes, value if no)');
        return { k: 'fn', name, args };
      }
      return { k: 'ref', name: t.v };
    }
    throw new Error(`Unexpected "${t.v}"`);
  };
  const postfix = () => {
    let e = primary();
    while (isOp('%')) { p += 1; e = { k: 'pct', e }; }
    return e;
  };
  const power = () => {
    const b = postfix();
    if (isOp('^')) { p += 1; return { k: 'bin', op: '^', a: b, b: power() }; }
    return b;
  };
  const term = () => {
    let e = power();
    while (isOp('*', '/')) { const op = take().v; e = { k: 'bin', op, a: e, b: power() }; }
    return e;
  };
  const sum = () => {
    let e = term();
    while (isOp('+', '-')) { const op = take().v; e = { k: 'bin', op, a: e, b: term() }; }
    return e;
  };
  const compare = () => {
    let e = sum();
    while (isOp('>', '<', '>=', '<=', '==', '!=')) { const op = take().v; e = { k: 'bin', op, a: e, b: sum() }; }
    return e;
  };
  const tree = compare();
  if (p < tk.length) throw new Error(`Unexpected "${tk[p].v}"`);
  return tree;
};

/** Every box name / row number a formula uses. */
export const formulaRefs = (src) => {
  const refs = new Set();
  const walk = (n) => {
    if (!n) return;
    if (n.k === 'ref') refs.add(n.name);
    if (n.e) walk(n.e);
    if (n.a) walk(n.a);
    if (n.b) walk(n.b);
    (n.args || []).forEach(walk);
  };
  walk(parseFormula(src));
  return [...refs];
};

const evalTree = (n, get) => {
  switch (n.k) {
    case 'num': return n.v;
    case 'ref': return get(n.name);
    case 'neg': return -evalTree(n.e, get);
    case 'pct': return evalTree(n.e, get) / 100;
    case 'fn': {
      if (n.name === 'IF') return evalTree(n.args[0], get) ? evalTree(n.args[1], get) : evalTree(n.args[2], get);
      return FUNCS[n.name](...n.args.map((a) => evalTree(a, get)));
    }
    case 'bin': {
      const a = evalTree(n.a, get);
      const b = evalTree(n.b, get);
      switch (n.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': if (b === 0) throw new Error('Cannot divide by 0'); return a / b;
        case '^': return a ** b;
        case '>': return a > b ? 1 : 0;
        case '<': return a < b ? 1 : 0;
        case '>=': return a >= b ? 1 : 0;
        case '<=': return a <= b ? 1 : 0;
        case '==': return a === b ? 1 : 0;
        case '!=': return a !== b ? 1 : 0;
        default: throw new Error(`Unknown operator ${n.op}`);
      }
    }
    default: throw new Error('Wrong formula');
  }
};

/** "Price per kg (INR)" -> "price_per_kg_inr" (unique among `taken`). */
export const makeKey = (label, taken = []) => {
  const base = String(label || 'box').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'n_$1').slice(0, 40) || 'box';
  const safe = /^r\d+$/.test(base) || base === FX ? `${base}_box` : base;
  let key = safe;
  let i = 2;
  while (taken.includes(key)) { key = `${safe}_${i}`; i += 1; }
  return key;
};

/* ---------------- currency boxes ---------------- */
// A "currency" row only picks a currency (no number): role 'local' = the values typed are in it,
// role 'quote' = the results are shown in it. `fx` in a formula is the rate between the two.
export const FX = 'fx';
const code = (v, fallback) => {
  const c = String(v || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  return c.length === 3 ? c : fallback;
};
/** The local and quote currency chosen in a calculator: { local, quote } (null when there is no such box). */
export const currencyOf = (rows = [], inputs = {}) => {
  const pick = (role, fallback) => {
    const r = (rows || []).find((x) => x.kind === 'currency' && (x.role || 'local') === role);
    if (!r) return null;
    return code(Object.prototype.hasOwnProperty.call(inputs, r.key) ? inputs[r.key] : r.default, fallback);
  };
  return { local: pick('local', 'INR'), quote: pick('quote', 'USD') };
};
/** "{quote}/MT" -> "USD/MT", "{local}/kg" -> "INR/kg" */
export const unitText = (unit, cur = {}) => String(unit || '')
  .replace(/\{quote\}/gi, cur.quote || 'quote currency')
  .replace(/\{local\}/gi, cur.local || 'local currency');

const toNumber = (v) => {
  if (v === '' || v === null || v === undefined) return 0;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Work out every row of a calculator.
 * rows: [{ key, kind: 'number' | 'select' | 'formula' | 'heading' | 'currency', default, options: [{ label, value }], formula, role }]
 * inputs: { key: typed value (a currency code for a currency box) }
 * ctx:    { fx: today's rate, local currency for 1 quote currency } (the page loads it)
 * -> { values: { key: number | null }, errors: { key: message }, currency: { local, quote, fx } }
 */
export const evaluateCalculator = (rows = [], inputs = {}, ctx = {}) => {
  const list = Array.isArray(rows) ? rows : [];
  const byKey = new Map(list.map((r, i) => [r.key, { r, i }]));
  const values = {};
  const errors = {};
  const state = {}; // key -> 'busy' | 'done'

  const currency = currencyOf(list, inputs);
  const givenFx = Number(ctx && ctx.fx);
  const fx = currency.local && currency.quote
    ? (currency.local === currency.quote ? 1 : (Number.isFinite(givenFx) && givenFx > 0 ? givenFx : null))
    : null;
  const resolve = (name) => {
    let entry = byKey.get(name);
    if (!entry && name.toLowerCase() === FX) {
      if (!currency.local || !currency.quote) throw new Error('Add a "Local currency" and a "Quote currency" box to use fx');
      if (fx === null) throw new Error("Today's exchange rate is not loaded yet");
      return fx;
    }
    if (!entry) {
      const m = /^r(\d+)$/i.exec(name);
      if (m) entry = list[Number(m[1]) - 1] ? { r: list[Number(m[1]) - 1] } : null;
    }
    if (!entry) throw new Error(`Unknown box "${name}"`);
    if (entry.r.kind === 'currency') throw new Error(`"${entry.r.label || entry.r.key}" only picks a currency; use fx for the exchange rate`);
    const v = compute(entry.r);
    if (v === null) throw new Error(`"${entry.r.label || entry.r.key}" has no value`);
    return v;
  };
  const compute = (r) => {
    if (state[r.key] === 'done') return values[r.key];
    if (state[r.key] === 'busy') throw new Error('This formula uses itself (a loop)');
    state[r.key] = 'busy';
    let v = null;
    try {
      if (r.kind === 'heading' || r.kind === 'currency') v = null;
      else if (r.kind === 'formula') {
        v = evalTree(parseFormula(r.formula), resolve);
        if (!Number.isFinite(v)) throw new Error('The result is not a number');
      } else {
        const typed = Object.prototype.hasOwnProperty.call(inputs, r.key) ? inputs[r.key] : r.default;
        v = toNumber(typed);
      }
    } catch (err) {
      errors[r.key] = err.message;
      v = null;
    }
    values[r.key] = v;
    state[r.key] = 'done';
    return v;
  };
  list.forEach(compute);
  return { values, errors, currency: { ...currency, fx } };
};

/** Checks a whole calculator before it is saved. Returns a list of plain messages (empty = fine). */
export const checkCalculator = (rows = []) => {
  const problems = [];
  const keys = new Set();
  (rows || []).forEach((r, i) => {
    const where = `Row ${i + 1}${r.label ? ` (${r.label})` : ''}`;
    if (!r.label) problems.push(`${where}: give it a name`);
    if (!r.key) problems.push(`${where}: missing box name`);
    else if (keys.has(r.key)) problems.push(`${where}: the box name "${r.key}" is used twice`);
    keys.add(r.key);
    if (r.kind === 'select' && !(r.options || []).length) problems.push(`${where}: add at least one choice`);
    if (r.key === FX) problems.push(`${where}: "fx" is the exchange rate name; give this box another name`);
    if (r.kind === 'formula') {
      try { parseFormula(r.formula); } catch (err) { problems.push(`${where}: ${err.message}`); }
    }
  });
  ['local', 'quote'].forEach((role) => {
    if ((rows || []).filter((r) => r.kind === 'currency' && (r.role || 'local') === role).length > 1) {
      problems.push(`Only one "${role === 'local' ? 'Local' : 'Quote'} currency" box is allowed`);
    }
  });
  const { errors } = evaluateCalculator(rows, {}, { fx: 1 }); // any rate will do for checking
  Object.entries(errors).forEach(([key, msg]) => {
    if (/divide by 0|has no value/i.test(msg)) return; // fine while the boxes are still empty
    const i = (rows || []).findIndex((r) => r.key === key);
    const msgText = `Row ${i + 1}: ${msg}`;
    if (!problems.some((p) => p.startsWith(`Row ${i + 1}`))) problems.push(msgText);
  });
  return problems;
};

/** The export price calculator of the company sheet, as an example to start from. */
export const EXAMPLE_ROWS = [
  { key: 'tons', label: 'Total ton in a container', kind: 'number', default: 25, unit: 'MT' },
  { key: 'rate', label: 'Share quote in which currency (1 USD = ? INR)', kind: 'number', default: 95, unit: 'INR' },
  { key: 'unit_kg', label: 'Need quote in Ton/kg', kind: 'select', default: 1000, options: [{ label: 'Ton', value: 1000 }, { label: 'Kg', value: 1 }] },
  { key: 'price_kg', label: 'Per Kg Price ex plant incl. packaging and loading', kind: 'number', default: 10, unit: 'INR/kg' },
  { key: 'transport_kg', label: 'Local transportation up to port', kind: 'number', default: 1, unit: 'INR/kg' },
  { key: 'customs', label: 'Customs clearance including local charges', kind: 'number', default: 60000, unit: 'INR/container' },
  { key: 'profit', label: 'Profit in %', kind: 'number', default: 2, unit: '%' },
  { key: 'fob', label: 'FOB', kind: 'formula', formula: '((price_kg + transport_kg) * unit_kg + customs / tons * unit_kg / 1000) * (1 + profit%) / rate', highlight: true, decimals: 2, unit: 'USD' },
  { key: 'freight', label: 'Ocean freight in USD', kind: 'number', default: 400, unit: 'USD/container' },
  { key: 'cfr', label: 'CFR', kind: 'formula', formula: 'fob + freight / tons * unit_kg / 1000', highlight: true, decimals: 2, unit: 'USD' },
  { key: 'insurance', label: 'Insurance', kind: 'number', default: 5000, unit: 'INR/container' },
  { key: 'cif', label: 'CIF', kind: 'formula', formula: '((price_kg + transport_kg) * unit_kg + (customs + insurance) / tons * unit_kg / 1000) * (1 + profit%) / rate + freight / tons * unit_kg / 1000', highlight: true, decimals: 2, unit: 'USD' },
];
