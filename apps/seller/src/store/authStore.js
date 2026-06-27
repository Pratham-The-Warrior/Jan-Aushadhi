// ============================================================
// Seller Central — Auth Store
// Zustand store with Firebase auth + seller role verification.
// ============================================================

import { create } from 'zustand';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { apiGet } from '../services/api-client';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  sellerProfile: null,
  loading: true,
  initialized: false,
  roleError: null, // Set if user doesn't have STORE_OWNER role

  init: () => {
    if (!auth) {
      set({ user: null, token: null, sellerProfile: null, loading: false, initialized: true, roleError: null });
      return;
    }
    try {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          const token = await user.getIdToken();
          localStorage.setItem('seller_token', token);
          set({ user, token, loading: false, initialized: true, roleError: null });

          try {
            const profile = await apiGet('/api/v1/seller/profile');
            set({ sellerProfile: profile });
          } catch (err) {
            if (err.statusCode === 403 || err.statusCode === 401) {
              set({ roleError: err.message || 'Access denied. Your account is not registered as a store owner.' });
            }
          }
        } else {
          set({ user: null, token: null, sellerProfile: null, loading: false, initialized: true, roleError: null });
          localStorage.removeItem('seller_token');
        }
      });
    } catch (err) {
      console.warn("⚠️ Seller auth fallback active:", err);
      set({ user: null, token: null, sellerProfile: null, loading: false, initialized: true, roleError: null });
    }
  },

  refreshProfile: async () => {
    try {
      const profile = await apiGet('/api/v1/seller/profile');
      set({ sellerProfile: profile, roleError: null });
    } catch (err) {
      if (err.statusCode === 403) {
        set({ roleError: err.message });
      }
    }
  },

  logout: async () => {
    if (auth) {
      try { await auth.signOut(); } catch {}
    }
    set({ user: null, token: null, sellerProfile: null, roleError: null });
    localStorage.removeItem('seller_token');
  },
}));

useAuthStore.getState().init();
export default useAuthStore;
