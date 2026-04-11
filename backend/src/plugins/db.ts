// ============================================================
// Database Plugin: PostgreSQL + PostGIS Connection Pool
// ============================================================

import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/janaushadhi',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function checkDB(): Promise<void> {
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    console.log('✅ PostgreSQL (PostGIS) Connected');
  } catch (err) {
    console.warn('⚠️  PostgreSQL connection failed — running in mock mode');
  } finally {
    if (client) client.release();
  }
}

export async function queryDB(text: string, params?: any[]): Promise<any> {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error('DB Query Error:', text, err);
    throw err;
  }
}
