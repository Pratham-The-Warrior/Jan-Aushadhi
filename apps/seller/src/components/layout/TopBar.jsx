import { useLocation } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import useAuthStore from '../../store/authStore';

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
        <button className="btn-icon" aria-label="Notifications" style={{ position: 'relative' }}>
          <Bell size={18} />
          <span style={{
            position: 'absolute', top: -2, right: -2, width: 8, height: 8,
            background: 'var(--color-brand-500)', borderRadius: '50%',
            border: '2px solid var(--color-surface-800)',
            animation: 'pulse-dot 2s ease infinite',
          }} />
        </button>
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
