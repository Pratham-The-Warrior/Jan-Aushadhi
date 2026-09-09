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

    console.log('🌱 Database tables are unpopulated.');
    console.log('💡 Run "npm run db:migrate", "npm run etl:run", and "npm run etl:stores" to seed data.');
  } catch (err: any) {
    console.warn('⚠️  Auto-seed check warning:', err?.message || err);
  }
}
