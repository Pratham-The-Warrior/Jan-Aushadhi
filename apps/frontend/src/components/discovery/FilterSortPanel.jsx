// ============================================================
// FilterSortPanel.jsx — Slide-in filter + sort drawer for Discovery
// Operates purely on the client-side results array
// ============================================================

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal, ArrowUpDown, RotateCcw } from 'lucide-react';

const SORT_OPTIONS = [
  { key: 'savings_desc', label: 'Savings: Highest First' },
  { key: 'savings_asc', label: 'Savings: Lowest First' },
  { key: 'price_asc', label: 'Generic Price: Low → High' },
  { key: 'price_desc', label: 'Generic Price: High → Low' },
  { key: 'name_asc', label: 'Name: A → Z' },
];

const SAVINGS_RANGES = [
  { key: 'all', label: 'Any Savings' },
  { key: 'low', label: '< 50%' },
  { key: 'mid', label: '50–75%' },
  { key: 'high', label: '75–90%' },
  { key: 'very_high', label: '> 90%' },
];

export default function FilterSortPanel({ isOpen, onClose, filters, setFilters }) {
  const hasActiveFilters =
    (filters.sortKey && filters.sortKey !== 'savings_desc') ||
    (filters.savingsRange && filters.savingsRange !== 'all');

  const resetFilters = () =>
    setFilters({ sortKey: 'savings_desc', savingsRange: 'all' });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-on-surface/30 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-surface-lowest z-50 flex flex-col clinical-shadow-lg"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant">
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
                <h2 className="font-display font-bold text-lg text-on-surface">Filter & Sort</h2>
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-low transition-colors text-on-surface/50 hover:text-on-surface"
                  aria-label="Close filter panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {/* Sort Section */}
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface/40 mb-4">
                  <ArrowUpDown className="w-3.5 h-3.5" /> Sort By
                </div>
                <div className="space-y-2">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setFilters((f) => ({ ...f, sortKey: opt.key }))}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all border ${
                        filters.sortKey === opt.key
                          ? 'bg-primary-light border-primary/30 text-primary'
                          : 'bg-surface-low border-transparent text-on-surface/70 hover:border-outline-variant hover:text-on-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {opt.label}
                        {filters.sortKey === opt.key && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Savings Range Filter */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface/40 mb-4">
                  Savings Range
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SAVINGS_RANGES.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setFilters((f) => ({ ...f, savingsRange: r.key }))}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        filters.savingsRange === r.key
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface-low border-transparent text-on-surface/60 hover:border-outline-variant hover:text-on-surface'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Apply */}
            <div className="px-6 py-5 border-t border-outline-variant">
              <button
                onClick={onClose}
                className="w-full btn-primary py-3.5 text-sm uppercase tracking-widest font-bold"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
