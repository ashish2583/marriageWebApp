export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://marrige-item.vercel.app';

export const endpoints = {
  register: 'api/auth/register',
  login: 'api/auth/login',
  forgotPassword: 'api/auth/forgot-password',
  verifyOtp: 'api/auth/otp-verification',
  resetPassword: 'api/auth/reset-password',
  profile: 'api/userData/userData',
  editProfile: 'api/userData/edit-profile',
  changePassword: 'api/userData/change-password/',
  categories: 'api/category/getAllCat',
  userCategories: 'api/category/getAllCatByUser',
  createCategory: 'api/category/createCat',
  vendorsByCategory: 'api/userData/getAllUserByCat?catId=',
  createProduct: 'api/product/createPro',
  customerProducts: 'api/product/productByCustomer',
  vendorProducts: 'api/product/productByVendor',
  editProduct: 'api/product/edit/',
  deleteProduct: 'api/product/deletePro/',
  deleteProductMedia: 'api/product/delete-product-media/',
  uploadImage: 'api/product/uplodeImage',
  uploadVideo: 'api/product/uplodeVideo',
  checkBooking: 'api/order/check_booking',
  createBooking: 'api/order/create_booking',
  orders: 'api/order/my-orders/',
  addCart: 'api/cart/addCart',
  cart: 'api/cart/getAllCart/',
  deleteCart: 'api/cart/delete/',
  updateCart: 'api/cart/update/',
  deleteUserCart: 'api/cart/delete-user-cart/',
  support: 'api/userQury/submitQury',
  uploadBulkImage: 'api/uploadeImage/uploadeImage',
  deleteImage: 'api/uploadeImage/deleteImage/',
};

const buildUrl = path =>
  `${API_BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

export async function apiRequest(path, {method = 'GET', token, body} = {}) {
  const isForm = body instanceof FormData;
  const headers = {Accept: 'application/json'};
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers,
      body,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok || data?.status === false) {
    throw new Error(data?.message || data?.error?.[0]?.message || 'Request failed');
  }
  return data;
}

export const unwrap = response =>
  response?.data?.user || response?.data || response?.user || response || {};
