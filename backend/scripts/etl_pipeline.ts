// ============================================================
// Module 1B: Salt-Hash Engine (ETL Pipeline)
// Reads both CSVs, normalizes compositions, generates MD5 hashes,
// links branded medicines to their generic counterparts,
// and inserts everything into PostgreSQL + Meilisearch.
// ============================================================

import { getPool, closeDatabasePool } from '../src/shared/infra/database';
import { buildMedicinesIndex } from '../src/modules/search/search.indexer';
import { checkMeiliHealth } from '../src/shared/infra/meilisearch';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { buildMedicineMatches } from '../src/modules/catalog/match-builder';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Shared pool: honours DB_SSL / DB_SSL_REJECT_UNAUTHORIZED / DB_SSL_CA like the server.
const pool = getPool();

// ---- CSV Parser (zero dependencies) ----
function parseCSV(filePath: string): Record<string, string>[] {
  let content = fs.readFileSync(filePath, 'utf-8');
  // Handle UTF-8 BOM
  content = content.replace(/^\ufeff/, '');

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

// ---- The Salt-Hash Algorithm (Tiered Clinical Matching) ----
function generateSaltHashes(composition: string, nameString: string = ''): { saltHash: string; saltStrengthHash: string } {
  if (!composition || composition.trim() === '') return { saltHash: '', saltStrengthHash: '' };

  // 0. Extract standardized dosage strengths before stripping numbers for clinical safety
  const fullText = (composition + ' ' + nameString).toLowerCase();
  const strengthMatches = fullText.match(/\b\d+(\.\d+)?\s*(mg|mcg|ml|g|%|iu)\b/gi) || [];
  const normalizedStrengths = [...new Set(
    strengthMatches.map(s => s.replace(/\s+/g, '').toLowerCase())
  )].sort().join('_');

  // 1. Lowercase and collapse whitespace
  let cleaned = composition.toLowerCase().replace(/\s+/g, ' ').trim();

  // 2. Strip weights/units: mg, mcg, ml, %, w/v, w/w, units, g, iu
  cleaned = cleaned.replace(/\d+(\.\d+)?\s*(mg|mcg|ml|g|%|w\/v|w\/w|units?|iu|ip|bp|usp)\b/gi, '');

  // 3. Replace symbols with spaces
  cleaned = cleaned.replace(/[^a-zA-Z0-9 ]/g, ' ');

  // 4. Tokenize
  let tokens = cleaned.split(/\s+/).map(t => t.trim());

  // 5. Strip noise words that prevent exact matching between branded/generic
  const noiseWords = [
    // Forms & Packaging
    'tablet', 'tablets', 'capsule', 'capsules', 'injection', 'vial', 'wfi',
    'oral', 'suspension', 'syrup', 'drops', 'drop', 'cream', 'ointment',
    'gel', 'lotion', 'mouthwash', 'infusion', 'powder', 'dry', 'solution',
    'inj', 'syr', 'cap', 'tab',
    // Clinical modifers
    'dispersible', 'gastro', 'resistant', 'prolonged', 'release', 'paediatric',
    'sustained', 'coated', 'enteric', 'soft', 'hard', 'gelatin', 'chewable',
    'effervescent', 'intravenous', 'intramuscular', 'topical',
    // Chemical linkages & Salts
    'and', 'with', 'per', 'ml', 'for', 'hydrochloride', 'sodium',
    'potassium', 'trihydrate', 'acid', 'base', 'anhydrous', 'hcl',
    'dipropionate', 'stearate', 'sulphate', 'sulfate', 'maleate',
    'mesylate', 'hydrate', 'acetate', 'mesilate'
  ];
  tokens = tokens.filter(t => t.length > 2 && !noiseWords.includes(t));

  // 6. Synonym mapping for common salts
  const synonymMap: Record<string, string> = {
    'amoxicillin': 'amoxycillin',
    'clavulanate': 'clavulanic',
    'paracetamol': 'acetaminophen'
  };
  tokens = tokens.map(t => synonymMap[t] || t);

  // 7. Remove duplicates (safeguard) and Alphabetical sort
  tokens = [...new Set(tokens)];
  tokens.sort();

  // 8. Extrapolate Delivery Form
  const ns = nameString.toLowerCase();
  let form = 'other';
  if (ns.includes('inj') || ns.includes('vial') || ns.includes('wfi') || ns.includes('infusion')) form = 'injection';
  else if (ns.includes('syr')) form = 'syrup';
  else if (ns.includes('suspension')) form = 'suspension';
  else if (ns.includes('drop')) form = 'drop';
  else if (ns.includes('cream') || ns.includes('oint') || ns.includes('gel') || ns.includes('lotion')) form = 'topical';
  else if (ns.includes('powder')) form = 'powder';
  else if (ns.includes('cap')) form = 'capsule';
  else if (ns.includes('tab')) form = 'tablet';

  const joined = tokens.join('_');
  if (!joined) return { saltHash: '', saltStrengthHash: '' };

  // Tier 2: Base salt + form (broad fallback, guarantees match rate)
  const saltHash = crypto.createHash('md5').update(joined + '_form_' + form).digest('hex');

  // Tier 1: Salt + strength + form (exact match)
  const saltStrengthHash = normalizedStrengths
    ? crypto.createHash('md5').update(joined + '_str_' + normalizedStrengths + '_form_' + form).digest('hex')
    : saltHash;

  return { saltHash, saltStrengthHash };
}

function generateSaltHash(composition: string, nameString: string = ''): string {
  return generateSaltHashes(composition, nameString).saltHash;
}

function resolveDataPath(filename: string): string {
  const candidates = [
    path.resolve(__dirname, '../../data', filename), // tsx: backend/scripts
    path.resolve(__dirname, '../../../data', filename), // built: backend/dist/scripts
    path.resolve(process.cwd(), 'data', filename),
    path.resolve(process.cwd(), '../data', filename),
    path.resolve('/app/data', filename), // Docker image
  ];
  return candidates.find((c) => fs.existsSync(c)) ?? candidates[0];
}

// ---- BRANDED MEDICINES INGESTION ----
async function ingestBrandedMedicines() {
  const csvPath = resolveDataPath('A_Z_medicines_dataset_of_India.csv');
  console.log(`📂 Reading branded medicines from: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    console.error('❌ Branded CSV not found at path:', csvPath);
    return;
  }

  const rows = parseCSV(csvPath);
  console.log(`📊 Parsed ${rows.length} branded medicine records`);

  const client = await pool.connect();
  try {
    // Upsert on the dataset's own id so product ids stay stable across reloads
    // (they appear in URLs, carts, orders and the search index), and reviewed
    // matches are kept. Products dropped from the dataset are marked
    // discontinued rather than deleted.
    await client.query('BEGIN');
    const seen: number[] = [];

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
        const nameAndPack = (row['name'] || '') + ' ' + (row['pack_size_label'] || '');
        const { saltHash, saltStrengthHash } = generateSaltHashes(fullComposition, nameAndPack);

        // Handle price column with or without Unicode symbol
        const priceKey = Object.keys(row).find(k => k.toLowerCase().includes('price')) || 'price';
        const price = parseFloat(row[priceKey]) || 0;

        const id = parseInt(row['id'], 10);
        if (!Number.isInteger(id)) return;
        seen.push(id);
        const offset = placeholders.length * 11;
        placeholders.push(
          `(${Array.from({ length: 11 }, (_, k) => `$${offset + k + 1}`).join(', ')})`
        );
        values.push(
          id,
          row['name'] || 'Unknown',
          price,
          row['Is_discontinued'] === 'TRUE',
          row['manufacturer_name'] || '',
          row['type'] || 'allopathy',
          row['pack_size_label'] || '',
          comp1,
          comp2,
          saltHash,
          saltStrengthHash
        );
      });

      if (placeholders.length > 0) {
        await client.query(
          `INSERT INTO branded_meds (id, name, mrp, is_discontinued, manufacturer, type, pack_size_label, composition1, composition2, salt_hash, salt_strength_hash)
           VALUES ${placeholders.join(', ')}
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, mrp = EXCLUDED.mrp, is_discontinued = EXCLUDED.is_discontinued,
             manufacturer = EXCLUDED.manufacturer, type = EXCLUDED.type, pack_size_label = EXCLUDED.pack_size_label,
             composition1 = EXCLUDED.composition1, composition2 = EXCLUDED.composition2,
             salt_hash = EXCLUDED.salt_hash, salt_strength_hash = EXCLUDED.salt_strength_hash`,
          values
        );
        inserted += batch.length;
      }

      if (inserted % 10000 === 0 || i + BATCH_SIZE >= rows.length) {
        console.log(`   ✅ Branded: ${inserted}/${rows.length} inserted`);
      }
    }

    const dropped = await client.query(
      'UPDATE branded_meds SET is_discontinued = TRUE WHERE NOT is_discontinued AND NOT (id = ANY($1))',
      [seen],
    );
    // Keep the sequence ahead of the explicit ids
    await client.query(`SELECT setval('branded_meds_id_seq', GREATEST((SELECT MAX(id) FROM branded_meds), 1))`);
    await client.query('COMMIT');
    console.log(`🎉 ${inserted} branded medicines upserted (${dropped.rowCount} no longer listed, marked discontinued)`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---- GENERIC MEDICINES INGESTION ----
async function ingestGenericMedicines() {
  const csvPath = resolveDataPath('Product List_3_4_2026 @ 16_33_44.csv');
  console.log(`\n📂 Reading generic medicines from: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    console.error('❌ Generic CSV not found at path:', csvPath);
    return;
  }

  const rows = parseCSV(csvPath);
  console.log(`📊 Parsed ${rows.length} generic medicine records`);

  const client = await pool.connect();
  try {
    // Upsert on drug_code: generic ids are referenced by medicine_matches
    await client.query('BEGIN');

    let inserted = 0;
    const BATCH_SIZE = 500;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      const values: any[] = [];
      const placeholders: string[] = [];

      batch.forEach((row, batchIdx) => {
        const genericName = row['Generic Name'] || '';
        const { saltHash, saltStrengthHash } = generateSaltHashes(genericName, genericName);

        const offset = batchIdx * 7;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
        );
        values.push(
          row['Drug Code'] || '',
          genericName,
          row['Unit Size'] || '',
          parseFloat(row['MRP']) || 0,
          row['Group Name'] || '',
          saltHash,
          saltStrengthHash
        );
      });

      if (placeholders.length > 0) {
        await client.query(
          `INSERT INTO generic_meds (drug_code, generic_name, unit_size, mrp, group_name, salt_hash, salt_strength_hash)
           VALUES ${placeholders.join(', ')}
           ON CONFLICT (drug_code) DO UPDATE SET
             generic_name = EXCLUDED.generic_name, unit_size = EXCLUDED.unit_size, mrp = EXCLUDED.mrp,
             group_name = EXCLUDED.group_name, salt_hash = EXCLUDED.salt_hash, salt_strength_hash = EXCLUDED.salt_strength_hash`,
          values
        );
        inserted += batch.length;
      }

      if (inserted % 2000 === 0 || i + BATCH_SIZE >= rows.length) {
        console.log(`   ✅ Generic: ${inserted}/${rows.length} inserted`);
      }
    }

    await client.query('COMMIT');
    console.log(`🎉 ${inserted} generic medicines upserted`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---- STATS ----
async function printStats() {
  const res = await pool.query(`
    SELECT (SELECT COUNT(*) FROM branded_meds WHERE NOT is_discontinued) AS branded,
           (SELECT COUNT(*) FROM generic_meds) AS generics,
           (SELECT COUNT(*) FROM medicine_matches WHERE review_status <> 'rejected') AS matched`);
  const r = res.rows[0];
  console.log('\n📊 ---- ETL Summary ----');
  console.log(`   Branded medicines (active): ${r.branded}`);
  console.log(`   Generic medicines:          ${r.generics}`);
  console.log(`   Brands with a generic:      ${r.matched}`);
  console.log('   -----------------------');
}

// ---- MAIN ----
export async function runETL() {
  console.log('=== JAN AUSHADHI ETL PIPELINE ===\n');
  console.log('Module 1B: Salt-Hash Engine');
  console.log('Module 2:  Matching + search index\n');

  try {
    await ingestBrandedMedicines();
    await ingestGenericMedicines();

    // Structured branded → generic matching (replaces hash equality at query time)
    await buildMedicineMatches();
    await printStats();

    // Search index (optional: search falls back to PostgreSQL without it)
    if (await checkMeiliHealth()) {
      await buildMedicinesIndex();
    } else {
      console.warn('⚠️  Meilisearch not reachable: index skipped. Run `npm run meili:seed` once it is up.');
    }

  } catch (err) {
    console.error('❌ ETL Pipeline failed:', err);
    process.exitCode = 1;
  }
}

// Execute directly if run as CLI script
if (process.argv[1]?.includes('etl_pipeline')) {
  runETL().finally(() => closeDatabasePool());
}
