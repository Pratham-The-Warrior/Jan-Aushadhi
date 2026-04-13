// ============================================================
// API Service — Barrel Export
// Re-exports all domain API functions for backward compatibility.
// New code should import from domain-specific modules directly:
//   import { searchMedicines } from '../services/search.api';
// ============================================================

export { searchMedicines, suggestMedicines } from './search.api';
export { getDiscovery, getCatalogBySaltHash } from './catalog.api';
export { getNearbyStores, getStoresByPincode, getStoreByCode, getStoreStates, getStoresByDistrict } from './stores.api';
export {
  createRequirement,
  getRequirements,
  getWhatsAppLink,
  getUserDashboard,
  getDashboardMonthly,
  getUserProfile,
  updateMedicalBasket,
  syncCart,
  healthCheck,
} from './fulfillment.api';

// Re-export the error class for consumers that need it
export { ApiError } from './api-client';
