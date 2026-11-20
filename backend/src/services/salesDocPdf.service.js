/**
 * Quotation / Proforma Invoice as an A4 PDF (pdfkit, DejaVu Sans so ₹, accents and most Latin / Vietnamese text print).
 * render(doc, profile) -> Promise<Buffer>
 */
const path = require('path');
const PDFDocument = require('pdfkit');
const { amountInWords } = require('../utils/amountWords');

const FONT = path.join(__dirname, '../assets/fonts/DejaVuSans.ttf');
const BOLD = path.join(__dirname, '../assets/fonts/DejaVuSans-Bold.ttf');
const GREEN = '#047857';
const GREY = '#64748b';
const LINE = '#cbd5e1';

const money = (v, cur) => `${cur} ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const qtyText = (v) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 3 });
const dateText = (iso) => {
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

function render(doc, profile = {}) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `${doc.type === 'proforma' ? 'Proforma Invoice' : 'Quotation'} ${doc.number}`, Author: profile.company_name || '' } });
    const chunks = [];
    pdf.on('data', (c) => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
    pdf.registerFont('R', FONT);
    pdf.registerFont('B', BOLD);
    const W = pdf.page.width - 80;
    const X = 40;
    const cur = doc.currency || 'USD';
    const isPI = doc.type === 'proforma';

    /* ---- Letterhead ---- */
    let top = 40;
    let textX = X;
    if (profile.logo && profile.logo.data) {
      try {
        pdf.image(Buffer.from(profile.logo.data, 'base64'), X, top, { fit: [90, 60] });
        textX = X + 100;
      } catch { /* a broken logo must not stop the document */ }
    }
    pdf.font('B').fontSize(15).fillColor('#0f172a').text(profile.company_name || '', textX, top, { width: W - (textX - X) - 215 });
    pdf.font('R').fontSize(8).fillColor(GREY);
    const lines = [
      profile.address,
      [profile.phone && `Tel: ${profile.phone}`, profile.email, profile.website].filter(Boolean).join('  ·  '),
      [profile.gstin && `GSTIN: ${profile.gstin}`, profile.iec && `IEC: ${profile.iec}`, profile.other_id].filter(Boolean).join('  ·  '),
    ].filter(Boolean);
    lines.forEach((l) => pdf.text(l, textX, pdf.y + 1, { width: W - (textX - X) - 215 }));
    const headBottom = Math.max(pdf.y, top + 62);

    pdf.font('B').fontSize(16).fillColor(GREEN).text(isPI ? 'PROFORMA INVOICE' : 'QUOTATION', X + W - 200, top, { width: 200, align: 'right' });
    pdf.font('R').fontSize(8.5).fillColor('#0f172a');
    const meta = [
      [isPI ? 'Invoice No.' : 'Quotation No.', doc.number],
      ['Date', dateText(doc.date)],
      doc.valid_until ? [isPI ? 'Valid until' : 'Valid until', dateText(doc.valid_until)] : null,
      doc.buyer_ref ? ['Buyer ref.', doc.buyer_ref] : null,
    ].filter(Boolean);
    let my = top + 24;
    meta.forEach(([k, v]) => {
      pdf.fillColor(GREY).text(k, X + W - 200, my, { width: 90, align: 'right' });
      pdf.fillColor('#0f172a').font('B').text(String(v || ''), X + W - 105, my, { width: 105, align: 'right' });
      pdf.font('R');
      my += 12;
    });
    let y = Math.max(headBottom, my) + 10;
    pdf.moveTo(X, y).lineTo(X + W, y).lineWidth(1.2).strokeColor(GREEN).stroke();
    y += 10;

    /* ---- Buyer + shipment terms ---- */
    const b = doc.buyer || {};
    const colW = W / 2 - 8;
    pdf.font('B').fontSize(8).fillColor(GREEN).text(isPI ? 'BILL TO / CONSIGNEE' : 'TO', X, y);
    pdf.font('B').fontSize(10).fillColor('#0f172a').text(b.company || '', X, y + 11, { width: colW });
    pdf.font('R').fontSize(8.5).fillColor('#334155');
    [b.contact && `Attn: ${b.contact}`, b.address, [b.city, b.country].filter(Boolean).join(', '), [b.phone, b.email].filter(Boolean).join('  ·  ')]
      .filter(Boolean).forEach((l) => pdf.text(l, X, pdf.y + 1, { width: colW }));
    const leftBottom = pdf.y;

    const terms = [
      ['Incoterm', doc.incoterm], ['Port of loading', doc.port_loading], ['Port of discharge', doc.port_discharge],
      ['Payment', doc.payment_terms], ['Delivery / shipment', doc.delivery], ['Packing', doc.packing], ['Origin', doc.origin],
    ].filter(([, v]) => v);
    let ty = y;
    pdf.font('B').fontSize(8).fillColor(GREEN).text('TERMS', X + colW + 16, ty);
    ty += 11;
    terms.forEach(([k, v]) => {
      pdf.font('R').fontSize(8.5).fillColor(GREY).text(k, X + colW + 16, ty, { width: 90 });
      pdf.fillColor('#0f172a').text(String(v), X + colW + 108, ty, { width: colW - 92 });
      ty = Math.max(pdf.y, ty + 11) + 1;
    });
    y = Math.max(leftBottom, ty) + 14;

    /* ---- Items ---- */
    const cols = [
      { k: 'n', t: '#', w: 22, a: 'left' },
      { k: 'description', t: 'Description of goods', w: W - 22 - 55 - 70 - 80 - 90, a: 'left' },
      { k: 'hs_code', t: 'HS code', w: 55, a: 'left' },
      { k: 'qty', t: 'Quantity', w: 70, a: 'right' },
      { k: 'rate', t: `Rate (${cur})`, w: 80, a: 'right' },
      { k: 'amount', t: `Amount (${cur})`, w: 90, a: 'right' },
    ];
    const header = () => {
      pdf.rect(X, y, W, 18).fill('#ecfdf5');
      let cx = X;
      pdf.font('B').fontSize(8).fillColor('#065f46');
      cols.forEach((c) => { pdf.text(c.t, cx + 4, y + 5, { width: c.w - 8, align: c.a }); cx += c.w; });
      y += 18;
    };
    header();
    (doc.items || []).forEach((it, i) => {
      const desc = [it.description, it.specs].filter(Boolean).join('\n');
      pdf.font('R').fontSize(8.5);
      const h = Math.max(pdf.heightOfString(desc || ' ', { width: cols[1].w - 8 }), 10) + 8;
      if (y + h > pdf.page.height - 160) { pdf.addPage(); y = 40; header(); }
      const vals = { n: String(i + 1), description: desc, hs_code: it.hs_code || '', qty: `${qtyText(it.qty)} ${it.unit || ''}`.trim(), rate: Number(it.rate || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }), amount: Number(it.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) };
      let cx = X;
      cols.forEach((c) => { pdf.font(c.k === 'description' && it.description ? 'R' : 'R').fillColor('#0f172a').text(vals[c.k], cx + 4, y + 4, { width: c.w - 8, align: c.a }); cx += c.w; });
      y += h;
      pdf.moveTo(X, y).lineTo(X + W, y).lineWidth(0.5).strokeColor(LINE).stroke();
    });

    /* ---- Totals ---- */
    if (y > pdf.page.height - 220) { pdf.addPage(); y = 40; }
    y += 6;
    const tX = X + W - 250;
    const row = (k, v, bold) => {
      pdf.font(bold ? 'B' : 'R').fontSize(bold ? 10 : 8.5).fillColor(bold ? '#0f172a' : '#334155');
      pdf.text(k, tX, y, { width: 150, align: 'right' });
      pdf.text(v, tX + 150, y, { width: 100, align: 'right' });
      y += bold ? 15 : 12;
    };
    row('Sub-total', money(doc.totals && doc.totals.subtotal, cur));
    (doc.charges || []).forEach((c) => row(c.label, `${Number(c.amount) < 0 ? '− ' : ''}${money(Math.abs(c.amount), cur)}`));
    pdf.moveTo(tX + 60, y).lineTo(X + W, y).lineWidth(0.8).strokeColor('#0f172a').stroke();
    y += 4;
    row(`Total ${doc.incoterm ? `(${doc.incoterm})` : ''}`.trim(), money(doc.totals && doc.totals.total, cur), true);
    pdf.font('R').fontSize(8).fillColor(GREY).text('Amount in words:', X, y + 2);
    pdf.font('B').fontSize(8.5).fillColor('#0f172a').text(amountInWords(doc.totals && doc.totals.total, cur), X + 80, y + 2, { width: W - 80 });
    y = pdf.y + 12;

    /* ---- Bank (proforma) + notes + terms ---- */
    const section = (title, body) => {
      if (!body) return;
      if (y > pdf.page.height - 120) { pdf.addPage(); y = 40; }
      pdf.font('B').fontSize(8).fillColor(GREEN).text(title, X, y);
      pdf.font('R').fontSize(8.3).fillColor('#334155').text(body, X, pdf.y + 2, { width: W });
      y = pdf.y + 10;
    };
    const bank = profile.bank || {};
    if (isPI && (bank.bank_name || bank.account_no)) {
      section('BANK DETAILS FOR PAYMENT', [
        bank.account_name && `Beneficiary: ${bank.account_name}`, bank.bank_name && `Bank: ${bank.bank_name}${bank.branch ? `, ${bank.branch}` : ''}`,
        bank.account_no && `Account No.: ${bank.account_no}`, [bank.swift && `SWIFT: ${bank.swift}`, bank.ifsc && `IFSC: ${bank.ifsc}`, bank.ad_code && `AD code: ${bank.ad_code}`].filter(Boolean).join('   '),
        bank.intermediary && `Intermediary bank: ${bank.intermediary}`,
      ].filter(Boolean).join('\n'));
    }
    section('NOTES', doc.notes);
    section('TERMS & CONDITIONS', doc.terms);

    /* ---- Signature ---- */
    if (y > pdf.page.height - 90) { pdf.addPage(); y = 40; }
    const sy = Math.max(y + 10, pdf.page.height - 120);
    pdf.font('R').fontSize(8.5).fillColor('#334155').text(`For ${profile.company_name || ''}`, X + W - 200, sy, { width: 200, align: 'right' });
    pdf.moveTo(X + W - 160, sy + 40).lineTo(X + W, sy + 40).lineWidth(0.5).strokeColor(GREY).stroke();
    pdf.text(profile.signatory ? `${profile.signatory}${profile.signatory_title ? `, ${profile.signatory_title}` : ''}` : 'Authorised signatory', X + W - 200, sy + 44, { width: 200, align: 'right' });
    if (!isPI) pdf.font('R').fontSize(7.5).fillColor(GREY).text('This is a quotation, not an invoice. Prices are subject to the terms above.', X, sy + 44, { width: W - 220 });

    pdf.end();
  });
}

module.exports = { render };
