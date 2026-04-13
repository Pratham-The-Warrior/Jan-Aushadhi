// ============================================================
// Stores API — PMBJK store discovery endpoints
// Maps to backend Stores module
// ============================================================

import { apiGet } from './api-client';

/**
 * Find stores near a GPS location.
 * @param {number} lat    - Latitude
 * @param {number} lng    - Longitude
 * @param {number} [radius=10000] - Search radius in meters
 */
export async function getNearbyStores(lat, lng, radius = 10000) {
  return apiGet(`/api/v1/stores/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
}

/**
 * Find stores by Indian pincode.
 * @param {string} pincode - 6-digit pincode
 */
export async function getStoresByPincode(pincode) {
  return apiGet(`/api/v1/stores/by-pincode?pincode=${pincode}`);
}

/**
 * Get a single store by PMBJK code.
 * @param {string} pmbjkCode - Unique PMBJK identifier
 */
export async function getStoreByCode(pmbjkCode) {
  return apiGet(`/api/v1/stores/${pmbjkCode}`);
}

/**
 * Get all states with registered PMBJK Kendras.
 */
export async function getStoreStates() {
  return apiGet('/api/v1/stores/states');
}

/**
 * Find stores by state and district.
 * @param {string} state    - Indian state name
 * @param {string} district - District name
 */
export async function getStoresByDistrict(state, district) {
  return apiGet(`/api/v1/stores/by-district?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`);
}
