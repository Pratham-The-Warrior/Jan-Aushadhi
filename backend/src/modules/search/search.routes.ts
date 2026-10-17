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
 * Registers search-related routes on the Fastify instance.
 * Must be registered as a Fastify plugin.
 */
export default async function searchRoutes(server: FastifyInstance): Promise<void> {

  // ---- Full Search with Generic Matching ----
  server.get(
    '/api/v1/search',
    { schema: searchSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { query, limit } = request.query as { query: string; limit?: number };

      const hits = await searchService.search(query, limit);
      if (hits.length === 0) return reply.send([]);

      // Enrich each hit with its precomputed generic match and savings
      const matches = await catalogService.matchForBranded(hits.map((h: any) => Number(h.id)));
      const fullResults = hits.map((branded: any) => {
          const matchResult = matches.get(Number(branded.id));
          const generic = matchResult?.generic ?? null;

          const savings = catalogService.calculateSavings(
            parseFloat(branded.mrp) || 0,
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
              mrp: parseFloat(branded.mrp) || 0,
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

      // Sort: exact (same-strength) matches first, then different-strength matches,
      // then unmatched; within a tier, highest savings first.
      const TIER_RANK: Record<string, number> = { EXACT_MATCH: 0, CLOSE_MATCH: 1, SALT_EQUIVALENT: 2 };
      const tierRank = (r: typeof fullResults[number]) => (r.generic ? TIER_RANK[r.generic.match_tier] ?? 3 : 3);
      fullResults.sort((a, b) => {
        if (tierRank(a) !== tierRank(b)) return tierRank(a) - tierRank(b);
        return (b.savings?.percentage || 0) - (a.savings?.percentage || 0);
      });

      // Deduplicate by name, prioritizing results with a generic match
      const nameMap = new Map<string, typeof fullResults[number]>();
      for (const result of fullResults) {
        const nameKey = (result.branded.name || '').toLowerCase().trim();
        if (!nameMap.has(nameKey)) {
          nameMap.set(nameKey, result);
        } else {
          const existing = nameMap.get(nameKey)!;
          if (!existing.generic && result.generic) {
            nameMap.set(nameKey, result);
          }
        }
      }

      const deduped = Array.from(nameMap.values()).slice(0, APP_CONSTANTS.SUGGESTIONS_DEDUP_LIMIT);
      return reply.send(deduped);
    },
  );

  // ---- Live Autocomplete Suggestions ----
  server.get(
    '/api/v1/suggest',
    { schema: suggestSchema },
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
