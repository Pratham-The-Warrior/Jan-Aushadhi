// ============================================================
// Catalog Module — Service Layer
// Branded→Generic matching via deterministic salt-hash.
// Owns the Redis caching strategy for molecule lookups.
// Pure business logic, no HTTP concerns.
// ============================================================

import { queryDB } from '../../shared/infra/database';
import { getCached, setCache } from '../../shared/infra/redis';
import { NotFoundError, ExternalServiceError } from '../../shared/errors';
import { config } from '../../shared/config';
import type { GenericMedicine, SavingsResult } from '../../shared/types';

/** Dosage form extraction from medicine name */
function extractForm(name: string): string {
  const n = name.toLowerCase();
  if (/\binj(ection)?\b|\bvial\b|\bwfi\b|\binfusion\b/.test(n)) return 'Injection';
  if (/\bsyr(up)?\b/.test(n)) return 'Syrup';
  if (/\bsuspension\b/.test(n)) return 'Suspension';
  if (/\bdrop(s)?\b/.test(n)) return 'Drops';
  if (/\bcream\b|\boint(ment)?\b|\bgel\b|\blotion\b/.test(n)) return 'Topical';
  if (/\bpowder\b/.test(n)) return 'Powder';
  if (/\bcap(sule)?s?\b/.test(n)) return 'Capsule';
  if (/\btab(let)?s?\b/.test(n)) return 'Tablet';
  return 'Other';
}

export class CatalogService {
  private readonly cachePrefix = 'generic:';

  /**
   * Lookup a generic medicine by its deterministic salt-hash.
   * Uses Redis cache with configurable TTL, falls back to Postgres.
   *
   * @param saltHash  Deterministic hash of the molecule composition
   * @returns Generic medicine record or null if no match
   */
  async matchGeneric(saltHash: string): Promise<GenericMedicine | null> {
    // 1. Check Redis cache
    const cached = await getCached(`${this.cachePrefix}${saltHash}`);
    if (cached) {
      return JSON.parse(cached) as GenericMedicine;
    }

    // 2. Query PostgreSQL
    const result = await queryDB(
      'SELECT * FROM generic_meds WHERE salt_hash = $1 LIMIT 1',
      [saltHash],
    );

    if (result.rows.length === 0) return null;

    const generic = this.mapGenericRow(result.rows[0]);

    // 3. Populate cache
    await setCache(
      `${this.cachePrefix}${saltHash}`,
      JSON.stringify(generic),
      config.redisTtl,
    );

    return generic;
  }

  /**
   * Get full clinical discovery detail for a branded medicine by ID.
   * Joins with generic data via salt-hash for the complete picture.
   *
   * @param brandedId  Primary key of the branded medicine
   * @throws NotFoundError if the branded medicine doesn't exist
   */
  async getDiscoveryDetail(brandedId: number): Promise<{
    branded: Record<string, unknown>;
    generic: GenericMedicine | null;
    savings: SavingsResult;
  }> {
    const brandedRes = await queryDB(
      'SELECT * FROM branded_meds WHERE id = $1',
      [brandedId],
    );

    if (brandedRes.rows.length === 0) {
      throw new NotFoundError('Branded medicine');
    }

    const branded = brandedRes.rows[0];
    const saltHash = branded.salt_hash;
    const generic = saltHash ? await this.matchGeneric(saltHash) : null;

    const savings = this.calculateSavings(
      parseFloat(branded.mrp) || 0,
      generic?.mrp || 0,
    );

    return {
      branded: {
        id: branded.id,
        name: branded.name,
        mrp: parseFloat(branded.mrp),
        manufacturer: branded.manufacturer,
        pack_size: branded.pack_size_label,
        composition1: branded.composition1,
        composition2: branded.composition2,
        form: extractForm(branded.name || ''),
      },
      generic: generic
        ? {
            ...generic,
            indications: branded.salt_hash ? (await this.getFullGeneric(branded.salt_hash))?.indications : undefined,
            side_effects: branded.salt_hash ? (await this.getFullGeneric(branded.salt_hash))?.side_effects : undefined,
            storage_info: branded.salt_hash ? (await this.getFullGeneric(branded.salt_hash))?.storage_info : undefined,
          }
        : null,
      savings,
    };
  }

  /**
   * Lookup a generic medicine by salt-hash — public API for the
   * /catalog/by-salt/:salt_hash endpoint.
   *
   * @param saltHash  Deterministic hash of the molecule composition
   * @throws NotFoundError if no generic equivalent exists
   */
  async getGenericBySaltHash(saltHash: string): Promise<GenericMedicine> {
    const generic = await this.matchGeneric(saltHash);
    if (!generic) {
      throw new NotFoundError('Generic equivalent');
    }
    return generic;
  }

  /**
   * Calculate savings between branded and generic prices.
   */
  calculateSavings(brandedMrp: number, genericMrp: number): SavingsResult {
    if (!brandedMrp || !genericMrp || brandedMrp <= 0) {
      return { absolute: 0, percentage: 0 };
    }

    const absolute = brandedMrp - genericMrp;
    const percentage = (absolute / brandedMrp) * 100;

    return {
      absolute: Math.round(absolute * 100) / 100,
      percentage: Math.round(percentage * 10) / 10,
    };
  }

  // ---- Private Helpers ----

  /**
   * Get full generic record including clinical data fields.
   * Used for discovery detail page.
   */
  private async getFullGeneric(saltHash: string): Promise<any | null> {
    const result = await queryDB(
      'SELECT * FROM generic_meds WHERE salt_hash = $1 LIMIT 1',
      [saltHash],
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /** Map a raw PostgreSQL row to a typed GenericMedicine */
  private mapGenericRow(row: any): GenericMedicine {
    return {
      drug_code: row.drug_code,
      generic_name: row.generic_name,
      mrp: parseFloat(row.mrp) || 0,
      unit_size: row.unit_size,
      group_name: row.group_name,
      salt_hash: row.salt_hash,
      indications: row.indications,
      side_effects: row.side_effects,
      storage_info: row.storage_info,
    };
  }
}
