const express = require('express');
const router = express.Router();

const API_SPEC = {
  title: 'Travel-Trade Sales CRM API Specification',
  version: '1.0.0',
  base_url: '/api/v1',
  description: 'Production-ready REST API for Travel-Trade Enterprise Sales CRM',
  authentication: {
    type: 'Bearer Token (JWT)',
    header: 'Authorization: Bearer <token>',
    endpoints: {
      user_login: 'POST /auth/login',
      admin_login: 'POST /auth/admin-login',
      register_owner: 'POST /auth/register',
      current_profile: 'GET /auth/me',
    },
  },
  modules: [
    {
      name: 'Authentication & Access',
      endpoints: [
        { method: 'POST', path: '/auth/login', desc: 'Login with user credentials & issue 7d JWT' },
        { method: 'POST', path: '/auth/admin-login', desc: 'Super Administrator access & 30d JWT' },
        { method: 'POST', path: '/auth/register', desc: 'Create new company workspace & owner account' },
        { method: 'GET', path: '/auth/me', desc: 'Retrieve authenticated profile & role permissions' },
        { method: 'PATCH', path: '/auth/profile', desc: 'Update profile details & change password' },
      ],
    },
    {
      name: 'Leads & Trade Management',
      endpoints: [
        { method: 'GET', path: '/leads', desc: 'List leads with filtering (stage, priority, search, assigned_to)' },
        { method: 'POST', path: '/leads', desc: 'Create export trade lead (mandatory follow_up_date, dual remarks)' },
        { method: 'GET', path: '/leads/:id', desc: 'Retrieve complete lead specifications & history dossier' },
        { method: 'PATCH', path: '/leads/:id', desc: 'Update lead attributes, stages, or reassign' },
        { method: 'DELETE', path: '/leads/:id', desc: 'Delete lead (Company Owner / Admin only)' },
      ],
    },
    {
      name: 'Follow-ups & Dual Remarks Engine',
      endpoints: [
        { method: 'GET', path: '/followup', desc: 'Retrieve all follow-up reminders & status tracking' },
        { method: 'POST', path: '/followup', desc: 'Schedule follow-up with today_remarks & next_follow_up_action' },
        { method: 'PATCH', path: '/followup/:id', desc: 'Update follow-up status (completed, reschedule, remark)' },
        { method: 'DELETE', path: '/followup/:id', desc: 'Delete follow-up reminder entry' },
      ],
    },
    {
      name: 'Tasks & Calendaring',
      endpoints: [
        { method: 'GET', path: '/tasks', desc: 'List tasks with priority & status filtering' },
        { method: 'POST', path: '/tasks', desc: 'Create task with due date, time, and lead association' },
        { method: 'PATCH', path: '/tasks/:id', desc: 'Update task status (In Progress, Completed)' },
        { method: 'DELETE', path: '/tasks/:id', desc: 'Delete task entry' },
      ],
    },
    {
      name: 'Outreach & MyDays Performance',
      endpoints: [
        { method: 'GET', path: '/outreach', desc: 'Get daily outreach performance matrix (calls, emails, WA)' },
        { method: 'POST', path: '/outreach/record', desc: 'Record daily outreach tallies & notes' },
        { method: 'GET', path: '/mydays', desc: 'Get current user daily focus list' },
        { method: 'POST', path: '/mydays', desc: 'Add new daily focus task item' },
        { method: 'PATCH', path: '/mydays/:id/toggle', desc: 'Toggle focus task completion' },
      ],
    },
    {
      name: 'Analytics & Admin Telemetry',
      endpoints: [
        { method: 'GET', path: '/analytics', desc: 'Real-time KPIs, conversion rate, win-rate, deal values' },
        { method: 'GET', path: '/admin/users', desc: 'Master directory of all registered personnel' },
        { method: 'POST', path: '/admin/users', desc: 'Add new staff seat to company' },
        { method: 'PATCH', path: '/admin/users/:id/role', desc: 'Promote/change staff member role' },
        { method: 'PATCH', path: '/admin/users/:id/status', desc: 'Toggle employee active/suspended state' },
      ],
    },
  ],
};

// Machine-readable JSON spec
router.get('/json', (req, res) => {
  res.json(API_SPEC);
});

// Clean Interactive HTML Docs UI
router.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>API Documentation - Travel-Trade CRM</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --emerald: #10b981;
      --blue: #3b82f6;
      --purple: #8b5cf6;
      --amber: #f59e0b;
      --rose: #f43f5e;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', sans-serif;
      padding: 32px 20px;
      line-height: 1.5;
    }
    .container { max-width: 1000px; margin: 0 auto; }
    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    h1 { font-size: 26px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 10px; }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(16, 185, 129, 0.15);
      color: var(--emerald);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .module-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      margin-bottom: 24px;
      overflow: hidden;
    }
    .module-header {
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid var(--border);
      font-weight: 700;
      font-size: 15px;
      color: #e2e8f0;
    }
    .endpoint-row {
      padding: 12px 20px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.5);
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 13px;
    }
    .endpoint-row:last-child { border-bottom: none; }
    .method {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 5px;
      min-width: 55px;
      text-align: center;
    }
    .method-get { background: rgba(59, 130, 246, 0.15); color: var(--blue); border: 1px solid rgba(59, 130, 246, 0.3); }
    .method-post { background: rgba(16, 185, 129, 0.15); color: var(--emerald); border: 1px solid rgba(16, 185, 129, 0.3); }
    .method-patch { background: rgba(245, 158, 11, 0.15); color: var(--amber); border: 1px solid rgba(245, 158, 11, 0.3); }
    .method-delete { background: rgba(244, 63, 94, 0.15); color: var(--rose); border: 1px solid rgba(244, 63, 94, 0.3); }
    .path { font-family: 'JetBrains Mono', monospace; color: #f1f5f9; font-weight: 600; min-width: 180px; }
    .desc { color: var(--muted); }
    .json-link {
      color: var(--blue);
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      float: right;
    }
    .json-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <a href="/api/v1/docs/json" class="json-link">View JSON Schema →</a>
      <h1>
        <span>Travel-Trade CRM API</span>
        <span class="badge">v1.0.0 Production</span>
      </h1>
      <p style="color: var(--muted); font-size: 13px; margin-top: 6px;">
        Base URL: <code style="font-family: 'JetBrains Mono', monospace; color: var(--emerald);">/api/v1</code> · Standard Bearer JWT Authentication
      </p>
    </header>

    ${API_SPEC.modules
      .map(
        (m) => `
      <div class="module-card">
        <div class="module-header">${m.name}</div>
        ${m.endpoints
          .map((e) => {
            const mCls = 'method-' + e.method.toLowerCase();
            return `
          <div class="endpoint-row">
            <span class="method ${mCls}">${e.method}</span>
            <span class="path">${e.path}</span>
            <span class="desc">${e.desc}</span>
          </div>
        `;
          })
          .join('')}
      </div>
    `
      )
      .join('')}
  </div>
</body>
</html>
  `;
  res.send(html);
});

module.exports = router;
