// ============================================================
// toastStore.js — Global toast notification state (Zustand)
// ============================================================

import { create } from 'zustand';

let toastId = 0;

const useToastStore = create((set) => ({
  toasts: [],

  /** Show a toast. type: 'success' | 'error' | 'warning' | 'info' */
  addToast: ({ message, type = 'info', duration = 4000 }) => {
    const id = ++toastId;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience helpers — can be called from anywhere (stores, services, etc.) */
export const toast = {
  success: (message, duration) =>
    useToastStore.getState().addToast({ message, type: 'success', duration }),
  error: (message, duration) =>
    useToastStore.getState().addToast({ message, type: 'error', duration: duration ?? 6000 }),
  warning: (message, duration) =>
    useToastStore.getState().addToast({ message, type: 'warning', duration }),
  info: (message, duration) =>
    useToastStore.getState().addToast({ message, type: 'info', duration }),
};

export default useToastStore;
