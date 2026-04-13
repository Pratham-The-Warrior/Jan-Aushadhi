// ============================================================
// Redis Cache Adapter
// Manages connection lifecycle, health checks, and provides
// type-safe cache helpers with automatic TTL.
// ============================================================

import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

let redis: RedisClientType;
let isConnected = false;

/**
 * Initialize the Redis client and connect.
 * Non-fatal — the application continues without caching if Redis is unavailable.
 */
export async function initRedis(): Promise<void> {
  redis = createClient({ url: config.redisUrl }) as RedisClientType;

  redis.on('error', (err: Error) => {
    console.warn('⚠️  Redis Error:', err.message);
    isConnected = false;
  });

  redis.on('connect', () => {
    isConnected = true;
  });

  redis.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });

  try {
    await redis.connect();
    console.log('✅ Redis Cache Connected');
  } catch {
    console.warn('⚠️  Redis not available — running without cache (slower salt_hash lookups)');
    isConnected = false;
  }
}

/** Check if Redis is currently connected and ready */
export function isRedisReady(): boolean {
  return isConnected;
}

/**
 * Retrieve a cached value by key.
 * Returns null on cache miss or if Redis is unavailable.
 */
export async function getCached(key: string): Promise<string | null> {
  if (!isConnected) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

/**
 * Store a value in cache with an optional TTL.
 * Silently fails if Redis is unavailable.
 *
 * @param key    Cache key
 * @param value  Serialized value
 * @param ttl    Time-to-live in seconds (defaults to config.redisTtl)
 */
export async function setCache(key: string, value: string, ttl?: number): Promise<void> {
  if (!isConnected) return;
  try {
    await redis.set(key, value, { EX: ttl ?? config.redisTtl });
  } catch {
    // Silent fail — cache is an optimization, not a requirement
  }
}

/**
 * Delete a cached value by key.
 */
export async function invalidateCache(key: string): Promise<void> {
  if (!isConnected) return;
  try {
    await redis.del(key);
  } catch {
    // Silent fail
  }
}

/**
 * Verify Redis connectivity for health checks.
 */
export async function checkRedisHealth(): Promise<boolean> {
  if (!isConnected) return false;
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Gracefully close the Redis connection.
 */
export async function closeRedis(): Promise<void> {
  if (!redis) return;
  try {
    await redis.quit();
    isConnected = false;
    console.log('🔌 Redis connection closed');
  } catch (err) {
    console.error('Error closing Redis:', err);
  }
}
