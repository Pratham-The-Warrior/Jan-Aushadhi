// ============================================================
// Shared Domain Types — Medicine Catalog & Search
// ============================================================

/** Branded (commercial) medicine from the 250K dataset */
export interface BrandedMedicine {
  id: number;
  name: string;
  mrp: number;
  manufacturer: string;
  pack_size: string;
  composition1: string | null;
  composition2: string | null;
  salt_hash: string | null;
  form: string;
}

/** PMBJK generic medicine from the Jan Aushadhi catalog */
export interface GenericMedicine {
  drug_code: string;
  generic_name: string;
  mrp: number;
  unit_size: string;
  group_name: string;
  salt_hash: string;
  salt_strength_hash?: string;
  indications?: string;
  side_effects?: string;
  storage_info?: string;
}

/** Computed savings between branded and generic */
export interface SavingsResult {
  absolute: number;
  percentage: number;
}

/** Combined search result: branded → generic pair with savings */
export interface DiscoveryResult {
  id: number;
  branded: BrandedMedicine;
  generic: GenericMedicine | null;
  savings: SavingsResult;
  match_tier?: 'EXACT_MATCH' | 'SALT_EQUIVALENT' | 'NONE';
}

/** Lightweight suggestion returned by autocomplete */
export interface SearchSuggestion {
  id: number;
  name: string;
  manufacturer: string;
  mrp: number;
  composition: string | null;
}
