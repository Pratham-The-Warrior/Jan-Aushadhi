// ============================================================
// StatBadge — Compact metric display with icon
// Used in the Store Locator hero header
// ============================================================

import React from 'react';

/**
 * @param {object} props
 * @param {string} props.value  - Display value (e.g. "10,000+")
 * @param {string} props.label  - Metric label (e.g. "Kendras")
 * @param {React.ComponentType} props.icon - Lucide icon component
 */
export default function StatBadge({ value, label, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 bg-surface-lowest/60 backdrop-blur-md rounded-lg px-4 py-3 ghost-border">
      <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <div className="font-display font-bold text-on-surface text-sm">{value}</div>
        <div className="text-[10px] text-on-surface/50 font-medium uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}
