// ============================================================
// Shared Domain Types — User & Authentication
// ============================================================

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

/** PATCH /admin/users/:uid/role request body */
export interface UpdateUserRolePayload {
  role: UserRole;
  linked_pmbjk_code?: string;
}
