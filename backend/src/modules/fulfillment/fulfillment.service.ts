// ============================================================
// Fulfillment Module — Service Layer
// Checkout, requirements, WhatsApp bridge, dashboard analytics,
// and user profile management.
// Pure business logic, no HTTP concerns.
// ============================================================

import { queryDB } from '../../shared/infra/database';
import { NotFoundError, ValidationError } from '../../shared/errors';
import type {
  AuthUser,
  CreateRequirementPayload,
  DashboardStats,
  MonthlySavings,
} from '../../shared/types';

export class FulfillmentService {

  // ================================================================
  //  REQUIREMENTS (Checkout → WhatsApp Handoff)
  // ================================================================

  /**
   * Create a new requirement ticket from the checkout flow.
   * Generates a unique ticket ID, records the order, and returns
   * the ticket summary for the WhatsApp handoff.
   *
   * @param user  Authenticated user
   * @param data  Checkout payload
   * @throws ValidationError if legal attestation is missing
   */
  async createRequirement(
    user: AuthUser,
    data: CreateRequirementPayload,
  ): Promise<{
    success: boolean;
    ticketId: string;
    status: string;
    totalGenericValue: number;
    savings: number;
  }> {
    if (!data.legal_attestation) {
      throw new ValidationError('Legal attestation required');
    }

    if (!data.drug_codes || data.drug_codes.length === 0) {
      throw new ValidationError('Cart is empty');
    }

    // Generate unique ticket ID
    const ticketId = `TKT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Calculate totals and savings
    let totalBrandedValue = 0;
    let totalGenericValue = 0;

    for (const item of data.drug_codes) {
      totalGenericValue += (item.mrp || 0) * (item.quantity || 1);
      totalBrandedValue += (item.branded_mrp || 0) * (item.quantity || 1);
    }

    await queryDB(
      `INSERT INTO requirements
       (id, user_id, pmbjk_code, items, status, legal_attestation, delivery_address, payment_mode, total_branded_value, total_generic_value, savings, created_at)
       VALUES ($1, $2, $3, $4, 'SENT', $5, $6, $7, $8, $9, $10, NOW())`,
      [
        ticketId,
        user.uid,
        data.pmbjk_code,
        JSON.stringify(data.drug_codes),
        true,
        data.delivery_address || '',
        data.payment_mode || 'COD',
        totalBrandedValue,
        totalGenericValue,
        totalBrandedValue - totalGenericValue,
      ],
    );

    return {
      success: true,
      ticketId,
      status: 'SENT',
      totalGenericValue,
      savings: totalBrandedValue - totalGenericValue,
    };
  }

  /**
   * Generate a WhatsApp deep-link for a requirement ticket.
   * Joins requirements with stores to get the store phone number.
   *
   * @param requirementId  Unique ticket ID
   * @param user           Authenticated user
   * @throws NotFoundError if requirement or store link not found
   */
  async getWhatsAppLink(requirementId: string, user: AuthUser): Promise<{ whatsappUrl: string }> {
    const result = await queryDB(
      `SELECT r.items, r.id as ticket_id, s.phone as store_phone, s.name as store_name
       FROM requirements r
       JOIN stores s ON r.pmbjk_code = s.pmbjk_code
       WHERE r.id = $1 AND r.user_id = $2`,
      [requirementId, user.uid],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Requirement or store link');
    }

    const { items, ticket_id, store_phone, store_name } = result.rows[0];
    const drugList = JSON.parse(items)
      .map((i: any) => `- ${i.name} (Qty: ${i.quantity})`)
      .join('\n');

    const message = `Hello ${store_name},\n\nI have generated a Jan Aushadhi requirement ticket via the platform.\n\n*Ticket ID:* ${ticket_id}\n*Customer:* ${user.name || 'User'}\n*Phone:* ${user.phone_number || 'N/A'}\n\n*Items:* \n${drugList}\n\nPlease confirm availability for fulfillment. I have the physical prescription ready.`;

    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = store_phone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    return { whatsappUrl };
  }

  /**
   * Get a user's requirements history, ordered by most recent.
   *
   * @param userId  Firebase UID
   */
  async getUserRequirements(userId: string): Promise<{ count: number; requirements: unknown[] }> {
    try {
      const result = await queryDB(
        'SELECT * FROM requirements WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
        [userId],
      );
      return { count: result.rows.length, requirements: result.rows };
    } catch {
      return { count: 0, requirements: [] };
    }
  }

  /**
   * Get a single requirement by ID, scoped to the authenticated user.
   *
   * @param requirementId  Unique ticket ID
   * @param userId         Firebase UID
   * @throws NotFoundError if not found or not owned by user
   */
  async getRequirementById(requirementId: string, userId: string): Promise<unknown> {
    const result = await queryDB(
      'SELECT * FROM requirements WHERE id = $1 AND user_id = $2',
      [requirementId, userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Requirement');
    }

    return result.rows[0];
  }

  // ================================================================
  //  DASHBOARD & ANALYTICS
  // ================================================================

  /**
   * Get aggregated dashboard stats for a user.
   * Includes lifetime savings, order count, monthly projection,
   * and active prescriptions.
   *
   * @param user  Authenticated user
   */
  async getDashboard(user: AuthUser): Promise<{
    user: { uid: string; name?: string; phone?: string };
    stats: DashboardStats;
    active_prescriptions: unknown[];
  }> {
    // 1. Lifetime stats
    const lifetimeRes = await queryDB(
      `SELECT
         COALESCE(SUM(total_branded_value), 0) as lifetime_branded,
         COALESCE(SUM(total_generic_value), 0) as lifetime_generic,
         COALESCE(SUM(savings), 0) as lifetime_savings,
         COUNT(*) as total_orders
       FROM requirements
       WHERE user_id = $1`,
      [user.uid],
    );
    const lifetime = lifetimeRes.rows[0];

    // 2. Monthly savings (for annual projection)
    const monthlyRes = await queryDB(
      `SELECT COALESCE(SUM(savings), 0) as monthly_savings
       FROM requirements
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
      [user.uid],
    );
    const monthlySavings = parseFloat(monthlyRes.rows[0].monthly_savings);

    // 3. Active prescriptions (items from last confirmed order)
    const activeRes = await queryDB(
      `SELECT items FROM requirements
       WHERE user_id = $1 AND status = 'CONFIRMED'
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.uid],
    );

    let activePrescriptions: unknown[] = [];
    if (activeRes.rows.length > 0) {
      activePrescriptions =
        typeof activeRes.rows[0].items === 'string'
          ? JSON.parse(activeRes.rows[0].items)
          : activeRes.rows[0].items;
    }

    const avgSavingsPercent =
      parseFloat(lifetime.lifetime_branded) > 0
        ? (parseFloat(lifetime.lifetime_savings) / parseFloat(lifetime.lifetime_branded)) * 100
        : 0;

    return {
      user: { uid: user.uid, name: user.name, phone: user.phone_number },
      stats: {
        average_savings_percent: Math.round(avgSavingsPercent * 10) / 10,
        annual_savings_projection: Math.round(monthlySavings * 12 * 100) / 100,
        lifetime_savings: parseFloat(lifetime.lifetime_savings),
        total_orders: parseInt(lifetime.total_orders),
      },
      active_prescriptions: activePrescriptions,
    };
  }

  /**
   * Get monthly savings chart data for the last 6 months.
   *
   * @param userId  Firebase UID
   */
  async getMonthlyStats(userId: string): Promise<{ history: MonthlySavings[] }> {
    const result = await queryDB(
      `SELECT
         TO_CHAR(created_at, 'Mon') as month,
         DATE_TRUNC('month', created_at) as month_sort,
         COALESCE(SUM(savings), 0) as savings,
         COALESCE(SUM(total_generic_value), 0) as generic_spend
       FROM requirements
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY month, month_sort
       ORDER BY month_sort ASC`,
      [userId],
    );

    return {
      history: result.rows.map((r: any) => ({
        month: r.month,
        savings: parseFloat(r.savings),
        spend: parseFloat(r.generic_spend),
      })),
    };
  }

  // ================================================================
  //  USER PROFILE & BASKET
  // ================================================================

  /**
   * Get user profile from local PostgreSQL.
   * Falls back to Firebase token data if no local record exists.
   *
   * @param user  Authenticated user
   */
  async getProfile(user: AuthUser): Promise<unknown> {
    try {
      const result = await queryDB(
        'SELECT * FROM users WHERE firebase_uid = $1',
        [user.uid],
      );

      if (result.rows.length === 0) {
        return { uid: user.uid, name: user.name, phone: user.phone_number };
      }

      return result.rows[0];
    } catch {
      return { uid: user.uid, name: user.name, phone: user.phone_number };
    }
  }

  /**
   * Persist the user's medical basket to PostgreSQL.
   * Implements the "Merge & Max" cart sync strategy.
   *
   * @param userId  Firebase UID
   * @param basket  Cart items array
   */
  async updateBasket(userId: string, basket: unknown[]): Promise<{ success: boolean }> {
    await queryDB(
      'UPDATE users SET medical_basket = $1 WHERE firebase_uid = $2',
      [JSON.stringify(basket || []), userId],
    );

    return { success: true };
  }
}
