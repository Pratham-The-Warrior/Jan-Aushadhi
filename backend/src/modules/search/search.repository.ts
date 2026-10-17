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

/** Escape LIKE wildcards so user input like "50%" is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Relevance for the PostgreSQL fallback ($2 = "q%", $3 = "% q%", $5 = "q %", $1 = "%q%"):
 * the query is the brand's first word ("Dolo 650"), then the brand starts with
 * it ("Dologel"), then a later word starts with it, then the whole phrase appears
 * in the name, then the salt starts with it, then any word-by-word hit.
 * Shorter names first within a bucket.
 */
function likeParams(query: string, limit: number): unknown[] {
  const q = escapeLike(query.trim());
  return [`%${q}%`, `${q}%`, `% ${q}%`, limit, `${q} %`];
}

/**
 * Every word must appear in the name or a composition, in any order, so
 * "atorva 10" finds "Atorva Tablet" (Atorvastatin 10mg) and "40 telma" finds
 * "Telma 40". Word params start at $6 (after likeParams).
 */
function tokenFilter(query: string): { sql: string; rank: string; params: string[] } {
  const words = query.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  const sql = words
    .map((_, i) => `(name ILIKE $${i + 6} OR composition1 ILIKE $${i + 6} OR composition2 ILIKE $${i + 6})`)
    .join(' AND ');
  // Rank: brand name starts with the first word ("atorva 10" → Atorva …), then how
  // many of the words are in the brand name rather than only in the salt.
  const firstWordParam = words.length + 6;
  const rank = words.length
    ? `CASE WHEN name ILIKE $${firstWordParam} THEN 0 ELSE 1 END, -(${words.map((_, i) => `(name ILIKE $${i + 6})::int`).join(' + ')}),`
    : '';
  return {
    sql: sql || 'TRUE',
    rank,
    params: [...words.map((w) => `%${escapeLike(w)}%`), ...(words.length ? [`${escapeLike(words[0])}%`] : [])],
  };
}

const relevanceOrder = (wordRank: string) => `
  CASE
    WHEN name ILIKE $5 THEN 0
    WHEN name ILIKE $2 THEN 1
    WHEN name ILIKE $3 THEN 2
    WHEN name ILIKE $1 THEN 3
    ELSE 4
  END,
  ${wordRank}
  CASE WHEN composition1 ILIKE $2 THEN 0 ELSE 1 END,
  length(name),
  name`;

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
    const words = tokenFilter(query);
    try {
      const res = await queryDB(
        `SELECT id, name, manufacturer, mrp::text, pack_size_label as pack_size, composition1, composition2, salt_hash, salt_strength_hash
         FROM branded_meds
         WHERE NOT is_discontinued
           AND ${words.sql}
         ORDER BY ${relevanceOrder(words.rank)}
         LIMIT $4`,
        [...likeParams(query, limit), ...words.params],
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
    const words = tokenFilter(query);
    try {
      const res = await queryDB(
        `SELECT id, name, manufacturer, mrp::text, composition1
         FROM branded_meds
         WHERE NOT is_discontinued
           AND ${words.sql}
         ORDER BY ${relevanceOrder(words.rank)}
         LIMIT $4`,
        [...likeParams(query, limit), ...words.params],
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
