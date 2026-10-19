// ============================================================
// Stores Module — Routes
// Thin HTTP handlers for PMBJK store discovery.
// Registered as a Fastify plugin with /api/v1 prefix.
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { StoreService } from './stores.service';
import {
  storesByPincodeSchema,
  nearbyStoresSchema,
  storeByCodeSchema,
  storesByDistrictSchema,
} from './stores.schema';

const storeService = new StoreService();

/**
 * Registers store-related routes on the Fastify instance.
 */
export default async function storeRoutes(server: FastifyInstance): Promise<void> {

  // ---- Search Stores by Pincode ----
  server.get(
    '/api/v1/stores/by-pincode',
    { schema: storesByPincodeSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { pincode } = request.query as { pincode: string };
      const result = await storeService.findByPincode(pincode);
      return reply.send({ ...result, pincode });
    },
  );

  // ---- Nearby Stores (PostGIS) ----
  server.get(
    '/api/v1/stores/nearby',
    { schema: nearbyStoresSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { lat, lng, radius } = request.query as { lat: number; lng: number; radius?: number };

      // Clamp radius to a safe range before it reaches the PostGIS query.
      // An unbounded radius causes ST_DWithin to ignore the GIST index and
      // perform a full sequential scan — a trivial DoS vector.
      const MIN_RADIUS_METERS = 500;
      const MAX_RADIUS_METERS = 50_000; // 50 km hard cap
      const safeRadius = Math.min(Math.max(radius ?? 10_000, MIN_RADIUS_METERS), MAX_RADIUS_METERS);

      const result = await storeService.findNearby(lat, lng, safeRadius);

      return reply.send(result);
    },
  );

  // ---- Get Available States ----
  server.get(
    '/api/v1/stores/states',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const states = await storeService.getStates();
      return reply.send({ states });
    },
  );

  // ---- Get Stores by State & District ----
  server.get(
    '/api/v1/stores/by-district',
    { schema: storesByDistrictSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { state, district } = request.query as { state: string; district: string };
      const result = await storeService.findByDistrict(state, district);
      return reply.send(result);
    },
  );

  // ---- Get Store by PMBJK Code ----
  server.get(
    '/api/v1/stores/:pmbjk_code',
    { schema: storeByCodeSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { pmbjk_code } = request.params as { pmbjk_code: string };
      const store = await storeService.getByPmbjkCode(pmbjk_code);
      return reply.send(store);
    },
  );
}
