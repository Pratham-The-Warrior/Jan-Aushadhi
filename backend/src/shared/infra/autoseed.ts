// ============================================================
// Automated Cloud Seeder
// Runs automatically on server startup in cloud environments
// if database tables are empty.
// ============================================================

import { queryDB } from './database';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function autoSeedDatabaseIfNeeded(): Promise<void> {
  try {
    // Check if branded_meds has records
    const checkRes = await queryDB('SELECT COUNT(*) FROM branded_meds');
    const count = parseInt(checkRes.rows[0]?.count || '0', 10);

    if (count > 0) {
      console.log(`📊 Database already populated (${count} medicines found). Skipping auto-seed.`);
      return;
    }

    console.log('🌱 Empty database detected! Triggering automated cloud dataset ingestion...');

    // Dynamically import ETL and Store scripts to populate database
    const etlPath = path.resolve(__dirname, '../../../scripts/etl_pipeline.ts');
    const storePath = path.resolve(__dirname, '../../../scripts/store_geocoding.ts');

    if (fs.existsSync(etlPath)) {
      console.log('📦 Running ETL pipeline...');
      const etlModule = await import('../../../scripts/etl_pipeline.js').catch(() => import('../../../scripts/etl_pipeline.ts' as any));
      if (etlModule?.runETL) await etlModule.runETL();
    }

    if (fs.existsSync(storePath)) {
      console.log('🏪 Running Store Geocoding pipeline...');
      const storeModule = await import('../../../scripts/store_geocoding.js').catch(() => import('../../../scripts/store_geocoding.ts' as any));
      if (storeModule?.importStores) await storeModule.importStores();
    }

    console.log('✅ Automated cloud dataset ingestion completed successfully!');
  } catch (err: any) {
    console.error('⚠️  Auto-seed check warning:', err?.message || err);
  }
}
