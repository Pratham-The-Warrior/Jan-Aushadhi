// ============================================================
// Application Factory
// Creates and configures the Fastify instance with all plugins,
// hooks, and domain modules. Returns the app without starting
// the server — enabling testability and separation of concerns.
// ============================================================

import crypto from 'node:crypto';
import Fastify, { FastifyInstance, FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

import { config, validateStartupConfig } from './shared/config';
import { getLoggerConfig } from './shared/logger';
import { AppError, toErrorResponse } from './shared/errors';

// Infrastructure
import { checkDatabaseHealth, queryDB } from './shared/infra/database';
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
  // Validate configuration before binding or connecting
  validateStartupConfig();

  const server = Fastify({
    logger: getLoggerConfig() as any,
    requestIdHeader: 'x-request-id',
    // Generate a unique request ID for distributed tracing and clean log aggregation.
    genReqId: () => crypto.randomUUID(),
    // Trust the X-Forwarded-For header set by Nginx so that request.ip resolves to
    // the real client IP rather than the Docker bridge network IP. Without this,
    // @fastify/rate-limit treats every user as the same IP and is completely ineffective.
    trustProxy: true,
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
    // Global: 100 requests/minute per IP for all read endpoints
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow,
    keyGenerator: (request) => request.ip,
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

  // ---- Health Check Endpoints ----

  // 1. Liveness Probe (process liveness for Docker / Kubernetes orchestrators)
  server.get('/api/v1/health/live', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Readiness Probe (deep dependency check — returns 503 if critical DB is down)
  server.get('/api/v1/health/ready', async (_request, reply) => {
    const [dbOk, redisOk, meiliOk] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
      checkMeiliHealth(),
    ]);

    const isReady = dbOk;
    const statusCode = isReady ? 200 : 503;

    return reply.status(statusCode).send({
      ready: isReady,
      status: isReady ? 'ready' : 'unready',
      dependencies: {
        database: dbOk ? 'healthy' : 'unreachable',
        cache: redisOk ? 'healthy' : 'degraded',
        search: meiliOk ? 'healthy' : 'degraded',
      },
      timestamp: new Date().toISOString(),
    });
  });

  // 3. Full Health Diagnostic Endpoint (monitoring dashboards and dev diagnostics)
  server.get('/api/v1/health', async (_request, reply) => {
    const [dbOk, redisOk, meiliOk] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
      checkMeiliHealth(),
    ]);

    const overall = dbOk ? 'ok' : 'degraded';
    const statusCode = dbOk ? 200 : 503;

    return reply.status(statusCode).send({
      status: overall,
      version: '2.0.0',
      architecture: 'Modular Monolith',
      stack: 'Fastify + TypeScript',
      environment: config.env,
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        database: dbOk ? 'healthy' : 'unreachable',
        cache: redisOk ? 'healthy' : 'unreachable',
        search: meiliOk ? 'healthy' : 'unreachable',
        notifications: isTwilioReady() ? 'Twilio WhatsApp (Active)' : 'Twilio WhatsApp (Mock)',
        auth: isFirebaseReady() ? 'Firebase Admin (Active)' : 'Firebase Admin (Inactive)',
      },
    });
  });

  // 4. Public Platform Stats — live counts for marketing pages (cached in memory for 1 hour)
  let statsCache: { at: number; body: Record<string, number> } | null = null;
  server.get('/api/v1/stats', async (_request, reply) => {
    if (statsCache && Date.now() - statsCache.at < 3_600_000) {
      return reply.send(statsCache.body);
    }
    const res = await queryDB(`
      SELECT
        (SELECT COUNT(*) FROM stores WHERE status = 'ACTIVE') AS kendras,
        (SELECT COUNT(DISTINCT (state, district)) FROM stores WHERE status = 'ACTIVE') AS districts,
        (SELECT COUNT(DISTINCT state) FROM stores WHERE status = 'ACTIVE') AS states,
        (SELECT COUNT(*) FROM generic_meds) AS generics,
        (SELECT COUNT(*) FROM branded_meds b WHERE NOT b.is_discontinued
           AND EXISTS (SELECT 1 FROM generic_meds g WHERE g.salt_strength_hash = b.salt_strength_hash)) AS exact_matches
    `);
    const row = res.rows[0] || {};
    const body = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, Number(v) || 0]));
    statsCache = { at: Date.now(), body };
    return reply.send(body);
  });

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
