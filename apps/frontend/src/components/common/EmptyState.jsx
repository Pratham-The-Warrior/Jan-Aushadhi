// ============================================================
// EmptyState — Reusable empty/no-results placeholder
// Used in Discovery, Checkout, Dashboard when data is missing
// ============================================================

import React from 'react';

/**
 * @param {object}  props
 * @param {React.ReactNode} props.icon       - Lucide icon element
 * @param {string}  props.title              - Heading text
 * @param {string}  [props.description]      - Optional body text
 * @param {React.ReactNode} [props.action]   - Optional CTA button
 * @param {string}  [props.className]        - Additional container classes
 */
export default function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div className={`py-24 text-center bg-surface-lowest rounded-lg ghost-border clinical-shadow border-dashed ${className}`}>
      {icon && (
        <div className="w-20 h-20 bg-surface-low rounded-full flex items-center justify-center mx-auto mb-6">
          {icon}
        </div>
      )}
      <h3 className="font-display text-2xl font-bold text-on-surface mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-on-surface/60 max-w-md mx-auto leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
