// ============================================================
// LoadingSpinner — Inline or full-page loading indicator
// ============================================================

import React from 'react';

/**
 * @param {object}  props
 * @param {string}  [props.size='w-5 h-5']  - Tailwind size classes
 * @param {string}  [props.label]            - Accessible label text
 * @param {boolean} [props.fullPage=false]   - Center in viewport
 * @param {string}  [props.className]        - Additional classes
 */
export default function LoadingSpinner({ size = 'w-5 h-5', label, fullPage = false, className = '' }) {
  const spinner = (
    <div className={`flex items-center gap-3 ${className}`} role="status" aria-label={label || 'Loading'}>
      <div className={`${size} border-2 border-primary border-t-transparent rounded-full animate-spin`} />
      {label && <span className="text-sm font-medium text-on-surface/60">{label}</span>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        {spinner}
      </div>
    );
  }

  return spinner;
}
