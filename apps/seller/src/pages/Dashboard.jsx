// ============================================================
// Seller Central — Dashboard Page  (v2 — Polished)
// Skeleton loading, stagger animations, welcome banner,
// enhanced chart styling.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, IndianRupee, TrendingUp, Package, CheckCircle2, ArrowRight, Sparkles
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getAnalyticsSummary, getDailyAnalytics, getOrders } from '../services/seller.api';

// Skeleton components
function SkeletonCard() {
  return (
    <div className="stat-card" style={{ gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton skeleton-line" style={{ width: 90, height: 10 }} />
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
      </div>
      <div className="skeleton skeleton-line" style={{ width: 100, height: 28 }} />
      <div className="skeleton skeleton-line" style={{ width: 70, height: 12 }} />
    </div>
  );
}

function SkeletonChart() {
  return <div className="skeleton skeleton-chart" />;
}

function SkeletonOrder() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <div className="skeleton skeleton-line" style={{ width: 120, height: 13 }} />
        <div className="skeleton skeleton-line" style={{ width: 80, height: 11 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' }}>
        <div className="skeleton" style={{ width: 80, height: 22, borderRadius: 999 }} />
        <div className="skeleton skeleton-line" style={{ width: 50, height: 13 }} />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent, subtitle }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="stat-label">{label}</span>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `${accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
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
      borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.8125rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    }}>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</p>
      <p style={{ color: 'var(--color-brand-400)', fontWeight: 700 }}>
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Welcome Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 1.5rem', borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06), rgba(16, 185, 129, 0.02))',
        border: '1px solid rgba(16, 185, 129, 0.1)',
      }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {getGreeting()}
            <Sparkles size={18} style={{ color: 'var(--color-brand-400)' }} />
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Here's your store performance overview for today.
          </p>
        </div>
        <button onClick={() => navigate('/orders')} className="btn-primary max-sm:hidden" style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}>
          View Orders <ArrowRight size={14} />
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}
        className={loading ? '' : 'stagger-children'}>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard icon={ShoppingCart} label="Today's Orders" value={stats?.orders_today || 0} accent="#f59e0b" subtitle={`${stats?.pending_orders || 0} pending`} />
            <StatCard icon={IndianRupee} label="Today's Revenue" value={formatCurrency(stats?.revenue_today)} accent="#10b981" />
            <StatCard icon={TrendingUp} label="Total Revenue" value={formatCurrency(stats?.total_revenue)} accent="#3b82f6" subtitle={`${stats?.total_orders || 0} total orders`} />
            <StatCard icon={Package} label="Avg Order Value" value={formatCurrency(stats?.avg_order_value)} accent="#8b5cf6" />
          </>
        )}
      </div>

      {/* Chart + Recent Orders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="max-lg:grid-cols-1!">
        {/* Revenue Chart */}
        <div className="card">
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem' }}>
            Revenue Trend (30 Days)
          </h3>
          {loading ? (
            <SkeletonChart />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', gap: '0.5rem' }}>
              <TrendingUp size={32} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: '0.875rem' }}>No revenue data yet</p>
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Recent Orders</h3>
            <button onClick={() => navigate('/orders')} className="btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <>
                <SkeletonOrder />
                <SkeletonOrder />
                <SkeletonOrder />
                <SkeletonOrder />
              </>
            ) : recentOrders.length > 0 ? recentOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate('/orders')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  borderRadius: 8,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.03)'; e.currentTarget.style.paddingLeft = '0.5rem'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.paddingLeft = '0'; }}
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
                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-brand-400)', marginTop: 4 }}>
                    {formatCurrency(order.total_generic_value)}
                  </p>
                </div>
              </div>
            )) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', gap: '0.5rem' }}>
                <CheckCircle2 size={36} style={{ opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>No orders yet</p>
                <p style={{ fontSize: '0.75rem' }}>Orders will appear here once received</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
