// ============================================================
// Database Adapter: PostgreSQL + PostGIS
// Manages the connection pool lifecycle with health checks
// and graceful shutdown support.
// ============================================================

import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config';
import { ExternalServiceError } from '../errors';

/** Singleton connection pool */
const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.dbPoolMax,
  idleTimeoutMillis: config.dbIdleTimeout,
  connectionTimeoutMillis: config.dbConnectionTimeout,
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
  } catch {
    console.warn('⚠️  PostgreSQL connection failed — database features unavailable');
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
