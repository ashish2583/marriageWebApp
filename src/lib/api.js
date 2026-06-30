import apiClient, {API_BASE_URL, getApiError} from '../api/axiosInstance';
import {endpoints} from '../api/endpoints';
import {unwrap} from '../api/apiUtils';

export {API_BASE_URL, endpoints, unwrap};

const emitApiLoading = active => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('merrage:api-loading', {detail: {active}}));
  }
};

const isAuthDenied = message =>
  /access denied|auth token|unauthorized|jwt|token/i.test(String(message || ''));

const notifyUnauthorized = () => {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.dispatchEvent(new Event('merrage:unauthorized'));
  }
};

const fetchFormDataRequest = async (path, {method, body, token}) => {
  const url = /^https?:\/\//i.test(path)
    ? path
    : `${API_BASE_URL.replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;
  const headers = {Accept: 'application/json'};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['Auth-token'] = token;
  }
  const response = await fetch(url, {method, headers, body});
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {message: text};
  }
  if (!response.ok || data?.status === false) {
    throw new Error(data?.message || data?.error?.[0]?.message || data?.error?.message || data?.error || `Request failed (${response.status})`);
  }
  return data;
};

export async function apiRequest(path, {method = 'GET', body, token, authRequired = true} = {}) {
  emitApiLoading(true);
  try {
    const config = {method, url: path};
    if (token) {
      config.headers = {
        Authorization: `Bearer ${token}`,
        'Auth-token': token,
      };
    }
    if (body instanceof FormData) {
      config.data = body;
    } else if (typeof body === 'string') {
      config.data = JSON.parse(body || '{}');
    } else if (body) {
      config.data = body;
    }
    const response = await apiClient(config);
    if (response.data?.status === false) {
      const message = response.data?.message || 'Request failed';
      if (authRequired && isAuthDenied(message)) notifyUnauthorized();
      throw new Error(message);
    }
    return response.data;
  } catch (error) {
    if (body instanceof FormData && method !== 'GET' && error?.message === 'Network Error') {
      try {
        return await fetchFormDataRequest(path, {method, body, token});
      } catch (fetchError) {
        const message = getApiError(fetchError, 'Request failed');
        if (authRequired && isAuthDenied(message)) notifyUnauthorized();
        throw new Error(message);
      }
    }
    const message = getApiError(error, 'Request failed');
    if (authRequired && isAuthDenied(message)) notifyUnauthorized();
    throw new Error(message);
  } finally {
    emitApiLoading(false);
  }
}
