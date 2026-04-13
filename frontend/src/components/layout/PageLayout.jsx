// ============================================================
// PageLayout — Shared layout wrapper for all authenticated pages
// Composes Navbar + Footer + MobileBottomNav
// ============================================================

import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';

export default function PageLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <MobileBottomNav />
    </>
  );
}
