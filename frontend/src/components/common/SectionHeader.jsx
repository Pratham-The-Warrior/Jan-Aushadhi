// ============================================================
// SectionHeader — Reusable section title with icon badge
// Used across Home, Discovery, Checkout, Fulfillment pages
// ============================================================

import React from 'react';

/**
 * @param {object}  props
 * @param {React.ReactNode} props.icon     - Lucide icon element
 * @param {string}  props.badge            - Uppercase badge label (e.g. "Science Hub")
 * @param {string}  props.title            - Section heading
 * @param {string}  [props.subtitle]       - Optional description
 * @param {React.ReactNode} [props.action] - Optional right-side action button
 * @param {string}  [props.className]      - Additional container classes
 */
export default function SectionHeader({ icon, badge, title, subtitle, action, className = '' }) {
  return (
    <div className={`flex flex-col md:flex-row justify-between items-start md:items-end gap-4 ${className}`}>
      <div>
        {badge && (
          <div className="inline-flex items-center gap-2 text-primary text-xs font-bold mb-4 tracking-wider uppercase">
            {icon}
            {badge}
          </div>
        )}
        <h2 className="font-display text-3xl font-bold text-on-surface">{title}</h2>
        {subtitle && (
          <p className="text-on-surface/70 mt-2 text-lg leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
