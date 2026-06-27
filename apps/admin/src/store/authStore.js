// ============================================================
// Admin Console — Auth Store
// Zustand store with Firebase auth + Super Admin role gate.
// ============================================================

import { create } from 'zustand';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { apiGet } from '../services/api-client';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  loading: true,
  initialized: false,
  roleError: null, // Holds authorization error message

  init: () => {
    if (!auth) {
      set({ user: null, token: null, loading: false, initialized: true, roleError: null });
      return;
    }
    try {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          const token = await user.getIdToken();
          localStorage.setItem('admin_token', token);
          set({ user, token, loading: false, initialized: true, roleError: null });

          try {
            await apiGet('/api/v1/admin/dashboard/stats');
          } catch (err) {
            if (err.statusCode === 403 || err.statusCode === 401) {
              set({ roleError: 'Access Denied. This console is restricted to Super Administrators only.' });
            } else {
              set({ roleError: err.message || 'Verification failed.' });
            }
          }
        } else {
          set({ user: null, token: null, loading: false, initialized: true, roleError: null });
          localStorage.removeItem('admin_token');
        }
      });
    } catch (err) {
      console.warn("⚠️ Admin auth fallback active:", err);
      set({ user: null, token: null, loading: false, initialized: true, roleError: null });
    }
  },

  logout: async () => {
    if (auth) {
      try { await auth.signOut(); } catch {}
    }
    set({ user: null, token: null, roleError: null });
    localStorage.removeItem('admin_token');
  },
}));

useAuthStore.getState().init();
export default useAuthStore;
