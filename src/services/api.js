import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://YOUR_RENDER_URL'; // Render URL'ini buraya yaz

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
});

// Session cookie'yi AsyncStorage'da sakla
api.interceptors.request.use(async (config) => {
  const cookie = await AsyncStorage.getItem('session_cookie');
  if (cookie) config.headers.Cookie = cookie;
  return config;
});

api.interceptors.response.use(
  (response) => {
    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      const cookie = setCookie[0]?.split(';')[0];
      if (cookie) AsyncStorage.setItem('session_cookie', cookie);
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  login: (contact, password) => api.post('/api/auth/login', { contact, password }),
  register: (data) => api.post('/api/auth/register', data),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
  saveFcmToken: (token) => api.post('/api/auth/fcm-token', { token }),
};

export const waAPI = {
  connect: () => api.post('/api/wa/connect'),
  pairing: (phoneNumber) => api.post('/api/wa/pairing', { phoneNumber }),
  status: () => api.get('/api/wa/status'),
};

export const messagesAPI = {
  getAll: () => api.get('/api/messages'),
  markRead: (id) => api.post(`/api/messages/${id}/read`),
  clear: () => api.delete('/api/messages'),
};

export const settingsAPI = {
  get: () => api.get('/api/settings'),
  save: (settings) => api.post('/api/settings', settings),
};

export { API_URL };
export default api;
