// ============================================================
// Fulfillment API — Requirements, dashboard, and user endpoints
// Maps to backend Fulfillment module
// ============================================================

import { apiGet, apiPost, apiPut, apiPatch } from './api-client';

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

/**
 * Cancel an order by customer.
 * @param {string} requirementId - Unique ticket ID
 * @param {string} [reason] - Optional cancellation reason
 */
export async function cancelRequirement(requirementId, reason) {
  return apiPatch(`/api/v1/requirements/${requirementId}/cancel`, { reason }, true);
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

// ---- Health Check ----

/**
 * Live platform counts (Kendras, districts, generics, exact brand matches).
 */
export async function getPlatformStats() {
  return apiGet('/api/v1/stats');
}

/**
 * Check backend API health.
 */
export async function healthCheck() {
  return apiGet('/api/v1/health');
}
