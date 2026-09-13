// ============================================================
// Search Module — Repository Layer
// Encapsulates Meilisearch queries with automatic PostgreSQL fallback.
// ============================================================

import { getMeiliIndex } from '../../shared/infra/meilisearch';
import { queryDB } from '../../shared/infra/database';
import { APP_CONSTANTS } from '../../shared/constants';
import type { SearchSuggestion } from '../../shared/types';

export interface RawSearchHit {
  id: number;
  name: string;
  manufacturer: string;
  mrp: string | number;
  pack_size: string;
  composition1: string;
  composition2: string;
  salt_hash: string;
  salt_strength_hash?: string;
  [key: string]: unknown;
}

export class SearchRepository {
  private readonly indexName = APP_CONSTANTS.MEILI_MEDICINES_INDEX;

  /**
   * Search Meilisearch index for medicines.
   */
  async searchMeilisearch(query: string, limit: number): Promise<RawSearchHit[] | null> {
    try {
      const index = getMeiliIndex(this.indexName);
      const response = await index.search(query, { limit });
      return (response.hits || []) as RawSearchHit[];
    } catch {
      return null;
    }
  }

  /**
   * Fallback: Query PostgreSQL directly using ILIKE.
   */
  async searchPostgresFallback(query: string, limit: number): Promise<RawSearchHit[]> {
    try {
      const res = await queryDB(
        `SELECT id, name, manufacturer, mrp::text, pack_size_label as pack_size, composition1, composition2, salt_hash, salt_strength_hash 
         FROM branded_meds 
         WHERE name ILIKE $1 OR composition1 ILIKE $1 OR composition2 ILIKE $1 
         LIMIT $2`,
        [`%${query}%`, limit],
      );
      return res.rows as RawSearchHit[];
    } catch (err) {
      console.error('❌ Database fallback search failed:', err);
      return [];
    }
  }

  /**
   * Suggest autocomplete hits via Meilisearch.
   */
  async suggestMeilisearch(query: string, limit: number): Promise<SearchSuggestion[] | null> {
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
          mrp: typeof hit.mrp === 'number' ? hit.mrp : parseFloat(hit.mrp) || 0,
          composition: hit.composition1 || null,
        }));
      }
      return [];
    } catch {
      return null;
    }
  }

  /**
   * Suggest autocomplete hits via PostgreSQL ILIKE fallback.
   */
  async suggestPostgresFallback(query: string, limit: number): Promise<SearchSuggestion[]> {
    try {
      const res = await queryDB(
        `SELECT id, name, manufacturer, mrp::text, composition1 
         FROM branded_meds 
         WHERE name ILIKE $1 OR composition1 ILIKE $1 
         LIMIT $2`,
        [`%${query}%`, limit],
      );
      return res.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        manufacturer: row.manufacturer,
        mrp: parseFloat(row.mrp) || 0,
        composition: row.composition1 || null,
      }));
    } catch (err) {
      console.error('❌ Database fallback suggestions failed:', err);
      return [];
    }
  }
}
