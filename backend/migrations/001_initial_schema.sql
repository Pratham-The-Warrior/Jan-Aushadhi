-- ============================================================
-- Migration 001: Initial Core Schema
-- Enables PostGIS and creates fundamental platform tables
-- ============================================================

-- Enable PostGIS spatial extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- -------------------------------------------------------------
-- Users Table: Base customer accounts
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                SERIAL PRIMARY KEY,
  firebase_uid      VARCHAR(128) UNIQUE NOT NULL,
  name              VARCHAR(255),
  phone             VARCHAR(20),
  email             VARCHAR(255),
  medical_basket    JSONB DEFAULT '[]',
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- -------------------------------------------------------------
-- Branded Medicines: Commercial brand catalog
-- -------------------------------------------------------------
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

-- -------------------------------------------------------------
-- Generic Medicines: PMBJP Jan Aushadhi generic catalog
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generic_meds (
  id                 SERIAL PRIMARY KEY,
  drug_code          VARCHAR(128) NOT NULL,
  generic_name       VARCHAR(512) NOT NULL,
  unit_size          VARCHAR(256),
  mrp                DECIMAL(10,2) NOT NULL,
  group_name         VARCHAR(512),
  salt_hash          VARCHAR(128),
  indications        TEXT,
  side_effects       TEXT,
  storage_info       TEXT,
  clinical_data      JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_generic_drug_code ON generic_meds(drug_code);
CREATE INDEX IF NOT EXISTS idx_generic_salt_hash ON generic_meds(salt_hash);

-- -------------------------------------------------------------
-- Stores: Jan Aushadhi Kendras with geolocation
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stores (
  id              SERIAL PRIMARY KEY,
  pmbjk_code      VARCHAR(32) UNIQUE NOT NULL,
  name            VARCHAR(512) NOT NULL,
  phone           VARCHAR(32),
  address         TEXT,
  pincode         VARCHAR(10),
  state           VARCHAR(128),
  district        VARCHAR(128),
  location        GEOGRAPHY(POINT, 4326)
);

CREATE INDEX IF NOT EXISTS idx_stores_location ON stores USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_stores_pmbjk ON stores(pmbjk_code);
CREATE INDEX IF NOT EXISTS idx_stores_pincode ON stores(pincode);

-- -------------------------------------------------------------
-- Requirements: Core order tickets
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requirements (
  id                  VARCHAR(64) PRIMARY KEY,
  user_id             VARCHAR(128) NOT NULL,
  pmbjk_code          VARCHAR(32),
  items               JSONB NOT NULL DEFAULT '[]',
  status              VARCHAR(32) DEFAULT 'PENDING_ACCEPTANCE',
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
CREATE INDEX IF NOT EXISTS idx_req_created ON requirements(created_at);
