// ============================================================
// PerDayStepper — "how many a day" control used by the monthly
// cost estimates (prescription check, product page)
// ============================================================

import { Minus, Plus } from 'lucide-react';

const PER_DAY_OPTIONS = [0.5, 1, 2, 3, 4];

export default function PerDayStepper({ value, onChange }) {
  const i = PER_DAY_OPTIONS.indexOf(value);
  return (
    <div className="inline-flex items-center rounded-lg border border-outline-variant bg-surface-lowest">
      <button
        type="button"
        onClick={() => onChange(PER_DAY_OPTIONS[Math.max(0, i - 1)])}
        disabled={i <= 0}
        className="w-9 h-9 flex items-center justify-center text-on-surface/70 hover:text-primary disabled:opacity-30"
        aria-label="Fewer per day"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="px-2 text-sm font-semibold text-on-surface min-w-[5.5rem] text-center" aria-live="polite">
        {value === 0.5 ? '½' : value} a day
      </span>
      <button
        type="button"
        onClick={() => onChange(PER_DAY_OPTIONS[Math.min(PER_DAY_OPTIONS.length - 1, i + 1)])}
        disabled={i >= PER_DAY_OPTIONS.length - 1}
        className="w-9 h-9 flex items-center justify-center text-on-surface/70 hover:text-primary disabled:opacity-30"
        aria-label="More per day"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
