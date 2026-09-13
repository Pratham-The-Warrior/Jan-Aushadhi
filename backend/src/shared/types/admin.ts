// ============================================================
// Shared Domain Types — Super Admin & Platform Telemetry
// ============================================================

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
