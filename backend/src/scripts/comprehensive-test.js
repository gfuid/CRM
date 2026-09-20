const http = require('http');
const app = require('../app');

const runComprehensiveSuite = async () => {
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const BASE_URL = `http://127.0.0.1:${port}`;

  console.log(`\n============================================================`);
  console.log(`🚀 Starting Full CRM Feature & Integration Test Suite`);
  console.log(`📍 Test Server running on ${BASE_URL}`);
  console.log(`============================================================\n`);

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  };

  try {
    // 1. Healthcheck Test
    const health = await fetch(`${BASE_URL}/health`).then((r) => r.json());
    assert(health.success === true && health.data.status === 'UP', '1. System Healthcheck', `status: ${health.data.status}`);

    // 2. Non-existent User Login Rejection Test (User requirement!)
    const invalidLogin = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent_test_account@example.com', password: 'randomPassword123!' }),
    });
    const invalidLoginData = await invalidLogin.json();
    assert(
      invalidLogin.status === 401 && invalidLoginData.success === false,
      '2. Non-existent User Login Rejection',
      `HTTP ${invalidLogin.status} - "${invalidLoginData.message}"`
    );

    // 3. Super Admin Login Test
    const adminLogin = await fetch(`${BASE_URL}/api/v1/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'traveltrade_admin', password: 'TravelTrade#Admin2026!' }),
    }).then((r) => r.json());
    assert(adminLogin.success && adminLogin.data.token, '3. Super Admin Login & JWT Issuance', `Token Issued for: ${adminLogin.data.user.username}`);
    const superAdminToken = adminLogin.data.token;

    // 4. Register New Company Owner Test
    const ownerEmail = `owner_${Date.now()}@agritrade-test.com`;
    const ownerReg = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sagar Agritrade Founder',
        email: ownerEmail,
        password: 'Password@2026!',
        company_name: 'Sagar Global Agro Exports',
        persona: 'owner',
        plan: 'growth',
      }),
    }).then((r) => r.json());
    assert(ownerReg.success && ownerReg.data.token, '4. Owner Registration', `Company: ${ownerReg.data.company.name}`);
    const ownerToken = ownerReg.data.token;
    const ownerUser = ownerReg.data.user;

    // 5. Owner Profile /me Test
    const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    }).then((r) => r.json());
    assert(meRes.success && meRes.data.user.email === ownerEmail, '5. Owner /me Profile Verification', `Email: ${meRes.data.user.email}`);

    // 6. Owner Creates Staff Member Test
    const staffEmail = `staff_${Date.now()}@agritrade-test.com`;
    const staffCreate = await fetch(`${BASE_URL}/api/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Pooja Export Specialist',
        email: staffEmail,
        password: 'staffPassword123!',
        role: 'agent',
        department: 'Spice Export Desk',
      }),
    }).then((r) => r.json());
    assert(staffCreate.success && staffCreate.data.id, '6. Staff Creation via Personnel API', `Staff: ${staffEmail}`);

    // 7. Staff Login Test
    const staffLogin = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: staffEmail, password: 'staffPassword123!' }),
    }).then((r) => r.json());
    assert(staffLogin.success && staffLogin.data.token, '7. Staff Login with Credentials', `Role: ${staffLogin.data.user.role}`);
    const staffToken = staffLogin.data.token;

    // 8. Create Lead (Commodity Export with products, quantity, incoterms)
    const newLead = await fetch(`${BASE_URL}/api/v1/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Emirates Agro Spices FZC',
        type: 'Export',
        country: 'United Arab Emirates 🇦🇪',
        products: ['Turmeric', 'Ginger'],
        quantity: 40000,
        price: 1800,
        value: 72000,
        stage: 'Requirement Understood',
        priority: 'High',
        contact_person: 'Rashid Al-Maktoum',
        email: 'rashid@emiratesagro.ae',
      }),
    }).then((r) => r.json());
    assert(newLead.success && newLead.data.id, '8. Create Commodity Export Lead', `Lead ID: ${newLead.data.id}, Value: $${newLead.data.value}`);
    const leadId = newLead.data.id;

    // 9. Fetch Leads & Filter Test
    const leadsList = await fetch(`${BASE_URL}/api/v1/leads`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    }).then((r) => r.json());
    assert(leadsList.success && Array.isArray(leadsList.data) && leadsList.data.length > 0, '9. Retrieve Leads List', `Total Leads: ${leadsList.data.length}`);

    // 10. Update Lead Stage (Pipeline Advancement)
    const updateLead = await fetch(`${BASE_URL}/api/v1/leads/${leadId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ stage: 'Quotation Sent', notes: 'Proforma Invoice sent with CIF Jebel Ali terms' }),
    }).then((r) => r.json());
    assert(updateLead.success && updateLead.data.stage === 'Quotation Sent', '10. Advance Lead Pipeline Stage', `New Stage: ${updateLead.data.stage}`);

    // 11. Create Task Test
    const newTask = await fetch(`${BASE_URL}/api/v1/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        title: 'Dispatch Lab Certificate for Curcumin 3.5% Turmeric',
        priority: 'High',
        lead_id: leadId,
        status: 'In Progress',
      }),
    }).then((r) => r.json());
    assert(newTask.success && newTask.data.id, '11. Create CRM Task', `Task ID: ${newTask.data.id}`);
    const taskId = newTask.data.id;

    // 12. Update Task Status & Retrieve
    const updateTask = await fetch(`${BASE_URL}/api/v1/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ status: 'Completed' }),
    }).then((r) => r.json());
    assert(updateTask.success && updateTask.data.status === 'Completed', '12. Complete CRM Task', `Status: ${updateTask.data.status}`);

    // 13. Schedule Follow-up Test
    const newFollowUp = await fetch(`${BASE_URL}/api/v1/followup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        client_name: 'Rashid Al-Maktoum',
        company: 'Emirates Agro Spices FZC',
        scheduled_date: '2026-09-25',
        scheduled_time: '11:30 AM',
        type: 'phone',
        agenda: 'Confirm CAD bank documents delivery',
      }),
    }).then((r) => r.json());
    assert(newFollowUp.success && newFollowUp.data.id, '13. Schedule Follow-up Meeting', `FollowUp ID: ${newFollowUp.data.id}`);
    const followUpId = newFollowUp.data.id;

    // 14. Fetch & Update Follow-up Test
    const updateFollowUp = await fetch(`${BASE_URL}/api/v1/followup/${followUpId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ status: 'completed' }),
    }).then((r) => r.json());
    assert(updateFollowUp.success && updateFollowUp.data.status === 'completed', '14. Update Follow-up Status', `Status: ${updateFollowUp.data.status}`);

    // 15. Delete Follow-up Test
    const deleteFollowUp = await fetch(`${BASE_URL}/api/v1/followup/${followUpId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    }).then((r) => r.json());
    assert(deleteFollowUp.success, '15. Delete Follow-up Record', `Deleted ID: ${followUpId}`);

    // 16. Outreach Tracking Matrix Test
    const recordOutreach = await fetch(`${BASE_URL}/api/v1/outreach/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        calls_made: 35,
        emails_sent: 55,
        linkedin_touches: 22,
        meetings_booked: 4,
      }),
    }).then((r) => r.json());
    assert(recordOutreach.success && recordOutreach.data.target_met === true, '16. Record Daily Outreach Metrics', `Target Met: ${recordOutreach.data.target_met}`);

    // 17. MyDays Daily Planner Test
    const myDayEntry = await fetch(`${BASE_URL}/api/v1/mydays`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        task: 'Review Tuticorin Port container temperature logs',
        priority: 'high',
        time_slot: '03:00 PM - 03:30 PM',
        category: 'Shipping & Logistics',
      }),
    }).then((r) => r.json());
    assert(myDayEntry.success && myDayEntry.data.id, '17. Add MyDay Task Entry', `Entry ID: ${myDayEntry.data.id}`);
    const myDayId = myDayEntry.data.id;

    const toggleMyDay = await fetch(`${BASE_URL}/api/v1/mydays/${myDayId}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}` },
    }).then((r) => r.json());
    assert(toggleMyDay.success && toggleMyDay.data.completed === true, '18. Toggle MyDay Completion', `Completed: ${toggleMyDay.data.completed}`);

    // 19. Aggregated Analytics & Trade Pipeline Metrics Test
    const analytics = await fetch(`${BASE_URL}/api/v1/analytics`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    }).then((r) => r.json());
    assert(
      analytics.success && analytics.data.kpis.totalLeads >= 1 && Array.isArray(analytics.data.stageBreakdown),
      '19. Pipeline Analytics & KPIs Calculation',
      `Total Leads: ${analytics.data.kpis.totalLeads}, Total Pipeline: $${analytics.data.kpis.totalPipelineValue}`
    );

    // 20. Admin Telemetry & Overview Summary Test
    const overview = await fetch(`${BASE_URL}/api/v1/admin/overview-summary`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    }).then((r) => r.json());
    assert(
      overview.success && overview.data.team && overview.data.health.status === 'OPTIMAL',
      '20. Admin Console Overview Telemetry & Health',
      `Health: ${overview.data.health.status}, Team Members: ${overview.data.team.total}`
    );

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log(`\n============================================================`);
  console.log(`📊 Comprehensive Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`============================================================\n`);

  process.exit(failed > 0 ? 1 : 0);
};

runComprehensiveSuite();
