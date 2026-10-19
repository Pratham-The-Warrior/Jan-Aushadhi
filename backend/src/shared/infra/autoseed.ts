// ============================================================
// Automated Cloud Seeder
// Runs automatically on server startup in cloud environments
// if database tables or Meilisearch indexes are empty.
// ============================================================

import { queryDB } from './database';
import { checkMeiliHealth } from './meilisearch';
import { buildMedicinesIndex, medicinesIndexIsCurrent } from '../../modules/search/search.indexer';
import { importStores } from '../../../scripts/store_geocoding';
import { buildMedicineMatches, matchesAreCurrent } from '../../modules/catalog/match-builder';

export async function autoSeedDatabaseIfNeeded(): Promise<void> {
  // 1. PostgreSQL check
  try {
    const checkRes = await queryDB('SELECT COUNT(*) FROM branded_meds');
    const count = parseInt(checkRes.rows[0]?.count || '0', 10);

    if (count > 0) {
      console.log(`📊 Database populated (${count} medicines found in PostgreSQL).`);
    } else {
      console.log('🌱 Database tables are unpopulated.');
      console.log('💡 Run "npm run db:migrate", "npm run etl:run", and "npm run etl:stores" to seed data.');
    }
  } catch (err: any) {
    console.warn('⚠️  PostgreSQL auto-seed check warning:', err?.message || err);
  }

  // 2. Branded → generic matches: build on first boot or after a matcher upgrade.
  let matchesBuilt: Promise<unknown> = Promise.resolve();
  try {
    const brandedCount = await queryDB('SELECT COUNT(*) FROM branded_meds');
    if (Number(brandedCount.rows[0]?.count || 0) > 0 && !(await matchesAreCurrent())) {
      console.log('🧪 Medicine matches missing or outdated. Rebuilding in background...');
      matchesBuilt = buildMedicineMatches().catch((e) => console.warn('Match build error:', e?.message || e));
    }
  } catch (err: any) {
    console.warn('⚠️  Medicine match check warning:', err?.message || err);
  }

  // 3. Store locations: rows imported before pincode geocoding carry no
  //    location_precision and had their synthetic coordinates cleared by
  //    migration 004. Re-import so "stores near me" works again.
  try {
    const res = await queryDB('SELECT COUNT(*) FROM stores WHERE location_precision IS NULL');
    const stale = parseInt(res.rows[0]?.count || '0', 10);
    if (stale > 0) {
      console.log(`📍 ${stale} stores lack verified coordinates. Re-geocoding from PIN codes in background...`);
      importStores().catch((e) => console.warn('Store re-geocoding error:', e?.message || e));
    }
  } catch (err: any) {
    console.warn('⚠️  Store location check warning:', err?.message || err);
  }

  // 4. Meilisearch: (re)build the index when it is missing, out of date or
  //    behind the database. Search uses PostgreSQL until the new index is swapped in.
  try {
    if (!(await checkMeiliHealth())) return;
    if (await medicinesIndexIsCurrent()) {
      console.log('🔍 Meilisearch index is current.');
    } else {
      console.log('🌱 Meilisearch index missing or outdated. Rebuilding in background...');
      // The index records which brands have a generic, so wait for the matches.
      matchesBuilt
        .then(() => buildMedicinesIndex())
        .catch((e) => console.warn('Meilisearch indexing error:', e?.message || e));
    }
  } catch (err: any) {
    console.log('ℹ️  Meilisearch index check skipped:', err?.message || err);
  }
}
