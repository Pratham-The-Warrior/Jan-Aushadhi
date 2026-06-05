// ============================================================
// Seller Central — Orders Management Console
// The core screen: filterable data table with status pipeline,
// order detail slide-over, and action buttons.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, ChevronLeft, ChevronRight, Eye, Check, X as XIcon,
  Package, Truck, CheckCircle2, Phone, MessageCircle, Clock, AlertTriangle
} from 'lucide-react';
import { getOrders, getOrder, updateOrderStatus, rejectOrder } from '../services/seller.api';

const STATUS_FILTERS = [
  { value: '', label: 'All Orders' },
  { value: 'PENDING_ACCEPTANCE', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'PREPARING', label: 'Preparing' },
  { value: 'READY_FOR_PICKUP', label: 'Ready' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED_BY_SELLER', label: 'Cancelled' },
];

const STATUS_ACTIONS = {
  PENDING_ACCEPTANCE: [
    { label: 'Accept', status: 'ACCEPTED', icon: Check, cls: 'btn-primary' },
  ],
  ACCEPTED: [
    { label: 'Start Preparing', status: 'PREPARING', icon: Package, cls: 'btn-primary' },
  ],
  PREPARING: [
    { label: 'Mark Ready', status: 'READY_FOR_PICKUP', icon: Truck, cls: 'btn-primary' },
  ],
  READY_FOR_PICKUP: [
    { label: 'Complete', status: 'COMPLETED', icon: CheckCircle2, cls: 'btn-primary' },
  ],
};

function StatusBadge({ status }) {
  const map = {
    PENDING_ACCEPTANCE: 'badge-pending',
    ACCEPTED: 'badge-accepted',
    PREPARING: 'badge-preparing',
    READY_FOR_PICKUP: 'badge-ready',
    COMPLETED: 'badge-completed',
  };
  const cls = map[status] || 'badge-cancelled';
  const display = status.replace(/_/g, ' ');
  return <span className={`badge ${cls}`}>{display}</span>;
}

function timeSince(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadOrders = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await getOrders({ status: statusFilter || undefined, page, limit: 20 });
      setOrders(data.orders || []);
      setTotalCount(data.count || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Load orders error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadOrders]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => loadOrders(false), 30000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const openDetail = async (orderId) => {
    setDetailLoading(true);
    setSelectedOrder(null);
    try {
      const data = await getOrder(orderId);
      setSelectedOrder(data);
    } catch (err) {
      console.error('Order detail error:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    setActionLoading(orderId + newStatus);
    try {
      await updateOrderStatus(orderId, newStatus);
      await loadOrders(false);
      if (selectedOrder?.order?.id === orderId) {
        openDetail(orderId);
      }
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async () => {
    if (!rejectReason || rejectReason.length < 5) return;
    setActionLoading('reject');
    try {
      await rejectOrder(rejectModal, rejectReason);
      setRejectModal(null);
      setRejectReason('');
      await loadOrders(false);
    } catch (err) {
      alert(err.message || 'Failed to reject order');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Orders</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            {totalCount} total orders
          </p>
        </div>
        <button onClick={() => loadOrders(false)} className="btn-secondary" disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: 4 }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
            style={{
              padding: '0.5rem 1rem', borderRadius: 999, fontSize: '0.8125rem', fontWeight: 500,
              border: '1px solid var(--color-border)', cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              background: statusFilter === f.value ? 'var(--color-brand-500)' : 'var(--color-surface-700)',
              color: statusFilter === f.value ? 'white' : 'var(--color-text-secondary)',
              borderColor: statusFilter === f.value ? 'var(--color-brand-500)' : 'var(--color-border)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--color-surface-600)', borderTopColor: 'var(--color-brand-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--color-text-muted)' }}>
            <Package size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: '0.9375rem', fontWeight: 500 }}>No orders found</p>
            <p style={{ fontSize: '0.8125rem', marginTop: 4 }}>Try changing the filter or wait for new orders</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const items = Array.isArray(order.items) ? order.items : (typeof order.items === 'string' ? JSON.parse(order.items) : []);
                  const actions = STATUS_ACTIONS[order.status] || [];
                  return (
                    <tr key={order.id}>
                      <td>
                        <button
                          onClick={() => openDetail(order.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--color-brand-400)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem' }}
                        >
                          {order.id.slice(0, 12)}...
                        </button>
                      </td>
                      <td>
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.8125rem' }}>{order.customer_name || '—'}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{order.customer_phone || ''}</p>
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{items.length}</td>
                      <td style={{ fontWeight: 600, color: 'var(--color-brand-400)' }}>
                        ₹{Number(order.total_generic_value || 0).toLocaleString('en-IN')}
                      </td>
                      <td><StatusBadge status={order.status} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                          <Clock size={12} />
                          {timeSince(order.created_at)}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                          <button onClick={() => openDetail(order.id)} className="btn-icon" title="View Details" aria-label="View order details">
                            <Eye size={14} />
                          </button>
                          {actions.map((a) => (
                            <button
                              key={a.status}
                              onClick={() => handleStatusUpdate(order.id, a.status)}
                              className={a.cls}
                              style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                              disabled={actionLoading === order.id + a.status}
                            >
                              <a.icon size={12} />
                              {a.label}
                            </button>
                          ))}
                          {!order.status.startsWith('CANCELLED') && order.status !== 'COMPLETED' && (
                            <button
                              onClick={() => setRejectModal(order.id)}
                              className="btn-icon"
                              style={{ color: 'var(--color-danger-500)' }}
                              title="Reject Order"
                              aria-label="Reject order"
                            >
                              <XIcon size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
            padding: '1rem', borderTop: '1px solid var(--color-border)',
          }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} className="btn-icon" disabled={page <= 1}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="btn-icon" disabled={page >= totalPages}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={22} style={{ color: 'var(--color-danger-500)' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Reject Order</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>This action cannot be undone</p>
              </div>
            </div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              Reason for rejection *
            </label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="input"
              rows={3}
              placeholder="e.g. Out of stock for requested medicines..."
              style={{ resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleReject} className="btn-danger" disabled={rejectReason.length < 5 || actionLoading === 'reject'}>
                {actionLoading === 'reject' ? 'Rejecting...' : 'Reject Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Slide-Over */}
      {(selectedOrder || detailLoading) && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedOrder(null)} />
          <div className="slide-over animate-fade-in">
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Order Details</h2>
              <button onClick={() => setSelectedOrder(null)} className="btn-icon"><XIcon size={18} /></button>
            </div>

            {detailLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <div style={{ width: 32, height: 32, border: '3px solid var(--color-surface-600)', borderTopColor: 'var(--color-brand-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : selectedOrder?.order && (
              <div style={{ padding: '1.5rem' }}>
                {/* Order Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ORDER ID</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'monospace' }}>{selectedOrder.order.id}</p>
                  </div>
                  <StatusBadge status={selectedOrder.order.status} />
                </div>

                {/* Customer Info */}
                <div className="card" style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>CUSTOMER</h4>
                  <p style={{ fontWeight: 600 }}>{selectedOrder.order.customer_name || 'Unknown'}</p>
                  {selectedOrder.order.customer_phone && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <a href={`tel:${selectedOrder.order.customer_phone}`} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
                        <Phone size={12} /> Call
                      </a>
                      <a href={`https://wa.me/${selectedOrder.order.customer_phone}`} target="_blank" rel="noreferrer" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="card" style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>ITEMS</h4>
                  {(() => {
                    const items = Array.isArray(selectedOrder.order.items) ? selectedOrder.order.items : (typeof selectedOrder.order.items === 'string' ? JSON.parse(selectedOrder.order.items) : []);
                    return items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < items.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                        <div>
                          <p style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{item.name || item.code}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Qty: {item.quantity}</p>
                        </div>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-brand-400)' }}>
                          ₹{Number(item.mrp || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    ));
                  })()}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                    <span style={{ fontWeight: 700 }}>Total</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-brand-400)', fontSize: '1.0625rem' }}>
                      ₹{Number(selectedOrder.order.total_generic_value || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Audit Trail */}
                {selectedOrder.audit_trail?.length > 0 && (
                  <div className="card">
                    <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>STATUS HISTORY</h4>
                    {selectedOrder.audit_trail.map((entry, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.75rem', paddingBottom: '0.75rem', marginBottom: '0.75rem', borderBottom: i < selectedOrder.audit_trail.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-brand-500)', marginTop: 6, flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                            {entry.from_status ? `${entry.from_status} → ` : ''}{entry.to_status}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {new Date(entry.created_at).toLocaleString('en-IN')} • by {entry.changed_by_role}
                          </p>
                          {entry.notes && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{entry.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                {STATUS_ACTIONS[selectedOrder.order.status] && (
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                    {STATUS_ACTIONS[selectedOrder.order.status].map((a) => (
                      <button
                        key={a.status}
                        onClick={() => handleStatusUpdate(selectedOrder.order.id, a.status)}
                        className={a.cls}
                        style={{ flex: 1 }}
                        disabled={actionLoading === selectedOrder.order.id + a.status}
                      >
                        <a.icon size={16} /> {a.label}
                      </button>
                    ))}
                    <button
                      onClick={() => { setRejectModal(selectedOrder.order.id); setSelectedOrder(null); }}
                      className="btn-danger"
                      style={{ flex: 1 }}
                    >
                      <XIcon size={16} /> Reject
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
