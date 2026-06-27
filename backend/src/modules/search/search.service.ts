// ============================================================
// Search Module — Service Layer
// Encapsulates all Meilisearch interactions for medicine
// search and autocomplete. Pure business logic, no HTTP
// concerns.
// ============================================================

import { getMeiliIndex } from '../../shared/infra/meilisearch';
import { queryDB } from '../../shared/infra/database';
import { extractForm } from '../../shared/utils';
import { APP_CONSTANTS } from '../../shared/constants';
import type { SearchSuggestion } from '../../shared/types';

/**
 * Raw Meilisearch / Postgres hit shape — used internally before
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
   * Full-text search against Meilisearch with automatic PostgreSQL fallback.
   */
  async search(query: string, limit: number = 30): Promise<MeiliHit[]> {
    try {
      const index = getMeiliIndex(this.indexName);
      const response = await index.search(query, { limit });
      const hits = (response.hits || []) as MeiliHit[];

      if (hits.length > 0) {
        return hits.map((hit) => ({
          ...hit,
          form: extractForm(hit.name || ''),
        }));
      }
    } catch {
      console.warn('⚠️  Meilisearch unavailable — falling back to PostgreSQL direct search.');
    }

    // Fallback: Query PostgreSQL directly using ILIKE
    try {
      const res = await queryDB(
        `SELECT id, name, manufacturer, mrp::text, pack_size_label as pack_size, composition1, composition2, salt_hash 
         FROM branded_meds 
         WHERE name ILIKE $1 OR composition1 ILIKE $1 OR composition2 ILIKE $1 
         LIMIT $2`,
        [`%${query}%`, limit]
      );
      return res.rows.map((hit: any) => ({
        ...hit,
        form: extractForm(hit.name || ''),
      }));
    } catch (err) {
      console.error('❌ Database fallback search failed:', err);
      return [];
    }
  }

  /**
   * Lightweight autocomplete suggestions with automatic PostgreSQL fallback.
   */
  async suggest(query: string, limit: number = 6): Promise<SearchSuggestion[]> {
    try {
      const index = getMeiliIndex(this.indexName);
      const response = await index.search(query, {
        limit,
        attributesToRetrieve: ['id', 'name', 'manufacturer', 'mrp', 'composition1'],
      });

      if (response.hits && response.hits.length > 0) {
        return (response.hits || []).map((hit: any) => ({
          id: hit.id,
          name: hit.name,
          manufacturer: hit.manufacturer,
          mrp: parseFloat(hit.mrp) || 0,
          composition: hit.composition1 || null,
        }));
      }
    } catch {
      // Ignore Meilisearch error and proceed to Postgres fallback
    }

    // Fallback: Query PostgreSQL directly using ILIKE for typeahead suggestions
    try {
      const res = await queryDB(
        `SELECT id, name, manufacturer, mrp::text, composition1 
         FROM branded_meds 
         WHERE name ILIKE $1 OR composition1 ILIKE $1 
         LIMIT $2`,
        [`%${query}%`, limit]
      );
      return res.rows.map((hit: any) => ({
        id: hit.id,
        name: hit.name,
        manufacturer: hit.manufacturer,
        mrp: parseFloat(hit.mrp) || 0,
        composition: hit.composition1 || null,
      }));
    } catch {
      return [];
    }
  }
}
