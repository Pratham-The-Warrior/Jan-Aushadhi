// ============================================================
// Seller Module — Service Layer
// Business logic for the Kendra Seller Central portal.
// All methods enforce pmbjk_code scoping to prevent
// sellers from accessing data belonging to other stores.
// ============================================================

import { queryDB, getClient } from '../../shared/infra/database';
import { NotFoundError, ValidationError, AuthorizationError } from '../../shared/errors';
import { VALID_STATUS_TRANSITIONS } from '../../shared/types';
import type {
  AuthUser,
  RequirementStatus,
  SellerAnalyticsSummary,
  SellerDailyAnalytics,
  StoreInventoryItem,
} from '../../shared/types';
import { APP_CONSTANTS } from '../../shared/constants';

export class SellerService {

  // ================================================================
  //  SELLER STORE PROFILE
  // ================================================================

  /**
   * Get the seller's own store profile.
   */
  async getStoreProfile(pmbjkCode: string): Promise<Record<string, unknown>> {
    const result = await queryDB(
      `SELECT pmbjk_code, name, phone, address, pincode, state, district,
              status, operating_hours, verified_at, upi_vpa
       FROM stores WHERE pmbjk_code = $1`,
      [pmbjkCode],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Store');
    }

    return result.rows[0];
  }

  /**
   * Update the seller's store profile (operating hours, phone, upi_vpa).
   */
  async updateStoreProfile(
    pmbjkCode: string,
    updates: { operating_hours?: Record<string, string>; phone?: string; upi_vpa?: string },
  ): Promise<{ success: boolean }> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (updates.operating_hours !== undefined) {
      setClauses.push(`operating_hours = $${paramIdx++}`);
      values.push(JSON.stringify(updates.operating_hours));
    }
    if (updates.phone !== undefined) {
      setClauses.push(`phone = $${paramIdx++}`);
      values.push(updates.phone);
    }
    if (updates.upi_vpa !== undefined) {
      setClauses.push(`upi_vpa = $${paramIdx++}`);
      values.push(updates.upi_vpa);
    }

    if (setClauses.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(pmbjkCode);
    await queryDB(
      `UPDATE stores SET ${setClauses.join(', ')} WHERE pmbjk_code = $${paramIdx}`,
      values,
    );

    return { success: true };
  }

  // ================================================================
  //  ORDER MANAGEMENT
  // ================================================================

  /**
   * Get all orders assigned to this store, with pagination and status filtering.
   */
  async getOrders(
    pmbjkCode: string,
    options: { status?: string; page?: number; limit?: number },
  ): Promise<{ count: number; page: number; totalPages: number; orders: unknown[] }> {
    const page = options.page || 1;
    const limit = options.limit || APP_CONSTANTS.SELLER_ORDERS_PAGE_SIZE;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE r.pmbjk_code = $1';
    const params: unknown[] = [pmbjkCode];
    let paramIdx = 2;

    if (options.status) {
      whereClause += ` AND r.status = $${paramIdx++}`;
      params.push(options.status);
    }

    // Count total matching orders
    const countResult = await queryDB(
      `SELECT COUNT(*) as total FROM requirements r ${whereClause}`,
      params,
    );
    const totalCount = parseInt(countResult.rows[0].total);

    // Fetch paginated orders with customer info
    params.push(limit, offset);
    const result = await queryDB(
      `SELECT r.*, u.name as customer_name, u.phone as customer_phone, u.email as customer_email
       FROM requirements r
       LEFT JOIN users u ON r.user_id = u.firebase_uid
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      params,
    );

    return {
      count: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      orders: result.rows,
    };
  }

  /**
   * Get a single order detail, scoped to this store.
   */
  async getOrderDetail(
    pmbjkCode: string,
    orderId: string,
  ): Promise<{ order: Record<string, unknown>; audit_trail: unknown[] }> {
    const result = await queryDB(
      `SELECT r.*, u.name as customer_name, u.phone as customer_phone, u.email as customer_email
       FROM requirements r
       LEFT JOIN users u ON r.user_id = u.firebase_uid
       WHERE r.id = $1 AND r.pmbjk_code = $2`,
      [orderId, pmbjkCode],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Order');
    }

    // Fetch audit trail for this order
    const auditResult = await queryDB(
      `SELECT * FROM order_status_log WHERE requirement_id = $1 ORDER BY created_at ASC`,
      [orderId],
    );

    return {
      order: result.rows[0],
      audit_trail: auditResult.rows,
    };
  }

  /**
   * Update order status with validation of allowed transitions.
   * Logs the transition in the audit trail.
   */
  async updateOrderStatus(
    pmbjkCode: string,
    orderId: string,
    newStatus: RequirementStatus,
    user: AuthUser,
    notes?: string,
  ): Promise<{ success: boolean; order: Record<string, unknown> }> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // 1. Fetch current order and verify ownership
      const currentResult = await client.query(
        'SELECT * FROM requirements WHERE id = $1 AND pmbjk_code = $2 FOR UPDATE',
        [orderId, pmbjkCode],
      );

      if (currentResult.rows.length === 0) {
        throw new NotFoundError('Order');
      }

      const currentStatus = currentResult.rows[0].status as string;

      // 2. Validate the status transition
      const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
      if (!allowedTransitions.includes(newStatus)) {
        throw new ValidationError(
          `Cannot transition from "${currentStatus}" to "${newStatus}". Allowed: ${allowedTransitions.join(', ') || 'none'}`,
        );
      }

      // 3. Build the UPDATE query with status-specific timestamps
      const updateFields: string[] = ['status = $1', 'updated_at = NOW()'];
      const updateValues: unknown[] = [newStatus];
      let paramIdx = 2;

      if (notes) {
        updateFields.push(`seller_notes = $${paramIdx++}`);
        updateValues.push(notes);
      }

      if (newStatus === 'ACCEPTED') {
        updateFields.push('accepted_at = NOW()');
      } else if (newStatus === 'COMPLETED') {
        updateFields.push('completed_at = NOW()');
      } else if (newStatus.startsWith('CANCELLED')) {
        updateFields.push(`cancelled_by = $${paramIdx++}`);
        updateValues.push('SELLER');
        if (notes) {
          updateFields.push(`cancelled_reason = $${paramIdx++}`);
          updateValues.push(notes);
        }
      }

      updateValues.push(orderId);
      const updatedResult = await client.query(
        `UPDATE requirements SET ${updateFields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
        updateValues,
      );

      // 4. Log the transition in the audit trail
      await client.query(
        `INSERT INTO order_status_log (requirement_id, from_status, to_status, changed_by, changed_by_role, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, currentStatus, newStatus, user.uid, user.role || 'STORE_OWNER', notes || null],
      );

      await client.query('COMMIT');

      return { success: true, order: updatedResult.rows[0] };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Reject an order (shortcut for cancellation with a required reason).
   */
  async rejectOrder(
    pmbjkCode: string,
    orderId: string,
    reason: string,
    user: AuthUser,
  ): Promise<{ success: boolean }> {
    if (!reason || reason.trim().length < 5) {
      throw new ValidationError('Rejection reason must be at least 5 characters');
    }

    await this.updateOrderStatus(pmbjkCode, orderId, 'CANCELLED_BY_SELLER', user, reason);
    return { success: true };
  }

  // ================================================================
  //  INVENTORY MANAGEMENT
  // ================================================================

  /**
   * Get the full generic catalog with this store's stock overrides.
   * Left-joins store_inventory so all medicines show up even if the
   * seller hasn't toggled them yet (default: in_stock = true).
   */
  async getInventory(
    pmbjkCode: string,
    options: { search?: string; page?: number; limit?: number },
  ): Promise<{ count: number; page: number; totalPages: number; items: StoreInventoryItem[] }> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: unknown[] = [pmbjkCode];
    let paramIdx = 2;

    if (options.search) {
      whereClause = `AND g.generic_name ILIKE $${paramIdx++}`;
      params.push(`%${options.search}%`);
    }

    const countResult = await queryDB(
      `SELECT COUNT(*) as total FROM generic_meds g WHERE 1=1 ${whereClause.replace('AND', 'AND')}`,
      options.search ? [options.search ? `%${options.search}%` : null] : [],
    );
    const totalCount = parseInt(countResult.rows[0]?.total || '0');

    params.push(limit, offset);
    const result = await queryDB(
      `SELECT g.drug_code, g.generic_name, g.mrp, g.unit_size, g.group_name,
              COALESCE(si.in_stock, TRUE) as in_stock,
              si.last_updated
       FROM generic_meds g
       LEFT JOIN store_inventory si ON g.drug_code = si.drug_code AND si.pmbjk_code = $1
       WHERE 1=1 ${whereClause}
       ORDER BY g.generic_name ASC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      params,
    );

    return {
      count: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      items: result.rows.map((r: any) => ({
        pmbjk_code: pmbjkCode,
        drug_code: r.drug_code,
        in_stock: r.in_stock,
        last_updated: r.last_updated || null,
        generic_name: r.generic_name,
        mrp: parseFloat(r.mrp),
        unit_size: r.unit_size,
        group_name: r.group_name,
      })),
    };
  }

  /**
   * Toggle stock status for a specific medicine at this store.
   * Uses UPSERT (INSERT ... ON CONFLICT UPDATE) for idempotency.
   */
  async updateInventoryItem(
    pmbjkCode: string,
    drugCode: string,
    inStock: boolean,
  ): Promise<{ success: boolean }> {
    await queryDB(
      `INSERT INTO store_inventory (pmbjk_code, drug_code, in_stock, last_updated)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (pmbjk_code, drug_code)
       DO UPDATE SET in_stock = $3, last_updated = NOW()`,
      [pmbjkCode, drugCode, inStock],
    );

    return { success: true };
  }

  /**
   * Bulk update stock status for multiple medicines.
   */
  async bulkUpdateInventory(
    pmbjkCode: string,
    updates: { drug_code: string; in_stock: boolean }[],
  ): Promise<{ success: boolean; updated: number }> {
    if (!updates || updates.length === 0) {
      throw new ValidationError('No inventory updates provided');
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const item of updates) {
        await client.query(
          `INSERT INTO store_inventory (pmbjk_code, drug_code, in_stock, last_updated)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (pmbjk_code, drug_code)
           DO UPDATE SET in_stock = $3, last_updated = NOW()`,
          [pmbjkCode, item.drug_code, item.in_stock],
        );
      }

      await client.query('COMMIT');
      return { success: true, updated: updates.length };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ================================================================
  //  ANALYTICS
  // ================================================================

  /**
   * Get summary analytics for the seller's store.
   */
  async getAnalyticsSummary(pmbjkCode: string): Promise<SellerAnalyticsSummary> {
    // Total orders & revenue
    const totalResult = await queryDB(
      `SELECT COUNT(*) as total_orders,
              COALESCE(SUM(total_generic_value), 0) as total_revenue,
              COALESCE(AVG(total_generic_value), 0) as avg_order_value
       FROM requirements WHERE pmbjk_code = $1 AND status NOT LIKE 'CANCELLED%'`,
      [pmbjkCode],
    );

    // Today's orders & revenue
    const todayResult = await queryDB(
      `SELECT COUNT(*) as orders_today,
              COALESCE(SUM(total_generic_value), 0) as revenue_today
       FROM requirements
       WHERE pmbjk_code = $1 AND status NOT LIKE 'CANCELLED%'
         AND created_at >= CURRENT_DATE`,
      [pmbjkCode],
    );

    // Pending orders count
    const pendingResult = await queryDB(
      `SELECT COUNT(*) as pending
       FROM requirements
       WHERE pmbjk_code = $1 AND status IN ('PENDING_ACCEPTANCE', 'ACCEPTED', 'PREPARING')`,
      [pmbjkCode],
    );

    const t = totalResult.rows[0];
    const d = todayResult.rows[0];

    return {
      total_orders: parseInt(t.total_orders),
      orders_today: parseInt(d.orders_today),
      total_revenue: parseFloat(t.total_revenue),
      revenue_today: parseFloat(d.revenue_today),
      avg_order_value: Math.round(parseFloat(t.avg_order_value) * 100) / 100,
      pending_orders: parseInt(pendingResult.rows[0].pending),
    };
  }

  /**
   * Get daily analytics breakdown for charts (last 30 days).
   */
  async getDailyAnalytics(pmbjkCode: string): Promise<{ daily: SellerDailyAnalytics[] }> {
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

    return {
      daily: result.rows.map((r: any) => ({
        date: r.date,
        orders: parseInt(r.orders),
        revenue: parseFloat(r.revenue),
        savings: parseFloat(r.savings),
      })),
    };
  }

  /**
   * Export order history as CSV-ready data.
   */
  async exportOrders(
    pmbjkCode: string,
  ): Promise<{ orders: unknown[] }> {
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

    return { orders: result.rows };
  }
}
