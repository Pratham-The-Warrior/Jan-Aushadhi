// ============================================================
// Request Context Hook
// Generates correlation IDs and logs request timing for
// distributed tracing and performance monitoring.
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

/**
 * Registers request lifecycle hooks on the Fastify instance:
 *
 * 1. **onRequest** — Generates or propagates a correlation ID
 *    (from `x-request-id` header or a new UUID). Attaches start
 *    time for duration tracking.
 *
 * 2. **onResponse** — Logs the request duration and sets the
 *    correlation ID on the response header for client tracing.
 */
export async function requestContextHook(server: FastifyInstance): Promise<void> {

  server.addHook('onRequest', async (request: FastifyRequest) => {
    // Propagate or generate correlation ID
    const correlationId =
      (request.headers['x-request-id'] as string) || crypto.randomUUID();

    request.correlationId = correlationId;
    request.startTime = process.hrtime.bigint();
  });

  server.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const correlationId = request.correlationId || 'unknown';
    const startTime = request.startTime;

    // Set correlation ID on response for client tracing
    reply.header('x-request-id', correlationId);

    // Calculate and log duration
    if (startTime) {
      const durationNs = process.hrtime.bigint() - startTime;
      const durationMs = Number(durationNs / BigInt(1_000_000));

      request.log.info({
        correlationId,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs,
      }, `${request.method} ${request.url} → ${reply.statusCode} (${durationMs}ms)`);
    }
  });
}
