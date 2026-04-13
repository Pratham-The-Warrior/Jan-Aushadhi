// ============================================================
// Search Module — Service Layer
// Encapsulates all Meilisearch interactions for medicine
// search and autocomplete. Pure business logic, no HTTP
// concerns.
// ============================================================

import { getMeiliIndex } from '../../shared/infra/meilisearch';
import { ExternalServiceError } from '../../shared/errors';
import { extractForm } from '../../shared/utils';
import { APP_CONSTANTS } from '../../shared/constants';
import type { SearchSuggestion } from '../../shared/types';

/**
 * Raw Meilisearch hit shape — used internally before
 * mapping to typed domain objects.
 */
interface MeiliHit {
  id: number;
  name: string;
  manufacturer: string;
  mrp: string;
  pack_size: string;
  composition1: string;
  composition2: string;
  salt_hash: string;
  [key: string]: unknown;
}

export class SearchService {
  private readonly indexName = APP_CONSTANTS.MEILI_MEDICINES_INDEX;

  /**
   * Full-text search against the branded medicines index.
   * Returns raw hits with extracted dosage form.
   *
   * @param query  User search query
   * @param limit  Max results (default 30)
   */
  async search(query: string, limit: number = 30): Promise<MeiliHit[]> {
    try {
      const index = getMeiliIndex(this.indexName);
      const response = await index.search(query, { limit });
      const hits = (response.hits || []) as MeiliHit[];

      return hits.map((hit) => ({
        ...hit,
        form: extractForm(hit.name || ''),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search unavailable';
      throw new ExternalServiceError('Meilisearch', message);
    }
  }

  /**
   * Lightweight autocomplete suggestions — no Postgres join.
   * Returns minimal fields for fast typeahead rendering.
   *
   * @param query  Partial search query (min 2 chars)
   * @param limit  Max suggestions (default 6)
   */
  async suggest(query: string, limit: number = 6): Promise<SearchSuggestion[]> {
    try {
      const index = getMeiliIndex(this.indexName);
      const response = await index.search(query, {
        limit,
        attributesToRetrieve: ['id', 'name', 'manufacturer', 'mrp', 'composition1'],
      });

      return (response.hits || []).map((hit: any) => ({
        id: hit.id,
        name: hit.name,
        manufacturer: hit.manufacturer,
        mrp: parseFloat(hit.mrp) || 0,
        composition: hit.composition1 || null,
      }));
    } catch {
      // Graceful degradation — return empty on search failure
      return [];
    }
  }
}
