// ============================================================
// Fulfillment Module — Repository Layer
// Encapsulates database transactions, PostGIS spatial queries,
// order status audit trails, and inventory lookups.
// ============================================================

import { queryDB } from '../../shared/infra/database';
import type { RequirementItem } from '../../shared/types';

export interface NearbyStoreRow {
  pmbjk_code: string;
  name: string;
  address: string;
  pincode: string;
  state: string;
  district: string;
  distance: number;
}

export class FulfillmentRepository {
  /**
   * Find active stores within search radius using PostGIS.
   */
  async findNearbyActiveStores(lng: number, lat: number, radiusMeters: number = 10000): Promise<NearbyStoreRow[]> {
    const res = await queryDB(
      `SELECT pmbjk_code, name, address, pincode, state, district,
              ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance
       FROM stores
       WHERE status = 'ACTIVE'
         AND ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
       ORDER BY distance ASC
       LIMIT 20`,
      [lng, lat, radiusMeters],
    );
    return res.rows as NearbyStoreRow[];
  }

  /**
   * Check which candidate stores are out of stock for requested drug codes.
   */
  async findOutOfStockStoreCodes(storeCodes: string[], drugCodes: string[]): Promise<string[]> {
    const res = await queryDB(
      `SELECT pmbjk_code
       FROM store_inventory
       WHERE pmbjk_code = ANY($1)
         AND drug_code = ANY($2)
         AND in_stock = false`,
      [storeCodes, drugCodes],
    );
    return res.rows.map((r: any) => r.pmbjk_code);
  }

  /**
   * Lookup store details (name, phone, UPI VPA).
   */
  async findStoreDetails(pmbjkCode: string): Promise<{ name: string; phone: string; upi_vpa?: string } | null> {
    const res = await queryDB(
      `SELECT name, phone, upi_vpa FROM stores WHERE pmbjk_code = $1`,
      [pmbjkCode],
    );
    return res.rows[0] || null;
  }

  /**
   * Fetch verified MRP and generic name directly from generic_meds table.
   */
  async findVerifiedGenericMeds(drugCodes: string[]): Promise<Map<string, { mrp: number; name: string }>> {
    const res = await queryDB(
      `SELECT drug_code, generic_name, mrp FROM generic_meds WHERE drug_code = ANY($1)`,
      [drugCodes],
    );
    const map = new Map<string, { mrp: number; name: string }>();
    for (const r of res.rows) {
      map.set(r.drug_code, { mrp: parseFloat(r.mrp), name: r.generic_name });
    }
    return map;
  }

  /**
   * Create a requirement ticket with status log entry.
   */
  async createRequirement(params: {
    ticketId: string;
    userId: string;
    pmbjkCode: string;
    itemsJson: string;
    status: string;
    legalAttestation: boolean;
    deliveryAddress: string;
    paymentMode: string;
    fulfillmentType: string;
    prescriptionUrl?: string;
    totalBrandedValue: number;
    totalGenericValue: number;
    savings: number;
    paymentDetailsJson: string;
  }): Promise<void> {
    await queryDB(
      `INSERT INTO requirements (
         id, user_id, pmbjk_code, items, status, legal_attestation,
         delivery_address, payment_mode, fulfillment_type, prescription_url,
         total_branded_value, total_generic_value, savings, payment_details
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        params.ticketId,
        params.userId,
        params.pmbjkCode,
        params.itemsJson,
        params.status,
        params.legalAttestation,
        params.deliveryAddress,
        params.paymentMode,
        params.fulfillmentType,
        params.prescriptionUrl || null,
        params.totalBrandedValue,
        params.totalGenericValue,
        params.savings,
        params.paymentDetailsJson,
      ],
    );

    // Write audit log entry
    await queryDB(
      `INSERT INTO order_status_log (requirement_id, from_status, to_status, changed_by, changed_by_role, notes)
       VALUES ($1, NULL, $2, $3, 'CUSTOMER', 'Order submitted by customer')`,
      [params.ticketId, params.status, params.userId],
    );
  }

  /**
   * Upsert customer record upon checkout.
   */
  async upsertCustomer(userId: string, name?: string, phone?: string, email?: string): Promise<void> {
    await queryDB(
      `INSERT INTO users (firebase_uid, name, phone, email, role)
       VALUES ($1, $2, $3, $4, 'CUSTOMER')
       ON CONFLICT (firebase_uid)
       DO UPDATE SET
         name  = COALESCE(EXCLUDED.name, users.name),
         phone = COALESCE(EXCLUDED.phone, users.phone),
         email = COALESCE(EXCLUDED.email, users.email)`,
      [userId, name || null, phone || null, email || null],
    );
  }

  /**
   * Retrieve order history for a user.
   */
  async findUserRequirements(userId: string, limit: number = 50): Promise<any[]> {
    const res = await queryDB(
      `SELECT r.*, s.name as store_name, s.address as store_address, s.phone as store_phone
       FROM requirements r
       LEFT JOIN stores s ON r.pmbjk_code = s.pmbjk_code
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2`,
      [userId, limit],
    );
    return res.rows;
  }

  /**
   * Retrieve single requirement by ID.
   */
  async findRequirementById(requirementId: string): Promise<any | null> {
    const res = await queryDB(
      `SELECT r.*, s.name as store_name, s.address as store_address, s.phone as store_phone
       FROM requirements r
       LEFT JOIN stores s ON r.pmbjk_code = s.pmbjk_code
       WHERE r.id = $1`,
      [requirementId],
    );
    return res.rows[0] || null;
  }

  /**
   * Cancel an order by customer.
   */
  async cancelRequirement(requirementId: string, userId: string, fromStatus: string, reason?: string): Promise<void> {
    await queryDB(
      `UPDATE requirements
       SET status = 'CANCELLED_BY_CUSTOMER',
           cancelled_reason = $1,
           cancelled_by = 'CUSTOMER',
           updated_at = NOW()
       WHERE id = $2`,
      [reason || 'Cancelled by customer', requirementId],
    );

    await queryDB(
      `INSERT INTO order_status_log (requirement_id, from_status, to_status, changed_by, changed_by_role, notes)
       VALUES ($1, $2, 'CANCELLED_BY_CUSTOMER', $3, 'CUSTOMER', $4)`,
      [requirementId, fromStatus, userId, reason || 'Cancelled by customer'],
    );
  }

  /**
   * Aggregate lifetime savings and orders for a user.
   */
  async findUserLifetimeStats(userId: string): Promise<{
    lifetime_savings: string;
    lifetime_branded: string;
    total_orders: string;
  }> {
    const res = await queryDB(
      `SELECT
         COALESCE(SUM(savings), 0) as lifetime_savings,
         COALESCE(SUM(total_branded_value), 0) as lifetime_branded,
         COUNT(*) as total_orders
       FROM requirements
       WHERE user_id = $1 AND status != 'CANCELLED_BY_CUSTOMER' AND status != 'CANCELLED_BY_SELLER'`,
      [userId],
    );
    return res.rows[0];
  }

  /**
   * Aggregate savings for the last 30 days.
   */
  async findUser30DaySavings(userId: string): Promise<number> {
    const res = await queryDB(
      `SELECT COALESCE(SUM(savings), 0) as monthly_savings
       FROM requirements
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
      [userId],
    );
    return parseFloat(res.rows[0]?.monthly_savings || '0');
  }

  /**
   * Retrieve active prescriptions from the most recent confirmed/active order.
   */
  async findActivePrescriptionItems(userId: string): Promise<any[]> {
    const res = await queryDB(
      `SELECT items FROM requirements
       WHERE user_id = $1 AND status IN ('COMPLETED', 'READY_FOR_PICKUP', 'ACCEPTED')
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId],
    );

    if (res.rows.length === 0) return [];
    return typeof res.rows[0].items === 'string'
      ? JSON.parse(res.rows[0].items)
      : res.rows[0].items;
  }

  /**
   * Monthly savings aggregate for chart over the last 6 months.
   */
  async findMonthlySavingsChart(userId: string): Promise<{ month: string; savings: number; spend: number }[]> {
    const res = await queryDB(
      `SELECT
         TO_CHAR(created_at, 'Mon') as month,
         DATE_TRUNC('month', created_at) as month_sort,
         COALESCE(SUM(savings), 0) as savings,
         COALESCE(SUM(total_generic_value), 0) as spend
       FROM requirements
       WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '6 months'
         AND status != 'CANCELLED_BY_CUSTOMER'
         AND status != 'CANCELLED_BY_SELLER'
       GROUP BY DATE_TRUNC('month', created_at), TO_CHAR(created_at, 'Mon')
       ORDER BY month_sort ASC`,
      [userId],
    );
    return res.rows.map((r: any) => ({
      month: r.month,
      savings: Math.round(parseFloat(r.savings) * 100) / 100,
      spend: Math.round(parseFloat(r.spend) * 100) / 100,
    }));
  }

  /**
   * Update medical basket for user.
   */
  async updateMedicalBasket(userId: string, basket: any[]): Promise<void> {
    await queryDB(
      `UPDATE users SET medical_basket = $1 WHERE firebase_uid = $2`,
      [JSON.stringify(basket), userId],
    );
  }

  /**
   * Retrieve user profile.
   */
  async findUserProfile(userId: string): Promise<any | null> {
    const res = await queryDB(
      `SELECT id, firebase_uid, name, phone, email, medical_basket, role, linked_pmbjk_code, created_at
       FROM users WHERE firebase_uid = $1`,
      [userId],
    );
    return res.rows[0] || null;
  }
}
