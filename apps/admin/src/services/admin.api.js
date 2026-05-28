// ============================================================
// Admin Console — API Service
// Wraps all backend Super Admin operations.
// ============================================================

import { apiGet, apiPost, apiPatch } from './api-client';

// ---- Dashboard ----
export const getPlatformStats = () => apiGet('/api/v1/admin/dashboard/stats');
export const getOrdersFeed = (limit = 20) => apiGet(`/api/v1/admin/dashboard/orders-feed?limit=${limit}`);

// ---- Store Management ----
export const getStores = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.state) qs.set('state', params.state);
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiGet(`/api/v1/admin/stores${query ? `?${query}` : ''}`);
};

export const getStore = (code) => apiGet(`/api/v1/admin/stores/${code}`);

export const updateStoreStatus = (code, status) => apiPatch(`/api/v1/admin/stores/${code}/status`, { status });

export const assignSellerToStore = (code, payload) => apiPost(`/api/v1/admin/stores/${code}/assign-seller`, payload);

// ---- User Management ----
export const getUsers = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.role) qs.set('role', params.role);
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiGet(`/api/v1/admin/users${query ? `?${query}` : ''}`);
};

export const getUser = (uid) => apiGet(`/api/v1/admin/users/${uid}`);

export const updateUserRole = (uid, role, linkedPmbjkCode) => apiPatch(`/api/v1/admin/users/${uid}/role`, { role, linked_pmbjk_code: linkedPmbjkCode });

export const suspendUser = (uid, suspend) => apiPost(`/api/v1/admin/users/${uid}/suspend`, { suspend });

// ---- Global Order Operations ----
export const getAllOrders = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.pmbjk_code) qs.set('pmbjk_code', params.pmbjk_code);
  if (params.date_from) qs.set('date_from', params.date_from);
  if (params.date_to) qs.set('date_to', params.date_to);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiGet(`/api/v1/admin/orders${query ? `?${query}` : ''}`);
};

export const getOrderDetails = (id) => apiGet(`/api/v1/admin/orders/${id}`);

export const overrideOrderStatus = (id, status, notes) => apiPatch(`/api/v1/admin/orders/${id}/override`, { status, notes });

// ---- Catalog Management ----
export const getCatalogStats = () => apiGet('/api/v1/admin/catalog/stats');

// ---- Health Check ----
export const getSystemHealth = () => apiGet('/api/v1/health');

