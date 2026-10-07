/**
 * Platform admin API client. Uses only the /platform endpoints plus /auth/admin-login.
 * Every request carries the platform token; any 401 dispatches 'platform:unauthorized'
 * so the app signs out with a message instead of showing a half-signed-in screen.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/+$/, '');
const TOKEN_KEY = 'crm_platform_token';

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
      return true;
    } catch {
      // Storage blocked (private mode): the session lasts until the page is reloaded.
      return false;
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Storage blocked: nothing was saved, so there is nothing to remove.
    }
  },
};

// In-memory copy so the session still works when localStorage is unavailable.
let memoryToken = null;
export const setSessionToken = (token) => {
  memoryToken = token;
  if (token) tokenStore.set(token);
  else tokenStore.clear();
};
const currentToken = () => memoryToken || tokenStore.get();

const request = async (method, path, { body, query } = {}) => {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  const token = currentToken();

  const init = {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}${qs ? `?${qs}` : ''}`, init);
  } catch {
    throw new ApiError('Cannot reach the server. Check your internet connection and try again.', 0);
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null; // Non-JSON response (e.g. a proxy error page)
  }

  if (!res.ok) {
    const message = payload?.message || `Request failed (${res.status})`;
    if (res.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new CustomEvent('platform:unauthorized', { detail: message }));
    }
    throw new ApiError(message, res.status, payload?.errors);
  }
  return payload?.data;
};

const get = (path, query) => request('GET', path, { query });
const post = (path, body) => request('POST', path, { body: body ?? {} });
const patch = (path, body) => request('PATCH', path, { body });

export const api = {
  login: (username, password) => post('/auth/admin-login', { username, password }),

  overview: () => get('/platform/overview'),
  health: () => get('/platform/health'),

  companies: (query) => get('/platform/companies', query),
  company: (id) => get(`/platform/companies/${encodeURIComponent(id)}`),
  updateCompany: (id, data) => patch(`/platform/companies/${encodeURIComponent(id)}`, data),
  recordPayment: (id, data) => post(`/platform/companies/${encodeURIComponent(id)}/payments`, data),

  notifications: () => get('/platform/notifications'),
  sendNotification: (data) => post('/platform/notifications', data),
  remindExpiring: () => post('/platform/notifications/expiring'),

  users: (query) => get('/platform/users', query),
  updateUser: (id, data) => patch(`/platform/users/${encodeURIComponent(id)}`, data),

  settings: () => get('/platform/settings'),
  updateSettings: (data) => patch('/platform/settings', data),
};
