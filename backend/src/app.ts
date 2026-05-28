// ============================================================
// Application Factory
// Creates and configures the Fastify instance with all plugins,
// hooks, and domain modules. Returns the app without starting
// the server — enabling testability and separation of concerns.
// ============================================================

import Fastify, { FastifyInstance, FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

import { config } from './shared/config';
import { getLoggerConfig } from './shared/logger';
import { AppError, toErrorResponse } from './shared/errors';

// Infrastructure
import { checkDatabaseHealth } from './shared/infra/database';
import { initRedis, checkRedisHealth } from './shared/infra/redis';
import { checkMeiliHealth } from './shared/infra/meilisearch';
import { isFirebaseReady } from './shared/infra/firebase';
import { isTwilioReady, initTwilio } from './shared/infra/twilio';

// Lifecycle Hooks
import { requestContextHook } from './hooks/request-context';

// Domain Modules
import searchRoutes from './modules/search/search.routes';
import catalogRoutes from './modules/catalog/catalog.routes';
import storeRoutes from './modules/stores/stores.routes';
import fulfillmentRoutes from './modules/fulfillment/fulfillment.routes';

// Enterprise Modules (V2)
import sellerRoutes from './modules/seller/seller.routes';
import adminRoutes from './modules/admin/admin.routes';

/**
 * Build and configure a Fastify application instance.
 *
 * ARCHITECTURAL DECISION — The Application Factory Pattern:
 * We decouple the creation of the server instance from its listening lifecycle (which lives in index.ts).
 * This is a massive win for integration testing: we can boot and query the server entirely in-memory using 
 * server.inject() inside our supertest/vitest suites. It eliminates the need to allocate physical ports on local 
 * or CI environments, completely bypassing pesky "EADDRINUSE: port already in use" errors during parallel runs.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: getLoggerConfig() as any,
    requestIdHeader: 'x-request-id',
    // Generate a unique request ID for distributed tracing and clean log aggregation.
    genReqId: () => crypto.randomUUID(),
  });

  // ---- Global Middleware ----
  await server.register(helmet, {
    // We disable standard CSP here because our frontend build system (Vite + index.html headers)
    // manages CSP boundaries itself. This prevents static asset rendering blocks locally.
    contentSecurityPolicy: false,
  });
  await server.register(cors, { 
    origin: config.corsOrigin,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true
  });
  await server.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow,
  });

  // ---- Global Error Handler ----
  // A centralized safety net to intercept all synchronous and asynchronous errors.
  server.setErrorHandler((error: FastifyError, request, reply) => {
    // 1. Intercept AJV validation failures (thrown by Fastify schema validations)
    if (error.validation) {
      const message = error.message || 'Request validation failed';
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message,
          statusCode: 400,
        },
      });
    }

    // 2. Intercept custom domain-driven exceptions (AppError hierarchy from our modular boundaries)
    if (error instanceof AppError) {
      const { statusCode, body } = toErrorResponse(error, config.env === 'production');
      return reply.status(statusCode).send(body);
    }

    // 3. Fallback for unhandled syntax or generic Node system errors
    // We log the raw stack trace for internal debugging but mask the JSON response in production
    // to avoid leaking database schemas, module structures, or variable secrets to the public.
    request.log.error(error, 'Unhandled error');
    const { statusCode, body } = toErrorResponse(error, config.env === 'production');
    return reply.status(statusCode).send(body);
  });

  // ---- Not Found Handler ----
  server.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested endpoint does not exist',
        statusCode: 404,
      },
    });
  });

  // ---- Lifecycle Hooks ----
  await server.register(requestContextHook);

  // ---- Initialize Infrastructure ----
  console.log('\n=== JAN AUSHADHI API SERVER ===\n');

  await checkDatabaseHealth();
  await initRedis();
  await checkMeiliHealth();
  await initTwilio();

  // ---- Health Check Endpoint ----
  server.get('/api/v1/health', async () => ({
    status: 'ok',
    version: '2.0.0',
    architecture: 'Modular Monolith',
    stack: 'Fastify + TypeScript',
    environment: config.env,
    services: {
      database: 'PostgreSQL + PostGIS',
      search: 'Meilisearch',
      cache: 'Redis',
      notifications: isTwilioReady() ? 'Twilio WhatsApp (Active)' : 'Twilio WhatsApp (Mock)',
      auth: isFirebaseReady() ? 'Firebase Admin (Active)' : 'Firebase Admin (Inactive)',
    },
  }));

  // ---- Register Domain Modules ----
  await server.register(searchRoutes);
  await server.register(catalogRoutes);
  await server.register(storeRoutes);
  await server.register(fulfillmentRoutes);

  // Enterprise Modules (V2)
  await server.register(sellerRoutes);
  await server.register(adminRoutes);

  // ---- Route Listing ----
  console.log('\n📋 Registered Modules:');
  console.log('   🔍 Search      — GET /api/v1/search, GET /api/v1/suggest');
  console.log('   💊 Catalog     — GET /api/v1/discovery/:id, GET /api/v1/catalog/by-salt/:hash');
  console.log('   🏪 Stores      — GET /api/v1/stores/*, POST /api/v1/stores/confirm/:id');
  console.log('   📦 Fulfillment — POST /api/v1/requirements/*, GET /api/v1/user/*');
  console.log('   🏬 Seller      — /api/v1/seller/* (STORE_OWNER protected)');
  console.log('   👑 Admin       — /api/v1/admin/* (SUPER_ADMIN protected)');

  return server;
}
