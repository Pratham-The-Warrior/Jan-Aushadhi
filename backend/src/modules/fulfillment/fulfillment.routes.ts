// ============================================================
// Fulfillment Module — Routes
// Thin HTTP handlers for checkout, requirements, dashboard,
// and user profile. All routes require Firebase auth.
// Registered as a Fastify plugin with /api/v1 prefix.
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { FulfillmentService } from './fulfillment.service';
import { verifyAuth } from '../../shared/infra/firebase';
import type { CreateRequirementPayload, UpdateBasketPayload } from '../../shared/types';
import {
  createRequirementSchema,
  requirementByIdSchema,
  whatsappLinkSchema,
  updateBasketSchema,
} from './fulfillment.schema';

const fulfillmentService = new FulfillmentService();

/**
 * Registers fulfillment-related routes on the Fastify instance.
 * All routes in this module require Firebase authentication.
 */
export default async function fulfillmentRoutes(server: FastifyInstance): Promise<void> {

  // ================================================================
  //  REQUIREMENTS
  // ================================================================

  // ---- Create Requirement (Checkout) ----
  server.post(
    '/api/v1/requirements/create',
    { preHandler: [verifyAuth], schema: createRequirementSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const body = request.body as CreateRequirementPayload;

      const result = await fulfillmentService.createRequirement(user, body);
      return reply.send(result);
    },
  );

  // ---- Get WhatsApp Deep-Link ----
  server.get(
    '/api/v1/requirements/:id/whatsapp-link',
    { preHandler: [verifyAuth], schema: whatsappLinkSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const result = await fulfillmentService.getWhatsAppLink(id, user);
      return reply.send(result);
    },
  );

  // ---- Get User's Requirements History ----
  server.get(
    '/api/v1/requirements',
    { preHandler: [verifyAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const result = await fulfillmentService.getUserRequirements(user.uid);
      return reply.send(result);
    },
  );

  // ---- Get Single Requirement ----
  server.get(
    '/api/v1/requirements/:id',
    { preHandler: [verifyAuth], schema: requirementByIdSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const result = await fulfillmentService.getRequirementById(id, user.uid);
      return reply.send(result);
    },
  );

  // ================================================================
  //  DASHBOARD & ANALYTICS
  // ================================================================

  // ---- User Dashboard (Aggregated Stats) ----
  server.get(
    '/api/v1/user/dashboard',
    { preHandler: [verifyAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const result = await fulfillmentService.getDashboard(user);
      return reply.send(result);
    },
  );

  // ---- Monthly Savings Chart Data ----
  server.get(
    '/api/v1/user/dashboard/monthly',
    { preHandler: [verifyAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const result = await fulfillmentService.getMonthlyStats(user.uid);
      return reply.send(result);
    },
  );

  // ---- User Profile ----
  server.get(
    '/api/v1/user/profile',
    { preHandler: [verifyAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const result = await fulfillmentService.getProfile(user);
      return reply.send(result);
    },
  );

  // ---- Update Medical Basket ----
  server.put(
    '/api/v1/user/basket',
    { preHandler: [verifyAuth], schema: updateBasketSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const { medical_basket } = request.body as UpdateBasketPayload;

      const result = await fulfillmentService.updateBasket(user.uid, medical_basket);
      return reply.send(result);
    },
  );
}
