// ============================================================
// Admin Console — App Entry point & Router  (v2 — Polished UI)
// Setup sidebar layout, navigation links, and auth role gates.
// ============================================================

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Store, Users, Database, ShoppingBag, Settings, LogOut, Menu, X, ShieldAlert, Shield
} from 'lucide-react';
import useAuthStore from './store/authStore';

// Lazy-loaded pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Stores = lazy(() => import('./pages/Stores'));
const UsersPage = lazy(() => import('./pages/Users'));
const Catalog = lazy(() => import('./pages/Catalog'));
const Orders = lazy(() => import('./pages/Orders'));
const SettingsPage = lazy(() => import('./pages/Settings'));

// Page transition animations
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

function PageWrap({ children }) {
  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} className="flex-1 flex flex-col">
      {children}
    </motion.div>
  );
}

// Full page loader spinner
function Loader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-surface-900)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 16,
          background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse-dot 2s ease infinite',
        }}>
          <Shield size={24} color="white" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--color-text-primary)', fontSize: '0.9375rem', fontWeight: 600 }}>Admin Console</span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>Verifying environment...</span>
        </div>
        <div style={{ width: 120, height: 3, background: 'var(--color-surface-700)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            width: '40%', height: '100%',
            background: 'linear-gradient(90deg, var(--color-brand-500), var(--color-brand-400))',
            borderRadius: 4, animation: 'shimmer 1.5s ease-in-out infinite',
            backgroundSize: '200% 100%',
          }} />
        </div>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Command Center' },
  { to: '/stores', icon: Store, label: 'Kendra Registry' },
  { to: '/users', icon: Users, label: 'User Directory' },
  { to: '/catalog', icon: Database, label: 'Catalog Metrics' },
  { to: '/orders', icon: ShoppingBag, label: 'Order Operations' },
  { to: '/settings', icon: Settings, label: 'Settings & Telemetry' },
];

const PAGE_TITLES = {
  '/dashboard': 'Command Center',
  '/stores': 'Kendra Registry',
  '/users': 'User Directory',
  '/catalog': 'Catalog Metrics',
  '/orders': 'Order Operations',
  '/settings': 'Settings & Telemetry',
};

function Sidebar({ mobileOpen, onClose }) {
  const { logout, user } = useAuthStore();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose}
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

function TopBar({ onMenuClick }) {
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

// Main Sidebar Layout wrapper
function ConsoleLayout() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-h-screen ml-[260px] max-lg:ml-0">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          <Suspense fallback={<Loader />}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/dashboard" element={<PageWrap><Dashboard /></PageWrap>} />
                <Route path="/stores" element={<PageWrap><Stores /></PageWrap>} />
                <Route path="/users" element={<PageWrap><UsersPage /></PageWrap>} />
                <Route path="/catalog" element={<PageWrap><Catalog /></PageWrap>} />
                <Route path="/orders" element={<PageWrap><Orders /></PageWrap>} />
                <Route path="/settings" element={<PageWrap><SettingsPage /></PageWrap>} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

// Access denied layout for users who are not SUPER_ADMIN
function AccessDenied() {
  const { logout, roleError } = useAuthStore();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', gap: '1.5rem', padding: '2rem', textAlign: 'center',
      background: 'var(--color-surface-900)',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 20,
        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <ShieldAlert size={40} style={{ color: 'var(--color-danger-500)' }} />
      </div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>Access Denied</h1>
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: 400, lineHeight: 1.6, fontSize: '0.9375rem' }}>
        {roleError || 'Your account is not registered as a Super Administrator. This console is restricted.'}
      </p>
      <button onClick={logout} className="btn-secondary" style={{ marginTop: '0.5rem' }}>
        <LogOut size={16} /> Try Another Account
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
        <ConsoleLayout />
      )}
    </BrowserRouter>
  );
}
