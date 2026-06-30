import axios from 'axios';
import {clearSession, getToken} from './storage';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://marrige-item.vercel.app/';

const apiClient = axios.create({
  baseURL: API_BASE_URL.replace(/\/+$/, ''),
  timeout: 60000,
  headers: {
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['Auth-token'] = token;
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error?.response?.status === 401) {
      clearSession();
      if (window.location.pathname !== '/login') {
        window.dispatchEvent(new Event('merrage:unauthorized'));
      }
    }
    return Promise.reject(error);
  },
);

export function getApiError(error, fallback = 'Something went wrong') {
  if (error?.message === 'Network Error') {
    return 'Network error. Please check API server/CORS and internet connection, then try again.';
  }
  const data = error?.response?.data;
  return (
    data?.message ||
    data?.error?.[0]?.message ||
    data?.error?.message ||
    data?.error ||
    error?.message ||
    fallback
  );
}

export default apiClient;
