// ============================================================
// Admin Module — Repository Layer
// Encapsulates database operations for the Super Admin platform:
// platform telemetry, store administration, user management,
// global order overrides, and catalog analytics.
// ============================================================

import { queryDB, withTransaction } from '../../shared/infra/database';
import { ConflictError, NotFoundError } from '../../shared/errors';
import type {
  AuthUser,
  PlatformStats,
  RequirementStatus,
  UserRole,
} from '../../shared/types';

export class AdminRepository {
  /**
   * Fetch platform-wide telemetry and GMV metrics in parallel.
   */
  async getPlatformStats(): Promise<PlatformStats> {
    const [usersRes, storesRes, ordersRes, todayRes, weekRes, monthRes, storeOwnersRes] = await Promise.all([
      queryDB('SELECT COUNT(*) as total FROM users'),
      queryDB(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'ACTIVE') as active FROM stores`),
      queryDB(`SELECT COUNT(*) as total,
                      COALESCE(SUM(total_generic_value), 0) as gmv,
                      COALESCE(SUM(savings), 0) as savings
               FROM requirements WHERE status NOT LIKE 'CANCELLED%'`),
      queryDB(`SELECT COUNT(*) as total FROM requirements WHERE created_at >= CURRENT_DATE`),
      queryDB(`SELECT COUNT(*) as total FROM requirements WHERE created_at >= NOW() - INTERVAL '7 days'`),
      queryDB(`SELECT COUNT(*) as total FROM requirements WHERE created_at >= NOW() - INTERVAL '30 days'`),
      queryDB(`SELECT COUNT(*) as total FROM users WHERE role = 'STORE_OWNER'`),
    ]);

    return {
      total_users: parseInt(usersRes.rows[0]?.total || '0', 10),
      total_stores: parseInt(storesRes.rows[0]?.total || '0', 10),
      active_stores: parseInt(storesRes.rows[0]?.active || '0', 10),
      total_orders: parseInt(ordersRes.rows[0]?.total || '0', 10),
      total_gmv: parseFloat(ordersRes.rows[0]?.gmv || '0'),
      total_savings: parseFloat(ordersRes.rows[0]?.savings || '0'),
      orders_today: parseInt(todayRes.rows[0]?.total || '0', 10),
      orders_this_week: parseInt(weekRes.rows[0]?.total || '0', 10),
      orders_this_month: parseInt(monthRes.rows[0]?.total || '0', 10),
      store_owners: parseInt(storeOwnersRes.rows[0]?.total || '0', 10),
    };
  }

  /**
   * Get live feed of latest orders across all stores.
   */
  async getOrdersFeed(limit: number = 20): Promise<unknown[]> {
    const result = await queryDB(
      `SELECT r.id, r.status, r.total_generic_value, r.savings, r.created_at,
              u.name as customer_name, s.name as store_name, s.state as store_state
       FROM requirements r
       LEFT JOIN users u ON r.user_id = u.firebase_uid
       LEFT JOIN stores s ON r.pmbjk_code = s.pmbjk_code
       ORDER BY r.created_at DESC
       LIMIT $1`,
      [limit],
    );
    return result.rows;
  }

  /**
   * Count total stores matching criteria.
   */
  async countStores(whereClause: string, params: unknown[]): Promise<number> {
    const countResult = await queryDB(
      `SELECT COUNT(*) as total FROM stores s ${whereClause}`,
      params,
    );
    return parseInt(countResult.rows[0]?.total || '0', 10);
  }

  /**
   * Fetch paginated stores with seller information.
   */
  async findStores(whereClause: string, params: unknown[]): Promise<unknown[]> {
    const result = await queryDB(
      `SELECT s.*, u.name as seller_name, u.phone as seller_phone
       FROM stores s
       LEFT JOIN users u ON s.seller_uid = u.firebase_uid
       ${whereClause}
       ORDER BY s.name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return result.rows;
  }

  /**
   * Fetch a single store profile.
   */
  async findStoreDetail(pmbjkCode: string): Promise<Record<string, unknown> | null> {
    const result = await queryDB(
      `SELECT s.*, u.name as seller_name, u.phone as seller_phone, u.email as seller_email
       FROM stores s
       LEFT JOIN users u ON s.seller_uid = u.firebase_uid
       WHERE s.pmbjk_code = $1`,
      [pmbjkCode],
    );
    return result.rows[0] || null;
  }

  /**
   * Fetch order telemetry for a specific store.
   */
  async findStoreOrderStats(pmbjkCode: string): Promise<{ total_orders: number; total_revenue: number }> {
    const statsResult = await queryDB(
      `SELECT COUNT(*) as total_orders,
              COALESCE(SUM(total_generic_value), 0) as total_revenue
       FROM requirements WHERE pmbjk_code = $1 AND status NOT LIKE 'CANCELLED%'`,
      [pmbjkCode],
    );
    return {
      total_orders: parseInt(statsResult.rows[0]?.total_orders || '0', 10),
      total_revenue: parseFloat(statsResult.rows[0]?.total_revenue || '0'),
    };
  }

  /**
   * Update store status (ACTIVE, SUSPENDED, CLOSED).
   */
  async updateStoreStatus(pmbjkCode: string, status: string): Promise<boolean> {
    const result = await queryDB(
      'UPDATE stores SET status = $1 WHERE pmbjk_code = $2 RETURNING pmbjk_code',
      [status, pmbjkCode],
    );
    return result.rows.length > 0;
  }

  /**
   * Find store by PMBJK code for seller assignment validation.
   */
  async findStoreForAssignment(pmbjkCode: string): Promise<{ pmbjk_code: string; seller_uid: string | null } | null> {
    const result = await queryDB(
      'SELECT pmbjk_code, seller_uid FROM stores WHERE pmbjk_code = $1',
      [pmbjkCode],
    );
    return result.rows[0] || null;
  }

  /**
   * Execute transactional assignment of a store operator.
   */
  async assignSellerTx(
    pmbjkCode: string,
    userUid: string,
    payload: { name: string; phone: string; email: string },
  ): Promise<void> {
    await withTransaction(async (client) => {
      // Re-check under a row lock: another admin may have assigned it meanwhile
      const store = await client.query('SELECT seller_uid FROM stores WHERE pmbjk_code = $1 FOR UPDATE', [pmbjkCode]);
      const current = store.rows[0]?.seller_uid;
      if (current && current !== userUid) {
        throw new ConflictError(`Store ${pmbjkCode} already has an operator.`);
      }
      // One store per operator: release any store they ran before
      await client.query('UPDATE stores SET seller_uid = NULL WHERE seller_uid = $1 AND pmbjk_code <> $2', [userUid, pmbjkCode]);

      // 1. Upsert the user into public.users
      await client.query(
        `INSERT INTO users (firebase_uid, name, phone, email, role, linked_pmbjk_code)
         VALUES ($1, $2, $3, $4, 'STORE_OWNER', $5)
         ON CONFLICT (firebase_uid)
         DO UPDATE SET 
           name = EXCLUDED.name, 
           phone = EXCLUDED.phone, 
           email = EXCLUDED.email, 
           role = 'STORE_OWNER', 
           linked_pmbjk_code = EXCLUDED.linked_pmbjk_code,
           is_suspended = FALSE`,
        [userUid, payload.name, payload.phone, payload.email, pmbjkCode],
      );

      // 2. Link store to operator
      await client.query(
        'UPDATE stores SET seller_uid = $1, verified_at = NOW() WHERE pmbjk_code = $2',
        [userUid, pmbjkCode],
      );
    });
  }

  /**
   * Count total users matching filter criteria.
   */
  async countUsers(whereClause: string, params: unknown[]): Promise<number> {
    const countResult = await queryDB(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params,
    );
    return parseInt(countResult.rows[0]?.total || '0', 10);
  }

  /**
   * Fetch paginated user accounts.
   */
  async findUsers(whereClause: string, params: unknown[]): Promise<unknown[]> {
    const result = await queryDB(
      `SELECT firebase_uid, name, email, phone, role, linked_pmbjk_code, is_suspended, created_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return result.rows;
  }

  /**
   * Get single user account profile.
   */
  async findUserDetail(uid: string): Promise<Record<string, unknown> | null> {
    const result = await queryDB(
      'SELECT firebase_uid, name, email, phone, role, linked_pmbjk_code, is_suspended, created_at FROM users WHERE firebase_uid = $1',
      [uid],
    );
    return result.rows[0] || null;
  }

  /**
   * Get order summary stats for a customer.
   */
  async findUserOrderStats(uid: string): Promise<{ total_orders: number; total_spend: number; total_savings: number }> {
    const ordersResult = await queryDB(
      `SELECT COUNT(*) as total_orders,
              COALESCE(SUM(total_generic_value), 0) as total_spend,
              COALESCE(SUM(savings), 0) as total_savings
       FROM requirements WHERE user_id = $1 AND status NOT LIKE 'CANCELLED%'`,
      [uid],
    );
    return {
      total_orders: parseInt(ordersResult.rows[0]?.total_orders || '0', 10),
      total_spend: parseFloat(ordersResult.rows[0]?.total_spend || '0'),
      total_savings: parseFloat(ordersResult.rows[0]?.total_savings || '0'),
    };
  }

  /**
   * Update a user's role and optionally link a PMBJK store.
   */
  async updateUserRole(uid: string, newRole: UserRole): Promise<boolean> {
    return withTransaction(async (client) => {
      const result = await client.query(
        `UPDATE users
            SET role = $1,
                linked_pmbjk_code = CASE WHEN $1 = 'STORE_OWNER' THEN linked_pmbjk_code ELSE NULL END
          WHERE firebase_uid = $2
          RETURNING firebase_uid`,
        [newRole, uid],
      );
      if (result.rows.length === 0) return false;
      // No longer an operator: free their store so it can be reassigned
      if (newRole !== 'STORE_OWNER') {
        await client.query('UPDATE stores SET seller_uid = NULL WHERE seller_uid = $1', [uid]);
      }
      return true;
    });
  }

  /**
   * Suspend or unsuspend user account.
   */
  async suspendUser(uid: string, suspend: boolean): Promise<boolean> {
    const result = await queryDB(
      'UPDATE users SET is_suspended = $1 WHERE firebase_uid = $2 RETURNING firebase_uid',
      [suspend, uid],
    );
    return result.rows.length > 0;
  }

  /**
   * Count all orders matching admin filter criteria.
   */
  async countAllOrders(whereClause: string, params: unknown[]): Promise<number> {
    const countResult = await queryDB(
      `SELECT COUNT(*) as total
         FROM requirements r
         LEFT JOIN users u ON r.user_id = u.firebase_uid
         LEFT JOIN stores s ON r.pmbjk_code = s.pmbjk_code
         ${whereClause}`,
      params,
    );
    return parseInt(countResult.rows[0]?.total || '0', 10);
  }

  /**
   * Fetch paginated orders across all stores.
   */
  async findAllOrders(whereClause: string, params: unknown[]): Promise<unknown[]> {
    const result = await queryDB(
      `SELECT r.*, u.name as customer_name, u.phone as customer_phone,
              s.name as store_name, s.state as store_state
       FROM requirements r
       LEFT JOIN users u ON r.user_id = u.firebase_uid
       LEFT JOIN stores s ON r.pmbjk_code = s.pmbjk_code
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return result.rows;
  }

  /**
   * Fetch single order with customer and store context.
   */
  async findOrderDetail(orderId: string): Promise<Record<string, unknown> | null> {
    const result = await queryDB(
      `SELECT r.*, u.name as customer_name, u.phone as customer_phone, u.email as customer_email,
              s.name as store_name, s.phone as store_phone, s.state as store_state
       FROM requirements r
       LEFT JOIN users u ON r.user_id = u.firebase_uid
       LEFT JOIN stores s ON r.pmbjk_code = s.pmbjk_code
       WHERE r.id = $1`,
      [orderId],
    );
    return result.rows[0] || null;
  }

  /**
   * Fetch audit trail logs with author name.
   */
  async findOrderAuditTrail(orderId: string): Promise<unknown[]> {
    const auditResult = await queryDB(
      `SELECT osl.*, u.name as changed_by_name
       FROM order_status_log osl
       LEFT JOIN users u ON osl.changed_by = u.firebase_uid
       WHERE osl.requirement_id = $1
       ORDER BY osl.created_at ASC`,
      [orderId],
    );
    return auditResult.rows;
  }

  /**
   * Execute atomic admin order status override with row lock and audit trail.
   */
  async overrideOrderStatusTx(
    orderId: string,
    newStatus: RequirementStatus,
    admin: AuthUser,
    notes?: string,
  ): Promise<void> {
    await withTransaction(async (client) => {
      const currentResult = await client.query(
        'SELECT status FROM requirements WHERE id = $1 FOR UPDATE',
        [orderId],
      );

      if (currentResult.rows.length === 0) {
        throw new NotFoundError('Order');
      }

      const fromStatus = currentResult.rows[0].status;

      // Admin can force any transition
      const updateFields = ['status = $1', 'updated_at = NOW()'];
      const updateValues: unknown[] = [newStatus];
      let paramIdx = 2;

      if (newStatus === 'ACCEPTED') {
        updateFields.push('accepted_at = COALESCE(accepted_at, NOW())');
      }
      if (newStatus === 'COMPLETED') {
        updateFields.push('completed_at = NOW()');
      }
      if (newStatus.startsWith('CANCELLED')) {
        updateFields.push(`cancelled_by = $${paramIdx++}`);
        updateValues.push('ADMIN');
        if (notes) {
          updateFields.push(`cancelled_reason = $${paramIdx++}`);
          updateValues.push(notes);
        }
      }

      updateValues.push(orderId);
      await client.query(
        `UPDATE requirements SET ${updateFields.join(', ')} WHERE id = $${updateValues.length}`,
        updateValues,
      );

      // Log the admin override in audit trail
      await client.query(
        `INSERT INTO order_status_log (requirement_id, from_status, to_status, changed_by, changed_by_role, notes)
         VALUES ($1, $2, $3, $4, 'SUPER_ADMIN', $5)`,
        [orderId, fromStatus, newStatus, admin.uid, notes || 'Admin override'],
      );
    });
  }

  /**
   * Query catalog stats and match rates across branded & generic tables.
   */
  async getCatalogStats(): Promise<Record<string, unknown>> {
    // Same source as what patients see: the precomputed medicine_matches.
    const res = await queryDB(`
      SELECT
        (SELECT COUNT(*) FROM branded_meds WHERE NOT is_discontinued) AS branded,
        (SELECT COUNT(*) FROM generic_meds) AS generics,
        COUNT(*) FILTER (WHERE m.tier = 'EXACT_MATCH') AS exact,
        COUNT(*) FILTER (WHERE m.tier = 'CLOSE_MATCH') AS close,
        COUNT(*) FILTER (WHERE m.tier = 'SALT_EQUIVALENT') AS salt_only,
        COUNT(*) AS matched
      FROM medicine_matches m
      JOIN branded_meds b ON b.id = m.branded_id AND NOT b.is_discontinued
      WHERE m.review_status <> 'rejected'`);
    const r = res.rows[0] || {};
    const branded = Number(r.branded) || 0;
    const matched = Number(r.matched) || 0;
    return {
      branded_count: branded,
      generic_count: Number(r.generics) || 0,
      // Kept under the original keys the admin UI reads: brands with a generic / all brands
      matched_salts: matched,
      total_branded_salts: branded,
      match_rate: branded > 0 ? Math.round((matched / branded) * 1000) / 10 : 0,
      by_tier: { exact: Number(r.exact) || 0, close: Number(r.close) || 0, salt_equivalent: Number(r.salt_only) || 0 },
    };
  }
}
