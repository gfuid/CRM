// Comprehensive list of countries with ISO codes, dial codes, and emoji flags
export const COUNTRY_CODES = [
  // --- High Priority Global Trade & Agro Export Countries ---
  { name: 'India', code: 'IN', dial_code: '+91', flag: '🇮🇳', priority: true },
  { name: 'United Arab Emirates', code: 'AE', dial_code: '+971', flag: '🇦🇪', priority: true },
  { name: 'Sri Lanka', code: 'LK', dial_code: '+94', flag: '🇱🇰', priority: true },
  { name: 'Saudi Arabia', code: 'SA', dial_code: '+966', flag: '🇸🇦', priority: true },
  { name: 'United States', code: 'US', dial_code: '+1', flag: '🇺🇸', priority: true },
  { name: 'United Kingdom', code: 'GB', dial_code: '+44', flag: '🇬🇧', priority: true },
  { name: 'Singapore', code: 'SG', dial_code: '+65', flag: '🇸🇬', priority: true },
  { name: 'Bangladesh', code: 'BD', dial_code: '+880', flag: '🇧🇩', priority: true },
  { name: 'Vietnam', code: 'VN', dial_code: '+84', flag: '🇻🇳', priority: true },
  { name: 'Malaysia', code: 'MY', dial_code: '+60', flag: '🇲🇾', priority: true },
  { name: 'Indonesia', code: 'ID', dial_code: '+62', flag: '🇮🇩', priority: true },
  { name: 'Qatar', code: 'QA', dial_code: '+974', flag: '🇶🇦', priority: true },
  { name: 'Kuwait', code: 'KW', dial_code: '+965', flag: '🇰🇼', priority: true },
  { name: 'Oman', code: 'OM', dial_code: '+968', flag: '🇴🇲', priority: true },
  { name: 'Bahrain', code: 'BH', dial_code: '+973', flag: '🇧🇭', priority: true },
  { name: 'China', code: 'CN', dial_code: '+86', flag: '🇨🇳', priority: true },
  { name: 'Australia', code: 'AU', dial_code: '+61', flag: '🇦🇺', priority: true },
  { name: 'Canada', code: 'CA', dial_code: '+1', flag: '🇨🇦', priority: true },
  { name: 'Germany', code: 'DE', dial_code: '+49', flag: '🇩🇪', priority: true },
  { name: 'Nepal', code: 'NP', dial_code: '+977', flag: '🇳🇵', priority: true },

  // --- Alphabetical Global Countries ---
  { name: 'Afghanistan', code: 'AF', dial_code: '+93', flag: '🇦🇫' },
  { name: 'Albania', code: 'AL', dial_code: '+355', flag: '🇦🇱' },
  { name: 'Algeria', code: 'DZ', dial_code: '+213', flag: '🇩🇿' },
  { name: 'Argentina', code: 'AR', dial_code: '+54', flag: '🇦🇷' },
  { name: 'Armenia', code: 'AM', dial_code: '+374', flag: '🇦🇲' },
  { name: 'Austria', code: 'AT', dial_code: '+43', flag: '🇦🇹' },
  { name: 'Azerbaijan', code: 'AZ', dial_code: '+994', flag: '🇦🇿' },
  { name: 'Belarus', code: 'BY', dial_code: '+375', flag: '🇧🇾' },
  { name: 'Belgium', code: 'BE', dial_code: '+32', flag: '🇧🇪' },
  { name: 'Bhutan', code: 'BT', dial_code: '+975', flag: '🇧🇹' },
  { name: 'Brazil', code: 'BR', dial_code: '+55', flag: '🇧🇷' },
  { name: 'Brunei', code: 'BN', dial_code: '+673', flag: '🇧🇳' },
  { name: 'Cambodia', code: 'KH', dial_code: '+855', flag: '🇰🇭' },
  { name: 'Chile', code: 'CL', dial_code: '+56', flag: '🇨🇱' },
  { name: 'Colombia', code: 'CO', dial_code: '+57', flag: '🇨🇴' },
  { name: 'Cyprus', code: 'CY', dial_code: '+357', flag: '🇨🇾' },
  { name: 'Czech Republic', code: 'CZ', dial_code: '+420', flag: '🇨🇿' },
  { name: 'Denmark', code: 'DK', dial_code: '+45', flag: '🇩🇰' },
  { name: 'Egypt', code: 'EG', dial_code: '+20', flag: '🇪🇬' },
  { name: 'Ethiopia', code: 'ET', dial_code: '+251', flag: '🇪🇹' },
  { name: 'Finland', code: 'FI', dial_code: '+358', flag: '🇫🇮' },
  { name: 'France', code: 'FR', dial_code: '+33', flag: '🇫🇷' },
  { name: 'Georgia', code: 'GE', dial_code: '+995', flag: '🇬🇪' },
  { name: 'Ghana', code: 'GH', dial_code: '+233', flag: '🇬🇭' },
  { name: 'Greece', code: 'GR', dial_code: '+30', flag: '🇬🇷' },
  { name: 'Hong Kong', code: 'HK', dial_code: '+852', flag: '🇭🇰' },
  { name: 'Hungary', code: 'HU', dial_code: '+36', flag: '🇭🇺' },
  { name: 'Iran', code: 'IR', dial_code: '+98', flag: '🇮🇷' },
  { name: 'Iraq', code: 'IQ', dial_code: '+964', flag: '🇮🇶' },
  { name: 'Ireland', code: 'IE', dial_code: '+353', flag: '🇮🇪' },
  { name: 'Israel', code: 'IL', dial_code: '+972', flag: '🇮🇱' },
  { name: 'Italy', code: 'IT', dial_code: '+39', flag: '🇮🇹' },
  { name: 'Japan', code: 'JP', dial_code: '+81', flag: '🇯🇵' },
  { name: 'Jordan', code: 'JO', dial_code: '+962', flag: '🇯🇴' },
  { name: 'Kazakhstan', code: 'KZ', dial_code: '+7', flag: '🇰🇿' },
  { name: 'Kenya', code: 'KE', dial_code: '+254', flag: '🇰🇪' },
  { name: 'Lebanon', code: 'LB', dial_code: '+961', flag: '🇱🇧' },
  { name: 'Maldives', code: 'MV', dial_code: '+960', flag: '🇲🇻' },
  { name: 'Mauritius', code: 'MU', dial_code: '+230', flag: '🇲🇺' },
  { name: 'Mexico', code: 'MX', dial_code: '+52', flag: '🇲🇽' },
  { name: 'Morocco', code: 'MA', dial_code: '+212', flag: '🇲🇦' },
  { name: 'Myanmar', code: 'MM', dial_code: '+95', flag: '🇲🇲' },
  { name: 'Netherlands', code: 'NL', dial_code: '+31', flag: '🇳🇱' },
  { name: 'New Zealand', code: 'NZ', dial_code: '+64', flag: '🇳🇿' },
  { name: 'Nigeria', code: 'NG', dial_code: '+234', flag: '🇳🇬' },
  { name: 'Norway', code: 'NO', dial_code: '+47', flag: '🇳🇴' },
  { name: 'Pakistan', code: 'PK', dial_code: '+92', flag: '🇵🇰' },
  { name: 'Peru', code: 'PE', dial_code: '+51', flag: '🇵🇪' },
  { name: 'Philippines', code: 'PH', dial_code: '+63', flag: '🇵🇭' },
  { name: 'Poland', code: 'PL', dial_code: '+48', flag: '🇵🇱' },
  { name: 'Portugal', code: 'PT', dial_code: '+351', flag: '🇵🇹' },
  { name: 'Romania', code: 'RO', dial_code: '+40', flag: '🇷🇴' },
  { name: 'Russia', code: 'RU', dial_code: '+7', flag: '🇷🇺' },
  { name: 'South Africa', code: 'ZA', dial_code: '+27', flag: '🇿🇦' },
  { name: 'South Korea', code: 'KR', dial_code: '+82', flag: '🇰🇷' },
  { name: 'Spain', code: 'ES', dial_code: '+34', flag: '🇪🇸' },
  { name: 'Sweden', code: 'SE', dial_code: '+46', flag: '🇸🇪' },
  { name: 'Switzerland', code: 'CH', dial_code: '+41', flag: '🇨🇭' },
  { name: 'Taiwan', code: 'TW', dial_code: '+886', flag: '🇹🇼' },
  { name: 'Tanzania', code: 'TZ', dial_code: '+255', flag: '🇹🇿' },
  { name: 'Thailand', code: 'TH', dial_code: '+66', flag: '🇹🇭' },
  { name: 'Turkey', code: 'TR', dial_code: '+90', flag: '🇹🇷' },
  { name: 'Uganda', code: 'UG', dial_code: '+256', flag: '🇺🇬' },
  { name: 'Ukraine', code: 'UA', dial_code: '+380', flag: '🇺🇦' },
  { name: 'Uzbekistan', code: 'UZ', dial_code: '+998', flag: '🇺🇿' },
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

  // Exact or partial name match (Sri Lanka, India, United Arab Emirates)
  const byName = COUNTRY_CODES.find((c) => {
    const cLower = c.name.toLowerCase();
    return lower.includes(cLower) || cLower.includes(lower);
  });
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
