// ============================================================
// Catalog Module — Repository Layer
// Encapsulates database queries for branded & generic medicines,
// along with Redis caching operations.
// ============================================================

import { queryDB } from '../../shared/infra/database';
import { getCached, setCache } from '../../shared/infra/redis';
import { config } from '../../shared/config';

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
   * Tier 1 exact match: Chemical salt + exact dosage strength + form.
   */
  async findGenericBySaltStrengthHash(saltStrengthHash: string): Promise<GenericMedRow | null> {
    const res = await queryDB(
      'SELECT * FROM generic_meds WHERE salt_strength_hash = $1 LIMIT 1',
      [saltStrengthHash],
    );
    return (res.rows[0] as GenericMedRow) || null;
  }

  /**
   * Tier 2 broad match: Chemical salt + form equivalent fallback.
   */
  async findGenericBySaltHash(saltHash: string): Promise<GenericMedRow | null> {
    const res = await queryDB(
      'SELECT * FROM generic_meds WHERE salt_hash = $1 ORDER BY id ASC LIMIT 1',
      [saltHash],
    );
    return (res.rows[0] as GenericMedRow) || null;
  }

  /**
   * Retrieve cached generic match result from Redis.
   */
  async getCachedMatch(cacheKey: string): Promise<string | null> {
    return getCached(cacheKey);
  }

  /**
   * Store generic match result in Redis cache.
   */
  async setCachedMatch(cacheKey: string, value: string, ttl: number = config.redisTtl): Promise<void> {
    await setCache(cacheKey, value, ttl);
  }
}
