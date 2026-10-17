// ============================================================
// Fulfillment Module — Service Layer
// Checkout, requirements, WhatsApp bridge, dashboard analytics,
// and user profile management.
// Pure business logic and domain orchestration; delegates data
// access to FulfillmentRepository.
// ============================================================

import crypto from 'crypto';
import { FulfillmentRepository } from './fulfillment.repository';
import { NotFoundError, ValidationError } from '../../shared/errors';
import { isTwilioReady, sendWhatsAppMessage } from '../../shared/infra/twilio';
import type {
  AuthUser,
  BasketItem,
  CreateRequirementPayload,
  DashboardStats,
  MonthlySavings,
} from '../../shared/types';

export class FulfillmentService {
  constructor(private readonly repository: FulfillmentRepository = new FulfillmentRepository()) {}

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
      const nearbyStores = await this.repository.findNearbyActiveStores(lng, lat, 10000);

      if (nearbyStores.length === 0) {
        throw new ValidationError('No active stores found within delivery search radius (10km).');
      }

      const storeCodes = nearbyStores.map((s) => s.pmbjk_code);
      const drugCodes = data.drug_codes.map((d) => d.code);
      const outOfStockStores = await this.repository.findOutOfStockStoreCodes(storeCodes, drugCodes);
      const blacklistedSet = new Set(outOfStockStores);

      const routedStore = nearbyStores.find((s) => !blacklistedSet.has(s.pmbjk_code));
      if (!routedStore) {
        throw new ValidationError('No nearby stores have all items in stock to fulfill this delivery.');
      }

      routedStoreCode = routedStore.pmbjk_code;
    } else {
      throw new ValidationError(`Invalid fulfillment type: ${fulfillmentType}`);
    }

    // Lookup store details (VPA, etc.)
    const storeDetails = await this.repository.findStoreDetails(routedStoreCode);
    if (!storeDetails) {
      throw new ValidationError(`Store ${routedStoreCode} does not exist`);
    }

    const storeUpiVpa = storeDetails.upi_vpa || null;
    const storePhone = storeDetails.phone;

    // Generate unique ticket ID using cryptographically secure random
    const ticketId = `TKT-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

    // SERVER-SIDE PRICE VALIDATION & INTEGRITY CHECK:
    // Look up verified MRP directly from generic_meds table.
    const requestedCodes = data.drug_codes.map((d) => d.code);
    const priceMap = await this.repository.findVerifiedGenericMeds(requestedCodes);

    let totalBrandedValue = 0;
    let totalGenericValue = 0;
    const verifiedItems: any[] = [];

    for (const item of data.drug_codes) {
      const dbMed = priceMap.get(item.code);
      const genericMrp = dbMed ? dbMed.mrp : (typeof item.mrp === 'number' ? item.mrp : 0);
      const genericName = dbMed ? dbMed.name : (item.name || item.code);
      const qty = Math.max(1, parseInt(item.quantity as any, 10) || 1);
      // No comparable brand price (e.g. different strength) → record no saving
      // rather than guessing one.
      const brandedMrp = Math.max(
        genericMrp,
        typeof item.branded_mrp === 'number' ? item.branded_mrp : genericMrp,
      );

      totalBrandedValue += brandedMrp * qty;
      totalGenericValue += genericMrp * qty;

      verifiedItems.push({
        drug_code: item.code,
        quantity: qty,
        name: genericName,
        mrp: genericMrp,
        branded_mrp: brandedMrp,
        subtotal: Math.round(genericMrp * qty * 100) / 100,
      });
    }

    const totalSavings = Math.max(0, Math.round((totalBrandedValue - totalGenericValue) * 100) / 100);
    const initialStatus = 'PENDING_ACCEPTANCE';

    // Persist requirement
    await this.repository.createRequirement({
      ticketId,
      userId: user.uid,
      pmbjkCode: routedStoreCode,
      itemsJson: JSON.stringify(verifiedItems),
      status: initialStatus,
      legalAttestation: data.legal_attestation,
      deliveryAddress: data.delivery_address || 'Self-Pickup at Kendra',
      paymentMode: data.payment_mode || 'COD',
      fulfillmentType,
      prescriptionUrl: data.prescription_url,
      totalBrandedValue: Math.round(totalBrandedValue * 100) / 100,
      totalGenericValue: Math.round(totalGenericValue * 100) / 100,
      savings: totalSavings,
      paymentDetailsJson: JSON.stringify({
        mode: data.payment_mode || 'COD',
        status: 'PENDING',
        vpa: storeUpiVpa,
      }),
    });

    // Upsert customer record
    await this.repository.upsertCustomer(user.uid, user.name, user.phone_number, user.email);

    // Auto-dispatch WhatsApp confirmation if Twilio is configured
    if (isTwilioReady()) {
      const recipient = user.phone_number || storePhone;
      if (recipient) {
        const message = [
          `*Jan Aushadhi Order Confirmed!*`,
          `Ticket ID: *${ticketId}*`,
          `Store: ${storeDetails.name} (${routedStoreCode})`,
          `Fulfillment: ${fulfillmentType}`,
          `Items: ${verifiedItems.length}`,
          `Estimated Total: Rs.${totalGenericValue.toFixed(2)}`,
          `You Saved: Rs.${totalSavings.toFixed(2)}`,
          ``,
          `Show this ticket at the Kendra to collect your medicines.`,
        ].join('\n');

        sendWhatsAppMessage(recipient, message).catch((err) => {
          console.warn('⚠️  Async WhatsApp send failed:', err.message);
        });
      }
    }

    return {
      success: true,
      ticketId,
      status: initialStatus,
      totalGenericValue: Math.round(totalGenericValue * 100) / 100,
      savings: totalSavings,
      upi_vpa: storeUpiVpa,
      pmbjk_code: routedStoreCode,
    };
  }

  /**
   * Get user's past requirements.
   *
   * @param userId  Firebase UID
   * @param limit   Maximum records to return
   */
  async getUserRequirements(userId: string, limit: number = 50): Promise<any[]> {
    const rows = await this.repository.findUserRequirements(userId, limit);
    return rows.map((r: any) => ({
      id: r.id,
      ticketId: r.id,
      pmbjk_code: r.pmbjk_code,
      status: r.status,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
      total_generic_value: parseFloat(r.total_generic_value) || 0,
      total_branded_value: parseFloat(r.total_branded_value) || 0,
      savings: parseFloat(r.savings) || 0,
      payment_mode: r.payment_mode,
      payment_status: r.payment_status,
      fulfillment_type: r.fulfillment_type,
      delivery_address: r.delivery_address,
      prescription_url: r.prescription_url,
      seller_notes: r.seller_notes,
      store: r.store_name ? { name: r.store_name, address: r.store_address, phone: r.store_phone } : null,
      created_at: r.created_at,
      updated_at: r.updated_at,
      accepted_at: r.accepted_at,
      completed_at: r.completed_at,
    }));
  }

  /**
   * Get a single requirement by its ticket ID.
   */
  async getRequirementById(ticketId: string, userId?: string): Promise<any> {
    const row = await this.repository.findRequirementById(ticketId);
    if (!row) {
      throw new NotFoundError(`Requirement ${ticketId}`);
    }

    // Access control: only creator or admin can view
    if (userId && row.user_id !== userId) {
      throw new NotFoundError(`Requirement ${ticketId}`);
    }

    return {
      id: row.id,
      ticketId: row.id,
      pmbjk_code: row.pmbjk_code,
      status: row.status,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : rItems(row.items),
      total_generic_value: parseFloat(row.total_generic_value) || 0,
      total_branded_value: parseFloat(row.total_branded_value) || 0,
      savings: parseFloat(row.savings) || 0,
      payment_mode: row.payment_mode,
      payment_status: row.payment_status,
      fulfillment_type: row.fulfillment_type,
      delivery_address: row.delivery_address,
      prescription_url: row.prescription_url,
      seller_notes: row.seller_notes,
      store: row.store_name ? { name: row.store_name, address: row.store_address, phone: row.store_phone } : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Cancel an order by customer.
   */
  async cancelOrder(ticketId: string, user: AuthUser, reason?: string): Promise<{ success: boolean; message: string }> {
    const row = await this.repository.findRequirementById(ticketId);
    if (!row) {
      throw new NotFoundError(`Requirement ${ticketId}`);
    }

    if (row.user_id !== user.uid) {
      throw new NotFoundError(`Requirement ${ticketId}`);
    }

    // Can only cancel if pending or accepted
    if (!['PENDING_ACCEPTANCE', 'ACCEPTED'].includes(row.status)) {
      throw new ValidationError(`Cannot cancel an order in "${row.status}" status.`);
    }

    await this.repository.cancelRequirement(ticketId, user.uid, row.status, reason);
    return { success: true, message: 'Order cancelled successfully.' };
  }

  // Alias
  async cancelRequirement(ticketId: string, user: AuthUser, reason?: string) {
    return this.cancelOrder(ticketId, user, reason);
  }

  /**
   * Generate a WhatsApp deep-link URL for an existing requirement.
   */
  async getWhatsAppLink(ticketId: string, user: AuthUser): Promise<{ whatsappUrl: string; message: string }> {
    const order = await this.getRequirementById(ticketId, user.uid);
    const store = order.store;

    let phone = '919999999999';
    if (store?.phone) {
      const cleaned = store.phone.replace(/[^0-9]/g, '');
      phone = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
    }

    const items = order.items as any[];
    const itemsList = items.map((i: any) => `• ${i.name} (x${i.quantity || 1}) - Rs.${i.subtotal || i.mrp}`).join('\n');

    const message = [
      `*Jan Aushadhi Prescription / Order Ticket*`,
      `Ticket ID: *${order.id}*`,
      `Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}`,
      `Fulfillment: ${order.fulfillment_type || 'PICKUP'}`,
      order.delivery_address ? `Delivery Address: ${order.delivery_address}` : '',
      ``,
      `*Requested Medicines:*`,
      itemsList,
      ``,
      `Estimated Generic Cost: *Rs.${order.total_generic_value.toFixed(2)}*`,
      `Total Savings: *Rs.${order.savings.toFixed(2)}*`,
      ``,
      `Hello Kendra Pharmacist, please verify availability and confirm my order.`,
    ].filter(Boolean).join('\n');

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    return { whatsappUrl, message };
  }

  // Alias
  async getWhatsAppDeepLink(ticketId: string, user: AuthUser) {
    return this.getWhatsAppLink(ticketId, user);
  }

  // ================================================================
  //  DASHBOARD & ANALYTICS
  // ================================================================

  /**
   * Get aggregated dashboard statistics for a user.
   */
  async getDashboard(user: AuthUser): Promise<{
    user: { uid: string; name?: string; phone?: string };
    stats: DashboardStats;
    active_prescriptions: unknown[];
  }> {
    const [lifetime, monthlySavings, activePrescriptions] = await Promise.all([
      this.repository.findUserLifetimeStats(user.uid),
      this.repository.findUser30DaySavings(user.uid),
      this.repository.findActivePrescriptionItems(user.uid),
    ]);

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
        total_orders: parseInt(lifetime.total_orders, 10) || 0,
      },
      active_prescriptions: activePrescriptions,
    };
  }

  // Alias
  async getUserDashboard(user: AuthUser) {
    return this.getDashboard(user);
  }

  /**
   * Get monthly savings chart data for the last 6 months.
   */
  async getMonthlyStats(userId: string): Promise<{ history: MonthlySavings[] }> {
    const history = await this.repository.findMonthlySavingsChart(userId);
    return { history };
  }

  // ================================================================
  //  USER PROFILE & BASKET
  // ================================================================

  /**
   * Update the user's recurring medical basket.
   */
  async updateBasket(user: AuthUser | string, basket: BasketItem[]): Promise<{ success: boolean }> {
    const uid = typeof user === 'string' ? user : user.uid;
    await this.repository.updateMedicalBasket(uid, basket);
    return { success: true };
  }

  // Alias
  async updateMedicalBasket(userId: string, basket: BasketItem[]) {
    await this.repository.updateMedicalBasket(userId, basket);
  }

  /**
   * Get user profile details.
   */
  async getProfile(user: AuthUser | string): Promise<any> {
    const uid = typeof user === 'string' ? user : user.uid;
    const profile = await this.repository.findUserProfile(uid);
    if (!profile) {
      throw new NotFoundError('User profile');
    }
    return {
      ...profile,
      medical_basket: typeof profile.medical_basket === 'string'
        ? JSON.parse(profile.medical_basket)
        : profile.medical_basket,
    };
  }

  // Alias
  async getUserProfile(userId: string) {
    const profile = await this.repository.findUserProfile(userId);
    if (!profile) throw new NotFoundError('User profile');
    return profile;
  }
}

function rItems(items: unknown): unknown {
  return typeof items === 'string' ? JSON.parse(items) : items;
}
