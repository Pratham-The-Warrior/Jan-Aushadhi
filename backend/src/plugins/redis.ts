// ============================================================
// Redis Cache Plugin
// Caches frequently accessed salt_hash -> generic lookups
// ============================================================

import { createClient, RedisClientType } from 'redis';
import * as dotenv from 'dotenv';
dotenv.config();

let redis: RedisClientType;
let isConnected = false;

export function getRedis(): RedisClientType {
  return redis;
}

export function isRedisReady(): boolean {
  return isConnected;
}

export async function initRedis(): Promise<void> {
  redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  }) as RedisClientType;

  redis.on('error', (err) => {
    console.warn('⚠️  Redis Error:', err.message);
    isConnected = false;
  });

  redis.on('connect', () => {
    isConnected = true;
  });

  try {
    await redis.connect();
    console.log('✅ Redis Cache Connected');
  } catch (err) {
    console.warn('⚠️  Redis not available — running without cache (slower salt_hash lookups)');
    isConnected = false;
  }
}

// Cache helpers
export async function getCached(key: string): Promise<string | null> {
  if (!isConnected) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: string, ttlSeconds: number = 3600): Promise<void> {
  if (!isConnected) return;
  try {
    await redis.set(key, value, { EX: ttlSeconds });
  } catch {
    // Silent fail
  }
}
