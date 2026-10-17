// ============================================================
// Footer — Desktop site footer
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../common/Logo';

const FOOTER_LINKS = [
  { label: 'About', href: '/info/about' },
  { label: 'Privacy', href: '/info/privacy' },
  { label: 'Terms', href: '/info/terms' },
  { label: 'Find a Kendra', href: '/fulfillment' },
];

export default function Footer() {
  return (
    <footer className="bg-surface-low border-t border-outline-variant mt-auto hidden md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <Logo size={26} className="mb-3" />
          <p className="text-xs text-on-surface/70 max-w-md leading-relaxed">
            © {new Date().getFullYear()} JanAushadhi. An independent service — not affiliated with the
            Government of India or PMBI. Medicines are dispensed by registered pharmacists at Jan Aushadhi Kendras.
            Always consult your doctor before switching medicines.
          </p>
        </div>
        <div className="flex gap-8 text-sm text-primary font-medium">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.label} to={link.href} className="hover:underline">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
