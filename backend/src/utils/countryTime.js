/**
 * Local time of a buyer, from the lead's country (or the phone's dial code), so AI calls
 * only ring during the buyer's own office hours.
 */
const BY_NAME = {
  india: 'Asia/Kolkata', 'united arab emirates': 'Asia/Dubai', uae: 'Asia/Dubai', dubai: 'Asia/Dubai', 'saudi arabia': 'Asia/Riyadh', qatar: 'Asia/Qatar', oman: 'Asia/Muscat', kuwait: 'Asia/Kuwait', bahrain: 'Asia/Bahrain',
  'sri lanka': 'Asia/Colombo', bangladesh: 'Asia/Dhaka', nepal: 'Asia/Kathmandu', pakistan: 'Asia/Karachi', 'viet nam': 'Asia/Ho_Chi_Minh', vietnam: 'Asia/Ho_Chi_Minh',
  thailand: 'Asia/Bangkok', malaysia: 'Asia/Kuala_Lumpur', singapore: 'Asia/Singapore', indonesia: 'Asia/Jakarta', philippines: 'Asia/Manila', china: 'Asia/Shanghai', 'hong kong': 'Asia/Hong_Kong',
  japan: 'Asia/Tokyo', 'south korea': 'Asia/Seoul', korea: 'Asia/Seoul', taiwan: 'Asia/Taipei', myanmar: 'Asia/Yangon', cambodia: 'Asia/Phnom_Penh',
  'united kingdom': 'Europe/London', uk: 'Europe/London', england: 'Europe/London', ireland: 'Europe/Dublin', netherlands: 'Europe/Amsterdam', germany: 'Europe/Berlin', france: 'Europe/Paris',
  spain: 'Europe/Madrid', italy: 'Europe/Rome', belgium: 'Europe/Brussels', poland: 'Europe/Warsaw', turkey: 'Europe/Istanbul', russia: 'Europe/Moscow', ukraine: 'Europe/Kyiv', greece: 'Europe/Athens',
  'united states': 'America/New_York', usa: 'America/New_York', 'united states of america': 'America/New_York', canada: 'America/Toronto', mexico: 'America/Mexico_City', brazil: 'America/Sao_Paulo', argentina: 'America/Argentina/Buenos_Aires', chile: 'America/Santiago', colombia: 'America/Bogota', peru: 'America/Lima',
  egypt: 'Africa/Cairo', nigeria: 'Africa/Lagos', kenya: 'Africa/Nairobi', 'south africa': 'Africa/Johannesburg', ghana: 'Africa/Accra', ethiopia: 'Africa/Addis_Ababa', tanzania: 'Africa/Dar_es_Salaam', uganda: 'Africa/Kampala', morocco: 'Africa/Casablanca', algeria: 'Africa/Algiers',
  australia: 'Australia/Sydney', 'new zealand': 'Pacific/Auckland', iran: 'Asia/Tehran', iraq: 'Asia/Baghdad', jordan: 'Asia/Amman', lebanon: 'Asia/Beirut', israel: 'Asia/Jerusalem',
};
const BY_PREFIX = [
  ['971', 'Asia/Dubai'], ['966', 'Asia/Riyadh'], ['974', 'Asia/Qatar'], ['968', 'Asia/Muscat'], ['965', 'Asia/Kuwait'], ['973', 'Asia/Bahrain'], ['880', 'Asia/Dhaka'], ['977', 'Asia/Kathmandu'],
  ['852', 'Asia/Hong_Kong'], ['886', 'Asia/Taipei'], ['855', 'Asia/Phnom_Penh'], ['234', 'Africa/Lagos'], ['254', 'Africa/Nairobi'], ['233', 'Africa/Accra'], ['251', 'Africa/Addis_Ababa'], ['255', 'Africa/Dar_es_Salaam'], ['256', 'Africa/Kampala'], ['212', 'Africa/Casablanca'], ['213', 'Africa/Algiers'],
  ['353', 'Europe/Dublin'], ['380', 'Europe/Kyiv'], ['962', 'Asia/Amman'], ['961', 'Asia/Beirut'], ['972', 'Asia/Jerusalem'], ['964', 'Asia/Baghdad'],
  ['91', 'Asia/Kolkata'], ['94', 'Asia/Colombo'], ['92', 'Asia/Karachi'], ['84', 'Asia/Ho_Chi_Minh'], ['66', 'Asia/Bangkok'], ['60', 'Asia/Kuala_Lumpur'], ['65', 'Asia/Singapore'], ['62', 'Asia/Jakarta'], ['63', 'Asia/Manila'], ['86', 'Asia/Shanghai'], ['81', 'Asia/Tokyo'], ['82', 'Asia/Seoul'], ['95', 'Asia/Yangon'], ['98', 'Asia/Tehran'],
  ['44', 'Europe/London'], ['31', 'Europe/Amsterdam'], ['49', 'Europe/Berlin'], ['33', 'Europe/Paris'], ['34', 'Europe/Madrid'], ['39', 'Europe/Rome'], ['32', 'Europe/Brussels'], ['48', 'Europe/Warsaw'], ['90', 'Europe/Istanbul'], ['30', 'Europe/Athens'], ['7', 'Europe/Moscow'],
  ['52', 'America/Mexico_City'], ['55', 'America/Sao_Paulo'], ['54', 'America/Argentina/Buenos_Aires'], ['56', 'America/Santiago'], ['57', 'America/Bogota'], ['51', 'America/Lima'], ['1', 'America/New_York'],
  ['20', 'Africa/Cairo'], ['27', 'Africa/Johannesburg'], ['61', 'Australia/Sydney'], ['64', 'Pacific/Auckland'],
];

const clean = (s) => String(s || '').replace(/[\uD83C-􏰀-\uDFFF]+/g, '').trim().toLowerCase();

/** IANA time zone for a lead's country, else from the phone number, else India. */
const timeZoneFor = (country, phone) => {
  const tz = BY_NAME[clean(country)];
  if (tz) return tz;
  const d = String(phone || '').replace(/\D/g, '');
  const hit = BY_PREFIX.find(([p]) => d.startsWith(p));
  return hit ? hit[1] : 'Asia/Kolkata';
};

/** { hour, minute, day } (day 0 = Sunday) in that time zone. */
const localParts = (tz, at = Date.now()) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false }).formatToParts(new Date(at)).map((p) => [p.type, p.value]));
  const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hour: Number(parts.hour) % 24, minute: Number(parts.minute), day: days[parts.weekday] };
};

/** Is it inside the calling window (e.g. 10:00–18:00, Mon–Sat) for this buyer right now? */
const inWindow = (tz, win = {}, at = Date.now()) => {
  const { hour, minute, day } = localParts(tz, at);
  const from = Number(win.from_hour ?? 10);
  const to = Number(win.to_hour ?? 18);
  const days = Array.isArray(win.days) && win.days.length ? win.days : [1, 2, 3, 4, 5, 6];
  const now = hour + minute / 60;
  return days.includes(day) && now >= from && now < to;
};

module.exports = { timeZoneFor, localParts, inWindow };
