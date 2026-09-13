// ============================================================
// Meilisearch Client Adapter
// Wraps the Meilisearch SDK with health checks.
// Extracted from index.ts to be injectable.
// ============================================================

import { Meilisearch, Index } from 'meilisearch';
import { config } from '../config';
import { ExternalServiceError } from '../errors';

/** Singleton Meilisearch client */
const meiliClient = new Meilisearch({
  host: config.meiliHost,
  apiKey: config.meiliApiKey,
});

/**
 * Get the Meilisearch client instance.
 */
export function getMeiliClient(): Meilisearch {
  return meiliClient;
}

/**
 * Get a specific Meilisearch index with type safety.
 *
 * @param indexName  Name of the index (e.g. 'medicines')
 * @throws ExternalServiceError if Meilisearch is unreachable
 */
export function getMeiliIndex(indexName: string): Index {
  try {
    return meiliClient.index(indexName);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Index unavailable';
    throw new ExternalServiceError('Meilisearch', message);
  }
}

/**
 * Verify Meilisearch connectivity and authentication at startup.
 * Authenticated call ensures no silent 401 failures during production searches.
 */
export async function checkMeiliHealth(): Promise<boolean> {
  try {
    const health = await meiliClient.health();
    // Validate authentication by querying index metadata (unauthenticated health check alone is insufficient)
    await meiliClient.getIndexes({ limit: 1 });
    console.log(`✅ Meilisearch: ${health.status} (authenticated)`);
    return true;
  } catch (err: any) {
    console.warn(`⚠️  Meilisearch unavailable or authentication failed (${err?.message || err}) — search will use PostgreSQL fallback`);
    return false;
  }
}

