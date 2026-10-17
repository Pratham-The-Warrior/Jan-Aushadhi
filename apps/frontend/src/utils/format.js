// ============================================================
// Display formatting helpers — one way to show money, phones,
// dates and order statuses across the patient app
// ============================================================

/** ₹1,234.50 — always two decimals for prices. */
export function formatINR(value, { decimals = 2 } = {}) {
  const n = Number(value) || 0;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** ₹6,231 — whole rupees for totals and savings summaries. */
export function formatRupees(value) {
  return formatINR(Math.round(Number(value) || 0), { decimals: 0 });
}

/** "+919876543210" → "+91 98765 43210" */
export function formatPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  if (local.length !== 10) return phone;
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

export function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Order statuses from the backend (APP_CONSTANTS.STATUS_*) → patient-facing
 * label, tone, and position on the progress tracker (null = ended early).
 */
const ORDER_STATUS = {
  PENDING_ACCEPTANCE: { label: 'Waiting for Kendra', tone: 'warning', step: 0 },
  ACCEPTED: { label: 'Accepted', tone: 'info', step: 1 },
  PREPARING: { label: 'Being packed', tone: 'info', step: 1 },
  READY_FOR_PICKUP: { label: 'Ready for pickup', tone: 'success', step: 2 },
  COMPLETED: { label: 'Collected', tone: 'neutral', step: 3 },
  CANCELLED_BY_CUSTOMER: { label: 'Cancelled by you', tone: 'danger', step: null },
  CANCELLED_BY_SELLER: { label: 'Cancelled by Kendra', tone: 'danger', step: null },
  CANCELLED_BY_ADMIN: { label: 'Cancelled', tone: 'danger', step: null },
};

export const ORDER_STEPS = ['Placed', 'Accepted', 'Ready', 'Collected'];

export function orderStatus(status) {
  return ORDER_STATUS[status] || { label: String(status || 'Unknown').replace(/_/g, ' ').toLowerCase(), tone: 'neutral', step: 0 };
}

export const TONE_CLASSES = {
  success: 'bg-[#e6f4ea] text-[#137333]',
  info: 'bg-[#e8f0fe] text-[#1a56b0]',
  warning: 'bg-[#fef7e0] text-[#8a4b00]',
  danger: 'bg-[#fce8e6] text-[#b3261e]',
  neutral: 'bg-surface-low text-on-surface/70',
};

/** Orders store items as a JSON string or an array depending on the source. */
export function parseOrderItems(order) {
  if (Array.isArray(order?.items)) return order.items;
  try {
    const parsed = JSON.parse(order?.items || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
