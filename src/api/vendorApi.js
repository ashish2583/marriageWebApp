import apiClient from './axiosInstance';
import {extractList, unwrap} from './apiUtils';
import {endpoints} from './endpoints';

export const getVendorProducts = async userId =>
  unwrap(await apiClient.post(endpoints.vendorProducts, {userId}));

export const createProduct = formData => apiClient.post(endpoints.createProduct, formData);

export const updateProduct = (id, formData) => apiClient.put(`${endpoints.editProduct}${id}`, formData);

export const deleteProduct = id => apiClient.delete(`${endpoints.deleteProduct}${id}`);

export const deleteProductMedia = (id, body) => apiClient.put(`${endpoints.deleteProductMedia}${id}`, body);

export const createCategory = formData => apiClient.post(endpoints.createCategory, formData);

export const getVendorOrderProducts = async vendorId =>
  extractList(await apiClient.get(`${endpoints.vendorOrderProducts}${vendorId}`), [
    'vendorOrderProducts',
    'orders',
  ]);

export const updateVendorStatus = body => apiClient.post(endpoints.updateVendorStatus, body);

export const updateVendorImageServer = formData =>
  apiClient.post(endpoints.updateVendorImageServer, formData);
