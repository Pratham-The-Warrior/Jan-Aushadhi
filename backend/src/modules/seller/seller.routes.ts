// ============================================================
// Seller Module — Routes
// HTTP handlers for the Kendra Seller Central portal.
// All routes require Firebase auth + STORE_OWNER role.
// Registered as a Fastify plugin with /api/v1/seller prefix.
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SellerService } from './seller.service';
import { verifyAuth } from '../../shared/infra/firebase';
import { requireRole } from '../../shared/infra/rbac';
import { AuthorizationError } from '../../shared/errors';
import type { UpdateOrderStatusPayload, RejectOrderPayload, RequirementStatus } from '../../shared/types';
import {
  getOrdersSchema,
  orderByIdSchema,
  updateOrderStatusSchema,
  rejectOrderSchema,
  getInventorySchema,
  updateInventoryItemSchema,
  bulkUpdateInventorySchema,
  updateStoreProfileSchema,
} from './seller.schema';

const sellerService = new SellerService();

/**
 * Helper: Extract the seller's linked PMBJK code from the request.
 * Throws AuthorizationError if the seller is not linked to any store.
 */
function getSellerPmbjkCode(request: FastifyRequest): string {
  const code = request.user?.linked_pmbjk_code;
  if (!code) {
    throw new AuthorizationError(
      'Your account is not linked to any Jan Aushadhi Kendra. Contact the platform administrator.',
    );
  }
  return code;
}

/**
 * Registers seller-related routes on the Fastify instance.
 * All routes are scoped to the seller's own store via RBAC.
 */
export default async function sellerRoutes(server: FastifyInstance): Promise<void> {
  // Global preHandler for ALL seller routes
  const sellerAuth = [verifyAuth, requireRole('STORE_OWNER')];

  // ================================================================
  //  STORE PROFILE
  // ================================================================

  server.get(
    '/api/v1/seller/profile',
    { preHandler: sellerAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const pmbjkCode = getSellerPmbjkCode(request);
      const profile = await sellerService.getStoreProfile(pmbjkCode);
      return reply.send(profile);
    },
  );

  server.put(
    '/api/v1/seller/profile',
    { preHandler: sellerAuth, schema: updateStoreProfileSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const pmbjkCode = getSellerPmbjkCode(request);
      const body = request.body as { operating_hours?: Record<string, string>; phone?: string };
      const result = await sellerService.updateStoreProfile(pmbjkCode, body);
      return reply.send(result);
    },
  );

  // ================================================================
  //  ORDER MANAGEMENT
  // ================================================================

  // List orders for this store (paginated, filterable by status)
  server.get(
    '/api/v1/seller/orders',
    { preHandler: sellerAuth, schema: getOrdersSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const pmbjkCode = getSellerPmbjkCode(request);
      const { status, page, limit } = request.query as {
        status?: string;
        page?: number;
        limit?: number;
      };
      const result = await sellerService.getOrders(pmbjkCode, { status, page, limit });
      return reply.send(result);
    },
  );

  // Get single order detail
  server.get(
    '/api/v1/seller/orders/:id',
    { preHandler: sellerAuth, schema: orderByIdSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const pmbjkCode = getSellerPmbjkCode(request);
      const { id } = request.params as { id: string };
      const result = await sellerService.getOrderDetail(pmbjkCode, id);
      return reply.send(result);
    },
  );

  // Update order status
  server.patch(
    '/api/v1/seller/orders/:id/status',
    { preHandler: sellerAuth, schema: updateOrderStatusSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const pmbjkCode = getSellerPmbjkCode(request);
      const { id } = request.params as { id: string };
      const { status, notes } = request.body as UpdateOrderStatusPayload;
      const user = request.user!;
      const result = await sellerService.updateOrderStatus(
        pmbjkCode,
        id,
        status as RequirementStatus,
        user,
        notes,
      );
      return reply.send(result);
    },
  );

  // Reject an order
  server.post(
    '/api/v1/seller/orders/:id/reject',
    { preHandler: sellerAuth, schema: rejectOrderSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const pmbjkCode = getSellerPmbjkCode(request);
      const { id } = request.params as { id: string };
      const { reason } = request.body as RejectOrderPayload;
      const user = request.user!;
      const result = await sellerService.rejectOrder(pmbjkCode, id, reason, user);
      return reply.send(result);
    },
  );

  // ================================================================
  //  INVENTORY MANAGEMENT
  // ================================================================

  // Get generic catalog with store-specific stock overrides
  server.get(
    '/api/v1/seller/inventory',
    { preHandler: sellerAuth, schema: getInventorySchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const pmbjkCode = getSellerPmbjkCode(request);
      const { search, page, limit } = request.query as {
        search?: string;
        page?: number;
        limit?: number;
      };
      const result = await sellerService.getInventory(pmbjkCode, { search, page, limit });
      return reply.send(result);
    },
  );

  // Toggle stock for a specific medicine
  server.patch(
    '/api/v1/seller/inventory/:drugCode',
    { preHandler: sellerAuth, schema: updateInventoryItemSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const pmbjkCode = getSellerPmbjkCode(request);
      const { drugCode } = request.params as { drugCode: string };
      const { in_stock } = request.body as { in_stock: boolean };
      const result = await sellerService.updateInventoryItem(pmbjkCode, drugCode, in_stock);
      return reply.send(result);
    },
  );

  // Bulk update stock status
  server.post(
    '/api/v1/seller/inventory/bulk',
    { preHandler: sellerAuth, schema: bulkUpdateInventorySchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const pmbjkCode = getSellerPmbjkCode(request);
      const { updates } = request.body as { updates: { drug_code: string; in_stock: boolean }[] };
      const result = await sellerService.bulkUpdateInventory(pmbjkCode, updates);
      return reply.send(result);
    },
  );

  // ================================================================
  //  ANALYTICS & REPORTS
  // ================================================================

  server.get(
    '/api/v1/seller/analytics/summary',
    { preHandler: sellerAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const pmbjkCode = getSellerPmbjkCode(request);
      const result = await sellerService.getAnalyticsSummary(pmbjkCode);
      return reply.send(result);
    },
  );

  server.get(
    '/api/v1/seller/analytics/daily',
    { preHandler: sellerAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const pmbjkCode = getSellerPmbjkCode(request);
      const result = await sellerService.getDailyAnalytics(pmbjkCode);
      return reply.send(result);
    },
  );

  server.get(
    '/api/v1/seller/reports/export',
    { preHandler: sellerAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const pmbjkCode = getSellerPmbjkCode(request);
      const result = await sellerService.exportOrders(pmbjkCode);
      return reply.send(result);
    },
  );
}
