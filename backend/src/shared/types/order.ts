// ============================================================
// Shared Domain Types — Order Lifecycle & Fulfillment
// ============================================================

/** Individual item within a requirement ticket */
export interface RequirementItem {
  code: string;
  quantity: number;
  name?: string;
  /** Ignored: prices are always taken from the catalogue. */
  mrp?: number;
  /** Ignored: the brand price is looked up from `branded_id`. */
  branded_mrp?: number;
  /** The branded medicine this generic replaces; used to compute the saving. */
  branded_id?: number;
}

/** Requirement ticket status lifecycle */
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
  ACCEPTED: ['PREPARING', 'CANCELLED_BY_SELLER', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN'],
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
  prescription_url?: string | null;
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

/** POST /requirements/create request body */
export interface CreateRequirementPayload {
  pmbjk_code: string;
  drug_codes: RequirementItem[];
  legal_attestation: boolean;
  delivery_address?: string;
  payment_mode?: string;
  prescription_url?: string;
  fulfillment_type?: 'PICKUP' | 'DELIVERY';
  delivery_coords?: { lat: number; lng: number };
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
