// ============================================================
// Admin Console — App Entry point & Router
// Clean high-level console routing and role security gate.
// ============================================================

import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Loader from './components/layout/Loader';
import AccessDenied from './components/layout/AccessDenied';
import ConsoleLayout from './components/layout/ConsoleLayout';

const Login = lazy(() => import('./pages/Login'));

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
