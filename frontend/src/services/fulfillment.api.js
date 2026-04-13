// ============================================================
// Fulfillment API — Requirements, dashboard, and user endpoints
// Maps to backend Fulfillment module
// ============================================================

import { apiGet, apiPost, apiPut } from './api-client';

// ---- Requirements ----

/**
 * Create a new requirement ticket (checkout).
 * @param {object} data - Checkout payload
 */
export async function createRequirement(data) {
  return apiPost('/api/v1/requirements/create', data, true);
}

/**
 * Get user's requirements history.
 */
export async function getRequirements() {
  return apiGet('/api/v1/requirements', true);
}

/**
 * Generate a WhatsApp deep-link for a requirement.
 * @param {string} requirementId - Unique ticket ID
 */
export async function getWhatsAppLink(requirementId) {
  return apiGet(`/api/v1/requirements/${requirementId}/whatsapp-link`, true);
}

// ---- Dashboard ----

/**
 * Get aggregated dashboard stats for the authenticated user.
 */
export async function getUserDashboard() {
  return apiGet('/api/v1/user/dashboard', true);
}

/**
 * Get monthly savings chart data.
 */
export async function getDashboardMonthly() {
  return apiGet('/api/v1/user/dashboard/monthly', true);
}

// ---- User Profile ----

/**
 * Get user profile.
 */
export async function getUserProfile() {
  return apiGet('/api/v1/user/profile', true);
}

/**
 * Update the user's medical basket.
 * @param {Array} basket - Cart items array
 */
export async function updateMedicalBasket(basket) {
  return apiPut('/api/v1/user/basket', { medical_basket: basket }, true);
}

/**
 * Sync cart items to server (alias for updateMedicalBasket).
 * @param {Array} items - Cart items
 */
export async function syncCart(items) {
  return updateMedicalBasket(items);
}

// ---- Health Check ----

/**
 * Check backend API health.
 */
export async function healthCheck() {
  return apiGet('/api/v1/health');
}
