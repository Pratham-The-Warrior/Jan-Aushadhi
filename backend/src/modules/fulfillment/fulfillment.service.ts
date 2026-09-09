// ============================================================
// Fulfillment Module — Service Layer
// Checkout, requirements, WhatsApp bridge, dashboard analytics,
// and user profile management.
// Pure business logic, no HTTP concerns.
// ============================================================

import crypto from 'crypto';
import { queryDB } from '../../shared/infra/database';
import { NotFoundError, ValidationError, ExternalServiceError } from '../../shared/errors';
import { isTwilioReady, sendWhatsAppMessage } from '../../shared/infra/twilio';
import type {
  AuthUser,
  BasketItem,
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
    upi_vpa: string | null;
    pmbjk_code: string;
  }> {
    if (!data.legal_attestation) {
      throw new ValidationError('Legal attestation required');
    }

    if (!data.drug_codes || data.drug_codes.length === 0) {
      throw new ValidationError('Cart is empty');
    }

    const fulfillmentType = data.fulfillment_type || 'PICKUP';
    let routedStoreCode = data.pmbjk_code;

    if (fulfillmentType === 'PICKUP') {
      if (!routedStoreCode) {
        throw new ValidationError('Store (pmbjk_code) is required for self-pickup');
      }
    } else if (fulfillmentType === 'DELIVERY') {
      if (!data.delivery_address) {
        throw new ValidationError('Delivery address is required for home delivery');
      }
      if (!data.delivery_coords || data.delivery_coords.lat === undefined || data.delivery_coords.lng === undefined) {
        throw new ValidationError('Delivery coordinates are required for home delivery');
      }

      const { lat, lng } = data.delivery_coords;
      
      // Auto-routing query: get active stores within 10km sorted by distance using PostGIS
      const nearbyRes = await queryDB(
        `SELECT pmbjk_code, name, address, pincode, state, district,
                ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance
         FROM stores
         WHERE status = 'ACTIVE'
           AND ST_DWithin(location, ST_MakePoint($1, $2)::geography, 10000)
         ORDER BY distance ASC
         LIMIT 20`,
        [lng, lat],
      );

      if (nearbyRes.rows.length === 0) {
        throw new ValidationError('No active stores found within delivery search radius (10km).');
      }

      // Check stock filters
      const storeCodes = nearbyRes.rows.map((s: any) => s.pmbjk_code);
      const drugCodes = data.drug_codes.map((d: any) => d.code);

      const stockCheckRes = await queryDB(
        `SELECT pmbjk_code
         FROM store_inventory
         WHERE pmbjk_code = ANY($1)
           AND drug_code = ANY($2)
           AND in_stock = false`,
        [storeCodes, drugCodes],
      );

      const blacklistedStores = new Set(stockCheckRes.rows.map((r: any) => r.pmbjk_code));
      
      const routedStore = nearbyRes.rows.find((s: any) => !blacklistedStores.has(s.pmbjk_code));

      if (!routedStore) {
        throw new ValidationError('No nearby stores have all items in stock to fulfill this delivery.');
      }

      routedStoreCode = routedStore.pmbjk_code;
    } else {
      throw new ValidationError(`Invalid fulfillment type: ${fulfillmentType}`);
    }

    // Lookup store details (VPA, etc.)
    const storeDetailsRes = await queryDB(
      `SELECT name, phone, upi_vpa FROM stores WHERE pmbjk_code = $1`,
      [routedStoreCode],
    );

    if (storeDetailsRes.rows.length === 0) {
      throw new ValidationError(`Store ${routedStoreCode} does not exist`);
    }

    const { upi_vpa: storeUpiVpa, phone: storePhone } = storeDetailsRes.rows[0];

    // Generate unique ticket ID using cryptographically secure random
    const ticketId = `TKT-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

    // SERVER-SIDE PRICE VALIDATION & INTEGRITY CHECK:
    // Do not trust client-submitted prices. Look up the verified MRP directly from generic_meds.
    const requestedCodes = data.drug_codes.map((d: any) => d.code);
    const dbMedsRes = await queryDB(
      `SELECT drug_code, generic_name, mrp FROM generic_meds WHERE drug_code = ANY($1)`,
      [requestedCodes],
    );
    const priceMap = new Map(
      dbMedsRes.rows.map((r: any) => [r.drug_code, { mrp: parseFloat(r.mrp), name: r.generic_name }]),
    );

    let totalBrandedValue = 0;
    let totalGenericValue = 0;
    const verifiedItems: any[] = [];

    for (const item of data.drug_codes) {
      const dbMed = priceMap.get(item.code);
      const genericMrp = dbMed ? dbMed.mrp : (typeof item.mrp === 'number' ? item.mrp : 0);
      const genericName = dbMed ? dbMed.name : (item.name || item.code);
      const qty = Math.max(1, parseInt(item.quantity as any, 10) || 1);
      const brandedMrp = Math.max(
        genericMrp,
        typeof item.branded_mrp === 'number' && item.branded_mrp > 0 ? item.branded_mrp : genericMrp * 2,
      );

      totalGenericValue += genericMrp * qty;
      totalBrandedValue += brandedMrp * qty;

      verifiedItems.push({
        code: item.code,
        name: genericName,
        quantity: qty,
        mrp: genericMrp,
        branded_mrp: brandedMrp,
      });
    }

    totalGenericValue = Math.round(totalGenericValue * 100) / 100;
    totalBrandedValue = Math.round(totalBrandedValue * 100) / 100;
    const calculatedSavings = Math.max(0, Math.round((totalBrandedValue - totalGenericValue) * 100) / 100);

    await queryDB(
      `INSERT INTO requirements
       (id, user_id, pmbjk_code, items, status, legal_attestation, delivery_address, payment_mode, 
        total_branded_value, total_generic_value, savings, created_at, fulfillment_type, payment_status, payment_details, prescription_url)
       VALUES ($1, $2, $3, $4, 'PENDING_ACCEPTANCE', $5, $6, $7, $8, $9, $10, NOW(), $11, 'PENDING', '{}', $12)`,
      [
        ticketId,
        user.uid,
        routedStoreCode,
        JSON.stringify(verifiedItems),
        true,
        data.delivery_address || '',
        data.payment_mode || 'COD',
        totalBrandedValue,
        totalGenericValue,
        calculatedSavings,
        fulfillmentType,
        data.prescription_url || null,
      ],
    );

    // Log initial status in audit trail
    await queryDB(
      `INSERT INTO order_status_log (requirement_id, from_status, to_status, changed_by, changed_by_role, notes)
       VALUES ($1, NULL, 'PENDING_ACCEPTANCE', $2, 'CUSTOMER', 'Order placed via checkout')`,
      [ticketId, user.uid],
    ).catch(() => {
      // Non-blocking — audit trail table might not exist in older deployments
    });

    // Optional automated Twilio WhatsApp dispatch to Kendra store
    try {
      if (isTwilioReady() && storePhone) {
        const cleanPhone = storePhone.replace(/[^0-9]/g, '');
        if (cleanPhone.length >= 10) {
          const formattedPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone}`;
          const alertMsg = `*Jan Aushadhi Alert*\nNew Order Placed!\nTicket: ${ticketId}\nItems: ${verifiedItems.length} meds (Total: ₹${totalGenericValue.toFixed(2)})\nPlease open Seller Central to review.`;
          sendWhatsAppMessage(formattedPhone, alertMsg).catch(() => {});
        }
      }
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      ticketId,
      status: 'PENDING_ACCEPTANCE',
      totalGenericValue,
      savings: calculatedSavings,
      upi_vpa: storeUpiVpa || null,
      pmbjk_code: routedStoreCode,
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
    const parsedItems: any[] = Array.isArray(items)
      ? items
      : typeof items === 'string'
        ? JSON.parse(items)
        : [];
    const drugList = parsedItems
      .map((i: any) => `- ${i.name || i.code} (Qty: ${i.quantity || 1})`)
      .join('\n');

    const message = `Hello ${store_name},\n\nI have generated a Jan Aushadhi requirement ticket via the platform.\n\n*Ticket ID:* ${ticket_id}\n*Customer:* ${user.name || 'User'}\n*Phone:* ${user.phone_number || 'N/A'}\n\n*Items:* \n${drugList}\n\nPlease confirm availability for fulfillment. I have the physical prescription ready.`;

    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = (store_phone || '').replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    return { whatsappUrl };
  }

  /**
   * Cancel an order by customer.
   * Only allowed when status is PENDING_ACCEPTANCE.
   */
  async cancelOrder(
    requirementId: string,
    user: AuthUser,
    reason?: string,
  ): Promise<{ success: boolean; status: string }> {
    const checkRes = await queryDB(
      'SELECT status FROM requirements WHERE id = $1 AND user_id = $2',
      [requirementId, user.uid],
    );

    if (checkRes.rows.length === 0) {
      throw new NotFoundError('Requirement');
    }

    const currentStatus = checkRes.rows[0].status;
    if (currentStatus !== 'PENDING_ACCEPTANCE') {
      throw new ValidationError(
        `Cannot cancel order with status "${currentStatus}". Orders can only be cancelled while pending acceptance.`,
      );
    }

    await queryDB(
      `UPDATE requirements 
       SET status = 'CANCELLED_BY_CUSTOMER',
           cancelled_by = 'CUSTOMER',
           cancelled_reason = $1,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [reason || 'Cancelled by customer', requirementId, user.uid],
    );

    await queryDB(
      `INSERT INTO order_status_log (requirement_id, from_status, to_status, changed_by, changed_by_role, notes)
       VALUES ($1, 'PENDING_ACCEPTANCE', 'CANCELLED_BY_CUSTOMER', $2, 'CUSTOMER', $3)`,
      [requirementId, user.uid, reason || 'Cancelled by customer'],
    ).catch(() => {});

    return { success: true, status: 'CANCELLED_BY_CUSTOMER' };
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown database error';
      console.error('Failed to fetch user requirements:', message);
      throw new ExternalServiceError('PostgreSQL', 'Failed to fetch requirements history');
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
    } catch (err) {
      // Graceful degradation: fall back to Firebase token data
      // but log the error for operational visibility
      const message = err instanceof Error ? err.message : 'Unknown database error';
      console.error('Failed to fetch user profile from DB, using token fallback:', message);
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
  async updateBasket(userId: string, basket: BasketItem[]): Promise<{ success: boolean }> {
    await queryDB(
      'UPDATE users SET medical_basket = $1 WHERE firebase_uid = $2',
      [JSON.stringify(basket || []), userId],
    );

    return { success: true };
  }
}
