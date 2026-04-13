// ============================================================
// Fastify Type Augmentation
// Extends FastifyRequest with application-specific properties
// set by middleware (Firebase auth, request context hooks).
// ============================================================

import type { AuthUser } from './types';

declare module 'fastify' {
  interface FastifyRequest {
    /** Authenticated user — set by verifyAuth preHandler */
    user?: AuthUser;
    /** Correlation ID — set by requestContextHook */
    correlationId?: string;
    /** High-resolution start time — set by requestContextHook */
    startTime?: bigint;
  }
}
