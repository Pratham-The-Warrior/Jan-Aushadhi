// ============================================================
// Meilisearch Standalone & Background Seeder
// Direct CSV ingestion into Meilisearch indexes:
//   1. 'medicines' (branded medicines from A_Z_medicines_dataset_of_India.csv)
//   2. 'generics'  (PMBJP generic catalog from Product List.csv)
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as crypto from 'crypto';
import { Meilisearch } from 'meilisearch';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const meiliHost = 
  process.env.MEILI_HOST || 
  process.env.MEILISEARCH_HOST || 
  process.env.MEILISEARCH_URL || 
  'http://localhost:7700';

const meiliApiKey = 
  process.env.MEILI_MASTER_KEY || 
  process.env.MEILISEARCH_KEY || 
  process.env.MEILISEARCH_API_KEY || 
  'masterKey';

export const meiliClient = new Meilisearch({
  host: meiliHost,
  apiKey: meiliApiKey,
  timeout: 10000,
});

/**
 * Deterministic salt & strength hash generator.
 */
export function generateSaltHashes(composition: string, nameString: string = ''): { saltHash: string; saltStrengthHash: string } {
  if (!composition || composition.trim() === '') {
    return { saltHash: '', saltStrengthHash: '' };
  }

  const fullText = (composition + ' ' + nameString).toLowerCase();
  const strengthMatches = fullText.match(/\b\d+(\.\d+)?\s*(mg|mcg|ml|g|%|iu)\b/gi) || [];
  const normalizedStrengths = [...new Set(strengthMatches.map(s => s.replace(/\s+/g, '').toLowerCase()))].sort().join('_');

  let cleaned = composition.toLowerCase().replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/\d+(\.\d+)?\s*(mg|mcg|ml|g|%|w\/v|w\/w|units?|iu|ip|bp|usp)\b/gi, '');
  cleaned = cleaned.replace(/[^a-zA-Z0-9 ]/g, ' ');

  const tokens = cleaned
    .split(/\s+/)
    .map(t => t.trim())
    .filter(Boolean);

  const noiseWords = new Set([
    'tablet', 'tablets', 'capsule', 'capsules', 'injection', 'vial', 'wfi',
    'oral', 'suspension', 'syrup', 'drops', 'drop', 'cream', 'ointment',
    'gel', 'lotion', 'mouthwash', 'infusion', 'powder', 'dry', 'solution',
    'respules', 'respule', 'rotacaps', 'inhaler', 'spray', 'eye', 'ear',
    'nasal', 'strip', 'bottle', 'box', 'and', 'with', 'in', 'for', 'of',
    'ip', 'bp', 'usp', 'eq', 'to', 'as', 'base', 'anhydrous', 'monohydrate',
    'dihydrate', 'trihydrate', 'hydrochloride', 'hcl', 'sodium', 'potassium',
    'calcium', 'maleate', 'succinate', 'tartrate', 'citrate', 'phosphate',
    'fumarate', 'mesylate', 'besylate', 'valerate', 'propionate', 'dipropionate',
    'acetate', 'palmitate', 'gluconate', 'lactate',
  ]);

  const filtered = tokens.filter(t => !noiseWords.has(t) && t.length > 1);
  filtered.sort();

  const moleculeString = filtered.join('_');
  const saltHash = crypto.createHash('md5').update(moleculeString).digest('hex');
  const saltStrengthHash = crypto.createHash('md5').update(moleculeString + ':' + normalizedStrengths).digest('hex');

  return { saltHash, saltStrengthHash };
}

function resolveDatasetPath(filename: string): string | null {
  const candidates = [
    path.resolve(__dirname, '../../data', filename),
    path.resolve(__dirname, '../../../data', filename),
    path.resolve(process.cwd(), 'data', filename),
    path.resolve(process.cwd(), '../data', filename),
    path.resolve('/app/data', filename),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

/**
 * Seed branded medicines directly into Meilisearch index 'medicines'.
 */
export async function seedBrandedMedicines(maxBatches: number = Infinity): Promise<number> {
  const csvPath = resolveDatasetPath('A_Z_medicines_dataset_of_India.csv');
  if (!csvPath) {
    console.warn('⚠️  Branded medicines CSV not found in data/ directory.');
    return 0;
  }

  console.log(`📦 Seeding Meilisearch 'medicines' index from: ${csvPath}`);
  const index = meiliClient.index('medicines');

  await index.updateSettings({
    searchableAttributes: ['name', 'composition1', 'composition2', 'manufacturer'],
    filterableAttributes: ['salt_hash', 'salt_strength_hash', 'manufacturer'],
    sortableAttributes: ['mrp', 'name'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
  });

  const fileStream = fs.createReadStream(csvPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let isHeader = true;
  let batch: any[] = [];
  let totalIndexed = 0;
  const BATCH_SIZE = 2500;
  let batchCount = 0;

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    if (!line.trim()) continue;

    const parts = line.split(',');
    if (parts.length < 8) continue;

    const id = parseInt(parts[0], 10);
    const name = parts[1];
    const price = parseFloat(parts[2]) || 0;
    const isDiscontinued = parts[3]?.toUpperCase() === 'TRUE';
    if (isDiscontinued) continue;

    const manufacturer = parts[4] || '';
    const packSize = parts[6] || '';
    const comp1 = parts[7] || '';
    const comp2 = parts.slice(8).join(',').trim();

    const { saltHash, saltStrengthHash } = generateSaltHashes(comp1 + ' ' + comp2, name + ' ' + packSize);

    batch.push({
      id,
      name,
      mrp: price,
      manufacturer,
      pack_size: packSize,
      composition1: comp1,
      composition2: comp2,
      salt_hash: saltHash,
      salt_strength_hash: saltStrengthHash,
    });

    if (batch.length >= BATCH_SIZE) {
      await index.addDocuments(batch, { primaryKey: 'id' });
      totalIndexed += batch.length;
      batchCount++;
      batch = [];
      if (batchCount >= maxBatches) break;
    }
  }

  if (batch.length > 0 && batchCount < maxBatches) {
    await index.addDocuments(batch, { primaryKey: 'id' });
    totalIndexed += batch.length;
  }

  console.log(`✅ Indexed ${totalIndexed} branded medicines into Meilisearch 'medicines'.`);
  return totalIndexed;
}

/**
 * Seed generic medicines directly into Meilisearch index 'generics'.
 */
export async function seedGenericMedicines(): Promise<number> {
  const csvPath = resolveDatasetPath('Product List_3_4_2026 @ 16_33_44.csv');
  if (!csvPath) {
    console.warn('⚠️  Generic medicines CSV not found in data/ directory.');
    return 0;
  }

  console.log(`📦 Seeding Meilisearch 'generics' index from: ${csvPath}`);
  const index = meiliClient.index('generics');

  await index.updateSettings({
    searchableAttributes: ['generic_name', 'group_name', 'drug_code'],
    filterableAttributes: ['salt_hash', 'salt_strength_hash', 'group_name'],
    sortableAttributes: ['mrp', 'generic_name'],
  });

  const content = fs.readFileSync(csvPath, 'utf-8').replace(/^\ufeff/, '');
  const lines = content.split('\n').filter(l => l.trim());
  const docs: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const matches = line.match(/(?:\"([^\"]*)\")|([^\",]+)/g);
    if (!matches || matches.length < 5) continue;

    const clean = matches.map(m => m.replace(/^\"|\"$/g, '').trim());
    const id = parseInt(clean[0], 10) || i;
    const drugCode = clean[1];
    const genericName = clean[2];
    const unitSize = clean[3];
    const mrp = parseFloat(clean[4]) || 0;
    const groupName = clean[5] || '';

    const { saltHash, saltStrengthHash } = generateSaltHashes(genericName, genericName);

    docs.push({
      id,
      drug_code: drugCode,
      generic_name: genericName,
      unit_size: unitSize,
      mrp,
      group_name: groupName,
      salt_hash: saltHash,
      salt_strength_hash: saltStrengthHash,
    });
  }

  if (docs.length > 0) {
    await index.addDocuments(docs, { primaryKey: 'id' });
    console.log(`✅ Indexed ${docs.length} generic medicines into Meilisearch 'generics'.`);
  }

  return docs.length;
}

export async function runFullMeiliSeed(): Promise<void> {
  console.log('\n=== MEILISEARCH DATASET SEEDER ===');
  console.log(`Endpoint: ${meiliHost}\n`);

  try {
    const health = await meiliClient.health();
    console.log(`✅ Connection established (${health.status})`);
  } catch (err: any) {
    console.error(`❌ Cannot connect to Meilisearch at ${meiliHost}: ${err.message}`);
    return;
  }

  await seedBrandedMedicines();
  await seedGenericMedicines();
  console.log('\n🎉 Meilisearch seeding finished successfully!\n');
}

if (process.argv[1]?.includes('seed_meilisearch')) {
  runFullMeiliSeed().catch(console.error);
}
