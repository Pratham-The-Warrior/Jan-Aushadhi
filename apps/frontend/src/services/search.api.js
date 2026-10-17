// ============================================================
// Search API — Medicine search and autocomplete endpoints
// Maps to backend Search module
// ============================================================

import { apiGet } from './api-client';

/**
 * Full-text medicine search with generic matching.
 * @param {string} query - Search query
 * Errors propagate so the UI can tell the patient search is unavailable,
 * rather than silently showing made-up results.
 * @returns {Promise<Array>} Discovery results with savings
 */
export async function searchMedicines(query) {
  return apiGet(`/api/v1/search?query=${encodeURIComponent(query)}`);
}

/**
 * Lightweight autocomplete suggestions.
 * @param {string} query - Partial search query (min 2 chars)
 * @returns {Promise<Array>} Suggestion list
 */
export async function suggestMedicines(query) {
  return apiGet(`/api/v1/suggest?q=${encodeURIComponent(query)}`);
}
