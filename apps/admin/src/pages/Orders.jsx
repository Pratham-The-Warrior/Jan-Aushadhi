// ============================================================
// Admin Console — Global Order Operations
// Global directory of order tickets, detailed audit trails,
// and administrative status overrides.
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  RefreshCw, Search, ChevronLeft, ChevronRight, Eye, AlertTriangle,
  X, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { getAllOrders, getOrderDetails, overrideOrderStatus } from '../services/admin.api';

const ALL_ORDER_STATUSES = [
  'PENDING_ACCEPTANCE',
  'ACCEPTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'COMPLETED',
  'CANCELLED_BY_SELLER',
  'CANCELLED_BY_CUSTOMER'
];

export default function Orders() {
  const location = useLocation();
  
  // Extract initial search if coming from dashboard click
  const initialSearch = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('search') || '';
  }, [location.search]);

  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('');
  const [pmbjkFilter, setPmbjkFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  // Slide-Over Detail
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Override Modal
  const [overrideModal, setOverrideModal] = useState(null); // stores order details
  const [overrideStatusVal, setOverrideStatusVal] = useState('COMPLETED');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadOrders = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setTimeout(() => setLoading(true), 0);
    } else {
      setTimeout(() => setRefreshing(true), 0);
    }
    try {
      const data = await getAllOrders({
        status: statusFilter || undefined,
        pmbjk_code: pmbjkFilter || undefined,
        date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        date_to: dateTo ? new Date(dateTo).toISOString() : undefined,
        page,
        limit: 20
      });
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Load admin orders error:', err);
      showToast('danger', 'Failed to fetch global orders feed');
    } finally {
      setTimeout(() => {
        setLoading(false);
        setRefreshing(false);
      }, 0);
    }
  }, [statusFilter, pmbjkFilter, dateFrom, dateTo, page, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders(false);
    }, 0);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenDetail = async (id) => {
    try {
      const data = await getOrderDetails(id);
      setSelectedOrder(data);
    } catch (err) {
      console.error('Fetch order detail error:', err);
      showToast('danger', 'Failed to retrieve order logs');
    }
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overrideNotes || overrideNotes.trim().length < 5) {
      showToast('danger', 'Rejection / Override justification notes must be at least 5 characters');
      return;
    }
    setActionLoading('override');
    try {
      await overrideOrderStatus(overrideModal.id, overrideStatusVal, overrideNotes);
      showToast('success', `Order status successfully overridden to ${overrideStatusVal}`);
      setOverrideModal(null);
      setOverrideNotes('');
      loadOrders(false);
      
      // If slide-over detail is open, refresh it
      if (selectedOrder?.order?.id === overrideModal.id) {
        handleOpenDetail(overrideModal.id);
      }
    } catch (err) {
      console.error('Override order status error:', err);
      showToast('danger', err.message || 'Failed to update order status');
    } finally {
      setActionLoading('');
    }
  };

  // Client-side search matching for the page set (due to SQL wildcards being slightly heavier)
  const filteredOrders = useMemo(() => {
    if (!search) return orders;
    const term = search.toLowerCase();
    return orders.filter(o => 
      o.id.toLowerCase().includes(term) ||
      (o.customer_name || '').toLowerCase().includes(term) ||
      (o.customer_phone || '').includes(term) ||
      (o.store_name || '').toLowerCase().includes(term)
    );
  }, [orders, search]);

  const getStatusBadge = (status) => {
    const map = {
      PENDING_ACCEPTANCE: 'badge-pending',
      ACCEPTED: 'badge-accepted',
      PREPARING: 'badge-preparing',
      READY_FOR_PICKUP: 'badge-ready',
      COMPLETED: 'badge-completed',
    };
    const cls = map[status] || 'badge-cancelled';
    return <span className={`badge ${cls}`}>{status.replace(/_/g, ' ')}</span>;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100,
          padding: '1rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: toast.type === 'success' ? '1px solid var(--color-brand-500)' : '1px solid var(--color-danger-500)',
          color: toast.type === 'success' ? 'var(--color-brand-400)' : 'var(--color-danger-500)',
          animation: 'fadeIn 0.2s ease forwards'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Order Operations</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Global audit center. Resolve disputes, check lifecycle histories, and override statuses.
          </p>
        </div>
        <button onClick={() => loadOrders(false)} className="btn-secondary" disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="card grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-3 p-4">
        
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search by ID, name or phone..."
            className="input"
            style={{ paddingLeft: '2.5rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <select 
          className="input"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ background: 'var(--color-surface-700)', cursor: 'pointer' }}
        >
          <option value="">All Order Statuses</option>
          {ALL_ORDER_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>

        {/* Kendra Filter */}
        <input
          type="text"
          placeholder="Filter by PMBJK Store Code"
          className="input"
          value={pmbjkFilter}
          onChange={e => { setPmbjkFilter(e.target.value); setPage(1); }}
        />

        {/* Date From */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <input
            type="date"
            className="input"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            title="Date from"
          />
        </div>

        {/* Date To */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <input
            type="date"
            className="input"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            title="Date to"
          />
        </div>

      </div>

      {/* Main Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--color-surface-600)', borderTopColor: 'var(--color-brand-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320, color: 'var(--color-text-muted)' }}>
            <AlertTriangle size={44} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: '0.9375rem', fontWeight: 600 }}>No orders match query criteria</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order Ticket ID</th>
                  <th>Placed Date</th>
                  <th>Customer</th>
                  <th>Fulfillment Store</th>
                  <th>Status</th>
                  <th>Generic Value</th>
                  <th>Savings</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <button
                        onClick={() => handleOpenDetail(order.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-brand-400)', cursor: 'pointer', fontWeight: 700, fontSize: '0.8125rem', fontFamily: 'monospace' }}
                      >
                        {order.id.slice(0, 12)}...
                      </button>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {new Date(order.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{order.customer_name || 'Anonymous'}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{order.customer_phone || ''}</p>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{order.store_name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{order.pmbjk_code}</p>
                      </div>
                    </td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-brand-400)' }}>
                      ₹{parseFloat(order.total_generic_value || 0).toFixed(2)}
                    </td>
                    <td style={{ fontWeight: 600, color: '#8b5cf6' }}>
                      ₹{parseFloat(order.savings || 0).toFixed(2)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleOpenDetail(order.id)} className="btn-icon" title="Audit Log Dossier" aria-label="View logs">
                          <Eye size={14} />
                        </button>
                        <button 
                          onClick={() => { setOverrideModal(order); setOverrideStatusVal(order.status); }} 
                          className="btn-icon text-rose-500" 
                          title="Administrative Override"
                          aria-label="Override status"
                        >
                          <ShieldAlert size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
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

      {/* Override Status Modal */}
      {overrideModal && (
        <div className="modal-overlay" onClick={() => setOverrideModal(null)}>
          <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={handleOverrideSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldAlert size={22} style={{ color: 'var(--color-danger-500)' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Administrative Status Override</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Order ID: {overrideModal.id}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Force Target Status</label>
                <select 
                  className="input"
                  value={overrideStatusVal}
                  onChange={e => setOverrideStatusVal(e.target.value)}
                  style={{ background: 'var(--color-surface-700)', cursor: 'pointer' }}
                >
                  {ALL_ORDER_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Override Justification Log *
                </label>
                <textarea
                  className="input"
                  required
                  rows={3}
                  value={overrideNotes}
                  onChange={e => setOverrideNotes(e.target.value)}
                  placeholder="e.g. Manually overriding status because the seller operator was unable to connect..."
                  style={{ resize: 'vertical' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Warning: Force status overrides bypass typical business lifecycle transition guards. The operation is logged in the order's status history table.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setOverrideModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-danger" disabled={actionLoading === 'override'}>
                {actionLoading === 'override' ? 'Overriding...' : 'Force Overriding Status'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Order Detail Slide-Over */}
      {selectedOrder && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedOrder(null)} />
          <div className="slide-over animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Order Docket</h2>
              <button onClick={() => setSelectedOrder(null)} className="btn-icon"><X size={18} /></button>
            </div>

            {/* General Docket Details */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>TICKET ID</span>
                {getStatusBadge(selectedOrder.order.status)}
              </div>
              <p style={{ fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: 700 }}>{selectedOrder.order.id}</p>
              <hr style={{ border: 'none', borderBottom: '1px solid var(--color-border)' }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <p><span style={{ color: 'var(--color-text-muted)' }}>Customer:</span> {selectedOrder.order.customer_name || 'Anonymous'}</p>
                {selectedOrder.order.customer_phone && <p><span style={{ color: 'var(--color-text-muted)' }}>Customer Phone:</span> {selectedOrder.order.customer_phone}</p>}
                <p><span style={{ color: 'var(--color-text-muted)' }}>Store Name:</span> {selectedOrder.order.store_name} ({selectedOrder.order.pmbjk_code})</p>
                <p><span style={{ color: 'var(--color-text-muted)' }}>Store Contact:</span> {selectedOrder.order.store_phone || 'None'}</p>
                <p><span style={{ color: 'var(--color-text-muted)' }}>Created at:</span> {new Date(selectedOrder.order.created_at).toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Medicine Items Breakdown */}
            <div className="card">
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>DRUGS BREAKDOWN</h4>
              {(() => {
                const items = Array.isArray(selectedOrder.order.items) ? selectedOrder.order.items : (typeof selectedOrder.order.items === 'string' ? JSON.parse(selectedOrder.order.items) : []);
                return items.map((item, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: index < items.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <div>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{item.name || item.code}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Qty: {item.quantity}</p>
                    </div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-brand-400)' }}>₹{parseFloat(item.mrp || 0).toFixed(2)}</span>
                  </div>
                ));
              })()}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', fontWeight: 700 }}>
                <span>Total Generic Cost</span>
                <span style={{ color: 'var(--color-brand-400)' }}>₹{parseFloat(selectedOrder.order.total_generic_value || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.8125rem', color: '#8b5cf6', fontWeight: 600 }}>
                <span>Patient Savings Generated</span>
                <span>₹{parseFloat(selectedOrder.order.savings || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Order status log audit trail */}
            <div className="card">
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>STATUS HISTORY LOG</h4>
              {selectedOrder.audit_trail && selectedOrder.audit_trail.length > 0 ? selectedOrder.audit_trail.map((entry, index) => (
                <div key={entry.id} style={{ display: 'flex', gap: '0.75rem', paddingBottom: '0.75rem', marginBottom: '0.75rem', borderBottom: index < selectedOrder.audit_trail.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-brand-500)', marginTop: 6, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                      {entry.from_status ? `${entry.from_status} → ` : ''}{entry.to_status}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 1 }}>
                      {new Date(entry.created_at).toLocaleString('en-IN')} • by {entry.changed_by_name || entry.changed_by_role} ({entry.changed_by_role})
                    </p>
                    {entry.notes && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', background: 'var(--color-surface-900)', padding: '0.25rem 0.5rem', borderRadius: 4, marginTop: 4 }}>{entry.notes}</p>}
                  </div>
                </div>
              )) : (
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No audit logs logged for this order ticket.</p>
              )}
            </div>

            {/* Override Action triggers */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderStyle: 'dashed' }}>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>OPERATIONS CONSOLE</h4>
              <button 
                onClick={() => { setOverrideModal(selectedOrder.order); setOverrideStatusVal(selectedOrder.order.status); setSelectedOrder(null); }} 
                className="btn-danger" 
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Trigger Force Override
              </button>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
