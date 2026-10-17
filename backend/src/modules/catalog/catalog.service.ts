// ============================================================
// Catalog Module — Service Layer
// Branded→Generic matching via deterministic salt-hash.
// Pure business logic and domain orchestration; delegates data
// access to CatalogRepository.
// ============================================================

import { CatalogRepository, type GenericMedRow } from './catalog.repository';
import { NotFoundError } from '../../shared/errors';
import { extractForm, parsePackQuantity } from '../../shared/utils';
import type { GenericMedicine, SavingsResult } from '../../shared/types';

export type MatchTier = 'EXACT_MATCH' | 'CLOSE_MATCH' | 'SALT_EQUIVALENT' | 'NONE';

export interface GenericMatch {
  generic: GenericMedicine;
  matchTier: Exclude<MatchTier, 'NONE'>;
  /** Why this is not an exact match (empty for exact matches) */
  notes: string[];
  /** A pharmacist/admin confirmed this pairing */
  reviewed: boolean;
}

export class CatalogService {
  constructor(private readonly repository: CatalogRepository = new CatalogRepository()) {}

  /**
   * Best PMBJP generic for each branded medicine, from the precomputed
   * medicine_matches table (structured matcher, see shared/matching).
   *
   * Tiers:
   *   EXACT_MATCH     same ingredients, strengths, dosage form and release
   *   CLOSE_MATCH     same ingredients and strengths; form/salt variant on the same route
   *   SALT_EQUIVALENT same ingredients, different/unknown strength or release — not a
   *                   substitute; clients must tell the patient to ask their doctor
   */
  async matchForBranded(brandedIds: number[]): Promise<Map<number, GenericMatch>> {
    const rows = await this.repository.findMatchesForBranded(brandedIds);
    const result = new Map<number, GenericMatch>();
    for (const row of rows) {
      result.set(row.branded_id, {
        generic: this.mapGenericRow(row),
        matchTier: row.tier,
        notes: Array.isArray(row.notes) ? row.notes : [],
        reviewed: row.review_status === 'confirmed',
      });
    }
    return result;
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
    match_tier: MatchTier;
    match_notes: string[];
    match_reviewed: boolean;
  }> {
    const branded = await this.repository.findBrandedById(brandedId);
    if (!branded) {
      throw new NotFoundError('Branded medicine');
    }

    const match = (await this.matchForBranded([branded.id])).get(branded.id);
    const generic = match?.generic ?? null;

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
      match_tier: match?.matchTier ?? 'NONE',
      match_notes: match?.notes ?? [],
      match_reviewed: match?.reviewed ?? false,
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
    const row = await this.repository.findGenericBySaltHash(saltHash);
    if (!row) {
      throw new NotFoundError('Generic equivalent');
    }
    return this.mapGenericRow(row);
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
