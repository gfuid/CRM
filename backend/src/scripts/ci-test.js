/**
 * CI/CD Automated Test Suite
 * Self-contained test runner for GitHub Actions & local verification.
 * Boots ephemeral test server, runs core endpoint assertions, and exits cleanly.
 */

const http = require('http');
const app = require('../app');

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

    // 2. Super Admin Login
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

    // 3. User Registration (Company Owner)
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

    // 4. Duplicate Registration Rejection
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

    // 5. Create Lead with Dual Remarks (Current vs. Future)
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
