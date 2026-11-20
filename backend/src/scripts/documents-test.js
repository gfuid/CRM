/**
 * Tests: Quotations + Proforma Invoices (company details, numbering, totals, PDF, share link, lead remark, access).
 *   node src/scripts/documents-test.js
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SuperAdm1n!';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'documents_test_secret';

const http = require('http');
const { amountInWords } = require('../utils/amountWords');

const results = [];
const rec = (id, who, scenario, expected, actual, pass) => results.push({ id, who, scenario, expected, actual: String(actual), result: pass ? 'PASS' : 'FAIL' });
const u = Date.now();
const year = new Date().getFullYear();
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(300, 1)]);

(async () => {
  const app = require('../app');
  const { dataStore } = require('../repositories/dataStore');
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const ORIGIN = `http://127.0.0.1:${server.address().port}`;
  const BASE = `${ORIGIN}/api/v1`;
  const call = async (method, path, token, body) => {
    const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    let data = null; try { data = await res.json(); } catch {}
    return { status: res.status, data };
  };
  const reg = async (name) => {
    const r = await call('POST', '/auth/register', null, { name, email: `${name.toLowerCase()}${u}@t.com`, password: 'Owner123', company_name: `${name} Exports` });
    return { token: r.data.data.token, id: r.data.data.user.id };
  };
  const A = await reg('Ravi');
  const B = await reg('Bina');
  const s1 = (await call('POST', '/admin/users', A.token, { name: 'Sona', email: `sona${u}@t.com`, password: 'Staff123' })).data.data;
  const s2 = (await call('POST', '/admin/users', A.token, { name: 'Mohan', email: `mohan${u}@t.com`, password: 'Staff123' })).data.data;
  const S1 = (await call('POST', '/auth/login', null, { email: `sona${u}@t.com`, password: 'Staff123' })).data.data.token;
  const S2 = (await call('POST', '/auth/login', null, { email: `mohan${u}@t.com`, password: 'Staff123' })).data.data.token;
  const mkLead = async (token, name, extra = {}) => (await call('POST', '/leads', token, { company_name: name, country: 'United Arab Emirates', city: 'Dubai', contacts: [{ name: 'Ahmed', email: `a${name.length}${u}@t.com`, phone: '+971 50 111 2222' }], products: ['Turmeric', 'Red Chilli'], quantity: 40, quantity_unit: 'MT', follow_up_date: '2030-01-01', today_remarks: 'First call', next_follow_up_action: 'Send price', ...extra })).data.data;
  const leadA = await mkLead(A.token, 'Al Noor Trading', { price: 52000, export_requirements: { incoterm: 'CIF', port_delivery: 'Jebel Ali', payment_days: '30% advance, 70% against BL', product_notes: 'Curcumin 3%+, 25 kg PP bags' } });
  const leadS1 = await mkLead(S1, 'Hà Nội Spice Co');
  const leadS2 = await mkLead(S2, 'Lagos Agro Mills');

  // 1. Access
  const sNo = await call('GET', '/documents', S1);
  const own = await call('GET', '/documents', A.token);
  await call('PATCH', `/admin/users/${s1.id}`, A.token, { permissions: { quotations: true } });
  const sYes = await call('GET', '/documents', S1);
  rec('DC-01', 'Staff / Owner', 'Staff need the owner\'s "Quotations" permission; the owner always has it', '403 / 200 / 200', `${sNo.status} / ${own.status} / ${sYes.status}`, sNo.status === 403 && own.status === 200 && sYes.status === 200);

  // 2. Company details
  const badLogo = await call('PUT', '/documents/profile', A.token, { company_name: 'Ravi Exports Pvt Ltd', logo_data_url: `data:image/png;base64,${Buffer.from('<svg/>').toString('base64')}` });
  const prof = await call('PUT', '/documents/profile', A.token, { company_name: 'Ravi Exports Pvt Ltd', address: '12 MG Road, Kochi, Kerala 682001, India', phone: '+91 98765 43210', email: 'sales@raviexports.example', gstin: '32ABCDE1234F1Z5', iec: 'ABCDE1234F', signatory: 'Ravi Kumar', signatory_title: 'Director', port_loading: 'Cochin, India', default_currency: 'USD', valid_days: 10, logo_data_url: `data:image/png;base64,${PNG.toString('base64')}`, bank: { account_name: 'Ravi Exports Pvt Ltd', bank_name: 'State Bank of India', account_no: '123456789012', swift: 'SBININBB123', ifsc: 'SBIN0001234', ad_code: '0001234' } });
  const staffProf = await call('PUT', '/documents/profile', S1, { company_name: 'hack' });
  const staffRead = await call('GET', '/documents/profile', S1);
  rec('DC-02', 'Owner', 'Company details with logo and bank are saved; a fake logo is refused; staff can read but not change them', '400 / 200 logo / 403 / 200', `${badLogo.status} / ${prof.status} logo=${Boolean(prof.data?.data?.logo)} bank=${prof.data?.data?.bank?.swift} / ${staffProf.status} / ${staffRead.status}`, badLogo.status === 400 && prof.status === 200 && prof.data.data.logo && prof.data.data.bank.swift === 'SBININBB123' && staffProf.status === 403 && staffRead.status === 200 && staffRead.data.data.company_name === 'Ravi Exports Pvt Ltd');

  // 3. Prefill from a lead
  const pre = (await call('GET', `/documents/prefill?type=quotation&lead_id=${leadA.id}`, A.token)).data.data;
  rec('DC-03', 'Owner', 'A new quotation is filled from the lead: buyer, products, quantity, rate, CIF, port, payment, terms', 'Al Noor, 2 lines, 40 MT, rate 1300, CIF', `${pre.buyer.company} ${pre.items.length} ${pre.items[0].qty}${pre.items[0].unit} rate=${pre.items[0].rate} ${pre.incoterm} ${pre.port_discharge} valid=${pre.valid_until}`, pre.buyer.company === 'Al Noor Trading' && pre.buyer.contact === 'Ahmed' && pre.items.length === 2 && pre.items[0].qty === 40 && pre.items[0].rate === 1300 && pre.items[0].specs.includes('Curcumin') && pre.incoterm === 'CIF' && pre.port_discharge === 'Jebel Ali' && pre.port_loading === 'Cochin, India' && pre.currency === 'USD' && /Prices are valid/.test(pre.terms));

  // 4. Create + totals + numbering
  const body = { ...pre, type: 'quotation', items: [{ description: 'Turmeric finger', specs: 'Curcumin 3%+', hs_code: '09103020', qty: 40, unit: 'MT', rate: 1300 }, { description: 'Red Chilli S17', qty: 10.5, unit: 'MT', rate: 2150.5 }], charges: [{ label: 'Inspection (SGS)', amount: 250 }, { label: 'Discount', amount: -500 }] };
  const q1 = await call('POST', '/documents', A.token, body);
  const q2 = await call('POST', '/documents', A.token, { ...body, items: [{ description: 'Maize', qty: 1, rate: 100 }], charges: [] });
  const pi1 = await call('POST', '/documents', A.token, { ...body, type: 'proforma' });
  const t = q1.data?.data?.totals || {};
  rec('DC-04', 'Owner', 'Line amounts and totals (with an extra charge and a discount) are worked out by the server', 'subtotal 74580.25, total 74330.25', `${q1.status} ${t.subtotal} ${t.total} line2=${q1.data?.data?.items?.[1]?.amount}`, q1.status === 201 && t.subtotal === 74580.25 && t.total === 74330.25 && q1.data.data.items[1].amount === 22580.25);
  rec('DC-05', 'Owner', 'Numbers run per company, per type and per year', `QT-${year}-0001, 0002, PI-${year}-0001`, `${q1.data.data.number} ${q2.data.data.number} ${pi1.data.data.number}`, q1.data.data.number === `QT-${year}-0001` && q2.data.data.number === `QT-${year}-0002` && pi1.data.data.number === `PI-${year}-0001`);
  const noItems = await call('POST', '/documents', A.token, { ...body, items: [] });
  const noDesc = await call('POST', '/documents', A.token, { ...body, items: [{ qty: 1, rate: 5 }] });
  const neg = await call('POST', '/documents', A.token, { ...body, charges: [{ label: 'Discount', amount: -999999 }] });
  const badDate = await call('POST', '/documents', A.token, { ...body, date: '2030-02-10', valid_until: '2030-02-01' });
  const noBuyer = await call('POST', '/documents', A.token, { ...body, buyer: { company: '' } });
  rec('DC-06', 'Owner', 'No lines, a line without description, a total below zero, "valid until" before the date, or no buyer is refused', '400 x5', `${noItems.status} ${noDesc.status} ${neg.status} ${badDate.status} ${noBuyer.status}`, [noItems, noDesc, neg, badDate, noBuyer].every((r) => r.status === 400));

  // 5. PDF + share link
  const pdfRes = await fetch(`${BASE}/documents/${q1.data.data.id}/pdf`, { headers: { Authorization: `Bearer ${A.token}` } });
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  rec('DC-07', 'Owner', 'The quotation downloads as a real PDF file with a clear name', 'application/pdf, %PDF, named', `${pdfRes.status} ${pdfRes.headers.get('content-type')} ${pdfBuf.subarray(0, 5).toString()} ${pdfBuf.length}B ${pdfRes.headers.get('content-disposition')}`, pdfRes.status === 200 && pdfRes.headers.get('content-type') === 'application/pdf' && pdfBuf.subarray(0, 5).toString() === '%PDF-' && pdfBuf.length > 5000 && /Quotation-QT-/.test(pdfRes.headers.get('content-disposition')));
  const share = q1.data.data.share_url;
  const pub = await fetch(share.replace(/^https?:\/\/[^/]+/, ORIGIN));
  const wrong = await fetch(`${ORIGIN}/api/v1/documents/share/${'x'.repeat(24)}`);
  const viewed = dataStore.waRecords.find((r) => r.id === q1.data.data.id);
  rec('DC-08', 'Buyer', 'The buyer opens the PDF from the share link without login; the view is counted; a wrong link gives 404', '200 pdf, views 1, 404', `${pub.status} ${pub.headers.get('content-type')} views=${viewed.views} / ${wrong.status}`, pub.status === 200 && pub.headers.get('content-type') === 'application/pdf' && viewed.views === 1 && Boolean(viewed.viewed_at) && wrong.status === 404);
  const nl = await call('POST', `/documents/${q1.data.data.id}/new-link`, A.token);
  const oldLink = await fetch(share.replace(/^https?:\/\/[^/]+/, ORIGIN));
  const newLink = await fetch(nl.data.data.share_url.replace(/^https?:\/\/[^/]+/, ORIGIN));
  rec('DC-09', 'Owner', 'A new share link stops the old one', 'old 404, new 200', `${oldLink.status} ${newLink.status}`, oldLink.status === 404 && newLink.status === 200);

  // 6. Sent -> remark on the lead
  const sent = await call('POST', `/documents/${q1.data.data.id}/sent`, A.token, { channel: 'whatsapp' });
  await call('POST', `/documents/${q1.data.data.id}/sent`, A.token, { channel: 'whatsapp' });
  const leadAfter = dataStore.leads.find((l) => l.id === leadA.id);
  const notes = (leadAfter.previous_remarks || []).filter((r) => r.doc_id === q1.data.data.id);
  rec('DC-10', 'Owner / Lead', 'Sending notes it on the lead once (amount, products), sets a follow-up and moves the stage to Quotation Sent', 'sent, 1 remark, Quotation Sent', `${sent.data?.data?.status} remarks=${notes.length} stage=${leadAfter.stage} next=${leadAfter.next_follow_up_action} "${(notes[0] || {}).today_remark?.slice(0, 60)}"`, sent.data.data.status === 'sent' && notes.length === 1 && leadAfter.stage === 'Quotation Sent' && /USD 74,330.25 CIF/.test(notes[0].today_remark) && leadAfter.next_follow_up_action === 'Follow up on the quotation');

  // 7. Quotation -> proforma
  const conv = await call('POST', `/documents/${q1.data.data.id}/convert`, A.token);
  const qAfter = dataStore.waRecords.find((r) => r.id === q1.data.data.id);
  rec('DC-11', 'Owner', 'A quotation becomes a proforma invoice with the same lines and total; the quotation is marked accepted', `PI-${year}-0002, same total, accepted`, `${conv.status} ${conv.data?.data?.number} ${conv.data?.data?.totals?.total} ${qAfter.status} terms=${/Shipment after receipt/.test(conv.data?.data?.terms)}`, conv.status === 201 && conv.data.data.number === `PI-${year}-0002` && conv.data.data.totals.total === 74330.25 && qAfter.status === 'accepted' && /Shipment after receipt/.test(conv.data.data.terms) && conv.data.data.from_doc_id === q1.data.data.id);
  const piPdf = await fetch(`${BASE}/documents/${conv.data.data.id}/pdf`, { headers: { Authorization: `Bearer ${A.token}` } });
  rec('DC-12', 'Owner', 'The proforma invoice PDF (with bank details) is made', '200 pdf', `${piPdf.status} ${(await piPdf.arrayBuffer()).byteLength}B`, piPdf.status === 200);

  // 8. Staff limits + other company
  const sOwnLead = await call('POST', '/documents', S1, { ...(await call('GET', `/documents/prefill?lead_id=${leadS1.id}`, S1)).data.data, items: [{ description: 'Black pepper 550 GL', qty: 12, unit: 'MT', rate: 6100 }] });
  const sOtherLead = await call('GET', `/documents/prefill?lead_id=${leadS2.id}`, S1);
  const sList = (await call('GET', '/documents', S1)).data.data;
  const sOwnerDoc = await call('GET', `/documents/${q2.data.data.id}`, S1);
  const sDelOwner = await call('DELETE', `/documents/${q2.data.data.id}`, S1);
  rec('DC-13', 'Staff', 'Staff make quotations for their own leads only and see only their own documents', '201 / 404 / 1 doc / 404 / 404', `${sOwnLead.status} / ${sOtherLead.status} / ${sList.length} / ${sOwnerDoc.status} / ${sDelOwner.status}`, sOwnLead.status === 201 && sOtherLead.status === 404 && sList.length === 1 && sOwnerDoc.status === 404 && sDelOwner.status === 404);
  const uniPdf = await fetch(`${BASE}/documents/${sOwnLead.data.data.id}/pdf`, { headers: { Authorization: `Bearer ${S1}` } });
  rec('DC-14', 'Staff', 'A buyer name with accents (Hà Nội) prints in the PDF', '200 pdf', `${uniPdf.status} ${uniPdf.headers.get('content-type')}`, uniPdf.status === 200);
  const bList = (await call('GET', '/documents', B.token)).data.data;
  const bGet = await call('GET', `/documents/${q2.data.data.id}`, B.token);
  const bPdf = await fetch(`${BASE}/documents/${q2.data.data.id}/pdf`, { headers: { Authorization: `Bearer ${B.token}` } });
  const bLead = await call('GET', `/documents/prefill?lead_id=${leadA.id}`, B.token);
  const bNum = await call('POST', '/documents', B.token, { ...body, lead_id: undefined });
  rec('DC-15', 'Other company', 'Another company sees none of these, cannot open them, and starts its own numbering', '0 / 404 / 404 / 404 / 0001', `${bList.length} / ${bGet.status} / ${bPdf.status} / ${bLead.status} / ${bNum.data?.data?.number}`, bList.length === 0 && bGet.status === 404 && bPdf.status === 404 && bLead.status === 404 && bNum.data.data.number === `QT-${year}-0001`);

  // 9. Words, status, delete
  rec('DC-16', 'Server', 'Amount in words: lakh / crore for INR, million for others', 'INR lakh, USD thousand + cents', `${amountInWords(1234567, 'INR')} | ${amountInWords(74330.25, 'USD')}`, amountInWords(1234567, 'INR') === 'Rupees Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Only' && amountInWords(74330.25, 'USD') === 'US Dollars Seventy Four Thousand Three Hundred Thirty and Cents Twenty Five Only');
  const st = await call('PUT', `/documents/${q2.data.data.id}`, A.token, { status: 'rejected' });
  const del = await call('DELETE', `/documents/${q2.data.data.id}`, A.token);
  const delLink = await fetch(q2.data.data.share_url.replace(/^https?:\/\/[^/]+/, ORIGIN));
  rec('DC-17', 'Owner', 'Mark a quotation rejected; deleting it also stops its share link', 'rejected / 200 / 404', `${st.data?.data?.status} / ${del.status} / ${delLink.status}`, st.data.data.status === 'rejected' && del.status === 200 && delLink.status === 404);

  server.close();
  const failed = results.filter((r) => r.result === 'FAIL');
  console.table(results.map((r) => ({ ...r, scenario: r.scenario.slice(0, 70), actual: r.actual.slice(0, 90) })));
  console.log(`QUOTATIONS / PROFORMA: ${results.length - failed.length} PASSED | ${failed.length} FAILED | TOTAL: ${results.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
