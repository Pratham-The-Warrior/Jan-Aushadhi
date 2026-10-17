// ============================================================
// OrderCard — one order in the patient's account
// Friendly status, progress tracker, reorder and cancel actions.
// ============================================================

import { RefreshCw, X } from 'lucide-react';
import { formatDate, formatINR, orderStatus, parseOrderItems, ORDER_STEPS, TONE_CLASSES } from '../../utils/format';

function Tracker({ step }) {
  return (
    <ol className="flex items-center gap-1 mt-4" aria-label="Order progress">
      {ORDER_STEPS.map((label, i) => {
        const done = i <= step;
        return (
          <li key={label} className="flex-1 min-w-0">
            <div className={`h-1.5 rounded-full ${done ? 'bg-primary' : 'bg-on-surface/10'}`} />
            <div className={`text-xs mt-1.5 truncate ${done ? 'text-primary font-semibold' : 'text-on-surface/70'}`}>{label}</div>
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderCard({ order, onReorder, onCancel }) {
  const items = parseOrderItems(order);
  const status = orderStatus(order.status);
  const active = status.step !== null && status.step < 3;

  return (
    <article className="bg-surface-lowest rounded-xl ghost-border p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display font-bold text-on-surface">Order #{order.id}</div>
          <div className="text-sm text-on-surface/70">
            {formatDate(order.created_at)} · {items.length} {items.length === 1 ? 'item' : 'items'} · {formatINR(order.total_generic_value)}
          </div>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${TONE_CLASSES[status.tone]}`}>{status.label}</span>
      </div>

      {items.length > 0 && (
        <p className="text-sm text-on-surface/70 mt-3 line-clamp-2">{items.map((i) => i.name).filter(Boolean).join(', ')}</p>
      )}

      {active && <Tracker step={status.step} />}

      <div className="flex flex-wrap gap-2 mt-4">
        {items.length > 0 && (
          <button onClick={() => onReorder(order)} className="btn-secondary py-2 px-3.5 text-sm font-semibold inline-flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" /> Order again
          </button>
        )}
        {order.status === 'PENDING_ACCEPTANCE' && onCancel && (
          <button onClick={() => onCancel(order)} className="py-2 px-3.5 text-sm font-semibold text-red-700 hover:bg-red-50 rounded-lg inline-flex items-center gap-1.5">
            <X className="w-4 h-4" /> Cancel
          </button>
        )}
      </div>
    </article>
  );
}
