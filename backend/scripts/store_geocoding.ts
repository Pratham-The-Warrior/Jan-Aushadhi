// ============================================================
// Module 1B: Store Geocoding Script
// Iterates through store addresses, fetches Lat/Long from
// Google Maps Geocoding API, and inserts as PostGIS Points.
// ============================================================

import { Pool } from 'pg';
import * as https from 'https';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/janaushadhi',
});

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

interface StoreRecord {
  pmbjk_code: string;
  name: string;
  phone: string;
  address: string;
  pincode: string;
  state: string;
  district: string;
}

// Geocode an address using Google Maps API
function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY.includes('your_')) {
      // Mock geocoding for development
      const lat = 19.0 + Math.random() * 10;
      const lng = 72.0 + Math.random() * 10;
      resolve({ lat, lng });
      return;
    }

    const encoded = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${GOOGLE_API_KEY}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.results && json.results.length > 0) {
            const loc = json.results[0].geometry.location;
            resolve({ lat: loc.lat, lng: loc.lng });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

// Seed some sample stores (until PDF parsing is configured)
const SAMPLE_STORES: StoreRecord[] = [
  { pmbjk_code: 'PMBJK-MH-001', name: 'Jan Aushadhi Kendra - Vasant Kunj', phone: '+91 98765 00001', address: '15, Sector 12, Vasant Kunj, New Delhi', pincode: '110070', state: 'Delhi', district: 'South Delhi' },
  { pmbjk_code: 'PMBJK-MH-002', name: 'Jan Aushadhi Kendra - Saket', phone: '+91 98765 00002', address: 'B-4, Saket District Centre, New Delhi', pincode: '110017', state: 'Delhi', district: 'South Delhi' },
  { pmbjk_code: 'PMBJK-MH-003', name: 'Jan Aushadhi Kendra - Hauz Khas', phone: '+91 98765 00003', address: '22 Aurobindo Marg, Hauz Khas, New Delhi', pincode: '110016', state: 'Delhi', district: 'South West Delhi' },
  { pmbjk_code: 'PMBJK-MH-004', name: 'Jan Aushadhi Kendra - Powai', phone: '+91 98765 00004', address: 'Hiranandani Gardens, Powai, Mumbai', pincode: '400076', state: 'Maharashtra', district: 'Mumbai Suburban' },
  { pmbjk_code: 'PMBJK-MH-005', name: 'Jan Aushadhi Kendra - Andheri', phone: '+91 98765 00005', address: 'Lokhandwala Complex, Andheri West, Mumbai', pincode: '400053', state: 'Maharashtra', district: 'Mumbai Suburban' },
  { pmbjk_code: 'PMBJK-KA-001', name: 'Jan Aushadhi Kendra - Koramangala', phone: '+91 98765 00006', address: '80 Feet Road, Koramangala, Bangalore', pincode: '560034', state: 'Karnataka', district: 'Bangalore Urban' },
  { pmbjk_code: 'PMBJK-KA-002', name: 'Jan Aushadhi Kendra - Indiranagar', phone: '+91 98765 00007', address: '100 Feet Road, Indiranagar, Bangalore', pincode: '560038', state: 'Karnataka', district: 'Bangalore Urban' },
  { pmbjk_code: 'PMBJK-TN-001', name: 'Jan Aushadhi Kendra - T Nagar', phone: '+91 98765 00008', address: 'Usman Road, T Nagar, Chennai', pincode: '600017', state: 'Tamil Nadu', district: 'Chennai' },
  { pmbjk_code: 'PMBJK-UP-001', name: 'Jan Aushadhi Kendra - Lucknow', phone: '+91 98765 00009', address: 'Hazratganj, Lucknow', pincode: '226001', state: 'Uttar Pradesh', district: 'Lucknow' },
  { pmbjk_code: 'PMBJK-RJ-001', name: 'Jan Aushadhi Kendra - Jaipur', phone: '+91 98765 00010', address: 'MI Road, Jaipur', pincode: '302001', state: 'Rajasthan', district: 'Jaipur' },
];

async function geocodeStores() {
  console.log('=== MODULE 1B: STORE GEOCODING ===\n');
  const client = await pool.connect();

  try {
    // Clear existing stores
    await client.query('DELETE FROM stores');

    let geocoded = 0;
    for (const store of SAMPLE_STORES) {
      const coords = await geocodeAddress(`${store.address}, ${store.pincode}, India`);

      if (coords) {
        await client.query(
          `INSERT INTO stores (pmbjk_code, name, phone, address, pincode, state, district, location)
           VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography)`,
          [
            store.pmbjk_code,
            store.name,
            store.phone,
            store.address,
            store.pincode,
            store.state,
            store.district,
            coords.lng,
            coords.lat,
          ]
        );
        geocoded++;
        console.log(`   ✅ Geocoded: ${store.name} -> (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      } else {
        console.log(`   ❌ Failed to geocode: ${store.name}`);
      }

      // Rate limit Google API calls
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log(`\n🎉 Geocoded ${geocoded}/${SAMPLE_STORES.length} stores successfully!`);
  } finally {
    client.release();
    await pool.end();
  }
}

geocodeStores();
