// ============================================================
// Catalog Module — Repository Layer
// Encapsulates database queries for branded & generic medicines,
// along with Redis caching operations.
// ============================================================

import { queryDB } from '../../shared/infra/database';

export interface BrandedMedRow {
  id: number;
  name: string;
  mrp: string | number;
  manufacturer: string;
  type?: string;
  pack_size_label: string;
  composition1: string;
  composition2: string;
  salt_hash: string;
  salt_strength_hash?: string;
  is_discontinued?: boolean;
}

export interface GenericMedRow {
  id: number;
  drug_code: string;
  generic_name: string;
  mrp: string | number;
  unit_size: string;
  group_name: string;
  salt_hash: string;
  salt_strength_hash?: string;
  indications?: string;
  side_effects?: string;
  storage_info?: string;
  clinical_data?: Record<string, unknown>;
}

export interface MatchRow extends GenericMedRow {
  branded_id: number;
  tier: 'EXACT_MATCH' | 'CLOSE_MATCH' | 'SALT_EQUIVALENT';
  score: number;
  notes: string[];
  review_status: 'auto' | 'confirmed';
}

export class CatalogRepository {
  /**
   * Fetch branded medicine record by primary key.
   */
  async findBrandedById(brandedId: number): Promise<BrandedMedRow | null> {
    const res = await queryDB(
      'SELECT * FROM branded_meds WHERE id = $1',
      [brandedId],
    );
    return (res.rows[0] as BrandedMedRow) || null;
  }

  /**
   * Any generic sharing a salt-hash (legacy /catalog/by-salt endpoint).
   */
  async findGenericBySaltHash(saltHash: string): Promise<GenericMedRow | null> {
    const res = await queryDB(
      'SELECT * FROM generic_meds WHERE salt_hash = $1 ORDER BY id ASC LIMIT 1',
      [saltHash],
    );
    return (res.rows[0] as GenericMedRow) || null;
  }

  /**
   * Precomputed best generic for each branded id (see match-builder.ts).
   * Rejected reviews are excluded.
   */
  async findMatchesForBranded(brandedIds: number[]): Promise<MatchRow[]> {
    if (brandedIds.length === 0) return [];
    const res = await queryDB(
      `SELECT m.branded_id, m.tier, m.score, m.notes, m.review_status, g.*
       FROM medicine_matches m
       JOIN generic_meds g ON g.id = m.generic_id
       WHERE m.branded_id = ANY($1) AND m.review_status <> 'rejected'`,
      [brandedIds],
    );
    return res.rows as MatchRow[];
  }
}
