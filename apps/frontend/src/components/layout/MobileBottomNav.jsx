// ============================================================
// MobileBottomNav — Mobile tab bar with auth-aware Profile/Sign In
// ============================================================

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Search, MapPin, User, LogIn, ShoppingCart } from 'lucide-react';
import useCartStore, { selectItemCount } from '../../store/cartStore';
import useAuthStore from '../../store/authStore';

const TABS_LOGGED_IN = [
  { href: '/home', icon: HomeIcon, label: 'Home' },
  { href: '/discovery', icon: Search, label: 'Search' },
  { href: '/fulfillment', icon: MapPin, label: 'Stores' },
  { href: '/checkout', icon: ShoppingCart, label: 'Cart', cart: true },
  { href: '/account', icon: User, label: 'Account' },
];

const TABS_LOGGED_OUT = [
  { href: '/home', icon: HomeIcon, label: 'Home' },
  { href: '/discovery', icon: Search, label: 'Search' },
  { href: '/fulfillment', icon: MapPin, label: 'Stores' },
  { href: '/checkout', icon: ShoppingCart, label: 'Cart', cart: true },
  { href: '/auth', icon: LogIn, label: 'Sign in' },
];

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const itemCount = useCartStore(selectItemCount);
  const { user, initialized } = useAuthStore();

  const tabs = (initialized && user) ? TABS_LOGGED_IN : TABS_LOGGED_OUT;

  return (
    <nav aria-label="Mobile" className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-lowest border-t border-outline-variant z-50 safe-area-pb">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
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
                  : 'text-on-surface/70 hover:text-on-surface/80'
              }`}
            >
              {active && <div className="absolute -top-0.5 w-8 h-0.5 bg-primary rounded-full" />}
              <span className="relative">
                <Icon className="w-5 h-5" />
                {tab.cart && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-primary text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-semibold">{tab.label}</span>
            </button>
          );
        })}

      </div>
    </nav>
  );
}
