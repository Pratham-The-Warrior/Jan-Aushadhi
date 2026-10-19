-- ============================================================
-- Migration 007: Stable catalogue keys for re-runnable ETL
-- The ETL now upserts instead of deleting and re-inserting, so
-- product ids (in URLs, carts, orders and the search index) and
-- pharmacist-reviewed matches survive a catalogue refresh.
-- ============================================================

-- One row per Jan Aushadhi drug code (the ETL upserts on it).
CREATE UNIQUE INDEX IF NOT EXISTS uq_generic_meds_drug_code ON generic_meds (drug_code);
