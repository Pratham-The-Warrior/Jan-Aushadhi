// ============================================================
// Seller Central — Dashboard Page
// Summary cards, daily revenue chart, recent orders list
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, IndianRupee, TrendingUp, Package, CheckCircle2, ArrowRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getAnalyticsSummary, getDailyAnalytics, getOrders } from '../services/seller.api';

function StatCard({ icon: Icon, label, value, accent, subtitle }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="stat-label">{label}</span>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} style={{ color: accent }} />
        </div>
      </div>
      <span className="stat-value">{value}</span>
      {subtitle && <span className="stat-change">{subtitle}</span>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-surface-700)', border: '1px solid var(--color-border)',
      borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.8125rem',
    }}>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</p>
      <p style={{ color: 'var(--color-brand-400)', fontWeight: 600 }}>
        ₹{Number(payload[0].value).toLocaleString('en-IN')}
      </p>
      {payload[1] && (
        <p style={{ color: 'var(--color-status-accepted)', fontWeight: 500, marginTop: 2 }}>
          {payload[1].value} orders
        </p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      const [s, c, o] = await Promise.all([
        getAnalyticsSummary(),
        getDailyAnalytics(),
        getOrders({ limit: 8 }),
      ]);
      setStats(s);
      setChartData(c.daily?.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        revenue: d.revenue,
        orders: d.orders,
      })) || []);
      setRecentOrders(o.orders || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const formatCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

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
        <div style={{
          width: 40, height: 40, border: '3px solid var(--color-surface-600)',
          borderTopColor: 'var(--color-brand-500)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Dashboard</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
          Welcome back. Here's your store overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard icon={ShoppingCart} label="Today's Orders" value={stats?.orders_today || 0} accent="#f59e0b" subtitle={`${stats?.pending_orders || 0} pending`} />
        <StatCard icon={IndianRupee} label="Today's Revenue" value={formatCurrency(stats?.revenue_today)} accent="#10b981" />
        <StatCard icon={TrendingUp} label="Total Revenue" value={formatCurrency(stats?.total_revenue)} accent="#3b82f6" subtitle={`${stats?.total_orders || 0} total orders`} />
        <StatCard icon={Package} label="Avg Order Value" value={formatCurrency(stats?.avg_order_value)} accent="#8b5cf6" />
      </div>

      {/* Chart + Recent Orders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="max-lg:grid-cols-1!">
        {/* Revenue Chart */}
        <div className="card">
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem' }}>
            Revenue Trend (30 Days)
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
              No data yet
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Recent Orders</h3>
            <button onClick={() => navigate('/orders')} className="btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {recentOrders.length > 0 ? recentOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate('/orders')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer', transition: 'background 0.15s ease',
                }}
              >
                <div>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {order.customer_name || 'Customer'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {Array.isArray(order.items) ? order.items.length : 0} items • {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {getStatusBadge(order.status)}
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-brand-400)', marginTop: 4 }}>
                    {formatCurrency(order.total_generic_value)}
                  </p>
                </div>
              </div>
            )) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
                <CheckCircle2 size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p>No orders yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
