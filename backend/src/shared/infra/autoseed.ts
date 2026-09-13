// ============================================================
// Automated Cloud Seeder
// Runs automatically on server startup in cloud environments
// if database tables or Meilisearch indexes are empty.
// ============================================================

import { queryDB } from './database';
import { getMeiliClient } from './meilisearch';
import { seedBrandedMedicines, seedGenericMedicines } from '../../../scripts/seed_meilisearch';

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

  // 2. Meilisearch Index Check & Auto-Seeding
  try {
    const meili = getMeiliClient();
    const index = meili.index('medicines');
    const stats = await index.getStats();

    if (stats.numberOfDocuments === 0) {
      console.log('🌱 Meilisearch "medicines" index is empty. Triggering background indexing...');
      seedBrandedMedicines().then(() => {
        seedGenericMedicines().catch((e) => console.warn('Generic seed error:', e));
      }).catch((e) => {
        console.warn('Background Meilisearch seeding error:', e?.message || e);
      });
    } else {
      console.log(`🔍 Meilisearch index healthy (${stats.numberOfDocuments} documents indexed).`);
    }
  } catch (err: any) {
    // If Meilisearch is unavailable or in fallback mode, don't crash
    console.log('ℹ️  Meilisearch auto-seed skipped (engine offline or index initializing).');
  }
}
