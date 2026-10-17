// ============================================================
// Search API — Medicine search and autocomplete endpoints
// Maps to backend Search module
// ============================================================

import { apiGet } from './api-client';

// Remember recent answers in memory: backspacing, retyping or re-opening a
// search is instant and costs no request. Identical requests in flight share
// one promise. Failures are not cached.
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 100;
const cache = new Map();

const cacheKey = (kind, query) => `${kind}:${query.toLowerCase().replace(/\s+/g, ' ').trim()}`;

function cachedGet(kind, query, path) {
  const key = cacheKey(kind, query);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.promise;

  const promise = apiGet(path).catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.delete(key);
  cache.set(key, { promise, at: Date.now() });
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return promise;
}

/**
 * Full-text medicine search with generic matching.
 * @param {string} query - Search query
 * Errors propagate so the UI can tell the patient search is unavailable,
 * rather than silently showing made-up results.
 * @returns {Promise<Array>} Discovery results with savings
 */
export async function searchMedicines(query) {
  return cachedGet('search', query, `/api/v1/search?query=${encodeURIComponent(query)}`);
}

/**
 * Lightweight autocomplete suggestions.
 * @param {string} query - Partial search query (min 2 chars)
 * @returns {Promise<Array>} Suggestion list
 */
export async function suggestMedicines(query) {
  return cachedGet('suggest', query, `/api/v1/suggest?q=${encodeURIComponent(query)}`);
}
