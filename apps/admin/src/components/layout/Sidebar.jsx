import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Store, Users, Database, ShoppingBag, Settings, LogOut, X, Shield,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Command Center' },
  { to: '/stores', icon: Store, label: 'Kendra Registry' },
  { to: '/users', icon: Users, label: 'User Directory' },
  { to: '/catalog', icon: Database, label: 'Catalog Metrics' },
  { to: '/orders', icon: ShoppingBag, label: 'Order Operations' },
  { to: '/settings', icon: Settings, label: 'Settings & Telemetry' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { logout, user } = useAuthStore();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          style={{ backdropFilter: 'blur(4px)', animation: 'fadeIn 0.15s ease forwards' }}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? '!flex' : ''}`} style={mobileOpen ? { display: 'flex' } : undefined}>
        {/* Logo */}
        <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
              }}>
                <Shield size={18} color="white" />
              </div>
              <div>
                <h1 style={{ fontSize: '1rem', fontWeight: 800 }} className="text-gradient">
                  Admin Console
                </h1>
                <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: 1, letterSpacing: '0.02em' }}>
                  Jan Aushadhi Operations
                </p>
              </div>
            </div>
            <button onClick={onClose} className="btn-icon lg:hidden" aria-label="Close menu">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* User profile details */}
        {user && (
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'rgba(99, 102, 241, 0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--color-surface-700)', border: '1px solid var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-brand-400)',
              }}>
                {user.email?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Super Administrator
                </p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: 1, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email || user.phoneNumber || 'Internal Staff'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Sign Out */}
        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--color-border)' }}>
          <button onClick={logout} className="sidebar-link" style={{ width: '100%', color: 'var(--color-danger-500)', margin: 0 }}>
            <LogOut size={18} />
            Exit Console
          </button>
          <p style={{ fontSize: '0.625rem', color: 'var(--color-surface-500)', textAlign: 'center', marginTop: '0.75rem', letterSpacing: '0.03em' }}>
            Powered by Jan Aushadhi
          </p>
        </div>
      </aside>
    </>
  );
}
