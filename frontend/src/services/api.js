/**
 * Production-ready API client for OneRoot Sales CRM
 * Adds bearer auth headers and normalizes backend responses and network errors
 */

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE_URL = isLocal ? 'http://localhost:5000/api/v1' : (import.meta.env.VITE_API_URL || 'https://crm-ep4i.onrender.com/api/v1');

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  getHeaders() {
    const token = localStorage.getItem('crm_token');
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /** Ping the server until it answers (up to ~40s). True when it is awake. */
  async wakeServer() {
    const healthUrl = this.baseUrl.replace(/\/api\/v1\/?$/, '') + '/health';
    for (let i = 0; i < 8; i++) {
      try {
        const r = await fetch(healthUrl, { cache: 'no-store' });
        if (r.ok) return true;
      } catch {}
      await new Promise((res) => setTimeout(res, 5000));
    }
    return false;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    };

    try {
      // The free server sleeps when idle. Wait and retry while it wakes up, so users do not see "Load failed".
      // Reads are retried on any network error; writes only when the server clearly did not handle them (502/503/504).
      const method = String(config.method || 'GET').toUpperCase();
      const waits = [1500, 4000, 8000];
      let response;
      for (let attempt = 0; ; attempt++) {
        try {
          response = await fetch(url, config);
          if ([502, 503, 504].includes(response.status) && attempt < waits.length) {
            await new Promise((r) => setTimeout(r, waits[attempt]));
            continue;
          }
          break;
        } catch (netErr) {
          if (method === 'GET' && attempt < waits.length) {
            await new Promise((r) => setTimeout(r, waits[attempt]));
            continue;
          }
          // A save failed before reaching the server (usually it was asleep): wake it, then try once more
          if (method !== 'GET' && attempt === 0 && (await this.wakeServer())) {
            continue;
          }
          throw netErr;
        }
      }
      let data = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: `Server temporarily unavailable (${response.status})` };
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          const errMsg = data?.message || '';
          if (
            errMsg.toLowerCase().includes('expired') ||
            errMsg.toLowerCase().includes('invalid') ||
            errMsg.toLowerCase().includes('authentication required')
          ) {
            window.dispatchEvent(new CustomEvent('crm_session_expired', { detail: { message: errMsg } }));
          }
        }
        const httpErr = new Error(data?.message || `HTTP error! status: ${response.status}`);
        httpErr.status = response.status;
        httpErr.code = data?.code;
        throw httpErr;
      }

      return data;
    } catch (error) {
      console.warn(`[API Warning] ${endpoint}:`, error.message);
      const msg = (error.message || '').toLowerCase();
      if (
        msg.includes('load failed') ||
        msg.includes('failed to fetch') ||
        msg.includes('networkerror') ||
        msg.includes('unexpected token') ||
        msg.includes('not valid json') ||
        msg.includes('network request failed') ||
        msg.includes('network')
      ) {
        const netErr = new Error('Network connection issue or backend server is starting. Please check your connection and retry.');
        netErr.isNetworkError = true;
        netErr.originalMessage = error.message;
        throw netErr;
      }
      throw error;
    }
  }

  // Auth
  login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  getProfile() {
    return this.request('/auth/me');
  }

  updateProfile(profileData) {
    return this.request('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
  }

  // Analytics
  getAnalytics() {
    return this.request('/analytics');
  }

  // Leads
  getLeads(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/leads${query ? `?${query}` : ''}`);
  }

  createLead(leadData) {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  }

  getLead(id) {
    return this.request(`/leads/${id}`);
  }

  updateLead(id, updates) {
    return this.request(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  deleteLead(id) {
    return this.request(`/leads/${id}`, {
      method: 'DELETE',
    });
  }

  // Tasks
  getTasks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/tasks${query ? `?${query}` : ''}`);
  }

  createTask(taskData) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  updateTask(id, updates) {
    return this.request(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  deleteTask(id) {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Activities
  getActivities(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/activity${query ? `?${query}` : ''}`);
  }

  createActivity(activityData) {
    return this.request('/activity', {
      method: 'POST',
      body: JSON.stringify(activityData),
    });
  }

  // Outreach
  getOutreach() {
    return this.request('/outreach');
  }

  recordOutreach(data) {
    return this.request('/outreach/record', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // MyDays (planner items + daily reports). params: { scope: 'team' } or { user_id }
  getMyDays(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/mydays${query ? `?${query}` : ''}`);
  }

  // Reminders: what is due today / overdue for the logged-in user
  getReminders() {
    return this.request('/reminders');
  }

  // Staff performance review
  getTeamPerformance(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/analytics/team${query ? `?${query}` : ''}`);
  }

  getStaffPerformance(userId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/analytics/staff/${encodeURIComponent(userId)}${query ? `?${query}` : ''}`);
  }

  addMyDay(item) {
    return this.request('/mydays', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  toggleMyDay(id) {
    return this.request(`/mydays/${id}/toggle`, {
      method: 'PATCH',
    });
  }

  deleteMyDay(id) {
    return this.request(`/mydays/${id}`, {
      method: 'DELETE',
    });
  }

  // Follow-ups
  getFollowUps() {
    return this.request('/followup');
  }

  createFollowUp(data) {
    return this.request('/followup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateFollowUp(id, updates) {
    return this.request(`/followup/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  deleteFollowUp(id) {
    return this.request(`/followup/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin
  // AI assistant & support tickets
  assistantStatus() {
    return this.request('/support/assistant/status');
  }

  assistantChat(messages) {
    return this.request('/support/assistant/chat', { method: 'POST', body: JSON.stringify({ messages }) });
  }

  listTickets(status = 'all') {
    return this.request(`/support/tickets?status=${encodeURIComponent(status)}`);
  }

  getTicket(id) {
    return this.request(`/support/tickets/${id}`);
  }

  createTicket(data) {
    return this.request('/support/tickets', { method: 'POST', body: JSON.stringify(data) });
  }

  replyTicket(id, body) {
    return this.request(`/support/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) });
  }

  updateTicket(id, data) {
    return this.request(`/support/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  getMyUsage() {
    return this.request('/admin/my-usage');
  }

  getDailyReport(date) {
    return this.request(`/analytics/daily-report${date ? `?date=${encodeURIComponent(date)}` : ''}`);
  }

  getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/users${query ? `?${query}` : ''}`);
  }

  createUser(userData) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  updateUser(userId, updates) {
    return this.request(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  deleteUser(userId) {
    return this.request(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  updateUserRole(userId, role, department) {
    return this.request(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role, department }),
    });
  }

  toggleUserStatus(userId) {
    return this.request(`/admin/users/${userId}/status`, {
      method: 'PATCH',
    });
  }

  getSystemHealth() {
    return this.request('/admin/health');
  }

  getAuditLogs() {
    return this.request('/admin/audit-logs');
  }

  updateSettings(settings) {
    return this.request('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  // Email Marketing (premium, owner-only)
  getEmailStatus() {
    return this.request('/email/status');
  }

  getEmailSettings() {
    return this.request('/email/settings');
  }

  saveEmailSettings(data) {
    return this.request('/email/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  testEmailSettings(data = {}) {
    return this.request('/email/settings/test', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getEmailTags() {
    return this.request('/email/tags');
  }

  previewEmailAudience(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/email/audience/preview${query ? `?${query}` : ''}`);
  }

  getEmailCampaigns() {
    return this.request('/email/campaigns');
  }

  getEmailCampaign(id) {
    return this.request(`/email/campaigns/${id}`);
  }

  createEmailCampaign(data) {
    return this.request('/email/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  sendEmailCampaign(id, data = {}) {
    return this.request(`/email/campaigns/${id}/send`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  sendEmailCampaignTest(data) {
    return this.request('/email/campaigns/test', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  deleteEmailCampaign(id) {
    return this.request(`/email/campaigns/${id}`, {
      method: 'DELETE',
    });
  }

  // Notifications API
  getNotifications() {
    return this.request('/notifications');
  }

  markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  markAllNotificationsRead() {
    return this.request('/notifications/read-all', {
      method: 'PATCH',
    });
  }
}

export const api = new ApiClient();
