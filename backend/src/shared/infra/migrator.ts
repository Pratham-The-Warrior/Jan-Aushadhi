// ============================================================
// Database Migration Engine
// Transactional, ordered, and idempotent migration runner.
// Tracks executed migrations in the 'schema_migrations' table.
// Safe to run on every boot and from several instances at once: each
// migration takes a transaction-scoped advisory lock and re-checks that it
// is still pending. Transaction-scoped (not session) locks also work through
// PgBouncer / Supabase transaction poolers.
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from './database';

/** Arbitrary constant identifying the migration lock. */
const MIGRATION_LOCK_KEY = 726_150_001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Locate the migrations directory reliably across development
 * (running via tsx from src/) and production (compiled in dist/).
 */
function resolveMigrationsDir(): string {
  // Candidate paths relative to __dirname:
  // In dev:  src/shared/infra -> ../../../migrations
  // In prod bundled: dist/scripts/migrate.js -> ../../migrations
  const candidates = [
    path.resolve(__dirname, '../../migrations'),
    path.resolve(__dirname, '../../../migrations'),
    path.resolve(__dirname, '../../../../migrations'),
    path.resolve(process.cwd(), 'migrations'),
    path.resolve(process.cwd(), 'backend/migrations'),
    path.resolve('/app/backend/migrations'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  throw new Error(`Could not locate migrations directory. Checked: ${candidates.join(', ')}`);
}

/**
 * Execute all pending database migrations in sequential order.
 * Includes automatic retry logic to gracefully handle database boot latency.
 */
export async function runMigrations(maxRetries = 10, retryDelayMs = 2000): Promise<void> {
  const pool = getPool();
  let client: any = null;
  let attempts = 0;

  console.log('🔧 [Migrator] Connecting to database...');

  while (attempts < maxRetries) {
    try {
      client = await pool.connect();
      break;
    } catch (err: any) {
      attempts++;
      console.warn(`⏳ [Migrator] Database not ready yet (attempt ${attempts}/${maxRetries}): ${err.message}. Retrying in ${retryDelayMs / 1000}s...`);
      if (attempts >= maxRetries) {
        throw new Error(`[Migrator] Could not connect to database after ${maxRetries} attempts: ${err.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  console.log('🔧 [Migrator] Initializing database migration check...');

  try {
    // 1. Ensure tracking table exists
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT NOW()
        );
      `);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    }

    // 2. Fetch list of already executed migrations
    const executedRes = await client.query('SELECT name FROM schema_migrations');
    const executedSet = new Set<string>(executedRes.rows.map((r: { name: string }) => r.name));

    // 3. Read and sort migration SQL files
    const migrationsDir = resolveMigrationsDir();
    console.log(`📂 [Migrator] Migrations directory resolved: ${migrationsDir}`);

    const sqlFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (sqlFiles.length === 0) {
      console.log('ℹ️  [Migrator] No migration files found.');
      return;
    }

    let appliedCount = 0;

    // 4. Run unapplied migrations sequentially in transactions
    for (const file of sqlFiles) {
      if (executedSet.has(file)) {
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);
        // Another instance may have applied it while we waited for the lock
        const done = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
        if (done.rowCount) {
          await client.query('COMMIT');
          continue;
        }
        console.log(`📦 [Migrator] Applying migration: ${file}...`);
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`   ✅ [Migrator] ${file} applied successfully.`);
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`   ❌ [Migrator] Migration ${file} failed! Transaction rolled back.`);
        throw err;
      }
    }

    if (appliedCount === 0) {
      console.log('✅ [Migrator] Database is already up-to-date. (0 pending migrations)');
    } else {
      console.log(`🎉 [Migrator] Successfully executed ${appliedCount} migration(s).`);
    }
  } finally {
    client.release();
  }
}
