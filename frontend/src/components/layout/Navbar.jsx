// ============================================================
// Navbar — Desktop Navigation (Auth-Aware)
// Dynamically renders Sign In / Profile+Logout based on auth state
// ============================================================

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, LogOut, User } from 'lucide-react';
import useCartStore, { selectItemCount } from '../../store/cartStore';
import useAuthStore from '../../store/authStore';

const NAV_LINKS = [
  { href: '/discovery', label: 'Find Generics' },
  { href: '/dashboard', label: 'Compare Prices' },
  { href: '/fulfillment', label: 'Store Locator' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const itemCount = useCartStore(selectItemCount);
  const { user, initialized, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/home', { replace: true });
  };

  return (
    <nav className="bg-surface-lowest sticky top-0 z-50 border-b border-outline-variant">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 md:h-20 items-center">
          {/* Brand */}
          <div
            className="flex items-center cursor-pointer"
            onClick={() => navigate('/home')}
            role="button"
            aria-label="Go to homepage"
          >
            <span className="font-display font-extrabold text-xl md:text-2xl tracking-tight text-primary">
              JanAushadhi
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-10 h-full text-[15px] font-semibold text-on-surface/70">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(link.href);
                  }}
                  className={`relative h-full flex items-center transition-colors group ${
                    isActive ? 'text-primary' : 'hover:text-on-surface'
                  }`}
                >
                  {link.label}
                  {/* Premium animated bottom border */}
                  <div className={`absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full transition-all duration-300 ${
                    isActive ? 'bg-primary scale-x-100 opacity-100' : 'bg-on-surface/20 scale-x-0 opacity-0 group-hover:scale-x-50 group-hover:opacity-100'
                  }`} />
                </a>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-5 md:gap-6 h-full">
            <button
              className="text-on-surface/70 hover:text-primary hidden md:block transition-colors"
              onClick={() => navigate('/discovery')}
              aria-label="Search medicines"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              onClick={() => navigate('/checkout')}
              className="relative text-on-surface/70 hover:text-primary transition-colors"
              aria-label={`Cart with ${itemCount} items`}
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-sm flex items-center justify-center animate-pulse">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Auth-aware buttons */}
            {initialized && user ? (
              <>
                <button
                  onClick={() => navigate('/wellness')}
                  className="hidden md:flex items-center gap-2 btn-secondary py-2 px-4 text-sm"
                  aria-label="Go to profile"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="hidden md:flex items-center gap-2 text-sm font-semibold text-on-surface/60 hover:text-red-600 transition-colors py-2 px-3"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="hidden md:block btn-primary py-2 px-5 text-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
