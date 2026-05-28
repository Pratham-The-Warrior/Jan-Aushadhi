// ============================================================
// Admin Module — Service Layer
// Business logic for the Super Admin & Operations platform.
// Full platform-wide access — no store scoping.
// ============================================================

import { getAuth } from 'firebase-admin/auth';
import { queryDB, getClient } from '../../shared/infra/database';
import { NotFoundError, ValidationError, ConflictError } from '../../shared/errors';
import { invalidateRoleCache } from '../../shared/infra/rbac';
import { VALID_STATUS_TRANSITIONS } from '../../shared/types';
import type {
  AuthUser,
  PlatformStats,
  UserRole,
  RequirementStatus,
} from '../../shared/types';

export class AdminService {

  // ================================================================
  //  GLOBAL DASHBOARD
  // ================================================================

  /**
   * Get platform-wide statistics for the admin command center.
   */
  async getPlatformStats(): Promise<PlatformStats> {
    // All queries run in parallel for speed
    const [usersRes, storesRes, ordersRes, todayRes, weekRes, monthRes] = await Promise.all([
      queryDB('SELECT COUNT(*) as total FROM users'),
      queryDB(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'ACTIVE') as active FROM stores`),
      queryDB(`SELECT COUNT(*) as total,
                      COALESCE(SUM(total_generic_value), 0) as gmv,
                      COALESCE(SUM(savings), 0) as savings
               FROM requirements WHERE status NOT LIKE 'CANCELLED%'`),
      queryDB(`SELECT COUNT(*) as total FROM requirements WHERE created_at >= CURRENT_DATE`),
      queryDB(`SELECT COUNT(*) as total FROM requirements WHERE created_at >= NOW() - INTERVAL '7 days'`),
      queryDB(`SELECT COUNT(*) as total FROM requirements WHERE created_at >= NOW() - INTERVAL '30 days'`),
    ]);

    const storeOwnersRes = await queryDB(
      `SELECT COUNT(*) as total FROM users WHERE role = 'STORE_OWNER'`,
    );

    return {
      total_users: parseInt(usersRes.rows[0].total),
      total_stores: parseInt(storesRes.rows[0].total),
      active_stores: parseInt(storesRes.rows[0].active),
      total_orders: parseInt(ordersRes.rows[0].total),
      total_gmv: parseFloat(ordersRes.rows[0].gmv),
      total_savings: parseFloat(ordersRes.rows[0].savings),
      orders_today: parseInt(todayRes.rows[0].total),
      orders_this_week: parseInt(weekRes.rows[0].total),
      orders_this_month: parseInt(monthRes.rows[0].total),
      store_owners: parseInt(storeOwnersRes.rows[0].total),
    };
  }

  /**
   * Get the last N orders across all stores (live feed).
   */
  async getOrdersFeed(limit: number = 20): Promise<{ orders: unknown[] }> {
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

    return { orders: result.rows };
  }

  // ================================================================
  //  STORE MANAGEMENT
  // ================================================================

  /**
   * Get paginated store directory with filters.
   */
  async getStores(options: {
    status?: string;
    state?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ count: number; page: number; totalPages: number; stores: unknown[] }> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (options.status) {
      conditions.push(`s.status = $${paramIdx++}`);
      params.push(options.status);
    }
    if (options.state) {
      conditions.push(`s.state = $${paramIdx++}`);
      params.push(options.state);
    }
    if (options.search) {
      conditions.push(`(s.name ILIKE $${paramIdx} OR s.pmbjk_code ILIKE $${paramIdx})`);
      params.push(`%${options.search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await queryDB(
      `SELECT COUNT(*) as total FROM stores s ${whereClause}`,
      params,
    );
    const totalCount = parseInt(countResult.rows[0].total);

    params.push(limit, offset);
    const result = await queryDB(
      `SELECT s.*, u.name as seller_name, u.phone as seller_phone
       FROM stores s
       LEFT JOIN users u ON s.seller_uid = u.firebase_uid
       ${whereClause}
       ORDER BY s.name ASC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      params,
    );

    return {
      count: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      stores: result.rows,
    };
  }

  /**
   * Get a single store with detailed information.
   */
  async getStoreDetail(pmbjkCode: string): Promise<Record<string, unknown>> {
    const result = await queryDB(
      `SELECT s.*, u.name as seller_name, u.phone as seller_phone, u.email as seller_email
       FROM stores s
       LEFT JOIN users u ON s.seller_uid = u.firebase_uid
       WHERE s.pmbjk_code = $1`,
      [pmbjkCode],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Store');
    }

    // Also get order stats for this store
    const statsResult = await queryDB(
      `SELECT COUNT(*) as total_orders,
              COALESCE(SUM(total_generic_value), 0) as total_revenue
       FROM requirements WHERE pmbjk_code = $1 AND status NOT LIKE 'CANCELLED%'`,
      [pmbjkCode],
    );

    return {
      ...result.rows[0],
      stats: {
        total_orders: parseInt(statsResult.rows[0].total_orders),
        total_revenue: parseFloat(statsResult.rows[0].total_revenue),
      },
    };
  }

  /**
   * Update store status (suspend/reactivate/close).
   */
  async updateStoreStatus(
    pmbjkCode: string,
    status: string,
  ): Promise<{ success: boolean }> {
    const validStatuses = ['ACTIVE', 'SUSPENDED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid store status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    const result = await queryDB(
      'UPDATE stores SET status = $1 WHERE pmbjk_code = $2 RETURNING pmbjk_code',
      [status, pmbjkCode],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Store');
    }

    return { success: true };
  }

  /**
   * Assign a user as the seller/operator for a store.
   * Provisions operator credentials in Firebase Auth and links them in PostgreSQL.
   */
  async assignSellerToStore(
    pmbjkCode: string,
    payload: {
      name: string;
      phone: string;
      email?: string;
      password?: string;
    },
  ): Promise<{ success: boolean }> {
    const client = await getClient();

    // 1. Verify the store exists
    const storeCheck = await queryDB(
      'SELECT pmbjk_code, seller_uid FROM stores WHERE pmbjk_code = $1',
      [pmbjkCode],
    );
    if (storeCheck.rows.length === 0) {
      throw new NotFoundError('Store');
    }

    const virtualEmail = payload.email || `${pmbjkCode.toLowerCase()}@seller.janaushadhi.local`;
    let userUid = '';

    // 2. Provision or update account in Firebase
    try {
      let existingUser;
      try {
        existingUser = await getAuth().getUserByEmail(virtualEmail);
      } catch (err: any) {
        if (err.code !== 'auth/user-not-found') {
          throw err;
        }
      }

      if (existingUser) {
        // Update details and password if provided
        const updateParams: any = {
          displayName: payload.name,
        };
        if (payload.password) {
          updateParams.password = payload.password;
        }
        const updatedUser = await getAuth().updateUser(existingUser.uid, updateParams);
        userUid = updatedUser.uid;
      } else {
        // Create new Firebase user
        if (!payload.password) {
          throw new ValidationError('Password is required for new operator creation');
        }
        const createdUser = await getAuth().createUser({
          email: virtualEmail,
          password: payload.password,
          displayName: payload.name,
        });
        userUid = createdUser.uid;
      }
    } catch (firebaseErr: any) {
      throw new ValidationError(`Firebase Auth Provisioning Failed: ${firebaseErr.message}`);
    }

    // 3. Database assignment transaction
    try {
      await client.query('BEGIN');

      // Check if store is already assigned to a different operator
      const currentSeller = storeCheck.rows[0].seller_uid;
      if (currentSeller && currentSeller !== userUid) {
        throw new ConflictError(
          `Store ${pmbjkCode} is already assigned to another seller (UID: ${currentSeller}).`,
        );
      }

      // Upsert the user into public.users
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
        [userUid, payload.name, payload.phone, virtualEmail, pmbjkCode],
      );

      // Link store to operator
      await client.query(
        'UPDATE stores SET seller_uid = $1, verified_at = NOW() WHERE pmbjk_code = $2',
        [userUid, pmbjkCode],
      );

      await client.query('COMMIT');

      // 4. Invalidate role cache
      await invalidateRoleCache(userUid);

      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ================================================================
  //  USER MANAGEMENT
  // ================================================================

  /**
   * Get paginated user directory with search.
   */
  async getUsers(options: {
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ count: number; page: number; totalPages: number; users: unknown[] }> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (options.role) {
      conditions.push(`role = $${paramIdx++}`);
      params.push(options.role);
    }
    if (options.search) {
      conditions.push(`(name ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR phone ILIKE $${paramIdx})`);
      params.push(`%${options.search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await queryDB(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params,
    );
    const totalCount = parseInt(countResult.rows[0].total);

    params.push(limit, offset);
    const result = await queryDB(
      `SELECT firebase_uid, name, email, phone, role, linked_pmbjk_code, is_suspended, created_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      params,
    );

    return {
      count: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      users: result.rows,
    };
  }

  /**
   * Get a single user with their order history summary.
   */
  async getUserDetail(uid: string): Promise<Record<string, unknown>> {
    const result = await queryDB(
      'SELECT firebase_uid, name, email, phone, role, linked_pmbjk_code, is_suspended, created_at FROM users WHERE firebase_uid = $1',
      [uid],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const ordersResult = await queryDB(
      `SELECT COUNT(*) as total_orders,
              COALESCE(SUM(total_generic_value), 0) as total_spend,
              COALESCE(SUM(savings), 0) as total_savings
       FROM requirements WHERE user_id = $1 AND status NOT LIKE 'CANCELLED%'`,
      [uid],
    );

    return {
      ...result.rows[0],
      stats: {
        total_orders: parseInt(ordersResult.rows[0].total_orders),
        total_spend: parseFloat(ordersResult.rows[0].total_spend),
        total_savings: parseFloat(ordersResult.rows[0].total_savings),
      },
    };
  }

  /**
   * Update a user's role. Handles linked_pmbjk_code for STORE_OWNER promotions.
   */
  async updateUserRole(
    uid: string,
    newRole: UserRole,
    linkedPmbjkCode?: string,
  ): Promise<{ success: boolean }> {
    if (newRole === 'STORE_OWNER' && !linkedPmbjkCode) {
      throw new ValidationError('linked_pmbjk_code is required when assigning STORE_OWNER role');
    }

    const result = await queryDB(
      'UPDATE users SET role = $1, linked_pmbjk_code = $2 WHERE firebase_uid = $3 RETURNING firebase_uid',
      [newRole, newRole === 'STORE_OWNER' ? linkedPmbjkCode : null, uid],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    // If assigning as store owner, also link the store
    if (newRole === 'STORE_OWNER' && linkedPmbjkCode) {
      await queryDB(
        'UPDATE stores SET seller_uid = $1, verified_at = NOW() WHERE pmbjk_code = $2',
        [uid, linkedPmbjkCode],
      );
    }

    // Invalidate cache immediately
    await invalidateRoleCache(uid);

    return { success: true };
  }

  /**
   * Suspend or unsuspend a user account.
   */
  async suspendUser(uid: string, suspend: boolean): Promise<{ success: boolean }> {
    const result = await queryDB(
      'UPDATE users SET is_suspended = $1 WHERE firebase_uid = $2 RETURNING firebase_uid',
      [suspend, uid],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    await invalidateRoleCache(uid);
    return { success: true };
  }

  // ================================================================
  //  ORDER OPERATIONS (GLOBAL VIEW)
  // ================================================================

  /**
   * Get all orders across all stores with pagination and filters.
   */
  async getAllOrders(options: {
    status?: string;
    pmbjk_code?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<{ count: number; page: number; totalPages: number; orders: unknown[] }> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (options.status) {
      conditions.push(`r.status = $${paramIdx++}`);
      params.push(options.status);
    }
    if (options.pmbjk_code) {
      conditions.push(`r.pmbjk_code = $${paramIdx++}`);
      params.push(options.pmbjk_code);
    }
    if (options.date_from) {
      conditions.push(`r.created_at >= $${paramIdx++}`);
      params.push(options.date_from);
    }
    if (options.date_to) {
      conditions.push(`r.created_at <= $${paramIdx++}`);
      params.push(options.date_to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await queryDB(
      `SELECT COUNT(*) as total FROM requirements r ${whereClause}`,
      params,
    );
    const totalCount = parseInt(countResult.rows[0].total);

    params.push(limit, offset);
    const result = await queryDB(
      `SELECT r.*, u.name as customer_name, u.phone as customer_phone,
              s.name as store_name, s.state as store_state
       FROM requirements r
       LEFT JOIN users u ON r.user_id = u.firebase_uid
       LEFT JOIN stores s ON r.pmbjk_code = s.pmbjk_code
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
   * Get full order detail with audit trail (admin view).
   */
  async getOrderDetail(orderId: string): Promise<{
    order: Record<string, unknown>;
    audit_trail: unknown[];
  }> {
    const result = await queryDB(
      `SELECT r.*, u.name as customer_name, u.phone as customer_phone, u.email as customer_email,
              s.name as store_name, s.phone as store_phone, s.state as store_state
       FROM requirements r
       LEFT JOIN users u ON r.user_id = u.firebase_uid
       LEFT JOIN stores s ON r.pmbjk_code = s.pmbjk_code
       WHERE r.id = $1`,
      [orderId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Order');
    }

    const auditResult = await queryDB(
      `SELECT osl.*, u.name as changed_by_name
       FROM order_status_log osl
       LEFT JOIN users u ON osl.changed_by = u.firebase_uid
       WHERE osl.requirement_id = $1
       ORDER BY osl.created_at ASC`,
      [orderId],
    );

    return {
      order: result.rows[0],
      audit_trail: auditResult.rows,
    };
  }

  /**
   * Admin override: force-update an order's status.
   */
  async overrideOrderStatus(
    orderId: string,
    newStatus: RequirementStatus,
    admin: AuthUser,
    notes?: string,
  ): Promise<{ success: boolean }> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

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
        `UPDATE requirements SET ${updateFields.join(', ')} WHERE id = $${paramIdx}`,
        updateValues,
      );

      // Log the admin override in audit trail
      await client.query(
        `INSERT INTO order_status_log (requirement_id, from_status, to_status, changed_by, changed_by_role, notes)
         VALUES ($1, $2, $3, $4, 'SUPER_ADMIN', $5)`,
        [orderId, fromStatus, newStatus, admin.uid, notes || 'Admin override'],
      );

      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ================================================================
  //  CATALOG MANAGEMENT
  // ================================================================

  /**
   * Get catalog statistics (branded/generic counts, match rates).
   */
  async getCatalogStats(): Promise<Record<string, unknown>> {
    const [brandedRes, genericRes, matchedRes] = await Promise.all([
      queryDB('SELECT COUNT(*) as total FROM branded_meds'),
      queryDB('SELECT COUNT(*) as total FROM generic_meds'),
      queryDB(
        `SELECT COUNT(DISTINCT b.salt_hash) as matched
         FROM branded_meds b
         INNER JOIN generic_meds g ON b.salt_hash = g.salt_hash
         WHERE b.salt_hash IS NOT NULL`,
      ),
    ]);

    const totalBrandedSalts = await queryDB(
      'SELECT COUNT(DISTINCT salt_hash) as total FROM branded_meds WHERE salt_hash IS NOT NULL',
    );

    return {
      branded_count: parseInt(brandedRes.rows[0].total),
      generic_count: parseInt(genericRes.rows[0].total),
      matched_salts: parseInt(matchedRes.rows[0].matched),
      total_branded_salts: parseInt(totalBrandedSalts.rows[0].total),
      match_rate: totalBrandedSalts.rows[0].total > 0
        ? Math.round(
            (parseInt(matchedRes.rows[0].matched) / parseInt(totalBrandedSalts.rows[0].total)) * 100 * 10,
          ) / 10
        : 0,
    };
  }
}
