// ============================================================
// Build the Meilisearch medicines index from PostgreSQL
// Usage: npm run meili:seed
// Run after ETL or after changing the index settings. The server also
// rebuilds automatically at startup when the index is missing or stale.
// ============================================================

import { buildMedicinesIndex } from '../src/modules/search/search.indexer';
import { checkMeiliHealth } from '../src/shared/infra/meilisearch';
import { closeDatabasePool } from '../src/shared/infra/database';

(async () => {
  if (!(await checkMeiliHealth())) {
    process.exitCode = 1;
    return;
  }
  await buildMedicinesIndex();
})()
  .catch((err) => {
    console.error('❌ Meilisearch indexing failed:', err);
    process.exitCode = 1;
  })
  .finally(() => closeDatabasePool());
