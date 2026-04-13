// ============================================================
// Shared TypeScript Interfaces
// Domain types used across modules for type-safe data flow.
// ============================================================

// ---- Authentication ----

/** Decoded Firebase user attached to authenticated requests */
export interface AuthUser {
  uid: string;
  phone_number?: string;
  email?: string;
  name?: string;
}

// ---- Medicine Domain ----

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
}

/** Lightweight suggestion returned by autocomplete */
export interface SearchSuggestion {
  id: number;
  name: string;
  manufacturer: string;
  mrp: number;
  composition: string | null;
}

// ---- Store Domain ----

/** PMBJK Kendra store */
export interface Store {
  pmbjk_code: string;
  name: string;
  phone: string;
  address: string;
  pincode: string;
  state: string;
  district: string;
  distance_km?: number;
}

/** Store search result envelope */
export interface StoreSearchResult {
  count: number;
  stores: Store[];
}

// ---- Fulfillment Domain ----

/** Individual item within a requirement ticket */
export interface RequirementItem {
  code: string;
  quantity: number;
  name?: string;
  mrp?: number;
  branded_mrp?: number;
}

/** Requirement ticket status lifecycle */
export type RequirementStatus = 'PENDING' | 'SENT' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED';

/** Requirement ticket (checkout → WhatsApp handoff) */
export interface Requirement {
  id: string;
  user_id: string;
  pmbjk_code: string;
  items: RequirementItem[];
  status: RequirementStatus;
  legal_attestation: boolean;
  delivery_address: string;
  payment_mode: string;
  total_branded_value: number;
  total_generic_value: number;
  savings: number;
  created_at: string;
  updated_at: string;
}

/** Dashboard aggregated statistics */
export interface DashboardStats {
  average_savings_percent: number;
  annual_savings_projection: number;
  lifetime_savings: number;
  total_orders: number;
}

/** Monthly savings chart data point */
export interface MonthlySavings {
  month: string;
  savings: number;
  spend: number;
}

// ---- Request Payloads ----

/** POST /requirements/create request body */
export interface CreateRequirementPayload {
  pmbjk_code: string;
  drug_codes: RequirementItem[];
  legal_attestation: boolean;
  delivery_address?: string;
  payment_mode?: string;
}

/** PUT /user/basket request body */
export interface UpdateBasketPayload {
  medical_basket: unknown[];
}
