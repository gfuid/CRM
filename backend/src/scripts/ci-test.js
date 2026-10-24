/**
 * CI/CD Automated Test Suite
 * Self-contained test runner for GitHub Actions & local verification.
 * Boots ephemeral test server, runs core endpoint assertions, and exits cleanly.
 */

const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../app');
const config = require('../config/env');
const { dataStore } = require('../repositories/dataStore');

const runCITests = async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const BASE = `http://127.0.0.1:${port}`;

  console.log('======================================================================');
  console.log(`🚀 RUNNING CRM CI/CD AUTOMATED VERIFICATION SUITE`);
  console.log(`📍 Ephemeral Test API Server listening at: ${BASE}`);
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (name, condition, details = '') => {
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${name} ${details ? '— ' + details : ''}`);
    } else {
      failed++;
      console.error(`❌ [FAIL] ${name} ${details ? '— FAILED: ' + details : ''}`);
    }
  };

  try {
    // 1. Healthcheck
    const healthRes = await fetch(`${BASE}/health`);
    const health = await healthRes.json();
    assert('System Healthcheck returns 200 UP', healthRes.status === 200 && health.data?.status === 'UP', `Status: ${health.data?.status}`);

    // 2. Protected routes reject identity headers and forged tokens
    const headerSpoofRes = await fetch(`${BASE}/api/v1/admin/users`, {
      headers: {
        'x-user-id': 'usr_super_admin',
        'x-dev-bypass': 'true',
      },
    });
    assert('Identity headers cannot authenticate protected routes', headerSpoofRes.status === 401);

    const localSessionRes = await fetch(`${BASE}/api/v1/admin/users`, {
      headers: { Authorization: 'Bearer local_session_forged' },
    });
    assert('Local browser session tokens cannot authenticate protected routes', localSessionRes.status === 401);

    const forgedAdminToken = jwt.sign(
      { id: 'usr_super_admin', role: 'admin', username: 'admin' },
      `${config.jwtSecret}-attacker`
    );
    const forgedAdminRes = await fetch(`${BASE}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${forgedAdminToken}` },
    });
    assert('Attacker-signed admin claims are rejected', forgedAdminRes.status === 401);

    const originalAuthConfig = {
      nodeEnv: config.nodeEnv,
      jwtSecret: config.jwtSecret,
      adminPassword: config.adminPassword,
    };
    try {
      config.nodeEnv = 'production';
      config.jwtSecret = 'crm_default_jwt_secret_key_change_in_prod';
      config.adminPassword = 'admin123';
      const defaultSecretToken = jwt.sign({ id: 'usr_super_admin', role: 'admin' }, config.jwtSecret);
      const defaultSecretRes = await fetch(`${BASE}/api/v1/admin/users`, {
        headers: { Authorization: `Bearer ${defaultSecretToken}` },
      });
      assert('Production rejects the default JWT signing secret', defaultSecretRes.status === 503);

      const defaultAdminLoginRes = await fetch(`${BASE}/api/v1/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      });
      assert('Production rejects default administrator credentials', defaultAdminLoginRes.status === 503);
    } finally {
      Object.assign(config, originalAuthConfig);
    }

    // 3. Super Admin Login
    const adminLoginRes = await fetch(`${BASE}/api/v1/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
      }),
    });
    const adminLogin = await adminLoginRes.json();
    assert('Super Admin Login returns JWT', adminLoginRes.status === 200 && !!adminLogin.data?.token, `Token Issued`);
    const adminToken = adminLogin.data?.token;

    // 4. User Registration (Company Owner)
    const uniqueEmail = `ci_owner_${Date.now()}@travel-trade.com`;
    const regRes = await fetch(`${BASE}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'CI Test Owner',
        email: uniqueEmail,
        password: 'Password#2026!',
        company_name: 'CI Agro Global Corp',
        persona: 'owner',
      }),
    });
    const reg = await regRes.json();
    assert('Company Owner Registration returns 201', regRes.status === 201 && reg.success, `Created: ${uniqueEmail}`);
    const ownerToken = reg.data?.token;

    // 5. Owner creates, lists, logs in, and removes a staff member
    const staffEmail = `ci_staff_${Date.now()}@travel-trade.com`;
    const staffRes = await fetch(`${BASE}/api/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'CI Test Staff',
        email: staffEmail,
        password: 'StaffPassword#2026!',
      }),
    });
    const staff = await staffRes.json();
    assert('Owner can create a staff account', staffRes.status === 201 && staff.data?.email === staffEmail);
    assert(
      'Staff creation response never includes plaintext password fields',
      !!staff.data &&
      !['password', 'staff_password', 'plain_password'].some((field) => Object.prototype.hasOwnProperty.call(staff.data, field))
    );

    const staffListRes = await fetch(`${BASE}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const staffList = await staffListRes.json();
    assert(
      'Owner can see the newly created staff account',
      staffListRes.status === 200 && staffList.data?.some((user) => user.email === staffEmail)
    );
    const listedStaff = staffList.data?.find((user) => user.email === staffEmail);
    assert(
      'Staff list response never includes plaintext password fields',
      !!listedStaff &&
      !['password', 'staff_password', 'plain_password'].some((field) => Object.prototype.hasOwnProperty.call(listedStaff, field))
    );

    const staffLoginRes = await fetch(`${BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: staffEmail, password: 'StaffPassword#2026!' }),
    });
    const staffLogin = await staffLoginRes.json();
    assert('Newly created staff can log in with the set password', staffLoginRes.status === 200 && !!staffLogin.data?.token);
    const staffToken = staffLogin.data?.token;

    const observerEmail = `ci_observer_${Date.now()}@travel-trade.com`;
    const observerRes = await fetch(`${BASE}/api/v1/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        name: 'CI Read-Only Staff',
        email: observerEmail,
        password: 'ObserverPassword#2026!',
        permissions: { can_create: false, can_update: false, tasks_assign: false, view_analytics: false, view_mydays: false },
      }),
    });
    const observer = await observerRes.json();
    assert('Owner can create read-only staff with explicit permissions', observerRes.status === 201 && observer.data?.permissions?.can_create === false);
    const observerLoginRes = await fetch(`${BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: observerEmail, password: 'ObserverPassword#2026!' }),
    });
    const observerLogin = await observerLoginRes.json();
    const observerToken = observerLogin.data?.token;
    assert('Read-only staff can log in with restricted permissions', observerLoginRes.status === 200 && !!observerToken);
    const observerAnalyticsRes = await fetch(`${BASE}/api/v1/analytics`, { headers: { Authorization: `Bearer ${observerToken}` } });
    assert('Analytics permission is enforced by the API, not only hidden in the UI', observerAnalyticsRes.status === 403);
    const observerMyDaysRes = await fetch(`${BASE}/api/v1/mydays`, { headers: { Authorization: `Bearer ${observerToken}` } });
    assert('My Days visibility permission is enforced by the API', observerMyDaysRes.status === 403);
    const observerMyDaysCreateRes = await fetch(`${BASE}/api/v1/mydays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${observerToken}` },
      body: JSON.stringify({ task: 'Unauthorized private planner item.' }),
    });
    assert('Restricted staff cannot write My Days items through the API', observerMyDaysCreateRes.status === 403);

    // Duplicate Registration Rejection
    const dupRes = await fetch(`${BASE}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Test',
        email: uniqueEmail,
        password: 'Password#2026!',
      }),
    });
    assert('Duplicate Email Registration is Rejected (409/400)', dupRes.status === 409 || dupRes.status === 400);

    // 6. Create Lead with Dual Remarks (Current vs. Future)
    const followDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    const leadRes = await fetch(`${BASE}/api/v1/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'CI Global Spices FZE',
        contact_person: 'Ahmed Al-Rashid',
        email: 'ahmed@cispices.ae',
        phone: '+971 50 111 2233',
        country: 'United Arab Emirates 🇦🇪',
        products: ['Turmeric', 'Ginger'],
        quantity: 25000,
        price: 2.4,
        value: 60000,
        stage: 'Requirement Understood',
        follow_up_date: followDate,
        today_remarks: 'Discussed 25 MT double-polish turmeric specs on today call.',
        next_follow_up_action: 'Share proforma invoice with 3.5% curcumin lab report.',
      }),
    });
    const leadData = await leadRes.json();
    assert(
      'Create Lead with Dual Remarks & Follow-Up Date',
      leadRes.status === 201 && leadData.data?.today_remarks?.includes('Discussed 25 MT') && leadData.data?.next_follow_up_action?.includes('Share proforma invoice'),
      `Lead ID: ${leadData.data?.id}`
    );
    const leadId = leadData.data?.id;

    const staffLeadRes = await fetch(`${BASE}/api/v1/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        name: 'CI Staff-Created Buyer',
        contact_person: 'Sam Staff',
        email: 'sam@staff-buyer.example',
        country: 'India',
        follow_up_date: followDate,
        today_remarks: 'Initial qualification call completed.',
        next_follow_up_action: 'Send product catalogue.',
      }),
    });
    const staffLead = await staffLeadRes.json();
    assert('Standard staff can create a lead in their own workspace', staffLeadRes.status === 201 && staffLead.data?.assigned_to === staff.data?.id);
    const staffLeadId = staffLead.data?.id;

    const staffProtectedLeadRes = await fetch(`${BASE}/api/v1/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ today_remarks: 'CI discussion', next_follow_up_action: 'CI next step', name: 'CI Protected-Field Attempt', follow_up_date: followDate, price: 999999, value: 999999 }),
    });
    assert('Staff cannot set owner-only commercial lead fields', staffProtectedLeadRes.status === 403);

    const ownerAssignedLeadRes = await fetch(`${BASE}/api/v1/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ today_remarks: 'CI discussion', next_follow_up_action: 'CI next step',
        name: 'CI Owner-Assigned Lead',
        follow_up_date: followDate,
        assigned_to: staff.data?.id,
        type: 'Export',
        products: ['Ginger'],
        quantity: 1000,
        price: 3,
        value: 3000,
      }),
    });
    const ownerAssignedLead = await ownerAssignedLeadRes.json();
    assert('Owner can assign a lead and set restricted commercial details', ownerAssignedLeadRes.status === 201 && ownerAssignedLead.data?.assigned_to === staff.data?.id && ownerAssignedLead.data?.value === 3000);
    const ownerAssignedLeadId = ownerAssignedLead.data?.id;

    const observerAssignedLeadRes = await fetch(`${BASE}/api/v1/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ today_remarks: 'CI discussion', next_follow_up_action: 'CI next step', name: 'CI Observer-Assigned Lead', follow_up_date: followDate, assigned_to: observer.data?.id }),
    });
    const observerAssignedLead = await observerAssignedLeadRes.json();
    assert('Owner can assign a lead to read-only staff for visibility-only access', observerAssignedLeadRes.status === 201 && observerAssignedLead.data?.assigned_to === observer.data?.id);
    const observerAssignedLeadId = observerAssignedLead.data?.id;

    const observerLeadRes = await fetch(`${BASE}/api/v1/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${observerToken}` },
      body: JSON.stringify({ today_remarks: 'CI discussion', next_follow_up_action: 'CI next step', name: 'CI Read-Only Lead Attempt', follow_up_date: followDate }),
    });
    assert('Read-only staff cannot create leads through the API', observerLeadRes.status === 403);
    const observerUpdateRes = await fetch(`${BASE}/api/v1/leads/${ownerAssignedLeadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${observerToken}` },
      body: JSON.stringify({ today_remarks: 'Unauthorized update attempt.' }),
    });
    assert('Read-only staff cannot update another user’s lead', observerUpdateRes.status === 403 || observerUpdateRes.status === 404);
    const observerOwnScopeUpdateRes = await fetch(`${BASE}/api/v1/leads/${observerAssignedLeadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${observerToken}` },
      body: JSON.stringify({ today_remarks: 'Unauthorized own-scope update attempt.' }),
    });
    assert('Read-only staff cannot update a lead assigned to them', observerOwnScopeUpdateRes.status === 403);

    const staffLeadProtectedUpdateRes = await fetch(`${BASE}/api/v1/leads/${staffLeadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ price: 999999, assigned_to: observer.data?.id }),
    });
    assert('Staff cannot edit owner-only fields or reassign leads', staffLeadProtectedUpdateRes.status === 403);

    const staffLeadUpdateRes = await fetch(`${BASE}/api/v1/leads/${staffLeadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        today_remarks: 'Buyer confirmed the preferred pack size.',
        next_follow_up_action: 'Send updated catalogue tomorrow.',
        follow_up_date: followDate,
      }),
    });
    const staffLeadUpdate = await staffLeadUpdateRes.json();
    assert('Staff can record lead discussion and next action', staffLeadUpdateRes.status === 200 && staffLeadUpdate.data?.previous_remarks?.[0]?.today_remark === 'Buyer confirmed the preferred pack size.');
    const staffReviewLeadRes = await fetch(`${BASE}/api/v1/leads/${ownerAssignedLeadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ today_remarks: 'Discussed delivery timing and confirmed packaging.', next_follow_up_action: 'Confirm shipping window with operations.', follow_up_date: followDate }),
    });
    const staffReviewLead = await staffReviewLeadRes.json();
    assert('Staff discussion is recorded on an owner-assigned lead for review', staffReviewLeadRes.status === 200 && staffReviewLead.data?.previous_remarks?.[0]?.author_id === staff.data?.id);

    // 6. Retrieve Lead Dossier & Verify Dual Remarks
    const getLeadRes = await fetch(`${BASE}/api/v1/leads/${leadId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const getLeadData = await getLeadRes.json();
    assert(
      'Retrieve Lead Dossier verifies saved current remarks & planned action',
      getLeadRes.status === 200 &&
      getLeadData.data?.today_remarks === 'Discussed 25 MT double-polish turmeric specs on today call.' &&
      getLeadData.data?.next_follow_up_action === 'Share proforma invoice with 3.5% curcumin lab report.'
    );

    // 7. Update Lead Pipeline Stage
    const updateLeadRes = await fetch(`${BASE}/api/v1/leads/${leadId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        stage: 'Quotation Sent',
        today_remarks: 'Quotation sent via email to buyer.',
      }),
    });
    const updateLeadData = await updateLeadRes.json();
    assert('Update Lead Pipeline Stage to Quotation Sent', updateLeadRes.status === 200 && updateLeadData.data?.stage === 'Quotation Sent');

    // 8. Create Follow-up Entry
    const createFollowRes = await fetch(`${BASE}/api/v1/followup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        lead_id: leadId,
        client_name: 'CI Global Spices FZE',
        scheduled_date: followDate,
        scheduled_time: '11:00 AM',
        type: 'Phone Call',
        today_remarks: 'Call customer to review updated CIF quote.',
        next_follow_up_action: 'Confirm LC draft verification with bank.',
      }),
    });
    const createFollowData = await createFollowRes.json();
    assert(
      'Create Follow-up Entry with sync to Lead',
      createFollowRes.status === 201 && createFollowData.data?.today_remarks?.includes('Call customer'),
      `FollowUp ID: ${createFollowData.data?.id}`
    );

    // 9. Retrieve Follow-ups List
    const listFollowRes = await fetch(`${BASE}/api/v1/followup`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const listFollowData = await listFollowRes.json();
    assert('Retrieve Follow-ups List', listFollowRes.status === 200 && Array.isArray(listFollowData.data) && listFollowData.data.length > 0);

    // 10. Create and List Task
    const createTaskRes = await fetch(`${BASE}/api/v1/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        title: 'Send certificate of analysis to buyer',
        priority: 'High',
        due_date: followDate,
        lead_id: leadId,
      }),
    });
    const createTaskData = await createTaskRes.json();
    assert('Create Task for Lead', createTaskRes.status === 201, `Task ID: ${createTaskData.data?.id}`);
    const ownerAssignedTaskRes = await fetch(`${BASE}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ title: 'CI Review completed documentation', priority: 'High', due_date: followDate, assigned_to: staff.data?.id, lead_id: ownerAssignedLeadId }),
    });
    const ownerAssignedTask = await ownerAssignedTaskRes.json();
    assert('Owner can assign a task to staff and link the lead', ownerAssignedTaskRes.status === 201 && ownerAssignedTask.data?.assigned_to === staff.data?.id && ownerAssignedTask.data?.lead_id === ownerAssignedLeadId);
    const reviewTaskId = ownerAssignedTask.data?.id;
    const ownerPendingTaskRes = await fetch(`${BASE}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ title: 'CI Pending staff task', priority: 'Medium', due_date: new Date(Date.now() - 86400000).toISOString(), assigned_to: staff.data?.id, lead_id: ownerAssignedLeadId }),
    });
    const ownerPendingTask = await ownerPendingTaskRes.json();
    assert('Owner can create a pending overdue task for staff review', ownerPendingTaskRes.status === 201 && ownerPendingTask.data?.status === 'Pending' && ownerPendingTask.data?.assigned_to === staff.data?.id);

    const staffTaskRes = await fetch(`${BASE}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ title: 'CI Staff-created task', due_date: followDate }),
    });
    assert('Staff can create a personal task for themselves', staffTaskRes.status === 201);
    const staffSharedTaskRes = await fetch(`${BASE}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ title: 'CI Staff assigns to owner', due_date: followDate, assigned_to: 'someone_else' }),
    });
    assert('Staff cannot assign tasks to other people', staffSharedTaskRes.status === 403);

    const observerTaskRes = await fetch(`${BASE}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${observerToken}` },
      body: JSON.stringify({ title: 'CI Read-only task attempt', due_date: followDate }),
    });
    assert('Read-only staff cannot create tasks through the API', observerTaskRes.status === 403);

    const staffCompleteTaskRes = await fetch(`${BASE}/api/v1/tasks/${reviewTaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ status: 'Completed', completion_notes: 'Sent the signed documents to the buyer.', remarks: 'Buyer acknowledged receipt.' }),
    });
    const staffCompleteTask = await staffCompleteTaskRes.json();
    assert('Staff can mark an assigned task complete with review notes', staffCompleteTaskRes.status === 200 && staffCompleteTask.data?.status === 'Completed' && staffCompleteTask.data?.completion_notes?.includes('signed documents'));

    const staffTaskTamperRes = await fetch(`${BASE}/api/v1/tasks/${reviewTaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ title: 'Tampered task title', assigned_to: observer.data?.id }),
    });
    assert('Staff cannot change task ownership or task definition', staffTaskTamperRes.status === 403);

    const observerAssignedTaskRes = await fetch(`${BASE}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ title: 'CI Read-only assigned task', due_date: followDate, assigned_to: observer.data?.id, lead_id: observerAssignedLeadId }),
    });
    const observerAssignedTask = await observerAssignedTaskRes.json();
    assert('Owner can assign review work to a read-only staff member', observerAssignedTaskRes.status === 201 && observerAssignedTask.data?.assigned_to === observer.data?.id);
    const observerTaskUpdateRes = await fetch(`${BASE}/api/v1/tasks/${observerAssignedTask.data?.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${observerToken}` },
      body: JSON.stringify({ status: 'Completed' }),
    });
    assert('Read-only staff cannot update task review status, even for their assigned task', observerTaskUpdateRes.status === 403);

    const staffTasksRes = await fetch(`${BASE}/api/v1/tasks`, { headers: { Authorization: `Bearer ${staffToken}` } });
    const staffTasks = await staffTasksRes.json();
    assert('Daily staff task list contains assigned work but not owner-only task records', staffTasksRes.status === 200 && staffTasks.data?.some((task) => task.id === reviewTaskId) && staffTasks.data?.every((task) => task.assigned_to === staff.data?.id));
    const ownerTasksRes = await fetch(`${BASE}/api/v1/tasks`, { headers: { Authorization: `Bearer ${ownerToken}` } });
    const ownerTasks = await ownerTasksRes.json();
    assert('Owner review distinguishes completed and overdue pending staff tasks', ownerTasksRes.status === 200 && ownerTasks.data?.some((task) => task.id === reviewTaskId && task.status === 'Completed') && ownerTasks.data?.some((task) => task.id === ownerPendingTask.data?.id && task.status === 'Pending' && new Date(task.due_date) < new Date()));

    const staffFollowRes = await fetch(`${BASE}/api/v1/followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ lead_id: ownerAssignedLeadId, client_name: 'CI Owner-Assigned Lead', scheduled_date: followDate, scheduled_time: '11:30 AM', type: 'Phone Call', assigned_to: staff.data?.id, today_remarks: 'Discussed revised delivery timing.', next_follow_up_action: 'Confirm shipping window with operations.' }),
    });
    const assignedFollowUp = await staffFollowRes.json();
    assert('Owner can assign a follow-up reminder with discussion and planned action', staffFollowRes.status === 201 && assignedFollowUp.data?.assigned_to === staff.data?.id && assignedFollowUp.data?.today_remarks?.includes('delivery timing'));
    const followUpId = assignedFollowUp.data?.id;

    const observerFollowRes = await fetch(`${BASE}/api/v1/followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${observerToken}` },
      body: JSON.stringify({ client_name: 'CI Read-Only Follow-up Attempt', scheduled_date: followDate }),
    });
    assert('Read-only staff cannot create follow-ups through the API', observerFollowRes.status === 403);

    const staffFollowUpdateRes = await fetch(`${BASE}/api/v1/followup/${followUpId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ status: 'Completed', remark: 'Customer accepted the shipping window; pricing was not discussed.', today_remarks: 'Shipping window accepted.', next_follow_up_action: 'Send final schedule.' }),
    });
    const staffFollowUpdate = await staffFollowUpdateRes.json();
    assert('Staff can close an assigned follow-up and record what was and was not discussed', staffFollowUpdateRes.status === 200 && staffFollowUpdate.data?.status === 'Completed' && staffFollowUpdate.data?.remark?.includes('accepted') && staffFollowUpdate.data?.remark?.includes('not discussed'));

    const observerFollowUpdateRes = await fetch(`${BASE}/api/v1/followup/${followUpId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${observerToken}` },
      body: JSON.stringify({ status: 'Cancelled' }),
    });
    assert('Read-only staff cannot change another user’s follow-up status', observerFollowUpdateRes.status === 403 || observerFollowUpdateRes.status === 404);
    const observerAssignedFollowUpRes = await fetch(`${BASE}/api/v1/followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ lead_id: observerAssignedLeadId, client_name: 'CI Observer-Assigned Lead', scheduled_date: followDate, assigned_to: observer.data?.id, today_remarks: 'Waiting for buyer response.', next_follow_up_action: 'Call buyer tomorrow.' }),
    });
    const observerAssignedFollowUp = await observerAssignedFollowUpRes.json();
    assert('Owner can assign reminder to read-only staff', observerAssignedFollowUpRes.status === 201 && observerAssignedFollowUp.data?.assigned_to === observer.data?.id);
    const observerAssignedFollowUpUpdateRes = await fetch(`${BASE}/api/v1/followup/${observerAssignedFollowUp.data?.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${observerToken}` },
      body: JSON.stringify({ status: 'Completed' }),
    });
    assert('Read-only staff cannot close a follow-up assigned to them', observerAssignedFollowUpUpdateRes.status === 403);

    const staffPlannerRes = await fetch(`${BASE}/api/v1/mydays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ task: 'Review buyer replies and prepare tomorrow’s calls.', category: 'Follow-up', date: followDate }),
    });
    const staffPlanner = await staffPlannerRes.json();
    assert('Staff can create a personal daily planner item', staffPlannerRes.status === 201 && staffPlanner.data?.user_id === staff.data?.id);
    const plannerId = staffPlanner.data?.id;
    const staffPlannerToggleRes = await fetch(`${BASE}/api/v1/mydays/${plannerId}/toggle`, { method: 'PATCH', headers: { Authorization: `Bearer ${staffToken}` } });
    const staffPlannerToggle = await staffPlannerToggleRes.json();
    assert('Staff can mark their own daily planner item complete', staffPlannerToggleRes.status === 200 && staffPlannerToggle.data?.completed === true);
    const ownerPlannerRes = await fetch(`${BASE}/api/v1/mydays`, { headers: { Authorization: `Bearer ${ownerToken}` } });
    const ownerPlanner = await ownerPlannerRes.json();
    assert('Owner cannot see private staff planner items', ownerPlannerRes.status === 200 && !ownerPlanner.data?.some((item) => item.id === plannerId));

    const ownerReviewLeadRes = await fetch(`${BASE}/api/v1/leads/${ownerAssignedLeadId}`, { headers: { Authorization: `Bearer ${ownerToken}` } });
    const ownerReviewLead = await ownerReviewLeadRes.json();
    assert('Owner review retains staff discussion history and linked task evidence', ownerReviewLeadRes.status === 200 && ownerReviewLead.data?.previous_remarks?.some((entry) => entry.author_id === staff.data?.id) && ownerReviewLead.data?.tasks?.some((task) => task.id === reviewTaskId && task.status === 'Completed'));

    const observerLeadsRes = await fetch(`${BASE}/api/v1/leads`, { headers: { Authorization: `Bearer ${observerToken}` } });
    const observerLeads = await observerLeadsRes.json();
    assert('Staff lead list is limited to assigned or created records', observerLeadsRes.status === 200 && !observerLeads.data?.some((lead) => lead.id === ownerAssignedLeadId));

    const deleteObserverRes = await fetch(`${BASE}/api/v1/admin/users/${observer.data?.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ownerToken}` } });
    assert('Owner can remove read-only staff account', deleteObserverRes.status === 200);
    const deleteStaffRes = await fetch(`${BASE}/api/v1/admin/users/${staff.data?.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ownerToken}` } });
    assert('Owner can remove their staff account', deleteStaffRes.status === 200);
    const deletedStaffTokenRes = await fetch(`${BASE}/api/v1/admin/users`, { headers: { Authorization: `Bearer ${staffToken}` } });
    assert('Deleted staff token is rejected on next request', deletedStaffTokenRes.status === 401);

    // 11. Retrieve Analytics
    const analyticsRes = await fetch(`${BASE}/api/v1/analytics`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const analyticsData = await analyticsRes.json();
    assert('Retrieve Analytics Metrics', analyticsRes.status === 200 && analyticsData.success && typeof analyticsData.data?.kpis === 'object');

    // 12. 404 Handler Verification
    const notFoundRes = await fetch(`${BASE}/api/v1/non-existent-endpoint`);
    assert('Centralized 404 Handler works properly', notFoundRes.status === 404);

    // 13. Email Marketing: locked by default for a new owner
    const emailStatusRes = await fetch(`${BASE}/api/v1/email/status`, { headers: { Authorization: `Bearer ${ownerToken}` } });
    const emailStatus = await emailStatusRes.json();
    assert('Email Marketing is disabled by default for owners', emailStatusRes.status === 200 && emailStatus.data?.enabled === false && emailStatus.data?.is_owner === true);

    const lockedRes = await fetch(`${BASE}/api/v1/email/campaigns`, { headers: { Authorization: `Bearer ${ownerToken}` } });
    const locked = await lockedRes.json();
    assert('Email endpoints return 403 FEATURE_DISABLED when locked', lockedRes.status === 403 && locked.code === 'FEATURE_DISABLED');

    // 14. Super Admin enables the premium feature for this owner
    const ownerId = reg.data?.user?.id;
    const enableRes = await fetch(`${BASE}/api/v1/admin/users/${ownerId}/features`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ email_marketing: true }),
    });
    const enabled = await enableRes.json();
    assert('Super Admin can enable Email Marketing for an owner', enableRes.status === 200 && enabled.data?.features?.email_marketing === true);

    // 15. Owner saves SMTP sender settings (password stored encrypted, never echoed back)
    const settingsRes = await fetch(`${BASE}/api/v1/email/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ host: 'smtp.example.com', port: 587, user: 'owner@example.com', pass: 'app-password-123', from_name: 'CI Owner', rate_per_minute: 30 }),
    });
    const settings = await settingsRes.json();
    assert(
      'Owner can save SMTP sender settings (password masked)',
      settingsRes.status === 200 && settings.data?.has_password === true && settings.data?.pass === undefined && settings.data?.pass_enc === undefined
    );

    // 16. Tag a lead and build an audience from it
    const tagRes = await fetch(`${BASE}/api/v1/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ tags: ['ci-buyer', ' Dubai ', 'ci-buyer'], email: 'buyer@ci-example.com' }),
    });
    const tagged = await tagRes.json();
    assert('Lead tags are normalized and de-duplicated', tagRes.status === 200 && Array.isArray(tagged.data?.tags) && tagged.data.tags.length === 2 && tagged.data.tags.includes('Dubai'));

    const tagsRes = await fetch(`${BASE}/api/v1/email/tags`, { headers: { Authorization: `Bearer ${ownerToken}` } });
    const tagsData = await tagsRes.json();
    assert('Tags endpoint lists tag counts', tagsRes.status === 200 && tagsData.data?.some((t) => t.tag === 'ci-buyer' && t.with_email >= 1));

    const previewRes = await fetch(`${BASE}/api/v1/email/audience/preview?mode=tags&tags=ci-buyer`, { headers: { Authorization: `Bearer ${ownerToken}` } });
    const previewData = await previewRes.json();
    assert('Audience preview counts tagged leads with email', previewRes.status === 200 && previewData.data?.count >= 1);

    // 17. Create a campaign draft targeting the tag
    const campaignRes = await fetch(`${BASE}/api/v1/email/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ name: 'CI Campaign', subject: 'Hello {{company_name}}', body: 'Hi {{contact_name}}, fresh stock available.', audience: { mode: 'tags', tags: ['ci-buyer'] } }),
    });
    const campaign = await campaignRes.json();
    assert('Campaign draft is created with recipients', campaignRes.status === 201 && campaign.data?.status === 'draft' && campaign.data?.total >= 1, `Campaign ID: ${campaign.data?.id}`);

    // 18. Public unsubscribe link marks the lead as unsubscribed
    const { unsubscribeToken } = require('../services/mailer.service');
    const unsubRes = await fetch(`${BASE}/api/v1/email/unsubscribe/${unsubscribeToken(ownerId, 'buyer@ci-example.com')}`);
    const unsubHtml = await unsubRes.text();
    const previewAfterRes = await fetch(`${BASE}/api/v1/email/audience/preview?mode=tags&tags=ci-buyer`, { headers: { Authorization: `Bearer ${ownerToken}` } });
    const previewAfter = await previewAfterRes.json();
    assert('Unsubscribe link removes the address from future audiences', unsubRes.status === 200 && unsubHtml.includes('unsubscribed') && previewAfter.data?.count === previewData.data.count - 1);

    const developerMetricsRes = await fetch(`${BASE}/api/v1/admin/developer-metrics`, {
      headers: { Authorization: 'Bearer ' + adminToken },
    });
    const developerMetrics = await developerMetricsRes.json();
    const ownerMetrics = developerMetrics.data?.userResourceConsumption?.find((owner) => owner.id === ownerId);
    const databaseMetrics = developerMetrics.data?.database;
    assert(
      'Developer metrics attribute authenticated API requests to the owner',
      developerMetricsRes.status === 200 && ownerMetrics?.apiRequests > 0
    );
    assert(
      'Developer metrics include all in-memory tenant collections and use bounded capacity values',
      ['follow_ups', 'my_days', 'notifications', 'outreach', 'email_settings', 'email_campaigns', 'tenants']
        .every((name) => databaseMetrics?.collections?.some((collection) => collection.name === name)) &&
      Number(databaseMetrics?.freeMb) >= 0 &&
      Number(databaseMetrics?.percentUsed) <= 100
    );
    assert(
      'Per-owner data footprint is returned as a non-empty estimate',
      Number(ownerMetrics?.estimatedBytes) > 0 && Number(ownerMetrics?.estimatedKb) > 0
    );

    const ownerRecord = dataStore.users.find((user) => user.id === ownerId);
    const tenantLeadId = `ci_delete_lead_${Date.now()}`;
    const tenantStaffId = `ci_delete_staff_${Date.now()}`;
    dataStore.users.push({
      id: tenantStaffId,
      name: 'CI Deletion Staff',
      email: `${tenantStaffId}@travel-trade.com`,
      persona: 'staff',
      role: 'agent',
      company_id: ownerRecord.company_id,
      created_by: ownerId,
      is_active: true,
    });
    dataStore.leads.push({ id: tenantLeadId, name: 'CI Deletion Lead', company_id: ownerRecord.company_id });
    dataStore.tasks.push({ id: `ci_delete_task_${Date.now()}`, company_id: ownerRecord.company_id, lead_id: tenantLeadId });
    dataStore.activities.push({ id: `ci_delete_activity_${Date.now()}`, lead_id: tenantLeadId, user_id: tenantStaffId });
    dataStore.followUps.push({ id: `ci_delete_followup_${Date.now()}`, lead_id: tenantLeadId, assigned_to: tenantStaffId });
    dataStore.myDays.push({ id: `ci_delete_myday_${Date.now()}`, user_id: tenantStaffId });
    dataStore.emailSettings.push({ owner_id: ownerId, company_id: ownerRecord.company_id });
    dataStore.emailCampaigns.push({ id: `ci_delete_campaign_${Date.now()}`, owner_id: ownerId, company_id: ownerRecord.company_id });
    dataStore.outreach.push({ id: `ci_delete_outreach_${Date.now()}`, owner_id: ownerId, company_id: ownerRecord.company_id });
    dataStore.notifications.push({ id: `ci_delete_notification_${Date.now()}`, target_user_id: ownerId });

    const ownerDeleteAttempt = await fetch(`${BASE}/api/v1/admin/users/${ownerId}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + ownerToken },
    });
    assert('Company owners cannot delete owner accounts', ownerDeleteAttempt.status === 400);

    const ownerDeleteRes = await fetch(`${BASE}/api/v1/admin/users/${ownerId}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + adminToken },
    });
    const ownerDelete = await ownerDeleteRes.json();
    assert('Super Admin can permanently delete an owner workspace', ownerDeleteRes.status === 200 && ownerDelete.data?.deleted === true);
    assert(
      'Owner deletion removes tenant records and staff from memory',
      !dataStore.users.some((user) => user.id === ownerId || user.id === tenantStaffId) &&
      !dataStore.leads.some((lead) => lead.id === tenantLeadId) &&
      !dataStore.tasks.some((task) => task.lead_id === tenantLeadId) &&
      !dataStore.activities.some((activity) => activity.lead_id === tenantLeadId) &&
      !dataStore.followUps.some((followUp) => followUp.lead_id === tenantLeadId) &&
      !dataStore.myDays.some((myDay) => myDay.user_id === tenantStaffId) &&
      !dataStore.emailSettings.some((setting) => setting.owner_id === ownerId) &&
      !dataStore.emailCampaigns.some((campaign) => campaign.owner_id === ownerId) &&
      !dataStore.outreach.some((item) => item.owner_id === ownerId) &&
      !dataStore.notifications.some((notification) => notification.target_user_id === ownerId)
    );
    const deletedOwnerTokenRes = await fetch(`${BASE}/api/v1/admin/users`, {
      headers: { Authorization: 'Bearer ' + ownerToken },
    });
    assert('Deleted owner session is rejected', deletedOwnerTokenRes.status === 401);

  } catch (err) {
    console.error('💥 Unhandled Exception during CI tests:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n======================================================================');
  console.log(`📊 CI/CD TEST RESULTS: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL CI/CD INTEGRATION CHECKS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
};

runCITests();
