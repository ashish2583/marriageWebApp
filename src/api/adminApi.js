import apiClient from './axiosInstance';
import {extractList, unwrap} from './apiUtils';
import {endpoints} from './endpoints';

export const getAdminDashboard = async () => unwrap(await apiClient.get(endpoints.adminDashboard));

export const getAdminOrders = async () =>
  extractList(await apiClient.get(endpoints.adminOrders), ['orders']);

export const getAdminVendors = async (status = 'all') => {
  const endpoint =
    status === 'active'
      ? endpoints.adminActiveVendors
      : status === 'inactive'
        ? endpoints.adminInactiveVendors
        : endpoints.adminVendors;
  return extractList(await apiClient.get(endpoint), ['vendors']);
};

export const getAdminCustomers = async () =>
  extractList(await apiClient.get(endpoints.adminCustomers), ['customers']);

export const getAdminCategories = async () =>
  extractList(await apiClient.get(endpoints.adminCategories), ['categories']);

export const getAdminProducts = async () =>
  extractList(await apiClient.get(endpoints.adminProducts), ['products']);

export const getAdminPayments = async () =>
  extractList(await apiClient.get(endpoints.adminPayments), ['payments']);

export const getAdminQueries = async () =>
  extractList(await apiClient.get(endpoints.adminQueries), ['queries']);

export const updateAdminResource = (endpoint, body, method = 'post') =>
  apiClient[method](endpoint, body);
