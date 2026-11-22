/**
 * REST API Client for Validation Engine Platform
 * Handles communication with Express backend.
 */

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.error || data?.message || `Request failed with status ${res.status}`;
      const error = new Error(errorMsg);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Unable to connect to Validation Engine backend. Ensure backend server is running on port 5000.');
    }
    throw err;
  }
}

export const api = {
  // Health & Database Diagnostics
  getHealth: () => request('/health'),
  getDbStatus: () => request('/db/status'),
  configureDb: (uri) => request('/db/configure', {
    method: 'POST',
    body: JSON.stringify({ uri })
  }),

  // Header Validation (Module 1, 2, 4)
  validateHeaders: (rawHeaders, source = 'manual') => request('/headers/validate', {
    method: 'POST',
    body: JSON.stringify({ rawHeaders, source })
  }),
  getHeaderHistory: (limit = 50, skip = 0) => request(`/headers/history?limit=${limit}&skip=${skip}`),
  getHeaderInspectionById: (id) => request(`/headers/history/${id}`),
  deleteHeaderInspection: (id) => request(`/headers/history/${id}`, { method: 'DELETE' }),

  // Cookie Validation & State Management (Module 2, 3)
  validateCookie: (cookieData) => request('/cookies/validate', {
    method: 'POST',
    body: JSON.stringify(cookieData)
  }),
  createCookie: (cookieData) => request('/cookies/create', {
    method: 'POST',
    body: JSON.stringify(cookieData)
  }),
  transitionCookie: (id, action, triggeredBy = 'ui_controller') => request(`/cookies/${id}/transition`, {
    method: 'PUT',
    body: JSON.stringify({ action, triggeredBy })
  }),
  getCookies: (state = null) => request(state ? `/cookies?state=${state}` : '/cookies'),
  getCookieById: (id) => request(`/cookies/${id}`),
  deleteCookie: (id) => request(`/cookies/${id}`, { method: 'DELETE' }),

  // DFA Theoretical State Machine (Module 3)
  getDfaDefinition: () => request('/dfa/definition'),
  simulateDfa: (actions, initialState = 'START') => request('/dfa/simulate', {
    method: 'POST',
    body: JSON.stringify({ actions, initialState })
  }),
  getDfaLogs: (limit = 50) => request(`/dfa/logs?limit=${limit}`),

  // Security Deep Scanner (Module 4)
  scanSecurity: (payload) => request('/security/scan', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  // Dashboard Aggregates (Module 5)
  getDashboardStats: () => request('/dashboard/stats'),
  getRecentActivity: () => request('/dashboard/recent-activity')
};

export default api;
