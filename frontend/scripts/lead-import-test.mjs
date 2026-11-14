/**
 * Test cases for the bulk lead import rules (frontend/src/data/leadImport.js).
 * Run:  npm --prefix frontend run test:import
 * No browser and no server needed: it feeds CSV text to the same code the import window uses.
 */
import { buildColumns, parseCsv, templateCsv, fileProblem, reviewImport, toIsoDate, toNumber } from '../src/data/leadImport.js';

const SOURCES = ['Direct Inquiry', 'Self/own', 'Customs Data', 'Website', 'Trade Fair', 'Referral', 'Cold Outreach'];
const STAGES = ['Lead Generation', 'Contact Established', 'Requirement Understood', 'Sample Sent', 'Quotation Sent', 'Negotiation', 'Closed Won', 'Closed Lost'];
const PRODUCTS = ['Turmeric', 'Maize', 'Rice DDGS', 'Corn DDGS'];
const OWNER = { id: 'usr_owner', name: 'Asha Owner' };
const TEAM = [{ id: 'usr_staff1', name: 'Ravi Kumar' }];
const base = { commodities: PRODUCTS, leadSources: SOURCES, stages: STAGES, today: '2026-11-14' };
const asOwner = { ...base, isOwner: true, profile: OWNER, teamList: TEAM };
const asStaff = { ...base, isOwner: false, profile: { id: 'usr_staff1', name: 'Ravi Kumar' }, teamList: [] };

const results = [];
const rec = (id, scenario, expected, actual, pass) => results.push({ id, scenario, expected, actual: String(actual), result: pass ? 'PASS' : 'FAIL' });
const csv = (...lines) => lines.join('\r\n');
const review = (text, ctx = asOwner) => reviewImport(parseCsv(text), ctx);
const errorsOf = (r, i = 0) => Object.values(r.rows[i].errors).join('; ');

// ---------- Reading the file ----------
{
  const p = parseCsv('﻿Company Name,Country\r\n"Good Foods, LLC","United Arab\nEmirates"\r\n\r\n ,  \r\nSecond Co,India');
  rec('CSV-01', 'Excel BOM, comma and line break inside quotes, blank lines', '2 rows, comma kept', `${p.rows.length} rows, ${p.rows[0][0]}`, p.headers[0] === 'Company Name' && p.rows.length === 2 && p.rows[0][0] === 'Good Foods, LLC' && p.rows[0][1].includes('\n'));
  const q = parseCsv('Company Name,Notes\nO\'Brien & Sons,"He said ""call later"""');
  rec('CSV-02', 'Apostrophe in a name and doubled quotes', "O'Brien kept, one quote pair", `${q.rows[0][0]} | ${q.rows[0][1]}`, q.rows[0][0] === "O'Brien & Sons" && q.rows[0][1] === 'He said "call later"');
  rec('CSV-03', 'Empty file is refused', 'no data rows', fileProblem(parseCsv('')), /no data rows/.test(fileProblem(parseCsv(''))));
  rec('CSV-04', 'Headings only (no rows) is refused', 'no data rows', fileProblem(parseCsv('Company Name,Country')), /no data rows/.test(fileProblem(parseCsv('Company Name,Country'))));
  rec('CSV-05', 'File without a Company Name column is refused', 'column not found', fileProblem(parseCsv('Buyer,Country\nX,India')), /Company Name/.test(fileProblem(parseCsv('Buyer,Country\nX,India'))));
  const big = 'Company Name\n' + Array.from({ length: 501 }, (_, i) => `Co ${i}`).join('\n');
  rec('CSV-06', 'More than 500 rows is refused', 'at most 500', fileProblem(parseCsv(big)), /at most 500/.test(fileProblem(parseCsv(big))));
  rec('CSV-07', 'A normal file passes the file check', 'null', fileProblem(parseCsv('Company Name\nA')), fileProblem(parseCsv('Company Name\nA')) === null);
}

// ---------- The template ----------
{
  const cols = buildColumns(base);
  const t = parseCsv(templateCsv(cols));
  const back = reviewImport(t, asOwner);
  rec('TPL-01', 'The downloaded template imports cleanly as it is', 'all headings found, 2 ready rows', `${back.found.length}/${cols.length} found, ${back.ready.length} ready, ${back.bad.length} bad`, back.found.length === cols.length && back.ready.length === 2 && back.bad.length === 0 && back.unknown.length === 0);
  const staffCols = cols.filter((c) => !c.ownerOnly).map((c) => c.header);
  rec('TPL-02', 'Staff template has no owner-only columns', 'no Deal Value / Incoterm / Port / Assigned Rep', staffCols.join(','), !staffCols.some((h) => ['Deal Value USD', 'Incoterm', 'Port Delivery', 'Assigned Rep'].includes(h)));
}

// ---------- Columns ----------
{
  const r = review(csv('company,Country,Favourite Colour,Qty', 'A Co,India,blue,5'));
  rec('COL-01', 'Short heading names are understood (company, Qty)', 'Company Name + Quantity found', r.found.map((c) => c.header).join(','), r.found.some((c) => c.key === 'company') && r.found.some((c) => c.key === 'quantity'));
  rec('COL-02', 'An unknown column is listed as ignored, not imported', 'Favourite Colour', r.unknown.join(','), r.unknown.join(',') === 'Favourite Colour' && !JSON.stringify(r.rows[0].payload).includes('blue'));
  rec('COL-03', 'Columns not in the file are listed as missing', 'Email missing', r.missing.some((c) => c.key === 'email'), r.missing.some((c) => c.key === 'email'));
}

// ---------- Rules for each row ----------
{
  const good = review(csv(
    'Company Name,Country,Contact Person,Phone,Email,Lead Source,Products,Quantity,Unit,Deal Value USD,Stage,Incoterm,Port Delivery,Assigned Rep,Follow-up Date,Remarks,Next Action',
    '"Good Foods, LLC",UAE,Ali,+971 50 1,ali@good.ae,customs data,"rice ddgs, MAIZE",40,mt,"68,000",sample sent,CIF,Jebel Ali,ravi kumar,25-12-2026,Met at fair,Send quote'
  ));
  const p = good.rows[0].payload;
  rec('ROW-01', 'A correct row is ready', 'Ready', good.rows[0].ok ? 'Ready' : errorsOf(good), good.rows[0].ok);
  rec('ROW-02', 'Spelling is normalised to the company lists', 'Customs Data / Sample Sent / Rice DDGS, Maize / MT', `${p.source} / ${p.stage} / ${p.products.join(', ')} / ${p.quantity_unit}`, p.source === 'Customs Data' && p.stage === 'Sample Sent' && p.products.join() === 'Rice DDGS,Maize' && p.quantity_unit === 'MT');
  rec('ROW-03', 'Numbers and dates are converted', '40, 68000, 2026-12-25', `${p.quantity}, ${p.value}, ${p.follow_up_date}`, p.quantity === 40 && p.value === 68000 && p.price === 68000 && p.follow_up_date === '2026-12-25');
  rec('ROW-04', 'An old "Assigned Rep" column does not decide the assignee (owner by default)', 'usr_owner, column reported', `${p.assigned_to}, ${good.assignColumnIgnored}`, p.assigned_to === 'usr_owner' && good.assignColumnIgnored === 'Assigned Rep' && !good.unknown.includes('Assigned Rep'));
  rec('ROW-05', 'Shipping terms go to the requirements block', 'CIF / Jebel Ali', `${p.export_requirements.incoterm} / ${p.export_requirements.port_delivery}`, p.export_requirements.incoterm === 'CIF' && p.export_requirements.port_delivery === 'Jebel Ali');

  const blank = review(csv('Company Name', 'Only Name Co'));
  const b = blank.rows[0].payload;
  rec('ROW-06', 'A row with only the company name is ready, with defaults', 'Lead Generation, Direct Inquiry, today, assigned to me', `${b.stage}, ${b.source}, ${b.follow_up_date}, ${b.assigned_to}`, blank.rows[0].ok && b.stage === 'Lead Generation' && b.source === 'Direct Inquiry' && b.follow_up_date === '2026-11-14' && b.assigned_to === 'usr_owner' && b.follow_up_time === '10:00');
  rec('ROW-07', 'Remark and next action get a default (the server needs them)', 'non-empty', `${b.today_remarks} / ${b.next_follow_up_action}`, Boolean(b.today_remarks) && Boolean(b.next_follow_up_action));
  rec('ROW-08', 'No product block is sent when none was given', 'no products key', Object.keys(b).includes('products'), !('products' in b));

  const bad = (line, header = 'Company Name,Email,Lead Source,Products,Quantity,Unit,Deal Value USD,Stage,Assigned Rep,Follow-up Date') => review(csv(header, line));
  const cases = [
    ['ERR-01', 'Company name empty but the rest filled', ',buyer@x.com,,Maize,5,,,,,', /Company Name is empty/],
    ['ERR-02', 'Product not in the company list', 'X Co,,,Unobtainium,,,,,,', /Not in your product list: Unobtainium/],
    ['ERR-03', 'One good and one unknown product', 'X Co,,,"Maize, Gold",,,,,,', /Not in your product list: Gold/],
    ['ERR-04', 'Unknown stage', 'X Co,,,,,,,Winning,,', /Not a pipeline stage/],
    ['ERR-05', 'Unknown lead source', 'X Co,,Facebook Ads,,,,,,,', /Not in the lead source list/],
    ['ERR-06', 'Unknown unit', 'X Co,,,,5,boxes,,,,', /Unit must be one of/],
    ['ERR-07', 'Quantity is not a number', 'X Co,,,,abc,,,,,', /Quantity must be a number/],
    ['ERR-08', 'Deal value is not a number', 'X Co,,,,,,ten thousand,,,', /Deal value must be a number/],
    ['ERR-09', 'Invalid email', 'X Co,not-an-email,,,,,,,,', /Not a valid email/],
    ['ERR-10', 'Impossible date (31 Feb)', 'X Co,,,,,,,,,31-02-2026', /Use YYYY-MM-DD or DD-MM-YYYY/],
    ['ERR-11', 'Date in words', 'X Co,,,,,,,,,next monday', /Use YYYY-MM-DD or DD-MM-YYYY/],
  ];
  cases.forEach(([id, scenario, line, re]) => {
    const r = bad(line);
    rec(id, scenario, 'row refused with the reason', r.rows[0] ? errorsOf(r) : 'no row', r.rows.length === 1 && !r.rows[0].ok && re.test(errorsOf(r)) && r.ready.length === 0);
  });

  const multi = bad('X Co,bad,Nope,Gold,abc,boxes,xyz,Winning,Nobody,31-02-2026');
  rec('ERR-13', 'Every problem in a row is reported, not just the first', '8 reasons', Object.keys(multi.rows[0].errors).length, Object.keys(multi.rows[0].errors).length === 8);
  const noRepError = bad('X Co,,,,,,,,Nobody Here,');
  rec('ERR-12', 'An unknown name in an old "Assigned Rep" column is no longer an error', 'row ready', noRepError.rows[0].ok ? 'Ready' : errorsOf(noRepError), noRepError.rows[0].ok);
}

// ---------- Duplicates ----------
{
  const r = reviewImport(parseCsv(csv('Company Name', 'Existing Buyer Ltd', 'New Co', 'new  co', 'NEW CO', 'Other Co')), { ...asOwner, existingNames: ['  existing buyer LTD '] });
  rec('DUP-01', 'A company already in the CRM is refused (case and spaces ignored)', 'Already in your CRM', errorsOf(r, 0), /Already in your CRM/.test(errorsOf(r, 0)));
  rec('DUP-02', 'The same company twice in the file: first is kept, repeats are refused', 'row 3 kept, rows 4 and 5 refused', `${r.rows[1].ok} / ${errorsOf(r, 2)} / ${errorsOf(r, 3)}`, r.rows[1].ok && /Same company as row 3/.test(errorsOf(r, 2)) && /Same company as row 3/.test(errorsOf(r, 3)));
  rec('DUP-03', 'Only the clean rows are counted as ready', '2 ready, 3 refused', `${r.ready.length} ready, ${r.bad.length} refused`, r.ready.length === 2 && r.bad.length === 3 && r.ready.map((x) => x.payload.company_name).join() === 'New Co,Other Co');
  rec('DUP-04', 'Row numbers match the spreadsheet (heading is row 1)', '2,3,4,5,6', r.rows.map((x) => x.line).join(','), r.rows.map((x) => x.line).join(',') === '2,3,4,5,6');
}

// ---------- Staff ----------
{
  const r = review(csv(
    'Company Name,Products,Quantity,Unit,Deal Value USD,Incoterm,Port Delivery,Assigned Rep',
    'Staff Lead Co,Maize,10,kg,not-a-number,CIF,Dubai,Somebody Else'
  ), asStaff);
  const p = r.rows[0].payload;
  rec('STF-01', 'Staff: owner-only columns are skipped, even with bad values', 'row ready', r.rows[0].ok ? 'Ready' : errorsOf(r), r.rows[0].ok);
  rec('STF-02', 'Staff: skipped columns are listed for the user', 'Deal Value USD, Incoterm, Port Delivery (+ Assigned Rep note)', `${r.lockedFound.map((c) => c.header).join(', ')} | ${r.assignColumnIgnored}`, r.lockedFound.length === 3 && r.assignColumnIgnored === 'Assigned Rep');
  rec('STF-03', 'Staff payload carries no price, terms or assignee', 'none of them', Object.keys(p).filter((k) => ['price', 'value', 'export_requirements', 'assigned_to', 'type'].includes(k)).join(',') || 'none', !('price' in p) && !('value' in p) && !('export_requirements' in p) && !('assigned_to' in p));
  rec('STF-04', 'Staff can still import product and quantity', 'Maize 10 kg', `${p.products} ${p.quantity} ${p.quantity_unit}`, p.products.join() === 'Maize' && p.quantity === 10 && p.quantity_unit === 'kg');
}

// ---------- Who gets the leads (one person per file) ----------
{
  const file = csv('Company Name', 'Assign A Co', 'Assign B Co', 'Assign C Co');
  const ownerDefault = review(file);
  rec('ASN-01', 'Owner import: every lead goes to the owner by default', 'usr_owner x3', ownerDefault.rows.map((r) => r.payload.assigned_to).join(','), ownerDefault.rows.every((r) => r.payload.assigned_to === 'usr_owner'));
  const toStaff = reviewImport(parseCsv(file), { ...asOwner, assignTo: 'usr_staff1' });
  rec('ASN-02', 'Owner picks one staff member: every lead of the file goes to that person', 'usr_staff1 x3', toStaff.rows.map((r) => r.payload.assigned_to).join(','), toStaff.rows.length === 3 && toStaff.rows.every((r) => r.payload.assigned_to === 'usr_staff1'));
  const mixed = reviewImport(parseCsv(csv('Company Name,Assigned Rep', 'Mixed A,Ravi Kumar', 'Mixed B,Somebody Else')), { ...asOwner, assignTo: 'usr_staff1' });
  rec('ASN-03', 'Different names per row cannot split one file between people', 'both rows -> chosen person', mixed.rows.map((r) => r.payload.assigned_to).join(','), mixed.rows.every((r) => r.payload.assigned_to === 'usr_staff1'));
  const staffTry = reviewImport(parseCsv(file), { ...asStaff, assignTo: 'usr_owner' });
  rec('ASN-04', 'Staff import never sends an assignee (the server gives the leads to that staff member)', 'no assigned_to', staffTry.rows.map((r) => ('assigned_to' in r.payload ? r.payload.assigned_to : '-')).join(','), staffTry.rows.every((r) => !('assigned_to' in r.payload)));
  const tplCols = buildColumns(base).map((c) => c.header);
  rec('ASN-05', 'The template has no "Assigned Rep" column any more', 'not present', tplCols.includes('Assigned Rep'), !tplCols.includes('Assigned Rep'));
}

// ---------- Address, State / Province, Area / City, Pin code ----------
{
  const r = review(csv(
    'Company Name,Address,State / Province,Area / City,Pin Code',
    'Loc Co,"Warehouse 14, Al Quoz",Dubai,Al Quoz,00000',
    'Loc Two,No 222 Bandaranayake Mawatha,Western Province,Wattala,11300',
    'Loc UK,1 High St,England,London,SW1A 1AA',
    'Loc Bad,,,,12#45'
  ));
  const p = r.rows[0].payload;
  rec('LOC-01', 'Address, state, city and pin code are imported', 'Warehouse 14, Al Quoz | Dubai | Al Quoz | 00000', `${p.address} | ${p.state} | ${p.city} | ${p.pincode}`, p.address === 'Warehouse 14, Al Quoz' && p.state === 'Dubai' && p.city === 'Al Quoz' && p.pincode === '00000');
  rec('LOC-02', 'Letters and spaces in a pin code are fine (UK, NL style)', 'SW1A 1AA ready', `${r.rows[2].payload.pincode} ${r.rows[2].ok}`, r.rows[2].ok && r.rows[2].payload.pincode === 'SW1A 1AA');
  rec('LOC-03', 'A pin code with symbols is refused', 'Pin code error', errorsOf(r, 3), !r.rows[3].ok && /Pin code/.test(errorsOf(r, 3)));
  const alias = review(csv('Company Name,State,City,ZIP', 'Alias Co,Kerala,Kochi,682001'));
  const a = alias.rows[0].payload;
  rec('LOC-04', 'Short headings work too (State, City, ZIP / Postcode)', 'Kerala | Kochi | 682001', `${a.state} | ${a.city} | ${a.pincode}`, a.state === 'Kerala' && a.city === 'Kochi' && a.pincode === '682001');
}

// ---------- WhatsApp / Zalo column ----------
{
  const tpl = buildColumns(base).map((c) => c.header);
  rec('ZAL-01', 'The template calls the column "WhatsApp / Zalo"', 'present', tpl.includes('WhatsApp / Zalo'), tpl.includes('WhatsApp / Zalo'));
  const oldName = review(csv('Company Name,WhatsApp', 'Old Header Co,+84 90 123 4567'));
  const zaloName = review(csv('Company Name,Zalo', 'Zalo Header Co,+84 90 765 4321'));
  rec('ZAL-02', 'Old files with "WhatsApp", or a "Zalo" heading, still fill the same field', '+84 numbers saved', `${oldName.rows[0].payload.whatsapp} | ${zaloName.rows[0].payload.whatsapp}`, oldName.rows[0].payload.whatsapp === '+84 90 123 4567' && zaloName.rows[0].payload.whatsapp === '+84 90 765 4321');
}

// ---------- Small converters ----------
{
  const d = [['2026-01-05', '2026-01-05'], ['5-1-2026', '2026-01-05'], ['05/01/2026', '2026-01-05'], ['05.01.2026', '2026-01-05'], ['29-02-2028', '2028-02-29'], ['29-02-2026', null], ['2026-13-01', null], ['01-2026', null]];
  rec('CNV-01', 'Dates: accepted formats and impossible dates', d.map((x) => x[1]).join('|'), d.map((x) => toIsoDate(x[0])).join('|'), d.every(([i, o]) => toIsoDate(i) === o));
  const n = [['', 0], ['40', 40], ['1,250.5', 1250.5], ['$ 68,000', 68000], ['-5', null], ['4 MT', null], ['1e3', null]];
  rec('CNV-02', 'Numbers: commas and $ allowed, text and negatives refused', n.map((x) => x[1]).join('|'), n.map((x) => toNumber(x[0])).join('|'), n.every(([i, o]) => toNumber(i) === o));
}

const fails = results.filter((x) => x.result === 'FAIL');
console.table(results.map((x) => ({ ...x, scenario: x.scenario.slice(0, 70), expected: x.expected.slice(0, 44), actual: x.actual.slice(0, 60) })));
console.log(`BULK IMPORT RULES: ${results.length - fails.length} PASSED | ${fails.length} FAILED | TOTAL: ${results.length}`);
process.exit(fails.length ? 1 : 0);
