// ============================================================
// Application Constants
// Centralized configuration for magic numbers and strings.
// ============================================================

export const APP_CONSTANTS = {
  // Search & Cache
  MEILI_MEDICINES_INDEX: 'medicines',
  REDIS_GENERIC_PREFIX: 'generic:',
  
  // Pagination & Limits
  SEARCH_RESULTS_LIMIT: 30,
  SUGGESTIONS_LIMIT: 6,
  SUGGESTIONS_DEDUP_LIMIT: 10,
  STORES_QUERY_LIMIT: 20,
  REQUIREMENTS_HISTORY_LIMIT: 50,
  
  // Geolocation Defaults
  DEFAULT_SEARCH_RADIUS_KM: 50,
} as const;
