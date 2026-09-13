import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const PAGE_TITLES = {
  '/dashboard': 'Command Center',
  '/stores': 'Kendra Registry',
  '/users': 'User Directory',
  '/catalog': 'Catalog Metrics',
  '/orders': 'Order Operations',
  '/settings': 'Settings & Telemetry',
};

export default function TopBar({ onMenuClick }) {
  const { user } = useAuthStore();
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || '';

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
          <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: 1 }}>
            Platform Administration
          </p>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* System Status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.375rem 0.875rem', borderRadius: 999,
          background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)',
          fontSize: '0.6875rem', fontWeight: 600, color: '#10b981',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: '#10b981',
            boxShadow: '0 0 6px rgba(16, 185, 129, 0.5)',
            animation: 'pulse-dot 3s ease infinite',
          }} />
          <span className="max-md:hidden">Systems OK</span>
        </div>

        {user && (
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8125rem', fontWeight: 700, color: 'white',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)',
          }}>
            {user.email?.charAt(0)?.toUpperCase() || 'A'}
          </div>
        )}
      </div>
    </header>
  );
}
