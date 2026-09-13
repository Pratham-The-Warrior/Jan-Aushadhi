-- ============================================================
-- Migration 002: V2 Enterprise & Operations Schema
-- RBAC on users, order audit trail, store inventory, store metadata
-- ============================================================

-- -------------------------------------------------------------
-- 1. Users Table: RBAC and Account Management
-- -------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(32) DEFAULT 'CUSTOMER';
ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_pmbjk_code VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- -------------------------------------------------------------
-- 2. Requirements Table: Expanded Order Lifecycle
-- -------------------------------------------------------------
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS seller_notes TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(32);

CREATE INDEX IF NOT EXISTS idx_req_pmbjk ON requirements(pmbjk_code);

-- -------------------------------------------------------------
-- 3. Store Inventory: Per-Store Stock Management
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_inventory (
  pmbjk_code    VARCHAR(32) NOT NULL,
  drug_code     VARCHAR(128) NOT NULL,
  in_stock      BOOLEAN DEFAULT TRUE,
  last_updated  TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (pmbjk_code, drug_code)
);

CREATE INDEX IF NOT EXISTS idx_inv_store ON store_inventory(pmbjk_code);
CREATE INDEX IF NOT EXISTS idx_inv_drug ON store_inventory(drug_code);

-- -------------------------------------------------------------
-- 4. Stores Table: Operational Metadata
-- -------------------------------------------------------------
ALTER TABLE stores ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'ACTIVE';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{}';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS seller_uid VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_seller ON stores(seller_uid);

-- -------------------------------------------------------------
-- 5. Order Status Log: Immutable Audit Trail
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_status_log (
  id              SERIAL PRIMARY KEY,
  requirement_id  VARCHAR(64) NOT NULL,
  from_status     VARCHAR(32),
  to_status       VARCHAR(32) NOT NULL,
  changed_by      VARCHAR(128) NOT NULL,
  changed_by_role VARCHAR(32) NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_req ON order_status_log(requirement_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON order_status_log(created_at);
