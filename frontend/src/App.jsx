// ============================================================
// App.jsx — Master Router + Mobile Bottom Navigation
// SPA Architecture with all routes and cart badge
// ============================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, Home as HomeIcon, MapPin, BarChart3, User } from 'lucide-react';
import useCartStore from './store/cartStore';

import Home from './pages/Home';
import Auth from './pages/Auth';
import Discovery from './pages/Discovery';
import ProductDetail from './pages/ProductDetail';
import Fulfillment from './pages/Fulfillment';
import Dashboard from './pages/Dashboard';
import Wellness from './pages/Wellness';
import Checkout from './pages/Checkout';

// ---- Desktop Navbar ----
const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const itemCount = useCartStore(s => s.items.reduce((sum, i) => sum + i.quantity, 0));

  const navLinks = [
    { href: '/discovery', label: 'Find Generics' },
    { href: '/dashboard', label: 'Compare Prices' },
    { href: '/fulfillment', label: 'Store Locator' },
    { href: '/wellness', label: 'My Health' },
  ];

  return (
    <nav className="bg-surface-lowest sticky top-0 z-50 border-b border-outline-variant">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 md:h-20 items-center">
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/home')}>
            <span className="font-display font-extrabold text-xl md:text-2xl tracking-tight text-primary">JanAushadhi</span>
          </div>

          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-on-surface/80">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); navigate(link.href); }}
                className={`hover:text-primary transition-colors ${
                  path === link.href ? 'text-primary border-b-2 border-primary py-7 font-semibold' : ''
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button className="text-on-surface/70 hover:text-primary hidden md:block transition-colors" onClick={() => navigate('/discovery')}>
              <Search className="w-5 h-5" />
            </button>

            <button onClick={() => navigate('/checkout')} className="relative text-on-surface/70 hover:text-primary transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-sm flex items-center justify-center animate-pulse">
                  {itemCount}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate('/auth')}
              className="hidden md:block btn-primary py-2 px-5 text-sm"
            >
              Account
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

// ---- Mobile Bottom Navigation ----
const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const itemCount = useCartStore(s => s.items.reduce((sum, i) => sum + i.quantity, 0));

  const tabs = [
    { href: '/home', icon: HomeIcon, label: 'Home' },
    { href: '/discovery', icon: Search, label: 'Search' },
    { href: '/fulfillment', icon: MapPin, label: 'Stores' },
    { href: '/dashboard', icon: BarChart3, label: 'Savings' },
    { href: '/wellness', icon: User, label: 'Profile' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-lowest border-t border-outline-variant z-50 safe-area-pb">
      <div className="flex justify-around items-center h-16">
        {tabs.map(tab => {
          const active = path === tab.href;
          const Icon = tab.icon;
          return (
            <button
              key={tab.href}
              onClick={() => navigate(tab.href)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 relative transition-colors ${
                active ? 'text-primary' : 'text-on-surface/50 hover:text-on-surface/80'
              }`}
            >
              {active && <div className="absolute -top-0.5 w-8 h-0.5 bg-primary rounded-full" />}
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          );
        })}
        {/* Cart floating badge on mobile */}
        {itemCount > 0 && (
          <button
            onClick={() => navigate('/checkout')}
            className="absolute -top-6 right-4 btn-primary w-12 h-12 flex items-center justify-center border-4 border-surface-lowest rounded-md clinical-shadow"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 bg-on-surface text-white text-[9px] font-bold w-5 h-5 rounded-sm flex items-center justify-center">{itemCount}</span>
          </button>
        )}
      </div>
    </div>
  );
};

// ---- Footer ----
const Footer = () => (
  <footer className="bg-surface-low border-t border-outline-variant mt-auto hidden md:block">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row justify-between items-start gap-6">
      <div>
        <div className="font-display font-bold text-lg text-on-surface mb-2">JanAushadhi</div>
        <p className="text-xs text-on-surface/60 max-w-md leading-relaxed">
          © 2024 JanAushadhi. All pharmaceutical care provided by licensed practitioners. Medicines dispensed are regulated by federal safety protocols.
        </p>
      </div>
      <div className="flex gap-8 text-sm text-primary font-medium">
        <a href="#" className="hover:underline">Privacy Policy</a>
        <a href="#" className="hover:underline">Terms of Service</a>
        <a href="#" className="hover:underline">Pharmacy Licensing</a>
        <a href="#" className="hover:underline">Contact Support</a>
      </div>
    </div>
  </footer>
);

// ---- Layout Wrapper ----
const PageLayout = ({ children }) => (
  <>
    <Navbar />
    {children}
    <Footer />
    <MobileBottomNav />
  </>
);

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<PageLayout><Home /></PageLayout>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/discovery" element={<PageLayout><Discovery /></PageLayout>} />
          <Route path="/product/:id" element={<PageLayout><ProductDetail /></PageLayout>} />
          <Route path="/fulfillment" element={<PageLayout><Fulfillment /></PageLayout>} />
          <Route path="/dashboard" element={<PageLayout><Dashboard /></PageLayout>} />
          <Route path="/wellness" element={<PageLayout><Wellness /></PageLayout>} />
          <Route path="/checkout" element={<PageLayout><Checkout /></PageLayout>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
