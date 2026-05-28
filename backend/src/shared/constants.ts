// ============================================================
// Application Constants
// Centralized configuration for magic numbers and strings.
// V2: Extended with role names, order statuses, and seller limits.
// ============================================================

export const APP_CONSTANTS = {
  // Search & Cache
  MEILI_MEDICINES_INDEX: 'medicines',
  REDIS_GENERIC_PREFIX: 'generic:',
  REDIS_USER_ROLE_PREFIX: 'user_role:',
  REDIS_USER_ROLE_TTL: 300, // 5 minutes — role cache

  // Pagination & Limits
  SEARCH_RESULTS_LIMIT: 30,
  SUGGESTIONS_LIMIT: 6,
  SUGGESTIONS_DEDUP_LIMIT: 10,
  STORES_QUERY_LIMIT: 20,
  REQUIREMENTS_HISTORY_LIMIT: 50,
  SELLER_ORDERS_PAGE_SIZE: 25,
  ADMIN_PAGE_SIZE: 50,

  // Geolocation Defaults
  DEFAULT_SEARCH_RADIUS_KM: 50,

  // User Roles
  ROLE_CUSTOMER: 'CUSTOMER',
  ROLE_STORE_OWNER: 'STORE_OWNER',
  ROLE_SUPER_ADMIN: 'SUPER_ADMIN',

  // Order Statuses
  STATUS_PENDING_ACCEPTANCE: 'PENDING_ACCEPTANCE',
  STATUS_ACCEPTED: 'ACCEPTED',
  STATUS_PREPARING: 'PREPARING',
  STATUS_READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  STATUS_COMPLETED: 'COMPLETED',
  STATUS_CANCELLED_BY_CUSTOMER: 'CANCELLED_BY_CUSTOMER',
  STATUS_CANCELLED_BY_SELLER: 'CANCELLED_BY_SELLER',
  STATUS_CANCELLED_BY_ADMIN: 'CANCELLED_BY_ADMIN',

  // Store Statuses
  STORE_ACTIVE: 'ACTIVE',
  STORE_SUSPENDED: 'SUSPENDED',
  STORE_CLOSED: 'CLOSED',
} as const;
