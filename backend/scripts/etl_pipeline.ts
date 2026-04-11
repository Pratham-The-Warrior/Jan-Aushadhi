// ============================================================
// Module 1B: Salt-Hash Engine (ETL Pipeline)
// Reads both CSVs, normalizes compositions, generates MD5 hashes,
// links branded medicines to their generic counterparts,
// and inserts everything into PostgreSQL + Meilisearch.
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Pool } from 'pg';
import { MeiliSearch } from 'meilisearch';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/janaushadhi',
});

const meiliClient = new MeiliSearch({
  host: process.env.MEILI_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILI_MASTER_KEY || 'masterKey',
});

// ---- CSV Parser (zero dependencies) ----
function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];

  // Handle both quoted and unquoted CSV
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim().replace(/\r$/, ''));
    return result;
  };

  const headers = parseRow(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

// ---- The Salt-Hash Algorithm ----
function generateSaltHash(composition: string): string {
  if (!composition || composition.trim() === '') return '';

  // 1. Lowercase
  let cleaned = composition.toLowerCase();

  // 2. Strip weights/units: mg, mcg, ml, %, w/v, w/w, units, g, iu
  cleaned = cleaned.replace(/\d+(\.\d+)?\s*(mg|mcg|ml|g|%|w\/v|w\/w|units?|iu|ip|bp|usp)\b/gi, '');

  // 3. Remove symbols: ( ) / + , - .
  cleaned = cleaned.replace(/[^a-zA-Z0-9 ]/g, '');

  // 4. Tokenize: split into individual salt names
  const tokens = cleaned
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 1); // Remove tiny noise tokens

  // 5. Alphabetical sort
  tokens.sort();

  // 6. Join and MD5 hash
  const joined = tokens.join('_');
  if (!joined) return '';

  return crypto.createHash('md5').update(joined).digest('hex');
}

// ---- BRANDED MEDICINES INGESTION ----
async function ingestBrandedMedicines() {
  const csvPath = path.resolve(__dirname, '../../A_Z_medicines_dataset_of_India.csv');
  console.log(`📂 Reading branded medicines from: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    console.error('❌ Branded CSV not found at path:', csvPath);
    return;
  }

  const rows = parseCSV(csvPath);
  console.log(`📊 Parsed ${rows.length} branded medicine records`);

  const client = await pool.connect();
  try {
    // Clear existing data for clean reload
    await client.query('DELETE FROM branded_meds');

    let inserted = 0;
    const BATCH_SIZE = 500;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      
      const values: any[] = [];
      const placeholders: string[] = [];

      batch.forEach((row, batchIdx) => {
        const comp1 = row['short_composition1'] || '';
        const comp2 = row['short_composition2'] || '';
        const fullComposition = [comp1, comp2].filter(c => c).join(' ');
        const saltHash = generateSaltHash(fullComposition);

        const offset = batchIdx * 9;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
        );
        values.push(
          row['name'] || 'Unknown',
          parseFloat(row['price(₹)']) || 0,
          row['Is_discontinued'] === 'TRUE',
          row['manufacturer_name'] || '',
          row['type'] || 'allopathy',
          row['pack_size_label'] || '',
          comp1,
          comp2,
          saltHash
        );
      });

      if (placeholders.length > 0) {
        await client.query(
          `INSERT INTO branded_meds (name, mrp, is_discontinued, manufacturer, type, pack_size_label, composition1, composition2, salt_hash)
           VALUES ${placeholders.join(', ')}`,
          values
        );
        inserted += batch.length;
      }

      if (inserted % 10000 === 0 || i + BATCH_SIZE >= rows.length) {
        console.log(`   ✅ Branded: ${inserted}/${rows.length} inserted`);
      }
    }

    console.log(`🎉 All ${inserted} branded medicines ingested successfully!`);
  } finally {
    client.release();
  }
}

// ---- GENERIC MEDICINES INGESTION ----
async function ingestGenericMedicines() {
  const csvPath = path.resolve(__dirname, '../../Product List_3_4_2026 @ 16_33_44.csv');
  console.log(`\n📂 Reading generic medicines from: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    console.error('❌ Generic CSV not found at path:', csvPath);
    return;
  }

  const rows = parseCSV(csvPath);
  console.log(`📊 Parsed ${rows.length} generic medicine records`);

  const client = await pool.connect();
  try {
    await client.query('DELETE FROM generic_meds');

    let inserted = 0;
    for (const row of rows) {
      const genericName = row['Generic Name'] || '';
      const saltHash = generateSaltHash(genericName);

      await client.query(
        `INSERT INTO generic_meds (drug_code, generic_name, unit_size, mrp, group_name, salt_hash)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          row['Drug Code'] || '',
          genericName,
          row['Unit Size'] || '',
          parseFloat(row['MRP']) || 0,
          row['Group Name'] || '',
          saltHash
        ]
      );
      inserted++;
      if (inserted % 500 === 0) {
        console.log(`   ✅ Generic: ${inserted}/${rows.length} inserted`);
      }
    }

    console.log(`🎉 All ${inserted} generic medicines ingested successfully!`);
  } finally {
    client.release();
  }
}

// ---- MEILISEARCH INDEXING ----
async function indexMeilisearch() {
  console.log('\n🔍 Starting Meilisearch indexing...');

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, name, mrp, manufacturer, salt_hash, pack_size_label, composition1, composition2
       FROM branded_meds WHERE is_discontinued = FALSE`
    );

    const documents = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      mrp: parseFloat(row.mrp),
      manufacturer: row.manufacturer,
      salt_hash: row.salt_hash,
      pack_size: row.pack_size_label,
      composition1: row.composition1,
      composition2: row.composition2,
    }));

    console.log(`📦 Indexing ${documents.length} documents into Meilisearch...`);

    const index = meiliClient.index('medicines');

    // Configure index settings
    await index.updateSettings({
      searchableAttributes: ['name', 'manufacturer', 'composition1', 'composition2'],
      filterableAttributes: ['salt_hash', 'manufacturer'],
      sortableAttributes: ['mrp', 'name'],
    });

    // Index in batches of 1000
    const BATCH = 1000;
    for (let i = 0; i < documents.length; i += BATCH) {
      const batch = documents.slice(i, i + BATCH);
      await index.addDocuments(batch);
      console.log(`   ✅ Indexed ${Math.min(i + BATCH, documents.length)}/${documents.length}`);
    }

    console.log('🎉 Meilisearch indexing complete!');
  } finally {
    client.release();
  }
}

// ---- STATS ----
async function printStats() {
  const client = await pool.connect();
  try {
    const branded = await client.query('SELECT COUNT(*) FROM branded_meds');
    const generic = await client.query('SELECT COUNT(*) FROM generic_meds');
    const matched = await client.query(
      `SELECT COUNT(DISTINCT b.salt_hash) 
       FROM branded_meds b 
       INNER JOIN generic_meds g ON b.salt_hash = g.salt_hash
       WHERE b.salt_hash != '' AND b.salt_hash IS NOT NULL`
    );

    console.log('\n📊 ---- ETL Summary ----');
    console.log(`   Branded Medicines:    ${branded.rows[0].count}`);
    console.log(`   Generic Medicines:    ${generic.rows[0].count}`);
    console.log(`   Matched Salt Hashes:  ${matched.rows[0].count}`);
    console.log('   -----------------------');
  } finally {
    client.release();
  }
}

// ---- MAIN ----
async function runETL() {
  console.log('=== JAN AUSHADHI ETL PIPELINE ===\n');
  console.log('Module 1A: Salt-Hash Engine');
  console.log('Module 2:  Meilisearch Indexing\n');

  try {
    await ingestBrandedMedicines();
    await ingestGenericMedicines();
    await printStats();

    // Attempt Meilisearch indexing (may fail if service not running)
    try {
      await indexMeilisearch();
    } catch (err) {
      console.warn('⚠️  Meilisearch indexing skipped (service may not be running).');
      console.warn('   Start Meilisearch and re-run this script to index.');
    }

  } catch (err) {
    console.error('❌ ETL Pipeline failed:', err);
  } finally {
    await pool.end();
  }
}

runETL();
