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
 * Verify Meilisearch connectivity at startup.
 */
export async function checkMeiliHealth(): Promise<boolean> {
  try {
    const health = await meiliClient.health();
    console.log(`✅ Meilisearch: ${health.status}`);
    return true;
  } catch {
    console.warn('⚠️  Meilisearch not available — search will return errors');
    return false;
  }
}
