// ============================================================
// Navbar — Desktop Navigation (Auth-Aware)
// Dynamically renders Sign In / Profile+Logout based on auth state
// ============================================================

import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Logo from '../common/Logo';
import { Search, ShoppingCart, User } from 'lucide-react';
import useCartStore, { selectItemCount } from '../../store/cartStore';
import useAuthStore from '../../store/authStore';

const NAV_LINKS = [
  { href: '/discovery', label: 'Find Generics' },
  { href: '/prescription', label: 'Prescription Check' },
  { href: '/fulfillment', label: 'Find a Kendra' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const itemCount = useCartStore(selectItemCount);
  const { user, initialized } = useAuthStore();

  return (
    <nav aria-label="Main" className="bg-surface-lowest/95 backdrop-blur sticky top-0 z-50 border-b border-outline-variant">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 md:h-20 items-center">
          {/* Brand */}
          <Link to="/home" className="flex items-center rounded-lg" aria-label="JanAushadhi home">
            <Logo size={32} />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-10 h-full text-[15px] font-semibold text-on-surface/70">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative h-full flex items-center transition-colors group ${
                    isActive ? 'text-primary' : 'hover:text-on-surface'
                  }`}
                >
                  {link.label}
                  {/* Premium animated bottom border */}
                  <div className={`absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full transition-all duration-300 ${
                    isActive ? 'bg-primary scale-x-100 opacity-100' : 'bg-on-surface/20 scale-x-0 opacity-0 group-hover:scale-x-50 group-hover:opacity-100'
                  }`} />
                </Link>
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
                <span className="absolute -top-2 -right-2.5 bg-primary text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Auth-aware buttons */}
            {initialized && user ? (
              <>
                <button
                  onClick={() => navigate('/account')}
                  className={`hidden md:flex items-center gap-2 btn-secondary py-2 px-4 text-sm ${pathname === '/account' ? 'border-primary' : ''}`}
                  aria-label="Go to your account"
                >
                  <User className="w-4 h-4" />
                  {user.displayName ? user.displayName.split(' ')[0] : 'Account'}
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
