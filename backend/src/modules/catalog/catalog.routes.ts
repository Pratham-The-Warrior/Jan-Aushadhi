// ============================================================
// Catalog Module — Routes
// Thin HTTP handlers for branded→generic discovery.
// Registered as a Fastify plugin with /api/v1 prefix.
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CatalogService } from './catalog.service';
import { discoveryDetailSchema, catalogBySaltSchema } from './catalog.schema';

const catalogService = new CatalogService();

/**
 * Registers catalog-related routes on the Fastify instance.
 */
export default async function catalogRoutes(server: FastifyInstance): Promise<void> {

  // ---- Discovery Detail by Branded ID ----
  server.get(
    '/api/v1/discovery/:branded_id',
    { schema: discoveryDetailSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { branded_id } = request.params as { branded_id: string };
      const detail = await catalogService.getDiscoveryDetail(parseInt(branded_id, 10));
      return reply.send(detail);
    },
  );

  // ---- Catalog Lookup by Salt Hash ----
  server.get(
    '/api/v1/catalog/by-salt/:salt_hash',
    { schema: catalogBySaltSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { salt_hash } = request.params as { salt_hash: string };
      const generic = await catalogService.getGenericBySaltHash(salt_hash);
      return reply.send({ generic });
    },
  );
}
