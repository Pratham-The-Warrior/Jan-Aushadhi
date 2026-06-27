import { create } from 'zustand';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

// --- AUTHENTICATION STATE STORE ---
// Built with Zustand, this acts as the single source of truth for the user's login state.
// We integrate Firebase Authentication here to keep client sessions perfectly reactive.
const useAuthStore = create((set) => ({
  user: null,
  token: null,
  loading: true,       // Tracks if we are still checking the session on boot
  initialized: false,  // Becomes true once the first handshake is done

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setLoading: (loading) => set({ loading }),

  // Initialize the Auth Listener
  // We subscribe to Firebase's auth status changes. This is extremely robust because it automatically 
  // fires on login, logout, token refresh, and page reloads.
  init: () => {
    if (!auth) {
      set({ user: null, token: null, loading: false, initialized: true });
      return;
    }
    try {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          const token = await user.getIdToken();
          set({ user, token, loading: false, initialized: true });
          localStorage.setItem('janaushadhi_token', token);
        } else {
          set({ user: null, token: null, loading: false, initialized: true });
          localStorage.removeItem('janaushadhi_token');
        }
      });
    } catch (err) {
      console.warn("⚠️ Auth listener fallback active:", err);
      set({ user: null, token: null, loading: false, initialized: true });
    }
  },

  logout: async () => {
    if (auth) {
      try { await auth.signOut(); } catch {}
    }
    set({ user: null, token: null });
  }
}));

// --- AUTO-INITIALIZATION ---
// Self-starting pattern: By invoking init() immediately when this module is imported, we guarantee the 
// Firebase listener is active from the millisecond the application starts, removing the need for a manual 
// hook trigger in main.jsx or App.jsx.
useAuthStore.getState().init();

export default useAuthStore;
