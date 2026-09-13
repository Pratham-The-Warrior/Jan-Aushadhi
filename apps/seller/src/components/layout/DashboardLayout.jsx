import { Suspense, lazy, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Loader from './Loader';

// Lazy-loaded pages
const Dashboard = lazy(() => import('../../pages/Dashboard'));
const Orders = lazy(() => import('../../pages/Orders'));
const Inventory = lazy(() => import('../../pages/Inventory'));
const StoreProfile = lazy(() => import('../../pages/StoreProfile'));
const Reports = lazy(() => import('../../pages/Reports'));

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

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div
        style={{ marginLeft: 260, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
        className="max-lg:ml-0!"
      >
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
