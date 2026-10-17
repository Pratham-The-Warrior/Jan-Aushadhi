// ============================================================
// App.jsx — Application Router
// Clean entry point: layout, routing, error boundary, lazy loading
// ============================================================

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import MobileBottomNav from './components/layout/MobileBottomNav';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import ToastContainer from './components/common/ToastContainer';
import useAuthStore from './store/authStore';

// ---- Lazy-loaded Pages (code splitting) ----
const Home = lazy(() => import('./pages/Home'));
const Auth = lazy(() => import('./pages/Auth'));
const Discovery = lazy(() => import('./pages/Discovery'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Fulfillment = lazy(() => import('./pages/Fulfillment'));
const Account = lazy(() => import('./pages/Account'));
const Checkout = lazy(() => import('./pages/Checkout'));
const NotFound = lazy(() => import('./pages/NotFound'));
const InfoPage = lazy(() => import('./pages/InfoPage'));
const Prescription = lazy(() => import('./pages/Prescription'));

/** Suspense wrapper for lazy-loaded routes */
function LazyPage({ children }) {
  return (
    <Suspense fallback={<div className="flex-1 w-full bg-surface" />}>
      {children}
    </Suspense>
  );
}

/** Route guard to prevent access to unauthenticated users */
function ProtectedRoute({ children }) {
  const { user, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized) {
    return <LoadingSpinner fullPage label="Authenticating..." />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  return children;
}

/** Route guard to prevent authenticated users from accessing guest-only pages (e.g. /auth) */
function GuestRoute({ children }) {
  const { user, initialized } = useAuthStore();

  if (!initialized) {
    return <LoadingSpinner fullPage label="Authenticating..." />;
  }

  if (user) {
    return <Navigate to="/account" replace />;
  }

  return children;
}

/** Fade each page in on navigation (CSS only; no exit delay between pages). */
function PageTransition({ children }) {
  return <div className="flex-1 flex flex-col min-h-full animate-pageIn">{children}</div>;
}

function RootLayout() {
  const location = useLocation();
  // Don't show layout on auth page
  const isAuthPage = location.pathname.startsWith('/auth');

  return (
    <>
      <a href="#main" className="skip-link">Skip to main content</a>
      {!isAuthPage && <Navbar />}

      <main id="main" tabIndex={-1} className="flex-1 flex flex-col outline-none">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Navigate to="/home" replace />} />

            <Route path="/home" element={<ErrorBoundary><LazyPage><PageTransition><Home /></PageTransition></LazyPage></ErrorBoundary>} />
            <Route path="/discovery" element={<ErrorBoundary><LazyPage><PageTransition><Discovery /></PageTransition></LazyPage></ErrorBoundary>} />
            <Route path="/product/:id" element={<ErrorBoundary><LazyPage><PageTransition><ProductDetail /></PageTransition></LazyPage></ErrorBoundary>} />
            <Route path="/fulfillment" element={<ErrorBoundary><LazyPage><PageTransition><Fulfillment /></PageTransition></LazyPage></ErrorBoundary>} />
            <Route path="/prescription" element={<ErrorBoundary><LazyPage><PageTransition><Prescription /></PageTransition></LazyPage></ErrorBoundary>} />
            <Route path="/info/:page" element={<ErrorBoundary><LazyPage><PageTransition><InfoPage /></PageTransition></LazyPage></ErrorBoundary>} />
            <Route path="/checkout" element={<ErrorBoundary><LazyPage><PageTransition><Checkout /></PageTransition></LazyPage></ErrorBoundary>} />
            
            <Route path="/account" element={<ProtectedRoute><ErrorBoundary><LazyPage><PageTransition><Account /></PageTransition></LazyPage></ErrorBoundary></ProtectedRoute>} />
            {/* Old profile URLs */}
            <Route path="/wellness" element={<Navigate to="/account" replace />} />
            <Route path="/dashboard" element={<Navigate to="/account?tab=savings" replace />} />

            <Route
              path="/auth"
              element={
                <GuestRoute>
                  <ErrorBoundary>
                    <LazyPage><PageTransition><Auth /></PageTransition></LazyPage>
                  </ErrorBoundary>
                </GuestRoute>
              }
            />

            <Route path="*" element={<ErrorBoundary><LazyPage><PageTransition><NotFound /></PageTransition></LazyPage></ErrorBoundary>} />
          </Routes>
      </main>

      {!isAuthPage && <Footer />}
      {!isAuthPage && <MobileBottomNav />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col pb-16 md:pb-0">
        <RootLayout />
      </div>
      <ToastContainer />
    </BrowserRouter>
  );
}
