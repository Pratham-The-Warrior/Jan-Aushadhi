// ============================================================
// Module 1A: Database Schema Initialization
// Creates all PostgreSQL + PostGIS tables for Jan Aushadhi
// ============================================================

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/janaushadhi',
});

const SCHEMA_SQL = `
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- ===========================================
-- Table: users (Identity Data)
-- ===========================================
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  firebase_uid  VARCHAR(128) UNIQUE NOT NULL,
  name          VARCHAR(255),
  phone         VARCHAR(20),
  email         VARCHAR(255),
  medical_basket JSONB DEFAULT '[]',
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- Table: branded_meds (Searchable Brand Data)
-- ===========================================
CREATE TABLE IF NOT EXISTS branded_meds (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(512) NOT NULL,
  mrp               DECIMAL(10,2) NOT NULL,
  is_discontinued   BOOLEAN DEFAULT FALSE,
  manufacturer      VARCHAR(512),
  type              VARCHAR(64) DEFAULT 'allopathy',
  pack_size_label   VARCHAR(128),
  composition1      TEXT,
  composition2      TEXT,
  salt_hash         VARCHAR(128),
  category          VARCHAR(512)
);

CREATE INDEX IF NOT EXISTS idx_branded_name ON branded_meds(name);
CREATE INDEX IF NOT EXISTS idx_branded_salt_hash ON branded_meds(salt_hash);

-- ===========================================
-- Table: generic_meds (Clinical Generic Data)
-- ===========================================
CREATE TABLE IF NOT EXISTS generic_meds (
  id            SERIAL PRIMARY KEY,
  drug_code     VARCHAR(128) NOT NULL,
  generic_name  VARCHAR(512) NOT NULL,
  unit_size     VARCHAR(256),
  mrp           DECIMAL(10,2) NOT NULL,
  group_name    VARCHAR(512),
  salt_hash     VARCHAR(128),
  indications   TEXT,
  side_effects  TEXT,
  storage_info  TEXT,
  clinical_data JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_generic_drug_code ON generic_meds(drug_code);
CREATE INDEX IF NOT EXISTS idx_generic_salt_hash ON generic_meds(salt_hash);

-- ===========================================
-- Table: stores (Geolocation Data)
-- ===========================================
CREATE TABLE IF NOT EXISTS stores (
  id            SERIAL PRIMARY KEY,
  pmbjk_code    VARCHAR(32) UNIQUE NOT NULL,
  name          VARCHAR(512) NOT NULL,
  phone         VARCHAR(32),
  address       TEXT,
  pincode       VARCHAR(10),
  state         VARCHAR(128),
  district      VARCHAR(128),
  location      GEOGRAPHY(POINT, 4326)
);

CREATE INDEX IF NOT EXISTS idx_stores_location ON stores USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_stores_pmbjk ON stores(pmbjk_code);
CREATE INDEX IF NOT EXISTS idx_stores_pincode ON stores(pincode);

-- ===========================================
-- Table: requirements (Transactional Logs)
-- ===========================================
CREATE TABLE IF NOT EXISTS requirements (
  id                  VARCHAR(64) PRIMARY KEY,
  user_id             VARCHAR(128) NOT NULL,
  pmbjk_code          VARCHAR(32),
  items               JSONB NOT NULL DEFAULT '[]',
  status              VARCHAR(32) DEFAULT 'PENDING',
  legal_attestation   BOOLEAN DEFAULT FALSE,
  delivery_address    TEXT,
  payment_mode        VARCHAR(32) DEFAULT 'COD',
  total_branded_value DECIMAL(10,2) DEFAULT 0,
  total_generic_value DECIMAL(10,2) DEFAULT 0,
  savings             DECIMAL(10,2) DEFAULT 0,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_req_user ON requirements(user_id);
CREATE INDEX IF NOT EXISTS idx_req_status ON requirements(status);
`;

async function setupDatabase() {
  console.log('🔧 Connecting to PostgreSQL...');
  const client = await pool.connect();

  try {
    console.log('📦 Creating PostGIS extension and tables...');
    await client.query(SCHEMA_SQL);

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema='public' AND table_type='BASE TABLE'
      ORDER BY table_name;
    `);
    console.log('✅ Tables created successfully:');
    result.rows.forEach(r => console.log(`   - ${r.table_name}`));

  } catch (err) {
    console.error('❌ Database setup failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
