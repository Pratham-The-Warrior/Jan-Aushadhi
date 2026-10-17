// ============================================================
// Search Module — Service Layer
// Medicine search and autocomplete orchestration.
// Pure business logic, results enrichment, and form extraction.
// Delegates raw engine & fallback querying to SearchRepository.
// ============================================================

import { SearchRepository, type RawSearchHit } from './search.repository';
import { extractForm } from '../../shared/utils';
import type { SearchSuggestion } from '../../shared/types';

export interface MeiliHit extends RawSearchHit {
  form?: string;
}

export class SearchService {
  constructor(private readonly repository: SearchRepository = new SearchRepository()) {}

  /**
   * Full-text search against Meilisearch with automatic PostgreSQL fallback.
   */
  async search(query: string, limit: number = 30): Promise<MeiliHit[]> {
    // 1. Try Meilisearch
    const meiliHits = await this.repository.searchMeilisearch(query, limit);
    if (meiliHits && meiliHits.length > 0) {
      return meiliHits.map((hit) => ({
        ...hit,
        form: extractForm(hit.name || ''),
      }));
    }

    if (meiliHits === null) {
      console.warn('⚠️  Meilisearch unavailable — falling back to PostgreSQL direct search.');
    }

    // 2. Fallback to PostgreSQL
    const fallbackHits = await this.repository.searchPostgresFallback(query, limit);
    return fallbackHits.map((hit) => ({
      ...hit,
      form: extractForm(hit.name || ''),
    }));
  }

  /**
   * Lightweight autocomplete suggestions with automatic PostgreSQL fallback.
   */
  async suggest(query: string, limit: number = 6): Promise<SearchSuggestion[]> {
    // The catalogue lists many brands more than once (different packs/sellers);
    // over-fetch and keep the first of each name so suggestions are distinct.
    const fetchLimit = limit * 3;

    // 1. Try Meilisearch
    const meiliSuggestions = await this.repository.suggestMeilisearch(query, fetchLimit);
    if (meiliSuggestions && meiliSuggestions.length > 0) {
      return this.dedupeByName(meiliSuggestions).slice(0, limit);
    }

    // 2. Fallback to PostgreSQL
    const fallback = await this.repository.suggestPostgresFallback(query, fetchLimit);
    return this.dedupeByName(fallback).slice(0, limit);
  }

  private dedupeByName(items: SearchSuggestion[]): SearchSuggestion[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = (item.name || '').toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
