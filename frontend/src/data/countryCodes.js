// Every country (A–Z) with ISO code, dial code and flag. The first few are shown on top as common trade partners.
export const COUNTRY_CODES = [
  // --- Frequently used (shown first) ---
  { name: 'India', code: 'IN', dial_code: '+91', flag: '🇮🇳', priority: true },
  { name: 'United Arab Emirates', code: 'AE', dial_code: '+971', flag: '🇦🇪', priority: true },
  { name: 'Sri Lanka', code: 'LK', dial_code: '+94', flag: '🇱🇰', priority: true },
  { name: 'Saudi Arabia', code: 'SA', dial_code: '+966', flag: '🇸🇦', priority: true },
  { name: 'United States', code: 'US', dial_code: '+1', flag: '🇺🇸', priority: true },
  { name: 'United Kingdom', code: 'GB', dial_code: '+44', flag: '🇬🇧', priority: true },
  { name: 'Singapore', code: 'SG', dial_code: '+65', flag: '🇸🇬', priority: true },
  { name: 'Bangladesh', code: 'BD', dial_code: '+880', flag: '🇧🇩', priority: true },
  { name: 'Vietnam', code: 'VN', dial_code: '+84', flag: '🇻🇳', priority: true },
  // --- All countries A–Z ---
  { name: 'Afghanistan', code: 'AF', dial_code: '+93', flag: '🇦🇫' },
  { name: 'Albania', code: 'AL', dial_code: '+355', flag: '🇦🇱' },
  { name: 'Algeria', code: 'DZ', dial_code: '+213', flag: '🇩🇿' },
  { name: 'Andorra', code: 'AD', dial_code: '+376', flag: '🇦🇩' },
  { name: 'Angola', code: 'AO', dial_code: '+244', flag: '🇦🇴' },
  { name: 'Antigua and Barbuda', code: 'AG', dial_code: '+1268', flag: '🇦🇬' },
  { name: 'Argentina', code: 'AR', dial_code: '+54', flag: '🇦🇷' },
  { name: 'Armenia', code: 'AM', dial_code: '+374', flag: '🇦🇲' },
  { name: 'Aruba', code: 'AW', dial_code: '+297', flag: '🇦🇼' },
  { name: 'Australia', code: 'AU', dial_code: '+61', flag: '🇦🇺' },
  { name: 'Austria', code: 'AT', dial_code: '+43', flag: '🇦🇹' },
  { name: 'Azerbaijan', code: 'AZ', dial_code: '+994', flag: '🇦🇿' },
  { name: 'Bahamas', code: 'BS', dial_code: '+1242', flag: '🇧🇸' },
  { name: 'Bahrain', code: 'BH', dial_code: '+973', flag: '🇧🇭' },
  { name: 'Barbados', code: 'BB', dial_code: '+1246', flag: '🇧🇧' },
  { name: 'Belarus', code: 'BY', dial_code: '+375', flag: '🇧🇾' },
  { name: 'Belgium', code: 'BE', dial_code: '+32', flag: '🇧🇪' },
  { name: 'Belize', code: 'BZ', dial_code: '+501', flag: '🇧🇿' },
  { name: 'Benin', code: 'BJ', dial_code: '+229', flag: '🇧🇯' },
  { name: 'Bhutan', code: 'BT', dial_code: '+975', flag: '🇧🇹' },
  { name: 'Bolivia', code: 'BO', dial_code: '+591', flag: '🇧🇴' },
  { name: 'Bosnia and Herzegovina', code: 'BA', dial_code: '+387', flag: '🇧🇦' },
  { name: 'Botswana', code: 'BW', dial_code: '+267', flag: '🇧🇼' },
  { name: 'Brazil', code: 'BR', dial_code: '+55', flag: '🇧🇷' },
  { name: 'Brunei', code: 'BN', dial_code: '+673', flag: '🇧🇳' },
  { name: 'Bulgaria', code: 'BG', dial_code: '+359', flag: '🇧🇬' },
  { name: 'Burkina Faso', code: 'BF', dial_code: '+226', flag: '🇧🇫' },
  { name: 'Burundi', code: 'BI', dial_code: '+257', flag: '🇧🇮' },
  { name: 'Cambodia', code: 'KH', dial_code: '+855', flag: '🇰🇭' },
  { name: 'Cameroon', code: 'CM', dial_code: '+237', flag: '🇨🇲' },
  { name: 'Canada', code: 'CA', dial_code: '+1', flag: '🇨🇦' },
  { name: 'Cape Verde', code: 'CV', dial_code: '+238', flag: '🇨🇻' },
  { name: 'Central African Republic', code: 'CF', dial_code: '+236', flag: '🇨🇫' },
  { name: 'Chad', code: 'TD', dial_code: '+235', flag: '🇹🇩' },
  { name: 'Chile', code: 'CL', dial_code: '+56', flag: '🇨🇱' },
  { name: 'China', code: 'CN', dial_code: '+86', flag: '🇨🇳' },
  { name: 'Colombia', code: 'CO', dial_code: '+57', flag: '🇨🇴' },
  { name: 'Comoros', code: 'KM', dial_code: '+269', flag: '🇰🇲' },
  { name: 'Congo', code: 'CG', dial_code: '+242', flag: '🇨🇬' },
  { name: 'Congo (DRC)', code: 'CD', dial_code: '+243', flag: '🇨🇩' },
  { name: 'Costa Rica', code: 'CR', dial_code: '+506', flag: '🇨🇷' },
  { name: 'Côte d\'Ivoire', code: 'CI', dial_code: '+225', flag: '🇨🇮' },
  { name: 'Croatia', code: 'HR', dial_code: '+385', flag: '🇭🇷' },
  { name: 'Cuba', code: 'CU', dial_code: '+53', flag: '🇨🇺' },
  { name: 'Cyprus', code: 'CY', dial_code: '+357', flag: '🇨🇾' },
  { name: 'Czech Republic', code: 'CZ', dial_code: '+420', flag: '🇨🇿' },
  { name: 'Denmark', code: 'DK', dial_code: '+45', flag: '🇩🇰' },
  { name: 'Djibouti', code: 'DJ', dial_code: '+253', flag: '🇩🇯' },
  { name: 'Dominica', code: 'DM', dial_code: '+1767', flag: '🇩🇲' },
  { name: 'Dominican Republic', code: 'DO', dial_code: '+1809', flag: '🇩🇴' },
  { name: 'Ecuador', code: 'EC', dial_code: '+593', flag: '🇪🇨' },
  { name: 'Egypt', code: 'EG', dial_code: '+20', flag: '🇪🇬' },
  { name: 'El Salvador', code: 'SV', dial_code: '+503', flag: '🇸🇻' },
  { name: 'Equatorial Guinea', code: 'GQ', dial_code: '+240', flag: '🇬🇶' },
  { name: 'Eritrea', code: 'ER', dial_code: '+291', flag: '🇪🇷' },
  { name: 'Estonia', code: 'EE', dial_code: '+372', flag: '🇪🇪' },
  { name: 'Eswatini', code: 'SZ', dial_code: '+268', flag: '🇸🇿' },
  { name: 'Ethiopia', code: 'ET', dial_code: '+251', flag: '🇪🇹' },
  { name: 'Fiji', code: 'FJ', dial_code: '+679', flag: '🇫🇯' },
  { name: 'Finland', code: 'FI', dial_code: '+358', flag: '🇫🇮' },
  { name: 'France', code: 'FR', dial_code: '+33', flag: '🇫🇷' },
  { name: 'Gabon', code: 'GA', dial_code: '+241', flag: '🇬🇦' },
  { name: 'Gambia', code: 'GM', dial_code: '+220', flag: '🇬🇲' },
  { name: 'Georgia', code: 'GE', dial_code: '+995', flag: '🇬🇪' },
  { name: 'Germany', code: 'DE', dial_code: '+49', flag: '🇩🇪' },
  { name: 'Ghana', code: 'GH', dial_code: '+233', flag: '🇬🇭' },
  { name: 'Greece', code: 'GR', dial_code: '+30', flag: '🇬🇷' },
  { name: 'Grenada', code: 'GD', dial_code: '+1473', flag: '🇬🇩' },
  { name: 'Guatemala', code: 'GT', dial_code: '+502', flag: '🇬🇹' },
  { name: 'Guinea', code: 'GN', dial_code: '+224', flag: '🇬🇳' },
  { name: 'Guinea-Bissau', code: 'GW', dial_code: '+245', flag: '🇬🇼' },
  { name: 'Guyana', code: 'GY', dial_code: '+592', flag: '🇬🇾' },
  { name: 'Haiti', code: 'HT', dial_code: '+509', flag: '🇭🇹' },
  { name: 'Honduras', code: 'HN', dial_code: '+504', flag: '🇭🇳' },
  { name: 'Hong Kong', code: 'HK', dial_code: '+852', flag: '🇭🇰' },
  { name: 'Hungary', code: 'HU', dial_code: '+36', flag: '🇭🇺' },
  { name: 'Iceland', code: 'IS', dial_code: '+354', flag: '🇮🇸' },
  { name: 'Indonesia', code: 'ID', dial_code: '+62', flag: '🇮🇩' },
  { name: 'Iran', code: 'IR', dial_code: '+98', flag: '🇮🇷' },
  { name: 'Iraq', code: 'IQ', dial_code: '+964', flag: '🇮🇶' },
  { name: 'Ireland', code: 'IE', dial_code: '+353', flag: '🇮🇪' },
  { name: 'Israel', code: 'IL', dial_code: '+972', flag: '🇮🇱' },
  { name: 'Italy', code: 'IT', dial_code: '+39', flag: '🇮🇹' },
  { name: 'Jamaica', code: 'JM', dial_code: '+1876', flag: '🇯🇲' },
  { name: 'Japan', code: 'JP', dial_code: '+81', flag: '🇯🇵' },
  { name: 'Jordan', code: 'JO', dial_code: '+962', flag: '🇯🇴' },
  { name: 'Kazakhstan', code: 'KZ', dial_code: '+7', flag: '🇰🇿' },
  { name: 'Kenya', code: 'KE', dial_code: '+254', flag: '🇰🇪' },
  { name: 'Kiribati', code: 'KI', dial_code: '+686', flag: '🇰🇮' },
  { name: 'Kosovo', code: 'XK', dial_code: '+383', flag: '🇽🇰' },
  { name: 'Kuwait', code: 'KW', dial_code: '+965', flag: '🇰🇼' },
  { name: 'Kyrgyzstan', code: 'KG', dial_code: '+996', flag: '🇰🇬' },
  { name: 'Laos', code: 'LA', dial_code: '+856', flag: '🇱🇦' },
  { name: 'Latvia', code: 'LV', dial_code: '+371', flag: '🇱🇻' },
  { name: 'Lebanon', code: 'LB', dial_code: '+961', flag: '🇱🇧' },
  { name: 'Lesotho', code: 'LS', dial_code: '+266', flag: '🇱🇸' },
  { name: 'Liberia', code: 'LR', dial_code: '+231', flag: '🇱🇷' },
  { name: 'Libya', code: 'LY', dial_code: '+218', flag: '🇱🇾' },
  { name: 'Liechtenstein', code: 'LI', dial_code: '+423', flag: '🇱🇮' },
  { name: 'Lithuania', code: 'LT', dial_code: '+370', flag: '🇱🇹' },
  { name: 'Luxembourg', code: 'LU', dial_code: '+352', flag: '🇱🇺' },
  { name: 'Macau', code: 'MO', dial_code: '+853', flag: '🇲🇴' },
  { name: 'Madagascar', code: 'MG', dial_code: '+261', flag: '🇲🇬' },
  { name: 'Malawi', code: 'MW', dial_code: '+265', flag: '🇲🇼' },
  { name: 'Malaysia', code: 'MY', dial_code: '+60', flag: '🇲🇾' },
  { name: 'Maldives', code: 'MV', dial_code: '+960', flag: '🇲🇻' },
  { name: 'Mali', code: 'ML', dial_code: '+223', flag: '🇲🇱' },
  { name: 'Malta', code: 'MT', dial_code: '+356', flag: '🇲🇹' },
  { name: 'Marshall Islands', code: 'MH', dial_code: '+692', flag: '🇲🇭' },
  { name: 'Mauritania', code: 'MR', dial_code: '+222', flag: '🇲🇷' },
  { name: 'Mauritius', code: 'MU', dial_code: '+230', flag: '🇲🇺' },
  { name: 'Mexico', code: 'MX', dial_code: '+52', flag: '🇲🇽' },
  { name: 'Micronesia', code: 'FM', dial_code: '+691', flag: '🇫🇲' },
  { name: 'Moldova', code: 'MD', dial_code: '+373', flag: '🇲🇩' },
  { name: 'Monaco', code: 'MC', dial_code: '+377', flag: '🇲🇨' },
  { name: 'Mongolia', code: 'MN', dial_code: '+976', flag: '🇲🇳' },
  { name: 'Montenegro', code: 'ME', dial_code: '+382', flag: '🇲🇪' },
  { name: 'Morocco', code: 'MA', dial_code: '+212', flag: '🇲🇦' },
  { name: 'Mozambique', code: 'MZ', dial_code: '+258', flag: '🇲🇿' },
  { name: 'Myanmar', code: 'MM', dial_code: '+95', flag: '🇲🇲' },
  { name: 'Namibia', code: 'NA', dial_code: '+264', flag: '🇳🇦' },
  { name: 'Nauru', code: 'NR', dial_code: '+674', flag: '🇳🇷' },
  { name: 'Nepal', code: 'NP', dial_code: '+977', flag: '🇳🇵' },
  { name: 'Netherlands', code: 'NL', dial_code: '+31', flag: '🇳🇱' },
  { name: 'New Zealand', code: 'NZ', dial_code: '+64', flag: '🇳🇿' },
  { name: 'Nicaragua', code: 'NI', dial_code: '+505', flag: '🇳🇮' },
  { name: 'Niger', code: 'NE', dial_code: '+227', flag: '🇳🇪' },
  { name: 'Nigeria', code: 'NG', dial_code: '+234', flag: '🇳🇬' },
  { name: 'North Korea', code: 'KP', dial_code: '+850', flag: '🇰🇵' },
  { name: 'North Macedonia', code: 'MK', dial_code: '+389', flag: '🇲🇰' },
  { name: 'Norway', code: 'NO', dial_code: '+47', flag: '🇳🇴' },
  { name: 'Oman', code: 'OM', dial_code: '+968', flag: '🇴🇲' },
  { name: 'Pakistan', code: 'PK', dial_code: '+92', flag: '🇵🇰' },
  { name: 'Palau', code: 'PW', dial_code: '+680', flag: '🇵🇼' },
  { name: 'Palestine', code: 'PS', dial_code: '+970', flag: '🇵🇸' },
  { name: 'Panama', code: 'PA', dial_code: '+507', flag: '🇵🇦' },
  { name: 'Papua New Guinea', code: 'PG', dial_code: '+675', flag: '🇵🇬' },
  { name: 'Paraguay', code: 'PY', dial_code: '+595', flag: '🇵🇾' },
  { name: 'Peru', code: 'PE', dial_code: '+51', flag: '🇵🇪' },
  { name: 'Philippines', code: 'PH', dial_code: '+63', flag: '🇵🇭' },
  { name: 'Poland', code: 'PL', dial_code: '+48', flag: '🇵🇱' },
  { name: 'Portugal', code: 'PT', dial_code: '+351', flag: '🇵🇹' },
  { name: 'Puerto Rico', code: 'PR', dial_code: '+1787', flag: '🇵🇷' },
  { name: 'Qatar', code: 'QA', dial_code: '+974', flag: '🇶🇦' },
  { name: 'Romania', code: 'RO', dial_code: '+40', flag: '🇷🇴' },
  { name: 'Russia', code: 'RU', dial_code: '+7', flag: '🇷🇺' },
  { name: 'Rwanda', code: 'RW', dial_code: '+250', flag: '🇷🇼' },
  { name: 'Saint Kitts and Nevis', code: 'KN', dial_code: '+1869', flag: '🇰🇳' },
  { name: 'Saint Lucia', code: 'LC', dial_code: '+1758', flag: '🇱🇨' },
  { name: 'Saint Vincent and the Grenadines', code: 'VC', dial_code: '+1784', flag: '🇻🇨' },
  { name: 'Samoa', code: 'WS', dial_code: '+685', flag: '🇼🇸' },
  { name: 'San Marino', code: 'SM', dial_code: '+378', flag: '🇸🇲' },
  { name: 'São Tomé and Príncipe', code: 'ST', dial_code: '+239', flag: '🇸🇹' },
  { name: 'Senegal', code: 'SN', dial_code: '+221', flag: '🇸🇳' },
  { name: 'Serbia', code: 'RS', dial_code: '+381', flag: '🇷🇸' },
  { name: 'Seychelles', code: 'SC', dial_code: '+248', flag: '🇸🇨' },
  { name: 'Sierra Leone', code: 'SL', dial_code: '+232', flag: '🇸🇱' },
  { name: 'Slovakia', code: 'SK', dial_code: '+421', flag: '🇸🇰' },
  { name: 'Slovenia', code: 'SI', dial_code: '+386', flag: '🇸🇮' },
  { name: 'Solomon Islands', code: 'SB', dial_code: '+677', flag: '🇸🇧' },
  { name: 'Somalia', code: 'SO', dial_code: '+252', flag: '🇸🇴' },
  { name: 'South Africa', code: 'ZA', dial_code: '+27', flag: '🇿🇦' },
  { name: 'South Korea', code: 'KR', dial_code: '+82', flag: '🇰🇷' },
  { name: 'South Sudan', code: 'SS', dial_code: '+211', flag: '🇸🇸' },
  { name: 'Spain', code: 'ES', dial_code: '+34', flag: '🇪🇸' },
  { name: 'Sudan', code: 'SD', dial_code: '+249', flag: '🇸🇩' },
  { name: 'Suriname', code: 'SR', dial_code: '+597', flag: '🇸🇷' },
  { name: 'Sweden', code: 'SE', dial_code: '+46', flag: '🇸🇪' },
  { name: 'Switzerland', code: 'CH', dial_code: '+41', flag: '🇨🇭' },
  { name: 'Syria', code: 'SY', dial_code: '+963', flag: '🇸🇾' },
  { name: 'Taiwan', code: 'TW', dial_code: '+886', flag: '🇹🇼' },
  { name: 'Tajikistan', code: 'TJ', dial_code: '+992', flag: '🇹🇯' },
  { name: 'Tanzania', code: 'TZ', dial_code: '+255', flag: '🇹🇿' },
  { name: 'Thailand', code: 'TH', dial_code: '+66', flag: '🇹🇭' },
  { name: 'Timor-Leste', code: 'TL', dial_code: '+670', flag: '🇹🇱' },
  { name: 'Togo', code: 'TG', dial_code: '+228', flag: '🇹🇬' },
  { name: 'Tonga', code: 'TO', dial_code: '+676', flag: '🇹🇴' },
  { name: 'Trinidad and Tobago', code: 'TT', dial_code: '+1868', flag: '🇹🇹' },
  { name: 'Tunisia', code: 'TN', dial_code: '+216', flag: '🇹🇳' },
  { name: 'Turkey', code: 'TR', dial_code: '+90', flag: '🇹🇷' },
  { name: 'Turkmenistan', code: 'TM', dial_code: '+993', flag: '🇹🇲' },
  { name: 'Tuvalu', code: 'TV', dial_code: '+688', flag: '🇹🇻' },
  { name: 'Uganda', code: 'UG', dial_code: '+256', flag: '🇺🇬' },
  { name: 'Ukraine', code: 'UA', dial_code: '+380', flag: '🇺🇦' },
  { name: 'Uruguay', code: 'UY', dial_code: '+598', flag: '🇺🇾' },
  { name: 'Uzbekistan', code: 'UZ', dial_code: '+998', flag: '🇺🇿' },
  { name: 'Vanuatu', code: 'VU', dial_code: '+678', flag: '🇻🇺' },
  { name: 'Vatican City', code: 'VA', dial_code: '+379', flag: '🇻🇦' },
  { name: 'Venezuela', code: 'VE', dial_code: '+58', flag: '🇻🇪' },
  { name: 'Yemen', code: 'YE', dial_code: '+967', flag: '🇾🇪' },
  { name: 'Zambia', code: 'ZM', dial_code: '+260', flag: '🇿🇲' },
  { name: 'Zimbabwe', code: 'ZW', dial_code: '+263', flag: '🇿🇼' },
];

// Helper to look up country by country name, code, or dial code
export function findCountry(term) {
  if (!term) return null;
  const str = String(term).trim();
  const lower = str.toLowerCase();

  // Exact dial code match (+94, +91)
  if (str.startsWith('+')) {
    const byDial = COUNTRY_CODES.find((c) => c.dial_code === str);
    if (byDial) return byDial;
  }

  // Exact ISO code match (IN, LK, AE, US)
  const byCode = COUNTRY_CODES.find((c) => c.code.toLowerCase() === lower);
  if (byCode) return byCode;

  // Exact name match first (so "Niger" is not taken for "Nigeria", "Dominica" for "Dominican Republic")
  const norm = (v) => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z\s'().-]/g, '').trim();
  const plain = norm(lower);
  const exact = COUNTRY_CODES.find((c) => norm(c.name) === plain);
  if (exact) return exact;

  // Then the longest country name contained in the text (e.g. "Sri Lanka 🇱🇰", "Dubai, United Arab Emirates")
  const contained = COUNTRY_CODES
    .filter((c) => plain.includes(norm(c.name)))
    .sort((a, b) => b.name.length - a.name.length)[0];
  if (contained) return contained;

  // Finally a name that starts with what was typed
  const byName = COUNTRY_CODES.find((c) => norm(c.name).startsWith(plain) && plain.length >= 3);
  if (byName) return byName;

  return null;
}

// Find country by matching prefix from a phone string with '+' (longest prefix match)
export function findCountryByDialCodePrefix(phoneWithPlus) {
  if (!phoneWithPlus || !phoneWithPlus.startsWith('+')) return null;
  const clean = phoneWithPlus.replace(/\s+/g, '');

  // Sort dial codes by length descending so +971 is checked before +97, +880 before +88, etc.
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.dial_code.length - a.dial_code.length);
  return sorted.find((c) => clean.startsWith(c.dial_code)) || null;
}

// Find country by matching digit prefix when there's no '+'
export function findCountryByDigitPrefix(digitsOnly) {
  if (!digitsOnly) return null;
  const sorted = [...COUNTRY_CODES].sort(
    (a, b) => b.dial_code.length - a.dial_code.length
  );
  return (
    sorted.find((c) => {
      const codeDigits = c.dial_code.replace('+', '');
      return digitsOnly.startsWith(codeDigits);
    }) || null
  );
}

// Intelligent phone number parser
export function parsePhoneNumber(rawPhone, fallbackCountryOrCode) {
  const fallback = findCountry(fallbackCountryOrCode) || {
    name: 'India',
    code: 'IN',
    dial_code: '+91',
    flag: '🇮🇳',
  };

  if (!rawPhone || typeof rawPhone !== 'string') {
    return {
      dialCode: fallback.dial_code,
      localNumber: '',
      country: fallback,
    };
  }

  const trimmed = rawPhone.trim();
  if (!trimmed) {
    return {
      dialCode: fallback.dial_code,
      localNumber: '',
      country: fallback,
    };
  }

  // 1. Explicit '+' present in the input (e.g. "+94 112688960" or "+94112688960")
  if (trimmed.startsWith('+')) {
    const matched = findCountryByDialCodePrefix(trimmed);
    if (matched) {
      const rest = trimmed.slice(matched.dial_code.length).trim();
      return {
        dialCode: matched.dial_code,
        localNumber: rest,
        country: matched,
      };
    }
    const genericMatch = trimmed.match(/^\+(\d{1,4})\s*(.*)$/);
    if (genericMatch) {
      const code = `+${genericMatch[1]}`;
      const found = findCountry(code) || {
        name: 'International',
        code: 'INT',
        dial_code: code,
        flag: '🌐',
      };
      return {
        dialCode: code,
        localNumber: genericMatch[2],
        country: found,
      };
    }
  }

  // 2. Check fallback country's dial digits without '+' (e.g. "94112688960" when country is Sri Lanka)
  const fallbackDigits = fallback.dial_code.replace('+', '');
  if (
    fallbackDigits &&
    trimmed.startsWith(fallbackDigits) &&
    trimmed.length > fallbackDigits.length + 5
  ) {
    return {
      dialCode: fallback.dial_code,
      localNumber: trimmed.slice(fallbackDigits.length).trim(),
      country: fallback,
    };
  }

  // 3. Check if digits start with any known dial code without '+' (only if remaining length >= 6)
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length >= 10) {
    const matched = findCountryByDigitPrefix(digitsOnly);
    // Don't misidentify 10-digit Indian local mobile number starting with 9x
    const isIndianLocal = fallback.code === 'IN' && digitsOnly.length === 10;
    if (matched && !isIndianLocal) {
      const codeDigits = matched.dial_code.replace('+', '');
      if (digitsOnly.length - codeDigits.length >= 6) {
        return {
          dialCode: matched.dial_code,
          localNumber: digitsOnly.slice(codeDigits.length),
          country: matched,
        };
      }
    }
  }

  // 4. Default: local number with fallback country's dial code
  return {
    dialCode: fallback.dial_code,
    localNumber: trimmed,
    country: fallback,
  };
}

// Format full phone number to save
export function formatFullPhoneNumber(dialCode, localNumber) {
  if (!localNumber || !String(localNumber).trim()) return '';
  const cleanLocal = String(localNumber).trim();
  const code = dialCode && dialCode.startsWith('+') ? dialCode : `+${dialCode || '91'}`;
  return `${code} ${cleanLocal}`;
}
