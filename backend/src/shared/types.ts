// ============================================================
// Shared TypeScript Interfaces
// Domain types used across modules for type-safe data flow.
// V2: Extended with RBAC, expanded order lifecycle, seller/admin types.
// ============================================================

// ---- Authentication & RBAC ----

/** User roles for the tri-portal ecosystem */
export type UserRole = 'CUSTOMER' | 'STORE_OWNER' | 'SUPER_ADMIN';

/** Decoded Firebase user attached to authenticated requests */
export interface AuthUser {
  uid: string;
  phone_number?: string;
  email?: string;
  name?: string;
  /** Role resolved from PostgreSQL (not from Firebase token) */
  role?: UserRole;
  /** PMBJK code of the linked store (only for STORE_OWNER) */
  linked_pmbjk_code?: string;
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

// ---- Fulfillment Domain ----

/** Individual item within a requirement ticket */
export interface RequirementItem {
  code: string;
  quantity: number;
  name?: string;
  mrp?: number;
  branded_mrp?: number;
}

/** Requirement ticket status lifecycle (V2 expanded) */
export type RequirementStatus =
  | 'PENDING_ACCEPTANCE'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED_BY_CUSTOMER'
  | 'CANCELLED_BY_SELLER'
  | 'CANCELLED_BY_ADMIN';

/** Valid status transitions map — enforces business rules */
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING_ACCEPTANCE: ['ACCEPTED', 'CANCELLED_BY_SELLER', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN'],
  ACCEPTED: ['PREPARING', 'CANCELLED_BY_SELLER', 'CANCELLED_BY_ADMIN'],
  PREPARING: ['READY_FOR_PICKUP', 'CANCELLED_BY_SELLER', 'CANCELLED_BY_ADMIN'],
  READY_FOR_PICKUP: ['COMPLETED', 'CANCELLED_BY_ADMIN'],
  COMPLETED: [],
  CANCELLED_BY_CUSTOMER: [],
  CANCELLED_BY_SELLER: [],
  CANCELLED_BY_ADMIN: [],
};

/** Requirement ticket (order) */
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
  seller_notes: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_reason: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Order audit trail entry */
export interface OrderStatusLogEntry {
  id: number;
  requirement_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  changed_by_role: string;
  notes: string | null;
  created_at: string;
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

// ---- Seller Domain ----

/** Seller analytics summary */
export interface SellerAnalyticsSummary {
  total_orders: number;
  orders_today: number;
  total_revenue: number;
  revenue_today: number;
  avg_order_value: number;
  pending_orders: number;
}

/** Seller daily analytics data point */
export interface SellerDailyAnalytics {
  date: string;
  orders: number;
  revenue: number;
  savings: number;
}

// ---- Admin Domain ----

/** Platform-wide statistics for the admin dashboard */
export interface PlatformStats {
  total_users: number;
  total_stores: number;
  total_orders: number;
  total_gmv: number;
  total_savings: number;
  orders_today: number;
  orders_this_week: number;
  orders_this_month: number;
  active_stores: number;
  store_owners: number;
}

// ---- Request Payloads ----

/** POST /requirements/create request body */
export interface CreateRequirementPayload {
  pmbjk_code: string;
  drug_codes: RequirementItem[];
  legal_attestation: boolean;
  delivery_address?: string;
  payment_mode?: string;
  fulfillment_type?: 'PICKUP' | 'DELIVERY';
  delivery_coords?: { lat: number; lng: number };
}

/** Cart item stored in the user's medical basket */
export interface BasketItem {
  drug_code: string;
  name: string;
  mrp: number;
  branded_name?: string;
  branded_mrp?: number;
  unit_size?: string;
  group_name?: string;
  quantity: number;
}

/** PUT /user/basket request body */
export interface UpdateBasketPayload {
  medical_basket: BasketItem[];
}

/** PATCH /seller/orders/:id/status request body */
export interface UpdateOrderStatusPayload {
  status: RequirementStatus;
  notes?: string;
}

/** POST /seller/orders/:id/reject request body */
export interface RejectOrderPayload {
  reason: string;
}

/** PATCH /admin/users/:uid/role request body */
export interface UpdateUserRolePayload {
  role: UserRole;
  linked_pmbjk_code?: string;
}
