// ============================================================
// MobileBottomNav — Mobile tab bar with floating cart badge
// ============================================================

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Search, MapPin, BarChart3, User, ShoppingCart } from 'lucide-react';
import useCartStore from '../../store/cartStore';

const TABS = [
  { href: '/home', icon: HomeIcon, label: 'Home' },
  { href: '/discovery', icon: Search, label: 'Search' },
  { href: '/fulfillment', icon: MapPin, label: 'Stores' },
  { href: '/dashboard', icon: BarChart3, label: 'Savings' },
  { href: '/wellness', icon: User, label: 'Profile' },
];

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-lowest border-t border-outline-variant z-50 safe-area-pb">
      <div className="flex justify-around items-center h-16">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <button
              key={tab.href}
              onClick={() => navigate(tab.href)}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 relative transition-colors ${
                active
                  ? 'text-primary'
                  : 'text-on-surface/50 hover:text-on-surface/80'
              }`}
            >
              {active && <div className="absolute -top-0.5 w-8 h-0.5 bg-primary rounded-full" />}
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          );
        })}

        {/* Floating cart badge */}
        {itemCount > 0 && (
          <button
            onClick={() => navigate('/checkout')}
            aria-label={`Cart with ${itemCount} items`}
            className="absolute -top-6 right-4 btn-primary w-12 h-12 flex items-center justify-center border-4 border-surface-lowest rounded-md clinical-shadow"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 bg-on-surface text-white text-[9px] font-bold w-5 h-5 rounded-sm flex items-center justify-center">
              {itemCount}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
