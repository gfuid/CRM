// In-app help content: what each section does, how it works, and what to check when something looks wrong.
// Keep this in step with the backend assistant's PRODUCT_GUIDE (backend/src/services/assistant.service.js).

export const HELP_VIDEO_URL = '/videos/crm-walkthrough.mp4';
export const HELP_VIDEO_POSTER = '/videos/crm-walkthrough.jpg';

/** Which sections a user may open (owner: all; staff: what their owner switched on). */
export const canSeeTab = (isStaff, perms, tab) => {
  if (!isStaff) return true;
  const p = perms || {};
  if (tab === 'analytics') return Boolean(p.view_analytics);
  if (tab === 'leads') return p.view_leads !== false;
  if (tab === 'tasks') return Boolean(p.view_tasks);
  if (tab === 'activity') return Boolean(p.view_activity);
  if (tab === 'outreach') return Boolean(p.view_outreach);
  if (tab === 'mydays') return Boolean(p.view_mydays);
  if (tab === 'followup') return Boolean(p.view_followup);
  if (tab === 'email') return false;
  return true;
};

// roles: which users see the section ('owner', 'staff' or both)
export const HELP_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting started',
    roles: ['owner', 'staff'],
    summary: 'How the CRM is organised, who can do what, and the daily routine that keeps every buyer moving.',
    how: [
      'Each company has one Owner account and a few Staff accounts. Every company’s data is completely separate — nobody outside your company can see your buyers.',
      'The left menu (bottom bar on phone) holds every section. Staff only see the sections their owner switched on for them.',
      'A buyer enquiry is a “Lead”. Every lead has a stage, an assignee, a next follow-up date and a remark history that can never be erased.',
      'The bell at the top shows reminders: overdue tasks, missed follow-ups, today’s calls and messages from your owner or the support team.',
    ],
    steps: [
      'Owner: create your staff (left menu → “+ Create Staff”).',
      'Add your buyers in Leads (or import a CSV) and assign them.',
      'Every day: open Follow up, call the buyers due today, write what was discussed and set the next date.',
      'Owner: check Team Review → Daily Report every evening.',
    ],
    issues: [
      { q: 'I can’t see a section my colleague has', a: 'Staff only see sections the owner allowed. Ask your owner to open “+ Create Staff” → your name → Permissions and switch it on. Log out and in again after the change.' },
      { q: 'The tour disappeared and I want to see it again', a: 'Help & Support → Guide → “Replay tour”.' },
    ],
  },
  {
    id: 'leads',
    tab: 'leads',
    title: 'Leads',
    roles: ['owner', 'staff'],
    summary: 'Your list of buyers and enquiries — company, country, product, quantity, deal value, contacts and the full remark history.',
    how: [
      '“Add Lead” opens the form: company, country, product, quantity + unit, deal value (USD), contact person, phone (with country code), email, Incoterm, port, payment terms and assignee.',
      '“Today’s remark” and “Planned action” are required on save. Every remark is stored with the author and time and can never be deleted — this is your audit trail.',
      'Stages: Lead Generation → Contact Established → Requirement Understood → Sample Sent → Quotation Sent → Negotiation → Closed Won / Closed Lost. Only the owner can mark Won or Lost.',
      '“Created by” never changes. When the owner reassigns a lead it shows “→ Assigned: <name>”.',
      'Every lead shows “Last contact: N days ago”. After 7 days with no remark, call or completed follow-up it turns red and the page shows a banner with “Show only these”.',
      'Bulk Import takes a CSV file. Export CSV is owner-only.',
    ],
    steps: [
      'Click “Add Lead”, fill the buyer details, write today’s remark and planned action, then Save.',
      'Click “View” on a row to open the full lead: details, remark history, follow-up and documents.',
      'Use the search, country, stage and staff filters at the top to narrow the list.',
    ],
    issues: [
      { q: '“A lead with this company name already exists”', a: 'The same company is already in your list. Search for it first. If it is really a different buyer, confirm the duplicate when asked.' },
      { q: 'Staff: I can’t edit the price / value / company details', a: 'By design only the owner can change lead details, value and assignee. Write a remark or send a correction request to your owner.' },
      { q: 'A lead disappeared from my list (staff)', a: 'The owner probably reassigned it. With “Own only” data scope you only see leads assigned to you. Ask your owner.' },
      { q: 'Save button shows an error', a: 'Check the red message under the form — usually today’s remark or planned action is empty, or the phone number is incomplete.' },
    ],
  },
  {
    id: 'followup',
    tab: 'followup',
    title: 'Follow up',
    roles: ['owner', 'staff'],
    summary: 'Every buyer that needs a call or message, by date. Missed dates show as Overdue.',
    how: [
      'Each lead carries a next follow-up date and time. This page lists them so nothing is forgotten.',
      '“Log Action” records what happened today (remark), the planned next step and the next follow-up date.',
      'Moving a follow-up to another date asks for a reason; closing one asks for the outcome. Both are kept in history.',
      'Past dates are marked Missed/Overdue and also appear in the owner’s Daily Report.',
    ],
    steps: [
      'Open Follow up every morning.',
      'For each buyer: call or message, then click “Log Action”.',
      'Write what was discussed, the planned action and the next date — Save.',
    ],
    issues: [
      { q: 'A follow-up still shows Overdue after I called', a: 'The call is only counted when you log it. Click “Log Action”, write the remark and set a new date.' },
      { q: 'The time looks wrong', a: 'Times use your device clock and time zone. Check your phone/laptop time zone setting.' },
    ],
  },
  {
    id: 'tasks',
    tab: 'tasks',
    title: 'Task Management',
    roles: ['owner', 'staff'],
    summary: 'Work the owner assigns to staff, with priority, due date and deadline time.',
    how: [
      'Owner: “Assign New Task” → title, description, team member, priority, due date and deadline time.',
      'Staff move a task Pending → In Progress → Completed and add completion notes. The completion time is recorded, so the owner sees on time vs late.',
      'Staff can add personal to-dos for themselves only, and cannot change deadlines. If something is wrong they use “Request correction”.',
      'The number on the menu shows open tasks.',
    ],
    steps: [
      'Owner: Assign New Task → pick the person → set deadline → Save.',
      'Staff: open the task → In Progress → when done, Completed with a short note.',
    ],
    issues: [
      { q: 'Staff: I can’t change the deadline', a: 'Only the owner can. Use “Request correction” with the reason.' },
      { q: 'Task shows Late although I finished it', a: 'It was marked Completed after the deadline time. Mark tasks completed as soon as the work is done.' },
    ],
  },
  {
    id: 'activity',
    tab: 'activity',
    title: 'Activity',
    roles: ['owner', 'staff'],
    summary: 'A board of all leads by follow-up health: Missed, Idle Critical, At risk and Active.',
    how: [
      'Coloured chips at the top count leads by follow-up status. Click one to show only those leads.',
      'Filter by country, market, lead status or responsible person.',
      'Open any card to read the history and add a remark without leaving the page.',
    ],
    steps: ['Click “Missed Follow-up” first — those buyers need a call today.', 'Then work through “Idle Critical”.'],
    issues: [{ q: 'The board is empty', a: 'Clear the filters at the top (country / status / person). Staff with “Own only” scope see only their own leads.' }],
  },
  {
    id: 'outreach',
    tab: 'outreach',
    title: 'Outreach',
    roles: ['owner', 'staff'],
    summary: 'Daily outreach numbers per person — calls, emails, WhatsApp, LinkedIn, meetings, samples and price discussions.',
    how: [
      'Every logged interaction is counted by type and person.',
      'Use it to see who is actually reaching buyers each day.',
    ],
    steps: ['Pick a date range and person at the top.', 'Click a lead to preview its details.'],
    issues: [{ q: 'My calls are not counted', a: 'Only interactions logged in the CRM (remark / Log Action) are counted. Log every call.' }],
  },
  {
    id: 'mydays',
    tab: 'mydays',
    title: 'My Days',
    roles: ['owner', 'staff'],
    summary: 'Your personal daily plan and end-of-day record of the accounts and tasks you worked on.',
    how: ['Normal View lists everything logged on a day; Calendar View shows the month.', 'Owners can also open the team’s daily reports here.'],
    steps: ['Start the day by checking today’s plan.', 'At the end of the day, review what was logged.'],
    issues: [{ q: 'A day looks empty', a: 'Only work logged in the CRM appears. Remarks, follow-ups and tasks completed that day show here.' }],
  },
  {
    id: 'analytics',
    tab: 'analytics',
    title: 'Analytics',
    roles: ['owner', 'staff'],
    summary: 'Pipeline value, number of enquiries, deals won, trade volume and trends over time.',
    how: [
      'Cards at the top: total inquiries, active pipeline, closed won and total trade volume.',
      'Switch 1M / 3M / 6M / 1Y or pick a date range. Insights and Calendar View show the same data two ways.',
      'Staff see “My Analytics” — only their own numbers.',
      'Export CSV downloads the numbers.',
    ],
    steps: ['Pick the time range.', 'Hover a chart point to see the exact value.'],
    issues: [{ q: 'Numbers look lower than expected', a: 'Check the time range (top right). Deal value comes from the “deal value” field on each lead — leads without it count as 0.' }],
  },
  {
    id: 'review',
    tab: 'review',
    title: 'Team Review & Daily Report',
    roles: ['owner', 'staff'],
    summary: 'Owner: how each person performed — calls, remarks, follow-ups done and missed, tasks on time. Staff see their own performance.',
    how: [
      'Daily Report: for each person — calls, emails, remarks written, leads added, follow-ups done and missed (with buyer names), tasks done/overdue, and buyers with no contact for 7+ days. Pick any past date.',
      'The same report arrives every evening at 7 PM in the bell (and by email if the mail server is set up).',
      'Performance: tasks on time / late / overdue, follow-ups done / missed / rescheduled and remarks over the last 7, 30 or 90 days.',
      '“Nothing written about the discussion” flags follow-ups closed without a real remark.',
    ],
    steps: ['Owner: open Team Review every evening.', 'Click a person to see the buyers behind each number.'],
    issues: [{ q: 'I didn’t get the 7 PM report', a: 'It appears in the bell after 7 PM. If your staff logged nothing that day the report still shows zeros — open Team Review → Daily Report to check any date.' }],
  },
  {
    id: 'staff',
    title: 'Staff, permissions & storage',
    roles: ['owner'],
    summary: 'Create staff logins, decide what they can see, and keep an eye on your storage.',
    how: [
      '“+ Create Staff” (left menu; “+ Staff” at the top on phone): name, email, password (min 6 characters), role, data scope and section permissions.',
      'Data scope “Own only” = staff sees only leads assigned to them. “All” = sees all company leads but can still update only their own.',
      'Default limit is 2 staff per company. Only the platform team can raise it — raise a ticket.',
      'Deactivating a staff member logs them out immediately. Deleting a staff member keeps their leads with you.',
      'Storage (left menu): each company has a limit (default 50 MB). At 100% new entries are refused until the limit is raised or old records are deleted.',
    ],
    steps: ['Click “+ Create Staff”.', 'Fill the details, choose data scope and sections, Save.', 'Share the email and password with your staff member.'],
    issues: [
      { q: '“A staff member with this email already exists” / email already in use', a: 'That email already has an account (maybe an old owner or staff account). Use another email, or raise a ticket so the platform team can move or free the old account.' },
      { q: '“Staff limit reached”', a: 'Your plan allows 2 staff by default. Raise a ticket to ask for more seats.' },
      { q: '“Storage limit reached”', a: 'Delete old leads/records you no longer need, or raise a ticket to increase storage.' },
      { q: 'Staff says they can’t log in', a: 'Check that the account is Active in “+ Create Staff” → staff list, and reset the password there if needed.' },
    ],
  },
  {
    id: 'email',
    tab: 'email',
    title: 'Email Marketing (premium)',
    roles: ['owner'],
    summary: 'Design emails with pictures, pick buyers by tag, and send now or at a scheduled time — from your own Gmail, Outlook, Yahoo, Zoho or company mailbox.',
    how: [
      'A premium feature switched on by the platform team. Only the owner can use it.',
      'Emails go out from your own mailbox using an “app password” (a special password for apps), so replies come straight to you.',
      'Templates keep a design (text, pictures, buttons, personal fields like {{contact_name}}) for reuse. Pictures are shrunk automatically and count in your company storage.',
      'Scheduled campaigns are sent by the server at the chosen time — your computer can be off.',
      'Every email gets an unsubscribe link; people who unsubscribe are skipped automatically.',
    ],
    steps: [
      'Sender setup: type your email → click the “Open … App Passwords” button → create a password → paste it → “Save & send test email”.',
      'Templates: start from a design or “New template”; add pictures with the 🖼 button, a button, links and fields.',
      'New Campaign: start from a template, choose buyers (tags / all leads / pasted list), then “Send now” or “Schedule for later”.',
      'Campaigns tab: see progress, change the time, cancel a schedule, or retry failed emails.',
    ],
    issues: [
      { q: '“Email Marketing is a premium feature”', a: 'Raise a ticket to ask the platform team to switch it on for your company.' },
      { q: 'Gmail: the App passwords page says it is not available', a: 'Turn on 2-Step Verification in your Google account first (link under the button), then open App passwords again. Work (Google Workspace) accounts may need their admin to allow it.' },
      { q: 'Test fails: “wrong email or app password”', a: 'Your normal password does not work. Create a new app password with the button and paste it again (spaces do not matter).' },
      { q: 'Outlook / Hotmail test fails', a: 'Microsoft is turning off password sign-in for sending mail. Use Gmail, Zoho or your company mailbox instead.' },
      { q: 'A picture will not upload', a: 'Use JPG, PNG, GIF or WebP. Photos are shrunk automatically; GIFs must be under 185 KB. If storage is full, delete old templates or ask the admin for more storage.' },
      { q: 'My scheduled campaign did not go', a: 'Open the Campaigns tab: the reason is shown under the campaign (for example the email connection stopped working). Fix it in Sender setup, then press Send now.' },
      { q: 'Emails land in Spam', a: 'Send to buyers who know you, keep the speed at 10–20 per minute, avoid ALL CAPS subjects, and use a company mailbox with your own domain for large lists.' },
    ],
  },
  {
    id: 'support',
    tab: 'support',
    title: 'Help, AI assistant & tickets',
    roles: ['owner', 'staff'],
    summary: 'Three ways to get help: this guide, the AI assistant, and a support ticket to the platform team.',
    how: [
      'The green chat button (bottom right) is the AI assistant. Ask in Hindi, Hinglish or English — “how do I add staff?”, “which follow-ups are due today?”.',
      'If the assistant can’t solve it, press “Raise a ticket” — your chat is attached so support sees what you already tried.',
      'Tickets → New ticket goes straight to the platform team. Replies show in the ticket and in the bell. Owners also see tickets raised by their staff.',
    ],
    steps: ['Search this guide first.', 'Then ask the AI assistant.', 'Still stuck? Raise a ticket.'],
    issues: [{ q: 'The AI assistant says it is switched off', a: 'The platform team hasn’t turned it on yet. Use a ticket instead.' }],
  },
  {
    id: 'account',
    title: 'Login, session & phone use',
    roles: ['owner', 'staff'],
    summary: 'Signing in, staying signed in, profile, dark mode and using the CRM on a phone.',
    how: [
      'Owners register on the website with “Get Started Free”. Staff do not register — their owner creates their login.',
      'If you are signed out you see “Your session ended. Please log in again.” — just sign in again; nothing is lost.',
      'Your profile (name, phone, photo, password) opens from your name at the top right.',
      'The moon icon switches dark mode. On phone the bottom bar holds the main sections and “More” holds the rest.',
    ],
    steps: ['Bookmark the CRM link on your phone home screen for one-tap access.'],
    issues: [
      { q: '“Your account has been deactivated”', a: 'Your owner switched your account off. Contact your owner.' },
      { q: 'The first load after a while is slow', a: 'The server wakes up on the first request — wait a few seconds, it retries automatically.' },
      { q: 'Forgot password', a: 'Staff: ask your owner to reset it. Owners: raise a ticket or contact the platform team.' },
    ],
  },
];

// Guided tour shown once after first login (skippable). `target` = data-tour attribute; `tab` = page to open.
export const tourSteps = ({ isOwner, canSee }) => [
  { title: 'Welcome to your CRM 👋', body: 'A 1-minute tour of the main sections. You can skip it any time and replay it later from Help & Support → Guide.' },
  canSee('leads') && { target: 'nav-leads', tab: 'leads', title: 'Leads — your buyers', body: 'Every buyer enquiry lives here. “Add Lead” to create one. Every remark you write is saved forever with your name and time.' },
  canSee('followup') && { target: 'nav-followup', tab: 'followup', title: 'Follow up — who to call today', body: 'Buyers due today and overdue. Call, then “Log Action” with what was discussed and the next date.' },
  canSee('tasks') && { target: 'nav-tasks', tab: 'tasks', title: isOwner ? 'Tasks — assign work' : 'My Tasks', body: isOwner ? 'Assign work to staff with a deadline. You see who finished on time and who was late.' : 'Work assigned by your owner. Move it to In Progress, then Completed with a note.' },
  canSee('activity') && { target: 'nav-activity', tab: 'activity', title: 'Activity board', body: 'Leads grouped by follow-up health — Missed, Idle Critical, Active. Start with the red ones.' },
  { target: 'nav-review', tab: 'review', title: isOwner ? 'Team Review & Daily Report' : 'My Performance', body: isOwner ? 'Every evening: calls, remarks, follow-ups done and missed per person. The same report arrives at 7 PM in the bell.' : 'Your follow-ups done, missed and tasks on time.' },
  isOwner && { target: 'create-staff', title: 'Add your team', body: 'Create staff logins and choose exactly which sections and leads each person can see.' },
  isOwner && { target: 'storage', title: 'Storage', body: 'How much of your company’s storage is used.' },
  { target: 'notifications', title: 'Notifications', body: 'Reminders for overdue tasks, missed follow-ups and replies from support.' },
  { target: 'assistant', title: 'Need help?', body: 'Ask the AI assistant anything about the CRM — in Hindi, Hinglish or English. Or open Help & Support for the full guide and video.' },
].filter(Boolean);
