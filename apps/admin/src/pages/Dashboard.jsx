// ============================================================
// Admin Console — Command Center (Global Dashboard)
// Displays platform-wide metrics, live orders, and charts.
// (v2 — Polished with Shimmer Skeletons & Staggers)
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Store, ShoppingBag, PiggyBank, TrendingUp, RefreshCw, 
  MapPin, Clock, CheckCircle2, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getPlatformStats, getOrdersFeed } from '../services/admin.api';

// Skeleton Components
function SkeletonCard() {
  return (
    <div className="stat-card" style={{ gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton skeleton-line" style={{ width: 90, height: 10 }} />
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
      </div>
      <div className="skeleton skeleton-line" style={{ width: 120, height: 28 }} />
      <div className="skeleton skeleton-line" style={{ width: 140, height: 12 }} />
    </div>
  );
}

function SkeletonChart() {
  return <div className="skeleton skeleton-chart" style={{ height: 200 }} />;
}

function SkeletonFeedItem() {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 12,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="skeleton skeleton-line" style={{ width: 70, height: 12 }} />
          <div className="skeleton skeleton-line" style={{ width: 40, height: 12 }} />
        </div>
        <div className="skeleton skeleton-line" style={{ width: 150, height: 14 }} />
        <div className="skeleton skeleton-line" style={{ width: 120, height: 12 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', width: 80 }}>
        <div className="skeleton" style={{ width: 80, height: 22, borderRadius: 999 }} />
        <div className="skeleton skeleton-line" style={{ width: 50, height: 14 }} />
        <div className="skeleton skeleton-line" style={{ width: 60, height: 12 }} />
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, subtitle, accent }) {
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
      {subtitle && <span className="stat-change" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</span>}
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
        {payload[0].value} Orders
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const loadData = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setTimeout(() => setLoading(true), 0);
    } else {
      setTimeout(() => setRefreshing(true), 0);
    }
    try {
      const [statsData, feedData] = await Promise.all([
        getPlatformStats(),
        getOrdersFeed(15)
      ]);
      setStats(statsData);
      setFeed(feedData.orders || []);
    } catch (err) {
      console.error('Admin dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(true);
    }, 0);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh feed
  useEffect(() => {
    const interval = setInterval(() => loadData(false), 20000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

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

  const getChartData = () => {
    if (!stats) return [];
    return [
      { name: 'Today', count: stats.orders_today, fill: 'var(--color-brand-500)' },
      { name: 'Last 7 Days', count: stats.orders_this_week, fill: '#8b5cf6' },
      { name: 'Last 30 Days', count: stats.orders_this_month, fill: '#10b981' }
    ];
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Command Center</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Platform-wide operations monitor, metrics aggregator, and live orders dispatcher.
          </p>
        </div>
        <button onClick={() => loadData(false)} className="btn-secondary" disabled={loading || refreshing}>
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Syncing...' : 'Sync Live Data'}
        </button>
      </div>

      {/* Stats Counters Grid */}
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
            <MetricCard icon={TrendingUp} label="Platform GMV" value={formatCurrency(stats?.total_gmv)} subtitle="Aggregated gross volume" accent="var(--color-brand-500)" />
            <MetricCard icon={PiggyBank} label="Total Savings" value={formatCurrency(stats?.total_savings)} subtitle={`${stats?.total_gmv > 0 ? ((stats.total_savings / (stats.total_gmv + stats.total_savings)) * 100).toFixed(0) : 0}% average generic savings`} accent="#10b981" />
            <MetricCard icon={Store} label="Registered Stores" value={stats?.total_stores || 0} subtitle={`${stats?.active_stores || 0} active PMBJK Kendras`} accent="#f59e0b" />
            <MetricCard icon={Users} label="Total Users" value={stats?.total_users || 0} subtitle={`${stats?.store_owners || 0} registered operators`} accent="#3b82f6" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1.8fr] gap-6">
        
        {/* Left Hand side: Distribution / Volume Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Order Volumes */}
          <div className="card">
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1.5rem' }}>Order Volume Trajectory</h3>
            {loading ? (
              <SkeletonChart />
            ) : (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      {getChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {!loading && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', fontSize: '0.8125rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-text-muted)' }}>Orders Today</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 4 }}>{stats?.orders_today || 0}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-text-muted)' }}>Weekly Volume</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 4 }}>{stats?.orders_this_week || 0}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-text-muted)' }}>Monthly Volume</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 4 }}>{stats?.orders_this_month || 0}</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.25rem' }}>Console Directory</h3>
            
            <button onClick={() => navigate('/stores')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--color-surface-700)', border: '1px solid var(--color-border)', borderRadius: 10, cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Store size={16} style={{ color: 'var(--color-brand-400)' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Manage Kendra Registry</span>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
            </button>

            <button onClick={() => navigate('/users')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--color-surface-700)', border: '1px solid var(--color-border)', borderRadius: 10, cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Users size={16} style={{ color: '#3b82f6' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>User Accounts & Roles</span>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
            </button>

            <button onClick={() => navigate('/orders')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--color-surface-700)', border: '1px solid var(--color-border)', borderRadius: 10, cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShoppingBag size={16} style={{ color: '#8b5cf6' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Global Order Operations</span>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          </div>

        </div>

        {/* Right Hand side: Real-time Live Orders feed */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 480 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Live Orders Feed</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Real-time ticket logging across all registered stores</p>
            </div>
            {!loading && (
              <span style={{
                width: 8, height: 8, background: 'var(--color-brand-500)', borderRadius: '50%',
                animation: 'pulse-dot 2s infinite'
              }} />
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '440px', paddingRight: '0.25rem' }}>
            {loading ? (
              <>
                <SkeletonFeedItem />
                <SkeletonFeedItem />
                <SkeletonFeedItem />
              </>
            ) : feed.length > 0 ? feed.map(order => (
              <div 
                key={order.id} 
                onClick={() => navigate(`/orders?search=${order.id}`)}
                style={{
                  padding: '1rem', background: 'var(--color-surface-700)', border: '1px solid var(--color-border)',
                  borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--color-brand-400)' }}>
                      {order.id.slice(0, 10)}...
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>•</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Clock size={11} /> {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {order.customer_name || 'Anonymous User'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} /> {order.store_name} ({order.store_state})
                  </p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  {getStatusBadge(order.status)}
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 4 }}>
                    {formatCurrency(order.total_generic_value)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 500 }}>
                    Saved {formatCurrency(order.savings)}
                  </span>
                </div>
              </div>
            )) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', gap: '0.5rem' }}>
                <CheckCircle2 size={36} style={{ opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>No orders today yet</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
