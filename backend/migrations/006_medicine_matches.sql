-- ============================================================
-- Migration 006: Precomputed branded → generic matches
-- Produced by scripts/build_matches.ts (structured matcher in
-- src/shared/matching). One row per branded medicine that has a
-- PMBJP generic with the same active ingredients.
-- ============================================================

CREATE TABLE IF NOT EXISTS medicine_matches (
  branded_id       INTEGER PRIMARY KEY REFERENCES branded_meds(id) ON DELETE CASCADE,
  generic_id       INTEGER NOT NULL REFERENCES generic_meds(id) ON DELETE CASCADE,
  -- EXACT_MATCH | CLOSE_MATCH | SALT_EQUIVALENT
  tier             VARCHAR(32) NOT NULL,
  score            SMALLINT NOT NULL,
  -- Human-readable reasons, e.g. ["Different strength: Telmisartan 40mg vs 80mg"]
  notes            JSONB NOT NULL DEFAULT '[]',
  matcher_version  VARCHAR(16) NOT NULL,
  -- 'auto' rows are recomputed on every build; 'confirmed' / 'rejected' rows were
  -- reviewed by a pharmacist or admin and are never overwritten by the matcher.
  review_status    VARCHAR(16) NOT NULL DEFAULT 'auto',
  reviewed_by      VARCHAR(128),
  reviewed_at      TIMESTAMP,
  computed_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medicine_matches_generic ON medicine_matches(generic_id);
CREATE INDEX IF NOT EXISTS idx_medicine_matches_tier ON medicine_matches(tier);
CREATE INDEX IF NOT EXISTS idx_medicine_matches_review ON medicine_matches(review_status);
