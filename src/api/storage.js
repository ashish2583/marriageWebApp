export const SESSION_KEY = 'merrage-web-session';
export const TOKEN_KEY = 'merrage-web-token';
export const USER_KEY = 'merrage-web-user';

export function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function getCurrentUser() {
  return (
    readJson(USER_KEY) ||
    readJson(SESSION_KEY)?.user ||
    readSessionJson(sessionStorage, USER_KEY) ||
    readSessionJson(sessionStorage, SESSION_KEY)?.user ||
    null
  );
}

export function saveSession(session, remember = true) {
  const storage = remember ? localStorage : sessionStorage;
  clearSession();
  if (!session) return;
  storage.setItem(TOKEN_KEY, session.token || '');
  storage.setItem(USER_KEY, JSON.stringify(session.user || {}));
  storage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession() {
  const local = readJson(SESSION_KEY);
  if (local) return local;
  return readSessionJson(sessionStorage, SESSION_KEY);
}

function readSessionJson(storage, key) {
  try {
    return JSON.parse(storage.getItem(key)) || null;
  } catch {
    return null;
  }
}

export function clearSession() {
  [localStorage, sessionStorage].forEach(storage => {
    storage.removeItem(SESSION_KEY);
    storage.removeItem(TOKEN_KEY);
    storage.removeItem(USER_KEY);
  });
}
