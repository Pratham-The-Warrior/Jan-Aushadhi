// ============================================================
// Build branded → generic matches
// Usage: npm run match:build
// Re-run after ETL or whenever matching rules change.
// ============================================================

import { buildMedicineMatches } from '../src/modules/catalog/match-builder';
import { closeDatabasePool } from '../src/shared/infra/database';

buildMedicineMatches()
  .catch((err) => {
    console.error('❌ Match build failed:', err);
    process.exitCode = 1;
  })
  .finally(() => closeDatabasePool());
