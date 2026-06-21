// ============================================================
// App.jsx — Application Router
// Clean entry point: layout, routing, error boundary, lazy loading
// ============================================================

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Wellness = lazy(() => import('./pages/Wellness'));
const Checkout = lazy(() => import('./pages/Checkout'));
const NotFound = lazy(() => import('./pages/NotFound'));

/** Suspense wrapper for lazy-loaded routes */
function LazyPage({ children }) {
  return (
    <Suspense fallback={<div className="flex-1 w-full bg-surface" />}>
      {children}
    </Suspense>
  );
}

/** Route wrapped with layout + error boundary + suspense */
function AppRoute({ children }) {
  return (
    <PageLayout>
      <ErrorBoundary>
        <LazyPage>{children}</LazyPage>
      </ErrorBoundary>
    </PageLayout>
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
    return <Navigate to="/wellness" replace />;
  }

  return children;
}

// Global page animation config
const pageVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -15, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }
};

function PageTransition({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="flex-1 flex flex-col min-h-full"
    >
      {children}
    </motion.div>
  );
}

function RootLayout() {
  const location = useLocation();
  // Don't show layout on auth page
  const isAuthPage = location.pathname.startsWith('/auth');

  return (
    <>
      {!isAuthPage && <Navbar />}
      
      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Navigate to="/home" replace />} />

            <Route path="/home" element={<ErrorBoundary><LazyPage><PageTransition><Home /></PageTransition></LazyPage></ErrorBoundary>} />
            <Route path="/discovery" element={<ErrorBoundary><LazyPage><PageTransition><Discovery /></PageTransition></LazyPage></ErrorBoundary>} />
            <Route path="/product/:id" element={<ErrorBoundary><LazyPage><PageTransition><ProductDetail /></PageTransition></LazyPage></ErrorBoundary>} />
            <Route path="/fulfillment" element={<ErrorBoundary><LazyPage><PageTransition><Fulfillment /></PageTransition></LazyPage></ErrorBoundary>} />
            <Route path="/checkout" element={<ErrorBoundary><LazyPage><PageTransition><Checkout /></PageTransition></LazyPage></ErrorBoundary>} />
            
            <Route path="/dashboard" element={<ProtectedRoute><ErrorBoundary><LazyPage><PageTransition><Dashboard /></PageTransition></LazyPage></ErrorBoundary></ProtectedRoute>} />
            <Route path="/wellness" element={<ProtectedRoute><ErrorBoundary><LazyPage><PageTransition><Wellness /></PageTransition></LazyPage></ErrorBoundary></ProtectedRoute>} />

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
        </AnimatePresence>
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
