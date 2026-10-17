// ============================================================
// Module 1C: Store Import & Geocoding Script
// Imports stores from kendra_stores.csv and places each one on the
// map using PIN-code coordinates from pincode_geo.csv. Every store
// records how precise its location is (see data/README.md), so the
// API never presents a guessed location as an exact one.
// ============================================================

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/janaushadhi';
const isCloudDB = dbUrl.includes('supabase') || dbUrl.includes('render') || process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: dbUrl,
  ...(isCloudDB ? { ssl: { rejectUnauthorized: false } } : {}),
});

export type LocationPrecision = 'pincode' | 'area' | 'district' | 'none';

/** Source CSV truncates some long state names; map them to the full name. */
const STATE_FIXES: Record<string, string> = {
  'jammu and': 'Jammu And Kashmir',
  'the dadra and': 'The Dadra And Nagar Haveli And Daman And Diu',
  'the dadra and nagar haveli and': 'The Dadra And Nagar Haveli And Daman And Diu',
};

export function normalizeState(state: string): string {
  const trimmed = (state || '').trim();
  return STATE_FIXES[trimmed.toLowerCase()] || trimmed;
}

/** Extract a usable Indian mobile/landline number from free-text, or null. */
export function extractPhone(text: string): string | null {
  const match = (text || '').match(/(?:\+91[\s-]?|0)?[6-9]\d{9}\b/);
  return match ? match[0].replace(/[\s-]/g, '') : null;
}

type LatLng = [number, number];

/**
 * Build a resolver from PIN code → coordinates. Falls back to the mean of
 * PIN codes sharing a 4-digit prefix (postal area), then a 3-digit prefix
 * (sorting district). Never invents a location beyond that.
 */
export function buildPincodeResolver(rows: Record<string, string>[]) {
  const exact = new Map<string, LatLng>();
  const sums = new Map<string, { lat: number; lng: number; n: number }>();

  for (const r of rows) {
    const pin = (r['pincode'] || '').trim();
    const lat = parseFloat(r['latitude']);
    const lng = parseFloat(r['longitude']);
    if (!/^\d{6}$/.test(pin) || Number.isNaN(lat) || Number.isNaN(lng)) continue;
    exact.set(pin, [lat, lng]);
    for (const key of [pin.slice(0, 4), pin.slice(0, 3)]) {
      const acc = sums.get(key) || { lat: 0, lng: 0, n: 0 };
      acc.lat += lat; acc.lng += lng; acc.n += 1;
      sums.set(key, acc);
    }
  }

  const mean = (key: string): LatLng | null => {
    const acc = sums.get(key);
    return acc ? [acc.lat / acc.n, acc.lng / acc.n] : null;
  };

  return (pincode: string): { coords: LatLng | null; precision: LocationPrecision } => {
    const pin = (pincode || '').trim();
    if (!/^\d{6}$/.test(pin)) return { coords: null, precision: 'none' };
    const hit = exact.get(pin);
    if (hit) return { coords: hit, precision: 'pincode' };
    const area = mean(pin.slice(0, 4));
    if (area) return { coords: area, precision: 'area' };
    const district = mean(pin.slice(0, 3));
    if (district) return { coords: district, precision: 'district' };
    return { coords: null, precision: 'none' };
  };
}

function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf-8').replace(/^\ufeff/, '');
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQuote = !inQuote;
      else if (ch === ',' && !inQuote) {
        result.push(current.trim());
        current = '';
      } else current += ch;
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

function resolveDataPath(filename: string): string {
  const inDataDir = path.resolve(__dirname, '../../data', filename);
  if (fs.existsSync(inDataDir)) return inDataDir;
  const inRoot = path.resolve(__dirname, '../../', filename);
  if (fs.existsSync(inRoot)) return inRoot;
  const inApp = path.resolve('/app/data', filename);
  if (fs.existsSync(inApp)) return inApp;
  return inDataDir;
}

export async function importStores() {
  console.log('=== MODULE 1C: STORE IMPORT ===\n');
  const csvPath = resolveDataPath('kendra_stores.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ Kendra CSV not found.');
    return;
  }

  const rows = parseCSV(csvPath);
  console.log(`📊 Parsed ${rows.length} store records from CSV`);

  const pincodePath = resolveDataPath('pincode_geo.csv');
  if (!fs.existsSync(pincodePath)) {
    console.error('❌ pincode_geo.csv not found — cannot place stores on the map.');
    return;
  }
  const resolvePincode = buildPincodeResolver(parseCSV(pincodePath));

  const client = await pool.connect();

  try {
    // Upsert rather than delete: pharmacists may have claimed a store, set a UPI ID,
    // phone number or exact (geocoded) location that must survive a re-import.
    console.log('📥 Importing stores into PostgreSQL...');
    let imported = 0;
    const precisionCounts: Record<string, number> = {};
    const BATCH_SIZE = 500;
    const COLS = 9;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const values: unknown[] = [];
      const placeholders: string[] = [];

      batch.forEach((row, idx) => {
        const code = row['Kendra Code'] || `PMBJK-${row['Sr.No']}`;
        const name = row['Name'] || 'Unknown Kendra';
        const address = row['Address'] || '';
        const pincode = (row['Pin Code'] || '').trim();
        const state = normalizeState(row['State Name'] || '');
        const district = (row['District Name'] || '').trim();
        const phone = extractPhone(address);

        const { coords, precision } = resolvePincode(pincode);
        precisionCounts[precision] = (precisionCounts[precision] || 0) + 1;

        const o = idx * COLS;
        placeholders.push(
          `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7}, ` +
          `CASE WHEN $${o + 8}::float8 IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($${o + 8}::float8, $${o + 9}::float8), 4326)::geography END, ` +
          `'${precision}')`
        );
        values.push(code, name, phone, address, pincode, state, district, coords ? coords[1] : null, coords ? coords[0] : null);
      });

      if (placeholders.length > 0) {
        await client.query(
          `INSERT INTO stores (pmbjk_code, name, phone, address, pincode, state, district, location, location_precision)
           VALUES ${placeholders.join(', ')}
           ON CONFLICT (pmbjk_code) DO UPDATE SET
             name = EXCLUDED.name,
             address = EXCLUDED.address,
             pincode = EXCLUDED.pincode,
             state = EXCLUDED.state,
             district = EXCLUDED.district,
             phone = COALESCE(stores.phone, EXCLUDED.phone),
             location = CASE WHEN stores.location_precision = 'geocoded' THEN stores.location ELSE EXCLUDED.location END,
             location_precision = CASE WHEN stores.location_precision = 'geocoded' THEN 'geocoded' ELSE EXCLUDED.location_precision END`,
          values
        );
        imported += batch.length;
      }

      if (imported % 2000 === 0 || i + BATCH_SIZE >= rows.length) {
        console.log(`   ✅ Imported: ${imported}/${rows.length} stores`);
      }
    }

    console.log('   📍 Location precision:', JSON.stringify(precisionCounts));
    console.log(`\n🎉 Successfully imported ${imported} stores!`);
  } catch (err) {
    console.error('❌ Store import failed:', err);
  } finally {
    client.release();
  }
}

if (process.argv[1]?.includes('store_geocoding')) {
  importStores().finally(() => pool.end());
}
