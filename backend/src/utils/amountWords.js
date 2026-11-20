/**
 * "USD 12,450.50" -> "US Dollars Twelve Thousand Four Hundred Fifty and Cents Fifty Only".
 * INR uses lakh / crore; every other currency uses thousand / million / billion.
 */
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const CURRENCY = {
  USD: ['US Dollars', 'Cents'], EUR: ['Euros', 'Cents'], GBP: ['Pounds Sterling', 'Pence'], INR: ['Rupees', 'Paise'],
  AED: ['UAE Dirhams', 'Fils'], SAR: ['Saudi Riyals', 'Halalas'], AUD: ['Australian Dollars', 'Cents'], CAD: ['Canadian Dollars', 'Cents'],
  SGD: ['Singapore Dollars', 'Cents'], JPY: ['Japanese Yen', ''], CNY: ['Chinese Yuan', 'Fen'], VND: ['Vietnamese Dong', ''],
};

const under1000 = (n) => {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const rest = r < 20 ? ONES[r] : `${TENS[Math.floor(r / 10)]}${r % 10 ? ` ${ONES[r % 10]}` : ''}`;
  return [h ? `${ONES[h]} Hundred` : '', rest].filter(Boolean).join(' ');
};

const international = (n) => {
  if (n === 0) return 'Zero';
  const parts = [];
  [[1e12, 'Trillion'], [1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand']].forEach(([size, name]) => {
    if (n >= size) { parts.push(`${under1000(Math.floor(n / size))} ${name}`); n %= size; }
  });
  if (n) parts.push(under1000(n));
  return parts.join(' ');
};

const indian = (n) => {
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 1e7);
  if (crore) { parts.push(`${crore >= 1000 ? international(crore) : under1000(crore)} Crore`); n %= 1e7; }
  [[1e5, 'Lakh'], [1e3, 'Thousand']].forEach(([size, name]) => {
    if (n >= size) { parts.push(`${under1000(Math.floor(n / size))} ${name}`); n %= size; }
  });
  if (n) parts.push(under1000(n));
  return parts.join(' ');
};

const amountInWords = (amount, currency = 'USD') => {
  const code = String(currency || 'USD').toUpperCase();
  const [major, minor] = CURRENCY[code] || [code, 'Cents'];
  const value = Math.max(0, Math.round(Number(amount || 0) * 100));
  const whole = Math.floor(value / 100);
  const frac = value % 100;
  const words = code === 'INR' ? indian : international;
  return `${major} ${words(whole)}${frac && minor ? ` and ${minor} ${under1000(frac)}` : ''} Only`;
};

module.exports = { amountInWords };
