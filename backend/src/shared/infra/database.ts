// ============================================================
// Database Adapter: PostgreSQL + PostGIS
// Manages the connection pool lifecycle with health checks
// and graceful shutdown support.
// ============================================================

import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config';
import { ExternalServiceError } from '../errors';

/** Singleton connection pool */
const isCloudDatabase = 
  config.databaseUrl.includes('supabase.co') || 
  config.databaseUrl.includes('supabase.com') || 
  config.databaseUrl.includes('render.com') ||
  config.databaseUrl.includes('neon.tech') ||
  config.databaseUrl.includes('railway.app') ||
  config.databaseUrl.includes('aivencloud.com') ||
  config.databaseUrl.includes('aws.connect') ||
  config.databaseUrl.includes('sslmode=require');

const useSSL = 
  process.env.DB_SSL === 'true' || 
  (process.env.DB_SSL !== 'false' && isCloudDatabase);

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.dbPoolMax,
  idleTimeoutMillis: config.dbIdleTimeout,
  connectionTimeoutMillis: config.dbConnectionTimeout,
  // rejectUnauthorized is controlled via DB_SSL_REJECT_UNAUTHORIZED env var.
  // Default: true (verify cert) — secure for self-hosted Postgres.
  // Set to false for Supabase connection pooler which uses a shared cert.
  ...(useSSL ? { ssl: { rejectUnauthorized: config.dbSslRejectUnauthorized } } : {}),
});

// Log pool-level errors (e.g. unexpected disconnects)
pool.on('error', (err: Error) => {
  console.error('⚠️  Unexpected PostgreSQL pool error:', err.message);
});

/**
 * Execute a parameterized SQL query against the pool.
 * Wraps pg errors into ExternalServiceError for consistent handling.
 */
export async function queryDB(text: string, params?: unknown[]): Promise<QueryResult> {
  try {
    return await pool.query(text, params);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    console.error('DB Query Error:', text, message);
    throw new ExternalServiceError('PostgreSQL', message);
  }
}

/**
 * Acquire a dedicated client from the pool for transactions.
 * Caller is responsible for releasing via `client.release()`.
 */
export async function getClient(): Promise<PoolClient> {
  try {
    return await pool.connect();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    throw new ExternalServiceError('PostgreSQL', message);
  }
}

/**
 * Execute an operation within an ACID transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK, and releases the client safely.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Failed to rollback transaction:', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Verify database connectivity at startup.
 * Non-fatal — logs a warning if the database is unreachable.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    console.log('✅ PostgreSQL (PostGIS) Connected');
    return true;
  } catch (err: any) {
    console.warn('⚠️  PostgreSQL connection failed:', err?.message || err);
    return false;
  } finally {
    if (client) client.release();
  }
}

/**
 * Gracefully close all pool connections.
 * Called during server shutdown to prevent connection leaks.
 */
export async function closeDatabasePool(): Promise<void> {
  try {
    await pool.end();
    console.log('🔌 PostgreSQL pool closed');
  } catch (err) {
    console.error('Error closing PostgreSQL pool:', err);
  }
}

/**
 * Access the underlying Pool instance.
 */
export function getPool(): Pool {
  return pool;
}

export const closeDB = closeDatabasePool;

