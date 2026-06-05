// ============================================================
// Seller Central — Financial Reports Page
// Summary counters, filtered order list, and downloadable CSV
// reports for the store owner's accounting.
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileSpreadsheet, IndianRupee, TrendingUp, ShoppingBag, PiggyBank,
  Download, RefreshCw, ChevronLeft, ChevronRight,
  Search
} from 'lucide-react';
import { exportOrders, getAnalyticsSummary } from '../services/seller.api';

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: 'month', label: 'This Month' },
];

export default function Reports() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 15;

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [, ordsData] = await Promise.all([
        getAnalyticsSummary(),
        exportOrders()
      ]);
      setOrders(ordsData.orders || []);
    } catch (err) {
      console.error('Load reports error:', err);
      showToast('danger', err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  // Filter logic in frontend
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Search term match
      if (search) {
        const term = search.toLowerCase();
        const customerName = (order.customer_name || '').toLowerCase();
        const customerPhone = (order.customer_phone || '');
        const orderId = order.id.toLowerCase();
        if (!customerName.includes(term) && !customerPhone.includes(term) && !orderId.includes(term)) {
          return false;
        }
      }

      // 2. Date range filter
      if (dateRange !== 'all') {
        const orderDate = new Date(order.created_at);
        const now = new Date();
        if (dateRange === 'today') {
          if (orderDate.toDateString() !== now.toDateString()) return false;
        } else if (dateRange === '7days') {
          const diff = (now - orderDate) / (1000 * 60 * 60 * 24);
          if (diff > 7) return false;
        } else if (dateRange === '30days') {
          const diff = (now - orderDate) / (1000 * 60 * 60 * 24);
          if (diff > 30) return false;
        } else if (dateRange === 'month') {
          if (orderDate.getMonth() !== now.getMonth() || orderDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
      }

      // 3. Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'COMPLETED' && order.status !== 'COMPLETED') return false;
        if (statusFilter === 'CANCELLED' && !order.status.startsWith('CANCELLED')) return false;
        if (statusFilter === 'ACTIVE' && (order.status === 'COMPLETED' || order.status.startsWith('CANCELLED'))) return false;
      }

      // 4. Payment mode filter
      if (paymentFilter !== 'all') {
        if (order.payment_mode !== paymentFilter) return false;
      }

      return true;
    });
  }, [orders, search, dateRange, statusFilter, paymentFilter]);

  // Derived metrics from filtered set
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalSavings = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    filteredOrders.forEach(o => {
      if (o.status === 'COMPLETED') {
        totalRevenue += parseFloat(o.total_generic_value || 0);
        totalSavings += parseFloat(o.savings || 0);
        completedCount++;
      } else if (o.status.startsWith('CANCELLED')) {
        cancelledCount++;
      }
    });

    const avgVal = completedCount > 0 ? (totalRevenue / completedCount) : 0;

    return {
      revenue: totalRevenue,
      savings: totalSavings,
      completed: completedCount,
      cancelled: cancelledCount,
      avgOrderValue: avgVal,
      totalCount: filteredOrders.length
    };
  }, [filteredOrders]);

  // Paginated set
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredOrders.slice(start, start + limit);
  }, [filteredOrders, page, limit]);

  const totalPages = Math.ceil(filteredOrders.length / limit) || 1;

  // Reset page when filters change (removed useEffect in favor of direct event handlers)

  // CSV Exporter
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      showToast('danger', 'No records found to export');
      return;
    }
    setExporting(true);

    try {
      const headers = [
        'Order ID', 'Customer Name', 'Customer Phone', 'Date Placed',
        'Status', 'Payment Mode', 'Branded Value (INR)', 'Generic Value (INR)', 'Savings (INR)',
        'Accepted At', 'Completed At'
      ];

      const rows = filteredOrders.map(o => [
        o.id,
        o.customer_name || 'N/A',
        o.customer_phone || 'N/A',
        new Date(o.created_at).toLocaleString('en-IN'),
        o.status,
        o.payment_mode || 'COD',
        parseFloat(o.total_branded_value || 0).toFixed(2),
        parseFloat(o.total_generic_value || 0).toFixed(2),
        parseFloat(o.savings || 0).toFixed(2),
        o.accepted_at ? new Date(o.accepted_at).toLocaleString('en-IN') : 'N/A',
        o.completed_at ? new Date(o.completed_at).toLocaleString('en-IN') : 'N/A'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Kendra_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('success', `Exported ${filteredOrders.length} rows to CSV`);
    } catch (err) {
      console.error('CSV export failed:', err);
      showToast('danger', 'CSV generation failed');
    } finally {
      setExporting(false);
    }
  };

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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-surface-600)', borderTopColor: 'var(--color-brand-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Toast */}
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
          <FileSpreadsheet size={18} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Financial Reports</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Detailed order audits, financial analysis, and CSV records export.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleExportCSV} className="btn-primary" disabled={exporting}>
            <Download size={16} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button onClick={loadData} className="btn-secondary" aria-label="Reload data">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Metric Counters (Computed dynamically based on active filters) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="stat-label">Report Revenue</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={18} style={{ color: 'var(--color-brand-400)' }} />
            </div>
          </div>
          <span className="stat-value">₹{metrics.revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>From {metrics.completed} fulfilled orders</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="stat-label">Patient Savings</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PiggyBank size={18} style={{ color: '#8b5cf6' }} />
            </div>
          </div>
          <span className="stat-value">₹{metrics.savings.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-brand-400)' }}>Avg savings: {metrics.completed > 0 ? ((metrics.savings / metrics.revenue) * 100).toFixed(0) : 0}%</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="stat-label">Avg Order Value</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} style={{ color: '#3b82f6' }} />
            </div>
          </div>
          <span className="stat-value">₹{metrics.avgOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>For matching set</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="stat-label">Match volume</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={18} style={{ color: '#f59e0b' }} />
            </div>
          </div>
          <span className="stat-value">{metrics.totalCount}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{metrics.cancelled} rejected / cancelled</span>
        </div>

      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', padding: '1.25rem' }}>
        
        {/* Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>SEARCH BY CUSTOMER / ID</label>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search..."
              className="input"
              style={{ paddingLeft: '2.25rem', paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.8125rem' }}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {/* Date Range */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>DATE RANGE</label>
          <select 
            className="input" 
            style={{ paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.8125rem', background: 'var(--color-surface-700)', cursor: 'pointer' }}
            value={dateRange}
            onChange={e => { setDateRange(e.target.value); setPage(1); }}
          >
            {DATE_RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>ORDER STATE</label>
          <select 
            className="input" 
            style={{ paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.8125rem', background: 'var(--color-surface-700)', cursor: 'pointer' }}
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All Orders</option>
            <option value="ACTIVE">Active (In Pipeline)</option>
            <option value="COMPLETED">Fulfilled / Completed</option>
            <option value="CANCELLED">Rejected / Cancelled</option>
          </select>
        </div>

        {/* Payment mode */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>PAYMENT MODE</label>
          <select 
            className="input" 
            style={{ paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.8125rem', background: 'var(--color-surface-700)', cursor: 'pointer' }}
            value={paymentFilter}
            onChange={e => { setPaymentFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All Modes</option>
            <option value="COD">Cash On Delivery (COD)</option>
            <option value="ONLINE">Paid Online</option>
          </select>
        </div>

      </div>

      {/* Orders Audit Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {paginatedOrders.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260, color: 'var(--color-text-muted)' }}>
            <FileSpreadsheet size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>No reports matching query filters</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Placed Date</th>
                  <th>Customer Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Generic Value</th>
                  <th>Savings</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map(order => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>{order.id.slice(0, 15)}...</td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{order.customer_name || '—'}</td>
                    <td style={{ fontSize: '0.8125rem' }}>{order.customer_phone || '—'}</td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: 4, background: order.payment_mode === 'ONLINE' ? 'rgba(59,130,246,0.15)' : 'rgba(100,116,139,0.15)', color: order.payment_mode === 'ONLINE' ? '#3b82f6' : 'var(--color-text-secondary)' }}>
                        {order.payment_mode || 'COD'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-brand-400)' }}>
                      ₹{parseFloat(order.total_generic_value || 0).toFixed(2)}
                    </td>
                    <td style={{ fontWeight: 600, color: '#8b5cf6' }}>
                      ₹{parseFloat(order.savings || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
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

    </div>
  );
}
