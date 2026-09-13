// ============================================================
// Module 1C: Store Import & Discovery Script
// Imports stores from the extracted kendra_stores.csv,
// assigns mock geolocations (since Google Maps is disabled),
// and prepares the PostgreSQL stores table.
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

interface StoreRecord {
  pmbjk_code: string;
  name: string;
  phone: string;
  address: string;
  pincode: string;
  state: string;
  district: string;
}

const STATE_CENTROIDS: Record<string, [number, number]> = {
  'andhra pradesh': [15.9129, 79.7400],
  'arunachal pradesh': [28.2180, 94.7278],
  'assam': [26.2006, 92.9376],
  'bihar': [25.0961, 85.3131],
  'chhattisgarh': [21.2787, 81.8661],
  'delhi': [28.7041, 77.1025],
  'goa': [15.2993, 74.1240],
  'gujarat': [22.2587, 71.1924],
  'haryana': [29.0588, 76.0856],
  'himachal pradesh': [31.1048, 77.1734],
  'jharkhand': [23.6102, 85.2799],
  'karnataka': [15.3173, 75.7139],
  'kerala': [10.8505, 76.2711],
  'madhya pradesh': [22.9734, 78.6569],
  'maharashtra': [19.7515, 75.7139],
  'manipur': [24.6637, 93.9063],
  'meghalaya': [25.4670, 91.3662],
  'mizoram': [23.1645, 92.9376],
  'nagaland': [26.1584, 94.5624],
  'odisha': [20.9517, 85.0985],
  'punjab': [31.1471, 75.3412],
  'rajasthan': [27.0238, 74.2179],
  'sikkim': [27.5330, 88.5122],
  'tamil nadu': [11.1271, 78.6569],
  'telangana': [18.1124, 79.0193],
  'tripura': [23.9408, 91.9882],
  'uttar pradesh': [26.8467, 80.9462],
  'uttarakhand': [30.0668, 79.0193],
  'west bengal': [22.9868, 87.8550],
  'jammu and kashmir': [33.7782, 76.5762],
  'ladakh': [34.1526, 77.5771],
  'puducherry': [11.9416, 79.8083],
  'chandigarh': [30.7333, 76.7794],
};

function getDeterministicCoordinates(state: string, pincode: string, idx: number): [number, number] {
  const normState = (state || '').trim().toLowerCase();
  const base = STATE_CENTROIDS[normState] || [20.5937, 78.9629];
  const pinNum = parseInt(pincode || '0', 10);
  const offsetLat = ((pinNum % 100) / 100 - 0.5) * 0.4 + ((idx % 20) - 10) * 0.01;
  const offsetLng = (((pinNum / 100) % 100) / 100 - 0.5) * 0.4 + (((idx * 3) % 20) - 10) * 0.01;
  return [
    Math.round((base[0] + offsetLat) * 10000) / 10000,
    Math.round((base[1] + offsetLng) * 10000) / 10000,
  ];
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

  const client = await pool.connect();

  try {
    // Clear existing stores
    await client.query('DELETE FROM stores');

    console.log('📥 Importing stores into PostgreSQL...');
    let imported = 0;
    const BATCH_SIZE = 500;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const values: any[] = [];
      const placeholders: string[] = [];

      batch.forEach((row, idx) => {
        const code = row['Kendra Code'] || `PMBJK-${row['Sr.No']}`;
        const name = row['Name'] || 'Unknown Kendra';
        const address = row['Address'] || '';
        const pincode = row['Pin Code'] || '';
        const state = row['State Name'] || '';
        const district = row['District Name'] || '';
        
        const phoneMatch = address.match(/(?:\+91|0)?[6-9]\d{9}/);
        const phone = phoneMatch ? phoneMatch[0] : '+91 00000 00000';

        const [lat, lng] = getDeterministicCoordinates(state, pincode, idx);

        const offset = idx * 9;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, ST_SetSRID(ST_MakePoint($${offset + 8}, $${offset + 9}), 4326)::geography)`
        );
        values.push(code, name, phone, address, pincode, state, district, lng, lat);
      });

      if (placeholders.length > 0) {
        await client.query(
          `INSERT INTO stores (pmbjk_code, name, phone, address, pincode, state, district, location)
           VALUES ${placeholders.join(', ')}
           ON CONFLICT (pmbjk_code) DO NOTHING`,
          values
        );
        imported += batch.length;
      }

      if (imported % 2000 === 0 || i + BATCH_SIZE >= rows.length) {
        console.log(`   ✅ Imported: ${imported}/${rows.length} stores`);
      }
    }

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
