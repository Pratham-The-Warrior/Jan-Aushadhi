// ============================================================
// Seller Module — Repository Layer
// Encapsulates all database operations for Seller Central:
// store profile, order lifecycle, inventory management, and analytics.
// ============================================================

import { queryDB, withTransaction } from '../../shared/infra/database';
import type {
  AuthUser,
  RequirementStatus,
  SellerAnalyticsSummary,
  SellerDailyAnalytics,
  StoreInventoryItem,
} from '../../shared/types';
import { NotFoundError } from '../../shared/errors';

export class SellerRepository {
  /**
   * Get store profile for a given PMBJK code.
   */
  async getStoreProfile(pmbjkCode: string): Promise<Record<string, unknown> | null> {
    const result = await queryDB(
      `SELECT pmbjk_code, name, phone, address, pincode, state, district,
              status, operating_hours, verified_at, upi_vpa
       FROM stores WHERE pmbjk_code = $1`,
      [pmbjkCode],
    );
    return result.rows[0] || null;
  }

  /**
   * Update store profile fields.
   */
  async updateStoreProfile(
    pmbjkCode: string,
    setClauses: string[],
    values: unknown[],
  ): Promise<void> {
    await queryDB(
      `UPDATE stores SET ${setClauses.join(', ')} WHERE pmbjk_code = $${values.length}`,
      values,
    );
  }

  /**
   * Count total orders matching filter criteria.
   */
  async countOrders(whereClause: string, params: unknown[]): Promise<number> {
    const countResult = await queryDB(
      `SELECT COUNT(*) as total FROM requirements r ${whereClause}`,
      params,
    );
    return parseInt(countResult.rows[0]?.total || '0', 10);
  }

  /**
   * Fetch paginated orders with customer info.
   */
  async findOrders(whereClause: string, params: unknown[]): Promise<unknown[]> {
    const result = await queryDB(
      `SELECT r.*, u.name as customer_name, u.phone as customer_phone, u.email as customer_email
       FROM requirements r
       LEFT JOIN users u ON r.user_id = u.firebase_uid
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return result.rows;
  }

  /**
   * Get a single order detail scoped to a store.
   */
  async findOrderDetail(
    pmbjkCode: string,
    orderId: string,
  ): Promise<Record<string, unknown> | null> {
    const result = await queryDB(
      `SELECT r.*, u.name as customer_name, u.phone as customer_phone, u.email as customer_email
       FROM requirements r
       LEFT JOIN users u ON r.user_id = u.firebase_uid
       WHERE r.id = $1 AND r.pmbjk_code = $2`,
      [orderId, pmbjkCode],
    );
    return result.rows[0] || null;
  }

  /**
   * Fetch audit trail logs for an order.
   */
  async findOrderAuditTrail(orderId: string): Promise<unknown[]> {
    const auditResult = await queryDB(
      `SELECT * FROM order_status_log WHERE requirement_id = $1 ORDER BY created_at ASC`,
      [orderId],
    );
    return auditResult.rows;
  }

  /**
   * Execute atomic order status update with row lock and audit trail logging.
   */
  async updateOrderStatusTx(
    pmbjkCode: string,
    orderId: string,
    executeFn: (currentOrder: Record<string, unknown>) => {
      newStatus: RequirementStatus;
      updateFields: string[];
      updateValues: unknown[];
      notes?: string;
    },
    user: AuthUser,
  ): Promise<Record<string, unknown>> {
    return withTransaction(async (client) => {
      // 1. Fetch current order with row locking
      const currentResult = await client.query(
        'SELECT * FROM requirements WHERE id = $1 AND pmbjk_code = $2 FOR UPDATE',
        [orderId, pmbjkCode],
      );

      if (currentResult.rows.length === 0) {
        throw new NotFoundError('Order');
      }

      const currentOrder = currentResult.rows[0];
      const currentStatus = currentOrder.status as string;

      // 2. Compute update parameters via callback
      const { newStatus, updateFields, updateValues, notes } = executeFn(currentOrder);

      // 3. Update requirement record
      const updateResult = await client.query(
        `UPDATE requirements SET ${updateFields.join(', ')} WHERE id = $${updateValues.length} RETURNING *`,
        updateValues,
      );

      // 4. Log the transition in audit trail
      await client.query(
        `INSERT INTO order_status_log (requirement_id, from_status, to_status, changed_by, changed_by_role, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, currentStatus, newStatus, user.uid, user.role || 'STORE_OWNER', notes || null],
      );

      return updateResult.rows[0];
    });
  }

  /**
   * Count generic meds matching an optional search term.
   */
  async countGenericMeds(search?: string): Promise<number> {
    let countWhereClause = '';
    const countParams: unknown[] = [];
    if (search) {
      countWhereClause = 'AND g.generic_name ILIKE $1';
      countParams.push(`%${search}%`);
    }

    const countResult = await queryDB(
      `SELECT COUNT(*) as total FROM generic_meds g WHERE 1=1 ${countWhereClause}`,
      countParams,
    );
    return parseInt(countResult.rows[0]?.total || '0', 10);
  }

  /**
   * Fetch paginated inventory items with store overrides.
   */
  async findInventoryItems(
    pmbjkCode: string,
    options: { search?: string; limit: number; offset: number },
  ): Promise<StoreInventoryItem[]> {
    const queryParams: unknown[] = [pmbjkCode];
    let mainWhereClause = '';
    let paramIdx = 2;

    if (options.search) {
      mainWhereClause = `AND g.generic_name ILIKE $${paramIdx++}`;
      queryParams.push(`%${options.search}%`);
    }

    queryParams.push(options.limit, options.offset);
    const result = await queryDB(
      `SELECT g.drug_code, g.generic_name, g.mrp, g.unit_size, g.group_name,
              COALESCE(si.in_stock, TRUE) as in_stock,
              si.last_updated
       FROM generic_meds g
       LEFT JOIN store_inventory si ON g.drug_code = si.drug_code AND si.pmbjk_code = $1
       WHERE 1=1 ${mainWhereClause}
       ORDER BY g.generic_name ASC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      queryParams,
    );

    return result.rows.map((r: any) => ({
      pmbjk_code: pmbjkCode,
      drug_code: r.drug_code,
      in_stock: r.in_stock,
      last_updated: r.last_updated || null,
      generic_name: r.generic_name,
      mrp: parseFloat(r.mrp),
      unit_size: r.unit_size,
      group_name: r.group_name,
    }));
  }

  /**
   * Upsert a single inventory item for a store.
   */
  async upsertInventoryItem(
    pmbjkCode: string,
    drugCode: string,
    inStock: boolean,
  ): Promise<void> {
    await queryDB(
      `INSERT INTO store_inventory (pmbjk_code, drug_code, in_stock, last_updated)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (pmbjk_code, drug_code)
       DO UPDATE SET in_stock = $3, last_updated = NOW()`,
      [pmbjkCode, drugCode, inStock],
    );
  }

  /**
   * Bulk upsert inventory items atomically in a transaction.
   */
  async bulkUpsertInventory(
    pmbjkCode: string,
    updates: { drug_code: string; in_stock: boolean }[],
  ): Promise<number> {
    return withTransaction(async (client) => {
      for (const item of updates) {
        await client.query(
          `INSERT INTO store_inventory (pmbjk_code, drug_code, in_stock, last_updated)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (pmbjk_code, drug_code)
           DO UPDATE SET in_stock = $3, last_updated = NOW()`,
          [pmbjkCode, item.drug_code, item.in_stock],
        );
      }
      return updates.length;
    });
  }

  /**
   * Query summary metrics for a seller store.
   */
  async getAnalyticsSummary(pmbjkCode: string): Promise<SellerAnalyticsSummary> {
    const [totalResult, todayResult, pendingResult] = await Promise.all([
      queryDB(
        `SELECT COUNT(*) as total_orders,
                COALESCE(SUM(total_generic_value), 0) as total_revenue,
                COALESCE(AVG(total_generic_value), 0) as avg_order_value
         FROM requirements WHERE pmbjk_code = $1 AND status NOT LIKE 'CANCELLED%'`,
        [pmbjkCode],
      ),
      queryDB(
        `SELECT COUNT(*) as orders_today,
                COALESCE(SUM(total_generic_value), 0) as revenue_today
         FROM requirements
         WHERE pmbjk_code = $1 AND status NOT LIKE 'CANCELLED%'
           AND created_at >= CURRENT_DATE`,
        [pmbjkCode],
      ),
      queryDB(
        `SELECT COUNT(*) as pending
         FROM requirements
         WHERE pmbjk_code = $1 AND status IN ('PENDING_ACCEPTANCE', 'ACCEPTED', 'PREPARING')`,
        [pmbjkCode],
      ),
    ]);

    const t = totalResult.rows[0];
    const d = todayResult.rows[0];

    return {
      total_orders: parseInt(t.total_orders, 10),
      orders_today: parseInt(d.orders_today, 10),
      total_revenue: parseFloat(t.total_revenue),
      revenue_today: parseFloat(d.revenue_today),
      avg_order_value: Math.round(parseFloat(t.avg_order_value) * 100) / 100,
      pending_orders: parseInt(pendingResult.rows[0].pending, 10),
    };
  }

  /**
   * Fetch daily aggregated metrics for charts.
   */
  async getDailyAnalytics(pmbjkCode: string): Promise<SellerDailyAnalytics[]> {
    const result = await queryDB(
      `SELECT DATE(created_at) as date,
              COUNT(*) as orders,
              COALESCE(SUM(total_generic_value), 0) as revenue,
              COALESCE(SUM(savings), 0) as savings
       FROM requirements
       WHERE pmbjk_code = $1
         AND status NOT LIKE 'CANCELLED%'
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [pmbjkCode],
    );

    return result.rows.map((r: any) => ({
      date: r.date,
      orders: parseInt(r.orders, 10),
      revenue: parseFloat(r.revenue),
      savings: parseFloat(r.savings),
    }));
  }

  /**
   * Fetch complete order records for CSV export.
   */
  async exportOrders(pmbjkCode: string): Promise<unknown[]> {
    const result = await queryDB(
      `SELECT r.id, r.status, r.total_generic_value, r.total_branded_value, r.savings,
              r.payment_mode, r.created_at, r.accepted_at, r.completed_at,
              u.name as customer_name, u.phone as customer_phone
       FROM requirements r
       LEFT JOIN users u ON r.user_id = u.firebase_uid
       WHERE r.pmbjk_code = $1
       ORDER BY r.created_at DESC`,
      [pmbjkCode],
    );
    return result.rows;
  }
}
