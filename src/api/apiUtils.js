export const unwrap = response => {
  const payload = response?.data ?? response;
  return payload?.data?.user || payload?.data || payload?.user || payload || {};
};

export const extractList = (response, keys = []) => {
  const payload = response?.data ?? response;
  const data = payload?.data ?? payload;

  if (Array.isArray(data)) return data;

  const listKeys = [
    ...keys,
    'categories',
    'category',
    'cats',
    'vendors',
    'users',
    'products',
    'orders',
    'bookings',
    'cart',
    'items',
    'docs',
  ];

  for (const key of listKeys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  return (
    data?.data ||
    payload?.data ||
    []
  );
};

export const extractToken = response => {
  const payload = response?.data ?? response;
  return (
    response?.token ||
    response?.accessToken ||
    response?.authToken ||
    response?.jwt ||
    payload?.token ||
    payload?.accessToken ||
    payload?.authToken ||
    payload?.jwt ||
    payload?.data?.token ||
    payload?.data?.accessToken ||
    payload?.data?.authToken ||
    payload?.data?.user?.token ||
    payload?.data?.user?.accessToken ||
    payload?.data?.user?.authToken ||
    payload?.user?.token ||
    payload?.user?.accessToken ||
    payload?.user?.authToken ||
    ''
  );
};

export const normalizeRole = (value = '') => {
  const role = String(value || '').toLowerCase();
  if (role.includes('admin')) return 'admin';
  if (role.includes('vendor') || role.includes('vender')) return 'vendor';
  return 'customer';
};
