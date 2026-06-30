import apiClient from './axiosInstance';
import {extractList, unwrap} from './apiUtils';
import {endpoints} from './endpoints';

export const getCategories = async () => unwrap(await apiClient.get(endpoints.categories));

export const getVendorsByCategory = async catId =>
  unwrap(await apiClient.get(`${endpoints.vendorsByCategory}${catId}`));

export const getProductsByCustomer = async ({venderUserId, catId}) =>
  unwrap(await apiClient.post(endpoints.customerProducts, {venderUserId, catId}));

export const checkBooking = body => apiClient.post(endpoints.checkBooking, body);

export const addCart = body => apiClient.post(endpoints.addCart, body);

export const getCart = async userId => extractList(await apiClient.get(`${endpoints.cart}${userId}`));

export const updateCart = (cartId, body) => apiClient.put(`${endpoints.updateCart}${cartId}`, body);

export const deleteCart = cartId => apiClient.delete(`${endpoints.deleteCart}${cartId}`);

export const deleteUserCart = userId => apiClient.delete(`${endpoints.deleteUserCart}${userId}`);

export const createBooking = formData => apiClient.post(endpoints.createBooking, formData);

export const getOrders = async userId => extractList(await apiClient.get(`${endpoints.orders}${userId}`));

export const submitSupportQuery = body => apiClient.post(endpoints.support, body);
