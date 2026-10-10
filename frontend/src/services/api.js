/**
 * Production-ready API client for OneRoot Sales CRM
 * Includes automatic auth headers, response time metrics, and fallback handling
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://crm-ep4i.onrender.com/api/v1';

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
    try {
      const sessionStr = localStorage.getItem('crm_user_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session?.user?.id) headers['x-user-id'] = session.user.id;
      }
    } catch (e) {}
    return headers;
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
      const response = await fetch(url, config);
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
        throw new Error(data?.message || `HTTP error! status: ${response.status}`);
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
        const netErr = new Error('Network connection issue or backend server is spinning up. Local offline mode enabled.');
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

  // MyDays
  getMyDays() {
    return this.request('/mydays');
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
