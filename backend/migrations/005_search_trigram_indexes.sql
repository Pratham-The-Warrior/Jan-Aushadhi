-- ============================================================
-- Migration 005: Trigram indexes for PostgreSQL search fallback
-- Keeps ILIKE '%query%' fast when Meilisearch is unavailable.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_branded_name_trgm ON branded_meds USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_branded_comp1_trgm ON branded_meds USING gin (composition1 gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_branded_comp2_trgm ON branded_meds USING gin (composition2 gin_trgm_ops);
