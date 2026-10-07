/** Links for the quick Call / WhatsApp buttons. Return null when there is no usable number. */

export const telHref = (phone) => {
  const cleaned = String(phone || '').replace(/[^\d+]/g, '');
  return cleaned.replace(/\D/g, '').length >= 5 ? `tel:${cleaned}` : null;
};

/** wa.me needs the full international number as digits only (no +, no leading zeros). */
export const whatsappHref = (lead) => {
  const digits = String(lead?.whatsapp || lead?.phone || '')
    .replace(/\D/g, '')
    .replace(/^0+/, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
};

export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

/** "6:00 pm" from a task's YYYY-MM-DD date and HH:MM time. */
export const taskTime = (date, time) => {
  if (!date || !time || !/^\d{2}:\d{2}$/.test(time)) return '';
  const d = new Date(`${date}T${time}:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};
