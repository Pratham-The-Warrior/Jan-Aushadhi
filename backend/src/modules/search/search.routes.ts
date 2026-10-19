// ============================================================
// Search Module — Routes
// Thin HTTP handlers: validate → delegate to service → respond.
// Registered as a Fastify plugin with /api/v1 prefix.
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SearchService } from './search.service';
import { CatalogService } from '../catalog/catalog.service';
import { searchSchema, suggestSchema } from './search.schema';
import { APP_CONSTANTS } from '../../shared/constants';

const searchService = new SearchService();
const catalogService = new CatalogService();

/**
 * Autocomplete fires on nearly every keystroke, and many mobile users in India
 * share one public IP (carrier-grade NAT), so search gets a roomier limit than
 * the global default. Results are cached, so repeats are cheap.
 */
const SEARCH_RATE_LIMIT = { max: 600, timeWindow: '1 minute' };

/**
 * Registers search-related routes on the Fastify instance.
 * Must be registered as a Fastify plugin.
 */
export default async function searchRoutes(server: FastifyInstance): Promise<void> {

  // ---- Full Search with Generic Matching ----
  server.get(
    '/api/v1/search',
    { schema: searchSchema, config: { rateLimit: SEARCH_RATE_LIMIT } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { query, limit } = request.query as { query: string; limit?: number };
      const size = Math.min(limit ?? APP_CONSTANTS.SUGGESTIONS_DEDUP_LIMIT, APP_CONSTANTS.SUGGESTIONS_DEDUP_LIMIT);

      const results = await searchService.cached(searchService.cacheKey('results', query, size), async () => {
        // Hits arrive ranked and de-duplicated; add each one's generic match and savings.
        const hits = await searchService.search(query, size);
        if (hits.length === 0) return [];
        const matches = await catalogService.matchForBranded(hits.map((h) => Number(h.id)));
        return hits.map((branded) => {
          const matchResult = matches.get(Number(branded.id));
          const generic = matchResult?.generic ?? null;
          const savings = catalogService.calculateSavings(
            parseFloat(String(branded.mrp)) || 0,
            generic?.mrp || 0,
            branded.pack_size,
            generic?.unit_size,
          );
          return {
            id: branded.id,
            branded: {
              id: branded.id,
              name: branded.name,
              manufacturer: branded.manufacturer,
              mrp: parseFloat(String(branded.mrp)) || 0,
              pack_size: branded.pack_size,
              composition1: branded.composition1,
              composition2: branded.composition2,
              form: branded.form || 'Other',
            },
            generic: generic && matchResult
              ? {
                  drug_code: generic.drug_code,
                  name: generic.generic_name,
                  mrp: generic.mrp,
                  unit_size: generic.unit_size,
                  group_name: generic.group_name,
                  match_tier: matchResult.matchTier,
                  match_notes: matchResult.notes,
                }
              : null,
            savings,
          };
        });
      });
      return reply.send(results);
    },
  );

  // ---- Live Autocomplete Suggestions ----
  server.get(
    '/api/v1/suggest',
    { schema: suggestSchema, config: { rateLimit: SEARCH_RATE_LIMIT } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { q, limit } = request.query as { q?: string; limit?: number };

      if (!q || q.trim().length < 2) {
        return reply.send([]);
      }

      const suggestions = await searchService.suggest(q, limit);
      return reply.send(suggestions);
    },
  );
}
