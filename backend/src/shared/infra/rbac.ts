// ============================================================
// RBAC Middleware — Role-Based Access Control
// Fastify preHandler factory that enforces role requirements.
// Must be chained AFTER verifyAuth (which sets request.user).
// ============================================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { queryDB } from './database';
import { getCached, setCache, invalidateCache } from './redis';
import { AuthorizationError, AuthenticationError } from '../errors';
import { APP_CONSTANTS } from '../constants';
import type { UserRole } from '../types';

/**
 * Resolve user role and linked store from PostgreSQL, with Redis caching.
 * This is called on every authenticated request to seller/admin routes.
 *
 * Cache Strategy: User role is cached in Redis for 5 minutes. This means
 * after an admin promotes a user to STORE_OWNER, there's up to a 5-minute
 * delay before the role takes effect. This is an acceptable tradeoff for
 * the massive reduction in DB queries on high-traffic seller dashboards.
 */
async function resolveUserRole(uid: string): Promise<{
  role: UserRole;
  linked_pmbjk_code: string | null;
  is_suspended: boolean;
}> {
  const cacheKey = `${APP_CONSTANTS.REDIS_USER_ROLE_PREFIX}${uid}`;

  // 1. Check Redis cache
  const cached = await getCached(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Query PostgreSQL
  const result = await queryDB(
    'SELECT role, linked_pmbjk_code, is_suspended FROM users WHERE firebase_uid = $1',
    [uid],
  );

  // Default to CUSTOMER if user hasn't been synced yet
  const userData = result.rows.length > 0
    ? {
        role: (result.rows[0].role || 'CUSTOMER') as UserRole,
        linked_pmbjk_code: result.rows[0].linked_pmbjk_code || null,
        is_suspended: result.rows[0].is_suspended || false,
      }
    : {
        role: 'CUSTOMER' as UserRole,
        linked_pmbjk_code: null,
        is_suspended: false,
      };

  // 3. Cache for 5 minutes
  await setCache(cacheKey, JSON.stringify(userData), APP_CONSTANTS.REDIS_USER_ROLE_TTL);

  return userData;
}

/**
 * Fastify preHandler factory for role-based route protection.
 *
 * Usage:
 *   { preHandler: [verifyAuth, requireRole('STORE_OWNER')] }
 *   { preHandler: [verifyAuth, requireRole('SUPER_ADMIN')] }
 *   { preHandler: [verifyAuth, requireRole('STORE_OWNER', 'SUPER_ADMIN')] }
 *
 * Side Effects:
 *   - Attaches `role` and `linked_pmbjk_code` to `request.user`
 *   - Throws AuthorizationError if role doesn't match
 *   - Throws AuthorizationError if user is suspended
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = request.user;

    if (!user) {
      throw new AuthenticationError('Authentication required before role check');
    }

    const { role, linked_pmbjk_code, is_suspended } = await resolveUserRole(user.uid);

    // Suspended users cannot access any protected resource
    if (is_suspended) {
      throw new AuthorizationError('Your account has been suspended. Contact support.');
    }

    // Check if user's role is in the allowed list
    if (!allowedRoles.includes(role)) {
      throw new AuthorizationError(
        `This endpoint requires one of: ${allowedRoles.join(', ')}. Your role: ${role}`,
      );
    }

    // Enrich the request.user with resolved role data
    // so downstream handlers can use it without additional DB lookups
    request.user = {
      ...user,
      role,
      linked_pmbjk_code: linked_pmbjk_code ?? undefined,
    };
  };
}

/**
 * Invalidate a user's cached role.
 * Call this after an admin changes a user's role or suspends an account to
 * ensure the change takes effect immediately rather than after the 5-min TTL.
 *
 * Uses a static import (not dynamic) to avoid per-call module resolution.
 * Logs loudly on failure — a silent failure here means a suspended user
 * retains access for up to REDIS_USER_ROLE_TTL seconds.
 */
export async function invalidateRoleCache(uid: string): Promise<void> {
  const key = `${APP_CONSTANTS.REDIS_USER_ROLE_PREFIX}${uid}`;
  try {
    await invalidateCache(key);
    console.log(`[RBAC] Role cache invalidated for UID: ${uid}`);
  } catch (err) {
    // Log loudly — ops must investigate if invalidation fails on a suspension.
    // The user's stale cached role will persist until the TTL expires.
    console.error(
      `[SECURITY] Failed to invalidate role cache for UID ${uid}. ` +
      `Stale role may persist for up to ${APP_CONSTANTS.REDIS_USER_ROLE_TTL}s.`,
      err,
    );
  }
}
