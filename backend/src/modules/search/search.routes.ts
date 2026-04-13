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

      // Enrich each hit with generic match and savings
      const fullResults = await Promise.all(
        hits.map(async (branded: any) => {
          const saltHash = branded.salt_hash;
          const generic = saltHash
            ? await catalogService.matchGeneric(saltHash)
            : null;

          const savings = catalogService.calculateSavings(
            parseFloat(branded.mrp) || 0,
            generic?.mrp || 0,
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
              salt_hash: branded.salt_hash,
              form: branded.form || 'Other',
            },
            generic: generic
              ? {
                  drug_code: generic.drug_code,
                  name: generic.generic_name,
                  mrp: generic.mrp,
                  unit_size: generic.unit_size,
                  group_name: generic.group_name,
                  salt_hash: generic.salt_hash,
                }
              : null,
            savings,
          };
        }),
      );

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
