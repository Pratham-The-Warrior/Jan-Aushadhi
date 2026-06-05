// ============================================================
// Seller Central — App Router
// Sidebar layout + protected routing + role gating
// ============================================================

import { Suspense, lazy, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, Package, Store, BarChart3, LogOut, Menu, X, Bell
} from 'lucide-react';
import useAuthStore from './store/authStore';

// Lazy-loaded pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Orders = lazy(() => import('./pages/Orders'));
const Inventory = lazy(() => import('./pages/Inventory'));
const StoreProfile = lazy(() => import('./pages/StoreProfile'));
const Reports = lazy(() => import('./pages/Reports'));

// Page transition animation
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

function PageWrap({ children }) {
  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} className="flex-1 flex flex-col">
      {children}
    </motion.div>
  );
}

// Loading fallback
function Loader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-surface-900)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-surface-600)', borderTopColor: 'var(--color-brand-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading...</span>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

// Sidebar navigation
const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/store', icon: Store, label: 'Store Profile' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

function Sidebar({ mobileOpen, onClose }) {
  const { sellerProfile, logout } = useAuthStore();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`sidebar ${mobileOpen ? '!flex' : ''}`} style={mobileOpen ? { display: 'flex' } : undefined}>
        {/* Logo */}
        <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-brand-400)' }}>
                Seller Central
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                Jan Aushadhi Kendra
              </p>
            </div>
            <button onClick={onClose} className="btn-icon lg:hidden" aria-label="Close menu">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Store Info */}
        {sellerProfile && (
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {sellerProfile.name}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
              {sellerProfile.pmbjk_code} • {sellerProfile.district}
            </p>
          </div>
        )}

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
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

        {/* Logout */}
        <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid var(--color-border)' }}>
          <button onClick={logout} className="sidebar-link" style={{ width: '100%', color: 'var(--color-danger-500)' }}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

function TopBar({ onMenuClick }) {
  const { sellerProfile } = useAuthStore();

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
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {/* Page title could go here */}
        </h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button className="btn-icon" aria-label="Notifications" style={{ position: 'relative' }}>
          <Bell size={18} />
          <span style={{
            position: 'absolute', top: -2, right: -2, width: 8, height: 8,
            background: 'var(--color-brand-500)', borderRadius: '50%',
            animation: 'pulse-dot 2s ease infinite',
          }} />
        </button>
        {sellerProfile && (
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.875rem', fontWeight: 700, color: 'white',
          }}>
            {sellerProfile.name?.charAt(0)?.toUpperCase() || 'S'}
          </div>
        )}
      </div>
    </header>
  );
}

// Layout with sidebar
function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div style={{ marginLeft: 260, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
        className="max-lg:!ml-0">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          <Suspense fallback={<Loader />}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/dashboard" element={<PageWrap><Dashboard /></PageWrap>} />
                <Route path="/orders" element={<PageWrap><Orders /></PageWrap>} />
                <Route path="/inventory" element={<PageWrap><Inventory /></PageWrap>} />
                <Route path="/store" element={<PageWrap><StoreProfile /></PageWrap>} />
                <Route path="/reports" element={<PageWrap><Reports /></PageWrap>} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

// Access denied screen for non-STORE_OWNER users
function AccessDenied() {
  const { logout, roleError } = useAuthStore();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', gap: '1.5rem', padding: '2rem', textAlign: 'center',
      background: 'var(--color-surface-900)',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <X size={40} style={{ color: 'var(--color-danger-500)' }} />
      </div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Access Denied</h1>
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: 400, lineHeight: 1.6 }}>
        {roleError || 'Your account is not registered as a Jan Aushadhi Kendra operator. Please contact the platform administrator to link your account to a store.'}
      </p>
      <button onClick={logout} className="btn-secondary" style={{ marginTop: '0.5rem' }}>
        <LogOut size={16} /> Sign Out & Try Another Account
      </button>
    </div>
  );
}

export default function App() {
  const { user, initialized, loading, roleError } = useAuthStore();

  if (!initialized || loading) return <Loader />;

  return (
    <BrowserRouter>
      {!user ? (
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="*" element={<Login />} />
          </Routes>
        </Suspense>
      ) : roleError ? (
        <AccessDenied />
      ) : (
        <DashboardLayout />
      )}
    </BrowserRouter>
  );
}
