// ============================================================
// Seller Central — API Service
// All seller-specific API calls mapped to backend endpoints.
// ============================================================

import { apiGet, apiPost, apiPut, apiPatch } from './api-client';

// ---- Store Profile ----
export const getProfile = () => apiGet('/api/v1/seller/profile');
export const updateProfile = (data) => apiPut('/api/v1/seller/profile', data);

// ---- Orders ----
export const getOrders = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiGet(`/api/v1/seller/orders${query ? `?${query}` : ''}`);
};
export const getOrder = (id) => apiGet(`/api/v1/seller/orders/${id}`);
export const updateOrderStatus = (id, status, notes) => apiPatch(`/api/v1/seller/orders/${id}/status`, { status, notes });
export const rejectOrder = (id, reason) => apiPost(`/api/v1/seller/orders/${id}/reject`, { reason });

// ---- Inventory ----
export const getInventory = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiGet(`/api/v1/seller/inventory${query ? `?${query}` : ''}`);
};
export const updateInventoryItem = (drugCode, inStock) => apiPatch(`/api/v1/seller/inventory/${drugCode}`, { in_stock: inStock });
export const bulkUpdateInventory = (updates) => apiPost('/api/v1/seller/inventory/bulk', { updates });

// ---- Analytics ----
export const getAnalyticsSummary = () => apiGet('/api/v1/seller/analytics/summary');
export const getDailyAnalytics = () => apiGet('/api/v1/seller/analytics/daily');
export const exportOrders = () => apiGet('/api/v1/seller/reports/export');
