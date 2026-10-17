-- ============================================================
-- Migration 004: Store Data Quality
-- Track how precise each store's coordinates are, remove fake
-- placeholder phone numbers, and repair truncated state names
-- from the source Kendra CSV.
-- ============================================================

-- -------------------------------------------------------------
-- 1. Location precision (see data/README.md)
--    NULL means the row predates real geocoding and still carries
--    synthetic coordinates; the store import replaces them.
-- -------------------------------------------------------------
ALTER TABLE stores ADD COLUMN IF NOT EXISTS location_precision VARCHAR(16);

-- Synthetic coordinates must never be used to tell a patient a store is "near" them.
UPDATE stores SET location = NULL WHERE location_precision IS NULL;

-- -------------------------------------------------------------
-- 2. Placeholder phones → NULL so clients can say "not available"
-- -------------------------------------------------------------
UPDATE stores SET phone = NULL WHERE phone = '+91 00000 00000' OR phone ~ '^[+0 ]*$';

-- -------------------------------------------------------------
-- 3. Truncated state names present in the source CSV
-- -------------------------------------------------------------
UPDATE stores SET state = 'Jammu And Kashmir' WHERE state = 'Jammu And';
UPDATE stores SET state = 'The Dadra And Nagar Haveli And Daman And Diu'
  WHERE state IN ('The Dadra And', 'The Dadra And Nagar Haveli And');
