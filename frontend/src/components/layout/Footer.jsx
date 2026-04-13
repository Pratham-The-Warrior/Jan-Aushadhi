// ============================================================
// Footer — Desktop site footer
// ============================================================

import React from 'react';

const FOOTER_LINKS = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Pharmacy Licensing', href: '#' },
  { label: 'Contact Support', href: '#' },
];

export default function Footer() {
  return (
    <footer className="bg-surface-low border-t border-outline-variant mt-auto hidden md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <div className="font-display font-bold text-lg text-on-surface mb-2">JanAushadhi</div>
          <p className="text-xs text-on-surface/60 max-w-md leading-relaxed">
            © {new Date().getFullYear()} JanAushadhi. All pharmaceutical care provided by licensed
            practitioners. Medicines dispensed are regulated by federal safety protocols.
          </p>
        </div>
        <div className="flex gap-8 text-sm text-primary font-medium">
          {FOOTER_LINKS.map((link) => (
            <a key={link.label} href={link.href} className="hover:underline">
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
