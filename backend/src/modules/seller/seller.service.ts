// ============================================================
// Seller Module — Service Layer
// Business logic for the Kendra Seller Central portal.
// All methods enforce pmbjk_code scoping to prevent
// sellers from accessing data belonging to other stores.
// ============================================================

import { NotFoundError, ValidationError } from '../../shared/errors';
import { VALID_STATUS_TRANSITIONS } from '../../shared/types';
import type {
  AuthUser,
  RequirementStatus,
  SellerAnalyticsSummary,
  SellerDailyAnalytics,
  StoreInventoryItem,
} from '../../shared/types';
import { APP_CONSTANTS } from '../../shared/constants';
import { SellerRepository } from './seller.repository';

export class SellerService {
  constructor(private repository: SellerRepository = new SellerRepository()) {}

  // ================================================================
  //  SELLER STORE PROFILE
  // ================================================================

  /**
   * Get the seller's own store profile.
   */
  async getStoreProfile(pmbjkCode: string): Promise<Record<string, unknown>> {
    const store = await this.repository.getStoreProfile(pmbjkCode);
    if (!store) {
      throw new NotFoundError('Store');
    }
    return store;
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
      // Strict allowlist: <localpart>@<provider>
      // Blocks ampersands, equals signs, and other characters that could be
      // used to inject additional parameters into the UPI deep-link URL.
      const UPI_VPA_REGEX = /^[a-zA-Z0-9._\-]{2,50}@[a-zA-Z]{2,20}$/;
      if (!UPI_VPA_REGEX.test(updates.upi_vpa)) {
        throw new ValidationError(
          'Invalid UPI VPA format. Must be in the format user@bank (e.g. merchant@upi).',
        );
      }
      setClauses.push(`upi_vpa = $${paramIdx++}`);
      values.push(updates.upi_vpa);
    }

    if (setClauses.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(pmbjkCode);
    await this.repository.updateStoreProfile(pmbjkCode, setClauses, values);

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
    const totalCount = await this.repository.countOrders(whereClause, params);

    // Fetch paginated orders with customer info
    const queryParams = [...params, limit, offset];
    const orders = await this.repository.findOrders(whereClause, queryParams);

    return {
      count: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      orders,
    };
  }

  /**
   * Get a single order detail, scoped to this store.
   */
  async getOrderDetail(
    pmbjkCode: string,
    orderId: string,
  ): Promise<{ order: Record<string, unknown>; audit_trail: unknown[] }> {
    const order = await this.repository.findOrderDetail(pmbjkCode, orderId);
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
    const updatedOrder = await this.repository.updateOrderStatusTx(
      pmbjkCode,
      orderId,
      (currentOrder) => {
        const currentStatus = currentOrder.status as string;

        // Validate the status transition
        const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
        if (!allowedTransitions.includes(newStatus)) {
          throw new ValidationError(
            `Cannot transition from "${currentStatus}" to "${newStatus}". Allowed: ${allowedTransitions.join(', ') || 'none'}`,
          );
        }

        // Build the UPDATE query with status-specific timestamps
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
        return { newStatus, updateFields, updateValues, notes };
      },
      user,
    );

    return { success: true, order: updatedOrder };
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

    const totalCount = await this.repository.countGenericMeds(options.search);
    const items = await this.repository.findInventoryItems(pmbjkCode, {
      search: options.search,
      limit,
      offset,
    });

    return {
      count: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      items,
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
    await this.repository.upsertInventoryItem(pmbjkCode, drugCode, inStock);
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

    const updated = await this.repository.bulkUpsertInventory(pmbjkCode, updates);
    return { success: true, updated };
  }

  // ================================================================
  //  ANALYTICS
  // ================================================================

  /**
   * Get summary analytics for the seller's store.
   */
  async getAnalyticsSummary(pmbjkCode: string): Promise<SellerAnalyticsSummary> {
    return this.repository.getAnalyticsSummary(pmbjkCode);
  }

  /**
   * Get daily analytics breakdown for charts (last 30 days).
   */
  async getDailyAnalytics(pmbjkCode: string): Promise<{ daily: SellerDailyAnalytics[] }> {
    const daily = await this.repository.getDailyAnalytics(pmbjkCode);
    return { daily };
  }

  /**
   * Export order history as CSV-ready data.
   */
  async exportOrders(
    pmbjkCode: string,
  ): Promise<{ orders: unknown[] }> {
    const orders = await this.repository.exportOrders(pmbjkCode);
    return { orders };
  }
}
