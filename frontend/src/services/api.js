// ============================================================
// API Service — Centralized HTTP client for all backend calls
// ============================================================

import useAuthStore from '../store/authStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getAuthToken() {
  return useAuthStore.getState().token;
}

function authHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

// Module 3: Medicine Discovery
export async function searchMedicines(query) {
  const res = await fetch(`${API_BASE}/api/v1/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function getDiscovery(brandedId) {
  const res = await fetch(`${API_BASE}/api/v1/discovery/${brandedId}`);
  if (!res.ok) throw new Error('Discovery failed');
  return res.json();
}

// Module 4: Store Locator
export async function getNearbyStores(lat, lng, radius = 10000) {
  const res = await fetch(`${API_BASE}/api/v1/stores/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
  if (!res.ok) throw new Error('Store lookup failed');
  return res.json();
}

export async function getStoreByCode(pmbjkCode) {
  const res = await fetch(`${API_BASE}/api/v1/stores/${pmbjkCode}`);
  if (!res.ok) throw new Error('Store not found');
  return res.json();
}

// Module 5: Requirements / Checkout
export async function createRequirement(data) {
  const res = await fetch(`${API_BASE}/api/v1/requirements/create`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Checkout failed');
  return res.json();
}

export async function getRequirements() {
  const res = await fetch(`${API_BASE}/api/v1/requirements`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch requirements');
  return res.json();
}

// Module 6: Dashboard
export async function getUserDashboard() {
  const res = await fetch(`${API_BASE}/api/v1/user/dashboard`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Dashboard fetch failed');
  return res.json();
}

export async function getUserProfile() {
  const res = await fetch(`${API_BASE}/api/v1/user/profile`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Profile fetch failed');
  return res.json();
}

export async function updateMedicalBasket(basket) {
  const res = await fetch(`${API_BASE}/api/v1/user/basket`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ medical_basket: basket }),
  });
  if (!res.ok) throw new Error('Basket update failed');
  return res.json();
}

// Cart Sync Helper
export async function syncCart(items) {
  const res = await fetch(`${API_BASE}/api/v1/user/basket`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ medical_basket: items }),
  });
  if (!res.ok) throw new Error('Sync failed');
  return res.json();
}

// Health check
export async function healthCheck() {
  const res = await fetch(`${API_BASE}/api/v1/health`);
  return res.json();
}
