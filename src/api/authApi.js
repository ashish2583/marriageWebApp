import apiClient from './axiosInstance';
import {endpoints} from './endpoints';
import {extractToken, normalizeRole, unwrap} from './apiUtils';
import {clearSession, getCurrentUser, getToken, saveSession} from './storage';

export async function login({phone, password, role, remember = true}) {
  const {data} = await apiClient.post(endpoints.login, {
    phone: phone.toString(),
    password: password.toString(),
    // Mirrors the mobile request shape. FCM is mobile-only, so web sends blank values.
    deviceInfo: {
      fcmtoken: ' ',
      devicetype: 'web',
      devicename: window.navigator.userAgent,
    },
  });

  if (data?.status === false) {
    throw new Error(data?.message || 'Login failed');
  }

  const token = extractToken(data);
  if (!token) {
    throw new Error('Login succeeded but no auth token was returned. Please try signing in again.');
  }

  const user = {
    ...unwrap(data),
    role: normalizeRole(unwrap(data)?.role || role),
  };

  if (role && user.role !== normalizeRole(role)) {
    throw new Error(`This account is registered as ${user.role}. Select the matching role to continue.`);
  }

  const session = {user, token};
  saveSession(session, remember);
  return session;
}

export async function registerAccount(form) {
  const body = new FormData();
  Object.entries(form).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') body.append(key, value);
  });
  body.append(
    'deviceInfo',
    JSON.stringify({
      devicetype: 'web',
      fcmtoken: ' ',
      devicename: window.navigator.userAgent,
      devicelatitude: '',
      devicelongitude: '',
    }),
  );
  const {data} = await apiClient.post(endpoints.register, body);
  return data;
}

export async function forgotPassword(email) {
  const {data} = await apiClient.post(endpoints.forgotPassword, {email});
  return data;
}

export function logout() {
  clearSession();
}

export function hasRole(role) {
  return normalizeRole(getCurrentUser()?.role) === normalizeRole(role);
}

export {getCurrentUser, getToken};
