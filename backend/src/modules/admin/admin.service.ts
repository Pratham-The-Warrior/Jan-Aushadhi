// ============================================================
// Admin Module — Service Layer
// Business logic for the Super Admin & Operations platform.
// Full platform-wide access — no store scoping.
// ============================================================

import { getAuth } from 'firebase-admin/auth';
import { NotFoundError, ValidationError, ConflictError } from '../../shared/errors';
import { invalidateRoleCache } from '../../shared/infra/rbac';
import type {
  AuthUser,
  PlatformStats,
  UserRole,
  RequirementStatus,
} from '../../shared/types';
import { AdminRepository } from './admin.repository';

export class AdminService {
  constructor(private repository: AdminRepository = new AdminRepository()) {}

  // ================================================================
  //  GLOBAL DASHBOARD
  // ================================================================

  /**
   * Get platform-wide statistics for the admin command center.
   */
  async getPlatformStats(): Promise<PlatformStats> {
    return this.repository.getPlatformStats();
  }

  /**
   * Get the last N orders across all stores (live feed).
   */
  async getOrdersFeed(limit: number = 20): Promise<{ orders: unknown[] }> {
    const orders = await this.repository.getOrdersFeed(limit);
    return { orders };
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

    const totalCount = await this.repository.countStores(whereClause, params);

    params.push(limit, offset);
    const stores = await this.repository.findStores(whereClause, params);

    return {
      count: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      stores,
    };
  }

  /**
   * Get a single store with detailed information.
   */
  async getStoreDetail(pmbjkCode: string): Promise<Record<string, unknown>> {
    const store = await this.repository.findStoreDetail(pmbjkCode);
    if (!store) {
      throw new NotFoundError('Store');
    }

    const stats = await this.repository.findStoreOrderStats(pmbjkCode);

    return {
      ...store,
      stats,
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

    const updated = await this.repository.updateStoreStatus(pmbjkCode, status);
    if (!updated) {
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
    // 1. Verify the store exists
    const store = await this.repository.findStoreForAssignment(pmbjkCode);
    if (!store) {
      throw new NotFoundError('Store');
    }

    // The seller app signs in with the store code, so the Firebase login is
    // always the store's virtual email; a real email is only kept on the profile.
    const loginEmail = `${pmbjkCode.toLowerCase()}@seller.janaushadhi.local`;
    let existingUser;
    try {
      existingUser = await getAuth().getUserByEmail(loginEmail);
    } catch (err: any) {
      if (err.code !== 'auth/user-not-found') {
        throw new ValidationError(`Firebase Auth lookup failed: ${err.message}`);
      }
    }

    // 2. Refuse before touching any credentials if someone else runs this store
    if (store.seller_uid && store.seller_uid !== existingUser?.uid) {
      throw new ConflictError(`Store ${pmbjkCode} already has an operator. Remove them first.`);
    }
    if (!existingUser && !payload.password) {
      throw new ValidationError('Password is required for new operator creation');
    }

    // 3. Provision or update the login
    let userUid: string;
    try {
      if (existingUser) {
        const updated = await getAuth().updateUser(existingUser.uid, {
          displayName: payload.name,
          ...(payload.password ? { password: payload.password } : {}),
        });
        userUid = updated.uid;
      } else {
        const created = await getAuth().createUser({ email: loginEmail, password: payload.password, displayName: payload.name });
        userUid = created.uid;
      }
    } catch (firebaseErr: any) {
      throw new ValidationError(`Firebase Auth Provisioning Failed: ${firebaseErr.message}`);
    }

    await this.repository.assignSellerTx(pmbjkCode, userUid, {
      name: payload.name,
      phone: payload.phone,
      email: payload.email || loginEmail,
    });

    // 4. Invalidate role cache
    await invalidateRoleCache(userUid);

    return { success: true };
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

    const totalCount = await this.repository.countUsers(whereClause, params);

    params.push(limit, offset);
    const users = await this.repository.findUsers(whereClause, params);

    return {
      count: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      users,
    };
  }

  /**
   * Get a single user with their order history summary.
   */
  async getUserDetail(uid: string): Promise<Record<string, unknown>> {
    const user = await this.repository.findUserDetail(uid);
    if (!user) {
      throw new NotFoundError('User');
    }

    const stats = await this.repository.findUserOrderStats(uid);

    return {
      ...user,
      stats,
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
    if (newRole === 'STORE_OWNER') {
      // A Kendra operator needs a store-code login for the seller app, which
      // only "Assign operator" creates.
      throw new ValidationError('To make someone a Kendra operator, use Stores → Assign operator. It creates their store-code login.');
    }

    const updated = await this.repository.updateUserRole(uid, newRole);
    if (!updated) {
      throw new NotFoundError('User');
    }

    // Invalidate cache immediately
    await invalidateRoleCache(uid);

    return { success: true };
  }

  /**
   * Suspend or unsuspend a user account.
   */
  async suspendUser(uid: string, suspend: boolean): Promise<{ success: boolean }> {
    const updated = await this.repository.suspendUser(uid, suspend);
    if (!updated) {
      throw new NotFoundError('User');
    }

    await invalidateRoleCache(uid);
    if (suspend) {
      // End existing sessions too: verifyAuth checks revocation on every request
      await getAuth().revokeRefreshTokens(uid).catch(() => undefined);
    }
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
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ count: number; page: number; totalPages: number; orders: unknown[] }> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (options.status === 'CANCELLED') {
      conditions.push(`r.status LIKE 'CANCELLED%'`);
    } else if (options.status) {
      conditions.push(`r.status = $${paramIdx++}`);
      params.push(options.status);
    }
    if (options.search) {
      // Ticket ID, customer name/phone or store name
      conditions.push(`(r.id ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx} OR u.phone ILIKE $${paramIdx} OR s.name ILIKE $${paramIdx})`);
      params.push(`%${options.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
      paramIdx++;
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

    const totalCount = await this.repository.countAllOrders(whereClause, params);

    params.push(limit, offset);
    const orders = await this.repository.findAllOrders(whereClause, params);

    return {
      count: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      orders,
    };
  }

  /**
   * Get full order detail with audit trail (admin view).
   */
  async getOrderDetail(orderId: string): Promise<{
    order: Record<string, unknown>;
    audit_trail: unknown[];
  }> {
    const order = await this.repository.findOrderDetail(orderId);
    if (!order) {
      throw new NotFoundError('Order');
    }

    const auditTrail = await this.repository.findOrderAuditTrail(orderId);

    return {
      order,
      audit_trail: auditTrail,
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
    await this.repository.overrideOrderStatusTx(orderId, newStatus, admin, notes);
    return { success: true };
  }

  // ================================================================
  //  CATALOG MANAGEMENT
  // ================================================================

  /**
   * Get catalog statistics (branded/generic counts, match rates).
   */
  async getCatalogStats(): Promise<Record<string, unknown>> {
    return this.repository.getCatalogStats();
  }
}
