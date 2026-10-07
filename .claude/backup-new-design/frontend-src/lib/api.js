/**
 * API client. Every request carries the session token; a 401 signs the user out
 * (via the 'crm:unauthorized' event) instead of leaving a broken, half-signed-in screen.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const TOKEN_KEY = 'crm_token';

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable: session lasts until reload */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

// Browser timezone offset (minutes east of UTC) so "today" on the server matches the user's today
const TZ = String(-new Date().getTimezoneOffset());

const request = async (method, path, { body, query, raw } = {}) => {
  const params = new URLSearchParams({ ...(query || {}), tz: TZ });
  for (const [k, v] of [...params.entries()]) if (v === '' || v === 'undefined') params.delete(k);
  const token = tokenStore.get();

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}?${params}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your internet connection and try again.', 0);
  }

  if (raw && res.ok) return res;

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith('/auth/login')) {
      window.dispatchEvent(new CustomEvent('crm:unauthorized', { detail: data?.message }));
    }
    throw new ApiError(data?.message || `Request failed (${res.status})`, res.status, data?.errors);
  }
  return data?.data;
};

const get = (path, query) => request('GET', path, { query });
const post = (path, body) => request('POST', path, { body: body ?? {} });
const patch = (path, body) => request('PATCH', path, { body });
const del = (path) => request('DELETE', path);

export const api = {
  publicPricing: () => get('/public/pricing'),

  // Auth
  login: (email, password) => post('/auth/login', { email, password }),
  register: (data) => post('/auth/register', data),
  me: () => get('/auth/me'),
  updateProfile: (data) => patch('/auth/profile', data),
  logoutAll: () => post('/auth/logout-all'),

  // Leads
  leads: (query) => get('/leads', query),
  lead: (id) => get(`/leads/${id}`),
  createLead: (data) => post('/leads', data),
  updateLead: (id, data) => patch(`/leads/${id}`, data),
  deleteLead: (id) => del(`/leads/${id}`),
  logActivity: (id, data) => post(`/leads/${id}/activities`, data),
  trash: () => get('/leads/trash'),
  restoreLead: (id) => post(`/leads/${id}/restore`),
  purgeLead: (id) => del(`/leads/${id}/purge`),
  importLeads: (leads) => post('/leads/import', { leads }),
  exportLeads: async () => {
    const res = await request('GET', '/leads/export', { raw: true });
    return res.blob();
  },

  // Tasks
  tasks: (query) => get('/tasks', query),
  createTask: (data) => post('/tasks', data),
  updateTask: (id, data) => patch(`/tasks/${id}`, data),
  deleteTask: (id) => del(`/tasks/${id}`),

  // Reports
  today: (query) => get('/reports/today', query),
  activity: (query) => get('/activity', query),
  dailyReport: (query) => get('/reports/daily', query),
  outreachReport: (query) => get('/reports/outreach', query),
  analytics: (query) => get('/analytics', query),

  // Company
  company: () => get('/company'),
  members: () => get('/company/members'),
  updateCompany: (data) => patch('/company', data),
  addListItem: (list, value) => post(`/company/lists/${list}`, { value }),

  // Team (owner)
  team: () => get('/team'),
  addMember: (data) => post('/team', data),
  updateMember: (id, data) => patch(`/team/${id}`, data),
  deactivateMember: (id, transferTo) => post(`/team/${id}/deactivate`, transferTo ? { transfer_to: transferTo } : {}),
  activateMember: (id) => post(`/team/${id}/activate`),
  resetMemberPassword: (id, password) => post(`/team/${id}/reset-password`, { password }),
  auditLog: () => get('/team/audit-log'),

  // Notifications
  notifications: () => get('/notifications'),
  readNotification: (id) => post(`/notifications/${id}/read`),
  readAllNotifications: () => post('/notifications/read-all'),
};
