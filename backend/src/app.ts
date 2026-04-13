// ============================================================
// Application Factory
// Creates and configures the Fastify instance with all plugins,
// hooks, and domain modules. Returns the app without starting
// the server — enabling testability and separation of concerns.
// ============================================================

import Fastify, { FastifyInstance, FastifyError } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

import { config } from './shared/config';
import { getLoggerConfig } from './shared/logger';
import { AppError, toErrorResponse } from './shared/errors';

// Infrastructure
import { checkDatabaseHealth } from './shared/infra/database';
import { initRedis, checkRedisHealth } from './shared/infra/redis';
import { checkMeiliHealth } from './shared/infra/meilisearch';
import { isFirebaseReady } from './shared/infra/firebase';
import { isTwilioReady } from './shared/infra/twilio';

// Lifecycle Hooks
import { requestContextHook } from './hooks/request-context';

// Domain Modules
import searchRoutes from './modules/search/search.routes';
import catalogRoutes from './modules/catalog/catalog.routes';
import storeRoutes from './modules/stores/stores.routes';
import fulfillmentRoutes from './modules/fulfillment/fulfillment.routes';

/**
 * Build and configure a Fastify application instance.
 *
 * This factory pattern enables:
 * - Unit/integration testing without starting the HTTP server
 * - Multiple instances for different test scenarios
 * - Clean separation between app configuration and server lifecycle
 */
export async function buildApp(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: getLoggerConfig() as any,
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
  });

  // ---- Global Middleware ----
  await server.register(cors, { origin: config.corsOrigin });
  await server.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow,
  });

  // ---- Global Error Handler ----
  server.setErrorHandler((error: FastifyError, request, reply) => {
    // Handle Fastify validation errors (from JSON schemas)
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

    // Handle our custom AppError hierarchy
    if (error instanceof AppError) {
      const { statusCode, body } = toErrorResponse(error, config.env === 'production');
      return reply.status(statusCode).send(body);
    }

    // Handle unexpected errors
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

  // ---- Route Listing ----
  console.log('\n📋 Registered Modules:');
  console.log('   🔍 Search      — GET /api/v1/search, GET /api/v1/suggest');
  console.log('   💊 Catalog     — GET /api/v1/discovery/:id, GET /api/v1/catalog/by-salt/:hash');
  console.log('   🏪 Stores      — GET /api/v1/stores/*, POST /api/v1/stores/confirm/:id');
  console.log('   📦 Fulfillment — POST /api/v1/requirements/*, GET /api/v1/user/*');

  return server;
}
