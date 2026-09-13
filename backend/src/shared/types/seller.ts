// ============================================================
// Shared Domain Types — Seller Portal & Analytics
// ============================================================

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
