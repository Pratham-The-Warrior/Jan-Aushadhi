// ============================================================
// ToastContainer.jsx — Global animated toast notifications
// ============================================================

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import useToastStore from '../../store/toastStore';

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle2,
    bar: 'bg-success',
    iconColor: 'text-success',
    bg: 'bg-surface-lowest',
    border: 'border-success/20',
  },
  error: {
    icon: XCircle,
    bar: 'bg-red-500',
    iconColor: 'text-red-500',
    bg: 'bg-surface-lowest',
    border: 'border-red-200',
  },
  warning: {
    icon: AlertTriangle,
    bar: 'bg-warning',
    iconColor: 'text-warning',
    bg: 'bg-surface-lowest',
    border: 'border-warning/20',
  },
  info: {
    icon: Info,
    bar: 'bg-primary',
    iconColor: 'text-primary',
    bg: 'bg-surface-lowest',
    border: 'border-primary/20',
  },
};

function Toast({ toast }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`relative flex items-start gap-3 rounded-xl border px-4 py-3.5 clinical-shadow-lg max-w-sm w-full overflow-hidden ${config.bg} ${config.border}`}
      role="alert"
      aria-live="assertive"
    >
      {/* Left color bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${config.bar}`} />

      <div className={`shrink-0 mt-0.5 ${config.iconColor}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>

      <p className="flex-1 text-sm font-semibold text-on-surface leading-snug pr-2">
        {toast.message}
      </p>

      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 text-on-surface/30 hover:text-on-surface/70 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
