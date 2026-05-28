// ============================================================
// Catalog API — Discovery and catalog endpoints
// Maps to backend Catalog module
// ============================================================

import { apiGet } from './api-client';

/**
 * Get full clinical discovery detail for a branded medicine.
 * @param {string|number} brandedId - Branded medicine primary key
 */
export async function getDiscovery(brandedId) {
  return apiGet(`/api/v1/discovery/${brandedId}`);
}

/**
 * Lookup a generic medicine by its salt-hash.
 * @param {string} saltHash - Deterministic molecule hash
 */
export async function getCatalogBySaltHash(saltHash) {
  return apiGet(`/api/v1/catalog/by-salt/${saltHash}`);
}
