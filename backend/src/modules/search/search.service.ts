// ============================================================
// Search Module — Service Layer
// 1. Understand the query (normalise, expand synonyms)   → query.ts
// 2. Fetch candidates: Meilisearch, else PostgreSQL      → repository
// 3. Rank them with one shared, typo-aware scorer        → query.ts
// 4. Collapse duplicate listings, cache the answer       → Redis
// ============================================================

import { SearchRepository, type RawSearchHit } from './search.repository';
import { parseQuery, normalizeText, rank, type ParsedQuery } from './query';
import { familySize, loadBrandFamilies } from './brand-families';
import { INDEX_VERSION } from './search.indexer';
import { extractForm } from '../../shared/utils';
import { getCached, setCache } from '../../shared/infra/redis';
import type { SearchSuggestion } from '../../shared/types';

export interface SearchHit extends RawSearchHit {
  form?: string;
  score: number;
}

/** Results change only when the catalogue is re-imported. */
const CACHE_TTL_SECONDS = 15 * 60;

/** How many candidates the engines return for ranking. */
const CANDIDATES = { search: 60, suggest: 40 };

export class SearchService {
  constructor(private readonly repository: SearchRepository = new SearchRepository()) {}

  /** Ranked hits; callers cache the final response with `cached()`. */
  async search(raw: string, limit: number = 30): Promise<SearchHit[]> {
    return this.ranked(parseQuery(raw), CANDIDATES.search, limit);
  }

  /** Cache key for a query: equivalent spellings ("Dolo650", "dolo 650") share one entry. */
  cacheKey(kind: string, raw: string, limit: number): string {
    return `${kind}:${limit}:${parseQuery(raw).text}`;
  }

  async suggest(raw: string, limit: number = 6): Promise<SearchSuggestion[]> {
    return this.cached(this.cacheKey('suggest', raw, limit), async () =>
      (await this.ranked(parseQuery(raw), CANDIDATES.suggest, limit)).map((hit) => ({
        id: hit.id,
        name: hit.name,
        manufacturer: hit.manufacturer,
        mrp: typeof hit.mrp === 'number' ? hit.mrp : parseFloat(hit.mrp) || 0,
        composition: hit.composition1 || null,
      })),
    );
  }

  private async ranked(query: ParsedQuery, candidates: number, limit: number): Promise<SearchHit[]> {
    if (query.terms.length === 0) return [];

    let hits = await this.repository.searchMeilisearch(query, candidates);
    if (!hits?.length) hits = await this.repository.searchPostgres(query, candidates);
    if (hits.length === 0) return [];

    const families = await loadBrandFamilies();
    const ranked = rank(
      query,
      hits.map((hit, i) => ({
        ...hit,
        engineRank: i,
        familySize: familySize(families, hit.name),
        hasGeneric: Boolean(hit.has_generic),
      })),
    );

    // The catalogue lists many brands more than once (other packs or sellers):
    // keep one per name, preferring a listing that has a generic match.
    const byName = new Map<string, (typeof ranked)[number]>();
    for (const hit of ranked) {
      const key = normalizeText(hit.name);
      const existing = byName.get(key);
      if (!existing) byName.set(key, hit);
      else if (!existing.has_generic && hit.has_generic) byName.set(key, { ...hit, score: existing.score });
    }

    return Array.from(byName.values())
      .slice(0, limit)
      .map(({ engineRank: _r, familySize: _f, hasGeneric: _g, ...hit }) => ({ ...hit, form: extractForm(hit.name || '') }));
  }

  async cached<T>(key: string, compute: () => Promise<T>): Promise<T> {
    const fullKey = `search:v${INDEX_VERSION}:${key}`;
    const hit = await getCached(fullKey);
    if (hit) {
      try {
        return JSON.parse(hit) as T;
      } catch {
        // fall through and recompute
      }
    }
    const value = await compute();
    if (Array.isArray(value) && value.length > 0) await setCache(fullKey, JSON.stringify(value), CACHE_TTL_SECONDS);
    return value;
  }
}
