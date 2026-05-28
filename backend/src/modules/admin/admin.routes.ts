// ============================================================
// Admin Module — Routes
// HTTP handlers for the Super Admin & Operations platform.
// All routes require Firebase auth + SUPER_ADMIN role.
// Registered as a Fastify plugin with /api/v1/admin prefix.
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AdminService } from './admin.service';
import { verifyAuth } from '../../shared/infra/firebase';
import { requireRole } from '../../shared/infra/rbac';
import type { UpdateUserRolePayload, RequirementStatus } from '../../shared/types';
import {
  getStoresSchema,
  storeByCodeSchema,
  updateStoreStatusSchema,
  assignSellerSchema,
  getUsersSchema,
  userByUidSchema,
  updateUserRoleSchema,
  suspendUserSchema,
  getAllOrdersSchema,
  orderByIdSchema,
  overrideOrderStatusSchema,
  ordersFeedSchema,
} from './admin.schema';

const adminService = new AdminService();

/**
 * Registers admin-related routes on the Fastify instance.
 * All routes require SUPER_ADMIN role for full platform access.
 */
export default async function adminRoutes(server: FastifyInstance): Promise<void> {
  // Global preHandler for ALL admin routes
  const adminAuth = [verifyAuth, requireRole('SUPER_ADMIN')];

  // ================================================================
  //  DASHBOARD
  // ================================================================

  server.get(
    '/api/v1/admin/dashboard/stats',
    { preHandler: adminAuth },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const stats = await adminService.getPlatformStats();
      return reply.send(stats);
    },
  );

  server.get(
    '/api/v1/admin/dashboard/orders-feed',
    { preHandler: adminAuth, schema: ordersFeedSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { limit } = request.query as { limit?: number };
      const result = await adminService.getOrdersFeed(limit);
      return reply.send(result);
    },
  );

  // ================================================================
  //  STORE MANAGEMENT
  // ================================================================

  server.get(
    '/api/v1/admin/stores',
    { preHandler: adminAuth, schema: getStoresSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        status?: string;
        state?: string;
        search?: string;
        page?: number;
        limit?: number;
      };
      const result = await adminService.getStores(query);
      return reply.send(result);
    },
  );

  server.get(
    '/api/v1/admin/stores/:code',
    { preHandler: adminAuth, schema: storeByCodeSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { code } = request.params as { code: string };
      const result = await adminService.getStoreDetail(code);
      return reply.send(result);
    },
  );

  server.patch(
    '/api/v1/admin/stores/:code/status',
    { preHandler: adminAuth, schema: updateStoreStatusSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { code } = request.params as { code: string };
      const { status } = request.body as { status: string };
      const result = await adminService.updateStoreStatus(code, status);
      return reply.send(result);
    },
  );

  server.post(
    '/api/v1/admin/stores/:code/assign-seller',
    { preHandler: adminAuth, schema: assignSellerSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { code } = request.params as { code: string };
      const { name, phone, email, password } = request.body as {
        name: string;
        phone: string;
        email?: string;
        password: string;
      };
      const result = await adminService.assignSellerToStore(code, { name, phone, email, password });
      return reply.send(result);
    },
  );

  // ================================================================
  //  USER MANAGEMENT
  // ================================================================

  server.get(
    '/api/v1/admin/users',
    { preHandler: adminAuth, schema: getUsersSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        role?: string;
        search?: string;
        page?: number;
        limit?: number;
      };
      const result = await adminService.getUsers(query);
      return reply.send(result);
    },
  );

  server.get(
    '/api/v1/admin/users/:uid',
    { preHandler: adminAuth, schema: userByUidSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { uid } = request.params as { uid: string };
      const result = await adminService.getUserDetail(uid);
      return reply.send(result);
    },
  );

  server.patch(
    '/api/v1/admin/users/:uid/role',
    { preHandler: adminAuth, schema: updateUserRoleSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { uid } = request.params as { uid: string };
      const { role, linked_pmbjk_code } = request.body as UpdateUserRolePayload;
      const result = await adminService.updateUserRole(uid, role, linked_pmbjk_code);
      return reply.send(result);
    },
  );

  server.post(
    '/api/v1/admin/users/:uid/suspend',
    { preHandler: adminAuth, schema: suspendUserSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { uid } = request.params as { uid: string };
      const { suspend } = request.body as { suspend: boolean };
      const result = await adminService.suspendUser(uid, suspend);
      return reply.send(result);
    },
  );

  // ================================================================
  //  ORDER OPERATIONS
  // ================================================================

  server.get(
    '/api/v1/admin/orders',
    { preHandler: adminAuth, schema: getAllOrdersSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        status?: string;
        pmbjk_code?: string;
        date_from?: string;
        date_to?: string;
        page?: number;
        limit?: number;
      };
      const result = await adminService.getAllOrders(query);
      return reply.send(result);
    },
  );

  server.get(
    '/api/v1/admin/orders/:id',
    { preHandler: adminAuth, schema: orderByIdSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const result = await adminService.getOrderDetail(id);
      return reply.send(result);
    },
  );

  server.patch(
    '/api/v1/admin/orders/:id/override',
    { preHandler: adminAuth, schema: overrideOrderStatusSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { status, notes } = request.body as { status: string; notes?: string };
      const admin = request.user!;
      const result = await adminService.overrideOrderStatus(id, status as RequirementStatus, admin, notes);
      return reply.send(result);
    },
  );

  // ================================================================
  //  CATALOG MANAGEMENT
  // ================================================================

  server.get(
    '/api/v1/admin/catalog/stats',
    { preHandler: adminAuth },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const result = await adminService.getCatalogStats();
      return reply.send(result);
    },
  );
}
