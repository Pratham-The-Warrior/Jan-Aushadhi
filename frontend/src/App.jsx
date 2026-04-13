// ============================================================
// App.jsx — Application Router
// Clean entry point: layout, routing, error boundary, lazy loading
// ============================================================

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PageLayout from './components/layout/PageLayout';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';

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
    <Suspense fallback={<LoadingSpinner fullPage label="Loading..." />}>
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

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />

          <Route path="/home" element={<AppRoute><Home /></AppRoute>} />
          <Route path="/discovery" element={<AppRoute><Discovery /></AppRoute>} />
          <Route path="/product/:id" element={<AppRoute><ProductDetail /></AppRoute>} />
          <Route path="/fulfillment" element={<AppRoute><Fulfillment /></AppRoute>} />
          <Route path="/dashboard" element={<AppRoute><Dashboard /></AppRoute>} />
          <Route path="/wellness" element={<AppRoute><Wellness /></AppRoute>} />
          <Route path="/checkout" element={<AppRoute><Checkout /></AppRoute>} />

          {/* Auth page — no layout wrapper (standalone full-screen) */}
          <Route
            path="/auth"
            element={
              <ErrorBoundary>
                <LazyPage><Auth /></LazyPage>
              </ErrorBoundary>
            }
          />

          {/* 404 Catch-all */}
          <Route path="*" element={<AppRoute><NotFound /></AppRoute>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
