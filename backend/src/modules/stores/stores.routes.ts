// ============================================================
// Stores Module — Routes
// Thin HTTP handlers for PMBJK store discovery.
// Registered as a Fastify plugin with /api/v1 prefix.
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { StoreService } from './stores.service';
import { verifyAuth } from '../../shared/infra/firebase';
import {
  storesByPincodeSchema,
  nearbyStoresSchema,
  storeByCodeSchema,
  confirmRequirementSchema,
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
      const { lat, lng, radius } = request.query as {
        lat: string;
        lng: string;
        radius?: string;
      };

      const result = await storeService.findNearby(
        parseFloat(lat),
        parseFloat(lng),
        parseInt(radius || '10000', 10),
      );

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

  // ---- Store Confirms a Requirement (Auth Required) ----
  server.post(
    '/api/v1/stores/confirm/:requirement_id',
    { preHandler: [verifyAuth], schema: confirmRequirementSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { requirement_id } = request.params as { requirement_id: string };
      const requirement = await storeService.confirmRequirement(requirement_id);

      return reply.send({
        success: true,
        message: 'Requirement successfully authorized by Kendra',
        requirement,
      });
    },
  );
}
