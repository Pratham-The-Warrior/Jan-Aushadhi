// ============================================================
// Navbar — Desktop Navigation
// Extracted from App.jsx for clean separation of concerns
// ============================================================

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingCart } from 'lucide-react';
import useCartStore from '../../store/cartStore';

const NAV_LINKS = [
  { href: '/discovery', label: 'Find Generics' },
  { href: '/dashboard', label: 'Compare Prices' },
  { href: '/fulfillment', label: 'Store Locator' },
  { href: '/wellness', label: 'My Health' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));

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
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-on-surface/80">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(link.href);
                }}
                className={`hover:text-primary transition-colors ${
                  pathname === link.href
                    ? 'text-primary border-b-2 border-primary py-7 font-semibold'
                    : ''
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
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
}
