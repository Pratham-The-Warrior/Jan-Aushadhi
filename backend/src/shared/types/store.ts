// ============================================================
// Shared Domain Types — Kendra Stores & Inventory
// ============================================================

/** Store operational status */
export type StoreStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

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
  status?: StoreStatus;
  operating_hours?: Record<string, string>;
  seller_uid?: string;
  verified_at?: string;
}

/** Store search result envelope */
export interface StoreSearchResult {
  count: number;
  stores: Store[];
}

/** Per-store inventory entry */
export interface StoreInventoryItem {
  pmbjk_code: string;
  drug_code: string;
  in_stock: boolean;
  last_updated: string;
  // Joined from generic_meds for display
  generic_name?: string;
  mrp?: number;
  unit_size?: string;
  group_name?: string;
}
