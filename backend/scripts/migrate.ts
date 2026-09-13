// ============================================================
// CLI Database Migration Runner
// Execute via: npm run db:migrate or node dist/scripts/migrate.js
// ============================================================

import { runMigrations } from '../src/shared/infra/migrator';
import { closeDB } from '../src/shared/infra/database';

async function main() {
  try {
    await runMigrations();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration process encountered a fatal error:', err);
    process.exit(1);
  } finally {
    await closeDB();
  }
}

main();
