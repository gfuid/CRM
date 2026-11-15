/**
 * One function per help video. `k` is the recording kit from record.mjs:
 *   k.say(text)          caption at the bottom (waits long enough to read it)
 *   k.spot(locator, txt) green box around something + caption
 *   k.click / k.type     visible cursor, then the real click / typing
 *   k.nav(tab)           click a menu item
 * All names and numbers come from the demo company in seed.mjs.
 */

const CSV_FOR_IMPORT = [
  'Company Name,Country,Address,State / Province,Area / City,Pin Code,Contact Person,Phone,Products,Quantity,Unit,Stage,Remarks,Next Action',
  'Mekong Feed Partners,Vietnam,12 Nguyen Hue,Ho Chi Minh,District 1,700000,Le Thi Hoa,+84 90 222 3344,Corn DDGS,120,MT,Lead Generation,Met at Vietstock fair,Send price list',
  'Colombo Poultry Group,Sri Lanka,45 Galle Road,Western Province,Colombo,00300,Kasun Silva,+94 77 123 4567,"Rice DDGS, Maize",60,MT,Contact Established,Asked for samples,Arrange sample',
  'Lagos Agro Mills,Nigeria,8 Wharf Road,Lagos,Apapa,102272,Bola Adeyemi,+234 803 111 2233,Jowar,90,MT,Lead Generation,Customs data lead,First call',
  'Gulf Spice House,United Arab Emirates,,Dubai,Deira,,Faisal Rahman,+971 55 444 5566,Saffron,5,MT,Lead Generation,,',
].join('\r\n');

export const SCENES = {
  'getting-started': async (k) => {
    const { page } = k;
    await k.say('This is your CRM. Every section opens from the menu on the left.');
    const items = [
      ['leads', 'Leads: every buyer with products, contacts and the full remark history.'],
      ['followup', 'Follow up: who you must call today, and the follow-ups you missed.'],
      ['tasks', 'Task Management: work the owner gives to staff, with a due date.'],
      ['activity', 'Activity: all your leads on one board, by stage.'],
      ['outreach', 'Outreach: calls, emails and WhatsApp / Zalo messages per person, per day.'],
      ['mydays', 'My Days: your planner and the daily report.'],
      ['analytics', 'Analytics: pipeline value, products and countries.'],
      ['review', 'Team Review: the owner checks each person’s work every day.'],
      ['support', 'Help & Support: these videos, the AI assistant and support tickets.'],
    ];
    for (const [tab, text] of items) await k.spot(k.vis(`[data-tour="nav-${tab}"]`), text);
    await k.spot(k.vis('[data-tour="notifications"]'), 'The bell shows today’s reminders and missed follow-ups.');
    await k.spot(k.vis('[data-tour="create-staff"]'), 'The owner creates staff accounts here. Staff only see the sections the owner allows.');
    await k.nav('leads');
    await k.say('Start with Leads: add your buyers, then follow up with them every day.');
  },

  'add-lead': async (k) => {
    const { page } = k;
    await k.nav('leads');
    await k.spot(page.getByRole('button', { name: /^Add Lead$/ }), 'To add a buyer, press “Add Lead”.');
    await k.click(page.getByRole('button', { name: /^Add Lead$/ }), 1200);
    const m = k.modal();
    await k.type(k.byPh('e.g. Al-Barakah', m), 'Pacific Feed Traders');
    await k.say('Type the company name. Then the address: state or province, area or city, and pin code.');
    await k.type(k.byPh('e.g. Warehouse #14', m), 'Plot 18, Al Jurf Industrial Area');
    await k.type(k.byPh('e.g. Dubai, Maharashtra', m), 'Ajman');
    await k.type(k.byPh('e.g. Al Quoz, Mumbai', m), 'Al Jurf');
    await k.type(k.byPh('e.g. Tariq Mansoor', m), 'Omar Haddad');
    await k.say('Add the contact person and the phone number with country code. The same number works for WhatsApp and Zalo.');
    await k.type(m.locator('input[type="tel"]').first(), '50 765 4321');
    const products = m.locator('#form-sec-products');
    await k.spot(products, 'Pick the products the buyer wants. You can choose more than one.');
    await k.click(products.getByText('Corn DDGS', { exact: true }).first(), 500);
    await k.click(products.getByText('Maize', { exact: true }).first(), 500);
    await k.type(k.byPh('e.g. 50', m), '50');
    await k.type(k.byPh('e.g. 50000', m), '15000');
    await k.say('Then the next follow-up date, what you discussed today, and what to do next.');
    await k.type(m.locator('#lead-form-today-remark'), 'Buyer needs 50 MT Corn DDGS every month.');
    await k.type(m.locator('#lead-form-planned-action'), 'Send CIF price and spec sheet');
    await k.click(m.getByRole('button', { name: /Save Export Lead/ }), 2200);
    await k.spot(page.getByText('Pacific Feed Traders').first(), 'The lead is saved and shows in your list. Click it any time to see all details.');
  },

  'bulk-import': async (k) => {
    const { page } = k;
    await k.nav('leads');
    await k.click(page.getByRole('button', { name: /^Bulk Import$/ }), 1200);
    const m = k.modal();
    await k.say('Step 1 shows the format. Every import must use these columns.');
    await k.spot(m.getByRole('button', { name: /Download template/ }), 'Download the template, fill one buyer per row in Excel, and save it as CSV.');
    await k.spot(m.getByText('Rules for each column'), 'The rules tell you what each column accepts, for example products from your own list.');
    await k.click(m.getByRole('button', { name: /My file is ready/ }), 900);
    await k.say('Step 2: choose your filled file. Nothing is imported yet.');
    await m.locator('input[type="file"]').setInputFiles({ name: 'my-buyers.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV_FOR_IMPORT) });
    await k.wait(1200);
    await k.spot(m.getByText('Ready to import').first(), 'Step 3 checks every row before anything is saved.');
    await k.spot(m.getByText(/Not in your product list/).first(), 'A row that breaks a rule is shown in red with the reason, and it is left out.');
    const assignee = page.locator('#bulk-import-assignee');
    await k.spot(assignee, 'Choose who gets these leads. One file goes to one person.');
    await k.point(m.locator('button[aria-label="Why?"]'));
    await m.locator('button[aria-label="Why?"]').click();
    await k.say('Why one person? So no lead lands with the wrong staff. For different staff, make one file per person.', 5200);
    await page.locator('button[aria-label="Why?"]').click(); // tap again to close the tip (a click outside would close the window)
    await k.click(assignee, 400);
    await assignee.selectOption({ label: 'Priya Sharma' });
    await k.wait(900);
    await k.say('Staff can import too. Their leads always go to themselves.');
    await k.click(m.locator('#bulk-import-run'), 3000);
    await k.spot(m.getByText(/leads? imported/).first(), 'Done. Three leads were imported and assigned to Priya.');
  },

  'remark-enter': async (k) => {
    const { page } = k;
    await k.nav('leads');
    await k.say('To update a lead, press Edit on its row.');
    await k.click(page.locator('main').getByRole('button', { name: /^Edit$/ }).first(), 1300);
    const m = k.modal();
    const today = m.locator('#lead-form-today-remark');
    await k.spot(today, 'Write what you discussed today in the remark box.');
    await k.type(today, 'Buyer agreed to the sample price.');
    await k.say('Press Enter. Only the remark is saved, and the form stays open.');
    await today.press('Enter');
    await k.wait(1800);
    await k.spot(m.getByText('Buyer agreed to the sample price.').first(), 'It appears in the remark history straight away, with your name and the time.');
    await k.say('Need a new line inside the remark? Use Shift + Enter.');
    await k.spot(m.getByRole('button', { name: /Update Lead Specifications/ }), 'Changes to other details, like the stage or address, are saved only with the Update button.');
  },

  'follow-up': async (k) => {
    const { page } = k;
    await k.nav('followup');
    await k.say('Follow up lists every buyer by their next follow-up date.');
    await k.spot(page.getByRole('button', { name: /^Overdue/ }), 'Overdue shows the follow-ups you missed. Clear these first.');
    await k.click(page.getByRole('button', { name: /^Overdue/ }), 1200);
    await k.spot(page.getByRole('button', { name: /Log Action/ }).first(), 'After the call, press “Log Action”.');
    await k.click(page.getByRole('button', { name: /Log Action/ }).first(), 1200);
    const m = k.modal();
    await k.type(k.byPh('e.g. Called customer today', m), 'Called Nimal. He received the lab report.');
    await k.type(k.byPh('e.g. Call back buyer', m), 'Send final CIF price');
    await k.say('Write what was discussed, the next action, and pick the next date and time.');
    await k.click(m.getByRole('button', { name: /Save Follow-up/ }), 1800);
    await k.say('Saved. The buyer moves to the new date and the remark is kept in the history.');
  },

  tasks: async (k) => {
    const { page } = k;
    await k.nav('tasks');
    await k.spot(page.getByRole('button', { name: /^Overdue/ }), 'Filters show what is overdue, due soon or done.');
    await k.click(page.getByRole('button', { name: /Assign New Task/ }), 1200);
    const m = k.modal();
    await k.type(k.byPh('e.g. Follow up with Al-Barakah', m), 'Send Corn DDGS samples to Saigon Feed Mill');
    await k.type(k.byPh('Operational instructions', m), 'Courier by Friday. Share the tracking number on WhatsApp.');
    const who = m.locator('select').filter({ has: page.locator('option', { hasText: 'Priya Sharma' }) }).first();
    await k.spot(who, 'Choose the staff member and the due date.');
    await who.selectOption({ label: /Priya Sharma/ }).catch(async () => {
      const opt = await who.locator('option', { hasText: 'Priya Sharma' }).first().getAttribute('value');
      await who.selectOption(opt);
    });
    await k.wait(700);
    await k.click(m.getByRole('button', { name: /Assign Task/ }).last(), 1800);
    await k.say('Priya gets a reminder in her bell, and the owner sees when it is done or late.');
  },

  activity: async (k) => {
    const { page } = k;
    await k.nav('activity');
    await k.say('Activity shows all your leads on one board, one column per stage.');
    await k.spot(page.getByRole('button', { name: /^Idle Critical/ }), 'These chips show which buyers are active, idle or at risk.');
    await k.click(page.getByText('Thathsara Enterprises').first(), 1500);
    const m = k.modal();
    await k.say('Click a lead to open it. Scroll down to Daily Activity.');
    await k.click(m.getByRole('button', { name: /^WhatsApp text\/Zalo$/ }), 600);
    const note = k.byPh('Write what happened', m);
    await k.type(note, 'Sent price on WhatsApp. Buyer replied OK.');
    await k.say('Tick what you did, write a short note and press Enter.');
    await note.press('Enter');
    await k.wait(1800);
    await k.spot(m.getByText(/ACTIVITY HISTORY/).first(), 'It is saved in the activity history with your name and time. Outreach counts it too.');
  },

  outreach: async (k) => {
    const { page } = k;
    await k.nav('outreach');
    await k.say('Outreach counts every call, email and WhatsApp / Zalo message, per person and per day.');
    await k.spot(page.locator('main table').first(), 'Each row is one person on one day. The owner sees the whole team.');
    await k.spot(page.getByRole('button', { name: /^Today$/ }).first(), 'Use these buttons to see today, the last 7 days or this month.');
    await k.spot(page.getByRole('button', { name: /^View$/ }).first(), 'Press View to see exactly which buyers were contacted.');
  },

  'my-days': async (k) => {
    const { page } = k;
    await k.nav('mydays');
    await k.say('My Days is your planner and the daily report.');
    await k.click(page.getByRole('button', { name: /Log Day Report/ }), 1200);
    const m = k.modal();
    await k.type(k.byPh('Key accomplishments', m), 'Called 6 buyers, sent 2 quotations, 1 sample dispatched.');
    await k.say('Write a short summary of the day. You can add the buyers you worked on below it.');
    await k.click(m.getByRole('button', { name: /Save Daily Report/ }), 1800);
    await k.say('The owner sees every report here and in Team Review.');
  },

  analytics: async (k) => {
    const { page } = k;
    await k.nav('analytics');
    await k.say('Analytics turns your leads into numbers.');
    await k.spot(page.getByText('Sales Pipeline Stage Funnel', { exact: false }).first(), 'The funnel shows how much deal value is in each stage.');
    await k.spot(page.getByText('Commodity Demand', { exact: false }).first(), 'Which products buyers ask for, and how much volume.');
    await k.spot(page.getByText('Global Export Destinations', { exact: false }).first(), 'Which countries your buyers come from.');
    await k.spot(page.getByText('Sales Representative Order Book', { exact: false }).first(), 'And each person’s order book. Staff see only their own numbers.');
  },

  'team-review': async (k) => {
    const { page } = k;
    await k.nav('review');
    await k.say('Team Review is where the owner checks the day.');
    await k.spot(page.locator('main h2').first(), 'The daily report lists calls, remarks, follow-ups done and missed, per person.');
    await k.spot(page.getByRole('button', { name: /^Yesterday$/ }), 'Look back at yesterday or any earlier day.');
    await k.click(page.getByRole('button', { name: /^Performance$/ }), 1500);
    await k.say('Performance shows tasks on time or late, and follow-ups done, missed or moved.');
  },

  'create-staff': async (k) => {
    const { page } = k;
    await k.click(k.vis('[data-tour="create-staff"]'), 1300);
    const m = k.modal();
    await k.say('Here the owner sees all staff and adds new ones.');
    await k.click(page.getByRole('button', { name: /Add New Staff/ }).first(), 1000);
    await k.type(k.byPh('e.g. Ramesh Kumar', m), 'Meera Iyer');
    await k.type(k.byPh('e.g. ramesh@', m), 'meera.demo@example.com');
    await k.type(k.byPh('Min 6 characters', m), 'Meera#2026');
    await k.say('Give a name, a login email and a password. Share the login with your staff member.');
    await k.spot(m.getByText('Access Permissions', { exact: false }).first(), 'Choose which sections they can open and whose leads they can see.');
    await k.click(m.getByRole('button', { name: /Create Staff Account/ }), 2000);
    await k.say('Done. Meera can log in now. You can change permissions or reset the password any time.');
  },

  // Placed here so the scene object stays a plain function
  'products-specs': async (k) => {
    const { page } = k;
    await k.nav('leads');
    await k.click(page.getByRole('button', { name: /^Add Lead$/ }), 1200);
    const m = k.modal();
    const products = m.locator('#form-sec-products');
    await k.spot(products, 'Your product list is the same for the whole company, on every device.');
    await k.click(products.getByRole('button', { name: /Add Other Commodity/ }), 700);
    await k.type(k.byPh('Enter commodity/product name', m), 'Basmati Rice');
    await k.click(m.getByRole('button', { name: /Add & Select/ }), 1200);
    await k.say('Basmati Rice is added for everyone. Only the owner can add or remove products.');
    await k.click(m.getByRole('button', { name: /^Cancel$/ }).last(), 900);
    await k.nav('activity');
    await k.click(page.getByText('Thathsara Enterprises').first(), 1500);
    const pop = k.modal();
    await k.spot(pop.getByText('Product specifications').first(), 'Specifications are your own fields, like Protein % or Moisture %.');
    page.__answer = 'Fibre %';
    await k.click(pop.getByRole('button', { name: /Add specification/ }), 1200);
    await k.spot(pop.getByText('Fibre %', { exact: true }).first(), 'Type the name and press OK. The new field appears on every lead for your team.');
  },

  storage: async (k) => {
    const { page } = k;
    await k.spot(k.vis('[data-tour="storage"]'), 'The storage bar shows how much of your company limit is used.');
    await k.click(k.vis('[data-tour="storage"] button'), 1500);
    const m = k.modal();
    await k.spot(m.getByText('Whole company').first(), 'At the top, your whole company.');
    await k.spot(m.getByText('Priya Sharma').first(), 'Below, each person: how much they use and how many leads, remarks and tasks they have.');
    await k.say('When the limit is full, nobody can save new data. Ask the platform admin to raise it before that.');
  },

  'help-support': async (k) => {
    const { page } = k;
    await k.nav('support');
    const search = page.locator('input[placeholder^="Search videos"]');
    await k.spot(search, 'Type your problem in your own words.');
    await k.type(search, 'import');
    await k.wait(900);
    await k.say('Matching videos and guide sections appear right away.');
    await search.fill('');
    await k.click(page.getByRole('button', { name: /^Ask AI$/ }).first(), 1000);
    await k.say('Ask AI answers “how do I…” questions about the CRM.');
    await k.click(page.getByRole('button', { name: /^Tickets/ }), 1000);
    await k.spot(page.getByRole('button', { name: /New ticket/ }), 'Still stuck? Raise a ticket. The reply comes to your bell.');
  },
};

// A new company may have only 2 staff seats: record "create staff" with one staff member so a seat is free
SCENES['create-staff'].seed = { oneStaff: true };
