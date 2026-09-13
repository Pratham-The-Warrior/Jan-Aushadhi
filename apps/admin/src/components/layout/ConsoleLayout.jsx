import { Suspense, lazy, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Loader from './Loader';

// Lazy-loaded pages
const Dashboard = lazy(() => import('../../pages/Dashboard'));
const Stores = lazy(() => import('../../pages/Stores'));
const UsersPage = lazy(() => import('../../pages/Users'));
const Catalog = lazy(() => import('../../pages/Catalog'));
const Orders = lazy(() => import('../../pages/Orders'));
const SettingsPage = lazy(() => import('../../pages/Settings'));

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

export default function ConsoleLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
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
