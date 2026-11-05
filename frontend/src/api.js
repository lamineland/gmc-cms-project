import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1' });

export const tokens = {
  get access() { return localStorage.getItem('accessToken'); },
  get refresh() { return localStorage.getItem('refreshToken'); },
  set({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  },
  clear() { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); },
};

api.interceptors.request.use((config) => {
  if (tokens.access) config.headers.Authorization = `Bearer ${tokens.access}`;
  return config;
});

// On 401, try the refresh token once and replay the request.
let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && !original._retry && tokens.refresh && !isAuthCall) {
      original._retry = true;
      refreshing = refreshing || axios.post('/api/v1/auth/refresh', { refreshToken: tokens.refresh }).finally(() => { refreshing = null; });
      try {
        const { data } = await refreshing;
        tokens.set(data.data);
        return api(original);
      } catch (e) {
        tokens.clear();
        window.dispatchEvent(new Event('auth:logout'));
      }
    }
    return Promise.reject(error);
  }
);

export const errorMessage = (e) =>
  e.response?.data?.errors?.map((x) => x.message).join('. ') || e.response?.data?.message || e.message || 'Something went wrong';

export default api;
