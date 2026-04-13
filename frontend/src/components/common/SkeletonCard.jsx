// ============================================================
// SkeletonCard — Loading placeholder with pulse animation
// ============================================================

import React from 'react';

/**
 * @param {object} props
 * @param {number} [props.count=3]      - Number of skeleton cards to render
 * @param {string} [props.height='h-64'] - Tailwind height class
 * @param {string} [props.className]     - Additional classes
 */
export default function SkeletonCard({ count = 3, height = 'h-64', className = '' }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`bg-surface-lowest rounded-lg ghost-border p-8 ${height} animate-pulse clinical-shadow ${className}`}
          role="status"
          aria-label="Loading content"
        />
      ))}
    </>
  );
}
