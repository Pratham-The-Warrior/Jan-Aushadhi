import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { getOrders } from '../../services/seller.api';

/** New orders waiting for this Kendra to accept, refreshed every minute. */
function usePendingCount(enabled) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    const load = () => getOrders({ status: 'PENDING_ACCEPTANCE', limit: 1 })
      .then((d) => { if (alive) setCount(d?.count || 0); })
      .catch(() => {});
    load();
    const timer = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(timer); };
  }, [enabled]);
  return count;
}

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/orders': 'Orders',
  '/inventory': 'Inventory',
  '/store': 'Store Profile',
  '/reports': 'Reports & Analytics',
};

export default function TopBar({ onMenuClick }) {
  const { sellerProfile } = useAuthStore();
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || '';
  const pending = usePendingCount(Boolean(sellerProfile));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header style={{
      height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1.5rem', background: 'var(--color-surface-800)', borderBottom: '1px solid var(--color-border)',
      position: 'sticky', top: 0, zIndex: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={onMenuClick} className="btn-icon lg:hidden" aria-label="Open menu">
          <Menu size={20} />
        </button>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {pageTitle}
          </h2>
          {sellerProfile && (
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: 1 }}>
              {getGreeting()}, {sellerProfile.name?.split(' ')[0] || 'Operator'}
            </p>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link
          to="/orders"
          className="btn-icon"
          aria-label={pending ? `${pending} new order${pending === 1 ? '' : 's'} waiting` : 'No new orders'}
          title={pending ? `${pending} new order${pending === 1 ? '' : 's'} waiting` : 'No new orders'}
          style={{ position: 'relative' }}
        >
          <Bell size={18} />
          {pending > 0 && (
            <span style={{
              position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, padding: '0 4px',
              background: 'var(--color-brand-500)', borderRadius: 999, color: 'white',
              fontSize: '0.6875rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--color-surface-800)',
            }}>
              {pending > 99 ? '99+' : pending}
            </span>
          )}
        </Link>
        {sellerProfile && (
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8125rem', fontWeight: 700, color: 'white',
            boxShadow: '0 2px 8px rgba(17, 135, 138, 0.2)',
          }}>
            {sellerProfile.name?.charAt(0)?.toUpperCase() || 'S'}
          </div>
        )}
      </div>
    </header>
  );
}
