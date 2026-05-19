import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 30000,
});

// ── Token management ───────────────────────────────────────────

export const getAccessToken  = () => localStorage.getItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');
export const setTokens = (access, refresh) => {
  localStorage.setItem('access_token',  access);
  localStorage.setItem('refresh_token', refresh);
};
export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};

// ── Axios interceptors ─────────────────────────────────────────

api.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = getRefreshToken();
        if (!refresh) throw new Error('No refresh token');
        const { data } = await axios.post('/api/auth/refresh', { refresh_token: refresh });
        setTokens(data.access_token, data.refresh_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        clearTokens();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);


// ── Auth ──────────────────────────────────────────────────────

export const authAPI = {
  register: (data)         => api.post('/api/auth/register', data),
  login:    (data)         => api.post('/api/auth/login', data),
  logout:   (refreshToken) => api.post('/api/auth/logout', { refresh_token: refreshToken }),
  me:       ()             => api.get('/api/auth/me'),
};

// ── Preferences ───────────────────────────────────────────────

export const prefsAPI = {
  get:  ()     => api.get('/api/preferences'),
  save: (data) => api.post('/api/preferences', data),
};

// ── Destinations ──────────────────────────────────────────────

export const destAPI = {
  list:        (params) => api.get('/api/destinations', { params }),
  search:      (params) => api.get('/api/destinations/search', { params }),
  get:         (id)     => api.get(`/api/destinations/${id}`),
  ingest:      ()       => api.post('/api/destinations/ingest', {}),
  vectorCount: ()       => api.get('/api/destinations/vector/count'),
};

// ── Itineraries ───────────────────────────────────────────────

export const itinAPI = {
  generate:  (data)        => api.post('/api/itineraries/generate', data),
  list:      (params)      => api.get('/api/itineraries', { params }),
  get:       (id)          => api.get(`/api/itineraries/${id}`),
  update:    (id, data)    => api.patch(`/api/itineraries/${id}`, data),
  delete:    (id)          => api.delete(`/api/itineraries/${id}`),
};

export default api;
