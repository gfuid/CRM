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
  'email-setup': async (k) => {
    const { page } = k;
    // The demo has no real mailbox: the test email step is answered locally, exactly as a working Gmail answers
    await page.route('**/api/v1/email/settings/test', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { to: 'rahul.novaagro@gmail.com' }, message: 'Test email sent' }) }));
    await k.nav('email');
    await k.say('Email Marketing sends your campaigns from your own mailbox, so buyers reply straight to you. You connect it once.');
    const form = page.locator('[data-sender-setup]');
    await k.type(form.locator('input[type="email"]').first(), 'rahul.novaagro@gmail.com');
    await k.spot(form.getByRole('radiogroup', { name: 'Email provider' }), 'Type your email address. The CRM picks Gmail, Outlook, Yahoo or Zoho by itself.');
    await k.spot(form.locator('li').nth(1), 'Gmail and Outlook need an “app password”: a special password only for the CRM. Your normal password is never used.');
    await k.spot(form.locator('[data-app-password-link]'), 'This button opens Google’s App passwords page. Turn on 2-Step Verification first if Google asks.');
    await k.say('On that page, type a name such as “Travel-Trade CRM”, press Create, and copy the 16-letter password Google shows.');
    await k.type(form.getByLabel('App password'), 'abcd efgh ijkl mnop');
    await k.say('Paste it here. Spaces do not matter. It is stored encrypted and never shown again.');
    await k.click(form.getByRole('button', { name: /Save & send test email/ }), 1800);
    await k.spot(form.locator('text=Connected!').first(), 'The CRM sends you a test email. When you see “Connected”, you are ready.');
    await k.click(page.getByRole('button', { name: /Advanced/ }).first(), 900);
    await k.spot(page.locator('#email-daily-limit'), 'Under Advanced you can set the daily limit. Leave it blank for the safe default: about 450 a day for Gmail.');
    await k.say('If you send more than your provider allows, the mailbox can be blocked for a day. The CRM stops at the limit and continues the next day by itself.');
  },

  'email-campaign': async (k) => {
    const { page } = k;
    await k.nav('email');
    await page.waitForSelector('[data-email-dashboard]');
    await k.spot(page.locator('#email-limit-used'), 'The dashboard first shows today’s limit: how many emails went out in the last 24 hours, and how many are left.');
    await k.spot(page.locator('[data-stat="sent"]').locator('..'), 'Then the results: sent, opened, clicked a link, failed, and unsubscribed.');
    await k.spot(page.locator('[data-recent-activity]'), 'Here you see which buyer opened your email or clicked a link. Call them while they are interested.');
    await k.click(page.getByRole('tab', { name: /New Campaign/ }), 1200);
    await k.spot(page.locator('[data-template-strip]'), 'To write a campaign, start from one of your templates, or write a new email.');
    await k.click(page.locator('[data-template-strip]').getByRole('button', { name: /Turmeric price list/ }), 1200);
    await k.type(k.byPh('October turmeric offer'), 'Turmeric offer – November');
    await k.say('Words in double curly brackets, like company name, are filled in for each buyer.');
    const byTags = page.getByRole('button', { name: /^By tags$/ });
    await k.click(byTags, 900);
    await k.click(page.getByRole('button', { name: /turmeric-buyer/ }).first(), 1200);
    await k.say('Pick who gets it by tag. Here, every lead tagged “turmeric-buyer”. Tags are added on the lead form, or for a whole file in Bulk Import.');
    const send = page.getByRole('button', { name: /^Send to \d+ now$/ });
    await k.spot(send, 'Press “Test to me” first if you want to check it. Then send now, or schedule it for later.');
    await k.click(send, 3500);
    await k.click(page.getByRole('tab', { name: /^Campaigns/ }), 1500);
    await k.spot(page.locator('[data-campaign]').nth(1), 'Each campaign shows how many were sent, opened and clicked. Open “Recipients” to see every buyer.');
    await k.nav('leads');
    await k.click(page.locator('#leads-filter-tag'), 500);
    await page.selectOption('#leads-filter-tag', 'turmeric-buyer');
    await k.wait(900);
    await k.spot(page.locator('#leads-filter-tag'), 'In Leads, filter by a tag to see exactly the buyers in that list.');
    await k.click(page.getByText('Al-Zahra Trading LLC').first(), 1800);
    await k.spot(page.locator('[data-lead-email-history]'), 'Inside a lead you see every marketing email it got, and whether it was opened or clicked.');
  },

  /* ---------------- WhatsApp Marketing (local fake Meta API) ---------------- */
  'whatsapp-setup': async (k) => {
    const { page } = k;
    await k.nav('whatsapp');
    await page.waitForSelector('[data-wa-setup]');
    await k.say('WhatsApp Marketing uses the official WhatsApp Business API from Meta. You connect your own business number once.');
    await k.spot(page.locator('[data-wa-setup] ol').first(), 'Do these steps on Meta’s website first. The PDF guide in Help & Support shows every click with pictures.');
    await k.say('Step 1: in business.facebook.com, open WhatsApp Manager and add a number that is NOT used in the normal WhatsApp app.');
    await k.say('Step 2: in developers.facebook.com, create an app of type Business and add the WhatsApp product.');
    await k.type(page.getByLabel('Phone number ID'), '109876543210987');
    await k.type(page.getByLabel('WhatsApp Business Account ID'), '102345678901234');
    await k.say('Step 3: from WhatsApp, API Setup, copy the Phone number ID and the WhatsApp Business Account ID, and paste them here.');
    await k.type(page.getByLabel('Access token'), 'EAAG-demo-permanent-token');
    await k.say('Step 4: in Business Settings, System users, make a permanent access token with the two WhatsApp permissions. Paste it here. It is stored encrypted.');
    await k.type(page.getByPlaceholder('optional').first(), '123456789012345');
    await k.type(page.locator('[data-wa-setup] input[type="password"]').nth(1), 'demo-app-secret');
    await k.say('The App ID is needed for templates with a picture. The App secret, from App settings, Basic, proves that updates really come from Meta.');
    await k.click(page.getByRole('button', { name: /Save & check connection/ }), 2200);
    await k.spot(page.locator('[data-wa-setup] span', { hasText: 'Connected' }).first(), 'The CRM checks the number with Meta. Connected shows your number and business name.');
    const hook = page.getByText('Webhook (delivery ticks and buyers\' replies)').locator('..');
    await k.spot(hook, 'Step 5: copy this Callback URL and Verify token into your Meta app, WhatsApp, Configuration. Press Verify and save, then subscribe to “messages”.');
    await k.say('Without the webhook you can still send, but you will not see delivered and read ticks or the buyers’ replies.');
    await k.spot(page.locator('[data-wa-rates]'), 'Step 6: add a payment method in WhatsApp Manager. Meta bills you directly. Type Meta’s price per message here, so the CRM can estimate each broadcast.');
  },

  'whatsapp-broadcast': async (k) => {
    const { page } = k;
    await k.nav('whatsapp');
    await page.waitForSelector('[data-wa-dashboard]');
    await k.spot(page.locator('[data-wa-dashboard]'), 'The dashboard shows today’s messages, your daily limit from Meta, and how many were delivered, read and replied.');
    await k.click(page.getByRole('tab', { name: /Templates/ }), 1200);
    await k.say('WhatsApp lets a business start a chat only with an approved template. Here are yours.');
    await k.click(page.getByRole('button', { name: /New template/ }), 1200);
    const ed = page.locator('[data-wa-template-editor]');
    await k.type(ed.getByLabel('Template name'), 'maize_offer');
    await k.type(ed.getByLabel('Template message'), 'Hello {{1}}, we have fresh {{2}} for loading this month. Reply PRICE for our CIF price.');
    await k.say('Write the message. {{1}} and {{2}} are filled for each buyer, for example the contact name and the product.');
    await k.spot(ed, 'Add a title or a picture, a footer, and up to three buttons. The preview shows how it looks on the phone.');
    await k.say('Press Send for approval. Meta usually approves in a few minutes. Then press Sync from WhatsApp to update the status.');
    await k.click(ed.getByRole('button', { name: /Cancel/ }).first(), 900);
    await k.click(page.getByRole('tab', { name: /New broadcast/ }), 1400);
    const nb = page.locator('[data-wa-new-broadcast]');
    await k.type(nb.locator('input').first(), 'Turmeric offer – December');
    await k.spot(nb.getByLabel('Template'), 'Choose an approved template. This one has a picture and two buttons.');
    await k.say('For each {{ }} choose what goes in: the buyer’s contact name, company, product, or the same text for everyone.');
    await k.click(nb.getByRole('button', { name: /turmeric-buyer/ }).first(), 1200);
    await k.spot(nb.locator('[data-wa-audience-count]'), 'Pick buyers by tag, all leads, or paste numbers. The CRM counts the numbers and estimates the cost from your rates.');
    await k.spot(page.locator('[data-wa-preview]').first(), 'This is exactly what the buyers will see.');
    await k.say('Send now, or Schedule for a time that suits the buyers. Buyers who replied STOP are left out by themselves.');
    await k.click(page.getByRole('tab', { name: /Broadcasts/ }), 1400);
    await k.spot(page.locator('[data-wa-campaign]').first(), 'Every broadcast shows sent, delivered, read, replied and failed. Open Numbers to see each buyer and the reason a message failed.');
  },

  'whatsapp-chats': async (k) => {
    const { page } = k;
    await k.nav('whatsapp');
    await k.click(page.getByRole('tab', { name: /Chats/ }), 1500);
    await k.say('When buyers reply, their messages come here, linked to the lead with the same number.');
    await k.click(page.locator('[data-wa-chat]').first(), 1500);
    await k.spot(page.locator('[data-wa-thread]'), 'You see the whole conversation: your template, the buyer’s replies and the automatic replies.');
    await k.type(page.getByLabel('Message'), 'Hello Ahmed, CIF Jebel Ali is USD 1,450 per MT. Shall I send a sample?');
    await k.say('Within 24 hours of the buyer’s last message you can type freely. After that, WhatsApp only allows a template again.');
    await k.click(page.getByLabel('Send'), 1500);
    await k.click(page.getByRole('tab', { name: /Automation/ }), 1500);
    await k.spot(page.locator('[data-wa-automation]'), 'Automation answers for you: a welcome message for a new chat, and replies to keywords like price or catalogue.');
    await k.spot(page.locator('[data-wa-rule]').nth(1), 'This rule sends the price list link whenever a buyer writes “price” or “rate”.');
    await k.say('If a buyer writes STOP, the CRM marks them opted out and never sends them a broadcast again.');
  },

  /* ---------------- AI Calling (local fake ElevenLabs) ---------------- */
  'ai-calling-setup': async (k) => {
    const { page } = k;
    await k.nav('aicalls');
    await page.waitForSelector('[data-ai-setup]');
    await k.say('AI Calling: an AI sales agent from ElevenLabs calls your buyers from your own phone number and writes the result into the CRM.');
    await k.spot(page.locator('[data-ai-setup] ol').first(), 'You need two accounts: ElevenLabs for the AI voice, and a phone number from Vobiz in India, or Twilio, Telnyx or Plivo abroad.');
    await k.say('In ElevenLabs, create an agent and copy its Agent ID. Then, under Profile, API keys, create a key.');
    await k.say('In Vobiz, buy a number and make an outbound SIP trunk. In ElevenLabs, Phone numbers, import that number from the SIP trunk.');
    await k.type(page.getByLabel('ElevenLabs API key'), 'sk_demo_key_1234567890');
    await k.type(page.getByLabel('Agent ID'), 'agent_demo_nova');
    await k.click(page.locator('[data-ai-setup]').getByRole('button', { name: /Save/ }).first(), 2200);
    await k.spot(page.locator('[data-ai-numbers]'), 'After saving, the numbers in your ElevenLabs account appear. Choose the number to call from, and a different one for some countries if you like.');
    await k.say('Calling hours are in each buyer’s own time, so a buyer in Dubai is called in Dubai office hours. Set tries and the gap between tries.');
    await k.spot(page.locator('[data-ai-rates]'), 'Type the per-minute prices of ElevenLabs and your phone provider. The CRM shows the cost of every call and campaign.');
    await k.click(page.locator('[data-ai-numbers]').getByRole('button', { name: /Save/ }).last(), 1500);
    const sc = page.locator('[data-ai-script]');
    await k.type(sc.locator('input').first(), 'Nova Agro Exports, an Indian exporter of turmeric and maize.');
    await k.type(sc.locator('textarea').first(), 'Turmeric finger, curcumin 3%+, 25 kg bags, 20 MT per container.');
    await k.spot(sc, 'Write the sales script in simple words: who you are, what you sell, and the goal of the call. The CRM writes the full instructions for the agent.');
    await k.say('The agent always says it is an AI assistant, never invents prices, and stops if the buyer asks not to be called.');
    await k.click(sc.getByRole('button', { name: /Save script/ }), 2000);
    await k.say('Before calling buyers, use Test call to me to hear the agent on your own phone.');
  },

  'ai-calling-campaign': async (k) => {
    const { page } = k;
    await k.nav('aicalls');
    await page.waitForSelector('[data-ai-dashboard]');
    await k.spot(page.locator('[data-ai-dashboard]'), 'The dashboard shows calls made, answered, interested buyers, minutes and cost.');
    await k.click(page.getByRole('tab', { name: /Campaigns/ }), 1400);
    await k.click(page.getByRole('button', { name: /New campaign/ }), 1200);
    const nc = page.locator('[data-ai-new-campaign]');
    await k.type(nc.getByLabel('Campaign name'), 'Kenya and Bangladesh – follow up');
    await k.click(nc.getByRole('button', { name: /old-list/ }).first(), 1200);
    await k.spot(nc.locator('[data-ai-audience]'), 'Pick buyers by tag, all leads, or paste numbers. You see how many will be called and the estimated cost.');
    await k.say('Press Start calling. The CRM calls each buyer in their office hours and tries again if nobody answers.');
    await k.click(nc.getByLabel('Close'), 900);
    await k.spot(page.locator('[data-ai-campaign]').first(), 'This campaign has finished: one buyer is interested, one is not, one did not answer.');
    await k.click(page.getByRole('tab', { name: /Calls/ }), 1500);
    await k.spot(page.locator('[data-ai-calls]'), 'Every call with its result: interested, call back, not interested or no answer.');
    await k.click(page.locator('[data-ai-call]', { hasText: 'Interested' }).first(), 1800);
    await k.spot(page.locator('[data-ai-call-detail]').first(), 'Open a call to read the summary, the details the AI collected, like quantity and email, and the full conversation.');
    await k.spot(page.getByRole('button', { name: /Play recording/ }).first(), 'Press Play recording to listen to the whole call.');
    await k.say('The result is written on the lead too: interested buyers get a remark and a follow-up, so your team calls them next.');
  },
};

// A new company may have only 2 staff seats: record "create staff" with one staff member so a seat is free
SCENES['create-staff'].seed = { oneStaff: true };
SCENES['email-setup'].seed = { email: 'setup' };
SCENES['email-campaign'].seed = { email: 'campaign' };
SCENES['whatsapp-setup'].seed = { wa: 'setup' };
SCENES['whatsapp-broadcast'].seed = { wa: 'full' };
SCENES['whatsapp-chats'].seed = { wa: 'full' };
SCENES['ai-calling-setup'].seed = { ai: 'setup' };
SCENES['ai-calling-campaign'].seed = { ai: 'full' };
