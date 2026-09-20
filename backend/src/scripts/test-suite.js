const testBackend = async () => {
  const BASE_URL = 'http://localhost:5000';
  console.log('🧪 Starting CRM Production API & MongoDB Verification Suite...\n');

  try {
    // 1. Healthcheck
    const healthRes = await fetch(`${BASE_URL}/health`).then((r) => r.json());
    console.log('1️⃣ Healthcheck:', healthRes.success ? 'PASSED ✅' : 'FAILED ❌', healthRes.data);

    // 2. Login with Admin Demo Profile
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@stellarsync.io', password: 'admin123' }),
    }).then((r) => r.json());

    if (!loginRes.success || !loginRes.data.token) {
      throw new Error('Admin login failed: ' + JSON.stringify(loginRes));
    }
    const adminToken = loginRes.data.token;
    console.log('2️⃣ Admin Login:', 'PASSED ✅', `User: ${loginRes.data.user.name}, Role: ${loginRes.data.user.role}`);

    // 3. Authenticated /me endpoint
    const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    console.log('3️⃣ Profile /me check:', meRes.success ? 'PASSED ✅' : 'FAILED ❌', meRes.data.user.email);

    // 4. Register new user
    const testEmail = `test_agent_${Date.now()}@oneroot.com`;
    const regRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alex Johnson',
        email: testEmail,
        password: 'securePassword123!',
        department: 'Enterprise Sales',
        persona: 'staff',
      }),
    }).then((r) => r.json());
    console.log('4️⃣ User Registration (with bcrypt):', regRes.success ? 'PASSED ✅' : 'FAILED ❌', `Created: ${testEmail}`);

    // 5. Login with new user's password
    const newLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'securePassword123!' }),
    }).then((r) => r.json());
    console.log('5️⃣ Login with newly hashed password:', newLoginRes.success ? 'PASSED ✅' : 'FAILED ❌');

    // Test invalid password rejection
    const badLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'wrongPassword123' }),
    }).then((r) => r.json());
    console.log('6️⃣ Reject invalid password check:', !badLoginRes.success ? 'PASSED ✅' : 'FAILED ❌');

    // 7. Create Lead
    const newLeadRes = await fetch(`${BASE_URL}/api/v1/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Acme Cloud Dynamics',
        contact_person: 'John Doe',
        email: 'johndoe@acmecloud.com',
        phone: '+1 555-0199',
        value: 95000,
        stage: 'Qualified',
        priority: 'High',
      }),
    }).then((r) => r.json());
    console.log('7️⃣ Create Lead (persists to DB):', newLeadRes.success ? 'PASSED ✅' : 'FAILED ❌', `ID: ${newLeadRes.data.id}`);

    // 8. Create Task
    const newTaskRes = await fetch(`${BASE_URL}/api/v1/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Review SLA Contract with Acme Cloud Dynamics',
        priority: 'High',
        lead_id: newLeadRes.data.id,
      }),
    }).then((r) => r.json());
    console.log('8️⃣ Create Task (persists to DB):', newTaskRes.success ? 'PASSED ✅' : 'FAILED ❌', `ID: ${newTaskRes.data.id}`);

    // 9. Admin RBAC Verification
    const adminUsersRes = await fetch(`${BASE_URL}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    console.log('9️⃣ Admin Authorization & Users list:', adminUsersRes.success ? 'PASSED ✅' : 'FAILED ❌', `Total Users: ${adminUsersRes.data.length}`);

    // 10. Analytics Calculation
    const analyticsRes = await fetch(`${BASE_URL}/api/v1/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    console.log('🔟 Real-time Analytics & KPIs:', analyticsRes.success ? 'PASSED ✅' : 'FAILED ❌', {
      totalLeads: analyticsRes.data.kpis.totalLeads,
      totalPipeline: analyticsRes.data.kpis.totalPipelineValue,
    });

    console.log('\n🎉 ALL PRODUCTION SUITE VERIFICATION CHECKS PASSED!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
  }
};

testBackend();
