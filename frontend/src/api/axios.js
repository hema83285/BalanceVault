import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request interceptor: attach JWT ─────────────────
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: normalize errors ──────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired — clear and redirect to login
      clearToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Token helpers (in-memory + sessionStorage fallback) ─
let _token = null;

export function setToken(token) {
  _token = token;
  // sessionStorage so it clears when tab closes (more secure than localStorage)
  if (token) sessionStorage.setItem('bv_token', token);
  else sessionStorage.removeItem('bv_token');
}

export function getToken() {
  return _token || sessionStorage.getItem('bv_token');
}

export function clearToken() {
  _token = null;
  sessionStorage.removeItem('bv_token');
}

export default api;
