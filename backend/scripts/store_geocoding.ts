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

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/janaushadhi',
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

// ---- CSV Parser (zero dependencies) ----
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

async function importStores() {
  console.log('=== MODULE 1C: STORE IMPORT ===\n');
  const csvPath = path.resolve(__dirname, '../../kendra_stores.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ Kendra CSV not found. Please run the PDF extraction script first.');
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
        // Map PDF/CSV headers to DB schema
        // Headers: Sr.No, Kendra Code, Name, State Name, District Name, Pin Code, Address
        const code = row['Kendra Code'] || `PMBJK-${row['Sr.No']}`;
        const name = row['Name'] || 'Unknown Kendra';
        const address = row['Address'] || '';
        const pincode = row['Pin Code'] || '';
        const state = row['State Name'] || '';
        const district = row['District Name'] || '';
        
        // Since no phone in PDF, use a placeholder or extract from address
        // Typical Kendra phones start with 0 or +91
        const phoneMatch = address.match(/(?:\+91|0)?[6-9]\d{9}/);
        const phone = phoneMatch ? phoneMatch[0] : '+91 00000 00000';

        // Mock coordinates if geocoding is disabled
        // We generate coordinates centered around India (20, 78) but they are mostly for DB constraints
        const lat = 20.0 + (Math.random() - 0.5) * 15;
        const lng = 78.0 + (Math.random() - 0.5) * 15;

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
    await pool.end();
  }
}

importStores();
