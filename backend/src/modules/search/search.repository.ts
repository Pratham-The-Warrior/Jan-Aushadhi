// ============================================================
// Search Module — Repository Layer
// Candidate retrieval only: Meilisearch first, PostgreSQL as fallback.
// Ordering is decided by the shared ranking in query.ts.
// ============================================================

import { searchIndex } from '../../shared/infra/meilisearch';
import { queryDB, withTransaction } from '../../shared/infra/database';
import { APP_CONSTANTS } from '../../shared/constants';
import { normalizeText, type ParsedQuery } from './query';

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
  has_generic?: boolean;
  [key: string]: unknown;
}

/** Escape LIKE wildcards so user input like "50%" is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

const FIELDS = `b.id, b.name, b.manufacturer, b.mrp::text AS mrp, b.pack_size_label AS pack_size,
  b.composition1, b.composition2, b.salt_hash, b.salt_strength_hash,
  (m.branded_id IS NOT NULL) AS has_generic`;

const MEILI_FIELDS = [
  'id', 'name', 'manufacturer', 'mrp', 'pack_size', 'composition1', 'composition2',
  'salt_hash', 'salt_strength_hash', 'has_generic',
];

/**
 * Words that may differ from the stored spelling because of typos: long enough
 * for trigram similarity to mean something, and not strengths.
 */
const FUZZY_THRESHOLD = 0.5;
/** Enough near matches for the ranker to find the right brand among similar names. */
const FUZZY_CANDIDATES = 300;

const fuzzyTerms = (q: ParsedQuery) => q.terms.filter((t) => t.length >= 4 && !/\d/.test(t)).slice(0, 4);

export class SearchRepository {
  private readonly indexName = APP_CONSTANTS.MEILI_MEDICINES_INDEX;

  /** Candidates from Meilisearch, best first. `null` when the engine is unreachable. */
  async searchMeilisearch(query: ParsedQuery, limit: number): Promise<RawSearchHit[] | null> {
    try {
      const response = await searchIndex<RawSearchHit>(this.indexName, {
        q: query.text,
        limit,
        attributesToRetrieve: MEILI_FIELDS,
      });
      return response.hits || [];
    } catch {
      return null;
    }
  }

  /**
   * Candidates from PostgreSQL. Every word must appear in the name or salt
   * ("atorva 10" → Atorva Tablet, Atorvastatin 10mg). When that finds little
   * — usually a misspelling — trigram similarity adds near matches
   * ("glycomit" → Glycomet), using the GIN trigram indexes.
   */
  async searchPostgres(query: ParsedQuery, limit: number): Promise<RawSearchHit[]> {
    if (query.terms.length === 0) return [];
    const rows: RawSearchHit[] = [];
    try {
      const params: unknown[] = [];
      const where = query.terms.slice(0, 6).map((t) => {
        params.push(`%${escapeLike(t)}%`);
        const p = `$${params.length}`;
        return `(b.name ILIKE ${p} OR b.composition1 ILIKE ${p} OR b.composition2 ILIKE ${p})`;
      });
      params.push(`${escapeLike(query.terms[0])}%`, limit);
      const exact = await queryDB(
        `SELECT ${FIELDS}
           FROM branded_meds b
           LEFT JOIN medicine_matches m ON m.branded_id = b.id
          WHERE NOT b.is_discontinued AND ${where.join(' AND ')}
          ORDER BY (b.name ILIKE $${params.length - 1}) DESC, length(b.name), b.name
          LIMIT $${params.length}`,
        params,
      );
      rows.push(...exact.rows);

      // Look for near spellings when a typed word isn't a whole word in any exact
      // hit: "dollo" only matched inside "Dollos", "telmaa" matched nothing.
      const found = new Set(
        exact.rows.flatMap((r: RawSearchHit) => normalizeText(`${r.name} ${r.composition1 ?? ''} ${r.composition2 ?? ''}`).split(' ')),
      );
      const fuzzy = fuzzyTerms(query).filter((t) => !found.has(t));
      if (fuzzy.length > 0) {
        // Rows close to any word, scored on all words: "crosin advance" →
        // Crocin Advance (close to both) before other "Advance" products.
        const near = fuzzy
          .map((_, i) => `b.name %> $${i + 2} OR b.composition1 %> $${i + 2}`)
          .join(' OR ');
        const similar = await withTransaction(async (client) => {
          // Default 0.6 misses one-letter slips in short names ("brufin" → Brufen)
          await client.query(`SET LOCAL pg_trgm.word_similarity_threshold = ${FUZZY_THRESHOLD}`);
          return client.query(
            `SELECT ${FIELDS}
               FROM branded_meds b
               LEFT JOIN medicine_matches m ON m.branded_id = b.id
              WHERE NOT b.is_discontinued AND (${near})
              ORDER BY (SELECT sum(word_similarity(t, b.name)) FROM unnest($1::text[]) AS t) DESC, length(b.name)
              LIMIT ${FUZZY_CANDIDATES}`,
            [query.terms, ...fuzzy],
          );
        });
        const seen = new Set(rows.map((r) => r.id));
        rows.push(...similar.rows.filter((r: RawSearchHit) => !seen.has(r.id)));
      }
    } catch (err) {
      console.error('❌ Database search failed:', err);
    }
    return rows;
  }
}
