-- ============================================================
-- Migration 003: V3 Routing, Payments & Tiered Matching Schema
-- UPI VPA, dynamic checkout billing, dosage strength hashes, prescriptions
-- ============================================================

-- -------------------------------------------------------------
-- 1. Store UPI VPA Registry
-- -------------------------------------------------------------
ALTER TABLE stores ADD COLUMN IF NOT EXISTS upi_vpa VARCHAR(255);

-- -------------------------------------------------------------
-- 2. Requirements: Dynamic Billing, Payments & Routing
-- -------------------------------------------------------------
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS payment_status VARCHAR(32) DEFAULT 'PENDING';
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '{}';
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS fulfillment_type VARCHAR(32) DEFAULT 'PICKUP';
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS prescription_url TEXT;

CREATE INDEX IF NOT EXISTS idx_req_payment_status ON requirements(payment_status);
CREATE INDEX IF NOT EXISTS idx_req_fulfillment_type ON requirements(fulfillment_type);

-- -------------------------------------------------------------
-- 3. Tier 1 Clinical Matching: Salt + Dosage Strength Hashes
-- -------------------------------------------------------------
ALTER TABLE branded_meds ADD COLUMN IF NOT EXISTS salt_strength_hash VARCHAR(128);
ALTER TABLE generic_meds ADD COLUMN IF NOT EXISTS salt_strength_hash VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_branded_salt_strength ON branded_meds(salt_strength_hash);
CREATE INDEX IF NOT EXISTS idx_generic_salt_strength ON generic_meds(salt_strength_hash);
