// ============================================================
// Catalog Module — Service Layer
// Branded→Generic matching via deterministic salt-hash.
// Pure business logic and domain orchestration; delegates data
// access to CatalogRepository.
// ============================================================

import { CatalogRepository, type GenericMedRow } from './catalog.repository';
import { NotFoundError } from '../../shared/errors';
import { extractForm, parsePackQuantity } from '../../shared/utils';
import { APP_CONSTANTS } from '../../shared/constants';
import type { GenericMedicine, SavingsResult } from '../../shared/types';

export class CatalogService {
  private readonly cachePrefix = APP_CONSTANTS.REDIS_GENERIC_PREFIX;

  constructor(private readonly repository: CatalogRepository = new CatalogRepository()) {}

  /**
   * Lookup a generic medicine using 2-Tier matching:
   * Tier 1 (EXACT_MATCH): same salts, same strengths, same form — a true substitute.
   * Tier 2 (SALT_EQUIVALENT): same salts and form but a DIFFERENT strength. This is not
   *   a drop-in substitute; clients must tell the patient to confirm the dose with a doctor.
   *
   * @param saltHash          Deterministic hash of the chemical molecule + form
   * @param saltStrengthHash  Deterministic hash of molecule + strength + form
   */
  async matchGeneric(saltHash: string, saltStrengthHash?: string | null): Promise<{
    generic: GenericMedicine | null;
    matchTier: 'EXACT_MATCH' | 'SALT_EQUIVALENT' | 'NONE';
  }> {
    if (!saltHash && !saltStrengthHash) {
      return { generic: null, matchTier: 'NONE' };
    }

    const cacheKey = `${this.cachePrefix}${saltStrengthHash || saltHash}`;
    const cached = await this.repository.getCachedMatch(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Continue to database on corrupted cache entry
      }
    }

    // Tier 1: Try exact dose & salt match first
    if (saltStrengthHash) {
      const tier1Row = await this.repository.findGenericBySaltStrengthHash(saltStrengthHash);
      if (tier1Row) {
        const result = {
          generic: this.mapGenericRow(tier1Row),
          matchTier: 'EXACT_MATCH' as const,
        };
        await this.repository.setCachedMatch(cacheKey, JSON.stringify(result));
        return result;
      }
    }

    // Tier 2: Fallback to chemical molecule equivalent (ensures patients never get 0 results)
    if (saltHash) {
      const tier2Row = await this.repository.findGenericBySaltHash(saltHash);
      if (tier2Row) {
        const result = {
          generic: this.mapGenericRow(tier2Row),
          matchTier: 'SALT_EQUIVALENT' as const,
        };
        await this.repository.setCachedMatch(cacheKey, JSON.stringify(result));
        return result;
      }
    }

    return { generic: null, matchTier: 'NONE' };
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
    match_tier: 'EXACT_MATCH' | 'SALT_EQUIVALENT' | 'NONE';
  }> {
    const branded = await this.repository.findBrandedById(brandedId);
    if (!branded) {
      throw new NotFoundError('Branded medicine');
    }

    const match = await this.matchGeneric(branded.salt_hash, branded.salt_strength_hash);
    const generic = match.generic;

    const savings = this.calculateSavings(
      typeof branded.mrp === 'string' ? parseFloat(branded.mrp) || 0 : branded.mrp || 0,
      generic?.mrp || 0,
      branded.pack_size_label,
      generic?.unit_size,
    );

    return {
      branded: {
        id: branded.id,
        name: branded.name,
        mrp: typeof branded.mrp === 'string' ? parseFloat(branded.mrp) || 0 : branded.mrp,
        manufacturer: branded.manufacturer,
        pack_size: branded.pack_size_label,
        composition1: branded.composition1,
        composition2: branded.composition2,
        form: extractForm(branded.name || ''),
      },
      generic: generic ? { ...generic } : null,
      savings,
      match_tier: match.matchTier,
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
    const match = await this.matchGeneric(saltHash);
    if (!match.generic) {
      throw new NotFoundError('Generic equivalent');
    }
    return match.generic;
  }

  /**
   * Calculate savings between branded and generic prices.
   *
   * Pack MRPs alone are misleading (a strip of 15 vs a pack of 10), so when both
   * pack sizes parse to the same unit we compare price per tablet / ml / g and
   * express the saving for the quantity in the branded pack. A generic that is
   * not cheaper yields zero savings rather than a negative number.
   */
  calculateSavings(
    brandedMrp: number,
    genericMrp: number,
    brandedPack?: string | null,
    genericPack?: string | null,
  ): SavingsResult {
    if (!brandedMrp || !genericMrp || brandedMrp <= 0) {
      return { absolute: 0, percentage: 0, basis: 'per_pack' };
    }

    let genericCostForBrandedQty = genericMrp;
    let basis: SavingsResult['basis'] = 'per_pack';

    const b = parsePackQuantity(brandedPack);
    const g = parsePackQuantity(genericPack);
    if (b && g && b.unit === g.unit && b.qty > 0 && g.qty > 0) {
      genericCostForBrandedQty = (genericMrp / g.qty) * b.qty;
      basis = 'per_unit';
    }

    const absolute = Math.max(0, brandedMrp - genericCostForBrandedQty);
    const percentage = (absolute / brandedMrp) * 100;

    return {
      absolute: Math.round(absolute * 100) / 100,
      percentage: Math.round(percentage * 10) / 10,
      basis,
    };
  }

  // ---- Private Helpers ----

  /** Map a raw database row to a typed GenericMedicine */
  private mapGenericRow(row: GenericMedRow): GenericMedicine {
    return {
      drug_code: row.drug_code,
      generic_name: row.generic_name,
      mrp: typeof row.mrp === 'string' ? parseFloat(row.mrp) || 0 : row.mrp || 0,
      unit_size: row.unit_size,
      group_name: row.group_name,
      salt_hash: row.salt_hash,
      indications: row.indications,
      side_effects: row.side_effects,
      storage_info: row.storage_info,
    };
  }
}
